import { Request, Response, NextFunction } from 'express';
import { StoriesService } from '../services/stories.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class StoriesController {
  static async createStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const story = await StoriesService.createStory(userId, req.body);
      ResponseUtil.success(res, story, 'Story criado', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getStoriesFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const groups = await StoriesService.getStoriesFeed(userId);
      ResponseUtil.success(res, groups);
    } catch (error) {
      next(error);
    }
  }

  static async getMyStories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stories = await StoriesService.getMyStories(userId);
      ResponseUtil.success(res, stories);
    } catch (error) {
      next(error);
    }
  }

  static async viewStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { storyId } = req.params;
      await StoriesService.viewStory(storyId, userId);
      ResponseUtil.success(res, null, 'Visualizado');
    } catch (error) {
      next(error);
    }
  }

  static async getStoryViewers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { storyId } = req.params;
      const viewers = await StoriesService.getStoryViewers(storyId, userId);
      ResponseUtil.success(res, viewers);
    } catch (error) {
      next(error);
    }
  }

  static async deleteStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { storyId } = req.params;
      await StoriesService.deleteStory(storyId, userId);
      ResponseUtil.success(res, null, 'Story excluído');
    } catch (error) {
      next(error);
    }
  }

  static async getProfileViews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await StoriesService.getProfileViewStats(userId);
      ResponseUtil.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  static async recordProfileView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user!.id;
      const { userId } = req.params;
      await StoriesService.recordProfileView(userId, viewerId);
      ResponseUtil.success(res, null);
    } catch (error) {
      next(error);
    }
  }

  static async getProgressCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const type = req.params.type as 'weekly' | 'monthly' | 'streak' | 'overview';
      const validTypes = ['weekly', 'monthly', 'streak', 'overview'];
      if (!validTypes.includes(type)) {
        ResponseUtil.error(res, 'INVALID_TYPE', 'Tipo inválido. Use: weekly, monthly, streak, overview', 400);
        return;
      }
      const data = await StoriesService.getProgressCardData(userId, type);
      ResponseUtil.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}
