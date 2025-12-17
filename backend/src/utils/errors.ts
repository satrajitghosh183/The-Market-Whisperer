import { Response } from 'express';
import { ApiError } from '../types';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Predefined error codes for consistency
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  PORTFOLIO_NOT_FOUND: 'PORTFOLIO_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  POSITION_NOT_FOUND: 'POSITION_NOT_FOUND',
  
  // Conflict errors (409)
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  
  // Business logic errors (422)
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_SHARES: 'INSUFFICIENT_SHARES',
  ORDER_NOT_FILLABLE: 'ORDER_NOT_FILLABLE',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  res.status(statusCode).json(createErrorResponse(code, message, details));
}

export function handleError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }
  
  if (error instanceof Error) {
    // Check for known Supabase/Postgres errors
    const message = error.message.toLowerCase();
    
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      sendError(res, 409, ErrorCodes.DUPLICATE_RESOURCE, 'Resource already exists');
      return;
    }
    
    if (message.includes('foreign key')) {
      sendError(res, 400, ErrorCodes.INVALID_INPUT, 'Referenced resource does not exist');
      return;
    }
    
    if (message.includes('check constraint')) {
      sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Data validation failed');
      return;
    }
    
    console.error('Unhandled error:', error);
    sendError(res, 500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred');
    return;
  }
  
  console.error('Unknown error type:', error);
  sendError(res, 500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred');
}

