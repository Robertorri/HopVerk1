import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  imageUrl: z.string().url().optional(),
});

export const ratingSchema = z.object({
  itemId: z.number(),
  ratingType: z.enum(['LIKE', 'DISLIKE']),
});
