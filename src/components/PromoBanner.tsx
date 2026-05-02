import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Megaphone, X } from 'lucide-react';

export default function PromoBanner() {
  const [promoText, setPromoText] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) {
        setPromoText(snap.data().promoBanner || '');
      }
    });
    return () => unsub();
  }, []);

  if (!promoText || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-secondary px-4 py-2 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-2 text-white">
          <Megaphone size={14} className="animate-bounce" />
          <p className="text-[10px] font-black uppercase tracking-wider">{promoText}</p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
