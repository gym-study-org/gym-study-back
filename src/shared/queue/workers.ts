import { Worker } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from './queue.config';
import { logger } from '../utils/logger.util';
import { achievementsService } from '../../modules/achievements/services/achievements.service';
import { emitToUser } from '../../websocket/socket.handler';
import { io } from '../../server';
import { NotificationService } from '../../modules/notifications/services/notification.service';
import { sendEmail } from '../services/email.service';

export function startWorkers() {
  // Achievement check worker
  const achievementWorker = new Worker(
    QUEUE_NAMES.ACHIEVEMENT_CHECKS,
    async (job) => {
      const { userId, category } = job.data;
      const unlocked = await achievementsService.checkAndUnlockAchievements(userId, category);

      for (const achievement of unlocked) {
        emitToUser(io, userId, 'achievement:unlocked', {
          achievement,
          timestamp: new Date().toISOString(),
        });
      }

      return { unlocked: unlocked.length };
    },
    { connection: redisConnection, concurrency: 5 }
  );

  achievementWorker.on('failed', (job, err) => {
    logger.error(`Achievement check failed for job ${job?.id}: ${err.message}`);
  });

  // Badge check worker
  const badgeWorker = new Worker(
    QUEUE_NAMES.BADGE_CHECKS,
    async (job) => {
      const { userId } = job.data;
      // Import dynamically to avoid circular deps
      const { badgesService } = await import('../../modules/badges/services/badges.service');
      const result = await badgesService.checkAndUpdateBadges(userId);
      return result;
    },
    { connection: redisConnection, concurrency: 5 }
  );

  badgeWorker.on('failed', (job, err) => {
    logger.error(`Badge check failed for job ${job?.id}: ${err.message}`);
  });

  // Notification worker
  const notificationWorker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      const data = job.data;
      await NotificationService.createNotification(data);
    },
    { connection: redisConnection, concurrency: 10 }
  );

  notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification creation failed for job ${job?.id}: ${err.message}`);
  });

  // Email worker (rate-limited)
  const emailWorker = new Worker(
    QUEUE_NAMES.EMAILS,
    async (job) => {
      const { to, subject, template, data } = job.data;
      const sent = await sendEmail({ to, subject, template, data });
      if (!sent) {
        throw new Error('Email send failed');
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
      limiter: {
        max: 10,
        duration: 60000, // max 10 emails per minute
      },
    }
  );

  emailWorker.on('failed', (job, err) => {
    logger.error(`Email send failed for job ${job?.id}: ${err.message}`);
  });

  // XP award worker — WebSocket emission, league sync and quest progress are
  // handled inside XPService.insertTransaction, so the worker only needs to
  // call awardXP. This avoids double-emitting when XP is awarded directly
  // (study sessions, streaks, quests) vs. via the queue.
  const xpWorker = new Worker(
    QUEUE_NAMES.XP_AWARDS,
    async (job) => {
      const { userId, source, sourceId, multiplier, metadata } = job.data;
      const { XPService } = await import('../../modules/xp/services/xp.service');
      const result = await XPService.awardXP({ userId, source, sourceId, multiplier, metadata });
      return { amount: result.transaction.amount, leveled_up: result.leveled_up };
    },
    { connection: redisConnection, concurrency: 5 }
  );

  xpWorker.on('failed', (job, err) => {
    logger.error(`XP award failed for job ${job?.id}: ${err.message}`);
  });

  // GitHub sync worker
  const githubSyncWorker = new Worker(
    QUEUE_NAMES.GITHUB_SYNC,
    async (job) => {
      const { userId } = job.data;
      const { GitHubService } = await import('../../modules/github/services/github.service');
      await GitHubService.syncStats(userId);
    },
    { connection: redisConnection, concurrency: 1 }
  );

  githubSyncWorker.on('failed', (job, err) => {
    logger.error(`GitHub sync failed for job ${job?.id}: ${err.message}`);
  });

  logger.info('BullMQ workers started (achievements: 5, badges: 5, notifications: 10, emails: 2, github: 1, xp: 5)');

  return {
    achievementWorker,
    badgeWorker,
    notificationWorker,
    emailWorker,
    githubSyncWorker,
    xpWorker,
  };
}
