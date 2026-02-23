import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';
import { sendWeeklySummaryEmail, sendStreakWarningEmail } from '../shared/services/email.service';

export const startEmailDigestJob = () => {
  // Weekly summary: Every Monday at 8am
  cron.schedule('0 8 * * 1', async () => {
    logger.info('Running weekly email digest job...');

    try {
      const result = await pool.query(`
        SELECT
          u.id, u.email, u.username, u.current_streak,
          COALESCE(ws.hours, 0) as total_hours,
          COALESCE(ws.sessions, 0) as total_sessions,
          COALESCE(bs.badges, 0) as badges_earned
        FROM users u
        LEFT JOIN (
          SELECT user_id,
            ROUND(SUM(duration_minutes) / 60.0, 1) as hours,
            COUNT(*) as sessions
          FROM study_sessions
          WHERE started_at >= NOW() - INTERVAL '7 days'
          GROUP BY user_id
        ) ws ON ws.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as badges
          FROM user_badges
          WHERE earned_at >= NOW() - INTERVAL '7 days'
          GROUP BY user_id
        ) bs ON bs.user_id = u.id
        WHERE u.email IS NOT NULL
      `);

      let sent = 0;
      for (const user of result.rows) {
        // Only send to users who had some activity
        if (user.total_sessions > 0 || user.badges_earned > 0) {
          const success = await sendWeeklySummaryEmail(user.email, user.username, {
            total_hours: parseFloat(user.total_hours),
            total_sessions: parseInt(user.total_sessions, 10),
            badges_earned: parseInt(user.badges_earned, 10),
            streak: user.current_streak || 0,
            rank_change: 0,
          });
          if (success) sent++;
        }
      }

      logger.info(`Weekly digest sent to ${sent} users`);
    } catch (error) {
      logger.error('Error in weekly email digest job:', error);
    }
  });

  // Streak warning: Every day at 9pm for users who studied yesterday but not today
  cron.schedule('0 21 * * *', async () => {
    logger.info('Running streak warning email job...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await pool.query(`
        SELECT u.id, u.email, u.username, u.current_streak
        FROM users u
        WHERE u.current_streak > 0
          AND u.last_study_date < $1
          AND u.email IS NOT NULL
      `, [today]);

      let sent = 0;
      for (const user of result.rows) {
        if (user.current_streak >= 3) {
          const success = await sendStreakWarningEmail(
            user.email, user.username, user.current_streak
          );
          if (success) sent++;
        }
      }

      logger.info(`Streak warning emails sent to ${sent} users`);
    } catch (error) {
      logger.error('Error in streak warning job:', error);
    }
  });

  logger.info('Email digest jobs scheduled (weekly: Mon 8am, streak warning: daily 9pm)');
};
