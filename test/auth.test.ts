import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthController } from '../src/controllers/auth.controller.js';
import prisma from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/utils/jwt.js';
import { Context } from 'hono';

vi.mock('../src/utils/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    log: {
      create: vi.fn()
    }
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn()
  }
}));

vi.mock('../src/utils/jwt.js', () => ({
  signToken: vi.fn().mockReturnValue('mock-token')
}));

vi.mock('../src/utils/security.js', () => ({
  sanitizeInput: (input: string) => input
}));

describe('AuthController', () => {
  let mockContext: Partial<Context>;
  const mockUser = { 
    id: 'user123', 
    username: 'testuser',
    password: 'hashed-password',
    role: 'PLAYER'
  };
  
  beforeEach(() => {
    mockContext = {
      req: {
        json: vi.fn(),
        header: vi.fn().mockReturnValue('127.0.0.1')
      } as any,
      json: vi.fn().mockReturnThis()
    };
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({
        username: 'newuser',
        password: 'Password123!'
      });
      
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'new-user-id',
        username: 'newuser',
        role: 'PLAYER'
      });
      
      await AuthController.register(mockContext as Context);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'newuser',
          password: 'hashed-password',
          role: 'PLAYER'
        }
      });
      
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          message: 'Registration successful',
          id: 'new-user-id'
        },
        201
      );
    });
    
    it('should return 400 if username already exists', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({
        username: 'existinguser',
        password: 'Password123!'
      });
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      
      await AuthController.register(mockContext as Context);
      
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'User with this username already exists' },
        400
      );
    });
  });

  describe('login', () => {
    it('should successfully log in a user', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({
        username: 'testuser',
        password: 'Password123!'
      });
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      
      await AuthController.login(mockContext as Context);
      
      expect(signToken).toHaveBeenCalledWith({
        userId: 'user123',
        role: 'PLAYER'
      });
      
      expect(prisma.log.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          action: 'LOGIN_SUCCESS'
        })
      });
      
      expect(mockContext.json).toHaveBeenCalledWith({ token: 'mock-token' });
    });
    
    it('should return 401 if user does not exist', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({
        username: 'nonexistentuser',
        password: 'Password123!'
      });
      
      (prisma.user.findUnique as any).mockResolvedValue(null);
      
      await AuthController.login(mockContext as Context);
      
      expect(signToken).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Invalid username or password' },
        401
      );
    });
    
    it('should return 401 if password is incorrect', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({
        username: 'testuser',
        password: 'WrongPassword!'
      });
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);
      
      await AuthController.login(mockContext as Context);
      
      expect(signToken).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Invalid username or password' },
        401
      );
    });
    
    it('should handle rate limiting after too many failed attempts', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({
        username: 'testuser',
        password: 'WrongPassword!'
      });
      
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);
      
      for (let i = 0; i < 5; i++) {
        await AuthController.login(mockContext as Context);
      }
      
      await AuthController.login(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Account temporarily locked')
        }),
        429
      );
    });
  });
});
