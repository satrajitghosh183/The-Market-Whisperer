import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError, ErrorCodes } from '../utils/errors';
import { AuthPayload } from '../types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    sendError(res, 401, ErrorCodes.UNAUTHORIZED, 'Authorization header is required');
    return;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    sendError(res, 401, ErrorCodes.UNAUTHORIZED, 'Invalid authorization format. Use: Bearer <token>');
    return;
  }
  
  const token = parts[1];
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 401, ErrorCodes.TOKEN_EXPIRED, 'Token has expired');
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 401, ErrorCodes.INVALID_TOKEN, 'Invalid token');
      return;
    }
    sendError(res, 401, ErrorCodes.UNAUTHORIZED, 'Authentication failed');
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }
  
  const token = parts[1];
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.user = decoded;
  } catch {
    // Ignore invalid tokens for optional auth
  }
  
  next();
}

// Verify the user has access to a specific resource
export function requireOwnership(resourceUserId: string, requestUserId: string): boolean {
  return resourceUserId === requestUserId;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

