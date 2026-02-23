import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from './queue.config';
import { logger } from '../utils/logger.util';

// Create queues
export const achievementQueue = new Queue(QUEUE_NAMES.ACHIEVEMENT_CHECKS, {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const badgeQueue = new Queue(QUEUE_NAMES.BADGE_CHECKS, {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection: redisConnection,
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2,
  },
});

export const emailQueue = new Queue(QUEUE_NAMES.EMAILS, {
  connection: redisConnection,
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
  },
});

export const githubSyncQueue = new Queue(QUEUE_NAMES.GITHUB_SYNC, {
  connection: redisConnection,
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2,
  },
});

export const xpQueue = new Queue(QUEUE_NAMES.XP_AWARDS, {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

// Helper functions to enqueue jobs
export async function enqueueAchievementCheck(userId: string, category?: string) {
  await achievementQueue.add('check', { userId, category }, {
    jobId: `ach-${userId}-${category || 'all'}-${Date.now()}`,
  });
}

export async function enqueueBadgeCheck(userId: string) {
  await badgeQueue.add('check', { userId }, {
    jobId: `badge-${userId}-${Date.now()}`,
  });
}

export async function enqueueNotification(data: {
  user_id: string;
  actor_id?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  reference_type?: string;
  reference_id?: string;
}) {
  await notificationQueue.add('create', data);
}

export async function enqueueEmail(data: {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}) {
  await emailQueue.add('send', data);
}

export async function enqueueGitHubSync(userId: string) {
  await githubSyncQueue.add('sync', { userId }, {
    jobId: `gh-sync-${userId}`,
  });
}

export async function enqueueXPAward(data: {
  userId: string;
  source: string;
  sourceId?: string;
  multiplier?: number;
  metadata?: Record<string, unknown>;
}) {
  await xpQueue.add('award', data, {
    jobId: `xp-${data.userId}-${data.source}-${Date.now()}`,
  });
}

logger.info('BullMQ queues initialized');
