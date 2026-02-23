import { startStreakJob } from './streak.job';
import { startAchievementsJob } from './achievements.job';
import { startAssessmentsJob } from './assessments.job';
import { startLeaderboardJob } from './leaderboard.job';
import { startEmailDigestJob } from './email-digest.job';
import { startGitHubSyncJob } from './github-sync.job';
import { startCleanupJob } from './cleanup.job';
import { startXPResetJob } from './xp-reset.job';
import { startLeaguePromotionJob } from './league-promotion.job';
import { startDailyQuestsJob } from './daily-quests.job';
import { logger } from '../shared/utils/logger.util';

export const startAllJobs = () => {
  logger.info('Starting cron jobs...');

  startStreakJob();
  startAchievementsJob();
  startAssessmentsJob();
  startLeaderboardJob();
  startEmailDigestJob();
  startGitHubSyncJob();
  startCleanupJob();
  startXPResetJob();
  startLeaguePromotionJob();
  startDailyQuestsJob();

  logger.info('All cron jobs started successfully');
};

export { updateUserStreak } from './streak.job';
export { runFullAchievementsCheck } from './achievements.job';
