import { Request, Response, NextFunction } from 'express';
import { RecommendationsService } from '../services/recommendations.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class RecommendationsController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const recommendation = await RecommendationsService.create(userId, req.body);
      ResponseUtil.success(res, recommendation, 'Recommendation created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user!.id;
      const { userId } = req.params;
      const recommendations = await RecommendationsService.getForUser(userId, viewerId);
      ResponseUtil.success(res, { recommendations });
    } catch (error) {
      next(error);
    }
  }

  static async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const recommendations = await RecommendationsService.getForUser(userId, userId);
      ResponseUtil.success(res, { recommendations });
    } catch (error) {
      next(error);
    }
  }

  static async getWrittenByMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const recommendations = await RecommendationsService.getByAuthor(userId);
      ResponseUtil.success(res, { recommendations });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { recommendationId } = req.params;
      const recommendation = await RecommendationsService.update(recommendationId, userId, req.body);
      ResponseUtil.success(res, recommendation);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { recommendationId } = req.params;
      await RecommendationsService.delete(recommendationId, userId);
      ResponseUtil.success(res, { message: 'Recommendation deleted' });
    } catch (error) {
      next(error);
    }
  }
}
