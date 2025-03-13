import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ItemController } from '../src/controllers/item.controller.js';
import prisma from '../src/utils/prisma.js';
import { Context } from 'hono';

vi.mock('../src/utils/prisma.js', () => ({
  default: {
    image: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    }
  }
}));

vi.mock('../src/utils/security.js', () => ({
  sanitizeInput: (input: string) => input
}));

describe('ItemController', () => {
  let mockContext: Partial<Context>;
  const mockUser = { id: 'user123', role: 'ADMIN' };
  const mockImage = { 
    id: 'image123', 
    url: 'http://example.com/image.jpg', 
    prompt: 'Test image',
    ratings: []
  };
  
  beforeEach(() => {
    mockContext = {
      user: mockUser,
      req: {
        json: vi.fn().mockResolvedValue({ prompt: 'Test image', file: 'http://example.com/image.jpg' }),
        query: vi.fn((param) => {
          if (param === 'page') return '1';
          if (param === 'limit') return '10';
          return null;
        }),
        param: vi.fn().mockReturnValue('image123')
      } as any,
      json: vi.fn().mockReturnThis()
    };
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createItem', () => {
    it('should successfully create a new item', async () => {
      (prisma.image.create as any).mockResolvedValue(mockImage);

      await ItemController.createItem(mockContext as Context);
      
      expect(prisma.image.create).toHaveBeenCalledWith({
        data: {
          url: 'http://example.com/image.jpg',
          prompt: 'Test image',
          uploadedById: 'user123'
        }
      });
      
      expect(mockContext.json).toHaveBeenCalledWith(mockImage, 201);
    });
    
    it('should handle validation errors', async () => {
      mockContext.req!.json = vi.fn().mockResolvedValue({ /* missing required fields */ });
      
      await ItemController.createItem(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        400
      );
    });
  });

  describe('getItems', () => {
    it('should return paginated items', async () => {
      (prisma.image.findMany as any).mockResolvedValue([mockImage]);
      (prisma.image.count as any).mockResolvedValue(1);

      await ItemController.getItems(mockContext as Context);
      
      expect(prisma.image.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: { ratings: true }
      });
      
      expect(mockContext.json).toHaveBeenCalledWith({
        items: [mockImage],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      });
    });
    
    it('should handle database errors', async () => {
      (prisma.image.findMany as any).mockRejectedValue(new Error('Database error'));
      
      await ItemController.getItems(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Database error' }, 
        500
      );
    });
  });

  describe('getItemById', () => {
    it('should return an item by ID', async () => {
      (prisma.image.findUnique as any).mockResolvedValue(mockImage);

      await ItemController.getItemById(mockContext as Context);
      
      expect(prisma.image.findUnique).toHaveBeenCalledWith({
        where: { id: 'image123' },
        include: { ratings: true }
      });
      
      expect(mockContext.json).toHaveBeenCalledWith(mockImage);
    });
    
    it('should return 404 if item is not found', async () => {
      (prisma.image.findUnique as any).mockResolvedValue(null);
      
      await ItemController.getItemById(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Item not found' }, 
        404
      );
    });
  });

  describe('deleteItem', () => {
    it('should delete an item by ID', async () => {
      (prisma.image.delete as any).mockResolvedValue(mockImage);

      await ItemController.deleteItem(mockContext as Context);
      
      expect(prisma.image.delete).toHaveBeenCalledWith({
        where: { id: 'image123' }
      });
      
      expect(mockContext.json).toHaveBeenCalledWith({ message: 'Item deleted' });
    });
    
    it('should return 404 if item deletion fails', async () => {
      (prisma.image.delete as any).mockRejectedValue(new Error('Not found'));
      
      await ItemController.deleteItem(mockContext as Context);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Item not found' }, 
        404
      );
    });
  });
});
