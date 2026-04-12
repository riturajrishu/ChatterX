const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const VerificationOTP = require('../models/VerificationOTP');
const authService = require('../services/authService');
const totpService = require('../services/totpService');
const emailService = require('../services/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// GET /api/auth/check-username/:username
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ available: false, message: 'Username too short' });
    }
    const user = await User.findOne({ username: username.trim() });
    return res.status(200).json({ available: !user });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ available: false, message: 'Server error' });
  }
};

// POST /api/auth/send-signup-otp
const requestSignupOTP = async (req, res, next) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: 'Email and username are required.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        message: existing.email === email ? 'Email already registered.' : 'Username already taken.',
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB, overriding any previous OTP for this email
    await VerificationOTP.deleteMany({ email });
    await VerificationOTP.create({ email, otp });

    // Send email
    await emailService.sendSignedUpOTP(email, otp);

    res.status(200).json({ message: 'OTP sent successfully to your email.' });
  } catch (error) {
    console.error('OTP Error:', error);
    res.status(500).json({ message: 'An error occurred while sending OTP' });
  }
};

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    if (!validateRequest(req, res)) return;

    const { username, email, password, phoneNumber, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required to complete registration.' });
    }

    const validOtp = await VerificationOTP.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        message: existing.email === email ? 'Email already registered.' : 'Username already taken.',
      });
    }

    const hashedPassword = await authService.hashPassword(password);
    const user = await User.create({ username, email, password: hashedPassword, phoneNumber });

    // OTP was successfully used, so purge it
    await VerificationOTP.deleteMany({ email });

    const token = authService.generateToken(user);
    authService.setTokenCookie(res, token);
    await authService.recordLogin(user._id, req);

    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        totpEnabled: user.totpEnabled,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    if (!validateRequest(req, res)) return;

    const { email, password, totpToken } = req.body;

    const user = await User.findOne({ email }).select('+password +totpSecret +tokenVersion +totpEnabled');
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await authService.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 2FA check
    if (user.totpEnabled) {
      if (!totpToken) {
        return res.status(200).json({ requires2FA: true, message: 'Please enter your 2FA code.' });
      }

      const decryptedSecret = totpService.decrypt(user.totpSecret);
      const isValid = totpService.verifyTOTP(decryptedSecret, totpToken);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid 2FA code.' });
      }
    }

    const token = authService.generateToken(user);
    authService.setTokenCookie(res, token);
    await authService.recordLogin(user._id, req);

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        totpEnabled: user.totpEnabled,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    authService.clearTokenCookie(res);

    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout-all
const logoutAll = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { tokenVersion: 1 },
      isOnline: false,
      lastSeen: new Date(),
    });

    authService.clearTokenCookie(res);
    res.json({ message: 'Logged out from all devices.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(200).json({ user: null });
    }
    const user = await User.findById(req.user._id).select('username email avatar totpEnabled isOnline lastSeen pinnedChats role');
    if (!user) {
      return res.status(200).json({ user: null });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/google
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ 
      $or: [
        { googleId },
        { email }
      ]
    }).select('+tokenVersion +totpEnabled');

    if (!user) {
      // Create new user if not exists
      // Generate a unique username if name is taken
      let username = name.replace(/\s+/g, '').toLowerCase().slice(0, 20);
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        username = `${username}${Math.floor(Math.random() * 1000)}`;
      }

      user = await User.create({
        username,
        email,
        googleId,
        avatar: picture,
      });
    } else if (!user.googleId) {
      // Link Google ID if user registered with email but without Google
      user.googleId = googleId;
      if (!user.avatar) user.avatar = picture;
      await user.save();
    }

    // 2FA check for Google Login (Optional, but safe to include if enabled)
    if (user.totpEnabled) {
      const { totpToken } = req.body;
      if (!totpToken) {
        return res.status(200).json({ requires2FA: true, message: 'Please enter your 2FA code.' });
      }

      const userWithSecret = await User.findById(user._id).select('+totpSecret');
      const decryptedSecret = totpService.decrypt(userWithSecret.totpSecret);
      const isValid = totpService.verifyTOTP(decryptedSecret, totpToken);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid 2FA code.' });
      }
    }

    const token = authService.generateToken(user);
    authService.setTokenCookie(res, token);
    await authService.recordLogin(user._id, req);

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        totpEnabled: user.totpEnabled,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Google authentication failed.' });
  }
};

// Validation rules
const signupValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('phoneNumber').optional().matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits.'),
  body('otp').notEmpty().withMessage('OTP is required for verification'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = {
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
};
