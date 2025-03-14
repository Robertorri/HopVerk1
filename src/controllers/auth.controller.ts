import prisma from '../utils/prisma.js';
import { registerSchema, loginSchema } from '../schema.zod.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt.js';
import type { Context } from 'hono';
import { sanitizeInput } from '../utils/security.js';

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; 

export class AuthController {
  static async register(c: Context) {
    try {
      const body = await c.req.json();
      const data = registerSchema.parse(body);

      const cleanUsername = sanitizeInput(data.username);

      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
      if (existingUser) {
        return c.json({ error: 'User with this username already exists' }, 400);
      }

      const hashed = await bcrypt.hash(data.password, 12);

      const newuser = await prisma.user.create({
        data: {
          username: cleanUsername,
          password: hashed,
          role: 'PLAYER', 
        },
      });

      return c.json({ 
        message: 'Registration successful',
        id: newuser.id 
      }, 201);
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }

  static async login(c: Context) {
    try {
      const body = await c.req.json();
      const data = loginSchema.parse(body);
      
      const ip = c.req.header('x-forwarded-for') || 'unknown';
      
      const attemptRecord = loginAttempts.get(ip);
      if (attemptRecord && attemptRecord.lockedUntil > Date.now()) {
        return c.json({ 
          error: 'Account temporarily locked due to multiple failed attempts. Try again later.' 
        }, 429);
      }

      const cleanUsername = sanitizeInput(data.username);

      const user = await prisma.user.findUnique({ 
        where: { username: cleanUsername }
      });
      
      if (!user) {
        updateFailedLoginAttempts(ip);
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        updateFailedLoginAttempts(ip);
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      loginAttempts.delete(ip);

      const token = signToken({ userId: user.id, role: user.role });

      await prisma.log.create({
        data: {
          userId: user.id,
          action: "LOGIN_SUCCESS",
          details: `User login from IP: ${ip.substring(0, 10)}...`
        }
      });

      return c.json({ token });
    } catch (error: any) {
      return c.json({ error: error.message || 'Bad request' }, 400);
    }
  }
}

function updateFailedLoginAttempts(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  
  record.count += 1;
  
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_TIME_MS;
  }
  
  loginAttempts.set(ip, record);
}