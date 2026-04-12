import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <App />
    <Toaster 
      position="top-right" 
      toastOptions={{
        className: 'bg-surface-800 text-text-primary border border-border text-sm',
        style: {
          background: 'var(--color-surface-800)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-float)',
        },
        success: {
          iconTheme: { primary: 'var(--color-success)', secondary: 'white' }
        },
        error: {
          iconTheme: { primary: 'var(--color-danger)', secondary: 'white' }
        }
      }} 
    />
  </GoogleOAuthProvider>
);
