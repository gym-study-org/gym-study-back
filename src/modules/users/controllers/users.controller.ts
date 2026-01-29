import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

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
}
