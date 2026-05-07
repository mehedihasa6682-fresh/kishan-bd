import { User, Search, Mic, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../App';
import NotificationCenter from './NotificationCenter';
import { InstallButton } from './InstallButton';

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const { items } = useCart();
  const { user } = useContext(AuthContext);
  const { settings: appSettings } = useSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <AnimatePresence>
        {appSettings.announcementBar && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 28, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 text-white h-7 overflow-hidden"
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
        className={`fixed ${appSettings.announcementBar ? 'top-7' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#050E21]/90 shadow-md py-2' : 'bg-[#050E21]/80 shadow-sm py-4'} border-b-2 border-[#D4AF37] px-4 flex flex-col gap-3 h-auto backdrop-blur-md`}
        style={{ borderStyle: 'solid', fontFamily: 'Outfit, sans-serif' }}
      >
        <div className="max-w-md mx-auto w-full">
          {/* Row 1: Logo & Actions (Persistent) */}
          <div className="flex items-center justify-between w-full mb-3">
            <Link to="/" className="flex items-center gap-2">
                {appSettings.logo ? (
                    <img src={appSettings.logo} className="h-8 w-auto object-contain" alt="Logo" />
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shadow-lg border border-white/10">
                            <span className="text-white font-black text-sm">{appSettings.appName ? appSettings.appName[0] : 'S'}</span>
                        </div>
                        <span className="font-display font-black text-base tracking-tight text-white">{appSettings.appName || 'Supermarket'}</span>
                    </div>
                )}
            </Link>

            <div className="flex items-center gap-2">
              <InstallButton />
              <button 
                onClick={toggleLanguage}
                className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all border border-white/10"
                title={language === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
              >
                <span className="text-[10px] font-bold">
                  {language === 'bn' ? 'EN' : 'বাং'}
                </span>
              </button>
              <NotificationCenter />
              <Link to="/cart">
                <div className="w-8 h-8 flex items-center justify-center bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 transition-all relative">
                    <ShoppingBag size={16} />
                    {items.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-white text-[#223227] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#223227] shadow-sm">
                        {items.length}
                      </span>
                    )}
                </div>
              </Link>
              <Link to="/profile">
                <div className="w-8 h-8 flex items-center justify-center bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
                    <User size={16} />
                </div>
              </Link>
            </div>
          </div>

          {/* Row 2: Search Bar - Only on Home and Discounts */}
          {(location.pathname === '/' || location.pathname === '/discounts') && (
            <form onSubmit={handleSearch} className="relative group mt-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? "আপনি কী খুঁজছেন?" : "What are you looking for?"}
                className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-12 pr-14 text-xs text-white placeholder:text-white/40 outline-none focus:bg-white/20 focus:border-white/30 transition-all font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 text-white/60 border-l border-white/10 pl-3 h-5">
                <Mic size={18} className="hover:text-white cursor-pointer transition-colors" />
              </div>
            </form>
          )}
        </div>
      </nav>
      {/* Dynamic Spacer */}
      <div className={`${(location.pathname === '/' || location.pathname === '/discounts') 
        ? (appSettings.announcementBar ? 'h-[124px]' : 'h-[104px]') 
        : (appSettings.announcementBar ? 'h-[84px]' : 'h-[64px]')}`} />
    </>
  );
}
