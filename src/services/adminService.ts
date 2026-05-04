import { 
  collection, addDoc, deleteDoc, doc, getDocs, 
  query, where, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

// General CRUD for Admin
export const adminService = {
  // Banners
  async addBanner(banner: any) {
    try {
      return await addDoc(collection(db, 'banners'), { ...banner, createdAt: serverTimestamp() });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'banners'); }
  },
  async deleteBanner(id: string) {
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'banners'); }
  },

  // Stories
  async addStory(story: any) {
    try {
      return await addDoc(collection(db, 'stories'), { ...story, createdAt: serverTimestamp() });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'stories'); }
  },
  async deleteStory(id: string) {
    try {
      await deleteDoc(doc(db, 'stories', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'stories'); }
  },

  // Categories
  async addCategory(category: any) {
    try {
      return await addDoc(collection(db, 'categories'), category);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'categories'); }
  },
  async deleteCategory(id: string) {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'categories'); }
  },
  async updateCategory(id: string, updates: any) {
    try {
      await updateDoc(doc(db, 'categories', id), updates);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `categories/${id}`); }
  },

  // Products
  async addProduct(product: any) {
    try {
      return await addDoc(collection(db, 'products'), { 
        ...product, 
        createdAt: serverTimestamp(), 
        status: 'approved',
        isApproved: true,
        farmerId: 'admin',
        farmerName: 'Kishan Admin',
        location: 'Dhaka',
        whatsappNumber: product.whatsappNumber || null
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'products'); }
  },
  async approveProduct(id: string) {
    try {
      await updateDoc(doc(db, 'products', id), { 
        status: 'approved',
        isApproved: true
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'products'); }
  },
  async rejectProduct(id: string) {
    try {
      await updateDoc(doc(db, 'products', id), { 
        status: 'rejected',
        isApproved: false
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'products'); }
  },
  async deleteProduct(id: string) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'products'); }
  },
  async updateProduct(id: string, updates: any) {
    try {
      await updateDoc(doc(db, 'products', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `products/${id}`); }
  },
  async updateStockStatus(id: string, statusText: string, stockQuantity: number, isOutOfStock: boolean) {
    try {
      await updateDoc(doc(db, 'products', id), { 
        stockStatus: statusText,
        stockQuantity: stockQuantity,
        isOutOfStock: isOutOfStock,
        updatedAt: serverTimestamp()
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `products/${id}`); }
  },
  async getPendingProducts(callback: (products: any[]) => void) {
    const q = query(collection(db, 'products'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Sellers
  async verifySeller(uid: string) {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        isVerified: true,
        role: 'seller',
        roleRequest: null // clear the request
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`); }
  },
  async deleteUser(uid: string) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `users/${uid}`); }
  },

  async deleteSeller(uid: string) {
    return this.deleteUser(uid);
  },

  // Orders
  async updateOrderStatus(id: string, status: string, paymentStatus?: string) {
    try {
      const updates: any = { status };
      if (paymentStatus) updates.paymentStatus = paymentStatus;
      await updateDoc(doc(db, 'orders', id), updates);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `orders/${id}`); }
  },

  async blockUser(userId: string, isBlocked: boolean) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBlocked,
        blockedAt: isBlocked ? serverTimestamp() : null
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  },

  async updateUserRole(userId: string, role: string, isVerified?: boolean) {
    try {
      const updates: any = { role, lastRoleUpdate: serverTimestamp() };
      if (typeof isVerified === 'boolean') updates.isVerified = isVerified;
      await updateDoc(doc(db, 'users', userId), updates);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  },

  async updateDeliveryArea(areaId: string, data: any) {
    try {
      if (areaId === 'new') {
        return await addDoc(collection(db, 'delivery_areas'), { ...data, createdAt: serverTimestamp() });
      }
      return await updateDoc(doc(db, 'delivery_areas', areaId), data);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `delivery_areas/${areaId}`); }
  },

  async deleteDeliveryArea(areaId: string) {
    try {
      return await deleteDoc(doc(db, 'delivery_areas', areaId));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `delivery_areas/${areaId}`); }
  },

  // App Settings (Logo, etc)
  async updateAppSetting(key: string, value: any) {
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'app'), { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/app');
    }
  },

  async addBundle(bundle: any) {
    try {
      return await addDoc(collection(db, 'products'), { 
        ...bundle, 
        createdAt: serverTimestamp(),
        isBundle: true,
        status: 'approved',
        isApproved: true,
        category: 'Bundles',
        farmerId: 'admin',
        farmerName: 'Kishan Admin'
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'products'); }
  },

  async deleteBundle(id: string) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `products/${id}`); }
  },

  async deleteAllNotifications() {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const batch: any[] = [];
      snap.forEach(d => batch.push(deleteDoc(doc(db, 'notifications', d.id))));
      await Promise.all(batch);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'notifications'); }
  },

  // Payouts
  async updatePayoutStatus(id: string, status: 'completed' | 'rejected') {
    try {
      await updateDoc(doc(db, 'payouts', id), { 
        status, 
        updatedAt: serverTimestamp() 
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `payouts/${id}`); }
  }
};
