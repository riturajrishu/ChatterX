const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const {
  checkUsername,
  requestSignupOTP,
  signup,
  login,
  googleLogin,
  logout,
  logoutAll,
  getMe,
  signupValidation,
  loginValidation,
} = require('../controllers/authController');

router.get('/check-username/:username', checkUsername);
router.post('/send-signup-otp', authLimiter, requestSignupOTP);
router.post('/signup', authLimiter, signupValidation, signup);
router.post('/login', authLimiter, loginValidation, login);
router.post('/google', authLimiter, googleLogin);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', optionalAuth, getMe);

module.exports = router;
