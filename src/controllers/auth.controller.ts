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

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        return c.json({ error: 'User with this email already exists' }, 400);
      }

      // Hash password
      const hashed = await bcrypt.hash(data.password, 10);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          password: hashed,
        },
      });

      return c.json({ id: newUser.id, email: newUser.email }, 201);
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }

  static async login(c: Context) {
    try {
      const body = await c.req.json();
      const data = loginSchema.parse(body);

      // Find user
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      // Check password
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      // Create token
      const token = signToken({ userId: user.id, role: user.role });

      return c.json({ token });
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }
}
