import { Router } from 'express';
import { achievementsController } from './controllers/achievements.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /achievements - Get all available achievements
router.get('/', achievementsController.getAllAchievements);

// GET /achievements/me - Get current user's achievements
router.get('/me', achievementsController.getMyAchievements);

// GET /achievements/me/stats - Get current user's category stats
router.get('/me/stats', achievementsController.getCategoryStats);

// GET /achievements/me/recent - Get current user's recent unlocked achievements
router.get('/me/recent', achievementsController.getRecentAchievements);

// GET /achievements/me/points - Get current user's total points
router.get('/me/points', achievementsController.getTotalPoints);

// POST /achievements/check - Force check achievements for current user
router.post('/check', achievementsController.checkAchievements);

// GET /achievements/user/:userId - Get another user's achievements
router.get('/user/:userId', achievementsController.getUserAchievements);

export default router;
