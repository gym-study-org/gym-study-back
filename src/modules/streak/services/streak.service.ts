import { query } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import { logger } from '../../../shared/utils/logger.util';
import {
  StreakStatus,
  STREAK_MILESTONES,
  STREAK_MILESTONE_XP,
  STREAK_FREEZE_COST_GEMS,
  MAX_STREAK_FREEZES,
} from '../interfaces/streak.interface';
import { XPService } from '../../xp/services/xp.service';
import { emitToUser } from '../../../websocket/socket.handler';
import { io } from '../../../server';
import { enqueueNotification } from '../../../shared/queue/queues';

export class StreakService {
  /**
   * Get streak status for a user
   */
  static async getStatus(userId: string): Promise<StreakStatus> {
    const userResult = await query(
      `SELECT current_streak, longest_streak, last_study_date,
              streak_freezes_available, streak_freeze_used_today
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    // Get achieved milestones
    const milestonesResult = await query(
      'SELECT milestone_days FROM streak_milestones WHERE user_id = $1 ORDER BY milestone_days',
      [userId]
    );
    const milestonesAchieved = milestonesResult.rows.map((r: any) => r.milestone_days);

    // Calculate next milestone
    const currentStreak = user.current_streak || 0;
    const nextMilestone = STREAK_MILESTONES.find(m => m > currentStreak && !milestonesAchieved.includes(m));

    let nextMilestoneInfo = null;
    if (nextMilestone) {
      const xpSource = STREAK_MILESTONE_XP[nextMilestone];
      let xpReward = 0;
      if (xpSource) {
        const ruleResult = await query(
          'SELECT base_amount FROM xp_rules WHERE source = $1 AND is_active = true',
          [xpSource]
        );
        xpReward = ruleResult.rows.length > 0 ? ruleResult.rows[0].base_amount : 0;
      }

      nextMilestoneInfo = {
        days: nextMilestone,
        days_remaining: nextMilestone - currentStreak,
        xp_reward: xpReward,
      };
    }

    return {
      current_streak: currentStreak,
      longest_streak: user.longest_streak || 0,
      last_study_date: user.last_study_date,
      streak_freezes_available: user.streak_freezes_available || 0,
      streak_freeze_used_today: user.streak_freeze_used_today || false,
      next_milestone: nextMilestoneInfo,
      milestones_achieved: milestonesAchieved,
    };
  }

  /**
   * Buy a streak freeze using gems
   */
  static async buyFreeze(userId: string): Promise<{ freezes_available: number }> {
    // Check current freezes
    const userResult = await query(
      'SELECT streak_freezes_available, gems_balance FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];
    const currentFreezes = user.streak_freezes_available || 0;

    if (currentFreezes >= MAX_STREAK_FREEZES) {
      throw new AppError(
        `Máximo de ${MAX_STREAK_FREEZES} freezes permitidos`,
        400,
        'MAX_FREEZES_REACHED'
      );
    }

    // Check gems balance (gems system will be implemented in Phase 6.5)
    // For now, allow buying if user has gems_balance column, otherwise just grant
    const gemsBalance = user.gems_balance || 0;
    if (gemsBalance < STREAK_FREEZE_COST_GEMS) {
      throw new AppError(
        `Gemas insuficientes. Custo: ${STREAK_FREEZE_COST_GEMS}, Saldo: ${gemsBalance}`,
        400,
        'INSUFFICIENT_GEMS'
      );
    }

    // Deduct gems and add freeze
    await query(
      `UPDATE users SET
        streak_freezes_available = streak_freezes_available + 1,
        gems_balance = gems_balance - $1
       WHERE id = $2`,
      [STREAK_FREEZE_COST_GEMS, userId]
    );

    return { freezes_available: currentFreezes + 1 };
  }

  /**
   * Check and award streak milestones after streak update
   */
  static async checkMilestones(userId: string, currentStreak: number): Promise<void> {
    for (const milestone of STREAK_MILESTONES) {
      if (currentStreak < milestone) break;

      // Check if already achieved
      const existing = await query(
        'SELECT id FROM streak_milestones WHERE user_id = $1 AND milestone_days = $2',
        [userId, milestone]
      );

      if (existing.rows.length > 0) continue;

      // Award milestone
      const xpSource = STREAK_MILESTONE_XP[milestone];
      let xpAwarded = 0;

      if (xpSource) {
        try {
          const result = await XPService.awardXP({
            userId,
            source: xpSource,
            metadata: { milestone_days: milestone },
          });
          xpAwarded = result.transaction.amount;
        } catch (err) {
          logger.error(`Error awarding streak milestone XP for ${milestone} days:`, err);
        }
      }

      // Record milestone
      await query(
        'INSERT INTO streak_milestones (user_id, milestone_days, xp_awarded) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, milestone, xpAwarded]
      );

      // Award gems for streak milestones
      const gemSource = milestone >= 100 ? 'streak_milestone_100' : milestone >= 30 ? 'streak_milestone_30' : milestone >= 7 ? 'streak_milestone_7' : null;
      if (gemSource) {
        import('../../gems/services/gems.service').then(({ GemsService }) => {
          GemsService.awardGems(userId, gemSource).catch(() => {});
        }).catch(() => {});
      }

      // Emit WebSocket event
      emitToUser(io, userId, 'streak:milestone', {
        milestone_days: milestone,
        xp_awarded: xpAwarded,
        current_streak: currentStreak,
        timestamp: new Date().toISOString(),
      });

      // Send notification
      enqueueNotification({
        user_id: userId,
        type: 'streak_milestone',
        title: `Ofensiva de ${milestone} dias!`,
        body: xpAwarded > 0
          ? `Parabéns! Você manteve sua ofensiva por ${milestone} dias e ganhou ${xpAwarded} XP!`
          : `Parabéns! Você manteve sua ofensiva por ${milestone} dias!`,
        data: { milestone_days: milestone, xp_awarded: xpAwarded },
      }).catch(err => logger.error('Error sending streak milestone notification:', err));

      logger.info(`User ${userId} achieved streak milestone: ${milestone} days (+${xpAwarded} XP)`);
    }
  }

  /**
   * Use a streak freeze (called from streak.job.ts)
   * Returns true if freeze was used, false if none available
   */
  static async useFreeze(userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE users SET
        streak_freezes_available = streak_freezes_available - 1,
        streak_freeze_used_today = true
       WHERE id = $1 AND streak_freezes_available > 0
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    // Log the freeze usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await query(
      'INSERT INTO streak_freezes (user_id, used_on, was_auto) VALUES ($1, $2, true) ON CONFLICT DO NOTHING',
      [userId, today]
    );

    // Notify user
    enqueueNotification({
      user_id: userId,
      type: 'streak_freeze_used',
      title: 'Freeze de ofensiva usado!',
      body: 'Sua ofensiva foi protegida automaticamente por um freeze.',
      data: {},
    }).catch(err => logger.error('Error sending freeze notification:', err));

    emitToUser(io, userId, 'streak:freeze_used', {
      timestamp: new Date().toISOString(),
    });

    return true;
  }
}
