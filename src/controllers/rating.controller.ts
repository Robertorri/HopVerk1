import prisma from '../utils/prisma.js';
import { ratingSchema } from '../schema.zod.js';
import type { Context } from 'hono';
import { sanitizeInput, isValidUUID } from '../utils/security.js';

export class RatingController {
  static async rateItem(c: Context) {
    try {
      const body = await c.req.json();
      const data = ratingSchema.parse(body);
      
      if (!c.user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      const userId = c.user.id.toString();

      if (!isValidUUID(data.imageId)) {
        return c.json({ error: 'Invalid image ID format' }, 400);
      }

      const existingImage = await prisma.image.findUnique({
        where: { id: data.imageId },
      });
      if (!existingImage) {
        return c.json({ error: 'Image not found' }, 404);
      }

      const rating = await prisma.rating.upsert({
        where: {
          userId_imageId: {
            userId,
            imageId: data.imageId,
          },
        },
        update: { score: data.score },
        create: {
          userId,
          imageId: data.imageId,
          score: data.score,
        },
      });

      return c.json(rating);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  }
}
