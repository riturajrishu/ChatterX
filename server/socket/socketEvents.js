const SOCKET_EVENTS = {
  // Client -> Server
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MESSAGE_SEEN: 'message_seen',
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',

  // Server -> Client
  RECEIVE_MESSAGE: 'receive_message',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING_DISPLAY: 'typing_display',
  MESSAGE_SEEN_UPDATE: 'message_seen_update',
  MESSAGE_DELETED: 'message_deleted',

  // System
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
};

module.exports = SOCKET_EVENTS;
