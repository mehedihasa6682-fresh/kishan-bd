import { User, Search, Mic, ShoppingBag, Menu, X, ShieldCheck, RefreshCcw, Headset, Layout, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../App';
import NotificationCenter from './NotificationCenter';
import { InstallButton } from './InstallButton';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const { items } = useCart();
  const { user } = useContext(AuthContext);
  const { settings: appSettings } = useSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const searchRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        setAllProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.warn("Navbar fetch failed (possibly offline):", err);
      }
    };
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = allProducts.filter(p => {
        const name = (p.name || '').toLowerCase();
        const nameEn = (p.nameEn || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || nameEn.includes(q) || cat.includes(q);
      }).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allProducts]);
  const [dynamicPages, setDynamicPages] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPages = async () => {
      const q = query(collection(db, 'pages'), where('isVisible', '==', true));
      const snap = await getDocs(q);
      setDynamicPages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPages();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      // Dismiss the keyboard
      (e.target as HTMLFormElement).querySelector('input')?.blur();
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const menuItems = [
    { icon: User, label: language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile', path: '/profile' },
    { icon: ShoppingBag, label: language === 'bn' ? 'কার্ট' : 'My Cart', path: '/cart', count: items.length },
  ];

  const policyItems = [
    { icon: ShieldCheck, label: language === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy', slug: 'privacy-policy' },
    { icon: RefreshCcw, label: language === 'bn' ? 'রিফান্ড পলিসি' : 'Refund Policy', slug: 'refund-policy' },
    { icon: Headset, label: language === 'bn' ? 'যোগাযোগ' : 'Contact Us', slug: 'contact-us' },
  ];

  return (
    <>
      <AnimatePresence>
        {appSettings.announcementBar && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 28, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-[#121212] text-white h-7 overflow-hidden"
          >
            <div className="max-w-md mx-auto h-full px-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                <p className="text-[8px] font-black uppercase tracking-[0.2em] truncate">{appSettings.announcementBar}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav 
        className={`fixed ${appSettings.announcementBar ? 'top-7' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#FFFFFF]/95 shadow-lg py-2 border-b border-[#ECECEC]' : `bg-[#FFFFFF]/95 shadow-sm pt-3 pb-2 ${(location.pathname === '/' || location.pathname === '/discounts') ? 'border-b-0' : 'border-b border-[#ECECEC]'}`} px-4 h-auto backdrop-blur-md`}
        style={{ borderStyle: 'solid', fontFamily: 'Outfit, sans-serif' }}
      >
        <div className="max-w-6xl mx-auto w-full">
          {/* Row 1: Logo & Actions (Hides on Scroll) */}
          <motion.div 
            animate={{ 
              height: isScrolled ? 0 : 'auto',
              opacity: isScrolled ? 0 : 1,
              marginBottom: isScrolled ? 0 : 8
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex items-center justify-between w-full overflow-hidden"
          >
            <Link to="/" className="flex items-center gap-2">
                {appSettings.logo ? (
                    <img src={appSettings.logo} className="h-7 w-auto object-contain" alt="Logo" />
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-lg border border-primary/10">
                            <span className="text-white font-black text-xs">{appSettings.appName ? appSettings.appName[0] : 'S'}</span>
                        </div>
                        <span className="font-display font-black text-sm tracking-tight text-[#111111]">{appSettings.appName || 'সদাই ভাই'}</span>
                    </div>
                )}
            </Link>

            <div className="flex items-center gap-6">
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center gap-6 mr-4 border-r border-[#ECECEC] pr-6">
                {[
                  { label: language === 'bn' ? 'হোম' : 'Home', path: '/' },
                  { label: language === 'bn' ? 'ক্যাটাগরি' : 'Categories', path: '/products' },
                  { label: language === 'bn' ? 'ডিসকাউন্ট' : 'Deals', path: '/discounts' },
                  { label: language === 'bn' ? 'অর্ডার' : 'Orders', path: '/orders' },
                  { label: language === 'bn' ? 'উইশলিস্ট' : 'Wishlist', path: '/wishlist' },
                  { label: language === 'bn' ? 'কার্ট' : 'Cart', path: '/cart', suffix: `(${items.length})` },
                  { label: language === 'bn' ? 'প্রোফাইল' : 'Profile', path: '/profile' }
                ].map(link => (
                  <Link 
                    key={link.path} 
                    to={link.path}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      location.pathname === link.path ? 'text-primary' : 'text-[#6B7280] hover:text-[#111111]'
                    }`}
                  >
                    {link.label} {link.suffix && <span className="text-primary ml-0.5">{link.suffix}</span>}
                  </Link>
                ))}
              </div>

              <InstallButton />
              <button 
                onClick={toggleLanguage}
                className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-[#111111] hover:bg-[#ECECEC] transition-all border border-[#E5E7EB]"
                title={language === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
              >
                <span className="text-[9px] font-bold">
                  {language === 'bn' ? 'EN' : 'বাং'}
                </span>
              </button>
              
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="w-7 h-7 md:hidden flex items-center justify-center bg-primary/10 border border-primary/30 rounded-lg text-primary hover:bg-primary/20 transition-all"
              >
                <Menu size={16} />
              </button>
            </div>
          </motion.div>

          {/* Row 2: Search Bar - When scrolled on Home/Discounts, icons move here */}
          {(location.pathname === '/' || location.pathname === '/discounts') && (
            <div className="flex justify-center items-center gap-3 w-full">
              <form ref={searchRef} onSubmit={handleSearch} className="relative group w-full md:max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-primary transition-colors" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                  placeholder={language === 'bn' ? "আপনি কী খুঁজছেন?" : "What are you looking for?"}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl py-2.5 pl-10 pr-12 text-[11px] text-[#111111] placeholder:text-[#6B7280]/50 outline-none focus:bg-white focus:border-primary/40 transition-all font-medium"
                />
                
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden z-[100]"
                    >
                      {suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setShowSuggestions(false);
                            // Dismiss keyboard
                            if (document.activeElement instanceof HTMLElement) {
                              document.activeElement.blur();
                            }
                            navigate(`/product/${p.id}`);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-[#ECECEC] last:border-0 text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
                            <img src={p.image || appSettings.logo} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-bold text-[#111111] group-hover:text-primary transition-colors truncate">
                               {language === 'bn' ? (p.name || p.nameEn) : (p.nameEn || p.name)}
                             </p>
                             <p className="text-[8px] text-[#6B7280] uppercase tracking-widest">{p.category}</p>
                          </div>
                          <ChevronRight size={12} className="text-[#6B7280]/20 group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                      <button
                        type="submit"
                        className="w-full p-3 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all font-display"
                      >
                         {language === 'bn' ? 'সবগুলো দেখুন' : 'See All Results'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/20 border-l border-white/5 pl-2 h-4">
                  <Mic size={16} className="hover:text-white cursor-pointer transition-colors" />
                </div>
              </form>
              
              {/* Conditional Quick Actions when scrolled */}
              <AnimatePresence mode="wait">
                {isScrolled ? (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
              <div className="flex items-center gap-2">
                <InstallButton />
                <button 
                    onClick={() => setIsDrawerOpen(true)}
                    className="w-9 h-9 flex items-center justify-center bg-primary/10 border border-primary/30 rounded-xl text-primary shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                >
                    <Menu size={18} />
                </button>
              </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )}
        </div>
      </nav>

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-[70] bg-[#FFFFFF] backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-[80] w-[280px] bg-white backdrop-blur-2xl border-l border-[#ECECEC] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-[#ECECEC] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                     <Layout size={20} className="text-primary" />
                  </div>
                  <span className="font-display font-black text-xs uppercase tracking-widest text-[#111111]">{language === 'bn' ? 'মেনু' : 'Menu'}</span>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-[#6B7280] hover:text-[#111111] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Install App Promotion */}
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <ShoppingBag size={16} className="text-white" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#111111] uppercase tracking-wider">{language === 'bn' ? 'অ্যাপ নেই?' : 'No App?'}</span>
                        <span className="text-[8px] text-[#6B7280] uppercase tracking-widest">{language === 'bn' ? 'ইনস্টল করুন' : 'Install Now'}</span>
                     </div>
                  </div>
                  <InstallButton />
                </div>

                {/* Main Links */}
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">{language === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}</p>
                   {menuItems.map((item, idx) => (
                      <Link 
                        key={idx} 
                        to={item.path}
                        className="flex items-center justify-between p-4 bg-white hover:bg-primary/5 rounded-2xl border border-[#ECECEC] hover:border-primary/20 transition-all group"
                      >
                         <div className="flex items-center gap-4">
                            <item.icon size={18} className="text-[#6B7280] group-hover:text-primary transition-colors" />
                            <span className="text-[13px] font-bold text-[#111111] group-hover:text-primary transition-colors">{item.label}</span>
                         </div>
                         {item.count !== undefined && item.count > 0 && (
                            <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">{item.count}</span>
                         )}
                      </Link>
                   ))}
                </div>

                {/* Policies & Dynamic Pages */}
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em] ml-2">{language === 'bn' ? 'অন্যান্য' : 'Others'}</p>
                   {policyItems.map((item, idx) => {
                      const exists = dynamicPages.some(p => p.slug === item.slug);
                      return (
                         <Link 
                           key={idx} 
                           to={exists ? `/page/${item.slug}` : '/#'}
                           className={`flex items-center gap-4 p-4 ${exists ? 'bg-white hover:bg-gray-100 border border-[#ECECEC] transition-all group' : 'opacity-40 cursor-not-allowed'} rounded-2xl`}
                         >
                            <item.icon size={18} className={`text-[#6B7280] ${exists ? 'group-hover:text-[#111111] transition-colors' : ''}`} />
                            <span className={`text-[13px] font-bold text-[#111111] ${exists ? 'group-hover:text-[#D50000] transition-colors' : ''}`}>{item.label}</span>
                         </Link>
                      );
                   })}
                   
                   {/* Extra Dynamic Pages if any */}
                   {dynamicPages.filter(p => !['privacy-policy', 'refund-policy', 'contact-us'].includes(p.slug)).map((page) => (
                      <Link 
                        key={page.id} 
                        to={`/page/${page.slug}`}
                        className="flex items-center gap-4 p-4 bg-white hover:bg-gray-100 rounded-2xl border border-[#ECECEC] transition-all group"
                      >
                         <Layout size={18} className="text-[#6B7280] group-hover:text-[#111111] transition-colors" />
                         <span className="text-[13px] font-bold text-[#111111] group-hover:text-[#111111] transition-colors">{page.title}</span>
                      </Link>
                   ))}
                </div>
              </div>

              <div className="p-8 bg-[#FFFFFF]/80 border-t border-[#ECECEC] text-center">
                 <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.5em]">{appSettings.appName || 'সদাই ভাই'}</p>
                 <p className="text-[8px] text-[#6B7280]/30 mt-2 font-mono">v3.0.4 Premium Elite</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Dynamic Spacer */}
      <div className={`${(location.pathname === '/' || location.pathname === '/discounts') 
        ? (appSettings.announcementBar ? 'h-[110px]' : 'h-[90px]') 
        : (appSettings.announcementBar ? 'h-[75px]' : 'h-[55px]')}`} />
    </>
  );
}
