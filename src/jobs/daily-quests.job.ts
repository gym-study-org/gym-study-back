import cron from 'node-cron';
import { logger } from '../shared/utils/logger.util';

/**
 * Daily quests generation job: runs every day at 00:05
 * Generates 3 quests (bronze/silver/gold) for active users
 */
export const startDailyQuestsJob = () => {
  cron.schedule('5 0 * * *', async () => {
    logger.info('Running daily quests generation job...');
    try {
      const { QuestsService } = await import('../modules/quests/services/quests.service');
      const count = await QuestsService.generateForAllUsers();
      logger.info(`Daily quests generated for ${count} users`);
    } catch (error) {
      logger.error('Error in daily quests generation job:', error);
    }
  });

  logger.info('Daily quests job scheduled (daily at 00:05)');
};
