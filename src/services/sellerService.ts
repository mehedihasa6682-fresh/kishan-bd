import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const sellerService = {
  // Products management
  async getMyProducts(sellerId: string, callback: (products: any[]) => void) {
    const q = query(collection(db, 'products'), where('farmerId', '==', sellerId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
  },

  async addProduct(product: any) {
    try {
      const { sellerId, ...rest } = product;
      return await addDoc(collection(db, 'products'), {
        ...rest,
        farmerId: sellerId,
        status: 'pending',
        isApproved: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'products');
    }
  },

  async updateProduct(id: string, updates: any) {
    try {
      await updateDoc(doc(db, 'products', id), { 
        ...updates, 
        status: 'pending',
        isApproved: false 
      }); 
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `products/${id}`);
    }
  },

  async deleteProduct(id: string) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
    }
  },

  // Orders management for sellers
  async getMyOrders(sellerId: string, callback: (orders: any[]) => void) {
    // Note: This is simplified. In a real app, an order might have multiple sellers.
    // Here we query orders where this sellerId is in the sellerIds array.
    const q = query(
        collection(db, 'orders'), 
        where('sellerIds', 'array-contains', sellerId),
        where('status', 'in', ['verified', 'confirmed', 'shipped', 'delivered']) // Only show verified orders (paid or COD)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
  },

  async updateOrderStatus(orderId: string, status: string) {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async applyForSeller(uid: string, shopName: string) {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        roleRequest: 'seller', 
        shopName,
        isVerified: false 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  }
};
