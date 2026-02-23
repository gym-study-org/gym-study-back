import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ResponseUtil } from '../../../shared/utils/response.util';

export class NotificationController {
  static async getNotifications(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { limit, cursor, unread_only } = req.query as any;

    const result = await NotificationService.getNotifications(userId, {
      limit: parseInt(limit, 10) || 20,
      cursor: cursor as string,
      unread_only: unread_only === 'true',
    });

    return ResponseUtil.success(res, result);
  }

  static async getUnreadCount(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const count = await NotificationService.getUnreadCount(userId);
    return ResponseUtil.success(res, { unread_count: count });
  }

  static async markAsRead(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await NotificationService.markAsRead(userId, id);
    return ResponseUtil.success(res, null, 'Notification marked as read');
  }

  static async markAllAsRead(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const count = await NotificationService.markAllAsRead(userId);
    return ResponseUtil.success(res, { marked_count: count }, 'All notifications marked as read');
  }
}
