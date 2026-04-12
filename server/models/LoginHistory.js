const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  device: {
    type: String,
    default: 'Unknown',
  },
  browser: {
    type: String,
    default: 'Unknown',
  },
  ip: {
    type: String,
    default: '',
  },
  location: {
    type: String,
    default: '',
  },
  loginAt: {
    type: Date,
    default: Date.now,
  },
});

loginHistorySchema.index({ userId: 1 });
loginHistorySchema.index({ loginAt: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
