import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { env } from './config/environment';
import { pool } from './config/database';
import { logger } from './shared/utils/logger.util';
import { setupSocketHandlers } from './websocket/socket.handler';
import { startAllJobs } from './jobs';

const PORT = parseInt(env.PORT, 10);

const app = createApp();
const httpServer = createServer(app);

// Socket.io configuration
const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});

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
  process.exit(0);
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`
    ╔═══════════════════════════════════════╗
    ║   🚀 GYM-STUDY Backend Server        ║
    ║   Environment: ${env.NODE_ENV.padEnd(24)}║
    ║   Port: ${PORT.toString().padEnd(29)}║
    ║   URL: http://localhost:${PORT.toString().padEnd(14)}║
    ╚═══════════════════════════════════════╝
  `);

  // Start cron jobs after server is running
  startAllJobs();
});

export { io };
