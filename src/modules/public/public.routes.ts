import { Router } from 'express';
import { PublicController } from './controllers/public.controller';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();

// All routes are public (no auth required)

// GET /public/profile/:username - Public profile with stats
router.get('/profile/:username', asyncHandler(PublicController.getProfile));

// GET /public/badges/:username - Hireable-signal badges
router.get('/badges/:username', asyncHandler(PublicController.getBadges));

// GET /public/verify/:username/:badgeCode - Verify a specific badge
router.get('/verify/:username/:badgeCode', asyncHandler(PublicController.verifyBadge));

// GET /public/embed/:username - Embed data for portfolio/LinkedIn
router.get('/embed/:username', asyncHandler(PublicController.getEmbed));

export default router;
