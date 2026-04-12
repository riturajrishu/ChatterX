const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { createOrGetChat, getChats, togglePinChat, searchChats } = require('../controllers/chatController');

router.post('/', protect, createOrGetChat);
router.get('/', protect, getChats);
router.put('/:id/pin', protect, togglePinChat);
router.get('/search', protect, searchChats);

module.exports = router;
