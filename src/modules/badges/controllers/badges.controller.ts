import { Request, Response } from 'express';
import { badgesService } from '../services/badges.service';
import { BadgeCategory, BadgeLevelUpEvent } from '../interfaces/badge.interface';
import { io } from '../../../server';
import { emitToUser } from '../../../websocket/socket.handler';
import { logger } from '../../../shared/utils/logger.util';

class BadgesController {
  /**
   * GET /badges
   * Get all badge definitions
   */
  async getAllBadges(_req: Request, res: Response): Promise<void> {
    try {
      const badges = await badgesService.getAllBadgeDefinitions();
      res.json({
        success: true,
        data: badges,
      });
    } catch (error) {
      logger.error('Error getting badge definitions:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get badges' },
      });
    }
  }

  /**
   * GET /badges/me
   * Get current user's badges with progress
   */
  async getMyBadges(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = await badgesService.getUserBadges(userId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting user badges:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get user badges' },
      });
    }
  }

  /**
   * GET /badges/me/stats
   * Get current user's category stats
   */
  async getCategoryStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await badgesService.getCategoryStats(userId);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting category stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get category stats' },
      });
    }
  }

  /**
   * GET /badges/me/recent
   * Get current user's recent level-ups
   */
  async getRecentLevelUps(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const levelUps = await badgesService.getRecentLevelUps(userId, limit);
      res.json({
        success: true,
        data: levelUps,
      });
    } catch (error) {
      logger.error('Error getting recent level-ups:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get recent level-ups' },
      });
    }
  }

  /**
   * GET /badges/me/points
   * Get current user's total points from badges
   */
  async getTotalPoints(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const totalPoints = await badgesService.getUserTotalPoints(userId);
      res.json({
        success: true,
        data: { total_points: totalPoints },
      });
    } catch (error) {
      logger.error('Error getting total points:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get total points' },
      });
    }
  }

  /**
   * POST /badges/check
   * Force check badges for current user
   */
  async checkBadges(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const category = req.body.category as BadgeCategory | undefined;

      const levelUps = await badgesService.checkAndUpdateBadges(userId, category);

      // Emit WebSocket events for each level-up
      for (const levelUp of levelUps) {
        emitToUser(io, userId, 'badge:levelup', {
          badge: {
            id: levelUp.badge.id,
            code: levelUp.badge.code,
            name: levelUp.badge.name,
            icon: levelUp.badge.icon,
            category: levelUp.badge.category,
          },
          from_level: levelUp.from_level,
          to_level: levelUp.to_level,
          level_info: levelUp.level_info,
          points_earned: levelUp.points_earned,
          new_total_points: levelUp.new_total_points,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          level_ups: levelUps,
          count: levelUps.length,
        },
        message:
          levelUps.length > 0 ? `${levelUps.length} badge(s) leveled up!` : 'No level-ups',
      });
    } catch (error) {
      logger.error('Error checking badges:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to check badges' },
      });
    }
  }

  /**
   * GET /badges/user/:userId
   * Get another user's badges
   */
  async getUserBadges(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const data = await badgesService.getUserBadges(userId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting user badges:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get user badges' },
      });
    }
  }

  /**
   * GET /badges/verify/:userId/:badgeCode
   * Public endpoint - verify a badge (no auth required)
   */
  async verifyBadge(req: Request, res: Response): Promise<void> {
    try {
      const { userId, badgeCode } = req.params;
      const result = await badgesService.verifyBadge(userId, badgeCode);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error verifying badge:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify badge' },
      });
    }
  }

  /**
   * GET /badges/user/:userId/hireable
   * Public endpoint - get hireable badges for a user
   */
  async getHireableBadges(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const badges = await badgesService.getHireableBadges(userId);
      res.json({
        success: true,
        data: badges,
      });
    } catch (error) {
      logger.error('Error getting hireable badges:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get hireable badges' },
      });
    }
  }
}

export const badgesController = new BadgesController();

/**
 * Helper function to check badges and emit WebSocket events
 * Use this in other services after stat-changing actions
 */
export async function checkAndEmitBadges(
  userId: string,
  category?: BadgeCategory
): Promise<BadgeLevelUpEvent[]> {
  try {
    const levelUps = await badgesService.checkAndUpdateBadges(userId, category);

    for (const levelUp of levelUps) {
      emitToUser(io, userId, 'badge:levelup', {
        badge: {
          id: levelUp.badge.id,
          code: levelUp.badge.code,
          name: levelUp.badge.name,
          icon: levelUp.badge.icon,
          category: levelUp.badge.category,
        },
        from_level: levelUp.from_level,
        to_level: levelUp.to_level,
        level_info: levelUp.level_info,
        points_earned: levelUp.points_earned,
        new_total_points: levelUp.new_total_points,
        timestamp: new Date().toISOString(),
      });
    }

    return levelUps;
  } catch (error) {
    logger.error('Error in checkAndEmitBadges:', error);
    return [];
  }
}

/**
 * Helper function to check special badges (time-based, etc.)
 */
export async function checkAndEmitSpecialBadge(
  userId: string,
  badgeCode: string,
  incrementValue: number = 1
): Promise<BadgeLevelUpEvent | null> {
  try {
    const levelUp = await badgesService.checkSpecialBadge(userId, badgeCode, incrementValue);

    if (levelUp) {
      emitToUser(io, userId, 'badge:levelup', {
        badge: {
          id: levelUp.badge.id,
          code: levelUp.badge.code,
          name: levelUp.badge.name,
          icon: levelUp.badge.icon,
          category: levelUp.badge.category,
        },
        from_level: levelUp.from_level,
        to_level: levelUp.to_level,
        level_info: levelUp.level_info,
        points_earned: levelUp.points_earned,
        new_total_points: levelUp.new_total_points,
        timestamp: new Date().toISOString(),
      });
    }

    return levelUp;
  } catch (error) {
    logger.error('Error in checkAndEmitSpecialBadge:', error);
    return null;
  }
}
