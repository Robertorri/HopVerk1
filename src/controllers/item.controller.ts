import prisma from '../utils/prisma.js';
import { createImageSchema } from '../schema.zod.js';
import type { Context } from 'hono';

export class ItemController {
  static async createItem(c: Context) {
    try {
      const body = await c.req.json();
      const data = createImageSchema.parse(body);

      const newItem = await prisma.image.create({
        data: {
          url: data.file || '',
          prompt: data.prompt,
          uploadedById: String(c.user!.id),
        },
      });

      return c.json(newItem, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  }

  static async getItems(c: Context) {
    try {
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '10');
      const skip = (page - 1) * limit;

      const [items, totalCount] = await Promise.all([
        prisma.image.findMany({
          skip,
          take: limit,
          include: { ratings: true },
        }),
        prisma.image.count(),
      ]);

      return c.json({
        items,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  static async getItemById(c: Context) {
    try {
      const id = c.req.param('id');
      const item = await prisma.image.findUnique({
        where: { id },
        include: { ratings: true },
      });
      if (!item) {
        return c.json({ error: 'Item not found' }, 404);
      }
      return c.json(item);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  static async deleteItem(c: Context) {
    try {
      const id = c.req.param('id');
      await prisma.image.delete({ where: { id } });
      return c.json({ message: 'Item deleted' });
    } catch (error: any) {
      return c.json({ error: 'Item not found' }, 404);
    }
  }
}