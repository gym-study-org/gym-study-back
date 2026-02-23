import { Router } from 'express';
import { StoriesController } from './controllers/stories.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { createStorySchema, storyIdParamSchema } from './validators/stories.validator';

const router = Router();

router.use(authenticate);

// Stories
router.post('/', validateRequest(createStorySchema), asyncHandler(StoriesController.createStory));
router.get('/feed', asyncHandler(StoriesController.getStoriesFeed));
router.get('/mine', asyncHandler(StoriesController.getMyStories));
router.post('/:storyId/view', validateRequest(storyIdParamSchema), asyncHandler(StoriesController.viewStory));
router.get('/:storyId/viewers', validateRequest(storyIdParamSchema), asyncHandler(StoriesController.getStoryViewers));
router.delete('/:storyId', validateRequest(storyIdParamSchema), asyncHandler(StoriesController.deleteStory));

// Profile views
router.get('/profile-views', asyncHandler(StoriesController.getProfileViews));
router.post('/profile-views/:userId', asyncHandler(StoriesController.recordProfileView));

// Progress cards
router.get('/progress-card/:type', asyncHandler(StoriesController.getProgressCard));

export default router;
