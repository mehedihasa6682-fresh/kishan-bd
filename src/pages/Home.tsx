import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, Star, ShoppingBag, Plus, X, Quote, Heart, Phone, Zap, Clock, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../App';
import { useContext } from 'react';
import { socialService } from '../services/socialService';
import { Helmet } from 'react-helmet-async';

export default function Home() {
  const [activeBanner, setActiveBanner] = useState(0);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const { user } = useContext(AuthContext);
  const { addToCart } = useCart();
  const { t, dData } = useLanguage();
  const navigate = useNavigate();
  
  const [dbBanners, setDbBanners] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 0 });

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
    const unsubStories = onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc')), (snap) => {
      setDbStories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Home Stories:", error));
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
            unsubStories();
            unsubCategories();
            unsubProducts();
            unsubWish();
        };
    }

    return () => {
      unsubBanners();
      unsubStories();
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

  const banners = dbBanners.length > 0 ? dbBanners : [
    { id: 'default-1', title: 'Fresh from Farm', subtitle: 'Get 20% Off on Vegetables', image: 'https://images.unsplash.com/photo-1488459711615-de9b802a83ea?w=800&h=400&fit=crop' },
    { id: 'default-2', title: 'Today Fresh Fish', subtitle: 'Hilsa & more delivered', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=400&fit=crop' },
  ];

  const marketStories = dbStories.length > 0 ? dbStories : [
    { 
      id: 1, 
      type: 'Farmer', 
      image: 'https://images.unsplash.com/photo-1595273670150-db0a3bf39079?w=400&h=600&fit=crop', 
      name: 'Kashem Miya', 
      quote: '“আগে কম দামে বিক্রি করতাম, এখন সরাসরি বিক্রি করে ভালো দাম পাচ্ছি।”',
      role: '👨‍🌾 Farmer'
    }
  ];

  const categories = dbCategories.length > 0 ? dbCategories : [
    { id: 'veg', title: 'Vegetable', image: 'https://images.unsplash.com/photo-1566385270613-5f10394eb126?w=200&h=200&fit=crop' }
  ];

  const fallbackProducts = [
    { id: 1, name: 'Premium Rice', price: 85, unit: 'kg', farmer: 'Rahimullah', location: 'Sylhet', rating: 4.8, image: 'https://images.unsplash.com/photo-1586201327693-86629f7bb1f3?w=400&h=400&fit=crop' },
    { id: 2, name: 'Organic Honey', price: 450, unit: 'kg', farmer: 'Mita Sen', location: 'Sundarban', rating: 4.9, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop' },
  ];

  const featuredProducts = dbProducts.length > 0 ? dbProducts.filter(p => !p.isBundle).slice(0, 4) : fallbackProducts;
  const bundleProducts = dbProducts.filter(p => p.isBundle);
  const flashSaleProducts = dbProducts.filter(p => p.isFlashSale).slice(0, 3);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto"
    >
      <Helmet>
        <title>Kishan - Fresh Farm Marketplace | কিষান - সরাসরি কৃষক থেকে সরাসরি পণ্য</title>
        <meta name="description" content="Buy fresh farm products, organic vegetables, fish, and meat directly from farmers through Kishan marketplace." />
        <meta property="og:title" content="Kishan - Fresh Farm Marketplace" />
        <meta property="og:description" content="Kishan connects farmers and consumers directly for fresh organic products." />
        <meta property="og:url" content={window.location.origin} />
      </Helmet>
      {/* Search Header */}
      <div className="px-5 mb-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
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
              <img src={banner.image} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={banner.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end pb-12 px-8">
                <motion.span 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: activeBanner === idx ? 0 : 20, opacity: activeBanner === idx ? 1 : 0 }}
                  className="text-secondary font-black text-[10px] uppercase tracking-[0.4em] mb-3"
                >
                  Limited Offer
                </motion.span>
                <motion.h3 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: activeBanner === idx ? 0 : 20, opacity: activeBanner === idx ? 1 : 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white font-display font-bold text-3xl leading-tight mb-6 drop-shadow-lg"
                >
                  {banner.title}
                </motion.h3>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: activeBanner === idx ? 0 : 10, opacity: activeBanner === idx ? 1 : 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-white/80 text-xs font-medium mb-6 line-clamp-1"
                >
                  {banner.subtitle}
                </motion.div>
                <motion.button 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: activeBanner === idx ? 1 : 0.8, opacity: activeBanner === idx ? 1 : 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white text-slate-900 w-fit px-8 py-3.5 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-2xl active:scale-95"
                >
                  Order Now
                </motion.button>
              </div>
            </motion.div>
          ))}
          <div className="absolute bottom-5 left-8 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${activeBanner === idx ? 'w-8 bg-white' : 'w-1.5 bg-white/30'}`}
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
                    <span className="text-secondary font-black text-xs">৳{Math.round(product.price * 0.8)}</span>
                    <span className="text-white/30 text-[8px] line-through">৳{product.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Market Stories Section */}
      <div className="mb-10">
        <div className="px-5 flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">{t('home.stories')}</h2>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg uppercase tracking-wider">Community</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-5">
          {marketStories.map((story) => (
            <motion.div
              key={story.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedStory(story)}
              className="flex-shrink-0 relative w-24 h-36 rounded-2xl overflow-hidden border-2 border-white shadow-lg cursor-pointer group"
            >
              <img src={story.image} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={story.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-shadow-sm">
                <span className="text-[6px] font-bold text-secondary uppercase mb-0.5 tracking-wider">{story.type}</span>
                <span className="text-white font-bold text-[9px] truncate">{story.name}</span>
              </div>
              <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-md">
                <img src={story.image} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="avatar" />
              </div>
            </motion.div>
          ))}
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-24 h-36 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-300"
          >
            <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center">
              <Plus size={14} />
            </div>
            <span className="text-[9px] font-bold">{t('home.add_yours')}</span>
          </motion.div>
        </div>
      </div>

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
                      className="flex-shrink-0 w-72 bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-xl shadow-slate-200/50 relative group cursor-pointer"
                  >
                      <div className="absolute top-6 left-6 z-10 bg-secondary text-slate-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">BUNDLE SAVE</div>
                      <div className="aspect-[4/3] rounded-[2rem] overflow-hidden mb-5">
                          <img 
                            src={bundle.image} 
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            alt={bundle.name} 
                          />
                      </div>
                      <h3 className="font-display font-bold text-lg text-slate-800 mb-0.5">{dData(bundle.name, bundle.nameEn)}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Family Pack • Farm Fresh</p>
                      <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                              <span className="text-2xl font-display font-bold text-slate-900 leading-none">৳{bundle.price}</span>
                              <span className="text-[10px] text-slate-300 font-bold line-through mt-1">৳{Math.round(bundle.price * 1.2)}</span>
                          </div>
                  <div className="flex gap-2">
                    <motion.button 
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            addToCart(bundle);
                        }}
                        className="flex-1 bg-primary text-white py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                    >
                        <ShoppingCart size={16} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Add</span>
                    </motion.button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            addToCart(bundle);
                            navigate('/checkout');
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                    >
                        Buy
                    </button>
                  </div>
                      </div>
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

      {/* Bundle Offers Section */}
      {bundleProducts.length > 0 && (
        <div className="px-5 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Bundle Offers</h2>
            <Link to="/products?category=Bundles" className="text-[10px] font-black text-primary uppercase tracking-widest">View All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {bundleProducts.map((bundle) => (
              <motion.div 
                key={bundle.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/product/${bundle.id}`)}
                className="flex-shrink-0 w-[280px] bg-white rounded-[2rem] border border-slate-100 p-4 shadow-sm relative overflow-hidden"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-inner bg-slate-50 flex-shrink-0">
                    <img src={bundle.image} className="w-full h-full object-cover" alt={bundle.name} />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{dData(bundle.name, bundle.nameEn)}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-2">Multi-Pack Savings</p>
                    <div className="flex items-center gap-2">
                       <span className="text-primary font-black text-base">৳{bundle.price}</span>
                       <span className="text-[10px] text-slate-400 font-bold">Bundle Deal</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-primary/5 rounded-full" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Products */}
      <div className="px-5 mb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h2 className="font-display font-bold text-xl">{t('home.featured')}</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Direct from fields</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {featuredProducts.map((product) => (
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
              <div className="p-3 pt-1">
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] block mb-1">{product.location}</span>
                <h3 className="font-bold text-xs text-slate-800 mb-0.5 truncate leading-tight cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  {dData(product.name, product.nameEn)}
                </h3>
                <p className="text-[9px] text-slate-400 font-medium mb-3">By {product.farmerName || product.farmer}</p>
                
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <motion.button 
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                      }}
                      className="flex-1 bg-primary text-white py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 hover:bg-primary-dark transition-all"
                    >
                      <ShoppingCart size={14} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Add</span>
                    </motion.button>
                    <div className="flex flex-col text-right">
                      <span className="text-base font-display font-bold text-slate-900 leading-none">৳{product.price}</span>
                      <span className="text-[8px] text-slate-400 font-bold mt-0.5">/{product.unit}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                        navigate('/checkout');
                    }}
                    className="w-full py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
            <Link to="/products" className="btn-primary w-full max-w-[200px] shadow-primary/10">
                Browse All Foods
            </Link>
        </div>
      </div>

      {/* Story Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm aspect-[9/16] rounded-[3rem] overflow-hidden shadow-2xl bg-white"
            >
              <img src={selectedStory.image} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Story" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-10 flex flex-col justify-end items-center text-center">
                <div className="mb-6 w-16 h-16 rounded-full border-4 border-primary p-1 bg-white shadow-xl">
                    <img src={selectedStory.image} referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" alt="avatar" />
                </div>
                <span className="text-secondary font-black tracking-[0.3em] uppercase text-[10px] mb-4">{selectedStory.role}</span>
                <h3 className="text-white font-display font-bold text-2xl mb-8 leading-tight">
                    {selectedStory.quote}
                </h3>
                <div className="w-12 h-1 bg-primary rounded-full mb-6" />
                <p className="text-white/60 font-bold text-xs uppercase tracking-[0.2em]">{selectedStory.name}</p>
              </div>
              
              <button 
                onClick={() => setSelectedStory(null)}
                className="absolute top-8 right-8 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/40 transition-all border border-white/20"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
