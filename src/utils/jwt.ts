import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../constants.js';

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
}

export function signToken(payload: JwtPayload) {
  const now = Math.floor(Date.now() / 1000);
  
  return jwt.sign(
    { ...payload, iat: now }, 
    JWT_SECRET, 
    { 
      expiresIn: '1d',
      algorithm: 'HS256'
    }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return decoded as JwtPayload;
  } catch (error) {
    return null;
  }
}
