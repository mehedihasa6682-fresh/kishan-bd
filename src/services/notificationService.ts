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
      const user = auth.currentUser;
      if (!user) return;

      // We should only try to update the doc if it's a personal notification
      // However, Firestore rules protect us, but to avoid Console Errors:
      // We'll just try and catch specifically for permissions
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error: any) {
      if (error.message?.includes('permissions')) {
        console.warn("Permission denied marking notification read (likely a global notification). Skipping.");
        return;
      }
      console.error("Error marking notification as read:", error);
    }
  },

  // Mark all as read
  async markAllAsRead(notifications: AppNotification[]) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const unread = notifications.filter(n => !n.read && n.userId === user.uid);
      if (unread.length === 0) return;
      
      await Promise.all(unread.map(n => this.markAsRead(n.id)));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  },

  // Clear all personal notifications
  async clearNotifications(notifications: AppNotification[]) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const { deleteDoc, doc } = await import('firebase/firestore');
      const personal = notifications.filter(n => n.userId === user.uid);
      
      await Promise.all(personal.map(n => deleteDoc(doc(db, 'notifications', n.id))));
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }
};
