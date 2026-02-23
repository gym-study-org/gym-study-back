import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';
import { NotificationService } from '../modules/notifications/services/notification.service';

export const startCleanupJob = () => {
  // Run daily at 3am
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running cleanup job...');

    try {
      // 1. Delete expired notifications
      const expiredNotifications = await NotificationService.deleteExpired();

      // 2. Delete expired assessment attempts (in_progress past expires_at)
      const expiredAttempts = await pool.query(
        `DELETE FROM assessment_attempts
         WHERE status = 'in_progress' AND expires_at < NOW() - INTERVAL '1 day'
         RETURNING id`
      );

      // 3. Hard-delete soft-deleted posts older than 30 days
      const deletedPosts = await pool.query(
        `DELETE FROM posts
         WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'
         RETURNING id`
      );

      // 4. Hard-delete soft-deleted comments older than 30 days
      const deletedComments = await pool.query(
        `DELETE FROM post_comments
         WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'
         RETURNING id`
      );

      // 5. Purge old leaderboard snapshots (> 12 months)
      const purgedSnapshots = await pool.query(
        `DELETE FROM leaderboard_snapshots
         WHERE snapshot_date < NOW() - INTERVAL '12 months'
         RETURNING id`
      );

      // 6. Delete expired stories and their views
      const expiredStories = await pool.query(
        `DELETE FROM stories
         WHERE expires_at < NOW() - INTERVAL '1 day'
         RETURNING id`
      );

      // 7. Purge old profile views (> 90 days)
      const purgedProfileViews = await pool.query(
        `DELETE FROM profile_views
         WHERE viewed_at < NOW() - INTERVAL '90 days'
         RETURNING id`
      );

      logger.info(
        `Cleanup completed: ${expiredNotifications} notifications, ` +
        `${expiredAttempts.rowCount} attempts, ` +
        `${deletedPosts.rowCount} posts, ` +
        `${deletedComments.rowCount} comments, ` +
        `${purgedSnapshots.rowCount} snapshots, ` +
        `${expiredStories.rowCount} stories, ` +
        `${purgedProfileViews.rowCount} profile views purged`
      );
    } catch (error) {
      logger.error('Error in cleanup job:', error);
    }
  });

  logger.info('Cleanup job scheduled (daily at 3am)');
};
