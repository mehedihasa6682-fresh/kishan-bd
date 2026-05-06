import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Tag, Filter } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

export default function Discounts() {
  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useCart();
  const { dData, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('status', '==', 'approved')
    );
    
    return onSnapshot(q, (snap) => {
      const allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for items with a discount price or isFlashSale
      const discounted = allProducts.filter((p: any) => 
        (p.discountPrice && p.discountPrice < p.price) || p.isFlashSale
      );
      setProducts(discounted);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto px-5 pt-4 pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="text-primary" /> সকল অফার
          </h1>
          <p className="text-xs text-white/40 font-medium">সেরা দামে সেরা পণ্যগুলো বেছে নিন</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20 opacity-40">
          <Tag size={48} className="mx-auto mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest text-white/20">কোন অফার পাওয়া যায়নি</p>
        </div>
      )}
    </motion.div>
  );
}
