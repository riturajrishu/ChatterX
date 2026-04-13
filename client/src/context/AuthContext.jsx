import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuth = create(
  persist(
    (set, get) => ({
      user: null,
      isCheckingAuth: true,
      loading: false,
      error: null,

      setUser: (user) => set({ user }),
      
      checkAuth: async () => {
        set({ isCheckingAuth: true, error: null });
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, isCheckingAuth: false });
        } catch (error) {
          set({ user: null, isCheckingAuth: false });
        }
      },

      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', credentials);
          
          if (data.requires2FA) {
            set({ loading: false });
            return { requires2FA: true };
          }
          
          set({ user: data.user, loading: false });
          return { success: true };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Login failed',
            loading: false 
          });
          throw error;
        }
      },

      loginWithGoogle: async (credential, totpToken) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/auth/google', { credential, totpToken });
          
          if (data.requires2FA) {
            set({ loading: false });
            return { requires2FA: true };
          }
          
          set({ user: data.user, loading: false });
          return { success: true };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Google login failed',
            loading: false 
          });
          throw error;
        }
      },

      sendSignupOTP: async (email, username) => {
        set({ loading: true, error: null });
        try {
          await api.post('/auth/send-signup-otp', { email, username });
          set({ loading: false });
          return { success: true };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Failed to send OTP',
            loading: false 
          });
          throw error;
        }
      },

      signup: async (userData) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/auth/signup', userData);
          set({ user: data.user, loading: false });
          return { success: true };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Signup failed',
            loading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error("Logout error", error);
        } finally {
          set({ user: null });
        }
      },

      logoutAll: async () => {
        try {
          await api.post('/auth/logout-all');
        } catch (error) {
          console.error("Logout all error", error);
        } finally {
          set({ user: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
