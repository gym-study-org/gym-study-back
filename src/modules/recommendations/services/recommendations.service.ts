import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import { FriendshipsService } from '../../friendships/services/friendships.service';
import {
  CreateRecommendationDTO,
  UpdateRecommendationDTO,
  RecommendationWithAuthor,
} from '../interfaces/recommendation.interface';

export class RecommendationsService {
  private static friendshipsService = new FriendshipsService();

  static async create(authorId: string, data: CreateRecommendationDTO): Promise<RecommendationWithAuthor> {
    if (authorId === data.recipient_id) {
      throw new AppError('You cannot recommend yourself', 400, 'SELF_RECOMMENDATION');
    }

    const areFriends = await this.friendshipsService.areFriends(authorId, data.recipient_id);
    if (!areFriends) {
      throw new AppError('You can only recommend friends', 403, 'NOT_FRIENDS');
    }

    const result = await pool.query(
      `INSERT INTO recommendations (author_id, recipient_id, relationship, content)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (author_id, recipient_id) DO UPDATE SET
         relationship = EXCLUDED.relationship,
         content = EXCLUDED.content,
         updated_at = NOW()
       RETURNING *`,
      [authorId, data.recipient_id, data.relationship, data.content]
    );

    return this.getById(result.rows[0].id);
  }

  static async getById(id: string): Promise<RecommendationWithAuthor> {
    const result = await pool.query(
      `SELECT r.*, u.username AS author_username, u.avatar_url AS author_avatar_url, u.level AS author_level
       FROM recommendations r
       JOIN users u ON u.id = r.author_id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Recommendation not found', 404, 'RECOMMENDATION_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async getForUser(userId: string, viewerId?: string): Promise<RecommendationWithAuthor[]> {
    const isOwner = viewerId === userId;
    const result = await pool.query(
      `SELECT r.*, u.username AS author_username, u.avatar_url AS author_avatar_url, u.level AS author_level
       FROM recommendations r
       JOIN users u ON u.id = r.author_id
       WHERE r.recipient_id = $1 ${isOwner ? '' : 'AND r.is_visible = true'}
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  static async getByAuthor(authorId: string): Promise<RecommendationWithAuthor[]> {
    const result = await pool.query(
      `SELECT r.*, u.username AS author_username, u.avatar_url AS author_avatar_url, u.level AS author_level
       FROM recommendations r
       JOIN users u ON u.id = r.author_id
       WHERE r.author_id = $1
       ORDER BY r.created_at DESC`,
      [authorId]
    );

    return result.rows;
  }

  static async update(recommendationId: string, userId: string, data: UpdateRecommendationDTO): Promise<RecommendationWithAuthor> {
    const rec = await this.getById(recommendationId);

    // Author can update content, recipient can toggle visibility
    if (data.content !== undefined && rec.author_id !== userId) {
      throw new AppError('Only the author can edit content', 403, 'FORBIDDEN');
    }
    if (data.is_visible !== undefined && rec.recipient_id !== userId) {
      throw new AppError('Only the recipient can toggle visibility', 403, 'FORBIDDEN');
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.content !== undefined) {
      sets.push(`content = $${idx++}`);
      values.push(data.content);
    }
    if (data.is_visible !== undefined) {
      sets.push(`is_visible = $${idx++}`);
      values.push(data.is_visible);
    }
    sets.push(`updated_at = NOW()`);

    values.push(recommendationId);
    await pool.query(
      `UPDATE recommendations SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getById(recommendationId);
  }

  static async delete(recommendationId: string, userId: string): Promise<void> {
    const rec = await this.getById(recommendationId);

    if (rec.author_id !== userId && rec.recipient_id !== userId) {
      throw new AppError('Not authorized to delete this recommendation', 403, 'FORBIDDEN');
    }

    await pool.query('DELETE FROM recommendations WHERE id = $1', [recommendationId]);
  }
}
