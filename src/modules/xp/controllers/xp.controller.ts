import { Request, Response } from 'express';
import { XPService } from '../services/xp.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class XPController {
  /**
   * GET /xp/me - Get XP summary for current user
   */
  static async getXPSummary(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const summary = await XPService.getXPSummary(userId);
    return ResponseUtil.success(res, summary);
  }

  /**
   * GET /xp/history - Get XP transaction history
   */
  static async getXPHistory(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string | undefined;
    const source = req.query.source as string | undefined;

    const result = await XPService.getXPHistory(userId, { limit, cursor, source });
    return ResponseUtil.success(res, result);
  }

  /**
   * GET /xp/rules - Get all XP rules
   */
  static async getXPRules(_req: Request, res: Response) {
    const rules = await XPService.getXPRules();
    return ResponseUtil.success(res, rules);
  }
}
