import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/AppError';

export { AppError };

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof AppError) {
    return ResponseUtil.error(res, err.code, err.message, err.statusCode, err.details);
  }

  // Default error
  return ResponseUtil.error(res, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500);
};
