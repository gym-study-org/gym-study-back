import cron from 'node-cron';
import { logger } from '../shared/utils/logger.util';
import { LeaguesService } from '../modules/leagues/services/leagues.service';

/**
 * League promotion job: runs every Monday at 00:30
 * Calculates final positions, promotes top players, demotes bottom players,
 * creates new week memberships
 */
export const startLeaguePromotionJob = () => {
  // Every Monday at 00:30 (after XP reset at 00:00)
  cron.schedule('30 0 * * 1', async () => {
    logger.info('Running league promotion job...');
    try {
      await LeaguesService.processWeeklyPromotion();
      logger.info('League promotion job completed');
    } catch (error) {
      logger.error('Error in league promotion job:', error);
    }
  });

  logger.info('League promotion job scheduled (Monday 00:30)');
};
