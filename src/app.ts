import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/environment';
import { errorHandler } from './shared/middlewares/error-handler.middleware';
import { logger } from './shared/utils/logger.util';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import studySessionsRoutes from './modules/study-sessions/study-sessions.routes';
import certificationsRoutes from './modules/certifications/certifications.routes';
import goalsRoutes from './modules/goals/goals.routes';
import friendshipsRoutes from './modules/friendships/friendships.routes';
import rankingRoutes from './modules/ranking/ranking.routes';
import challengesRoutes from './modules/challenges/challenges.routes';
import achievementsRoutes from './modules/achievements/achievements.routes';
import badgesRoutes from './modules/badges/badges.routes';
import feedRoutes from './modules/feed/feed.routes';
import assessmentsRoutes from './modules/assessments/assessments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import githubRoutes from './modules/github/github.routes';
import publicRoutes from './modules/public/public.routes';
import xpRoutes from './modules/xp/xp.routes';
import leaguesRoutes from './modules/leagues/leagues.routes';
import streakRoutes from './modules/streak/streak.routes';
import questsRoutes from './modules/quests/quests.routes';
import gemsRoutes from './modules/gems/gems.routes';
import groupsRoutes from './modules/groups/groups.routes';
import storiesRoutes from './modules/stories/stories.routes';
import recommendationsRoutes from './modules/recommendations/recommendations.routes';
import articlesRoutes from './modules/articles/articles.routes';
import uploadRoutes from './modules/upload/upload.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression middleware
  app.use(compression());

  // Logging middleware
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/study-sessions', studySessionsRoutes);
  app.use('/api/certifications', certificationsRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/friendships', friendshipsRoutes);
  app.use('/api/ranking', rankingRoutes);
  app.use('/api/challenges', challengesRoutes);
  app.use('/api/achievements', achievementsRoutes);
  app.use('/api/badges', badgesRoutes);
  app.use('/api/feed', feedRoutes);
  app.use('/api/assessments', assessmentsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/xp', xpRoutes);
  app.use('/api/leagues', leaguesRoutes);
  app.use('/api/streak', streakRoutes);
  app.use('/api/quests', questsRoutes);
  app.use('/api/gems', gemsRoutes);
  app.use('/api/groups', groupsRoutes);
  app.use('/api/stories', storiesRoutes);
  app.use('/api/recommendations', recommendationsRoutes);
  app.use('/api/articles', articlesRoutes);
  app.use('/api/upload', uploadRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  logger.info('✅ Express app configured');

  return app;
};
