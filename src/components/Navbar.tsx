import { MapPin, Languages, ShoppingBag, User, Download, MessageCircle } from 'lucide-react';
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

      <nav className={`fixed ${appSettings.announcementBar ? 'top-8' : 'top-0'} left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 h-16 flex items-center justify-between transition-all duration-300`}>
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1 text-white">
          {appSettings.logo ? (
              <img src={appSettings.logo} className="h-10 w-auto object-contain" alt="Kishan Logo" />
          ) : (
              <>
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-xl">{appSettings.appName ? appSettings.appName[0] : 'K'}</span>
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight hidden sm:block text-white">{appSettings.appName || 'Kishan'}</span>
              </>
          )}
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {pwa?.deferredPrompt && !pwa?.isInstalled && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={pwa.install}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
          >
            <Download size={14} />
            <span className="hidden xs:inline">Install</span>
          </motion.button>
        )}

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all border border-white/10 shadow-sm"
        >
          <Languages size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('nav.lang')}</span>
        </motion.button>

        <NotificationCenter />

        <Link to="/cart" className="p-2.5 text-white/70 hover:bg-primary/5 hover:text-primary rounded-full relative transition-all group">
            <ShoppingBag size={22} className="group-hover:scale-110 transition-transform" />
            <AnimatePresence>
                {items.length > 0 && (
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black shadow-sm"
                    >
                        {items.length}
                    </motion.div>
                )}
            </AnimatePresence>
        </Link>
        
        <Link to="/profile" className="p-2 text-white/70 hover:bg-white/5 rounded-full text-white">
          <User size={22} />
        </Link>
      </div>
    </nav>
    <div className={`${appSettings.announcementBar ? 'h-24' : 'h-16'}`} />
    </>
  );
}
