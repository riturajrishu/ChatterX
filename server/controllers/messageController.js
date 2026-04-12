const Message = require('../models/Message');
const Chat = require('../models/Chat');
const chatService = require('../services/chatService');

// GET /api/messages/:chatId
const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { before } = req.query;

    // Verify user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const messages = await chatService.getMessages(chatId, before, 50);

    // Filter out messages deleted for this user
    const filtered = messages
      .filter((m) => !m.deletedFor?.includes(req.user._id))
      .map((m) => {
        if (m.isAnonymous && m.senderId._id.toString() !== req.user._id.toString()) {
          return { ...m, senderId: { _id: null, username: 'Anonymous', avatar: '' } };
        }
        return m;
      });

    res.json({ messages: filtered, hasMore: messages.length === 50 });
  } catch (error) {
    next(error);
  }
};

// POST /api/messages
const sendMessage = async (req, res, next) => {
  try {
    const { chatId, text, fileUrl, replyTo, isAnonymous } = req.body;

    if (!chatId || (!text && !fileUrl)) {
      return res.status(400).json({ message: 'Chat ID and message content required.' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Only allow anonymous in group chats
    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      text: text || '',
      fileUrl: fileUrl || '',
      replyTo: replyTo || null,
      isAnonymous: chat.isGroup ? !!isAnonymous : false,
      seenBy: [req.user._id],
    });

    await chatService.updateLastMessage(
      chatId,
      text || (fileUrl ? '📎 Attachment' : ''),
      req.user._id
    );

    const populated = await Message.findById(message._id)
      .populate('senderId', 'username avatar')
      .populate('replyTo', 'text senderId')
      .lean();

    res.status(201).json({ message: populated });
  } catch (error) {
    next(error);
  }
};

// PUT /api/messages/:id/seen
const markSeen = async (req, res, next) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, {
      $addToSet: { seenBy: req.user._id },
    });
    res.json({ message: 'Marked as seen.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/messages/:chatId/seen-all
const markAllSeen = async (req, res, next) => {
  try {
    await Message.updateMany(
      {
        chatId: req.params.chatId,
        senderId: { $ne: req.user._id },
        seenBy: { $ne: req.user._id },
      },
      { $addToSet: { seenBy: req.user._id } }
    );
    res.json({ message: 'All messages marked as seen.' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/messages/:id
const deleteMessage = async (req, res, next) => {
  try {
    const { type } = req.query; // 'me' or 'everyone'
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (type === 'everyone') {
       if (message.senderId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Cannot delete others message for everyone.' });
       }
       await Message.findByIdAndDelete(req.params.id);
       
       // Emit socket event to remove it from all clients
       const io = req.app.get('io');
       if (io) {
         io.to(message.chatId.toString()).emit('message_deleted', { 
           messageId: message._id, 
           chatId: message.chatId 
         });
       }
       return res.json({ message: 'Message deleted for everyone.' });
    } else {
       // Delete for sender only
       await Message.findByIdAndUpdate(req.params.id, {
         $addToSet: { deletedFor: req.user._id },
       });
       return res.json({ message: 'Message deleted for you.' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getMessages, sendMessage, markSeen, markAllSeen, deleteMessage };
