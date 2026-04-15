import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let messaging = null;

// Initialize only if config is present
const isConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId;
};

const initFirebase = () => {
  if (app) return;
  if (!isConfigured()) {
    console.warn('Firebase: Missing config — push notifications disabled.');
    return;
  }
  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Firebase init error:', error.message);
  }
};

/**
 * Request notification permission and get FCM token.
 * Returns the token string or null if denied/unavailable.
 */
export const requestNotificationPermission = async () => {
  initFirebase();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied.');
      return null;
    }

    // Register service worker for background notifications
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('Firebase: No VAPID key configured — cannot get FCM token.');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log('FCM token obtained.');
      return token;
    }

    console.warn('No FCM token received.');
    return null;
  } catch (error) {
    console.error('FCM token error:', error.message);
    return null;
  }
};

/**
 * Listen for foreground messages (when app is active/visible)
 */
export const onForegroundMessage = (callback) => {
  initFirebase();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { messaging };
