const SOCKET_EVENTS = {
  // Client -> Server
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MESSAGE_SEEN: 'message_seen',
  MESSAGE_DELIVERED: 'message_delivered',
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',

  // Server -> Client
  RECEIVE_MESSAGE: 'receive_message',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING_DISPLAY: 'typing_display',
  MESSAGE_SEEN_UPDATE: 'message_seen_update',
  MESSAGE_DELIVERED_UPDATE: 'message_delivered_update',
  MESSAGE_DELETED: 'message_deleted',
  ONLINE_USERS: 'online_users',

  // WebRTC Signaling Client -> Server
  CALL_USER: 'call_user',
  ANSWER_CALL: 'answer_call',
  REJECT_CALL: 'reject_call',
  END_CALL: 'end_call',
  ICE_CANDIDATE: 'ice_candidate',

  // WebRTC Signaling Server -> Client
  INCOMING_CALL: 'incoming_call',
  CALL_ACCEPTED: 'call_accepted',
  CALL_REJECTED: 'call_rejected',
  CALL_ENDED: 'call_ended',

  // System
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
};

module.exports = SOCKET_EVENTS;
