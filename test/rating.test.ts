import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RatingController } from '../src/controllers/rating.controller.js';
import prisma from '../src/utils/prisma.js';
import { Context } from 'hono';

vi.mock('../src/utils/prisma.js', () => ({
  default: {
    image: {
      findUnique: vi.fn(),
    },
    rating: {
      upsert: vi.fn(),
    }
  }
}));

vi.mock('../src/utils/security.js', () => ({
  isValidUUID: () => true,
  sanitizeInput: (input: string) => input
}));

describe('RatingController', () => {
  let mockContext: Partial<Context>;
  const mockUser = { id: 'user123', role: 'PLAYER' };
  const mockImage = { id: 'image123', url: 'http://example.com/image.jpg', prompt: 'Test image' };
  const mockRating = { id: 'rating123', userId: 'user123', imageId: 'image123', score: 1 };
  
  beforeEach(() => {
    mockContext = {
      user: mockUser,
      req: {
        json: vi.fn().mockResolvedValue({ imageId: 'image123', score: 1 })
      } as any,
      json: vi.fn().mockReturnThis()
    };
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rateItem', () => {
    it('should successfully create a new rating', async () => {
      (prisma.image.findUnique as any).mockResolvedValue(mockImage);
      (prisma.rating.upsert as any).mockResolvedValue(mockRating);

      await RatingController.rateItem(mockContext as Context);
      
      expect(prisma.image.findUnique).toHaveBeenCalledWith({
        where: { id: 'image123' }
      });
      
      expect(prisma.rating.upsert).toHaveBeenCalledWith({
        where: {
          userId_imageId: {
            userId: 'user123',
            imageId: 'image123'
          }
        },
        update: { score: 1 },
        create: {
          userId: 'user123',
          imageId: 'image123',
          score: 1
        }
      });
      
      expect(mockContext.json).toHaveBeenCalledWith(mockRating);
    });
    
    it('should return 401 if user is not authenticated', async () => {
      const contextWithoutUser = { 
        ...mockContext,
        user: undefined,
        json: vi.fn().mockReturnThis()
      };
      
      await RatingController.rateItem(contextWithoutUser as Context);
      
      expect(contextWithoutUser.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401);
    });
    
    it('should return 404 if image is not found', async () => {
      (prisma.image.findUnique as any).mockResolvedValue(null);
      
      await RatingController.rateItem(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith({ error: 'Image not found' }, 404);
    });
    
    it('should handle database errors', async () => {
      (prisma.image.findUnique as any).mockResolvedValue(mockImage);
      (prisma.rating.upsert as any).mockRejectedValue(new Error('Database error'));
      
      await RatingController.rateItem(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith({ error: 'Database error' }, 400);
    });
  });
});
