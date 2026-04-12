const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const LoginHistory = require('../models/LoginHistory');
const authService = require('../services/authService');

// GET /api/admin/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      onlineUsers,
      newUsersWeek,
      newUsersToday,
      totalMessages,
      totalChats,
      messagesToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      Message.countDocuments(),
      Chat.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
    ]);

    res.json({
      stats: {
        totalUsers,
        onlineUsers,
        newUsersWeek,
        newUsersToday,
        totalMessages,
        totalChats,
        messagesToday,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users?page=1&limit=20&search=&sort=createdAt&order=desc
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email avatar isOnline lastSeen role phoneNumber createdAt')
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username email avatar isOnline lastSeen role phoneNumber totpEnabled createdAt updatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get additional stats
    const [messageCount, chatCount, loginHistory] = await Promise.all([
      Message.countDocuments({ sender: user._id }),
      Chat.countDocuments({ participants: user._id }),
      LoginHistory.find({ userId: user._id })
        .sort({ loginAt: -1 })
        .limit(10)
        .lean(),
    ]);

    res.json({
      user: {
        ...user,
        messageCount,
        chatCount,
        loginHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent deleting other admins or the owner
    if (user.role === 'owner') {
      return res.status(403).json({ message: 'The owner account cannot be deleted.' });
    }
    if (user.role === 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only the owner can delete another admin account.' });
    }

    // Delete user's messages
    await Message.deleteMany({ sender: userId });

    // Remove user from chat participants & delete empty chats
    const userChats = await Chat.find({ participants: userId });
    for (const chat of userChats) {
      chat.participants = chat.participants.filter(p => p.toString() !== userId);
      if (chat.participants.length < 2) {
        await Message.deleteMany({ chat: chat._id });
        await Chat.findByIdAndDelete(chat._id);
      } else {
        await chat.save();
      }
    }

    // Delete login history
    await LoginHistory.deleteMany({ userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: `User "${user.username}" has been permanently deleted.` });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/users/:id/reset-password
const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'owner' && req.user._id.toString() !== user._id.toString()) {
       return res.status(403).json({ message: 'Cannot reset password for the owner.' });
    }
    if (user.role === 'admin' && req.user.role !== 'owner' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can reset password for another admin.' });
    }

    const hashedPassword = await authService.hashPassword(newPassword);
    await User.findByIdAndUpdate(req.params.id, {
      password: hashedPassword,
      $inc: { tokenVersion: 1 }, // Invalidate all existing sessions
    });

    res.json({ message: `Password reset successfully for "${user.username}". All their sessions have been invalidated.` });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin".' });
    }

    const userId = req.params.id;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'owner') {
      return res.status(403).json({ message: 'The owner role cannot be modified.' });
    }
    if (user.role === 'admin' && req.user.role !== 'owner') {
       return res.status(403).json({ message: 'Only the owner can demote an admin.' });
    }

    user.role = role;
    await user.save();

    res.json({ message: `User "${user.username}" role updated to "${role}".` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  deleteUser,
  resetUserPassword,
  updateUserRole,
};
