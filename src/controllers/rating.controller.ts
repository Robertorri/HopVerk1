import prisma from '../utils/prisma.js';
import { ratingSchema } from '../schema.zod.js';
import type { Context } from 'hono';

export class RatingController {
  static async rateItem(c: Context) {
    try {
      const body = await c.req.json();
      const data = ratingSchema.parse(body);
      
      if (!c.user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      const userId = c.user.id;

      const existingItem = await prisma.item.findUnique({
        where: { id: data.itemId },
      });
      if (!existingItem) {
        return c.json({ error: 'Item not found' }, 404);
      }

      // Upsert rating
      const rating = await prisma.rating.upsert({
        where: {
          userId_itemId: {
            userId,
            itemId: data.itemId,
          },
        },
        update: { ratingType: data.ratingType },
        create: {
          userId,
          itemId: data.itemId,
          ratingType: data.ratingType,
        },
      });

      return c.json(rating);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  }
}
