const { getFirebaseAdmin } = require('../config/firebase');
const User = require('../models/User');

const sendPushNotification = async (userId, title, body, data = {}) => {
  const admin = getFirebaseAdmin();
  if (!admin) return; // Firebase not configured — skip silently

  try {
    const user = await User.findById(userId).select('+fcmTokens');
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

    const messaging = admin.messaging();
    const invalidTokens = [];

    const sendPromises = user.fcmTokens.map(async (token) => {
      try {
        await messaging.send({
          token,
          notification: { title, body },
          data: { ...data, click_action: 'OPEN_CHAT' },
          webpush: {
            headers: { Urgency: 'high' },
            notification: { icon: '/icon-192.png' },
          },
        });
      } catch (error) {
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(token);
        }
      }
    });

    await Promise.all(sendPromises);

    // Cleanup invalid tokens
    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: { $in: invalidTokens } },
      });
    }
  } catch (error) {
    console.error('FCM push error:', error.message);
  }
};

const sendGroupNotification = async (memberIds, senderId, title, body, data = {}) => {
  const recipients = memberIds.filter((id) => id.toString() !== senderId.toString());
  await Promise.all(recipients.map((id) => sendPushNotification(id, title, body, data)));
};

module.exports = { sendPushNotification, sendGroupNotification };
