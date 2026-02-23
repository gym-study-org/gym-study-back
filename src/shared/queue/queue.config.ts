import { ConnectionOptions } from 'bullmq';
import { env } from '../../config/environment';

// Parse Redis URL for BullMQ connection (BullMQ uses ioredis options)
function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const redisConnection: ConnectionOptions = parseRedisUrl(
  env.REDIS_URL || 'redis://localhost:6379'
);

export const QUEUE_NAMES = {
  ACHIEVEMENT_CHECKS: 'achievement-checks',
  BADGE_CHECKS: 'badge-checks',
  NOTIFICATIONS: 'notifications',
  EMAILS: 'emails',
  GITHUB_SYNC: 'github-sync',
  XP_AWARDS: 'xp-awards',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
};
