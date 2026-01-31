import { query } from '../../../config/database';
import { AppError } from '../../../shared/middlewares/error-handler.middleware';
import { UserProfile } from '../interfaces/user.interface';

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

  /**
   * Update user's avatar URL
   */
  static async updateAvatarUrl(id: string, avatarUrl: string) {
    const result = await query(
      `UPDATE users
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, email, username, full_name, avatar_url, bio`,
      [avatarUrl, id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return result.rows[0];
  }

  /**
   * Get public profile by user ID (with viewer context for friendship status)
   */
  static async getPublicProfile(userId: string, viewerId: string): Promise<UserProfile> {
    // Get user basic info
    const userResult = await query(
      `SELECT id, username, full_name, bio, avatar_url,
              total_study_hours, current_streak, longest_streak,
              created_at as member_since
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Usuario nao encontrado');
    }

    const user = userResult.rows[0];

    // Get recent passed certifications (limit 5)
    const certsResult = await query(
      `SELECT id, name, provider, category, passed, obtained_at, credential_url
       FROM certifications
       WHERE user_id = $1 AND passed = true
       ORDER BY obtained_at DESC
       LIMIT 5`,
      [userId]
    );

    // Check friendship status (skip if viewing own profile)
    let friendshipStatus: 'accepted' | 'pending' | 'none' = 'none';
    let isFriend = false;

    if (userId !== viewerId) {
      const friendshipResult = await query(
        `SELECT status
         FROM friendships
         WHERE (requester_id = $1 AND addressee_id = $2)
            OR (requester_id = $2 AND addressee_id = $1)`,
        [userId, viewerId]
      );

      if (friendshipResult.rows.length > 0) {
        friendshipStatus = friendshipResult.rows[0].status;
        isFriend = friendshipStatus === 'accepted';
      }
    }

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      total_study_hours: Number(user.total_study_hours),
      current_streak: user.current_streak,
      longest_streak: user.longest_streak,
      member_since: user.member_since,
      certifications: certsResult.rows,
      is_friend: isFriend,
      friendship_status: friendshipStatus,
    };
  }
}
