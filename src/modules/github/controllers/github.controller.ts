import { Request, Response } from 'express';
import { GitHubService } from '../services/github.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class GitHubController {
  static async connect(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { access_token } = req.body;

    if (!access_token) {
      return ResponseUtil.error(res, 'MISSING_TOKEN', 'GitHub access token is required', 400);
    }

    const stats = await GitHubService.connect(userId, access_token);
    return ResponseUtil.success(res, stats, 'GitHub account connected successfully');
  }

  static async getMyStats(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const stats = await GitHubService.getMyStats(userId);
    return ResponseUtil.success(res, stats);
  }

  static async sync(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const stats = await GitHubService.syncStats(userId);
    return ResponseUtil.success(res, stats, 'GitHub stats synced');
  }

  static async getUserStats(req: Request, res: Response) {
    const { userId } = req.params;
    const stats = await GitHubService.getUserStats(userId);
    if (!stats) {
      return ResponseUtil.error(res, 'GITHUB_NOT_CONNECTED', 'User has not connected GitHub', 404);
    }
    return ResponseUtil.success(res, stats);
  }

  static async disconnect(req: Request, res: Response) {
    const userId = (req as any).user.id;
    await GitHubService.disconnect(userId);
    return ResponseUtil.success(res, null, 'GitHub account disconnected');
  }
}
