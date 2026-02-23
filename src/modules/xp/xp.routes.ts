import { Router } from 'express';
import { XPController } from './controllers/xp.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { xpHistoryQuerySchema } from './validators/xp.validator';

const router = Router();

router.use(authenticate);

// GET /xp/me - Get XP summary
router.get('/me', asyncHandler(XPController.getXPSummary));

// GET /xp/history - Get XP transaction history
router.get(
  '/history',
  validateRequest(xpHistoryQuerySchema),
  asyncHandler(XPController.getXPHistory)
);

// GET /xp/rules - Get XP rules table
router.get('/rules', asyncHandler(XPController.getXPRules));

export default router;
