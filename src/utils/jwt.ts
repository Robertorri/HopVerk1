import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../constants.js';

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}
