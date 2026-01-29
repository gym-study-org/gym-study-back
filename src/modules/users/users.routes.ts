import { Router } from 'express';
import { UsersController } from './controllers/users.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';

const router = Router();

// Protected routes (require authentication)
router.get('/me', authenticate, UsersController.getMe);
router.put('/me', authenticate, UsersController.updateMe);

export default router;
