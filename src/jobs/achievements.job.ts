import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';
import { achievementsService } from '../modules/achievements/services/achievements.service';
import { io } from '../server';
import { emitToUser } from '../websocket/socket.handler';

export const startAchievementsJob = () => {
  // Run every hour to check achievements for active users
  cron.schedule('0 * * * *', async () => {
    logger.info('Running achievements check job...');

    try {
      // Get users who have been active in the last 24 hours
      const activeUsersResult = await pool.query(
        `SELECT DISTINCT u.id
         FROM users u
         WHERE u.last_study_date >= NOW() - INTERVAL '24 hours'
         OR EXISTS (
           SELECT 1 FROM study_sessions ss
           WHERE ss.user_id = u.id
           AND ss.created_at >= NOW() - INTERVAL '24 hours'
         )`
      );

      const activeUserIds = activeUsersResult.rows.map((r) => r.id);

      if (activeUserIds.length === 0) {
        logger.info('No active users to check achievements for');
        return;
      }

      logger.info(`Checking achievements for ${activeUserIds.length} active users`);

      let totalUnlocked = 0;

      for (const userId of activeUserIds) {
        const unlockedAchievements =
          await achievementsService.checkAndUnlockAchievements(userId);

        if (unlockedAchievements.length > 0) {
          totalUnlocked += unlockedAchievements.length;

          // Emit WebSocket events for each unlocked achievement
          for (const achievement of unlockedAchievements) {
            emitToUser(io, userId, 'achievement:unlocked', {
              achievement,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      logger.info(
        `Achievements check job completed. Total unlocked: ${totalUnlocked}`
      );
    } catch (error) {
      logger.error('Error in achievements check job:', error);
    }
  });

  logger.info('Achievements check job scheduled (runs every hour)');
};

// Run a full check for all users (can be triggered manually or on startup)
export const runFullAchievementsCheck = async (): Promise<void> => {
  logger.info('Running full achievements check for all users...');

  try {
    const allUsersResult = await pool.query(`SELECT id FROM users`);
    const allUserIds = allUsersResult.rows.map((r) => r.id);

    let totalUnlocked = 0;

    for (const userId of allUserIds) {
      const unlockedAchievements =
        await achievementsService.checkAndUnlockAchievements(userId);

      if (unlockedAchievements.length > 0) {
        totalUnlocked += unlockedAchievements.length;

        // Emit WebSocket events for each unlocked achievement
        for (const achievement of unlockedAchievements) {
          emitToUser(io, userId, 'achievement:unlocked', {
            achievement,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    logger.info(
      `Full achievements check completed. Total unlocked: ${totalUnlocked}`
    );
  } catch (error) {
    logger.error('Error in full achievements check:', error);
  }
};
