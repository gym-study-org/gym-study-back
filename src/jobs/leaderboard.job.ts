import cron from 'node-cron';
import { pool } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../shared/utils/logger.util';
import { deleteCachePattern } from '../shared/utils/cache.util';

/**
 * Computes leaderboards and stores in Redis sorted sets for fast retrieval.
 * Also snapshots to leaderboard_snapshots table for historical tracking.
 */
export const startLeaderboardJob = () => {
  // Run daily at 1am
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running leaderboard computation job...');

    try {
      await computeGlobalLeaderboard();
      await computeWeeklyLeaderboard();
      await computeMonthlyLeaderboard();
      await computeSkillLeaderboards();

      // Invalidate ranking caches so fresh data is served
      await deleteCachePattern('ranking:*');

      logger.info('Leaderboard computation completed');
    } catch (error) {
      logger.error('Error in leaderboard computation job:', error);
    }
  });

  logger.info('Leaderboard job scheduled (daily at 1am)');
};

async function computeGlobalLeaderboard(): Promise<void> {
  const result = await pool.query(
    `SELECT id AS user_id, total_study_hours,
            ROW_NUMBER() OVER (ORDER BY total_study_hours DESC, created_at ASC) AS position
     FROM users
     WHERE is_active = true AND deleted_at IS NULL
     ORDER BY total_study_hours DESC
     LIMIT 1000`
  );

  if (result.rows.length === 0) return;

  // Store in Redis sorted set (score = total_study_hours)
  const pipeline = redis.pipeline();
  pipeline.del('leaderboard:global');

  for (const row of result.rows) {
    pipeline.zadd('leaderboard:global', parseFloat(row.total_study_hours) || 0, row.user_id);
  }
  pipeline.expire('leaderboard:global', 86400); // 24h TTL
  await pipeline.exec();

  // Snapshot to DB
  await snapshotLeaderboard('global', 'all', result.rows);

  logger.info(`Global leaderboard computed: ${result.rows.length} users`);
}

async function computeWeeklyLeaderboard(): Promise<void> {
  const result = await pool.query(
    `SELECT u.id AS user_id,
            COALESCE(SUM(ss.duration_minutes) / 60.0, 0) AS total_study_hours,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ss.duration_minutes), 0) DESC, u.created_at ASC) AS position
     FROM users u
     LEFT JOIN study_sessions ss ON ss.user_id = u.id
       AND ss.started_at >= DATE_TRUNC('week', CURRENT_DATE)
     WHERE u.is_active = true AND u.deleted_at IS NULL
     GROUP BY u.id, u.created_at
     HAVING COALESCE(SUM(ss.duration_minutes), 0) > 0
     ORDER BY total_study_hours DESC
     LIMIT 500`
  );

  if (result.rows.length === 0) return;

  const weekKey = `leaderboard:weekly:${getWeekKey()}`;
  const pipeline = redis.pipeline();
  pipeline.del(weekKey);

  for (const row of result.rows) {
    pipeline.zadd(weekKey, parseFloat(row.total_study_hours) || 0, row.user_id);
  }
  pipeline.expire(weekKey, 604800); // 7 days TTL
  await pipeline.exec();

  await snapshotLeaderboard('weekly', getWeekKey(), result.rows);

  logger.info(`Weekly leaderboard computed: ${result.rows.length} users`);
}

async function computeMonthlyLeaderboard(): Promise<void> {
  const result = await pool.query(
    `SELECT u.id AS user_id,
            COALESCE(SUM(ss.duration_minutes) / 60.0, 0) AS total_study_hours,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ss.duration_minutes), 0) DESC, u.created_at ASC) AS position
     FROM users u
     LEFT JOIN study_sessions ss ON ss.user_id = u.id
       AND ss.started_at >= DATE_TRUNC('month', CURRENT_DATE)
     WHERE u.is_active = true AND u.deleted_at IS NULL
     GROUP BY u.id, u.created_at
     HAVING COALESCE(SUM(ss.duration_minutes), 0) > 0
     ORDER BY total_study_hours DESC
     LIMIT 500`
  );

  if (result.rows.length === 0) return;

  const monthKey = `leaderboard:monthly:${getMonthKey()}`;
  const pipeline = redis.pipeline();
  pipeline.del(monthKey);

  for (const row of result.rows) {
    pipeline.zadd(monthKey, parseFloat(row.total_study_hours) || 0, row.user_id);
  }
  pipeline.expire(monthKey, 2678400); // 31 days TTL
  await pipeline.exec();

  await snapshotLeaderboard('monthly', getMonthKey(), result.rows);

  logger.info(`Monthly leaderboard computed: ${result.rows.length} users`);
}

async function computeSkillLeaderboards(): Promise<void> {
  // Leaderboards per verified skill category
  const skills = await pool.query(
    `SELECT DISTINCT sc.id, sc.code
     FROM skill_categories sc
     JOIN verified_skills vs ON vs.skill_category_id = sc.id AND vs.is_active = true
     WHERE sc.is_active = true`
  );

  for (const skill of skills.rows) {
    const result = await pool.query(
      `SELECT vs.user_id, vs.score,
              ROW_NUMBER() OVER (ORDER BY vs.score DESC, vs.verified_at ASC) AS position
       FROM verified_skills vs
       WHERE vs.skill_category_id = $1 AND vs.is_active = true
       ORDER BY vs.score DESC
       LIMIT 200`,
      [skill.id]
    );

    if (result.rows.length === 0) continue;

    const skillKey = `leaderboard:skill:${skill.code}`;
    const pipeline = redis.pipeline();
    pipeline.del(skillKey);

    for (const row of result.rows) {
      pipeline.zadd(skillKey, parseFloat(row.score) || 0, row.user_id);
    }
    pipeline.expire(skillKey, 86400);
    await pipeline.exec();

    await snapshotLeaderboard('skill', skill.code, result.rows);
  }

  logger.info(`Skill leaderboards computed for ${skills.rows.length} categories`);
}

async function snapshotLeaderboard(
  type: string,
  scope: string,
  rows: Array<{ user_id: string; position: number | string; total_study_hours?: string; score?: string }>
): Promise<void> {
  if (rows.length === 0) return;

  // Get previous positions for change tracking
  const prevResult = await pool.query(
    `SELECT user_id, position FROM leaderboard_snapshots
     WHERE leaderboard_type = $1 AND scope = $2 AND snapshot_date = CURRENT_DATE - INTERVAL '1 day'`,
    [type, scope]
  );
  const prevPositions = new Map(prevResult.rows.map((r) => [r.user_id, r.position]));

  const values: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (const row of rows) {
    const score = row.total_study_hours ?? row.score ?? '0';
    const position = typeof row.position === 'string' ? parseInt(row.position, 10) : row.position;
    const prevPosition = prevPositions.get(row.user_id) ?? null;

    values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`);
    params.push(type, scope, row.user_id, parseFloat(String(score)), position, prevPosition);
    paramIdx += 6;
  }

  await pool.query(
    `INSERT INTO leaderboard_snapshots (leaderboard_type, scope, user_id, score, position, previous_position)
     VALUES ${values.join(', ')}
     ON CONFLICT (leaderboard_type, scope, user_id, snapshot_date)
     DO UPDATE SET score = EXCLUDED.score, position = EXCLUDED.position, previous_position = EXCLUDED.previous_position`,
    params
  );
}

function getWeekKey(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
