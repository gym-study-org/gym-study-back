import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import {
  StoryWithAuthor,
  UserStoriesGroup,
  CreateStoryDTO,
  ProfileViewStats,
} from '../interfaces/stories.interface';

const STORY_DURATION_HOURS = 24;

export class StoriesService {
  /**
   * Create a new story (expires in 24h)
   */
  static async createStory(userId: string, data: CreateStoryDTO): Promise<StoryWithAuthor> {
    const expiresAt = new Date(Date.now() + STORY_DURATION_HOURS * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO stories (user_id, content_type, content, media_url, metadata, background_color, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        data.content_type || 'text',
        data.content || null,
        data.media_url || null,
        JSON.stringify(data.metadata || {}),
        data.background_color || '#1a1a2e',
        expiresAt.toISOString(),
      ]
    );

    const story = result.rows[0];
    const authorResult = await pool.query(
      'SELECT username, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    return {
      ...story,
      author_username: authorResult.rows[0].username,
      author_avatar_url: authorResult.rows[0].avatar_url,
      is_viewed_by_me: true,
    };
  }

  /**
   * Get stories feed (friends' active stories grouped by user)
   */
  static async getStoriesFeed(userId: string): Promise<UserStoriesGroup[]> {
    // Get active stories from friends + own stories
    const result = await pool.query(
      `SELECT s.*,
         u.username AS author_username,
         u.avatar_url AS author_avatar_url,
         EXISTS(
           SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = $1
         ) AS is_viewed_by_me
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
         AND (
           s.user_id = $1
           OR s.user_id IN (
             SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
             FROM friendships
             WHERE status = 'accepted'
               AND (requester_id = $1 OR addressee_id = $1)
           )
         )
       ORDER BY s.user_id, s.created_at ASC`,
      [userId]
    );

    // Group by user
    const groupMap = new Map<string, UserStoriesGroup>();

    for (const story of result.rows) {
      if (!groupMap.has(story.user_id)) {
        groupMap.set(story.user_id, {
          user_id: story.user_id,
          username: story.author_username,
          avatar_url: story.author_avatar_url,
          stories: [],
          has_unviewed: false,
        });
      }
      const group = groupMap.get(story.user_id)!;
      group.stories.push(story);
      if (!story.is_viewed_by_me) {
        group.has_unviewed = true;
      }
    }

    // Sort: own stories first, then groups with unviewed, then rest
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      if (a.user_id === userId) return -1;
      if (b.user_id === userId) return 1;
      if (a.has_unviewed && !b.has_unviewed) return -1;
      if (!a.has_unviewed && b.has_unviewed) return 1;
      return 0;
    });

    return groups;
  }

  /**
   * View a story (record view + increment count)
   */
  static async viewStory(storyId: string, viewerId: string): Promise<void> {
    const storyCheck = await pool.query(
      'SELECT id, user_id FROM stories WHERE id = $1 AND expires_at > NOW()',
      [storyId]
    );

    if (storyCheck.rows.length === 0) {
      throw new AppError('Story não encontrado ou expirado', 404, 'STORY_NOT_FOUND');
    }

    // Don't count self-views
    if (storyCheck.rows[0].user_id === viewerId) return;

    const inserted = await pool.query(
      `INSERT INTO story_views (story_id, viewer_id)
       VALUES ($1, $2)
       ON CONFLICT (story_id, viewer_id) DO NOTHING
       RETURNING id`,
      [storyId, viewerId]
    );

    // Only increment if new view
    if (inserted.rows.length > 0) {
      await pool.query(
        'UPDATE stories SET views_count = views_count + 1 WHERE id = $1',
        [storyId]
      );
    }
  }

  /**
   * Get viewers of a story (only story owner can see)
   */
  static async getStoryViewers(
    storyId: string,
    userId: string
  ): Promise<{ user_id: string; username: string; avatar_url: string | null; viewed_at: string }[]> {
    // Verify ownership
    const storyCheck = await pool.query(
      'SELECT user_id FROM stories WHERE id = $1',
      [storyId]
    );

    if (storyCheck.rows.length === 0) {
      throw new AppError('Story não encontrado', 404, 'STORY_NOT_FOUND');
    }

    if (storyCheck.rows[0].user_id !== userId) {
      throw new AppError('Sem permissão', 403, 'FORBIDDEN');
    }

    const result = await pool.query(
      `SELECT sv.viewer_id AS user_id, u.username, u.avatar_url, sv.viewed_at
       FROM story_views sv
       JOIN users u ON u.id = sv.viewer_id
       WHERE sv.story_id = $1
       ORDER BY sv.viewed_at DESC`,
      [storyId]
    );

    return result.rows;
  }

  /**
   * Delete a story (only own)
   */
  static async deleteStory(storyId: string, userId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM stories WHERE id = $1 AND user_id = $2',
      [storyId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Story não encontrado ou sem permissão', 404, 'STORY_NOT_FOUND');
    }
  }

  /**
   * Get own active stories
   */
  static async getMyStories(userId: string): Promise<StoryWithAuthor[]> {
    const result = await pool.query(
      `SELECT s.*,
         u.username AS author_username,
         u.avatar_url AS author_avatar_url,
         true AS is_viewed_by_me
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.expires_at > NOW()
       ORDER BY s.created_at ASC`,
      [userId]
    );
    return result.rows;
  }

  // ====== PROFILE VIEWS ======

  /**
   * Record a profile view (max 1 per viewer per day)
   */
  static async recordProfileView(profileUserId: string, viewerId: string): Promise<void> {
    if (profileUserId === viewerId) return;

    // Check if already viewed today
    const existing = await pool.query(
      `SELECT id FROM profile_views
       WHERE profile_user_id = $1 AND viewer_id = $2
         AND viewed_at >= CURRENT_DATE`,
      [profileUserId, viewerId]
    );

    if (existing.rows.length > 0) return;

    await pool.query(
      `INSERT INTO profile_views (profile_user_id, viewer_id) VALUES ($1, $2)`,
      [profileUserId, viewerId]
    );
  }

  /**
   * Get profile view stats
   */
  static async getProfileViewStats(userId: string): Promise<ProfileViewStats> {
    const [views7d, views30d, recentViewers] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT viewer_id)::int AS count
         FROM profile_views
         WHERE profile_user_id = $1 AND viewed_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT viewer_id)::int AS count
         FROM profile_views
         WHERE profile_user_id = $1 AND viewed_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      ),
      pool.query(
        `SELECT DISTINCT ON (pv.viewer_id)
           pv.viewer_id AS user_id, u.username, u.avatar_url, pv.viewed_at
         FROM profile_views pv
         JOIN users u ON u.id = pv.viewer_id
         WHERE pv.profile_user_id = $1 AND pv.viewed_at >= NOW() - INTERVAL '30 days'
         ORDER BY pv.viewer_id, pv.viewed_at DESC
         LIMIT 20`,
        [userId]
      ),
    ]);

    return {
      total_views_7d: views7d.rows[0].count,
      total_views_30d: views30d.rows[0].count,
      recent_viewers: recentViewers.rows,
    };
  }

  // ====== PROGRESS CARDS ======

  /**
   * Get progress card data for sharing
   */
  static async getProgressCardData(userId: string, type: 'weekly' | 'monthly' | 'streak' | 'overview'): Promise<Record<string, unknown>> {
    const userResult = await pool.query(
      `SELECT username, full_name, avatar_url, total_study_hours, current_streak, longest_streak,
              total_xp, weekly_xp, level, current_league_tier, gems_balance
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    if (type === 'weekly') {
      const sessionsResult = await pool.query(
        `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
         FROM study_sessions
         WHERE user_id = $1 AND started_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      );
      return {
        type: 'weekly',
        username: user.username,
        avatar_url: user.avatar_url,
        level: user.level,
        weekly_xp: user.weekly_xp,
        sessions: sessionsResult.rows[0].sessions,
        study_minutes: sessionsResult.rows[0].total_minutes,
        streak: user.current_streak,
        league: user.current_league_tier,
      };
    }

    if (type === 'monthly') {
      const sessionsResult = await pool.query(
        `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
         FROM study_sessions
         WHERE user_id = $1 AND started_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      );
      return {
        type: 'monthly',
        username: user.username,
        avatar_url: user.avatar_url,
        level: user.level,
        total_xp: user.total_xp,
        sessions: sessionsResult.rows[0].sessions,
        study_minutes: sessionsResult.rows[0].total_minutes,
        streak: user.current_streak,
        longest_streak: user.longest_streak,
        league: user.current_league_tier,
      };
    }

    if (type === 'streak') {
      return {
        type: 'streak',
        username: user.username,
        avatar_url: user.avatar_url,
        current_streak: user.current_streak,
        longest_streak: user.longest_streak,
        total_study_hours: user.total_study_hours,
      };
    }

    // overview
    const badgesResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM user_badges WHERE user_id = $1`,
      [userId]
    );
    return {
      type: 'overview',
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      level: user.level,
      total_xp: user.total_xp,
      streak: user.current_streak,
      total_study_hours: user.total_study_hours,
      badges_count: badgesResult.rows[0].count,
      league: user.current_league_tier,
      gems: user.gems_balance,
    };
  }
}
