import { query } from '../../../config/database';
import { AppError } from '../../../shared/middlewares/error-handler.middleware';
import {
  CreateStudySessionDTO,
  UpdateStudySessionDTO,
  StudySession,
  StudySessionStats,
} from '../interfaces/study-sessions.interface';
import { PaginationParams } from '../../../shared/types/common.types';

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

    return result.rows[0];
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
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Study session not found');
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
      throw new AppError(400, 'NO_UPDATES', 'No fields to update');
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
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Study session not found');
    }

    return result.rows[0];
  }

  static async delete(id: string, userId: string): Promise<void> {
    const result = await query('DELETE FROM study_sessions WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);

    if (result.rowCount === 0) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Study session not found');
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
