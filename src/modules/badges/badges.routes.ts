import { Router } from 'express';
import { badgesController } from './controllers/badges.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /badges - Get all badge definitions
router.get('/', badgesController.getAllBadges);

// GET /badges/me - Get current user's badges with progress
router.get('/me', badgesController.getMyBadges);

// GET /badges/me/stats - Get current user's category stats
router.get('/me/stats', badgesController.getCategoryStats);

// GET /badges/me/recent - Get current user's recent level-ups
router.get('/me/recent', badgesController.getRecentLevelUps);

// GET /badges/me/points - Get current user's total points
router.get('/me/points', badgesController.getTotalPoints);

// POST /badges/check - Force check badges for current user
router.post('/check', badgesController.checkBadges);

// GET /badges/user/:userId - Get another user's badges
router.get('/user/:userId', badgesController.getUserBadges);

export default router;
