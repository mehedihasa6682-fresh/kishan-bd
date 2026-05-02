import { useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../App';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, ArrowRight, Star, Trash2 } from 'lucide-react';
import { socialService } from '../services/socialService';
import { useNavigate } from 'react-router-dom';

export default function Wishlist() {
  const { user } = useContext(AuthContext);
  const { addToCart } = useCart();
  const { t, dData } = useLanguage();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const unsubWish = socialService.getWishlist(user.uid, (items) => {
      setWishlistItems(items);
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved')), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubWish();
      unsubProducts();
    };
  }, [user]);

  const items = wishlistItems.map(wish => {
    const product = products.find(p => p.id === wish.productId);
    return product ? { ...product, wishId: wish.id } : null;
  }).filter(item => item !== null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-10 pt-32 text-center">
        <Heart size={64} className="mx-auto text-slate-200 mb-6" />
        <h2 className="text-2xl font-display font-bold mb-2">Login to save items</h2>
        <p className="text-slate-500 mb-8">Save your favorite fresh products to your wishlist.</p>
        <button onClick={() => navigate('/profile')} className="btn-primary w-full py-4">Login Now</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-4 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Your Wishlist</h1>
          <p className="text-slate-400 text-xs font-medium mt-1">{items.length} items saved</p>
        </div>
        <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
          <Heart size={20} fill="currentColor" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center pt-20">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-6">
            <Heart size={32} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Wishlist is empty</h3>
          <p className="text-slate-400 text-xs mb-8">You haven't saved any fresh items yet.</p>
          <button onClick={() => navigate('/products')} className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/20">Explore Products</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-4 group"
              >
                <div onClick={() => navigate(`/product/${item.id}`)} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <Star size={10} className="text-secondary fill-secondary" />
                    <span className="text-[10px] font-bold text-slate-800">{item.rating || '5.0'}</span>
                  </div>
                  <h3 onClick={() => navigate(`/product/${item.id}`)} className="font-bold text-sm text-slate-800 mb-0.5 truncate cursor-pointer">{dData(item.name, item.nameEn)}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mb-2">By {item.farmerName || item.farmer}</p>
                  <p className="text-primary font-bold text-sm">৳{item.price} <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span></p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => socialService.toggleWishlist(user.uid, item.id)}
                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => addToCart(item)}
                    className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all"
                  >
                    <ShoppingBag size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
