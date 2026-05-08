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

  const getIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'zap': return <Zap size={18} />;
      case 'gift': return <Gift size={18} />;
      case 'award': return <Award size={18} />;
      case 'shopping-cart': return <ShoppingCart size={18} />;
      case 'tag': return <Tag size={18} />;
      case 'menu': return <Menu size={18} />;
      case 'star': return <Award size={18} />;
      default: return <Plus size={18} />;
    }
  };

  const featureCards = appSettings.featureButtons || [
    { title: 'Summer FEST', icon: 'zap', color: 'from-[#0A1F44] to-[#1a3a6a]', path: '/discounts' },
    { title: 'All Offers', icon: 'gift', color: 'from-[#D4AF37] to-[#B8860B]', path: '/discounts' },
    { title: 'Unilever', icon: 'award', color: 'from-[#0A1F44] to-[#1a3a6a]', path: '/products?brand=unilever' },
    { title: 'Big Save', icon: 'shopping-cart', color: 'from-[#D4AF37] to-[#B8860B]', path: '/discounts' },
  ];

  const categories = (dbCategories.length > 0 ? dbCategories : [
    { id: '1', title: 'Eggs', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3cdd?w=200' },
    { id: '2', title: 'Frozen', image: 'https://images.unsplash.com/photo-1585238339750-f82f2ce1640a?w=200' },
    { id: '3', title: 'Noodles', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=200' },
    { id: '4', title: 'Tea', image: 'https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=200' },
    { id: '5', title: 'Coffee', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200' },
    { id: '6', title: 'Biscuits', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200' },
    { id: '7', title: 'Soft Drinks', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200' },
    { id: '8', title: 'Candy', image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=200' },
    { id: '9', title: 'Cooking', image: 'https://images.unsplash.com/photo-1547516508-4c1f9c7c4ec3?w=200' }
  ]).slice(0, 9);

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
      className="max-w-7xl mx-auto relative min-h-screen pb-32 px-2 md:px-6"
    >
      <Helmet>
        <title>{appSettings.appName || 'সদাই ভাই'} - আধুনিক গ্রোছারি শপিং</title>
      </Helmet>

      {/* Hero Banner Slider */}
      <div className="px-4 mt-2">
        <div className="relative h-36 rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/10">
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
      <div className="flex gap-3 overflow-x-auto px-4 py-6 scrollbar-hide">
        {featureCards.map((card: any, i: number) => (
          <motion.div
            key={i}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(card.path)}
            className={`flex-shrink-0 w-20 h-20 glass-card bg-gradient-to-br ${card.color} flex flex-col items-center justify-center gap-1.5 p-1.5 relative overflow-hidden group cursor-pointer`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 text-white drop-shadow-md">
              {getIcon(card.icon)}
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-center relative z-10 text-white drop-shadow-sm leading-tight">
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
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/products?category=${cat.title}`)}
              className="group cursor-pointer flex flex-col gap-2"
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="glass-card h-24 relative overflow-hidden rounded-2xl border-white/20 transition-all group-hover:border-primary/40 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
              >
                <img src={cat.image} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={cat.title} />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all" />
              </motion.div>
              
              <div className="text-center px-0.5">
                <span className="text-[9px] font-black uppercase tracking-[0.05em] text-white/70 group-hover:text-primary transition-colors leading-tight block truncate">
                  {dData(cat.title, cat.titleEn)}
                </span>
              </div>
            </div>
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
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 px-1">
          {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </div>
    </motion.div>
  );
}
