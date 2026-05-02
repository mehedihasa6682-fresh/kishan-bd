import { MapPin, Languages, ShoppingBag, User, Download, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../App';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { items } = useCart();
  const { user, pwa } = useContext(AuthContext);
  const [appSettings, setAppSettings] = useState<any>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
        if (snap.exists()) setAppSettings(snap.data());
    }, (error) => {
        console.error("Navbar Settings Listener:", error);
    });
    return () => unsub();
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1">
          {appSettings.logo ? (
              <img src={appSettings.logo} className="h-10 w-auto object-contain" alt="Kishan Logo" />
          ) : (
              <>
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">K</span>
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight">Kishan</span>
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
  );
}
