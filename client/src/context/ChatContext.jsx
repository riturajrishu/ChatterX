import { create } from 'zustand';
import api from '../services/api';

export const useChatStore = create((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: {}, // maps chatId to array of messages
  hasMore: {}, // maps chatId to boolean
  onlineUsers: new Set(), // Set of online user IDs
  loading: false,
  error: null,

  setChats: (chats) => set({ chats }),
  setSelectedChat: (chat) => set({ selectedChat: chat }),
  
  setOnlineUsers: (userIds) => set({ onlineUsers: new Set(userIds) }),
  
  updateUserPresence: (userId, isOnline) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    if (isOnline) {
      newOnlineUsers.add(userId);
    } else {
      newOnlineUsers.delete(userId);
    }
    return { onlineUsers: newOnlineUsers };
  }),
  
  fetchChats: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/chats');
      set({ chats: data.chats, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchMessages: async (chatId, before = null) => {
    try {
      const { data } = await api.get(`/messages/${chatId}${before ? `?before=${before}` : ''}`);
      
      set((state) => {
        const existingMessages = state.messages[chatId] || [];
        // If 'before' is specified, prepend. Otherwise, replace (initial fetch).
        const newMessages = before 
          ? [...data.messages, ...existingMessages]
          : data.messages;

        return {
          messages: { ...state.messages, [chatId]: newMessages },
          hasMore: { ...state.hasMore, [chatId]: data.hasMore }
        };
      });
    } catch (error) {
      console.error("Fetch messages failed:", error);
    }
  },

  addMessage: (chatId, message) => {
    set((state) => {
      const currentMessages = state.messages[chatId] || [];
      
      let newMessages;
      if (message.tempId) {
        // Optimistic match: replace temp with real message
        const isAlreadyUpdated = currentMessages.some(m => m._id === message._id);
        if (isAlreadyUpdated) return state; // Avoid double-adding

        const tempIdx = currentMessages.findIndex(m => m._id === message.tempId);
        if (tempIdx > -1) {
          newMessages = [...currentMessages];
          newMessages[tempIdx] = { ...message, pending: false };
        } else {
          newMessages = [...currentMessages, { ...message, pending: false }];
        }
      } else {
        // Direct receive
        if (currentMessages.some(m => m._id === message._id)) return state;
        newMessages = [...currentMessages, message];
      }

      // Fast chat list update
      let chatExists = false;
      const updatedChats = state.chats.map(chat => {
        if (chat._id === chatId) {
          chatExists = true;
          return {
            ...chat,
            lastMessage: {
              text: message.text || '📎 Attachment',
              senderId: message.senderId._id || message.senderId,
              timestamp: message.timestamp || new Date().toISOString()
            },
            updatedAt: message.timestamp || new Date().toISOString()
          };
        }
        return chat;
      });

      // Non-blocking fetch for unknown chats
      if (!chatExists) {
        get().fetchChats();
      }

      // Reorder chats (O(n) but n is small enough for frontend)
      updatedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return {
        messages: { ...state.messages, [chatId]: newMessages },
        chats: updatedChats
      };
    });
  },

  removeMessage: (chatId, messageId) => {
    set((state) => {
      const currentMessages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: currentMessages.filter(m => m._id !== messageId && m.tempId !== messageId)
        }
      };
    });
  },

  updateMessageSeen: (chatId, messageId, userId) => {
    set((state) => {
      const currentMessages = state.messages[chatId] || [];
      const updatedMessages = currentMessages.map(m => {
        if (m._id === messageId) {
          const seenBy = m.seenBy || [];
          const deliveredTo = m.deliveredTo || [];
          if (!seenBy.includes(userId)) {
             return { 
               ...m, 
               seenBy: [...seenBy, userId],
               deliveredTo: deliveredTo.includes(userId) ? deliveredTo : [...deliveredTo, userId]
             };
          }
        }
        return m;
      });

      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    });
  },

  updateMessageDelivered: (chatId, messageId, userId) => {
    set((state) => {
      const currentMessages = state.messages[chatId] || [];
      const updatedMessages = currentMessages.map(m => {
        if (m._id === messageId) {
          const deliveredTo = m.deliveredTo || [];
          if (!deliveredTo.includes(userId)) {
            return { ...m, deliveredTo: [...deliveredTo, userId] };
          }
        }
        return m;
      });

      return {
        messages: { ...state.messages, [chatId]: updatedMessages }
      };
    });
  },

  createGroup: async (groupData) => {
    try {
      const { data } = await api.post('/groups', groupData);
      set(state => ({
        chats: [data.chat, ...state.chats],
        selectedChat: data.chat
      }));
      return data;
    } catch (error) {
      throw error;
    }
  },

  togglePin: async (chatId) => {
    try {
      const { data } = await api.put(`/chats/${chatId}/pin`);
      await get().fetchChats(); // Easiest way to properly resort
      return data;
    } catch (error) {
      throw error;
    }
  }
}));
