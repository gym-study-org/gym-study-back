import { pool } from '../../../config/database';
import { getCacheOrFetch, deleteCache } from '../../../shared/utils/cache.util';
import {
  NotificationWithActor,
  CreateNotificationDTO,
  NotificationQuery,
} from '../interfaces/notification.interface';
import { io } from '../../../server';

export class NotificationService {
  static async getNotifications(
    userId: string,
    query: NotificationQuery
  ): Promise<{ notifications: NotificationWithActor[]; next_cursor: string | null }> {
    const { limit, cursor, unread_only } = query;

    let sql = `
      SELECT
        n.*,
        u.username as actor_username,
        u.avatar_url as actor_avatar_url
      FROM notifications n
      LEFT JOIN users u ON u.id = n.actor_id
      WHERE n.user_id = $1
    `;
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (unread_only) {
      sql += ` AND n.is_read = false`;
    }

    if (cursor) {
      sql += ` AND n.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sql += ` ORDER BY n.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await pool.query<NotificationWithActor>(sql, params);

    const hasMore = result.rows.length > limit;
    const notifications = hasMore ? result.rows.slice(0, limit) : result.rows;
    const next_cursor = hasMore
      ? notifications[notifications.length - 1].created_at.toISOString()
      : null;

    return { notifications, next_cursor };
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `notifications:unread:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
      const result = await pool.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    }, 60);
  }

  static async markAsRead(userId: string, notificationId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_read = false`,
      [notificationId, userId]
    );
    await deleteCache(`notifications:unread:${userId}`);
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    await deleteCache(`notifications:unread:${userId}`);
    return result.rowCount || 0;
  }

  static async createNotification(dto: CreateNotificationDTO): Promise<string> {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, title, body, data, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        dto.user_id,
        dto.actor_id || null,
        dto.type,
        dto.title,
        dto.body || null,
        JSON.stringify(dto.data || {}),
        dto.reference_type || null,
        dto.reference_id || null,
      ]
    );

    const notificationId = result.rows[0].id;

    // Invalidate unread count cache
    await deleteCache(`notifications:unread:${dto.user_id}`);

    // Emit WebSocket event to the target user
    io.to(`user:${dto.user_id}`).emit('notification:new', {
      id: notificationId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      actor_id: dto.actor_id,
      reference_type: dto.reference_type,
      reference_id: dto.reference_id,
      created_at: new Date().toISOString(),
    });

    return notificationId;
  }

  static async deleteExpired(): Promise<number> {
    const result = await pool.query(
      'DELETE FROM notifications WHERE expires_at < NOW()'
    );
    return result.rowCount || 0;
  }
}
