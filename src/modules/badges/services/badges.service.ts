import { pool } from '../../../config/database';
import { logger } from '../../../shared/utils/logger.util';
import {
  BadgeDefinition,
  BadgeLevel,
  UserBadge,
  UserBadgeWithDefinition,
  UserBadgesResponse,
  BadgeCategoryStats,
  BadgeLevelUpEvent,
  BadgeCategory,
  UserStats,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  STAT_KEY_MAP,
} from '../interfaces/badge.interface';

class BadgesService {
  // Cache for badge definitions (rarely change)
  private badgeDefinitionsCache: BadgeDefinition[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all badge definitions
   */
  async getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
    // Check cache
    if (this.badgeDefinitionsCache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.badgeDefinitionsCache;
    }

    const result = await pool.query(`
      SELECT id, code, name, description, category, icon, stat_key, max_level, levels, created_at, updated_at
      FROM badge_definitions
      ORDER BY category, code
    `);

    this.badgeDefinitionsCache = result.rows.map((row) => ({
      ...row,
      levels: typeof row.levels === 'string' ? JSON.parse(row.levels) : row.levels,
    }));
    this.cacheTimestamp = Date.now();

    return this.badgeDefinitionsCache;
  }

  /**
   * Get a single badge definition by code
   */
  async getBadgeByCode(code: string): Promise<BadgeDefinition | null> {
    const badges = await this.getAllBadgeDefinitions();
    return badges.find((b) => b.code === code) || null;
  }

