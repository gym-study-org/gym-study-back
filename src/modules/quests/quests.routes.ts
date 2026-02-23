import { Router } from 'express';
import { QuestsController } from './controllers/quests.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();

router.use(authenticate);

// GET /quests/daily - Get today's daily quests
router.get('/daily', asyncHandler(QuestsController.getDailyQuests));

// POST /quests/:id/claim - Claim XP for completed quest
router.post('/:id/claim', asyncHandler(QuestsController.claimQuest));

export default router;
