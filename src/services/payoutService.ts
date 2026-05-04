import { 
  collection, addDoc, getDocs, 
  query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const payoutService = {
  async requestPayout(userId: string, amount: number, method: string, account: string, role: 'seller' | 'rider') {
    try {
      return await addDoc(collection(db, 'payouts'), {
        userId,
        amount,
        method,
        account,
        role,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'payouts'); }
  },

  async getMyPayouts(userId: string) {
    try {
      const q = query(
        collection(db, 'payouts'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) { handleFirestoreError(e, OperationType.GET, 'payouts'); }
  }
};
