import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../shared/utils/logger.util';

export const startStreakJob = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running streak reset job...');

    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reset streak for users who didn't study yesterday
      // Only reset if last_study_date is before yesterday
      const result = await pool.query(
        `UPDATE users
         SET current_streak = 0
         WHERE last_study_date IS NOT NULL
         AND last_study_date < $1
         AND current_streak > 0
         RETURNING id, username, current_streak`,
        [yesterday]
      );

      if (result.rows.length > 0) {
        logger.info(
          `Streak reset for ${result.rows.length} users: ${result.rows
            .map((u) => u.username)
            .join(', ')}`
        );
      } else {
        logger.info('No streaks needed to be reset');
      }

      // Update streaks for users who studied yesterday (increment if they studied today too)
      // This is handled by the study-sessions service when creating a session

      logger.info('Streak reset job completed');
    } catch (error) {
      logger.error('Error in streak reset job:', error);
    }
  });

  logger.info('Streak reset job scheduled (runs daily at midnight)');
};

// Helper function to update streak when user completes a study session
export const updateUserStreak = async (userId: string): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get user's last study date
    const userResult = await pool.query(
      `SELECT last_study_date, current_streak, longest_streak FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return;
    }

    const user = userResult.rows[0];
    const lastStudyDate = user.last_study_date
      ? new Date(user.last_study_date)
      : null;

    let newStreak = user.current_streak || 0;

    if (lastStudyDate) {
      lastStudyDate.setHours(0, 0, 0, 0);

      // If already studied today, don't update
      if (lastStudyDate.getTime() === today.getTime()) {
        return;
      }

      // If studied yesterday, increment streak
      if (lastStudyDate.getTime() === yesterday.getTime()) {
        newStreak = (user.current_streak || 0) + 1;
      } else {
        // Streak broken, start fresh
        newStreak = 1;
      }
    } else {
      // First study session ever
      newStreak = 1;
    }

    // Update user's streak and last_study_date
    const newLongestStreak = Math.max(newStreak, user.longest_streak || 0);

    await pool.query(
      `UPDATE users
       SET current_streak = $1,
           longest_streak = $2,
           last_study_date = $3
       WHERE id = $4`,
      [newStreak, newLongestStreak, today, userId]
    );

    logger.debug(
      `Updated streak for user ${userId}: current=${newStreak}, longest=${newLongestStreak}`
    );
  } catch (error) {
    logger.error('Error updating user streak:', error);
  }
};
