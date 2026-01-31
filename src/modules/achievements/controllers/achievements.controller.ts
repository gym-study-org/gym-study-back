import { Request, Response } from 'express';
import { achievementsService } from '../services/achievements.service';
import { logger } from '../../../shared/utils/logger.util';
import { io } from '../../../server';
import { emitToUser } from '../../../websocket/socket.handler';

export const achievementsController = {
  async getAllAchievements(_req: Request, res: Response) {
    try {
      const achievements = await achievementsService.getAllAchievements();

      res.json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      logger.error('Error fetching achievements:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch achievements' },
      });
    }
  },

  async getMyAchievements(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await achievementsService.getUserAchievements(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error fetching user achievements:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch user achievements' },
      });
    }
  },

  async getUserAchievements(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await achievementsService.getUserAchievementsByUserId(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error fetching user achievements:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch user achievements' },
      });
    }
  },

  async getCategoryStats(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await achievementsService.getCategoryStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching category stats:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch category stats' },
      });
    }
  },

  async getRecentAchievements(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 5;
      const achievements = await achievementsService.getRecentUnlockedAchievements(
        userId,
        limit
      );

      res.json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      logger.error('Error fetching recent achievements:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch recent achievements' },
      });
    }
  },

  async checkAchievements(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { category } = req.body;

      const unlockedAchievements = await achievementsService.checkAndUnlockAchievements(
        userId,
        category
      );

      // Emit WebSocket events for each unlocked achievement
      for (const achievement of unlockedAchievements) {
        emitToUser(io, userId, 'achievement:unlocked', {
          achievement,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          unlocked: unlockedAchievements,
          count: unlockedAchievements.length,
        },
      });
    } catch (error) {
      logger.error('Error checking achievements:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to check achievements' },
      });
    }
  },

  async getTotalPoints(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const totalPoints = await achievementsService.getUserTotalPoints(userId);

      res.json({
        success: true,
        data: { total_points: totalPoints },
      });
    } catch (error) {
      logger.error('Error fetching total points:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch total points' },
      });
    }
  },
};

// Helper function to check and emit achievements from other services
export const checkAndEmitAchievements = async (
  userId: string,
  category?: string
) => {
  try {
    const unlockedAchievements = await achievementsService.checkAndUnlockAchievements(
      userId,
      category as any
    );

    // Emit WebSocket events for each unlocked achievement
    for (const achievement of unlockedAchievements) {
      emitToUser(io, userId, 'achievement:unlocked', {
        achievement,
        timestamp: new Date().toISOString(),
      });
    }

    return unlockedAchievements;
  } catch (error) {
    logger.error('Error in checkAndEmitAchievements:', error);
    return [];
  }
};
