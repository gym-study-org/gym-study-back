import { Router } from 'express';
import { FriendshipsController } from './controllers/friendships.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';

const router = Router();
const controller = new FriendshipsController();

// All routes require authentication
router.use(authenticate);

// Search users
router.get('/search', asyncHandler(controller.searchUsers.bind(controller)));

// Get friends list
router.get('/', asyncHandler(controller.getFriends.bind(controller)));

// Get pending requests received
router.get('/requests/pending', asyncHandler(controller.getPendingRequests.bind(controller)));

// Get sent requests
router.get('/requests/sent', asyncHandler(controller.getSentRequests.bind(controller)));

// Send friend request
router.post('/request', asyncHandler(controller.sendRequest.bind(controller)));

// Respond to friend request (accept/reject)
router.patch('/request/:id', asyncHandler(controller.respondToRequest.bind(controller)));

// Cancel sent request
router.delete('/request/:id', asyncHandler(controller.cancelRequest.bind(controller)));

// Remove friend
router.delete('/:friendId', asyncHandler(controller.removeFriend.bind(controller)));

export default router;
