import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: err.flatten(),
    });
  }

  if (err instanceof AppError) {
    logger.warn({ requestId: req.id, code: err.code, status: err.status }, err.message);
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  const e = err as Error;
  logger.error({ requestId: req.id, err: { message: e?.message, stack: e?.stack } }, 'unhandled');
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
