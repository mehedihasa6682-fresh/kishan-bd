import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebase';

export const riderService = {
  getAvailableOrders(callback: (orders: any[]) => void) {
    const q = query(collection(db, 'orders'), where('status', '==', 'ready_for_pickup'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
  },

  getMyDeliveries(riderId: string, callback: (orders: any[]) => void) {
    const q = query(collection(db, 'orders'), where('riderId', '==', riderId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
  },

  async arrivedAtMerchant(orderId: string) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'shipped',
        subStatus: 'arrived_at_pickup',
        arrivedAtMerchantAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async pickUpOrder(orderId: string, riderId: string) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'shipped',
        subStatus: 'in_transit',
        riderId,
        pickedUpAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async deliverOrder(orderId: string) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'delivered',
        deliveredAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async updateLocation(riderId: string, lat: number, lng: number) {
    try {
      await updateDoc(doc(db, 'users', riderId), {
        location: { lat, lng },
        lastLocationUpdate: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${riderId}`);
    }
  }
};
