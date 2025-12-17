import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError, ErrorCodes } from '../utils/errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const formattedErrors = formatZodErrors(result.error);
      sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors);
      return;
    }
    
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      const formattedErrors = formatZodErrors(result.error);
      sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors);
      return;
    }
    
    req.query = result.data as typeof req.query;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      const formattedErrors = formatZodErrors(result.error);
      sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', formattedErrors);
      return;
    }
    
    req.params = result.data as typeof req.params;
    next();
  };
}

function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

