import { Pool } from 'pg';
import { env } from './environment';
import { logger } from '../shared/utils/logger.util';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('✅ PostgreSQL connected');
});

pool.on('error', (err: Error) => {
  logger.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  client.release = () => {
    originalRelease();
    return Promise.resolve();
  };

  return client;
};
