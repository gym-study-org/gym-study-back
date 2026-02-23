import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { query } from '../../../config/database';
import { redis } from '../../../config/redis';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseUtil.error(
        res,
        'MISSING_TOKEN',
        'Authentication token is required',
        401
      );
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check token blacklist (logged-out tokens)
    try {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        ResponseUtil.error(res, 'TOKEN_REVOKED', 'Token has been revoked', 401);
        return;
      }
    } catch {
      // Redis unavailable, skip blacklist check
    }

    // Verify token
    const payload = JWTService.verifyToken(token);

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, email, username FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
      [payload.id]
    );

    if (result.rows.length === 0) {
      ResponseUtil.error(res, 'INVALID_TOKEN', 'User not found or inactive', 401);
      return;
    }

    // Attach user to request
    req.user = result.rows[0];

    next();
  } catch (error) {
    ResponseUtil.error(res, 'INVALID_TOKEN', 'Invalid or expired token', 401);
  }
};
