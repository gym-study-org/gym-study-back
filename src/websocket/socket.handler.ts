import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from '../shared/utils/logger.util';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

// Store connected users: Map<userId, socketId>
const connectedUsers = new Map<string, string>();

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
      };

      socket.userId = decoded.id;
      socket.userName = decoded.name;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const userName = socket.userName || 'Unknown';

    logger.info(`🔌 Socket connected: ${socket.id} (User: ${userName})`);

    // Store user connection
    connectedUsers.set(userId, socket.id);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Notify friends that user is online
    socket.broadcast.emit('user:online', { userId, userName });

    // Handle joining challenge rooms
    socket.on('challenge:join', (challengeId: string) => {
      socket.join(`challenge:${challengeId}`);
      logger.debug(`User ${userName} joined challenge room: ${challengeId}`);
    });

    // Handle leaving challenge rooms
    socket.on('challenge:leave', (challengeId: string) => {
      socket.leave(`challenge:${challengeId}`);
      logger.debug(`User ${userName} left challenge room: ${challengeId}`);
    });

    // Handle study session updates (real-time progress)
    socket.on('study:progress', (data: { sessionId: string; duration: number }) => {
      // Broadcast to friends that user is studying
      socket.broadcast.emit('friend:studying', {
        userId,
        userName,
        duration: data.duration,
      });
    });

    // Handle joining group rooms
    socket.on('group:join', (groupId: string) => {
      socket.join(`group:${groupId}`);
      logger.debug(`User ${userName} joined group room: ${groupId}`);
    });

    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      logger.debug(`User ${userName} left group room: ${groupId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      socket.broadcast.emit('user:offline', { userId, userName });
      logger.info(`🔌 Socket disconnected: ${socket.id} (User: ${userName})`);
    });
  });
};

// Helper functions to emit events from anywhere in the app

export const emitToUser = (io: Server, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToChallenge = (io: Server, challengeId: string, event: string, data: any) => {
  io.to(`challenge:${challengeId}`).emit(event, data);
};

export const emitFriendRequest = (io: Server, toUserId: string, fromUser: { id: string; name: string }) => {
  io.to(`user:${toUserId}`).emit('friendship:request', {
    from: fromUser,
    timestamp: new Date().toISOString(),
  });
};

export const emitFriendAccepted = (io: Server, toUserId: string, friend: { id: string; name: string }) => {
  io.to(`user:${toUserId}`).emit('friendship:accepted', {
    friend,
    timestamp: new Date().toISOString(),
  });
};

export const emitChallengeInvite = (
  io: Server,
  toUserId: string,
  challenge: { id: string; title: string; creatorName: string }
) => {
  io.to(`user:${toUserId}`).emit('challenge:invite', {
    challenge,
    timestamp: new Date().toISOString(),
  });
};

export const emitChallengeUpdate = (
  io: Server,
  challengeId: string,
  update: { userId: string; userName: string; progress: number }
) => {
  io.to(`challenge:${challengeId}`).emit('challenge:progress', {
    ...update,
    timestamp: new Date().toISOString(),
  });
};

export const emitRankingUpdate = (io: Server, data: { userId: string; newPosition: number; change: number }) => {
  io.emit('ranking:update', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Feed events

export const emitNewFeedPost = (
  io: Server,
  authorId: string,
  post: { id: string; content: string; post_type: string; author_username: string }
) => {
  // Emit to the author's room so their friends can see
  io.to(`user:${authorId}`).emit('feed:new_post', {
    post,
    timestamp: new Date().toISOString(),
  });
};

export const emitPostLiked = (
  io: Server,
  authorUserId: string,
  data: { postId: string; likedBy: string; likedByName: string }
) => {
  io.to(`user:${authorUserId}`).emit('feed:post_liked', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const emitPostCommented = (
  io: Server,
  authorUserId: string,
  data: { postId: string; commentBy: string; commentByName: string; preview: string }
) => {
  io.to(`user:${authorUserId}`).emit('feed:post_commented', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Group events

export const emitToGroup = (io: Server, groupId: string, event: string, data: any) => {
  io.to(`group:${groupId}`).emit(event, data);
};

export const emitGroupMessage = (
  io: Server,
  groupId: string,
  message: { id: string; user_id: string; content: string; message_type: string; author_username: string; created_at: string }
) => {
  io.to(`group:${groupId}`).emit('group:message', {
    message,
    timestamp: new Date().toISOString(),
  });
};

export const getConnectedUsers = () => connectedUsers;
export const isUserOnline = (userId: string) => connectedUsers.has(userId);
