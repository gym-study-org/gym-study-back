import { Router } from 'express';
import { ChallengesController } from './controllers/challenges.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();
const controller = new ChallengesController();

// All routes require authentication
router.use(authenticate);

// Get my challenges
router.get('/', asyncHandler(controller.getMyChallenges.bind(controller)));

// Get pending invitations
router.get('/invitations', asyncHandler(controller.getPendingInvitations.bind(controller)));

// Create a new challenge
router.post('/', asyncHandler(controller.create.bind(controller)));

// Get a specific challenge
router.get('/:id', asyncHandler(controller.getById.bind(controller)));

// Get challenge participants
router.get('/:id/participants', asyncHandler(controller.getParticipants.bind(controller)));

// Get challenge leaderboard
router.get('/:id/leaderboard', asyncHandler(controller.getLeaderboard.bind(controller)));

// Respond to invitation
router.patch('/:id/respond', asyncHandler(controller.respondToInvitation.bind(controller)));

// Start challenge
router.patch('/:id/start', asyncHandler(controller.startChallenge.bind(controller)));

// Cancel challenge
router.delete('/:id', asyncHandler(controller.cancelChallenge.bind(controller)));

export default router;
