const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const totpService = require('../services/totpService');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// GET /api/users/search?q=
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id },
    })
      .select('username avatar isOnline lastSeen')
      .limit(20)
      .lean();

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('username avatar isOnline lastSeen');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { username } = req.body;
    const updates = {};

    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(409).json({ message: 'Username already taken.' });
      }
      updates.username = username;
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'whispr/avatars',
        transformation: [{ width: 200, height: 200, crop: 'fill' }],
      });
      updates.avatar = result.url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select(
      'username email avatar totpEnabled'
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/2fa/setup
const setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { secret, otpauthUrl } = totpService.generateTOTPSecret(user.email);
    const qrCode = await totpService.generateQRCode(otpauthUrl);

    // Store encrypted secret temporarily (not enabled yet)
    const encrypted = totpService.encrypt(secret);
    await User.findByIdAndUpdate(req.user._id, { totpSecret: encrypted });

    res.json({ qrCode, secret }); // secret shown once for manual entry
  } catch (error) {
    next(error);
  }
};

// POST /api/users/2fa/verify
const verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: '2FA code is required.' });
    }

    const user = await User.findById(req.user._id).select('+totpSecret');
    if (!user.totpSecret) {
      return res.status(400).json({ message: 'Please set up 2FA first.' });
    }

    const decrypted = totpService.decrypt(user.totpSecret);
    const isValid = totpService.verifyTOTP(decrypted, token);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid 2FA code. Try again.' });
    }

    await User.findByIdAndUpdate(req.user._id, { totpEnabled: true });
    res.json({ message: '2FA enabled successfully.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/2fa/disable
const disable2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select('+totpSecret');

    if (user.totpEnabled && user.totpSecret) {
      const decrypted = totpService.decrypt(user.totpSecret);
      const isValid = totpService.verifyTOTP(decrypted, token);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid 2FA code.' });
      }
    }

    await User.findByIdAndUpdate(req.user._id, {
      totpEnabled: false,
      totpSecret: null,
    });

    res.json({ message: '2FA disabled.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/devices
const getDeviceHistory = async (req, res, next) => {
  try {
    const history = await LoginHistory.find({ userId: req.user._id })
      .sort({ loginAt: -1 })
      .limit(50)
      .lean();

    res.json({ devices: history });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/devices/:id
const removeDevice = async (req, res, next) => {
  try {
    await LoginHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    res.json({ message: 'Device removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
  updateProfile,
  setup2FA,
  verify2FA,
  disable2FA,
  getDeviceHistory,
  removeDevice,
};
