import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    logger.info('🔄 Running migrations...');

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      logger.info(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await pool.query(sql);
      logger.info(`✅ Migration ${file} completed`);
    }

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
