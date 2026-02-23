import { Request, Response } from 'express';
import { QuestsService } from '../services/quests.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class QuestsController {
  /**
   * GET /quests/daily - Get today's daily quests
   */
  static async getDailyQuests(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const quests = await QuestsService.getDailyQuests(userId);
    return ResponseUtil.success(res, quests);
  }

  /**
   * POST /quests/:id/claim - Claim XP for completed quest
   */
  static async claimQuest(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const questId = req.params.id;
    const result = await QuestsService.claimQuest(userId, questId);
    return ResponseUtil.success(res, result);
  }
}
