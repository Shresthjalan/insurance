import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  if (res.headersSent) {
    logger.error('Error occurred after headers were sent', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(422).json({
      success: false,
      request_id: requestId,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue.message,
        field: firstIssue.path.join('.'),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { request_id: requestId, code: err.code });
    }
    res.status(err.statusCode).json({
      success: false,
      request_id: requestId,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field && { field: err.field }),
      },
    });
    return;
  }

  // Unknown error — never expose internals
  logger.error('Unhandled error', {
    request_id: requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    request_id: requestId,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    request_id: req.requestId ?? 'unknown',
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}
