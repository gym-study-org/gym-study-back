import { Request, Response } from 'express';
import { RankingService } from '../services/ranking.service';
import { ResponseUtil } from '../../../shared/utils/response.util';
import { AppError } from '../../../shared/utils/AppError';

const service = new RankingService();

export class RankingController {
  /**
   * Get global ranking (all time)
   */
  async getGlobalRanking(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const ranking = await service.getGlobalRanking(userId, limit, offset);

    ResponseUtil.success(res, ranking, 'Ranking global obtido com sucesso');
  }

  /**
   * Get friends ranking
   */
  async getFriendsRanking(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const ranking = await service.getFriendsRanking(userId);

    ResponseUtil.success(res, ranking, 'Ranking de amigos obtido com sucesso');
  }

  /**
   * Get monthly ranking
   */
  async getMonthlyRanking(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const ranking = await service.getMonthlyRanking(userId, limit);

    ResponseUtil.success(res, ranking, 'Ranking mensal obtido com sucesso');
  }

  /**
   * Get weekly ranking
   */
  async getWeeklyRanking(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const ranking = await service.getWeeklyRanking(userId, limit);

    ResponseUtil.success(res, ranking, 'Ranking semanal obtido com sucesso');
  }

  /**
   * Get user's position
   */
  async getUserPosition(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const position = await service.getUserPosition(userId);

    ResponseUtil.success(res, position, 'Posição obtida com sucesso');
  }
}
