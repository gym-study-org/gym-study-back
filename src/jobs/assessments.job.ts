import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';

export const startAssessmentsJob = () => {
  // Run every 15 minutes - expire timed-out assessment attempts
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running assessment expiration job...');

    try {
      const result = await pool.query(
        `UPDATE assessment_attempts
         SET status = 'expired', updated_at = NOW()
         WHERE status = 'in_progress'
           AND expires_at < NOW()
         RETURNING id, user_id`
      );

      if (result.rows.length > 0) {
        logger.info(`Expired ${result.rows.length} assessment attempt(s)`);
      }
    } catch (error) {
      logger.error('Error in assessment expiration job:', error);
    }
  });

  // Run daily at 2am - expire verified skills that have passed their expiration date
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running verified skills expiration job...');

    try {
      const result = await pool.query(
        `UPDATE verified_skills
         SET is_active = false, updated_at = NOW()
         WHERE is_active = true
           AND expires_at < NOW()
         RETURNING id, user_id, skill_category_id`
      );

      if (result.rows.length > 0) {
        logger.info(`Expired ${result.rows.length} verified skill(s)`);
      }
    } catch (error) {
      logger.error('Error in verified skills expiration job:', error);
    }
  });

  logger.info('Assessment jobs scheduled (expiration: every 15min, skills: daily at 2am)');
};
