import { Request, Response } from 'express';
import { LeaguesService } from '../services/leagues.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class LeaguesController {
  /**
   * GET /leagues/current - Get current league with group ranking
   */
  static async getCurrentLeague(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const result = await LeaguesService.getCurrentLeague(userId);

    if (!result) {
      return ResponseUtil.error(res, 'LEAGUE_NOT_FOUND', 'Liga não encontrada', 404);
    }

    return ResponseUtil.success(res, result);
  }

  /**
   * GET /leagues/history - Get league history
   */
  static async getHistory(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string | undefined;

    const result = await LeaguesService.getHistory(userId, { limit, cursor });
    return ResponseUtil.success(res, result);
  }

  /**
   * GET /leagues/info - Get all league tiers info
   */
  static async getLeagueInfo(_req: Request, res: Response) {
    const leagues = await LeaguesService.getAllLeagues();
    return ResponseUtil.success(res, leagues);
  }
}
