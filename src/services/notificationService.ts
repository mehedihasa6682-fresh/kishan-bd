import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  read: boolean;
  createdAt: any;
}

export const notificationService = {
  listenToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const notifications = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
  },

  async sendNotification(userId: string, title: string, message: string, type: 'order' | 'promo' | 'system') {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'notifications');
    }
  },

  async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  },

  async deleteNotification(notificationId: string) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `notifications/${notificationId}`);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const snap = await getDocs(q);
      const promises = snap.docs.map(d => updateDoc(d.ref, { read: true }));
      await Promise.all(promises);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'notifications');
    }
  }
};
