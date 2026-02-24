import { query } from '../../../config/database';
import { logger } from '../../../shared/utils/logger.util';
import { XPTransaction, XPRule, XPSummary, AwardXPData } from '../interfaces/xp.interface';
import { getCacheOrFetch, deleteCache } from '../../../shared/utils/cache.util';
import { emitToUserGlobal } from '../../../websocket/socket.handler';

export class XPService {
  /**
   * Award XP to a user. Returns the transaction and whether the user leveled up.
   */
  static async awardXP(data: AwardXPData): Promise<{ transaction: XPTransaction; leveled_up: boolean; new_level: number }> {
    const { userId, source, sourceId, multiplier = 1.0, metadata = {} } = data;

    // Get base amount from xp_rules
    const ruleResult = await query(
      'SELECT base_amount FROM xp_rules WHERE source = $1 AND is_active = true',
      [source]
    );

    if (ruleResult.rows.length === 0) {
      logger.warn(`No active XP rule found for source: ${source}`);
      // Fallback: use 10 XP as default
      const amount = Math.round(10 * multiplier);
      return this.insertTransaction(userId, amount, source, sourceId, multiplier, metadata);
    }

    const baseAmount = ruleResult.rows[0].base_amount;
    const amount = Math.round(baseAmount * multiplier);

    return this.insertTransaction(userId, amount, source, sourceId, multiplier, metadata);
  }

  /**
   * Award XP for study session based on duration
   */
  static async awardStudySessionXP(userId: string, sessionId: string, durationMinutes: number): Promise<void> {
    // Base: 10 XP per 30 minutes
    const blocks = Math.max(1, Math.floor(durationMinutes / 30));
    const ruleResult = await query(
      'SELECT base_amount FROM xp_rules WHERE source = $1 AND is_active = true',
      ['study_session']
    );
    const baseAmount = ruleResult.rows.length > 0 ? ruleResult.rows[0].base_amount : 10;
    const amount = baseAmount * blocks;

    await this.insertTransaction(userId, amount, 'study_session', sessionId, 1.0, {
      duration_minutes: durationMinutes,
      blocks,
    });

    // Check if this is the first session of the day
    const todayResult = await query(
      `SELECT COUNT(*) FROM xp_transactions
       WHERE user_id = $1 AND source = 'first_session_of_day'
       AND created_at >= CURRENT_DATE`,
      [userId]
    );

    if (parseInt(todayResult.rows[0].count) === 0) {
      await this.insertTransaction(userId, 15, 'first_session_of_day', sessionId, 1.0, {});
    }

    // Invalidate XP cache
    await deleteCache(`xp:summary:${userId}`);
  }

  private static async insertTransaction(
    userId: string,
    amount: number,
    source: string,
    sourceId: string | undefined | null,
    multiplier: number,
    metadata: Record<string, unknown>
  ): Promise<{ transaction: XPTransaction; leveled_up: boolean; new_level: number }> {
    // Get current level before insert
    const beforeResult = await query('SELECT level FROM users WHERE id = $1', [userId]);
    const levelBefore = beforeResult.rows.length > 0 ? beforeResult.rows[0].level : 1;

    const result = await query(
      `INSERT INTO xp_transactions (user_id, amount, source, source_id, multiplier, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, amount, source, sourceId || null, multiplier, JSON.stringify(metadata)]
    );

    const transaction = result.rows[0];

    // Get new level after trigger
    const afterResult = await query('SELECT level, total_xp FROM users WHERE id = $1', [userId]);
    const newLevel = afterResult.rows[0].level;
    const leveled_up = newLevel > levelBefore;

    // Invalidate cache so next summary fetch is fresh
    await deleteCache(`xp:summary:${userId}`);

    // ── Side effects (fire-and-forget, never block the main flow) ──────────

    // 1. Emit WebSocket event so frontend toast and XPBar update immediately
    emitToUserGlobal(userId, 'xp:gained', {
      amount,
      source,
      leveled_up,
      new_level: newLevel,
      timestamp: new Date().toISOString(),
    });
    if (leveled_up) {
      emitToUserGlobal(userId, 'xp:level_up', {
        new_level: newLevel,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Sync XP to league membership rank (dynamic import to avoid circular dep)
    import('../../leagues/services/leagues.service').then(({ LeaguesService }) => {
      LeaguesService.syncUserXP(userId).catch((err: unknown) =>
        logger.error('XP: league sync error:', err)
      );
    }).catch(() => {});

    // 3. Update the earn_xp daily quest (dynamic import to avoid circular dep)
    import('../../quests/services/quests.service').then(({ QuestsService }) => {
      QuestsService.updateProgress(userId, 'earn_xp', amount).catch((err: unknown) =>
        logger.error('XP: quest earn_xp update error:', err)
      );
    }).catch(() => {});

    return { transaction, leveled_up, new_level: newLevel };
  }

  /**
   * Get XP summary for a user
   */
  static async getXPSummary(userId: string): Promise<XPSummary> {
    return getCacheOrFetch(`xp:summary:${userId}`, async () => {
      const result = await query(
        'SELECT total_xp, weekly_xp, level FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          total_xp: 0,
          weekly_xp: 0,
          level: 1,
          next_level_xp: 100,
          xp_to_next_level: 100,
          level_progress_percent: 0,
        };
      }

      const { total_xp, weekly_xp, level } = result.rows[0];

      // Level formula: level = floor(sqrt(total_xp / 100)) + 1
      // Reverse: xp_for_level = (level - 1)^2 * 100
      const currentLevelXP = Math.pow(level - 1, 2) * 100;
      const nextLevelXP = Math.pow(level, 2) * 100;
      const xpInCurrentLevel = total_xp - currentLevelXP;
      const xpNeededForLevel = nextLevelXP - currentLevelXP;
      const progressPercent = xpNeededForLevel > 0
        ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
        : 0;

      return {
        total_xp,
        weekly_xp,
        level,
        next_level_xp: nextLevelXP,
        xp_to_next_level: Math.max(0, nextLevelXP - total_xp),
        level_progress_percent: progressPercent,
      };
    }, 300); // 5 min cache
  }

  /**
   * Get XP transaction history with cursor-based pagination
   */
  static async getXPHistory(
    userId: string,
    options: { limit: number; cursor?: string; source?: string }
  ): Promise<{ transactions: XPTransaction[]; next_cursor: string | null }> {
    const { limit, cursor, source } = options;

    let sql = `SELECT * FROM xp_transactions WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramIdx = 2;

    if (cursor) {
      sql += ` AND created_at < $${paramIdx++}`;
      params.push(cursor);
    }

    if (source) {
      sql += ` AND source = $${paramIdx++}`;
      params.push(source);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const transactions = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;
    const next_cursor = hasMore && transactions.length > 0
      ? transactions[transactions.length - 1].created_at
      : null;

    return { transactions, next_cursor };
  }

  /**
   * Get all active XP rules
   */
  static async getXPRules(): Promise<XPRule[]> {
    return getCacheOrFetch('xp:rules', async () => {
      const result = await query(
        'SELECT * FROM xp_rules WHERE is_active = true ORDER BY base_amount DESC'
      );
      return result.rows;
    }, 3600); // 1 hour cache
  }

  /**
   * Reset weekly XP for all users (called by cron every Monday)
   */
  static async resetWeeklyXP(): Promise<number> {
    const result = await query('UPDATE users SET weekly_xp = 0 WHERE weekly_xp > 0');
    return result.rowCount || 0;
  }
}
