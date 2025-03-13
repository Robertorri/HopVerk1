import { randomBytes } from 'crypto';

const generateSecureSecret = () => {
  return randomBytes(64).toString('hex');
};

export const LIMIT_DEFAULT = 10;
export const OFFSET_DEFAULT = 0;
export const LIMIT_MAX = 100;
export const OFFSET_MAX = 100;
export const JWT_SECRET = process.env.JWT_SECRET || generateSecureSecret();

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
