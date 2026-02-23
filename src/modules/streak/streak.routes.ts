import { Router } from 'express';
import { StreakController } from './controllers/streak.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();

router.use(authenticate);

// GET /streak/status - Get streak status with freeze info and milestones
router.get('/status', asyncHandler(StreakController.getStatus));

// POST /streak/buy-freeze - Buy a streak freeze with gems
router.post('/buy-freeze', asyncHandler(StreakController.buyFreeze));

export default router;
