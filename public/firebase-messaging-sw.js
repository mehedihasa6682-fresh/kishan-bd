// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDLX2W-ZNVcZWRTHKejxhDqcV_VtwumNOs",
  authDomain: "kishan-bd-6c855.firebaseapp.com",
  projectId: "kishan-bd-6c855",
  storageBucket: "kishan-bd-6c855.firebasestorage.app",
  messagingSenderId: "159955601488",
  appId: "1:159955601488:web:25b8e7579a4736d3aca955"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || "সদাই ভাই";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: payload.notification?.icon || '/logo.png',
    badge: '/logo.png',
    tag: payload.data?.notificationId || 'sodaibhai-notification',
    data: {
      url: payload.data?.url || '/'
    },
    // Native mobile enhancements
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'open', title: 'Open View' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked: ', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If we find an existing tab with the same URL, focus it
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// PWA Install/Activate for compliance
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Cache strategy for assets (Minimal for now)
self.addEventListener('fetch', (event) => {
  // Can add caching logic here if needed
});

// Handle generic push events (fallback for non-FCM push)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      // Only show if it's not handled by FCM already (redundancy check)
      if (data.notification && !data.from) {
        const title = data.notification.title || 'Notification';
        const options = {
          body: data.notification.body,
          icon: data.notification.icon || '/logo.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200],
          data: {
            url: data.data?.url || '/'
          }
        };
        event.waitUntil(self.registration.showNotification(title, options));
      }
    } catch (e) {
      console.error('Push data error:', e);
    }
  }
});
