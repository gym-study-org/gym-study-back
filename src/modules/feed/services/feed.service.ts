import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import {
  Post,
  PostWithAuthor,
  PostWithComments,
  CommentWithAuthor,
  CreatePostDTO,
  UpdatePostDTO,
  CreateCommentDTO,
  FeedQuery,
} from '../interfaces/feed.interface';
import { NotificationService } from '../../notifications/services/notification.service';
import { logger } from '../../../shared/utils/logger.util';

export class FeedService {
  /**
   * Get personalized feed (own posts + friends' posts + public)
   * Uses cursor-based pagination for performance
   */
  static async getFeed(userId: string, query: FeedQuery): Promise<PostWithAuthor[]> {
    const { limit, cursor, filter } = query;
    const params: unknown[] = [userId, limit];
    let paramIdx = 3;

    let cursorClause = '';
    if (cursor) {
      cursorClause = `AND p.created_at < $${paramIdx}`;
      params.push(cursor);
      paramIdx++;
    }

    let filterClause = '';
    if (filter) {
      filterClause = `AND p.post_type = $${paramIdx}`;
      params.push(filter);
      paramIdx++;
    }

    const sql = `
      SELECT
        p.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1
        ) AS is_liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
        AND p.audience = 'global'
        AND (
          p.user_id = $1
          OR (
            p.user_id IN (
              SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
              FROM friendships f
              WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
            )
            AND p.visibility IN ('public', 'friends')
          )
          OR (p.visibility = 'public' AND p.user_id != $1)
        )
        ${cursorClause}
        ${filterClause}
      ORDER BY p.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query<PostWithAuthor>(sql, params);
    return result.rows;
  }

  /**
   * Get explore/discover feed (popular public posts from non-friends)
   */
  static async getExploreFeed(userId: string, query: FeedQuery): Promise<PostWithAuthor[]> {
    const { limit, cursor } = query;
    const params: unknown[] = [userId, limit];
    let paramIdx = 3;

    let cursorClause = '';
    if (cursor) {
      cursorClause = `AND p.created_at < $${paramIdx}`;
      params.push(cursor);
      paramIdx++;
    }

    const sql = `
      SELECT
        p.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1
        ) AS is_liked_by_me,
        COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id), 0) AS reactions_total,
        (
          p.likes_count * 2
          + p.comments_count * 3
          + COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id), 0) * 2
          + CASE WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 50
                 WHEN p.created_at > NOW() - INTERVAL '72 hours' THEN 20
                 ELSE 0 END
          + CASE WHEN u.current_league_tier IN (
              SELECT current_league_tier FROM users WHERE id = $1
            ) THEN 10 ELSE 0 END
        ) AS engagement_score
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
        AND p.visibility = 'public'
        AND p.user_id != $1
        AND p.created_at > NOW() - INTERVAL '30 days'
        ${cursorClause}
      ORDER BY engagement_score DESC, p.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query<PostWithAuthor>(sql, params);
    return result.rows;
  }

  /**
   * Get a user's profile feed
   */
  static async getUserFeed(
    userId: string,
    targetUserId: string,
    limit: number,
    cursor?: string,
    audience?: 'global' | 'personal'
  ): Promise<PostWithAuthor[]> {
    const params: unknown[] = [userId, targetUserId, limit];
    let paramIdx = 4;

    let cursorClause = '';
    if (cursor) {
      cursorClause = `AND p.created_at < $${paramIdx}`;
      params.push(cursor);
      paramIdx++;
    }

    let audienceClause = '';
    if (audience) {
      audienceClause = `AND p.audience = $${paramIdx}`;
      params.push(audience);
      paramIdx++;
    }

    // If viewing own profile, show all posts. Otherwise respect visibility.
    const visibilityClause =
      userId === targetUserId
        ? ''
        : `AND (p.visibility = 'public' OR (p.visibility = 'friends' AND EXISTS(
            SELECT 1 FROM friendships f
            WHERE ((f.requester_id = $1 AND f.addressee_id = $2) OR (f.requester_id = $2 AND f.addressee_id = $1))
              AND f.status = 'accepted'
          )))`;

    const sql = `
      SELECT
        p.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1
        ) AS is_liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
        AND p.user_id = $2
        ${visibilityClause}
        ${audienceClause}
        ${cursorClause}
      ORDER BY p.created_at DESC
      LIMIT $3
    `;

    const result = await pool.query<PostWithAuthor>(sql, params);
    return result.rows;
  }

  /**
   * Create a new post
   */
  static async createPost(userId: string, data: CreatePostDTO): Promise<PostWithAuthor> {
    const {
      content,
      post_type = 'text',
      media_urls = [],
      study_session_id,
      certification_id,
      metadata = {},
      tags = [],
      visibility = 'public',
      audience = 'global',
    } = data;

    const result = await pool.query<Post>(
      `INSERT INTO posts (user_id, content, post_type, media_urls, study_session_id,
        certification_id, metadata, tags, visibility, audience)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        content,
        post_type,
        media_urls,
        study_session_id || null,
        certification_id || null,
        JSON.stringify(metadata),
        tags,
        visibility,
        audience,
      ]
    );

    const post = result.rows[0];

    // Fetch author info
    const authorResult = await pool.query(
      'SELECT username, full_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const author = authorResult.rows[0];

    // Update daily quest: post_in_feed
    import('../../quests/services/quests.service').then(({ QuestsService }) => {
      QuestsService.updateProgress(userId, 'post_in_feed', 1).catch(() => {});
    }).catch(() => {});

    // Process @mentions
    this.processMentions(content, userId, post.id).catch(() => {});

    return {
      ...post,
      author_username: author.username,
      author_full_name: author.full_name,
      author_avatar_url: author.avatar_url,
      is_liked_by_me: false,
    };
  }

  /**
   * Get a single post with its comments
   */
  static async getPostById(postId: string, viewerId: string): Promise<PostWithComments> {
    const postResult = await pool.query<PostWithAuthor>(
      `SELECT
        p.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2
        ) AS is_liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [postId, viewerId]
    );

    if (postResult.rows.length === 0) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const post = postResult.rows[0];

    // Check visibility
    if (post.user_id !== viewerId) {
      if (post.visibility === 'private') {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
      }
      if (post.visibility === 'friends') {
        const friendCheck = await pool.query(
          `SELECT id FROM friendships
           WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
             AND status = 'accepted'`,
          [viewerId, post.user_id]
        );
        if (friendCheck.rows.length === 0) {
          throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
        }
      }
    }

    // Fetch comments (top-level only, with replies nested)
    const commentsResult = await pool.query<CommentWithAuthor>(
      `SELECT
        c.*,
        u.username AS author_username,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2
        ) AS is_liked_by_me
      FROM post_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
      [postId, viewerId]
    );

    // Nest replies under parent comments
    const commentMap = new Map<string, CommentWithAuthor>();
    const topLevelComments: CommentWithAuthor[] = [];

    for (const comment of commentsResult.rows) {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    }

    for (const comment of commentsResult.rows) {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id)!.replies!.push(comment);
      } else {
        topLevelComments.push(comment);
      }
    }

    return {
      ...post,
      comments: topLevelComments,
    };
  }

  /**
   * Update a post (only own posts)
   */
  static async updatePost(
    postId: string,
    userId: string,
    data: UpdatePostDTO
  ): Promise<PostWithAuthor> {
    const { content, media_urls, tags, visibility } = data;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIdx++}`);
      values.push(content);
    }
    if (media_urls !== undefined) {
      updates.push(`media_urls = $${paramIdx++}`);
      values.push(media_urls);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIdx++}`);
      values.push(tags);
    }
    if (visibility !== undefined) {
      updates.push(`visibility = $${paramIdx++}`);
      values.push(visibility);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_UPDATES');
    }

    values.push(postId, userId);

    const result = await pool.query<Post>(
      `UPDATE posts SET ${updates.join(', ')}
       WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Post not found or not authorized', 404, 'POST_NOT_FOUND');
    }

    const post = result.rows[0];
    const authorResult = await pool.query(
      'SELECT username, full_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const author = authorResult.rows[0];

    return {
      ...post,
      author_username: author.username,
      author_full_name: author.full_name,
      author_avatar_url: author.avatar_url,
      is_liked_by_me: false,
    };
  }

  /**
   * Soft-delete a post (only own posts)
   */
  static async deletePost(postId: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE posts SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [postId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Post not found or not authorized', 404, 'POST_NOT_FOUND');
    }
  }

  /**
   * Toggle like on a post
   */
  static async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ liked: boolean; likes_count: number }> {
    // Check post exists
    const postCheck = await pool.query(
      'SELECT id, user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );
    if (postCheck.rows.length === 0) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    let liked: boolean;
    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [
        postId,
        userId,
      ]);
      liked = false;
    } else {
      // Like
      await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [
        postId,
        userId,
      ]);
      liked = true;
    }

    // Get updated count
    const countResult = await pool.query(
      'SELECT likes_count FROM posts WHERE id = $1',
      [postId]
    );

    // Notify post author about the like (not self-likes, only on like not unlike)
    const postAuthorId = postCheck.rows[0].user_id;
    if (liked && postAuthorId !== userId) {
      const likerResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
      const likerName = likerResult.rows[0]?.username || 'Someone';

      NotificationService.createNotification({
        user_id: postAuthorId,
        actor_id: userId,
        type: 'post_liked',
        title: 'Your post was liked',
        body: `${likerName} liked your post`,
        reference_type: 'post',
        reference_id: postId,
      }).catch((err) => logger.error('Error creating post liked notification:', err));
    }

    return {
      liked,
      likes_count: countResult.rows[0].likes_count,
    };
  }

  /**
   * Add a comment to a post
   */
  static async addComment(
    postId: string,
    userId: string,
    data: CreateCommentDTO
  ): Promise<CommentWithAuthor> {
    // Check post exists
    const postCheck = await pool.query(
      'SELECT id FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );
    if (postCheck.rows.length === 0) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // If parent_id provided, verify it exists and belongs to same post
    if (data.parent_id) {
      const parentCheck = await pool.query(
        'SELECT id FROM post_comments WHERE id = $1 AND post_id = $2 AND deleted_at IS NULL',
        [data.parent_id, postId]
      );
      if (parentCheck.rows.length === 0) {
        throw new AppError('Parent comment not found', 404, 'COMMENT_NOT_FOUND');
      }
    }

    const result = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [postId, userId, data.parent_id || null, data.content]
    );

    const comment = result.rows[0];
    const authorResult = await pool.query(
      'SELECT username, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const author = authorResult.rows[0];

    // Notify post author about the comment (not self-comments)
    const postAuthor = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    const postAuthorId = postAuthor.rows[0]?.user_id;
    if (postAuthorId && postAuthorId !== userId) {
      NotificationService.createNotification({
        user_id: postAuthorId,
        actor_id: userId,
        type: 'post_commented',
        title: 'New comment on your post',
        body: `${author.username} commented on your post`,
        reference_type: 'post',
        reference_id: postId,
        data: { comment_id: comment.id, preview: data.content.substring(0, 100) },
      }).catch((err) => logger.error('Error creating comment notification:', err));
    }

    // Update daily quest: comment_on_post
    import('../../quests/services/quests.service').then(({ QuestsService }) => {
      QuestsService.updateProgress(userId, 'comment_on_post', 1).catch(() => {});
    }).catch(() => {});

    // Process @mentions in comment
    FeedService.processMentions(data.content, userId, undefined, comment.id).catch(() => {});

    return {
      ...comment,
      author_username: author.username,
      author_avatar_url: author.avatar_url,
      is_liked_by_me: false,
      replies: [],
    };
  }

  /**
   * Delete a comment (only own comments)
   */
  static async deleteComment(commentId: string, userId: string, postId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE post_comments SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND post_id = $3 AND deleted_at IS NULL`,
      [commentId, userId, postId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Comment not found or not authorized', 404, 'COMMENT_NOT_FOUND');
    }
  }

  /**
   * Toggle like on a comment
   */
  static async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<{ liked: boolean; likes_count: number }> {
    const commentCheck = await pool.query(
      'SELECT id FROM post_comments WHERE id = $1 AND deleted_at IS NULL',
      [commentId]
    );
    if (commentCheck.rows.length === 0) {
      throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    const existingLike = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    let liked: boolean;
    if (existingLike.rows.length > 0) {
      await pool.query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [
        commentId,
        userId,
      ]);
      liked = false;
    } else {
      await pool.query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [
        commentId,
        userId,
      ]);
      liked = true;
    }

    const countResult = await pool.query(
      'SELECT likes_count FROM post_comments WHERE id = $1',
      [commentId]
    );

    return {
      liked,
      likes_count: countResult.rows[0].likes_count,
    };
  }

  /**
   * Get the author of a post (for notifications)
   */
  static async getPostAuthorId(postId: string): Promise<string | null> {
    const result = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    return result.rows[0]?.user_id || null;
  }

  // ====== REACTIONS ======

  static readonly VALID_REACTIONS = ['like', 'love', 'clap', 'fire', 'mind_blown', 'rocket'];

  /**
   * Toggle a reaction on a post
   */
  static async toggleReaction(
    postId: string,
    userId: string,
    reactionType: string
  ): Promise<{ added: boolean; reactions: Record<string, number> }> {
    if (!this.VALID_REACTIONS.includes(reactionType)) {
      throw new AppError('Tipo de reação inválido', 400, 'INVALID_REACTION');
    }

    const postCheck = await pool.query(
      'SELECT id, user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );
    if (postCheck.rows.length === 0) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const existing = await pool.query(
      'SELECT id FROM post_reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3',
      [postId, userId, reactionType]
    );

    let added: boolean;
    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3',
        [postId, userId, reactionType]
      );
      added = false;
    } else {
      await pool.query(
        'INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)',
        [postId, userId, reactionType]
      );
      added = true;

      // Notify post author
      const postAuthorId = postCheck.rows[0].user_id;
      if (postAuthorId !== userId) {
        const reactorResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
        const reactorName = reactorResult.rows[0]?.username || 'Alguém';
        NotificationService.createNotification({
          user_id: postAuthorId,
          actor_id: userId,
          type: 'post_liked',
          title: 'Reação no seu post',
          body: `${reactorName} reagiu ao seu post`,
          reference_type: 'post',
          reference_id: postId,
          data: { reaction_type: reactionType },
        }).catch((err) => logger.error('Error creating reaction notification:', err));
      }
    }

    // Get updated reaction counts
    const reactions = await this.getPostReactions(postId);
    return { added, reactions };
  }

  /**
   * Get reaction counts for a post
   */
  static async getPostReactions(postId: string): Promise<Record<string, number>> {
    const result = await pool.query(
      `SELECT reaction_type, COUNT(*) as count
       FROM post_reactions WHERE post_id = $1
       GROUP BY reaction_type`,
      [postId]
    );
    const reactions: Record<string, number> = {};
    for (const row of result.rows) {
      reactions[row.reaction_type] = parseInt(row.count);
    }
    return reactions;
  }

  /**
   * Get user's reactions on a post
   */
  static async getUserReactions(postId: string, userId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
    return result.rows.map((r: any) => r.reaction_type);
  }

  // ====== POLLS ======

  /**
   * Vote on a poll post
   */
  static async votePoll(
    postId: string,
    userId: string,
    optionIndex: number
  ): Promise<{ votes: Record<number, number>; total_votes: number; my_vote: number | null }> {
    // Verify post is a poll
    const postResult = await pool.query(
      `SELECT id, post_type, metadata FROM posts WHERE id = $1 AND deleted_at IS NULL`,
      [postId]
    );
    if (postResult.rows.length === 0) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }
    const post = postResult.rows[0];
    if (post.post_type !== 'poll') {
      throw new AppError('This post is not a poll', 400, 'NOT_A_POLL');
    }

    const metadata = post.metadata || {};
    const options = metadata.options || [];
    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new AppError('Invalid option index', 400, 'INVALID_OPTION');
    }

    // Check if poll has expired
    if (metadata.ends_at && new Date(metadata.ends_at) < new Date()) {
      throw new AppError('This poll has ended', 400, 'POLL_ENDED');
    }

    // Upsert vote (one vote per user)
    await pool.query(
      `INSERT INTO poll_votes (post_id, user_id, option_index)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET option_index = EXCLUDED.option_index`,
      [postId, userId, optionIndex]
    );

    return this.getPollResults(postId, userId);
  }

  /**
   * Get poll results for a post
   */
  static async getPollResults(
    postId: string,
    userId?: string
  ): Promise<{ votes: Record<number, number>; total_votes: number; my_vote: number | null }> {
    const votesResult = await pool.query(
      `SELECT option_index, COUNT(*) as count FROM poll_votes WHERE post_id = $1 GROUP BY option_index`,
      [postId]
    );

    const votes: Record<number, number> = {};
    let totalVotes = 0;
    for (const row of votesResult.rows) {
      votes[row.option_index] = parseInt(row.count);
      totalVotes += parseInt(row.count);
    }

    let myVote: number | null = null;
    if (userId) {
      const myVoteResult = await pool.query(
        'SELECT option_index FROM poll_votes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      if (myVoteResult.rows.length > 0) {
        myVote = myVoteResult.rows[0].option_index;
      }
    }

    return { votes, total_votes: totalVotes, my_vote: myVote };
  }

  // ====== MENTIONS ======

  /**
   * Process mentions in text content, create records and notify
   */
  static async processMentions(
    text: string,
    mentionerId: string,
    postId?: string,
    commentId?: string
  ): Promise<void> {
    // Extract @username mentions
    const mentionPattern = /@(\w{3,30})/g;
    const usernames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
      usernames.push(match[1]);
    }

    if (usernames.length === 0) return;

    // Resolve usernames to user IDs
    const placeholders = usernames.map((_, i) => `$${i + 1}`).join(',');
    const usersResult = await pool.query(
      `SELECT id, username FROM users WHERE username IN (${placeholders})`,
      usernames
    );

    for (const user of usersResult.rows) {
      if (user.id === mentionerId) continue; // Don't mention yourself

      await pool.query(
        `INSERT INTO mentions (mentioner_id, mentioned_id, post_id, comment_id)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [mentionerId, user.id, postId || null, commentId || null]
      );

      // Notify mentioned user
      const mentionerResult = await pool.query('SELECT username FROM users WHERE id = $1', [mentionerId]);
      const mentionerName = mentionerResult.rows[0]?.username || 'Alguém';

      NotificationService.createNotification({
        user_id: user.id,
        actor_id: mentionerId,
        type: 'mention',
        title: 'Você foi mencionado',
        body: `${mentionerName} mencionou você ${postId ? 'em um post' : 'em um comentário'}`,
        reference_type: postId ? 'post' : 'comment',
        reference_id: postId || commentId || undefined,
        data: { mentioner_username: mentionerName },
      }).catch((err) => logger.error('Error creating mention notification:', err));
    }
  }
}
