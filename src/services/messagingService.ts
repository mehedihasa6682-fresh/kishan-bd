import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db, auth } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

let messaging: any = null;
try {
  messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
} catch (e) {
  console.warn("Firebase Messaging initialization failed:", e);
}

export const MessagingService = {
  isSupported() {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'Notification' in window && 
           'PushManager' in window;
  },

  async requestPermissionAndGetToken() {
    if (!messaging || !this.isSupported()) return null;
    
    try {
      // If permission is already denied, we can't do anything
      if (Notification.permission === 'denied') {
        console.warn("FCM Notifications are blocked by the user/browser.");
        await this.updateUserNotificationStatus(false);
        return null;
      }

      // Check if we already have permission, if not, request it
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          await this.updateUserNotificationStatus(false);
          return null;
        }
      }
      
      await this.updateUserNotificationStatus(Notification.permission === 'granted');
      
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BLUaQ6p_En7RjF_9QTN__g6WVViX9r9eJfy16eiryt-GADsNg46gtyJNqxDDS7qeGyYCUkhkIjvkKRKvIRHgBRw';
      
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration
      });
      
      if (token && auth.currentUser) {
        await this.saveTokenToFirestore(token);
        return token;
      }
    } catch (error) {
      console.error("FCM Permission/Token error:", error);
    }
    return null;
  },

  async saveTokenToFirestore(token: string) {
    if (!auth.currentUser) return;
    
    try {
      await setDoc(doc(db, 'fcmTokens', auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        token: token,
        platform: 'web',
        updatedAt: serverTimestamp()
      });
      await this.updateUserNotificationStatus(true);
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  },

  async updateUserNotificationStatus(granted: boolean) {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        pushEnabled: granted,
        pushConsentTimestamp: serverTimestamp(),
        lastAuthUpdate: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating user notification status:", error);
    }
  },

  async testPush() {
    if (!auth.currentUser) return { success: false, error: "Not logged in" };
    
    try {
      const token = await this.requestPermissionAndGetToken();
      if (!token) return { success: false, error: "Permission denied or token missing" };

      const response = await fetch('/api/send-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          notification: {
            title: "Test Signal 🚀",
            body: "Your Sodai Bhai push system is active and verified!"
          },
          data: { url: "/orders" }
        })
      });

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { success: false, error: "Server returned non-JSON: " + text.substring(0, 100) };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  onMessageListener() {
    if (!messaging) return;
    
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      
      // Trigger a real browser notification even in foreground
      // This is what the user requested: "ALSO trigger real browser/system notification" in foreground
      if (this.isSupported() && payload.notification) {
        navigator.serviceWorker.ready.then(registration => {
          console.log("Triggering foreground native notification");
          const options: any = {
            body: payload.notification?.body,
            icon: payload.notification?.icon || '/logo.png',
            badge: '/logo.png',
            vibrate: [200, 100, 200, 100, 400],
            data: payload.data,
            requireInteraction: true,
            renotify: true,
            tag: payload.data?.notificationId || 'sodaibhai-foreground',
            silent: false, // Explicitly tell browser not to be silent
          };
          
          registration.showNotification(payload.notification?.title || 'সদাই ভাই', options);
          
          // Fallback vibrate for some browsers that don't support it in options
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }).catch(err => console.error("SW Notification error:", err));
      }
    });
  }
};
