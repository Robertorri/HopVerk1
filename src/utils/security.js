import { createHash } from 'crypto';

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input 
 * @returns {string}
 */
export function sanitizeInput(input) {
  if (!input) return '';
  
  // Basic sanitization - replace potentially harmful characters
  return String(input)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Create a hash for a password reset token
 * @param {string} token 
 * @returns {string}
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**rate limiter**/
const requestCounts = new Map();
const WINDOW_SIZE_MS = 60 * 1000; 
const MAX_REQUESTS = 100; 

export function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_MS;
  
  const requests = requestCounts.get(ip) || [];
  
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return true; 
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return false; 
}
