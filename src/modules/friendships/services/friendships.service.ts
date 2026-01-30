import { pool } from '../../../config/database';
import {
  Friendship,
  FriendshipWithUser,
  FriendRequest,
} from '../interfaces/friendship.interface';
import { AppError } from '../../../shared/utils/AppError';

export class FriendshipsService {
  /**
   * Send a friend request
   */
  async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    // Check if users are different
    if (requesterId === addresseeId) {
      throw new AppError('Você não pode adicionar a si mesmo como amigo', 400);
    }

    // Check if addressee exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [addresseeId]);
    if (userCheck.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Check if friendship already exists (in either direction)
    const existingCheck = await pool.query(
      `SELECT * FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    );

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      if (existing.status === 'accepted') {
        throw new AppError('Vocês já são amigos', 400);
      }
      if (existing.status === 'pending') {
        throw new AppError('Já existe um pedido de amizade pendente', 400);
      }
      if (existing.status === 'blocked') {
        throw new AppError('Não é possível enviar pedido de amizade', 400);
      }
    }

    const query = `
      INSERT INTO friendships (requester_id, addressee_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING *
    `;

    const result = await pool.query<Friendship>(query, [requesterId, addresseeId]);
    return result.rows[0];
  }

  /**
   * Respond to a friend request (accept or reject)
   */
  async respondToRequest(
    userId: string,
    friendshipId: string,
    status: 'accepted' | 'rejected'
  ): Promise<Friendship> {
    // Get the friendship
    const friendship = await pool.query<Friendship>(
      'SELECT * FROM friendships WHERE id = $1',
      [friendshipId]
    );

    if (friendship.rows.length === 0) {
      throw new AppError('Pedido de amizade não encontrado', 404);
    }

    const request = friendship.rows[0];

    // Only the addressee can respond
    if (request.addressee_id !== userId) {
      throw new AppError('Você não pode responder a este pedido', 403);
    }

    // Can only respond to pending requests
    if (request.status !== 'pending') {
      throw new AppError('Este pedido já foi respondido', 400);
    }

    const query = `
      UPDATE friendships
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query<Friendship>(query, [status, friendshipId]);
    return result.rows[0];
  }

  /**
   * Get all friends of a user
   */
  async getFriends(userId: string): Promise<FriendshipWithUser[]> {
    const query = `
      SELECT
        f.*,
        CASE
          WHEN f.requester_id = $1 THEN f.addressee_id
          ELSE f.requester_id
        END as friend_id,
        u.username as friend_name,
        u.full_name as friend_full_name,
        u.email as friend_email,
        u.avatar_url as friend_avatar_url,
        u.total_study_hours as friend_total_study_hours
      FROM friendships f
      JOIN users u ON u.id = CASE
        WHEN f.requester_id = $1 THEN f.addressee_id
        ELSE f.requester_id
      END
      WHERE (f.requester_id = $1 OR f.addressee_id = $1)
        AND f.status = 'accepted'
      ORDER BY u.username ASC
    `;

    const result = await pool.query<FriendshipWithUser>(query, [userId]);
    return result.rows;
  }

  /**
   * Get pending friend requests received
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const query = `
      SELECT
        f.id,
        f.requester_id,
        u.username as requester_name,
        u.full_name as requester_full_name,
        u.email as requester_email,
        u.avatar_url as requester_avatar_url,
        f.created_at
      FROM friendships f
      JOIN users u ON u.id = f.requester_id
      WHERE f.addressee_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query<FriendRequest>(query, [userId]);
    return result.rows;
  }

  /**
   * Get sent friend requests (pending)
   */
  async getSentRequests(userId: string): Promise<any[]> {
    const query = `
      SELECT
        f.id,
        f.addressee_id,
        u.username as addressee_name,
        u.full_name as addressee_full_name,
        u.email as addressee_email,
        u.avatar_url as addressee_avatar_url,
        f.created_at
      FROM friendships f
      JOIN users u ON u.id = f.addressee_id
      WHERE f.requester_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    const query = `
      DELETE FROM friendships
      WHERE ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))
        AND status = 'accepted'
      RETURNING id
    `;

    const result = await pool.query(query, [userId, friendId]);

    if (result.rows.length === 0) {
      throw new AppError('Amizade não encontrada', 404);
    }
  }

  /**
   * Cancel a sent friend request
   */
  async cancelRequest(userId: string, friendshipId: string): Promise<void> {
    const query = `
      DELETE FROM friendships
      WHERE id = $1 AND requester_id = $2 AND status = 'pending'
      RETURNING id
    `;

    const result = await pool.query(query, [friendshipId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Pedido de amizade não encontrado', 404);
    }
  }

  /**
   * Search users to add as friends
   */
  async searchUsers(userId: string, searchTerm: string): Promise<any[]> {
    const query = `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.avatar_url,
        u.total_study_hours,
        CASE
          WHEN f.status IS NOT NULL THEN f.status
          ELSE NULL
        END as friendship_status,
        CASE
          WHEN f.requester_id = $1 THEN 'sent'
          WHEN f.addressee_id = $1 THEN 'received'
          ELSE NULL
        END as request_direction
      FROM users u
      LEFT JOIN friendships f ON (
        (f.requester_id = $1 AND f.addressee_id = u.id)
        OR (f.requester_id = u.id AND f.addressee_id = $1)
      )
      WHERE u.id != $1
        AND (u.username ILIKE $2 OR u.full_name ILIKE $2 OR u.email ILIKE $2)
      LIMIT 20
    `;

    const result = await pool.query(query, [userId, `%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const query = `
      SELECT id FROM friendships
      WHERE ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))
        AND status = 'accepted'
    `;

    const result = await pool.query(query, [userId1, userId2]);
    return result.rows.length > 0;
  }
}
