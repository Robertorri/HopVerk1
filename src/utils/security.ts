import { createHash } from 'crypto';


export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  
  return String(input)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}


const requestCounts = new Map<string, number[]>();
const WINDOW_SIZE_MS = 60 * 1000; 
const MAX_REQUESTS = 100; 


export function isRateLimited(ip: string): boolean {
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

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
