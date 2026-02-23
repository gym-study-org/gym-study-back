import { Request, Response, NextFunction } from 'express';
import { ArticlesService } from '../services/articles.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class ArticlesController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const article = await ArticlesService.create(userId, req.body);
      ResponseUtil.success(res, article, 'Article created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user?.id;
      const { slug } = req.params;
      const article = await ArticlesService.getBySlug(slug, viewerId);
      ResponseUtil.success(res, article);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { articleId } = req.params;
      const article = await ArticlesService.update(articleId, userId, req.body);
      ResponseUtil.success(res, article);
    } catch (error) {
      next(error);
    }
  }

  static async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { articleId } = req.params;
      const article = await ArticlesService.publish(articleId, userId);
      ResponseUtil.success(res, article);
    } catch (error) {
      next(error);
    }
  }

  static async unpublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { articleId } = req.params;
      const article = await ArticlesService.unpublish(articleId, userId);
      ResponseUtil.success(res, article);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { articleId } = req.params;
      await ArticlesService.delete(articleId, userId);
      ResponseUtil.success(res, { message: 'Article deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async listPublished(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 20, cursor, tag } = req.query;
      const articles = await ArticlesService.listPublished({
        limit: Number(limit),
        cursor: cursor as string | undefined,
        tag: tag as string | undefined,
      });

      ResponseUtil.success(res, {
        articles,
        next_cursor: articles.length > 0 ? articles[articles.length - 1].published_at : null,
        has_more: articles.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user!.id;
      const { userId } = req.params;
      const { limit = 20, cursor } = req.query;

      const articles = await ArticlesService.listByUser(userId, viewerId, {
        limit: Number(limit),
        cursor: cursor as string | undefined,
      });

      ResponseUtil.success(res, {
        articles,
        next_cursor: articles.length > 0 ? articles[articles.length - 1].created_at : null,
        has_more: articles.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyDrafts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 20, cursor } = req.query;

      const articles = await ArticlesService.getMyDrafts(userId, {
        limit: Number(limit),
        cursor: cursor as string | undefined,
      });

      ResponseUtil.success(res, {
        articles,
        next_cursor: articles.length > 0 ? articles[articles.length - 1].created_at : null,
        has_more: articles.length === Number(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { articleId } = req.params;
      const result = await ArticlesService.toggleLike(articleId, userId);
      ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}
