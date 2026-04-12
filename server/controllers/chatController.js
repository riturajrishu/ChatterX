const Chat = require('../models/Chat');
const User = require('../models/User');
const chatService = require('../services/chatService');

// POST /api/chats
const createOrGetChat = async (req, res, next) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required.' });
    }

    const otherUser = await User.findById(participantId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const chat = await chatService.findOrCreateDMChat(req.user._id, participantId);
    const populated = await Chat.findById(chat._id)
      .populate('participants', 'username avatar isOnline lastSeen')
      .lean();

    res.status(201).json({ chat: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/chats
const getChats = async (req, res, next) => {
  try {
    const chats = await chatService.getUserChats(req.user._id);
    res.json({ chats });
  } catch (error) {
    next(error);
  }
};

// PUT /api/chats/:id/pin
const togglePinChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const user = await User.findById(req.user._id);

    const isPinned = user.pinnedChats.includes(chatId);
    if (isPinned) {
      user.pinnedChats.pull(chatId);
    } else {
      if (user.pinnedChats.length >= 5) {
        return res.status(400).json({ message: 'Maximum 5 pinned chats allowed.' });
      }
      user.pinnedChats.push(chatId);
    }

    await user.save();
    res.json({ pinned: !isPinned, pinnedChats: user.pinnedChats });
  } catch (error) {
    next(error);
  }
};

// GET /api/chats/search?q=
const searchChats = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }
    const users = await chatService.searchChats(req.user._id, q);
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrGetChat, getChats, togglePinChat, searchChats };
