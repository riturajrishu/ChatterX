const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

const findOrCreateDMChat = async (userId, otherUserId) => {
  let chat = await Chat.findOne({
    isGroup: false,
    participants: { $all: [userId, otherUserId], $size: 2 },
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [userId, otherUserId],
      isGroup: false,
    });
  }

  return chat;
};

const getUserChats = async (userId) => {
  const user = await User.findById(userId).select('pinnedChats');
  const pinnedIds = user?.pinnedChats?.map((id) => id.toString()) || [];

  const chats = await Chat.find({ participants: userId })
    .populate('participants', 'username avatar isOnline lastSeen')
    .populate('groupId', 'name avatar admin members')
    .sort({ updatedAt: -1 })
    .lean();

  // Sort: pinned first, then by updatedAt
  return chats.sort((a, b) => {
    const aPin = pinnedIds.includes(a._id.toString()) ? 1 : 0;
    const bPin = pinnedIds.includes(b._id.toString()) ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
};

const getMessages = async (chatId, before, limit = 50) => {
  const query = { chatId };
  if (before) {
    query.timestamp = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('senderId', 'username avatar')
    .populate('replyTo', 'text senderId')
    .lean();

  return messages.reverse();
};

const updateLastMessage = async (chatId, text, senderId) => {
  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: { text, senderId, timestamp: new Date() },
    updatedAt: new Date(),
  });
};

const searchChats = async (userId, query) => {
  const users = await User.find({
    username: { $regex: query, $options: 'i' },
    _id: { $ne: userId },
  })
    .select('username avatar isOnline')
    .limit(20)
    .lean();

  return users;
};

module.exports = {
  findOrCreateDMChat,
  getUserChats,
  getMessages,
  updateLastMessage,
  searchChats,
};
