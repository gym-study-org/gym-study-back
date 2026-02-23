import { Router } from 'express';
import { UsersController } from './controllers/users.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { avatarUpload } from '../../config/storage';

const router = Router();

// Protected routes (require authentication)
router.get('/me', authenticate, UsersController.getMe);
router.put('/me', authenticate, UsersController.updateMe);

// Avatar upload
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), UsersController.uploadAvatar);

// Public profile by ID (requires auth to check friendship status)
router.get('/by-username/:username/profile', authenticate, UsersController.getProfileByUsername);
router.get('/:id/profile', authenticate, UsersController.getPublicProfile);

export default router;
