import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system' | 'payment' | 'inventory';
  read: boolean;
  createdAt: any;
  link?: string;
}

export const NotificationService = {
  // Add a new in-app notification
  async sendNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  },

  // Listen for real-time notifications for the current user
  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [userId, 'all']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      callback(notifications);
    });
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  // Mark all as read
  async markAllAsRead(notifications: AppNotification[]) {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => this.markAsRead(n.id)));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }
};
