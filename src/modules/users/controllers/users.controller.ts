import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { AppError } from '../../../shared/utils/AppError';
import { uploadToStorage } from '../../../config/storage';

export class UsersController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await UsersService.getUserById(userId);
      ResponseUtil.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await UsersService.updateUser(userId, req.body);
      ResponseUtil.success(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload user avatar
   * POST /users/me/avatar
   */
  static async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      if (!req.file) {
        throw new AppError('Nenhum arquivo enviado', 400, 'NO_FILE');
      }

      const avatarUrl = await uploadToStorage(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      const user = await UsersService.updateAvatarUrl(userId, avatarUrl);
      ResponseUtil.success(res, user, 'Avatar atualizado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public profile of a user
   * GET /users/:id/profile
   */
  static async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;
      const viewerId = req.user!.id;

      const profile = await UsersService.getPublicProfile(userId, viewerId);
      ResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public profile by username
   * GET /users/by-username/:username/profile
   */
  static async getProfileByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const viewerId = req.user!.id;

      const profile = await UsersService.getProfileByUsername(username, viewerId);
      ResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  }
}
