import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const createImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  file: z.any(), 
});

export const ratingSchema = z.object({
  imageId: z.string(),
  score: z.number().int().refine(val => val === 1 || val === -1, {
    message: "Score must be either 1 (like) or -1 (dislike)"
  }),
});

export const commentSchema = z.object({
  imageId: z.string(),
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment too long'),
});
