import { Router } from 'express';
import { RecommendationsController } from './controllers/recommendations.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import {
  createRecommendationSchema,
  updateRecommendationSchema,
  recommendationIdParamSchema,
  userIdParamSchema,
} from './validators/recommendations.validator';

const router = Router();

router.use(authenticate);

// Create or update recommendation for a friend
router.post('/', validateRequest(createRecommendationSchema), asyncHandler(RecommendationsController.create));

// Get my received recommendations
router.get('/received', asyncHandler(RecommendationsController.getMine));

// Get my written recommendations
router.get('/written', asyncHandler(RecommendationsController.getWrittenByMe));

// Get recommendations for a user (public visible only unless owner)
router.get('/user/:userId', validateRequest(userIdParamSchema), asyncHandler(RecommendationsController.getForUser));

// Update recommendation (author: content, recipient: visibility)
router.put('/:recommendationId', validateRequest(updateRecommendationSchema), asyncHandler(RecommendationsController.update));

// Delete recommendation (author or recipient)
router.delete('/:recommendationId', validateRequest(recommendationIdParamSchema), asyncHandler(RecommendationsController.delete));

export default router;
