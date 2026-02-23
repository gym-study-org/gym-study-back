import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { createApp } from './app';
import { env } from './config/environment';
import { pool } from './config/database';
import { redis } from './config/redis';
import { logger } from './shared/utils/logger.util';
import { setupSocketHandlers } from './websocket/socket.handler';
import { startAllJobs } from './jobs';
import { runMigrations } from './database/run-migrations';
import { startWorkers } from './shared/queue/workers';

const PORT = parseInt(env.PORT, 10);

const app = createApp();
const httpServer = createServer(app);

// Socket.io configuration with Redis adapter for horizontal scaling
const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});

// Setup Redis adapter for Socket.io (allows multiple server instances)
const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(redisUrl, { lazyConnect: true });
const subClient = new Redis(redisUrl, { lazyConnect: true });

// Setup WebSocket handlers with authentication
setupSocketHandlers(io);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  await pool.end();
  logger.info('Database pool closed');

  await redis.quit();
  await pubClient.quit();
  await subClient.quit();
  logger.info('Redis connections closed');

  process.exit(0);
});

// Run migrations then start server
runMigrations()
  .then(() => {
    httpServer.listen(PORT, '0.0.0.0', async () => {
      logger.info(`
    ╔═══════════════════════════════════════╗
    ║   GYM-STUDY Backend Server            ║
    ║   Environment: ${env.NODE_ENV.padEnd(24)}║
    ║   Port: ${PORT.toString().padEnd(29)}║
    ║   URL: http://localhost:${PORT.toString().padEnd(14)}║
    ╚═══════════════════════════════════════╝
      `);

      // Connect Redis (main cache connection)
      redis.connect().catch((err) => {
        logger.error('Failed to connect to Redis:', err);
      });

      // Connect Socket.io Redis adapter
      try {
        await pubClient.connect();
        await subClient.connect();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter connected (horizontal scaling enabled)');
      } catch (err) {
        logger.warn('Socket.io Redis adapter failed, using in-memory adapter:', err);
      }

      // Start BullMQ workers
      try {
        startWorkers();
      } catch (err) {
        logger.warn('BullMQ workers failed to start:', err);
      }

      // Start cron jobs after server is running
      startAllJobs();
    });
  })
  .catch((error) => {
    logger.error('Failed to run migrations, server not started:', error);
    process.exit(1);
  });

export { io };
