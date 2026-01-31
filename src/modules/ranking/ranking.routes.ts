import { Router } from 'express';
import { RankingController } from './controllers/ranking.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();
const controller = new RankingController();

// All routes require authentication
router.use(authenticate);

// Get global ranking (all time)
router.get('/global', asyncHandler(controller.getGlobalRanking.bind(controller)));

// Get friends ranking
router.get('/friends', asyncHandler(controller.getFriendsRanking.bind(controller)));

// Get monthly ranking
router.get('/monthly', asyncHandler(controller.getMonthlyRanking.bind(controller)));

// Get weekly ranking
router.get('/weekly', asyncHandler(controller.getWeeklyRanking.bind(controller)));

// Get current user's position
router.get('/position', asyncHandler(controller.getUserPosition.bind(controller)));

export default router;
