import { Router } from 'express';
import { GitHubController } from './controllers/github.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { userIdParamSchema } from './validators/github.validator';

const router = Router();

router.use(authenticate);

// POST /github/connect - Connect GitHub account
router.post('/connect', asyncHandler(GitHubController.connect));

// GET /github/stats - Get my GitHub stats
router.get('/stats', asyncHandler(GitHubController.getMyStats));

// POST /github/sync - Manual sync
router.post('/sync', asyncHandler(GitHubController.sync));

// GET /github/user/:userId/stats - Public stats of another user
router.get(
  '/user/:userId/stats',
  validateRequest(userIdParamSchema),
  asyncHandler(GitHubController.getUserStats)
);

// DELETE /github/disconnect - Disconnect GitHub account
router.delete('/disconnect', asyncHandler(GitHubController.disconnect));

export default router;
