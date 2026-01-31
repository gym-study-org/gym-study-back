import { startStreakJob } from './streak.job';
import { startAchievementsJob } from './achievements.job';
import { logger } from '../shared/utils/logger.util';

export const startAllJobs = () => {
  logger.info('Starting cron jobs...');

  startStreakJob();
  startAchievementsJob();

  logger.info('All cron jobs started successfully');
};

export { updateUserStreak } from './streak.job';
export { runFullAchievementsCheck } from './achievements.job';
