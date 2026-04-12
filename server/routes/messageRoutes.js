const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getMessages,
  sendMessage,
  markSeen,
  markAllSeen,
  deleteMessage,
} = require('../controllers/messageController');

router.get('/:chatId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:id/seen', protect, markSeen);
router.put('/:chatId/seen-all', protect, markAllSeen);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
