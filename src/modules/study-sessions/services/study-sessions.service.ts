import { query } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import {
  CreateStudySessionDTO,
  UpdateStudySessionDTO,
  StudySession,
  StudySessionStats,
} from '../interfaces/study-sessions.interface';
import { PaginationParams } from '../../../shared/types/common.types';
import { updateUserStreak } from '../../../jobs/streak.job';
import { checkAndEmitAchievements } from '../../achievements/controllers/achievements.controller';
import { achievementsService } from '../../achievements/services/achievements.service';
import { logger } from '../../../shared/utils/logger.util';
import { invalidateRankingCache } from '../../ranking/services/ranking.service';
import { XPService } from '../../xp/services/xp.service';
import { badgesService } from '../../badges/services/badges.service';

export class StudySessionsService {
  static async create(userId: string, data: CreateStudySessionDTO): Promise<StudySession> {
    const {
      title,
      subject,
      description,
      duration_minutes,
      is_for_certification,
      certification_name,
      tags,
      started_at,
      finished_at,
    } = data;

    const result = await query(
      `INSERT INTO study_sessions
       (user_id, title, subject, description, duration_minutes, is_for_certification,
        certification_name, tags, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        title,
        subject,
        description || null,
        duration_minutes,
        is_for_certification || false,
        certification_name || null,
        tags || null,
        started_at,
        finished_at,
      ]
    );

    const session = result.rows[0];

    // Update user streak (async, don't block response)
    updateUserStreak(userId).catch((err) =>
      logger.error('Error updating streak:', err)
    );

    // Check for achievements (sessions and study_hours categories)
    checkAndEmitAchievements(userId, 'sessions').catch((err) =>
      logger.error('Error checking sessions achievements:', err)
    );
    checkAndEmitAchievements(userId, 'study_hours').catch((err) =>
      logger.error('Error checking study_hours achievements:', err)
    );
    checkAndEmitAchievements(userId, 'streak').catch((err) =>
      logger.error('Error checking streak achievements:', err)
    );

    // Check special achievements (early bird, night owl)
    const sessionTime = new Date(started_at);
    achievementsService.checkEarlyBirdAchievement(userId, sessionTime).catch((err) =>
      logger.error('Error checking early bird achievement:', err)
    );
    achievementsService.checkNightOwlAchievement(userId, sessionTime).catch((err) =>
      logger.error('Error checking night owl achievement:', err)
    );

    // Invalidate ranking caches
    invalidateRankingCache().catch((err) =>
      logger.error('Error invalidating ranking cache:', err)
    );

    // Award XP for study session (async, don't block response)
    XPService.awardStudySessionXP(userId, session.id, duration_minutes).catch((err) =>
      logger.error('Error awarding study session XP:', err)
    );

    // Check badges for study-related categories (async, don't block response)
    badgesService.checkAndUpdateBadges(userId, 'study_hours').catch((err) =>
      logger.error('Error checking study_hours badges:', err)
    );
    badgesService.checkAndUpdateBadges(userId, 'sessions').catch((err) =>
      logger.error('Error checking sessions badges:', err)
    );

    // Special time-based badges
    const hour = sessionTime.getHours();
    const dayOfWeek = sessionTime.getDay(); // 0=Sun, 6=Sat
    if (hour >= 5 && hour < 8) {
      badgesService.checkSpecialBadge(userId, 'early_bird', 1).catch((err) =>
        logger.error('Error checking early_bird badge:', err)
      );
    }
    if (hour >= 23 || hour < 3) {
      badgesService.checkSpecialBadge(userId, 'night_owl', 1).catch((err) =>
        logger.error('Error checking night_owl badge:', err)
      );
    }
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      badgesService.checkSpecialBadge(userId, 'weekend_warrior', 1).catch((err) =>
        logger.error('Error checking weekend_warrior badge:', err)
      );
    }

    // Update daily quests (async, don't block response)
    import('../../quests/services/quests.service').then(({ QuestsService }) => {
      QuestsService.updateProgress(userId, 'study_minutes', duration_minutes).catch((err) =>
        logger.error('Error updating study_minutes quest:', err)
      );
      QuestsService.updateProgress(userId, 'study_sessions', 1).catch((err) =>
        logger.error('Error updating study_sessions quest:', err)
      );
    }).catch(() => {});

    return session;
  }

  static async findByUserId(
    userId: string,
    pagination: PaginationParams
  ): Promise<{ sessions: StudySession[]; total: number }> {
    const { limit, offset } = pagination;

    const countResult = await query(
      'SELECT COUNT(*) FROM study_sessions WHERE user_id = $1',
      [userId]
    );

    const result = await query(
      `SELECT * FROM study_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async findById(id: string, userId: string): Promise<StudySession> {
    const result = await query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Study session not found', 404, 'SESSION_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async update(
    id: string,
    userId: string,
    data: UpdateStudySessionDTO
  ): Promise<StudySession> {
    const { title, subject, description, is_for_certification, certification_name, tags } = data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(subject);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (is_for_certification !== undefined) {
      updates.push(`is_for_certification = $${paramIndex++}`);
      values.push(is_for_certification);
    }

    if (certification_name !== undefined) {
      updates.push(`certification_name = $${paramIndex++}`);
      values.push(certification_name);
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(tags);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_UPDATES');
    }

    values.push(id, userId);

    const result = await query(
      `UPDATE study_sessions
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Study session not found', 404, 'SESSION_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async delete(id: string, userId: string): Promise<void> {
    const result = await query('DELETE FROM study_sessions WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);

    if (result.rowCount === 0) {
      throw new AppError('Study session not found', 404, 'SESSION_NOT_FOUND');
    }
  }

  static async getStats(userId: string): Promise<StudySessionStats> {
    // Total sessions and hours
    const totalsResult = await query(
      `SELECT
         COUNT(*) as total_sessions,
         COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM study_sessions
       WHERE user_id = $1`,
      [userId]
    );

    // By subject
    const subjectsResult = await query(
      `SELECT
         subject,
         COUNT(*) as count,
         SUM(duration_minutes) as total_minutes
       FROM study_sessions
       WHERE user_id = $1
       GROUP BY subject
       ORDER BY total_minutes DESC
       LIMIT 10`,
      [userId]
    );

    // Recent sessions
    const recentResult = await query(
      `SELECT * FROM study_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 5`,
      [userId]
    );

    const totalMinutes = parseInt(totalsResult.rows[0].total_minutes);

    return {
      total_sessions: parseInt(totalsResult.rows[0].total_sessions),
      total_hours: Math.floor(totalMinutes / 60),
      total_minutes: totalMinutes % 60,
      subjects: subjectsResult.rows.map((row) => ({
        subject: row.subject,
        count: parseInt(row.count),
        total_minutes: parseInt(row.total_minutes),
      })),
      recent_sessions: recentResult.rows,
    };
  }
}
