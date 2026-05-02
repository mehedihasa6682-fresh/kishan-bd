import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

export const socialService = {
  // Wishlist
  async toggleWishlist(userId: string, productId: string) {
    const q = query(collection(db, 'wishlist'), where('userId', '==', userId), where('productId', '==', productId));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(collection(db, 'wishlist'), {
        userId,
        productId,
        addedAt: serverTimestamp()
      });
      return true; // Added
    } else {
      await deleteDoc(doc(db, 'wishlist', snap.docs[0].id));
      return false; // Removed
    }
  },

  getWishlist(userId: string, callback: (items: any[]) => void) {
    const q = query(collection(db, 'wishlist'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Wishlist Listener:", error);
    });
  },

  // Reviews
  async addReview(review: { productId: string, userId: string, userName: string, userPhoto: string, rating: number, comment: string }) {
    await addDoc(collection(db, 'reviews'), {
      ...review,
      createdAt: serverTimestamp()
    });
  },

  getReviews(productId: string, callback: (reviews: any[]) => void) {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Reviews Listener:", error);
    });
  }
};
