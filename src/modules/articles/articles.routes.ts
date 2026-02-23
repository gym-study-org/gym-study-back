import { Router } from 'express';
import { ArticlesController } from './controllers/articles.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import {
  createArticleSchema,
  updateArticleSchema,
  articleIdParamSchema,
  articleSlugParamSchema,
  articleQuerySchema,
  userArticlesParamSchema,
} from './validators/articles.validator';

const router = Router();

// Public: list published articles
router.get('/', validateRequest(articleQuerySchema), asyncHandler(ArticlesController.listPublished));

// Public: read article by slug
router.get('/slug/:slug', validateRequest(articleSlugParamSchema), asyncHandler(ArticlesController.getBySlug));

// All below require authentication
router.use(authenticate);

// My drafts
router.get('/drafts', asyncHandler(ArticlesController.getMyDrafts));

// CRUD
router.post('/', validateRequest(createArticleSchema), asyncHandler(ArticlesController.create));
router.put('/:articleId', validateRequest(updateArticleSchema), asyncHandler(ArticlesController.update));
router.delete('/:articleId', validateRequest(articleIdParamSchema), asyncHandler(ArticlesController.delete));

// Publish/unpublish
router.post('/:articleId/publish', validateRequest(articleIdParamSchema), asyncHandler(ArticlesController.publish));
router.post('/:articleId/unpublish', validateRequest(articleIdParamSchema), asyncHandler(ArticlesController.unpublish));

// Like
router.post('/:articleId/like', validateRequest(articleIdParamSchema), asyncHandler(ArticlesController.toggleLike));

// User's articles
router.get('/user/:userId', validateRequest(userArticlesParamSchema), asyncHandler(ArticlesController.listByUser));

export default router;
