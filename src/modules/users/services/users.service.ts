import { query } from '../../../config/database';
import { AppError } from '../../../shared/middlewares/error-handler.middleware';

export class UsersService {
  static async getUserById(id: string) {
    const result = await query(
      `SELECT id, email, username, full_name, avatar_url, bio,
              total_study_hours, current_streak, longest_streak,
              created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return result.rows[0];
  }

  static async updateUser(id: string, data: { full_name?: string; bio?: string; avatar_url?: string }) {
    const { full_name, bio, avatar_url } = data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }

    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      throw new AppError(400, 'NO_UPDATES', 'No fields to update');
    }

    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING id, email, username, full_name, avatar_url, bio`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return result.rows[0];
  }
}
