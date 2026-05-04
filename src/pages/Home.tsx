import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, Star, ShoppingBag, Plus, X, Quote, Heart, Phone, Zap, Clock, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../App';
import { useContext } from 'react';
import { socialService } from '../services/socialService';
import { Helmet } from 'react-helmet-async';

import { matchProduct } from '../lib/searchUtils';
import { formatCurrency } from '../lib/utils';

export default function Home() {
  const [activeBanner, setActiveBanner] = useState(0);
  const { user } = useContext(AuthContext);
  const { addToCart, items: cartItems } = useCart();
  const { t, dData } = useLanguage();
  const { settings: appSettings } = useSettings();
  const navigate = useNavigate();
  
  const [dbBanners, setDbBanners] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState<{show: boolean, name: string}>({ show: false, name: '' });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else if (minutes > 0) { minutes--; seconds = 59; }
        else if (hours > 0) { hours--; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const unsubBanners = onSnapshot(query(collection(db, 'banners'), orderBy('createdAt', 'desc')), (snap) => {
      setDbBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Home Banners:", error));
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setDbCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Home Categories:", error));
    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved')), (snap) => {
      setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Home Products:", error));

    if (user) {
        const unsubWish = socialService.getWishlist(user.uid, (items) => {
            setWishlistIds(items.map(i => i.productId));
        });
        return () => {
            unsubBanners();
            unsubCategories();
            unsubProducts();
            unsubWish();
        };
    }

    return () => {
      unsubBanners();
      unsubCategories();
      unsubProducts();
    };
  }, [user]);

  const toggleWish = (productId: string) => {
    if (!user) {
        navigate('/profile');
        return;
    }
    socialService.toggleWishlist(user.uid, productId);
  };

  const handleAddToCart = (product: any) => {
    addToCart(product);
    setShowToast({ show: true, name: dData(product.name, product.nameEn) });
    // Reset toast if already showing to restart the 5s timer
    setTimeout(() => setShowToast({ show: false, name: '' }), 5000);
  };

  const banners = dbBanners.length > 0 ? dbBanners : [
    { id: 'default-1', title: 'Fresh from Farm', subtitle: 'Get 20% Off on Vegetables', image: 'https://images.unsplash.com/photo-1488459711615-de9b802a83ea?w=800&h=400&fit=crop' },
    { id: 'default-2', title: 'Today Fresh Fish', subtitle: 'Hilsa & more delivered', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=400&fit=crop' },
  ];

  const categories = dbCategories.length > 0 ? dbCategories : [
    { id: 'veg', title: 'Vegetable', image: 'https://images.unsplash.com/photo-1566385270613-5f10394eb126?w=200&h=200&fit=crop' }
  ];

  const fallbackProducts = [
    { id: 1, name: 'Premium Rice', price: 85, unit: 'kg', farmer: 'Rahimullah', location: 'Sylhet', rating: 4.8, image: 'https://images.unsplash.com/photo-1586201327693-86629f7bb1f3?w=400&h=400&fit=crop' },
    { id: 2, name: 'Organic Honey', price: 450, unit: 'kg', farmer: 'Mita Sen', location: 'Sundarban', rating: 4.9, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop' },
  ];

  const featuredProducts = dbProducts.length > 0 ? dbProducts.filter(p => !p.isBundle && !p.isOutOfStock).slice(0, 12) : fallbackProducts;
  const filteredFeatured = featuredProducts.filter(p => matchProduct(p, searchQuery));
  const bundleProducts = dbProducts.filter(p => (p.isBundle || p.category === 'Bundles') && !p.isOutOfStock);
  const flashSaleProducts = dbProducts.filter(p => p.isFlashSale && !p.isOutOfStock).slice(0, 3);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto relative min-h-screen pb-32"
    >
      <AnimatePresence>
        {showToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[320px]"
          >
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                <ShoppingCart size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Added to Cart</p>
                <p className="text-xs font-bold truncate">{showToast.name}</p>
              </div>
              <button 
                onClick={() => navigate('/cart')}
                className="px-3 py-1.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cartItems.length > 0 && !showToast.show && (
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] w-[90%] max-w-[350px]"
        >
          <button 
            onClick={() => navigate('/cart')}
            className="w-full bg-primary text-white p-4 rounded-[2rem] shadow-2xl shadow-primary/30 flex items-center justify-between group overflow-hidden relative"
          >
            <motion.div 
              className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
            />
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">You have items in cart</p>
                <p className="text-sm font-bold">Proceed to Checkout</p>
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-xl relative z-10">
              <span className="text-xs font-black">৳{formatCurrency(cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0))}</span>
            </div>
          </button>
        </motion.div>
      )}
      <Helmet>
        <title>Kishan - Fresh Farm Marketplace | কিষান - সরাসরি কৃষক থেকে সরাসরি পণ্য</title>
        <meta name="description" content="Buy fresh farm products, organic vegetables, fish, and meat directly from farmers through Kishan marketplace." />
        <meta property="og:title" content="Kishan - Fresh Farm Marketplace" />
        <meta property="og:description" content="Kishan connects farmers and consumers directly for fresh organic products." />
        <meta property="og:url" content={window.location.origin} />
      </Helmet>
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md px-5 py-3 mb-6 transition-all">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('home.search_placeholder')}
            className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
          />
        </div>
      </div>

      {/* Hero Banner Slider - Directly below Search */}
      <div className="px-5 mb-10">
        <div className="relative h-60 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 group">
          {banners.map((banner, idx) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: activeBanner === idx ? 1 : 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <img src={banner.image} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={banner.title || 'Banner'} />
            </motion.div>
          ))}
          <div className="absolute bottom-5 inset-x-0 flex justify-center gap-2 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 shadow-md ${activeBanner === idx ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Flash Sale Section */}
      {flashSaleProducts.length > 0 && (
        <div className="px-5 mb-10">
          <div className="bg-slate-900 rounded-[2.5rem] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center animate-pulse">
                  <Zap size={16} className="text-slate-900 fill-slate-900" />
                </div>
                <h2 className="text-white font-display font-bold text-lg">Flash Sale</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((unit, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="bg-white/10 backdrop-blur-sm w-8 py-1 rounded-lg text-center">
                      <span className="text-white font-black text-xs">{unit.toString().padStart(2, '0')}</span>
                    </div>
                    {i < 2 && <span className="text-white/30 text-[10px]">:</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {flashSaleProducts.map(product => (
                <div 
                  key={product.id} 
                  className="flex-shrink-0 w-32 group cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden mb-2">
                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 bg-secondary text-slate-900 font-black text-[8px] px-1.5 py-0.5 rounded-md">
                      -20%
                    </div>
                  </div>
                  <h4 className="text-white font-bold text-[10px] truncate mb-1">{dData(product.name, product.nameEn)}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary font-black text-xs">৳{formatCurrency(Math.round((product.price || 0) * 0.8))}</span>
                    <span className="text-white/30 text-[8px] line-through">৳{formatCurrency(product.price || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Combo / Bundle Offers */}
      <section className="mb-12 px-5">
          <div className="flex justify-between items-end mb-6">
              <div>
                  <h2 className="font-display font-bold text-2xl text-slate-900 leading-tight">Bundle Offers</h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">Save more with family packs</p>
              </div>
              <button 
                  onClick={() => navigate('/products?category=Bundles')}
                  className="bg-primary/5 text-primary p-3 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                  <ChevronRight size={20} />
              </button>
          </div>
          <div className="flex overflow-x-auto gap-5 pb-6 scrollbar-hide -mx-5 px-5">
              {dbProducts.filter(p => p.category === 'Bundles' || p.isBundle).slice(0, 4).map((bundle) => (
                  <motion.div 
                      key={bundle.id}
                      whileHover={{ y: -5 }}
                      onClick={() => navigate(`/product/${bundle.id}`)}
                      className="flex-shrink-0 w-64 bg-white rounded-[2rem] p-4 border border-slate-100 shadow-xl shadow-slate-200/50 group cursor-pointer"
                  >
                      <div className="aspect-video rounded-2xl overflow-hidden mb-3">
                          <img 
                            src={bundle.image} 
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            alt={bundle.name} 
                          />
                      </div>
                      <h3 className="font-bold text-base text-slate-800 mb-1 truncate">{dData(bundle.name, bundle.nameEn)}</h3>
                      <div className="flex items-center justify-between mb-4">
                          <div className="flex items-baseline gap-1">
                              <span className="text-lg font-display font-bold text-slate-900">৳{formatCurrency(bundle.discountPrice || bundle.price || 0)}</span>
                              {(bundle.discountPrice || bundle.price * 1.2) && (
                                <span className="text-[10px] text-slate-400 font-bold line-through">৳{formatCurrency(bundle.discountPrice ? bundle.price : Math.round(bundle.price * 1.2))}</span>
                              )}
                          </div>
                          <span className="text-[9px] font-black text-secondary uppercase tracking-tight bg-secondary/10 px-2 py-0.5 rounded-md">Combo</span>
                      </div>
                      <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(bundle);
                          }}
                          className="w-full bg-primary text-white py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                      >
                          <ShoppingCart size={16} />
                          <span className="text-xs font-black uppercase tracking-wider">Add to Cart</span>
                      </motion.button>
                  </motion.div>
              ))}
              {dbProducts.filter(p => p.category === 'Bundles' || p.isBundle).length === 0 && (
                  <div className="w-full py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                       <ShoppingBag size={24} />
                       <span className="text-xs font-bold">New bundles coming soon!</span>
                  </div>
              )}
          </div>
      </section>

      {/* Popular Categories */}
      <div className="px-5 mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-xl">{t('home.categories')}</h2>
          <Link to="/products" className="text-primary font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all">
            {t('home.see_all')} <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-y-8 gap-x-5">
          {categories.map((cat: any) => (
            <motion.div 
              key={cat.id} 
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/products?category=${cat.title}`)}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              <div className="w-full aspect-square rounded-[2rem] bg-white border border-slate-50 p-4 shadow-sm group-hover:shadow-xl group-hover:border-primary/10 transition-all duration-300">
                <img src={cat.image} referrerPolicy="no-referrer" alt={dData(cat.title, cat.titleEn)} className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-transform duration-500" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 group-hover:text-primary transition-colors tracking-tight text-center">
                {dData(cat.title, cat.titleEn)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div className="px-5 mb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h2 className="font-display font-bold text-xl">{t('home.featured')}</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Direct from fields</span>
          </div>
        </div>
          <div className="grid grid-cols-2 gap-4">
            {filteredFeatured.map((product) => (
              <motion.div
                layout
                key={product.id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-50 relative group"
              >
                <div className="relative aspect-square overflow-hidden m-1.5 rounded-2xl cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <img 
                      src={product.image} 
                      referrerPolicy="no-referrer" 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt={dData(product.name, product.nameEn)} 
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                    <Star size={8} className="text-secondary fill-secondary" />
                    <span className="text-[9px] font-black text-slate-800">{product.rating || '5.0'}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWish(product.id);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      wishlistIds.includes(product.id) ? 'bg-red-500 text-white shadow-lg' : 'bg-white/80 text-slate-400 hover:text-red-500'
                    }`}
                  >
                    <Heart size={12} fill={wishlistIds.includes(product.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-xs text-slate-800 mb-1 truncate leading-tight cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                    {dData(product.name, product.nameEn)}
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-display font-bold text-slate-900">৳{formatCurrency(product.price)}</span>
                      <span className="text-[8px] text-slate-400 font-bold">/{product.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={8} className="text-secondary fill-secondary" />
                      <span className="text-[9px] font-black text-slate-800">{product.rating || '5.0'}</span>
                    </div>
                  </div>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                    }}
                    className="w-full bg-primary text-white py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:bg-primary-dark transition-all"
                  >
                    <ShoppingCart size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Add to Cart</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
          {filteredFeatured.length === 0 && (
            <div className="py-20 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 text-sm font-bold">No products found matching "{searchQuery}"</p>
            </div>
          )}
        <div className="mt-10 flex justify-center">
            <Link to="/products" className="btn-primary w-full max-w-[200px] shadow-primary/10">
                Browse All Foods
            </Link>
        </div>
      </div>

    </motion.div>
  );
}
