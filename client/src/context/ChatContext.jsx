import { create } from 'zustand';
import api from '../services/api';

export const useChatStore = create((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: {}, // maps chatId to array of messages
  hasMore: {}, // maps chatId to boolean
  loading: false,
  error: null,

  setChats: (chats) => set({ chats }),
  setSelectedChat: (chat) => set({ selectedChat: chat }),
  
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
        // If this message corresponds to an optimistic one
        const tempExists = currentMessages.some(m => m._id === message.tempId);
        if (tempExists) {
          newMessages = currentMessages.map(m => m._id === message.tempId ? { ...message, pending: false } : m);
        } else {
          // If we somehow didn't have the temp message, just append
          if (currentMessages.some(m => m._id === message._id)) return state;
          newMessages = [...currentMessages, message];
        }
      } else {
        // Deduplicate by _id
        if (currentMessages.some(m => m._id === message._id)) return state;
        newMessages = [...currentMessages, message];
      }

      // Also update lastMessage in the chat list
      const updatedChats = state.chats.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            lastMessage: {
              text: message.text || '📎 Attachment',
              senderId: message.senderId._id || message.senderId,
              timestamp: message.timestamp
            },
            updatedAt: message.timestamp
          };
        }
        return chat;
      });

      // Sort chats: pinned first, then by updatedAt
      updatedChats.sort((a, b) => {
        // Needs proper user pinned context to sort perfectly locally,
        // but for now just sort by date. The server does pinned sorting on refetch.
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      return {
        messages: { ...state.messages, [chatId]: newMessages },
        chats: updatedChats
      };
    });
  },

  updateMessageSeen: (chatId, messageId, userId) => {
    set((state) => {
      const currentMessages = state.messages[chatId] || [];
      const updatedMessages = currentMessages.map(m => {
        if (m._id === messageId) {
          const seenBy = m.seenBy || [];
          if (!seenBy.includes(userId)) {
             return { ...m, seenBy: [...seenBy, userId] };
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