  /**
   * Get user stats from users table
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const result = await pool.query(
      `SELECT
        COALESCE(total_study_hours, 0) as total_study_hours,
        COALESCE(current_streak, 0) as current_streak,
        COALESCE(longest_streak, 0) as longest_streak,
        COALESCE(sessions_count, 0) as sessions_count,
        COALESCE(certifications_count, 0) as certifications_count,
        COALESCE(completed_goals_count, 0) as completed_goals_count,
        COALESCE(friends_count, 0) as friends_count
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  /**
   * Get user's badges with progress
   */
  async getUserBadges(userId: string): Promise<UserBadgesResponse> {
    const [badges, userBadgesResult, userStats] = await Promise.all([
      this.getAllBadgeDefinitions(),
      pool.query(
        `SELECT id, user_id, badge_id, current_level, current_value,
                total_points_earned, first_unlocked_at, last_level_up_at,
                created_at, updated_at
         FROM user_badges
         WHERE user_id = $1`,
        [userId]
      ),
      this.getUserStats(userId),
    ]);

    const userBadgesMap = new Map<string, UserBadge>();
    userBadgesResult.rows.forEach((ub) => {
      userBadgesMap.set(ub.badge_id, ub);
    });

    const badgesWithProgress: UserBadgeWithDefinition[] = badges.map((badge) => {
      const userBadge = userBadgesMap.get(badge.id);
      const currentValue = this.getCurrentValueForBadge(badge, userStats);

      if (userBadge) {
        return this.enrichBadgeWithProgress(badge, {
          ...userBadge,
          current_value: currentValue, // Use fresh value from stats
        });
      }

      // Create default user badge if not exists
      return this.enrichBadgeWithProgress(badge, {
        id: '',
        user_id: userId,
        badge_id: badge.id,
        current_level: 0,
        current_value: currentValue,
        total_points_earned: 0,
        first_unlocked_at: null,
        last_level_up_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    // Sort: unlocked badges first (by level desc), then locked (by category)
    badgesWithProgress.sort((a, b) => {
      if (a.current_level > 0 && b.current_level === 0) return -1;
      if (a.current_level === 0 && b.current_level > 0) return 1;
      if (a.current_level > 0 && b.current_level > 0) {
        return b.current_level - a.current_level;
      }
      return 0;
    });

    const totalPoints = badgesWithProgress.reduce((sum, b) => sum + b.total_points_earned, 0);
    const totalLevelsUnlocked = badgesWithProgress.reduce((sum, b) => sum + b.current_level, 0);
    const maxPossibleLevels = badges.reduce((sum, b) => sum + b.max_level, 0);

    return {
      badges: badgesWithProgress,
      total_points: totalPoints,
      total_levels_unlocked: totalLevelsUnlocked,
      max_possible_levels: maxPossibleLevels,
    };
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(userId: string): Promise<BadgeCategoryStats[]> {
    const { badges } = await this.getUserBadges(userId);

    const categoryMap = new Map<BadgeCategory, UserBadgeWithDefinition[]>();

    badges.forEach((badge) => {
      const category = badge.badge.category as BadgeCategory;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(badge);
    });

    const stats: BadgeCategoryStats[] = [];

    categoryMap.forEach((categoryBadges, category) => {
      const totalLevels = categoryBadges.reduce((sum, b) => sum + b.badge.max_level, 0);
      const unlockedLevels = categoryBadges.reduce((sum, b) => sum + b.current_level, 0);
      const pointsEarned = categoryBadges.reduce((sum, b) => sum + b.total_points_earned, 0);
      const maxPoints = categoryBadges.reduce((sum, b) => {
        return sum + b.badge.levels.reduce((s, l) => s + l.points, 0);
      }, 0);

      stats.push({
        category,
        label: CATEGORY_LABELS[category],
        icon: CATEGORY_ICONS[category],
        badges: categoryBadges,
        total_levels: totalLevels,
        unlocked_levels: unlockedLevels,
        points_earned: pointsEarned,
        max_points: maxPoints,
      });
    });

    return stats;
  }

  /**
   * Check and update badges for a user (called after stat changes)
   */
  async checkAndUpdateBadges(
    userId: string,
    category?: BadgeCategory
  ): Promise<BadgeLevelUpEvent[]> {
    const levelUpEvents: BadgeLevelUpEvent[] = [];

    try {
      const [badges, userStats] = await Promise.all([
        this.getAllBadgeDefinitions(),
        this.getUserStats(userId),
      ]);

      const badgesToCheck = category
        ? badges.filter((b) => b.category === category)
        : badges.filter((b) => b.category !== 'special'); // Skip special badges unless explicitly checking

      for (const badge of badgesToCheck) {
        const levelUpEvent = await this.checkAndUpdateSingleBadge(userId, badge, userStats);
        if (levelUpEvent) {
          levelUpEvents.push(levelUpEvent);
        }
      }

      // Update user's total points if there were level ups
      if (levelUpEvents.length > 0) {
        await this.updateUserTotalPoints(userId);
      }

      return levelUpEvents;
    } catch (error) {
      logger.error('Error checking badges:', error);
      return [];
    }
  }

  /**
   * Check and update a single badge for a user
   */
  private async checkAndUpdateSingleBadge(
    userId: string,
    badge: BadgeDefinition,
    userStats: UserStats
  ): Promise<BadgeLevelUpEvent | null> {
    const currentValue = this.getCurrentValueForBadge(badge, userStats);

    // Get or create user badge record
    let userBadge = await this.getOrCreateUserBadge(userId, badge.id);
    const previousLevel = userBadge.current_level;

    // Calculate new level based on current value
    const newLevel = this.calculateLevelFromValue(currentValue, badge.levels);

    // No level change
    if (newLevel <= previousLevel) {
      // Still update current_value for progress tracking
      if (currentValue !== userBadge.current_value) {
        await pool.query(
          `UPDATE user_badges SET current_value = $1, updated_at = NOW() WHERE id = $2`,
          [currentValue, userBadge.id]
        );
      }
      return null;
    }

    // Level up!
    const newLevelInfo = badge.levels.find((l) => l.level === newLevel)!;
    const pointsForNewLevels = this.calculatePointsForLevelRange(
      previousLevel + 1,
      newLevel,
      badge.levels
    );
    const newTotalPoints = userBadge.total_points_earned + pointsForNewLevels;

    // Update user_badges
    await pool.query(
      `UPDATE user_badges
       SET current_level = $1,
           current_value = $2,
           total_points_earned = $3,
           first_unlocked_at = COALESCE(first_unlocked_at, NOW()),
           last_level_up_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [newLevel, currentValue, newTotalPoints, userBadge.id]
    );

    // Record history
    await pool.query(
      `INSERT INTO user_badge_history (user_id, badge_id, from_level, to_level, points_earned)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, badge.id, previousLevel, newLevel, pointsForNewLevels]
    );

    logger.info(
      `Badge level up: User ${userId} - ${badge.code} Level ${previousLevel} -> ${newLevel} (+${pointsForNewLevels} pts)`
    );

    // Get updated total points
    const totalPointsResult = await pool.query(
      `SELECT COALESCE(SUM(total_points_earned), 0) as total FROM user_badges WHERE user_id = $1`,
      [userId]
    );

    return {
      badge,
      from_level: previousLevel,
      to_level: newLevel,
      level_info: newLevelInfo,
      points_earned: pointsForNewLevels,
      new_total_points: parseInt(totalPointsResult.rows[0].total),
    };
  }

  /**
   * Check and unlock special badge (for time-based or special achievements)
   */
  async checkSpecialBadge(
    userId: string,
    badgeCode: string,
    incrementValue: number = 1
  ): Promise<BadgeLevelUpEvent | null> {
    const badge = await this.getBadgeByCode(badgeCode);
    if (!badge) {
      logger.warn(`Badge not found: ${badgeCode}`);
      return null;
    }

    const userBadge = await this.getOrCreateUserBadge(userId, badge.id);
    const previousLevel = userBadge.current_level;
    const newValue = userBadge.current_value + incrementValue;

    // Calculate new level
    const newLevel = this.calculateLevelFromValue(newValue, badge.levels);

    if (newLevel <= previousLevel) {
      // Update value but no level up
      await pool.query(
        `UPDATE user_badges SET current_value = $1, updated_at = NOW() WHERE id = $2`,
        [newValue, userBadge.id]
      );
      return null;
    }

    // Level up
    const newLevelInfo = badge.levels.find((l) => l.level === newLevel)!;
    const pointsEarned = this.calculatePointsForLevelRange(
      previousLevel + 1,
      newLevel,
      badge.levels
    );

    await pool.query(
      `UPDATE user_badges
       SET current_level = $1,
           current_value = $2,
           total_points_earned = total_points_earned + $3,
           first_unlocked_at = COALESCE(first_unlocked_at, NOW()),
           last_level_up_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [newLevel, newValue, pointsEarned, userBadge.id]
    );

    await pool.query(
      `INSERT INTO user_badge_history (user_id, badge_id, from_level, to_level, points_earned)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, badge.id, previousLevel, newLevel, pointsEarned]
    );

    await this.updateUserTotalPoints(userId);

    const totalPointsResult = await pool.query(
      `SELECT COALESCE(SUM(total_points_earned), 0) as total FROM user_badges WHERE user_id = $1`,
      [userId]
    );

    return {
      badge,
      from_level: previousLevel,
      to_level: newLevel,
      level_info: newLevelInfo,
      points_earned: pointsEarned,
      new_total_points: parseInt(totalPointsResult.rows[0].total),
    };
  }

  /**
   * Get recent level-up events for a user
   */
  async getRecentLevelUps(userId: string, limit: number = 10): Promise<BadgeLevelUpEvent[]> {
    const badges = await this.getAllBadgeDefinitions();
    const badgesMap = new Map(badges.map((b) => [b.id, b]));

    const result = await pool.query(
      `SELECT badge_id, from_level, to_level, points_earned, triggered_at
       FROM user_badge_history
       WHERE user_id = $1
       ORDER BY triggered_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => {
      const badge = badgesMap.get(row.badge_id)!;
      const levelInfo = badge.levels.find((l) => l.level === row.to_level)!;
      return {
        badge,
        from_level: row.from_level,
        to_level: row.to_level,
        level_info: levelInfo,
        points_earned: row.points_earned,
        new_total_points: 0, // Not available from history
      };
    });
  }

  /**
   * Get user's total points from badges
   */
  async getUserTotalPoints(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COALESCE(SUM(total_points_earned), 0) as total FROM user_badges WHERE user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].total);
  }

  // ==================== HELPER METHODS ====================

  private getCurrentValueForBadge(badge: BadgeDefinition, userStats: UserStats): number {
    const statKey = STAT_KEY_MAP[badge.stat_key];
    if (statKey) {
      return userStats[statKey] || 0;
    }
    return 0;
  }

  private calculateLevelFromValue(value: number, levels: BadgeLevel[]): number {
    let level = 0;
    for (const lvl of levels) {
      if (value >= lvl.requirement) {
        level = lvl.level;
      }
    }
    return level;
  }

  private calculatePointsForLevelRange(
    fromLevel: number,
    toLevel: number,
    levels: BadgeLevel[]
  ): number {
    return levels
      .filter((l) => l.level >= fromLevel && l.level <= toLevel)
      .reduce((sum, l) => sum + l.points, 0);
  }

  private enrichBadgeWithProgress(badge: BadgeDefinition, userBadge: UserBadge): UserBadgeWithDefinition {
    const currentLevel = userBadge.current_level;
    const currentValue = userBadge.current_value;
    const isMaxLevel = currentLevel >= badge.max_level;

    const currentLevelInfo = badge.levels.find((l) => l.level === currentLevel) || null;
    const nextLevel = isMaxLevel ? null : badge.levels.find((l) => l.level === currentLevel + 1) || null;

    let progressPercentage = 0;
    if (nextLevel) {
      const prevRequirement = currentLevelInfo?.requirement || 0;
      const nextRequirement = nextLevel.requirement;
      const progress = currentValue - prevRequirement;
      const needed = nextRequirement - prevRequirement;
      progressPercentage = Math.min(100, Math.max(0, (progress / needed) * 100));
    } else if (isMaxLevel) {
      progressPercentage = 100;
    }

    return {
      ...userBadge,
      badge,
      next_level: nextLevel,
      progress_percentage: Math.round(progressPercentage * 10) / 10,
      is_max_level: isMaxLevel,
      current_level_info: currentLevelInfo,
    };
  }

  private async getOrCreateUserBadge(userId: string, badgeId: string): Promise<UserBadge> {
    // Try to get existing
    const existing = await pool.query(
      `SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
      [userId, badgeId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new
    const inserted = await pool.query(
      `INSERT INTO user_badges (user_id, badge_id, current_level, current_value, total_points_earned)
       VALUES ($1, $2, 0, 0, 0)
       RETURNING *`,
      [userId, badgeId]
    );

    return inserted.rows[0];
  }

  private async updateUserTotalPoints(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET total_points = COALESCE((
         SELECT SUM(total_points_earned) FROM user_badges WHERE user_id = $1
       ), 0)
       WHERE id = $1`,
      [userId]
    );
  }
}

export const badgesService = new BadgesService();
