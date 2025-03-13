import type { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt.js';

export interface UserData {
  id: string; // Update type to string to match your schema
  role: string;
}

declare module 'hono' {
  interface Context {
    user?: UserData;
  }
}

export const requireAuth = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header provided' }, 401);
    }
    const token = authHeader.split(' ')[1]; 

    const payload = verifyToken(token);
    
    if (!payload) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    c.user = {
      id: payload.userId,
      role: payload.role,
    };

    await next();
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

export const requireAdmin = async (c: Context, next: Next) => {
  if (!c.user || c.user.role !== 'ADMIN') {
    return c.json({ error: 'Admin privileges required' }, 403);
  }
  await next();
};
