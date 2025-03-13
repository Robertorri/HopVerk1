import prisma from './prisma.js';
import { NODE_ENV } from '../constants.js';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY'
}

class Logger {
  private shouldLogToConsole(): boolean {
    return NODE_ENV !== 'production';
  }

  async log(level: LogLevel, message: string, userId?: string, details?: string) {
    try {
      await prisma.log.create({
        data: {
          userId,
          action: `${level}: ${message}`,
          details: details || ''
        }
      });
    } catch (error) {
      console.error('Failed to write log to database:', error);
    }
    
    if (this.shouldLogToConsole()) {
      const logMethod = level === LogLevel.ERROR ? console.error :
                       level === LogLevel.WARN ? console.warn : 
                       console.log;
      
      logMethod(`[${level}] ${message}${userId ? ` (User: ${userId})` : ''}${details ? `: ${details}` : ''}`);
    }
  }
  
  async debug(message: string, userId?: string, details?: string) {
    return this.log(LogLevel.DEBUG, message, userId, details);
  }
  
  async info(message: string, userId?: string, details?: string) {
    return this.log(LogLevel.INFO, message, userId, details);
  }
  
  async warn(message: string, userId?: string, details?: string) {
    return this.log(LogLevel.WARN, message, userId, details);
  }
  
  async error(message: string, userId?: string, details?: string) {
    return this.log(LogLevel.ERROR, message, userId, details);
  }
  
  async security(message: string, userId?: string, details?: string) {
    return this.log(LogLevel.SECURITY, message, userId, details);
  }
}

const logger = new Logger();

export default logger;
