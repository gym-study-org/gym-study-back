import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import {
  ArticleWithAuthor,
  CreateArticleDTO,
  UpdateArticleDTO,
  ArticleQuery,
} from '../interfaces/article.interface';

export class ArticlesService {
  /**
   * Generate URL-friendly slug from title
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 200)
      + '-' + Date.now().toString(36);
  }

  /**
   * Estimate reading time based on word count (~200 words/min)
   */
  private static estimateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }

  static async create(userId: string, data: CreateArticleDTO): Promise<ArticleWithAuthor> {
    const slug = this.generateSlug(data.title);
    const readingTime = this.estimateReadingTime(data.content);

    const result = await pool.query(
      `INSERT INTO articles (user_id, title, slug, content, excerpt, cover_image_url, tags, reading_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        data.title,
        slug,
        data.content,
        data.excerpt || data.content.substring(0, 300),
        data.cover_image_url || null,
        data.tags || [],
        readingTime,
      ]
    );

    return this.getById(result.rows[0].id, userId);
  }

  static async getById(articleId: string, viewerId?: string): Promise<ArticleWithAuthor> {
    const result = await pool.query(
      `SELECT a.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        u.level AS author_level
        ${viewerId ? `, EXISTS(SELECT 1 FROM article_likes al WHERE al.article_id = a.id AND al.user_id = '${viewerId}') AS is_liked_by_me` : ''}
       FROM articles a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [articleId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async getBySlug(slug: string, viewerId?: string): Promise<ArticleWithAuthor> {
    const likeCheck = viewerId
      ? `, EXISTS(SELECT 1 FROM article_likes al WHERE al.article_id = a.id AND al.user_id = $2) AS is_liked_by_me`
      : '';
    const params: unknown[] = [slug];
    if (viewerId) params.push(viewerId);

    const result = await pool.query(
      `SELECT a.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        u.level AS author_level
        ${likeCheck}
       FROM articles a
       JOIN users u ON u.id = a.user_id
       WHERE a.slug = $1`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    // Increment view count
    await pool.query('UPDATE articles SET views_count = views_count + 1 WHERE id = $1', [result.rows[0].id]);

    return result.rows[0];
  }

  static async update(articleId: string, userId: string, data: UpdateArticleDTO): Promise<ArticleWithAuthor> {
    const article = await this.getById(articleId);
    if (article.user_id !== userId) {
      throw new AppError('Not authorized to edit this article', 403, 'FORBIDDEN');
    }
    if (article.status === 'published') {
      throw new AppError('Cannot edit a published article. Unpublish it first.', 400, 'ARTICLE_PUBLISHED');
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      sets.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      sets.push(`content = $${idx++}`);
      values.push(data.content);
      sets.push(`reading_time_minutes = $${idx++}`);
      values.push(this.estimateReadingTime(data.content));
    }
    if (data.excerpt !== undefined) {
      sets.push(`excerpt = $${idx++}`);
      values.push(data.excerpt);
    }
    if (data.cover_image_url !== undefined) {
      sets.push(`cover_image_url = $${idx++}`);
      values.push(data.cover_image_url);
    }
    if (data.tags !== undefined) {
      sets.push(`tags = $${idx++}`);
      values.push(data.tags);
    }

    if (sets.length === 0) {
      return article;
    }

    sets.push(`updated_at = NOW()`);
    values.push(articleId);

    await pool.query(
      `UPDATE articles SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getById(articleId, userId);
  }

  static async publish(articleId: string, userId: string): Promise<ArticleWithAuthor> {
    const article = await this.getById(articleId);
    if (article.user_id !== userId) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    await pool.query(
      `UPDATE articles SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [articleId]
    );

    return this.getById(articleId, userId);
  }

  static async unpublish(articleId: string, userId: string): Promise<ArticleWithAuthor> {
    const article = await this.getById(articleId);
    if (article.user_id !== userId) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    await pool.query(
      `UPDATE articles SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = $1`,
      [articleId]
    );

    return this.getById(articleId, userId);
  }

  static async delete(articleId: string, userId: string): Promise<void> {
    const article = await this.getById(articleId);
    if (article.user_id !== userId) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    await pool.query('DELETE FROM articles WHERE id = $1', [articleId]);
  }

  static async listPublished(query: ArticleQuery): Promise<ArticleWithAuthor[]> {
    const { limit, cursor, tag } = query;
    const params: unknown[] = [limit];
    let paramIdx = 2;

    let cursorClause = '';
    if (cursor) {
      cursorClause = `AND a.published_at < $${paramIdx}`;
      params.push(cursor);
      paramIdx++;
    }

    let tagClause = '';
    if (tag) {
      tagClause = `AND $${paramIdx} = ANY(a.tags)`;
      params.push(tag);
      paramIdx++;
    }

    const result = await pool.query(
      `SELECT a.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        u.level AS author_level
       FROM articles a
       JOIN users u ON u.id = a.user_id
       WHERE a.status = 'published'
         ${cursorClause}
         ${tagClause}
       ORDER BY a.published_at DESC
       LIMIT $1`,
      params
    );

    return result.rows;
  }

  static async listByUser(userId: string, viewerId: string, query: { limit: number; cursor?: string }): Promise<ArticleWithAuthor[]> {
    const isOwner = userId === viewerId;
    const params: unknown[] = [userId, query.limit];
    let paramIdx = 3;

    let cursorClause = '';
    if (query.cursor) {
      cursorClause = `AND a.created_at < $${paramIdx}`;
      params.push(query.cursor);
      paramIdx++;
    }

    const statusClause = isOwner ? '' : `AND a.status = 'published'`;

    const result = await pool.query(
      `SELECT a.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        u.level AS author_level
       FROM articles a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1
         ${statusClause}
         ${cursorClause}
       ORDER BY a.created_at DESC
       LIMIT $2`,
      params
    );

    return result.rows;
  }

  static async getMyDrafts(userId: string, query: { limit: number; cursor?: string }): Promise<ArticleWithAuthor[]> {
    const params: unknown[] = [userId, query.limit];
    let paramIdx = 3;

    let cursorClause = '';
    if (query.cursor) {
      cursorClause = `AND a.created_at < $${paramIdx}`;
      params.push(query.cursor);
      paramIdx++;
    }

    const result = await pool.query(
      `SELECT a.*,
        u.username AS author_username,
        u.full_name AS author_full_name,
        u.avatar_url AS author_avatar_url,
        u.level AS author_level
       FROM articles a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1 AND a.status = 'draft'
         ${cursorClause}
       ORDER BY a.updated_at DESC
       LIMIT $2`,
      params
    );

    return result.rows;
  }

  static async toggleLike(articleId: string, userId: string): Promise<{ liked: boolean; likes_count: number }> {
    const article = await this.getById(articleId);
    if (article.status !== 'published') {
      throw new AppError('Cannot like a draft article', 400, 'ARTICLE_NOT_PUBLISHED');
    }

    const existing = await pool.query(
      'SELECT id FROM article_likes WHERE article_id = $1 AND user_id = $2',
      [articleId, userId]
    );

    let liked: boolean;
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM article_likes WHERE article_id = $1 AND user_id = $2', [articleId, userId]);
      liked = false;
    } else {
      await pool.query(
        'INSERT INTO article_likes (article_id, user_id) VALUES ($1, $2)',
        [articleId, userId]
      );
      liked = true;
    }

    const countResult = await pool.query(
      'SELECT likes_count FROM articles WHERE id = $1',
      [articleId]
    );

    return { liked, likes_count: countResult.rows[0].likes_count };
  }
}
