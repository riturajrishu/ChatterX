const { RtcTokenBuilder, RtcRole } = require('agora-token');

/**
 * Generate Agora RTC Token
 * @route GET /api/call/token
 * @access Private
 */
const getCallToken = async (req, res) => {
  try {
    const { channelName, role } = req.query;

    if (!channelName) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res.status(500).json({ message: 'Agora credentials are not configured on server' });
    }

    // Role: 'publisher' or 'subscriber'
    let rtcRole = RtcRole.SUBSCRIBER;
    if (role === 'publisher') {
      rtcRole = RtcRole.PUBLISHER;
    }

    // Token expires in 2 hours
    const expirationTimeInSeconds = 3600 * 2;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use UID 0 for any user
    const uid = 0;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs // Both tokens and privilege expire at the same time
    );

    res.json({ token, appId, uid, channelName });
  } catch (error) {
    console.error('Agora Token Error:', error);
    res.status(500).json({ message: 'Failed to generate Agora token' });
  }
};

module.exports = {
  getCallToken,
};
