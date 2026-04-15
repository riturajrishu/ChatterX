/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background push notifications.
// This file MUST be in /public so it's served from the root.

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// Firebase config is injected at runtime via the `messagingSenderId` in getToken().
// The SW only needs the minimal config to handle push events.
firebase.initializeApp({
  apiKey: 'placeholder',
  projectId: 'placeholder',
  messagingSenderId: 'placeholder',
  appId: 'placeholder',
});

const messaging = firebase.messaging();

// Handle background messages (when browser tab is not focused / minimized)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  const notificationTitle = title || 'New Message';
  const notificationOptions = {
    body: body || 'You have a new message',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.chatId || 'message', // Group notifications by chat
    renotify: true,
    data: {
      chatId: data.chatId,
      type: data.type || 'message',
      url: '/',
    },
    actions: [
      { action: 'open', title: 'Open Chat' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app / focus existing tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
