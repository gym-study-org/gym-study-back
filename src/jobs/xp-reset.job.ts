import cron from 'node-cron';
import { logger } from '../shared/utils/logger.util';
import { XPService } from '../modules/xp/services/xp.service';

/**
 * Reset weekly XP for all users every Monday at 00:00
 * This powers the weekly league competitions
 */
export const startXPResetJob = () => {
  // Every Monday at 00:00
  cron.schedule('0 0 * * 1', async () => {
    logger.info('Running weekly XP reset...');

    try {
      const count = await XPService.resetWeeklyXP();
      logger.info(`Weekly XP reset complete: ${count} users reset`);
    } catch (error) {
      logger.error('Weekly XP reset failed:', error);
    }
  });

  logger.info('XP reset job scheduled (Monday 00:00)');
};
