const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {
  searchUsers,
  getUserProfile,
  updateProfile,
  setup2FA,
  verify2FA,
  disable2FA,
  getDeviceHistory,
  removeDevice,
  registerFCMToken,
  removeFCMToken,
} = require('../controllers/userController');

router.get('/search', protect, searchUsers);
router.get('/devices', protect, getDeviceHistory);
router.delete('/devices/:id', protect, removeDevice);
router.get('/:id', protect, getUserProfile);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/fcm-token', protect, registerFCMToken);
router.delete('/fcm-token', protect, removeFCMToken);

module.exports = router;
