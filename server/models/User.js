const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    phoneNumber: {
      type: String,
      maxlength: 10,
      validate: {
        validator: function(v) {
          return !v || /^\d{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid 10-digit phone number!`
      }
    },
    avatar: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      sparse: true,
    },
    totpSecret: {
      type: String,
      select: false,
    },
    totpEnabled: {
      type: Boolean,
      default: false,
    },
    fcmTokens: {
      type: [String],
      default: [],
      select: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    pinnedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
      },
    ],
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'owner'],
      default: 'user',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.totpSecret;
        delete ret.fcmTokens;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre('save', function(next) {
  if (!this.fullName || this.fullName.trim() === '') {
    this.fullName = this.username;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
