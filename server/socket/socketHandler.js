const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const EVENTS = require('./socketEvents');
const chatService = require('../services/chatService');
const { sendPushNotification } = require('../services/fcmService');

// In-memory online users map: userId -> Set of socketIds
const onlineUsers = new Map();

const getSocketIdsByUserId = (userId) => {
  return onlineUsers.get(userId) || new Set();
};

const isUserOnline = (userId) => {
  const sockets = onlineUsers.get(userId);
  return sockets && sockets.size > 0;
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('token='))
          ?.split('=')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('+tokenVersion');

      if (!user) {
        return next(new Error('User not found'));
      }

      if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
        return next(new Error('Session invalidated'));
      }

      socket.userId = user._id.toString();
      socket.user = { _id: user._id, username: user.username, avatar: user.avatar };
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on(EVENTS.CONNECTION, (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update user status
    User.findByIdAndUpdate(userId, { isOnline: true }).catch(console.error);

    // Send initial list of online users to the newly connected user
    const currentOnlineUserIds = Array.from(onlineUsers.keys());
    socket.emit(EVENTS.ONLINE_USERS, currentOnlineUserIds);

    // Broadcast online status to others
    socket.broadcast.emit(EVENTS.USER_ONLINE, { userId });

    // Auto-join user's chat rooms
    const joinUserRooms = async () => {
      try {
        const chats = await Chat.find({ participants: userId }).select('_id').lean();
        chats.forEach((chat) => socket.join(chat._id.toString()));
      } catch (error) {
        console.error('Error joining rooms:', error.message);
      }
    };
    joinUserRooms();

    // Join a specific chat room
    socket.on(EVENTS.JOIN_CHAT, (chatId) => {
      socket.join(chatId);
    });

    // Leave a chat room
    socket.on(EVENTS.LEAVE_CHAT, (chatId) => {
      socket.leave(chatId);
    });

  // Send message
    socket.on(EVENTS.SEND_MESSAGE, async (data) => {
      try {
        const { chatId, text, fileUrl, replyTo, isAnonymous, tempId } = data;

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.map(String).includes(userId)) return;

        // DB Save
        const message = await Message.create({
          chatId,
          senderId: userId,
          text: text || '',
          fileUrl: fileUrl || '',
          replyTo: replyTo || null,
          isAnonymous: chat.isGroup ? !!isAnonymous : false,
          seenBy: [userId],
        });

        // Fast Populate & Emit
        // We populate manually or with a lean query as soon as save is done
        const populated = await Message.findById(message._id)
          .populate('senderId', 'username avatar')
          .populate('replyTo', 'text senderId')
          .lean();

        // INSTANT EMIT to room
        io.to(chatId).emit(EVENTS.RECEIVE_MESSAGE, {
          ...populated,
          chatId,
          tempId,
        });

        // BACKGROUND TASKS (Fire and forget, no 'await' here to block emitting)
        chatService.updateLastMessage(
          chatId,
          text || (fileUrl ? '📎 Attachment' : ''),
          userId
        ).catch(err => console.error('Error updating last message:', err));

        // Background Push Notifications
        chat.participants.forEach((participantId) => {
          const pid = participantId.toString();
          if (pid !== userId && !isUserOnline(pid)) {
            const senderName = isAnonymous && chat.isGroup ? 'Anonymous' : socket.user.username;
            sendPushNotification(pid, senderName, text || '📎 Attachment', {
              chatId,
              type: 'message',
            }).catch(err => console.error('Push notification error:', err));
          }
        });

        // Dynamically force online sockets to join (Async)
        chat.participants.forEach((participantId) => {
           const pid = participantId.toString();
           const userSockets = onlineUsers.get(pid);
           if (userSockets) {
             userSockets.forEach(sockId => {
               const sock = io.sockets.sockets.get(sockId);
               if (sock) sock.join(chatId);
             });
           }
        });

      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: 'Failed to send message.' });
      }
    });

    // Typing indicators
    socket.on(EVENTS.TYPING_START, ({ chatId }) => {
      socket.to(chatId).emit(EVENTS.TYPING_DISPLAY, {
        chatId,
        userId,
        username: socket.user.username,
        isTyping: true,
      });
    });

    socket.on(EVENTS.TYPING_STOP, ({ chatId }) => {
      socket.to(chatId).emit(EVENTS.TYPING_DISPLAY, {
        chatId,
        userId,
        username: socket.user.username,
        isTyping: false,
      });
    });

    // Message seen
    socket.on(EVENTS.MESSAGE_SEEN, async ({ messageId, chatId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { seenBy: userId },
        });

        socket.to(chatId).emit(EVENTS.MESSAGE_SEEN_UPDATE, {
          messageId,
          chatId,
          userId,
        });
      } catch (error) {
        console.error('Seen update error:', error.message);
      }
    });

    // === WebRTC Calling Signaling ===
    socket.on(EVENTS.CALL_USER, ({ userToCall, from, name, isVideo, channelName }) => {
      const targetSockets = getSocketIdsByUserId(userToCall);
      if (targetSockets.size === 0) {
        socket.emit(EVENTS.CALL_REJECTED, { reason: 'User is offline' });
        return;
      }
      targetSockets.forEach((sockId) => {
        io.to(sockId).emit(EVENTS.INCOMING_CALL, { from, name, isVideo, channelName });
      });
    });

    socket.on(EVENTS.ANSWER_CALL, ({ to }) => {
      const targetSockets = getSocketIdsByUserId(to);
      targetSockets.forEach((sockId) => {
        io.to(sockId).emit(EVENTS.CALL_ACCEPTED);
      });
    });

    socket.on(EVENTS.REJECT_CALL, ({ to }) => {
      const targetSockets = getSocketIdsByUserId(to);
      targetSockets.forEach((sockId) => {
        io.to(sockId).emit(EVENTS.CALL_REJECTED, { reason: 'Busy' });
      });
    });

    socket.on(EVENTS.END_CALL, ({ to }) => {
      const targetSockets = getSocketIdsByUserId(to);
      targetSockets.forEach((sockId) => {
        io.to(sockId).emit(EVENTS.CALL_ENDED);
      });
    });


    // Disconnect
    socket.on(EVENTS.DISCONNECT, async () => {
      console.log(`User disconnected: ${userId} (socket: ${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Only update offline status if no more sockets
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          }).catch(console.error);

          socket.broadcast.emit(EVENTS.USER_OFFLINE, {
            userId,
            lastSeen: new Date(),
          });
        }
      }
    });
  });

  return io;
};

module.exports = { initializeSocket, onlineUsers, isUserOnline };
