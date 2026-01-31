import { pool } from '../../../config/database';
import { logger } from '../../../shared/utils/logger.util';
import {
  Achievement,
  AchievementWithUnlockStatus,
  AchievementCategory,
  UserStats,
  AchievementListResponse,
  AchievementCategoryStats,
  CATEGORY_LABELS,
} from '../interfaces/achievement.interface';

class AchievementsService {
  async getAllAchievements(): Promise<Achievement[]> {
    const result = await pool.query(
      `SELECT * FROM achievements ORDER BY category, requirement_value ASC`
    );
    return result.rows;
  }

  async getAchievementsByCategory(category: AchievementCategory): Promise<Achievement[]> {
    const result = await pool.query(
      `SELECT * FROM achievements WHERE category = $1 ORDER BY requirement_value ASC`,
      [category]
    );
    return result.rows;
  }

  async getUserAchievements(userId: string): Promise<AchievementListResponse> {
    const achievementsResult = await pool.query(
      `SELECT
        a.*,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked,
        ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.category, a.requirement_value ASC`,
      [userId]
    );

    const achievements: AchievementWithUnlockStatus[] = achievementsResult.rows;
    const unlockedAchievements = achievements.filter((a) => a.unlocked);

    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

    return {
      achievements,
      total_points: totalPoints,
      unlocked_count: unlockedAchievements.length,
      total_count: achievements.length,
    };
  }

  async getUserAchievementsByUserId(userId: string): Promise<AchievementListResponse> {
    return this.getUserAchievements(userId);
  }

  async getCategoryStats(userId: string): Promise<AchievementCategoryStats[]> {
    const result = await pool.query(
      `SELECT
        a.category,
        COUNT(a.id) as total,
        COUNT(ua.id) as unlocked,
        SUM(a.points) as max_points,
        COALESCE(SUM(CASE WHEN ua.id IS NOT NULL THEN a.points ELSE 0 END), 0) as points_earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      GROUP BY a.category
      ORDER BY a.category`,
      [userId]
    );

    return result.rows.map((row) => ({
      category: row.category,
      label: CATEGORY_LABELS[row.category as AchievementCategory] || row.category,
      unlocked: parseInt(row.unlocked),
      total: parseInt(row.total),
      points_earned: parseInt(row.points_earned),
      max_points: parseInt(row.max_points),
    }));
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const result = await pool.query(
      `SELECT
        total_study_hours,
        current_streak,
        longest_streak,
        COALESCE(sessions_count, 0) as sessions_count,
        COALESCE(certifications_count, 0) as certifications_count,
        COALESCE(completed_goals_count, 0) as completed_goals_count,
        COALESCE(friends_count, 0) as friends_count
      FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return {
      total_study_hours: parseFloat(result.rows[0].total_study_hours) || 0,
      current_streak: parseInt(result.rows[0].current_streak) || 0,
      longest_streak: parseInt(result.rows[0].longest_streak) || 0,
      sessions_count: parseInt(result.rows[0].sessions_count) || 0,
      certifications_count: parseInt(result.rows[0].certifications_count) || 0,
      completed_goals_count: parseInt(result.rows[0].completed_goals_count) || 0,
      friends_count: parseInt(result.rows[0].friends_count) || 0,
    };
  }

  async checkAndUnlockAchievements(
    userId: string,
    category?: AchievementCategory
  ): Promise<Achievement[]> {
    const stats = await this.getUserStats(userId);
    const unlockedAchievements: Achievement[] = [];

    // Get achievements to check (either by category or all)
    let achievementsQuery = `
      SELECT a.* FROM achievements a
      WHERE a.id NOT IN (
        SELECT achievement_id FROM user_achievements WHERE user_id = $1
      )
    `;
    const params: any[] = [userId];

    if (category) {
      achievementsQuery += ` AND a.category = $2`;
      params.push(category);
    }

    achievementsQuery += ` ORDER BY a.requirement_value ASC`;

    const result = await pool.query(achievementsQuery, params);
    const potentialAchievements: Achievement[] = result.rows;

    for (const achievement of potentialAchievements) {
      const isEligible = this.checkAchievementEligibility(achievement, stats);

      if (isEligible) {
        await this.unlockAchievement(userId, achievement.id);
        unlockedAchievements.push(achievement);
        logger.info(
          `Achievement unlocked: ${achievement.name} for user ${userId}`
        );
      }
    }

    // Update user total points if any achievements were unlocked
    if (unlockedAchievements.length > 0) {
      const totalNewPoints = unlockedAchievements.reduce(
        (sum, a) => sum + a.points,
        0
      );
      await pool.query(
        `UPDATE users SET total_points = COALESCE(total_points, 0) + $1 WHERE id = $2`,
        [totalNewPoints, userId]
      );
    }

    return unlockedAchievements;
  }

  private checkAchievementEligibility(
    achievement: Achievement,
    stats: UserStats
  ): boolean {
    switch (achievement.category) {
      case 'study_hours':
        return stats.total_study_hours >= achievement.requirement_value;

      case 'streak':
        return (
          stats.current_streak >= achievement.requirement_value ||
          stats.longest_streak >= achievement.requirement_value
        );

      case 'social':
        return stats.friends_count >= achievement.requirement_value;

      case 'certifications':
        return stats.certifications_count >= achievement.requirement_value;

      case 'goals':
        return stats.completed_goals_count >= achievement.requirement_value;

      case 'sessions':
        return stats.sessions_count >= achievement.requirement_value;

      case 'special':
        // Special achievements are handled separately
        return false;

      default:
        return false;
    }
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING`,
      [userId, achievementId]
    );
  }

  async unlockSpecialAchievement(
    userId: string,
    achievementCode: string
  ): Promise<Achievement | null> {
    // Check if already unlocked
    const existingResult = await pool.query(
      `SELECT ua.* FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1 AND a.code = $2`,
      [userId, achievementCode]
    );

    if (existingResult.rows.length > 0) {
      return null;
    }

    // Get achievement and unlock
    const achievementResult = await pool.query(
      `SELECT * FROM achievements WHERE code = $1`,
      [achievementCode]
    );

    if (achievementResult.rows.length === 0) {
      return null;
    }

    const achievement = achievementResult.rows[0];
    await this.unlockAchievement(userId, achievement.id);

    // Update user points
    await pool.query(
      `UPDATE users SET total_points = COALESCE(total_points, 0) + $1 WHERE id = $2`,
      [achievement.points, userId]
    );

    return achievement;
  }

  async getRecentUnlockedAchievements(
    userId: string,
    limit: number = 5
  ): Promise<Achievement[]> {
    const result = await pool.query(
      `SELECT a.*, ua.unlocked_at
       FROM achievements a
       JOIN user_achievements ua ON a.id = ua.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  async getUserTotalPoints(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COALESCE(total_points, 0) as total_points FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows.length > 0 ? parseInt(result.rows[0].total_points) : 0;
  }

  async checkEarlyBirdAchievement(userId: string, sessionTime: Date): Promise<Achievement | null> {
    const hour = sessionTime.getHours();
    if (hour < 6) {
      return this.unlockSpecialAchievement(userId, 'early_bird');
    }
    return null;
  }

  async checkNightOwlAchievement(userId: string, sessionTime: Date): Promise<Achievement | null> {
    const hour = sessionTime.getHours();
    if (hour >= 0 && hour < 5) {
      return this.unlockSpecialAchievement(userId, 'night_owl');
    }
    return null;
  }
}

export const achievementsService = new AchievementsService();
