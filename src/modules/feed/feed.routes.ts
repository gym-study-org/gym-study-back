import { Router } from 'express';
import { FeedController } from './controllers/feed.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  feedQuerySchema,
  postIdParamSchema,
  userFeedParamSchema,
  commentActionSchema,
  reactToPostSchema,
  votePollSchema,
  searchUsersQuerySchema,
} from './validators/feed.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Feed endpoints
router.get('/', validateRequest(feedQuerySchema), asyncHandler(FeedController.getFeed));
router.get('/explore', validateRequest(feedQuerySchema), asyncHandler(FeedController.getExploreFeed));
router.get(
  '/user/:userId',
  validateRequest(userFeedParamSchema),
  asyncHandler(FeedController.getUserFeed)
);

// Post CRUD
router.post('/posts', validateRequest(createPostSchema), asyncHandler(FeedController.createPost));
router.get(
  '/posts/:postId',
  validateRequest(postIdParamSchema),
  asyncHandler(FeedController.getPost)
);
router.put(
  '/posts/:postId',
  validateRequest(updatePostSchema),
  asyncHandler(FeedController.updatePost)
);
router.delete(
  '/posts/:postId',
  validateRequest(postIdParamSchema),
  asyncHandler(FeedController.deletePost)
);

// Post interactions
router.post(
  '/posts/:postId/like',
  validateRequest(postIdParamSchema),
  asyncHandler(FeedController.toggleLike)
);
router.post(
  '/posts/:postId/comments',
  validateRequest(createCommentSchema),
  asyncHandler(FeedController.addComment)
);
router.delete(
  '/posts/:postId/comments/:commentId',
  validateRequest(commentActionSchema),
  asyncHandler(FeedController.deleteComment)
);
router.post(
  '/posts/:postId/comments/:commentId/like',
  validateRequest(commentActionSchema),
  asyncHandler(FeedController.toggleCommentLike)
);

// Reactions
router.post(
  '/posts/:postId/react',
  validateRequest(reactToPostSchema),
  asyncHandler(FeedController.reactToPost)
);
router.get(
  '/posts/:postId/reactions',
  validateRequest(postIdParamSchema),
  asyncHandler(FeedController.getPostReactions)
);

// Poll voting
router.post(
  '/posts/:postId/vote',
  validateRequest(votePollSchema),
  asyncHandler(FeedController.votePoll)
);
router.get(
  '/posts/:postId/poll-results',
  validateRequest(postIdParamSchema),
  asyncHandler(FeedController.getPollResults)
);

// Mention autocomplete
router.get(
  '/search-users',
  validateRequest(searchUsersQuerySchema),
  asyncHandler(FeedController.searchUsersForMention)
);

export default router;
