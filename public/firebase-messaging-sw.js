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
  
  const notificationTitle = payload.notification.title || "New Notification";
  const notificationOptions = {
    body: payload.notification.body || "You have a new message from Kishan.",
    icon: payload.notification.icon || '/logo.png',
    badge: '/logo.png', // Small icon for status bar
    tag: payload.data?.notificationId || 'kishan-notification', // Unique tag to collapse notifications
    data: {
      url: payload.data?.url || '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
