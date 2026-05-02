import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface Order {
  id?: string;
  userId: string;
  customerName: string;
  items: any[];
  total: number;
  discount?: number;
  status: 'pending' | 'verified' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'rocket';
  transactionId?: string;
  paymentScreenshot?: string;
  paymentStatus: 'pending' | 'verified' | 'failed';
  createdAt: any;
  address: string;
  phone: string;
  sellerIds: string[]; // List of sellers involved in this order
}

export const orderService = {
  async placeOrder(orderData: Omit<Order, 'id' | 'createdAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: serverTimestamp(),
        status: 'pending',
        paymentStatus: 'pending'
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'orders');
    }
  },

  async getMyOrders(userId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      callback(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
  },

  async verifyPayment(orderId: string) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: 'verified',
        status: 'verified' // Once verified, it moves to 'verified' state for sellers to see
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async confirmOrder(orderId: string) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'confirmed'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  }
};
