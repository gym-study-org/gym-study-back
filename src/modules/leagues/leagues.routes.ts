import { Router } from 'express';
import { LeaguesController } from './controllers/leagues.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();

router.use(authenticate);

// GET /leagues/current - Get current league with group ranking
router.get('/current', asyncHandler(LeaguesController.getCurrentLeague));

// GET /leagues/history - Get league history
router.get('/history', asyncHandler(LeaguesController.getHistory));

// GET /leagues/info - Get all league tiers info
router.get('/info', asyncHandler(LeaguesController.getLeagueInfo));

export default router;
