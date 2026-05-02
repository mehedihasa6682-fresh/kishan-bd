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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 text-white py-1.5 overflow-hidden"
          >
            <div className="max-w-md mx-auto px-4 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">{appSettings.announcementBar}</p>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className={`fixed ${appSettings.announcementBar ? 'top-8' : 'top-0'} left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between transition-all duration-300`}>
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1">
          {appSettings.logo ? (
              <img src={appSettings.logo} className="h-10 w-auto object-contain" alt="Kishan Logo" />
          ) : (
              <>
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{appSettings.appName ? appSettings.appName[0] : 'K'}</span>
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight">{appSettings.appName || 'Kishan'}</span>
              </>
          )}
        </Link>

        {pwa?.deferredPrompt && !pwa?.isInstalled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={pwa.install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white border border-primary shadow-sm shadow-primary/20 transition-all"
          >
            <Download size={14} className="animate-bounce-slow" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden xs:inline">Install App</span>
          </motion.button>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-1 text-slate-500 bg-slate-100 rounded-full px-3 py-1.5 max-w-[180px]">
        <MapPin size={14} className="text-primary" />
        <span className="text-[10px] font-bold truncate uppercase tracking-widest">Dhaka, Bangladesh</span>
      </div>

      <div className="flex items-center gap-3">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-100 shadow-sm"
        >
          <Languages size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('nav.lang')}</span>
        </motion.button>

        <NotificationCenter />

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (appSettings.whatsappNumber) {
              const num = appSettings.whatsappNumber.replace(/\D/g, '');
              window.open(`https://wa.me/${num}?text=${encodeURIComponent('Hello, I need support regarding Kishan Marketplace.')}`, '_blank');
            } else {
              alert('Support number not set by admin.');
            }
          }}
          className="p-2 text-slate-600 hover:text-[#25D366] transition-all group"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <MessageCircle size={22} className="group-hover:scale-110 transition-transform duration-300" />
          </motion.div>
        </motion.button>
        
        <Link to="/profile" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
          <User size={22} />
        </Link>
      </div>
    </nav>
    <div className={`${appSettings.announcementBar ? 'h-24' : 'h-16'}`} />
    </>
  );
}
