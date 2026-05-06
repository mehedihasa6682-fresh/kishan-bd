import { MapPin, Languages, ShoppingBag, User, Download, MessageCircle, Search, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../App';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { items } = useCart();
  const { user, pwa } = useContext(AuthContext);
  const { settings: appSettings } = useSettings();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  return (
    <>
      <AnimatePresence>
        {appSettings.announcementBar && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 32, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 text-white h-8 overflow-hidden"
          >
            <div className="max-w-md mx-auto h-full px-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] truncate">{appSettings.announcementBar}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className={`fixed ${appSettings.announcementBar ? 'top-8' : 'top-0'} left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'glass-card rounded-none border-x-0 border-t-0 shadow-lg h-20' : 'bg-transparent h-20'} px-4 flex items-center`}>
        <AnimatePresence mode="wait">
          {!isScrolled ? (
            <motion.div 
              key="nav-content"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <Link to="/" className="flex items-center gap-1 text-white">
                  {appSettings.logo ? (
                      <img src={appSettings.logo} className="h-10 w-auto object-contain" alt="Store Logo" />
                  ) : (
                      <>
                          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                              <span className="text-[#050E21] font-black text-xl">{appSettings.appName ? appSettings.appName[0] : 'S'}</span>
                          </div>
                          <div className="flex flex-col ml-1">
                            <span className="font-display font-black text-lg tracking-tight leading-none text-white">{appSettings.appName || 'Supermarket'}</span>
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary mt-1">Premium Mall</span>
                          </div>
                      </>
                  )}
                </Link>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                {pwa?.deferredPrompt && !pwa?.isInstalled && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={pwa.install}
                    className="flex items-center gap-2 bg-primary text-[#050E21] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Install</span>
                  </motion.button>
                )}

                <button 
                  onClick={toggleLanguage}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-white/60 hover:text-primary transition-all border border-white/10"
                >
                  <Languages size={20} />
                </button>

                <div className="flex items-center gap-2">
                    <NotificationCenter />
                    <Link to={user ? "/profile" : "/auth"}>
                    <div className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-primary transition-all">
                        <User size={20} />
                    </div>
                    </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="search-locked"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex items-center gap-3"
            >
               <div className="relative flex-grow group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder={language === 'bn' ? "আপনি কী খুঁজছেন?" : "What are you looking for?"}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/20 focus:border-primary/50 transition-all font-medium backdrop-blur-2xl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 text-white/40">
                    <Mic size={20} className="hover:text-primary cursor-pointer transition-colors" />
                     <Link to="/cart" className="relative hover:text-primary transition-colors">
                        <ShoppingBag size={20} />
                        {items.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#050E21] shadow-lg">
                                {items.length}
                            </span>
                        )}
                    </Link>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <div className={`${appSettings.announcementBar ? 'h-24' : 'h-16'}`} />
    </>
  );
}
