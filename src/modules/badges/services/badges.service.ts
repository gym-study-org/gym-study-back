import { pool } from '../../../config/database';
import { logger } from '../../../shared/utils/logger.util';
import { getCacheOrFetch } from '../../../shared/utils/cache.util';
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

const BADGE_CACHE_KEY = 'badges:definitions';
const BADGE_CACHE_TTL = 1800; // 30 minutes

class BadgesService {
  /**
   * Get all badge definitions (cached in Redis for 30 minutes)
   */
  async getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
    return getCacheOrFetch(BADGE_CACHE_KEY, async () => {
      const result = await pool.query(`
        SELECT id, code, name, description, category, icon, stat_key, max_level, levels,
               verification_requirements, is_hireable_signal, created_at, updated_at
        FROM badge_definitions
        ORDER BY category, code
      `);

      return result.rows.map((row) => ({
        ...row,
        levels: typeof row.levels === 'string' ? JSON.parse(row.levels) : row.levels,
        verification_requirements: row.verification_requirements
          ? (typeof row.verification_requirements === 'string'
            ? JSON.parse(row.verification_requirements)
            : row.verification_requirements)
          : null,
        is_hireable_signal: row.is_hireable_signal || false,
      }));
    }, BADGE_CACHE_TTL);
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

  // ==================== AUTHORITY / HIREABLE METHODS ====================

  /**
   * Verify a specific badge for a user (public, no auth required)
   * Returns badge evidence for companies/recruiters
   */
  async verifyBadge(userId: string, badgeCode: string): Promise<{
    verified: boolean;
    badge: BadgeDefinition | null;
    user: { username: string; avatar_url: string | null } | null;
    level: number;
    level_info: BadgeLevel | null;
    evidence: {
      assessment_score: number | null;
      study_hours: number;
      endorsements: number;
      verified_at: string | null;
      expires_at: string | null;
    } | null;
  }> {
    const badge = await this.getBadgeByCode(badgeCode);
    if (!badge) {
      return { verified: false, badge: null, user: null, level: 0, level_info: null, evidence: null };
    }

    const userResult = await pool.query(
      'SELECT username, avatar_url FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return { verified: false, badge, user: null, level: 0, level_info: null, evidence: null };
    }
    const user = userResult.rows[0];

    const userBadgeResult = await pool.query(
      'SELECT current_level, current_value FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badge.id]
    );

    if (userBadgeResult.rows.length === 0 || userBadgeResult.rows[0].current_level === 0) {
      return { verified: false, badge, user, level: 0, level_info: null, evidence: null };
    }

    const level = userBadgeResult.rows[0].current_level;
    const levelInfo = badge.levels.find((l) => l.level === level) || null;

    // Gather evidence for skill badges
    let assessmentScore: number | null = null;
    let endorsements = 0;
    let verifiedAt: string | null = null;
    let expiresAt: string | null = null;

    if (badge.category === 'skills') {
      // Get skill code from badge code (e.g., skill_javascript -> javascript)
      const skillCode = badgeCode.replace('skill_', '');
      const vsResult = await pool.query(
        `SELECT vs.score, vs.endorsement_count, vs.verified_at, vs.expires_at
         FROM verified_skills vs
         JOIN skill_categories sc ON sc.id = vs.skill_category_id
         WHERE vs.user_id = $1 AND sc.code = $2 AND vs.is_active = true
         LIMIT 1`,
        [userId, skillCode]
      );
      if (vsResult.rows.length > 0) {
        assessmentScore = parseFloat(vsResult.rows[0].score);
        endorsements = vsResult.rows[0].endorsement_count;
        verifiedAt = vsResult.rows[0].verified_at;
        expiresAt = vsResult.rows[0].expires_at;
      }
    }

    const statsResult = await pool.query(
      'SELECT COALESCE(total_study_hours, 0) AS total_study_hours FROM users WHERE id = $1',
      [userId]
    );

    return {
      verified: true,
      badge,
      user,
      level,
      level_info: levelInfo,
      evidence: {
        assessment_score: assessmentScore,
        study_hours: parseFloat(statsResult.rows[0]?.total_study_hours || '0'),
        endorsements,
        verified_at: verifiedAt,
        expires_at: expiresAt,
      },
    };
  }

  /**
   * Get all hireable-signal badges for a user (public)
   */
  async getHireableBadges(userId: string): Promise<Array<{
    badge: BadgeDefinition;
    level: number;
    level_info: BadgeLevel | null;
    assessment_score: number | null;
    endorsements: number;
  }>> {
    const badges = await this.getAllBadgeDefinitions();
    const hireableBadges = badges.filter((b) => b.is_hireable_signal);

    if (hireableBadges.length === 0) return [];

    const badgeIds = hireableBadges.map((b) => b.id);
    const userBadgesResult = await pool.query(
      `SELECT badge_id, current_level FROM user_badges
       WHERE user_id = $1 AND badge_id = ANY($2) AND current_level > 0`,
      [userId, badgeIds]
    );

    const userBadgesMap = new Map(
      userBadgesResult.rows.map((r) => [r.badge_id, r.current_level])
    );

    // Get verified skills for enrichment
    const vsResult = await pool.query(
      `SELECT sc.code, vs.score, vs.endorsement_count
       FROM verified_skills vs
       JOIN skill_categories sc ON sc.id = vs.skill_category_id
       WHERE vs.user_id = $1 AND vs.is_active = true`,
      [userId]
    );
    const vsMap = new Map(
      vsResult.rows.map((r) => [r.code, { score: parseFloat(r.score), endorsements: r.endorsement_count }])
    );

    const results: Array<{
      badge: BadgeDefinition;
      level: number;
      level_info: BadgeLevel | null;
      assessment_score: number | null;
      endorsements: number;
    }> = [];

    for (const badge of hireableBadges) {
      const level = userBadgesMap.get(badge.id) || 0;
      if (level === 0) continue;

      const levelInfo = badge.levels.find((l) => l.level === level) || null;
      const skillCode = badge.code.replace('skill_', '');
      const vsData = vsMap.get(skillCode);

      results.push({
        badge,
        level,
        level_info: levelInfo,
        assessment_score: vsData?.score ?? null,
        endorsements: vsData?.endorsements ?? 0,
      });
    }

    return results.sort((a, b) => b.level - a.level);
  }
}

export const badgesService = new BadgesService();
