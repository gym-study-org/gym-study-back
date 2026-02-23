import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';

const migrationsDir = path.join(__dirname, 'migrations');

// Migrations that existed before migration tracking was introduced.
// These were already applied to the database and must be marked as executed.
const PRE_TRACKING_MIGRATIONS = [
  '001_create_users.sql',
  '002_create_password_resets.sql',
  '003_create_study_sessions.sql',
  '004_create_certifications.sql',
  '005_create_goals.sql',
  '006_create_friendships.sql',
  '007_create_challenges.sql',
  '008_create_achievements.sql',
  '009_seed_achievements.sql',
  '010_create_leveled_badges.sql',
  '011_seed_badge_definitions.sql',
  '012_migrate_legacy_achievements.sql',
  '013_create_migration_tracking.sql',
];

async function ensureTrackingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Seed pre-tracking migrations if the table is empty (first run with tracking)
  const countResult = await pool.query('SELECT COUNT(*) FROM schema_migrations');
  const count = parseInt(countResult.rows[0].count, 10);
  if (count === 0) {
    logger.info('Seeding schema_migrations with pre-existing migrations...');
    for (const filename of PRE_TRACKING_MIGRATIONS) {
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [filename]
      );
    }
    logger.info(`Seeded ${PRE_TRACKING_MIGRATIONS.length} pre-existing migrations`);
  }
}

async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function recordMigration(filename: string) {
  await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [
    filename,
  ]);
}

export async function runMigrations() {
  logger.info('Running migrations...');

  await ensureTrackingTable();
  const executed = await getExecutedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let migrationsRun = 0;

  for (const file of files) {
    if (executed.has(file)) {
      logger.debug(`Skipping already executed: ${file}`);
      continue;
    }

    logger.info(`Running migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    await pool.query(sql);
    await recordMigration(file);
    logger.info(`Migration ${file} completed`);
    migrationsRun++;
  }

  if (migrationsRun === 0) {
    logger.info('No new migrations to run');
  } else {
    logger.info(`${migrationsRun} migration(s) completed successfully`);
  }
}

// Run directly when called as a script
const isDirectRun = require.main === module;
if (isDirectRun) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}
