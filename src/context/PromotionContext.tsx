import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Promotion {
  id: string;
  title: string;
  percentage: number;
  endTime: Timestamp;
  targetType: 'all' | 'category' | 'product';
  targetId: string;
  isActive: boolean;
}

interface PromotionContextType {
  promotions: Promotion[];
  getEffectivePrice: (product: any) => { price: number; discountPrice: number | null; promotion: Promotion | null };
}

const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

export const PromotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
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

    const unsub = onSnapshot(q, (snap) => {
      const allPromos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion));
      setPromotions(allPromos);
    }, (error) => {
      console.error("PromotionContext Error:", error);
    });

    return unsub;
  }, []);

  const getEffectivePrice = (product: any) => {
    // 1. Find relevant promotions that haven't expired
    // Priority: Product > Category > All
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

    // Apply percentage discount to the BASE price
    const basePrice = product.price;
    const promoDiscountAmount = (basePrice * activePromo.percentage) / 100;
    const promoPrice = basePrice - promoDiscountAmount;

    // Use whichever is lower: existing discountPrice or promoPrice
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
