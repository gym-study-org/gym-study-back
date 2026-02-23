import { Router } from 'express';
import { NotificationController } from './controllers/notification.controller';
import { authenticate } from '../auth/middlewares/authenticate.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.middleware';
import { notificationQuerySchema, notificationIdParamSchema } from './validators/notification.validator';

const router = Router();

router.use(authenticate);

// GET /notifications - List notifications (cursor-based)
router.get(
  '/',
  validateRequest(notificationQuerySchema),
  asyncHandler(NotificationController.getNotifications)
);

// GET /notifications/unread-count - Get unread count
router.get('/unread-count', asyncHandler(NotificationController.getUnreadCount));

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', asyncHandler(NotificationController.markAllAsRead));

// PUT /notifications/:id/read - Mark one as read
router.put(
  '/:id/read',
  validateRequest(notificationIdParamSchema),
  asyncHandler(NotificationController.markAsRead)
);

export default router;
