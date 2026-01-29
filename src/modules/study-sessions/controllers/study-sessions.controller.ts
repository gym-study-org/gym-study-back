import { Request, Response, NextFunction } from 'express';
import { StudySessionsService } from '../services/study-sessions.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class StudySessionsController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const session = await StudySessionsService.create(userId, req.body);
      ResponseUtil.success(res, session, 'Study session created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { sessions, total } = await StudySessionsService.findByUserId(userId, {
        page,
        limit,
        offset,
      });

      ResponseUtil.paginated(res, sessions, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const session = await StudySessionsService.findById(id, userId);
      ResponseUtil.success(res, session);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const session = await StudySessionsService.update(id, userId, req.body);
      ResponseUtil.success(res, session, 'Study session updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await StudySessionsService.delete(id, userId);
      ResponseUtil.success(res, null, 'Study session deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await StudySessionsService.getStats(userId);
      ResponseUtil.success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}
