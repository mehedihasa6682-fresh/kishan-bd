import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db, auth } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const MessagingService = {
  async requestPermissionAndGetToken() {
    if (!messaging) return null;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BLUaQ6p_En7RjF_9QTN__g6WVViX9r9eJfy16eiryt-GADsNg46gtyJNqxDDS7qeGyYCUkhkIjvkKRKvIRHgBRw';
        
        const token = await getToken(messaging, { vapidKey });
        
        if (token && auth.currentUser) {
          await this.saveTokenToFirestore(token);
          return token;
        }
      }
    } catch (error) {
      console.error("FCM Permission/Token error:", error);
    }
    return null;
  },

  async testPush() {
    if (!auth.currentUser) return { success: false, error: "Not logged in" };
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        return { success: false, error: "No push subscription found. Try refreshing or re-enabling notifications." };
      }

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          payload: {
            notification: {
              title: "Test Notification",
              body: "This is a test notification from the Node.js backend!",
              icon: "/logo.png"
            },
            data: {
              url: "/orders"
            }
          }
        })
      });

      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
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
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  },

  onMessageListener() {
    if (!messaging) return;
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  }
};
