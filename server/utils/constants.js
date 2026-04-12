module.exports = {
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
  MAX_PINNED_CHATS: 5,
  MESSAGES_PER_PAGE: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};
