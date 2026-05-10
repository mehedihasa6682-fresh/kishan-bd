import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Promotion {
  id: string;
  title: string;
  percentage?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  endTime: any;
  targetType: 'all' | 'category' | 'product' | 'products' | 'subcategory';
  targetId?: string;
  productIds?: string[];
  categoryId?: string;
  isActive: boolean;
}

interface PromotionContextType {
  promotions: Promotion[];
  getEffectivePrice: (product: any) => { price: number; discountPrice: number | null; promotion: Promotion | null };
}

const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

export const PromotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [offers, setOffers] = useState<Promotion[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'promotions'),
      where('isActive', '==', true)
    );

    const unsubPromos = onSnapshot(q, (snap) => {
      const allPromos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion));
      setPromotions(allPromos);
    }, (error) => {
      console.error("PromotionContext (Promotions) Error:", error);
    });

    const unsubOffers = onSnapshot(query(collection(db, 'offers'), where('isActive', '==', true)), (snap) => {
      setOffers(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Normalize offer to promotion shape if needed
          endTime: data.endTime ? (typeof data.endTime === 'string' ? Timestamp.fromDate(new Date(data.endTime)) : data.endTime) : null
        } as Promotion;
      }));
    });

    return () => {
      unsubPromos();
      unsubOffers();
    };
  }, []);

  const getEffectivePrice = (product: any) => {
    // 1. Check Offers (high priority)
    const activeOffer = offers.find(o => {
      if (!o.endTime) return false;
      const end = o.endTime instanceof Timestamp ? o.endTime.toDate() : new Date(o.endTime);
      if (end < now) return false;

      if (o.targetType === 'all') return true;
      if (o.targetType === 'category' && (o.categoryId === product.category || o.targetId === product.category)) return true;
      if (o.targetType === 'products' && o.productIds?.includes(product.id)) return true;
      if (o.targetType === 'product' && o.targetId === product.id) return true;
      
      return false;
    });

    if (activeOffer) {
      const basePrice = product.price;
      let discountAmount = 0;
      if (activeOffer.discountType === 'percentage' || activeOffer.percentage) {
        const perc = activeOffer.discountAmount || activeOffer.percentage || 0;
        discountAmount = (basePrice * perc) / 100;
      } else if (activeOffer.discountType === 'fixed') {
        discountAmount = activeOffer.discountAmount || 0;
      }

      return {
        price: basePrice,
        discountPrice: Math.max(0, basePrice - discountAmount),
        promotion: activeOffer as any
      };
    }

    // 2. Check traditional Promotions
    const productPromo = promotions.find(p => p.targetType === 'product' && p.targetId === product.id && p.endTime.toDate() > now);
    const categoryPromo = promotions.find(p => p.targetType === 'category' && p.targetId === product.category && p.endTime.toDate() > now);
    const globalPromo = promotions.find(p => p.targetType === 'all' && p.endTime.toDate() > now);

    const activePromo = productPromo || categoryPromo || globalPromo;

    if (!activePromo) {
      return { 
        price: product.price, 
        discountPrice: product.discountPrice || null, 
        promotion: null 
      };
    }

    const basePrice = product.price;
    const promoDiscountAmount = (basePrice * (activePromo.percentage || 0)) / 100;
    const promoPrice = basePrice - promoDiscountAmount;

    const finalDiscountPrice = product.discountPrice 
      ? Math.min(product.discountPrice, promoPrice)
      : promoPrice;

    return {
      price: basePrice,
      discountPrice: finalDiscountPrice,
      promotion: activePromo
    };
  };

  return (
    <PromotionContext.Provider value={{ promotions, getEffectivePrice }}>
      {children}
    </PromotionContext.Provider>
  );
};

export const usePromotions = () => {
  const context = useContext(PromotionContext);
  if (context === undefined) {
    throw new Error('usePromotions must be used within a PromotionProvider');
  }
  return context;
};
