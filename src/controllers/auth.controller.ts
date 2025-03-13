import prisma from '../utils/prisma.js';
import { registerSchema, loginSchema } from '../schema.zod.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt.js';
import type { Context } from 'hono';

export class AuthController {
  static async register(c: Context) {
    try {
      const body = await c.req.json();
      const data = registerSchema.parse(body);

      const existingUser = await prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existingUser) {
        return c.json({ error: 'User with this username already exists' }, 400);
      }

      const hashed = await bcrypt.hash(data.password, 10);

      const newuser = await prisma.user.create({
        data: {
          username: data.username,
          password: hashed,
          role: 'PLAYER', 
        },
      });

      return c.json({ id: newuser.id, username: newuser.username }, 201);
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }

  static async login(c: Context) {
    try {
      const body = await c.req.json();
      const data = loginSchema.parse(body);

      const user = await prisma.user.findUnique({ 
        where: { username: data.username }
      });
      
      if (!user) {
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      const token = signToken({ userId: user.id, role: user.role });

      return c.json({ token });
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }
}
