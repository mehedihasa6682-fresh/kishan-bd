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
        const token = await getToken(messaging, {
          vapidKey: 'BP80R2KTOd44MTHx8apVSgbQTZ_ky8Lr_c8MRyTEAtiq7jbvhRlV6fcjT3ABFpHtmOlefUR6s4CzRHK10RGYiQU' 
        });
        
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
