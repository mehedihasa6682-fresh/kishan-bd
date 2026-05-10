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
import { InstallButton } from '../components/InstallButton';

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

  const categories = dbCategories.slice(0, 10);

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
      {banners.length > 0 && (
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

      {/* Strategic Deals Hub - 2 Line Layout Replacement for Recommended */}
      {offers.length > 0 && (
        <div className="px-4 mb-24 overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <Sparkles size={24} className="text-secondary animate-pulse" />
              <h2 className="text-xl font-display font-black text-white tracking-tight uppercase">
                {offers[0].title}
              </h2>
            </div>
            <Link to="/discounts" className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-[9px] font-black text-white/40 uppercase tracking-widest hover:bg-secondary hover:text-black transition-all">All Deals</Link>
          </div>
          
          <div className="grid grid-flow-col grid-rows-2 gap-4 overflow-x-auto pb-8 scrollbar-hide snap-x">
             {/* Feature Banners for missions */}
             {offers.map(offer => (
               <motion.div
                 key={offer.id}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => navigate(offer.hasDetailsPage ? `/deal/${offer.id}` : `/products?offer=${offer.id}`)}
                 className="flex-shrink-0 w-72 h-40 relative rounded-[2.5rem] overflow-hidden border border-white/5 group cursor-pointer snap-center shadow-2xl"
               >
                 <img src={offer.bannerImage || appSettings.logo} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={offer.title} />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                 
                 <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-secondary text-black text-[8px] font-black uppercase tracking-widest rounded-lg shadow-xl">{offer.type}</span>
                      {offer.timerEnabled && timeLefts[offer.id] && (
                        <span className="text-[9px] font-mono font-black text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                          {String(timeLefts[offer.id].hours).padStart(2, '0')}:{String(timeLefts[offer.id].minutes).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-secondary transition-colors">{offer.title}</h3>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Benefit: {offer.discountAmount}{offer.discountType === 'percentage' ? '%' : '৳'} OFF</p>
                 </div>
                 
                 <div className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} className="text-white" />
                 </div>
               </motion.div>
             ))}

             {/* Deal Products Horizontal 2-Line */}
             {dbProducts
                .filter(p => offers.some(o => o.productIds?.includes(p.id) || p.category === o.categoryId))
                .slice(0, 16)
                .map(product => (
                  <motion.div
                    key={product.id}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="flex-shrink-0 w-48 bg-white/5 p-3 rounded-[2rem] border border-white/5 snap-center group hover:border-primary/20 transition-all flex flex-col"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative bg-black/20">
                      <img src={product.image || appSettings.logo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-black text-[8px] font-black rounded-lg shadow-lg">DEAL</div>
                    </div>
                    <div className="space-y-1 mt-auto">
                      <h4 className="text-[10px] font-black text-white uppercase truncate px-1">
                        {language === 'bn' ? (product.name || product.nameEn) : (product.nameEn || product.name)}
                      </h4>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-black text-secondary">৳{Math.floor(product.price * 0.9)}</span>
                        <span className="text-[8px] text-white/20 line-through">৳{product.price}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
