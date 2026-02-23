import cron from 'node-cron';
import { logger } from '../shared/utils/logger.util';
import { GitHubService } from '../modules/github/services/github.service';

export const startGitHubSyncJob = () => {
  // Sync every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running GitHub sync job...');

    try {
      const connections = await GitHubService.getAllConnections();
      let synced = 0;
      let failed = 0;

      for (const conn of connections) {
        try {
          await GitHubService.syncStats(conn.user_id);
          synced++;
        } catch (err) {
          failed++;
          logger.debug(`GitHub sync failed for user ${conn.user_id}: ${(err as Error).message}`);
        }
      }

      logger.info(`GitHub sync completed: ${synced} synced, ${failed} failed out of ${connections.length}`);
    } catch (error) {
      logger.error('Error in GitHub sync job:', error);
    }
  });

  logger.info('GitHub sync job scheduled (every 6 hours)');
};
