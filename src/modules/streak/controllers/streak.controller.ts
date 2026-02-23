import { Request, Response } from 'express';
import { StreakService } from '../services/streak.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class StreakController {
  /**
   * GET /streak/status - Get streak status
   */
  static async getStatus(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const status = await StreakService.getStatus(userId);
    return ResponseUtil.success(res, status);
  }

  /**
   * POST /streak/buy-freeze - Buy a streak freeze with gems
   */
  static async buyFreeze(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const result = await StreakService.buyFreeze(userId);
    return ResponseUtil.success(res, result);
  }
}
