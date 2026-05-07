import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tag, Zap } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { usePromotions } from '../context/PromotionContext';
import ProductCard from '../components/ProductCard';

export default function Discounts() {
  const [products, setProducts] = useState<any[]>([]);
  const { promotions, getEffectivePrice } = usePromotions();
  const { dData } = useLanguage();

  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('status', '==', 'approved')
    );
    
    return onSnapshot(q, (snap) => {
      const allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter products that either have a standard discount price 
      // OR are covered by an active flash promotion
      const discounted = allProducts.filter((p: any) => {
        const effective = getEffectivePrice(p);
        const hasStandardDiscount = (p.discountPrice && p.discountPrice < p.price);
        const hasActivePromotion = !!effective.promotion;
        
        return hasStandardDiscount || hasActivePromotion;
      });
      
      setProducts(discounted);
    });
  }, [promotions]); // Re-run when promotions state changes in context

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-5 pt-4 pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="text-primary" /> সকল অফার
          </h1>
          <p className="text-xs text-white/40 font-medium font-sans">সবচেয়ে কম দামে সেরা পণ্যগুলো বেছে নিন - লিমিটেড অফার!</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-1">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-24 bg-white/5 rounded-[4rem] border border-dashed border-white/10 mx-4">
          <Zap size={48} className="mx-auto mb-4 text-white/10" />
          <p className="text-sm font-black uppercase tracking-[0.4em] text-white/10">আপাতত কোন অফার নেই</p>
        </div>
      )}
    </motion.div>
  );
}
