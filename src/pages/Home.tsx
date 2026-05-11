import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, ShoppingBag, Plus, ShoppingCart, Mic, Menu, Tag, Gift, Award, Zap, Clock, Sparkles } from 'lucide-react';
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

export default function Home() {
  const [activeBanner, setActiveBanner] = useState(0);
  const { user, setDataLoading } = useContext(AuthContext);
  const { t, dData, language } = useLanguage();
  const { settings: appSettings } = useSettings();
  const navigate = useNavigate();
  
  const [dbBanners, setDbBanners] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offers, setOffers] = useState<any[]>([]);
  const [timeLefts, setTimeLefts] = useState<Record<string, any>>({});

  const calculateTimeLeft = (endTime: string) => {
    const difference = +new Date(endTime) - +new Date();
    if (difference <= 0) return null;
    return {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  };

  useEffect(() => {
    const unsubOffers = onSnapshot(query(collection(db, 'offers'), where('isActive', '==', true)), (snap) => {
      setOffers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubOffers();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLefts: Record<string, any> = {};
      offers.forEach(offer => {
        if (offer.endTime && offer.timerEnabled) {
          newTimeLefts[offer.id] = calculateTimeLeft(offer.endTime);
        }
      });
      setTimeLefts(newTimeLefts);
    }, 1000);
    return () => clearInterval(timer);
  }, [offers]);

  const banners = dbBanners;

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

  const activeOffers = offers.filter(offer => {
    if (!offer.timerEnabled) return true;
    const timeLeft = timeLefts[offer.id];
    return timeLeft && (timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0);
  });

  const categories = dbCategories.slice(0, 10);

  const recommendedProducts = dbProducts
    .filter(p => {
      if (p.isOutOfStock) return false;
      // Filter out products that are part of an active offer
      const isDealsProduct = activeOffers.some(o => o.productIds?.includes(p.id) || p.category === o.categoryId);
      return !isDealsProduct;
    })
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
      {banners.length > 0 && (
        <div className="px-1 md:px-0 mt-2 md:mt-6">
          <div className="relative h-48 md:h-[450px] lg:h-[500px] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBanner}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0"
              >
                {/* Responsive Image logic */}
                <picture className="w-full h-full">
                  {banners[activeBanner % banners.length]?.desktopImage && (
                    <source media="(min-width: 768px)" srcSet={banners[activeBanner % banners.length].desktopImage} />
                  )}
                  {banners[activeBanner % banners.length]?.mobileImage && (
                    <source media="(max-width: 767px)" srcSet={banners[activeBanner % banners.length].mobileImage} />
                  )}
                  <img 
                    src={banners[activeBanner % banners.length]?.image || banners[activeBanner % banners.length]?.desktopImage || banners[activeBanner % banners.length]?.mobileImage} 
                    className="w-full h-full object-cover" 
                    alt={banners[activeBanner % banners.length]?.title || 'Banner'} 
                  />
                </picture>
                
                {/* Banner Content Overlay */}
                {(banners[activeBanner % banners.length]?.title || banners[activeBanner % banners.length]?.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-6 md:p-12">
                    {banners[activeBanner % banners.length]?.title && (
                      <motion.h2 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl md:text-5xl font-display font-black text-white mb-2 md:mb-4 tracking-tight"
                      >
                        {banners[activeBanner % banners.length].title}
                      </motion.h2>
                    )}
                    {banners[activeBanner % banners.length]?.subtitle && (
                      <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-[10px] md:text-lg text-white/80 font-bold uppercase tracking-[0.2em]"
                      >
                        {banners[activeBanner % banners.length].subtitle}
                      </motion.p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBanner(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 shadow-xl ${activeBanner === idx ? 'w-8 bg-primary' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
      {categories.length > 0 && (
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-lg font-display font-black text-white tracking-tight uppercase">{t('home.favourite_categories')}</h2>
            <Link to="/products" className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">{t('home.see_all')}</Link>
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
                  <img src={cat.image || appSettings.logo} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={cat.title} />
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
      )}

      {/* Strategic Deals or Recommendations Section */}
      <div className="px-4 mb-14 overflow-hidden">
        {activeOffers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-8 px-1">
              <div className="flex items-center gap-3">
                <Sparkles size={24} className="text-secondary animate-pulse" />
                <h2 className="text-xl font-display font-black text-white tracking-tight uppercase">
                  {activeOffers[0].title}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
              {dbProducts
                .filter(p => activeOffers.some(o => o.productIds?.includes(p.id) || p.category === o.categoryId))
                .slice(0, 10)
                .map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8 px-1">
              <h2 className="text-xl font-display font-black text-white tracking-tight uppercase">
                Recommended for you
              </h2>
              <Link to="/products" className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">See All</Link>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
              {recommendedProducts.slice(0, 15).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </>
        )}
      </div>

      {/* More Recommendations (Only if offers are active) */}
      {activeOffers.length > 0 && (
        <div className="mb-24 px-4 overflow-hidden">
          <div className="flex items-center justify-between mb-8 px-1">
            <h2 className="text-xl font-display font-black text-white tracking-tight uppercase">
              More recommendations
            </h2>
            <Link to="/products" className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">See All</Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
            {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </div>
      )}

    </motion.div>
  );
}
