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

      // Check if user exists - Update to use username instead of email
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existingUser) {
        return c.json({ error: 'User with this username already exists' }, 400);
      }

      // Hash password
      const hashed = await bcrypt.hash(data.password, 10);

      // Create user - Make sure to use username instead of email
      const newuser = await prisma.user.create({
        data: {
          username: data.username,
          password: hashed,
          role: 'PLAYER', // Default role
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

      // Find user - Update to use username
      const user = await prisma.user.findUnique({ 
        where: { username: data.username }
      });
      
      if (!user) {
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      // Check password
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      // Create token - Make sure the type is consistent with your schema
      const token = signToken({ userId: user.id, role: user.role });

      return c.json({ token });
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }
}
