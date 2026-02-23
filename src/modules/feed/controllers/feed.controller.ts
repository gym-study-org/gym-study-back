import { Request, Response, NextFunction } from 'express';
import { FeedService } from '../services/feed.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class FeedController {
  /**
   * GET /api/feed
   * Get personalized feed (friends + public)
   */
  static async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 20, cursor, filter } = req.query;

      const posts = await FeedService.getFeed(userId, {
        limit: Number(limit),
        cursor: cursor as string | undefined,
        filter: filter as any,
      });

      ResponseUtil.success(res, {
        posts,
        next_cursor: posts.length > 0 ? posts[posts.length - 1].created_at : null,
        has_more: posts.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feed/explore
   * Get explore/discover feed
   */
  static async getExploreFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 20, cursor } = req.query;

      const posts = await FeedService.getExploreFeed(userId, {
        limit: Number(limit),
        cursor: cursor as string | undefined,
      });

      ResponseUtil.success(res, {
        posts,
        next_cursor: posts.length > 0 ? posts[posts.length - 1].created_at : null,
        has_more: posts.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feed/user/:userId
   * Get a user's profile feed
   */
  static async getUserFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user!.id;
      const { userId } = req.params;
      const { limit = 20, cursor } = req.query;

      const posts = await FeedService.getUserFeed(
        viewerId,
        userId,
        Number(limit),
        cursor as string | undefined
      );

      ResponseUtil.success(res, {
        posts,
        next_cursor: posts.length > 0 ? posts[posts.length - 1].created_at : null,
        has_more: posts.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/feed/posts
   * Create a new post
   */
  static async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const post = await FeedService.createPost(userId, req.body);
      ResponseUtil.success(res, post, 'Post created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feed/posts/:postId
   * Get a single post with comments
   */
  static async getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user!.id;
      const { postId } = req.params;

      const post = await FeedService.getPostById(postId, viewerId);
      ResponseUtil.success(res, post);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/feed/posts/:postId
   * Update own post
   */
  static async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;

      const post = await FeedService.updatePost(postId, userId, req.body);
      ResponseUtil.success(res, post, 'Post updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/feed/posts/:postId
   * Soft-delete own post
   */
  static async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;

      await FeedService.deletePost(postId, userId);
      ResponseUtil.success(res, null, 'Post deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/feed/posts/:postId/like
   * Toggle like on a post
   */
  static async toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;

      const result = await FeedService.toggleLike(postId, userId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/feed/posts/:postId/comments
   * Add a comment to a post
   */
  static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;

      const comment = await FeedService.addComment(postId, userId, req.body);
      ResponseUtil.success(res, comment, 'Comment added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/feed/posts/:postId/comments/:commentId
   * Delete own comment
   */
  static async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId, commentId } = req.params;

      await FeedService.deleteComment(commentId, userId, postId);
      ResponseUtil.success(res, null, 'Comment deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/feed/posts/:postId/comments/:commentId/like
   * Toggle like on a comment
   */
  static async toggleCommentLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { commentId } = req.params;

      const result = await FeedService.toggleCommentLike(commentId, userId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/feed/posts/:postId/react
   * Toggle a reaction on a post
   */
  static async reactToPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;
      const { reaction_type } = req.body;

      const result = await FeedService.toggleReaction(postId, userId, reaction_type);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feed/posts/:postId/reactions
   * Get reactions for a post
   */
  static async getPostReactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;

      const [reactions, myReactions] = await Promise.all([
        FeedService.getPostReactions(postId),
        FeedService.getUserReactions(postId, userId),
      ]);

      ResponseUtil.success(res, { reactions, my_reactions: myReactions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/feed/posts/:postId/vote
   * Vote on a poll post
   */
  static async votePoll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;
      const { option_index } = req.body;

      const result = await FeedService.votePoll(postId, userId, option_index);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feed/posts/:postId/poll-results
   * Get poll results
   */
  static async getPollResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { postId } = req.params;

      const result = await FeedService.getPollResults(postId, userId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feed/search-users?q=username
   * Search users for @mention autocomplete
   */
  static async searchUsersForMention(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { q, limit = 10 } = req.query;

      const { pool } = await import('../../../config/database');
      const result = await pool.query(
        `SELECT id, username, full_name, avatar_url
         FROM users
         WHERE id != $1
           AND (username ILIKE $2 OR full_name ILIKE $2)
         ORDER BY
           CASE WHEN EXISTS(
             SELECT 1 FROM friendships
             WHERE status = 'accepted'
               AND ((user_id = $1 AND friend_id = users.id) OR (friend_id = $1 AND user_id = users.id))
           ) THEN 0 ELSE 1 END,
           username
         LIMIT $3`,
        [userId, `%${q}%`, Number(limit)]
      );

      ResponseUtil.success(res, result.rows);
    } catch (error) {
      next(error);
    }
  }
}
