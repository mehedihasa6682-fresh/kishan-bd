import { MapPin, Bell, Languages, ShoppingBag, User, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../App';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { items } = useCart();
  const { user, pwa } = useContext(AuthContext);
  const [logo, setLogo] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
        if (snap.exists()) setLogo(snap.data().logo || '');
    }, (error) => {
        console.error("Navbar Settings Listener:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
        const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false));
        const unsub = onSnapshot(q, (snap) => {
            setUnreadCount(snap.size);
        }, (error) => {
            console.error("Navbar Notifications Listener:", error);
        });
        return () => unsub();
    }
  }, [user]);

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1">
          {logo ? (
              <img src={logo} className="h-10 w-auto object-contain" alt="Kishan Logo" />
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

        <Link to="/cart" className="p-2 relative text-slate-600 hover:text-primary transition-colors">
          <ShoppingBag size={22} />
          {items.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {items.length}
            </span>
          )}
        </Link>
        
        <Link to="/profile" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
          <User size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary border-2 border-white rounded-full animate-pulse" />
          )}
        </Link>
      </div>
    </nav>
  );
}
