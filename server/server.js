require('dotenv').config(); // Reloaded to pick up new tokens

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\n🔴 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled rejections - LOG only, do NOT crash the server.
// A single DB timeout or failed push notification should not kill the entire process.
process.on('unhandledRejection', (err) => {
  console.error('\n⚠️ UNHANDLED REJECTION (server continues running):');
  console.error(err);
});

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const { initializeSocket } = require('./socket/socketHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const callRoutes = require('./routes/callRoutes');

const app = express();
const server = http.createServer(app);

// Trust proxy for Render deployment (required for express-rate-limit)
app.set('trust proxy', 1);

// ── Security & Parsing Middleware ──────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiter
app.use('/api', globalLimiter);

// Debug Sockets
app.get('/api/debug-sockets', (req, res) => {
  const { onlineUsers } = require('./socket/socketHandler');
  const io = req.app.get('io');
  
  const connectedSockets = io ? Array.from(io.sockets.sockets.keys()) : [];
  const mapData = {};
  for (const [key, value] of onlineUsers.entries()) {
    mapData[key] = Array.from(value);
  }

  res.json({
    onlineUsersMap: mapData,
    connectedSockets,
    onlineUsersCount: onlineUsers.size,
    socketsCount: connectedSockets.length
  });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/call', callRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    initializeFirebase();

    const io = initializeSocket(server);
    app.set('io', io);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Whispr server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Client URL:  ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
