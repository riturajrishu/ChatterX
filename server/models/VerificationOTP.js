const mongoose = require('mongoose');

const verificationOTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // Document expires 5 minutes after creation
    },
  }
);

module.exports = mongoose.model('VerificationOTP', verificationOTPSchema);
