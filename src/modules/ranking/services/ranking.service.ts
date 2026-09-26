import { pool } from '../../../config/database';
import { RankingEntry, UserRankingPosition } from '../interfaces/ranking.interface';
import { getCacheOrFetch, deleteCachePattern } from '../../../shared/utils/cache.util';
import { redis } from '../../../config/redis';
import { logger } from '../../../shared/utils/logger.util';

const CACHE_TTL = {
  GLOBAL: 300, // 5 min
  FRIENDS: 180, // 3 min
  MONTHLY: 600, // 10 min
  WEEKLY: 300, // 5 min
  POSITION: 180, // 3 min
};

export class RankingService {
  /**
   * Get global ranking (all time)
   */
  async getGlobalRanking(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RankingEntry[]> {
    const cacheKey = `ranking:global:${limit}:${offset}:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
    const query = `
      WITH ranked_users AS (
        SELECT
          u.id as user_id,
          u.username,
          u.avatar_url,
          u.total_study_hours,
          u.current_streak,
          COALESCE(session_counts.total_sessions, 0) as total_sessions,
          COALESCE(cert_counts.total_certifications, 0) as total_certifications,
          ROW_NUMBER() OVER (ORDER BY u.total_study_hours DESC, u.created_at ASC) as position
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_sessions
          FROM study_sessions
          GROUP BY user_id
        ) session_counts ON session_counts.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_certifications
          FROM certifications
          WHERE passed = true
          GROUP BY user_id
        ) cert_counts ON cert_counts.user_id = u.id
      )
      SELECT
        ru.*,
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_friend,
        CASE WHEN ru.user_id = $1 THEN true ELSE false END as is_current_user
      FROM ranked_users ru
      LEFT JOIN friendships f ON (
        (f.requester_id = $1 AND f.addressee_id = ru.user_id)
        OR (f.requester_id = ru.user_id AND f.addressee_id = $1)
      ) AND f.status = 'accepted'
      ORDER BY ru.position
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query<RankingEntry>(query, [userId, limit, offset]);
    return result.rows;
    }, CACHE_TTL.GLOBAL);
  }

  /**
   * Get friends ranking
   */
  async getFriendsRanking(userId: string): Promise<RankingEntry[]> {
    const cacheKey = `ranking:friends:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
    const query = `
      WITH friends_and_me AS (
        SELECT u.id as user_id
        FROM users u
        WHERE u.id = $1
        UNION
        SELECT CASE
          WHEN f.requester_id = $1 THEN f.addressee_id
          ELSE f.requester_id
        END as user_id
        FROM friendships f
        WHERE (f.requester_id = $1 OR f.addressee_id = $1)
          AND f.status = 'accepted'
      ),
      ranked_friends AS (
        SELECT
          u.id as user_id,
          u.username,
          u.avatar_url,
          u.total_study_hours,
          u.current_streak,
          COALESCE(session_counts.total_sessions, 0) as total_sessions,
          COALESCE(cert_counts.total_certifications, 0) as total_certifications,
          ROW_NUMBER() OVER (ORDER BY u.total_study_hours DESC, u.created_at ASC) as position
        FROM users u
        INNER JOIN friends_and_me fam ON fam.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_sessions
          FROM study_sessions
          GROUP BY user_id
        ) session_counts ON session_counts.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_certifications
          FROM certifications
          WHERE passed = true
          GROUP BY user_id
        ) cert_counts ON cert_counts.user_id = u.id
      )
      SELECT
        rf.*,
        CASE WHEN rf.user_id != $1 THEN true ELSE false END as is_friend,
        CASE WHEN rf.user_id = $1 THEN true ELSE false END as is_current_user
      FROM ranked_friends rf
      ORDER BY rf.position
    `;

    const result = await pool.query<RankingEntry>(query, [userId]);
    return result.rows;
    }, CACHE_TTL.FRIENDS);
  }

  /**
   * Get monthly ranking
   */
  async getMonthlyRanking(
    userId: string,
    limit: number = 50
  ): Promise<RankingEntry[]> {
    const cacheKey = `ranking:monthly:${limit}:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
    const query = `
      WITH monthly_stats AS (
        SELECT
          u.id as user_id,
          u.username,
          u.avatar_url,
          u.current_streak,
          COALESCE(SUM(ss.duration_minutes) / 60.0, 0) as total_study_hours,
          COUNT(ss.id) as total_sessions,
          COALESCE(cert_counts.total_certifications, 0) as total_certifications,
          ROW_NUMBER() OVER (
            ORDER BY COALESCE(SUM(ss.duration_minutes), 0) DESC, u.created_at ASC
          ) as position
        FROM users u
        LEFT JOIN study_sessions ss ON ss.user_id = u.id
          AND ss.started_at >= DATE_TRUNC('month', CURRENT_DATE)
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_certifications
          FROM certifications
          WHERE passed = true
            AND obtained_at >= DATE_TRUNC('month', CURRENT_DATE)
          GROUP BY user_id
        ) cert_counts ON cert_counts.user_id = u.id
        GROUP BY u.id, u.username, u.avatar_url, u.current_streak, cert_counts.total_certifications
      )
      SELECT
        ms.*,
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_friend,
        CASE WHEN ms.user_id = $1 THEN true ELSE false END as is_current_user
      FROM monthly_stats ms
      LEFT JOIN friendships f ON (
        (f.requester_id = $1 AND f.addressee_id = ms.user_id)
        OR (f.requester_id = ms.user_id AND f.addressee_id = $1)
      ) AND f.status = 'accepted'
      ORDER BY ms.position
      LIMIT $2
    `;

    const result = await pool.query<RankingEntry>(query, [userId, limit]);
    return result.rows;
    }, CACHE_TTL.MONTHLY);
  }

  /**
   * Get weekly ranking
   */
  async getWeeklyRanking(
    userId: string,
    limit: number = 50
  ): Promise<RankingEntry[]> {
    const cacheKey = `ranking:weekly:${limit}:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
    const query = `
      WITH weekly_stats AS (
        SELECT
          u.id as user_id,
          u.username,
          u.avatar_url,
          u.current_streak,
          COALESCE(SUM(ss.duration_minutes) / 60.0, 0) as total_study_hours,
          COUNT(ss.id) as total_sessions,
          0 as total_certifications,
          ROW_NUMBER() OVER (
            ORDER BY COALESCE(SUM(ss.duration_minutes), 0) DESC, u.created_at ASC
          ) as position
        FROM users u
        LEFT JOIN study_sessions ss ON ss.user_id = u.id
          AND ss.started_at >= DATE_TRUNC('week', CURRENT_DATE)
        GROUP BY u.id, u.username, u.avatar_url, u.current_streak
      )
      SELECT
        ws.*,
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_friend,
        CASE WHEN ws.user_id = $1 THEN true ELSE false END as is_current_user
      FROM weekly_stats ws
      LEFT JOIN friendships f ON (
        (f.requester_id = $1 AND f.addressee_id = ws.user_id)
        OR (f.requester_id = ws.user_id AND f.addressee_id = $1)
      ) AND f.status = 'accepted'
      ORDER BY ws.position
      LIMIT $2
    `;

    const result = await pool.query<RankingEntry>(query, [userId, limit]);
    return result.rows;
    }, CACHE_TTL.WEEKLY);
  }

  /**
   * Get user's position in rankings
   * Uses Redis ZREVRANK as primary source (populated by leaderboard job),
   * falls back to SQL if Redis data is unavailable.
   */
  async getUserPosition(userId: string): Promise<UserRankingPosition> {
    const cacheKey = `ranking:position:${userId}`;

    return getCacheOrFetch(cacheKey, async () => {
    // Try Redis sorted set first (fast O(log N))
    let globalPosition = 0;
    let totalUsers = 0;
    let usedRedis = false;

    try {
      const rank = await redis.zrevrank('leaderboard:global', userId);
      if (rank !== null) {
        globalPosition = rank + 1; // ZREVRANK is 0-indexed
        totalUsers = await redis.zcard('leaderboard:global');
        usedRedis = true;
      }
    } catch (err) {
      logger.debug('Redis ZSET unavailable for ranking, falling back to SQL');
    }

    if (!usedRedis) {
      // SQL fallback
      const globalQuery = `
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY total_study_hours DESC, created_at ASC) as position
          FROM users
        )
        SELECT position FROM ranked WHERE id = $1
      `;
      const globalResult = await pool.query(globalQuery, [userId]);
      const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');

      globalPosition = parseInt(globalResult.rows[0]?.position || '0', 10);
      totalUsers = parseInt(totalUsersResult.rows[0]?.count || '0', 10);
    }

    // Friends position (always SQL since friends are per-user)
    const friendsQuery = `
      WITH friends_and_me AS (
        SELECT u.id as user_id, u.total_study_hours, u.created_at
        FROM users u
        WHERE u.id = $1
        UNION
        SELECT
          CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END,
          u.total_study_hours,
          u.created_at
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
        WHERE (f.requester_id = $1 OR f.addressee_id = $1)
          AND f.status = 'accepted'
      ),
      ranked_friends AS (
        SELECT
          user_id,
          ROW_NUMBER() OVER (ORDER BY total_study_hours DESC, created_at ASC) as position
        FROM friends_and_me
      )
      SELECT position, (SELECT COUNT(*) FROM friends_and_me) as total
      FROM ranked_friends
      WHERE user_id = $1
    `;
    const friendsResult = await pool.query(friendsQuery, [userId]);

    return {
      global_position: globalPosition,
      total_users: totalUsers,
      friends_position: parseInt(friendsResult.rows[0]?.position || '0', 10),
      total_friends: parseInt(friendsResult.rows[0]?.total || '0', 10),
    };
    }, CACHE_TTL.POSITION);
  }
}

/**
 * Invalidate all ranking caches. Call this when study sessions or friendships change.
 */
export async function invalidateRankingCache(): Promise<void> {
  await deleteCachePattern('ranking:*');
}
