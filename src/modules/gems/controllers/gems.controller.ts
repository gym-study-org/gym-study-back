import { Request, Response } from 'express';
import { GemsService } from '../services/gems.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class GemsController {
  /**
   * GET /gems/balance - Get gems balance
   */
  static async getBalance(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const balance = await GemsService.getBalance(userId);
    return ResponseUtil.success(res, balance);
  }

  /**
   * GET /gems/history - Get transaction history
   */
  static async getHistory(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string | undefined;
    const result = await GemsService.getHistory(userId, { limit, cursor });
    return ResponseUtil.success(res, result);
  }

  /**
   * GET /gems/shop - Get shop items
   */
  static async getShop(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const items = await GemsService.getShopItems(userId);
    return ResponseUtil.success(res, items);
  }

  /**
   * POST /gems/shop/:itemCode/purchase - Purchase an item
   */
  static async purchaseItem(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { itemCode } = req.params;
    const result = await GemsService.purchaseItem(userId, itemCode);
    return ResponseUtil.success(res, result);
  }
}
