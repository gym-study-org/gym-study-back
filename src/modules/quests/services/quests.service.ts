import { query } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import { logger } from '../../../shared/utils/logger.util';
import { UserDailyQuest, QuestType } from '../interfaces/quests.interface';
import { XPService } from '../../xp/services/xp.service';
import { emitToUser } from '../../../websocket/socket.handler';
import { io } from '../../../server';

export class QuestsService {
  /**
   * Get today's daily quests for a user (generates if not exist)
   */
  static async getDailyQuests(userId: string): Promise<UserDailyQuest[]> {
    const today = new Date().toISOString().split('T')[0];

    // Check if quests exist for today
    const existing = await query(
      `SELECT udq.*, qt.quest_type, qt.tier, qt.title_pt, qt.description_pt, qt.xp_reward
       FROM user_daily_quests udq
       JOIN quest_templates qt ON qt.id = udq.quest_template_id
       WHERE udq.user_id = $1 AND udq.quest_date = $2
       ORDER BY CASE qt.tier WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2 WHEN 'gold' THEN 3 END`,
      [userId, today]
    );

    if (existing.rows.length >= 3) {
      return existing.rows;
    }

    // Generate quests for today
    await this.generateDailyQuests(userId, today);

    const result = await query(
      `SELECT udq.*, qt.quest_type, qt.tier, qt.title_pt, qt.description_pt, qt.xp_reward
       FROM user_daily_quests udq
       JOIN quest_templates qt ON qt.id = udq.quest_template_id
       WHERE udq.user_id = $1 AND udq.quest_date = $2
       ORDER BY CASE qt.tier WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2 WHEN 'gold' THEN 3 END`,
      [userId, today]
    );

    return result.rows;
  }

  /**
   * Generate 3 daily quests (1 bronze, 1 silver, 1 gold)
   */
  private static async generateDailyQuests(userId: string, date: string): Promise<void> {
    const tiers = ['bronze', 'silver', 'gold'];

    for (const tier of tiers) {
      // Pick a random template for this tier
      const templateResult = await query(
        `SELECT * FROM quest_templates
         WHERE tier = $1 AND is_active = true
         ORDER BY RANDOM() LIMIT 1`,
        [tier]
      );

      if (templateResult.rows.length === 0) continue;

      const template = templateResult.rows[0];

      await query(
        `INSERT INTO user_daily_quests (user_id, quest_template_id, quest_date, target_value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, quest_template_id, quest_date) DO NOTHING`,
        [userId, template.id, date, template.target_value]
      );
    }
  }

  /**
   * Claim XP reward for a completed quest
   */
  static async claimQuest(userId: string, questId: string): Promise<{ xp_awarded: number }> {
    // Get quest with template info
    const questResult = await query(
      `SELECT udq.*, qt.xp_reward, qt.tier
       FROM user_daily_quests udq
       JOIN quest_templates qt ON qt.id = udq.quest_template_id
       WHERE udq.id = $1 AND udq.user_id = $2`,
      [questId, userId]
    );

    if (questResult.rows.length === 0) {
      throw new AppError('Missão não encontrada', 404, 'QUEST_NOT_FOUND');
    }

    const quest = questResult.rows[0];

    if (!quest.is_completed) {
      throw new AppError('Missão ainda não foi completada', 400, 'QUEST_NOT_COMPLETED');
    }

    if (quest.xp_claimed) {
      throw new AppError('XP já foi resgatado', 400, 'XP_ALREADY_CLAIMED');
    }

    // Mark as claimed
    await query(
      'UPDATE user_daily_quests SET xp_claimed = true, claimed_at = NOW() WHERE id = $1',
      [questId]
    );

    // Award XP
    const xpSource = `daily_quest_${quest.tier}` as string;
    const result = await XPService.awardXP({
      userId,
      source: xpSource,
      sourceId: questId,
      metadata: { quest_tier: quest.tier },
    });

    // Emit quest claimed event
    emitToUser(io, userId, 'quest:claimed', {
      quest_id: questId,
      tier: quest.tier,
      xp_awarded: result.transaction.amount,
      timestamp: new Date().toISOString(),
    });

    // Check if all 3 daily quests are now claimed → award bonus gems
    const allClaimed = await query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN xp_claimed THEN 1 ELSE 0 END) as claimed
       FROM user_daily_quests WHERE user_id = $1 AND quest_date = $2`,
      [userId, quest.quest_date]
    );
    if (parseInt(allClaimed.rows[0].claimed) >= 3) {
      import('../../gems/services/gems.service').then(({ GemsService }) => {
        GemsService.awardGems(userId, 'quest_all_complete').catch(() => {});
      }).catch(() => {});
    }

    return { xp_awarded: result.transaction.amount };
  }

  /**
   * Update quest progress for a given quest type
   * Called from various services when actions happen
   */
  static async updateProgress(userId: string, questType: QuestType, increment: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Find today's quests matching this type that aren't completed
    const quests = await query(
      `SELECT udq.id, udq.current_progress, udq.target_value
       FROM user_daily_quests udq
       JOIN quest_templates qt ON qt.id = udq.quest_template_id
       WHERE udq.user_id = $1 AND udq.quest_date = $2
         AND qt.quest_type = $3 AND udq.is_completed = false`,
      [userId, today, questType]
    );

    for (const quest of quests.rows) {
      const newProgress = Math.min(quest.current_progress + increment, quest.target_value);
      const isCompleted = newProgress >= quest.target_value;

      await query(
        `UPDATE user_daily_quests
         SET current_progress = $1, is_completed = $2, completed_at = $3
         WHERE id = $4`,
        [newProgress, isCompleted, isCompleted ? new Date() : null, quest.id]
      );

      if (isCompleted) {
        // Emit quest completed event
        emitToUser(io, userId, 'quest:completed', {
          quest_id: quest.id,
          timestamp: new Date().toISOString(),
        });

        logger.info(`User ${userId} completed quest ${quest.id}`);
      }
    }
  }

  /**
   * Generate daily quests for all active users (called by cron)
   */
  static async generateForAllUsers(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    // Get active users who don't have quests for today
    const users = await query(
      `SELECT u.id FROM users u
       WHERE u.is_active = true AND u.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_daily_quests udq
         WHERE udq.user_id = u.id AND udq.quest_date = $1
       )`,
      [today]
    );

    for (const user of users.rows) {
      await this.generateDailyQuests(user.id, today);
    }

    return users.rows.length;
  }
}
