import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, ShoppingBag, Plus, ShoppingCart, Mic, Menu, Tag, Gift, Award, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../App';
import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { formatCurrency } from '../lib/utils';
import ProductCard from '../components/ProductCard';
import { InstallButton } from '../components/InstallButton';

export default function Home() {
  const [activeBanner, setActiveBanner] = useState(0);
  const { user, setDataLoading } = useContext(AuthContext);
  const { t, dData } = useLanguage();
  const { settings: appSettings } = useSettings();
  const navigate = useNavigate();
  
  const [dbBanners, setDbBanners] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const banners = dbBanners.length > 0 ? dbBanners : [
    { id: '1', title: 'Fresh Offers', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' },
    { id: '2', title: 'Summer Festival', image: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800' }
  ];

  const featureCards = [
    { title: 'Summer FEST', icon: <Zap size={24} />, color: 'from-orange-400 to-yellow-500', path: '/discounts' },
    { title: 'All Offers', icon: <Gift size={24} />, color: 'from-emerald-400 to-teal-500', path: '/discounts' },
    { title: 'Unilever', icon: <Award size={24} />, color: 'from-blue-500 to-blue-700', path: '/products?brand=unilever' },
    { title: 'Big Save', icon: <ShoppingCart size={24} />, color: 'from-pink-500 to-rose-600', path: '/discounts' },
  ];

  const categories = (dbCategories.length > 0 ? dbCategories : [
    { id: '1', title: 'Eggs', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3cdd?w=200' },
    { id: '2', title: 'Frozen', image: 'https://images.unsplash.com/photo-1585238339750-f82f2ce1640a?w=200' },
    { id: '3', title: 'Noodles', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=200' },
    { id: '4', title: 'Tea', image: 'https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=200' },
    { id: '5', title: 'Coffee', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200' },
    { id: '6', title: 'Biscuits', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200' },
    { id: '7', title: 'Soft Drinks', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200' },
    { id: '8', title: 'Candy', image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=200' }
  ]).slice(0, 8);

  const recommendedProducts = dbProducts
    .filter(p => !p.isOutOfStock)
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));

  useEffect(() => {
    if (banners.length > 0) {
      const interval = setInterval(() => {
        setActiveBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  useEffect(() => {
    const unsubBanners = onSnapshot(query(collection(db, 'banners')), (snap) => {
      setDbBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCategories = onSnapshot(query(collection(db, 'categories')), (snap) => {
      setDbCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved')), (snap) => {
      setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubBanners();
      unsubCategories();
      unsubProducts();
    };
  }, []);


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto relative min-h-screen pb-32"
    >
      <Helmet>
        <title>{appSettings.appName || 'Supermarket'} - আধুনিক গ্রোছারি শপিং</title>
      </Helmet>

      {/* Hero Banner Slider */}
      <div className="px-4 mt-4">
        <div className="relative h-48 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <img src={banners[activeBanner % banners.length]?.image} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${activeBanner === idx ? 'w-6 bg-primary' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Feature Cards Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto px-4 py-8 scrollbar-hide">
        {featureCards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(card.path)}
            className={`flex-shrink-0 w-28 h-28 glass-card bg-gradient-to-br ${card.color} flex flex-col items-center justify-center gap-2 p-2 relative overflow-hidden group cursor-pointer`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 text-white drop-shadow-md">
              {card.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-center relative z-10 text-white drop-shadow-sm leading-tight">
              {card.title}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Favourite Categories Section */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-lg font-display font-black text-white tracking-tight uppercase">Favourite Categories</h2>
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <motion.div
              key={cat.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/products?category=${cat.title}`)}
              className="glass-card p-2 flex items-center justify-between group cursor-pointer hover:bg-white/20 transition-all active:scale-95 border-white/20"
            >
              <div className="w-14 h-14 rounded-[1.25rem] overflow-hidden bg-white/10 flex-shrink-0 border border-white/10 shadow-inner group-hover:border-primary/50 transition-colors">
                <img src={cat.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={cat.title} />
              </div>
              <div className="flex-grow pl-3 pr-2 text-right">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/90 group-hover:text-primary transition-colors leading-tight">
                  {dData(cat.title, cat.titleEn)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommended Products - Moved Up */}
      <div className="mb-24 px-4">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-xl font-display font-black text-white tracking-tight">Recommended for you</h2>
          <Link to="/products" className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">See All</Link>
        </div>
        
        {/* Mobile & Desktop Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </div>
    </motion.div>
  );
}
