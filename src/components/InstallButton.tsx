import React, { useState, useEffect, useContext } from 'react';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../App';

export const InstallButton: React.FC = () => {
  const { language } = useLanguage();
  const { pwa } = useContext(AuthContext);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if Android
    const isAndroid = /Android/.test(navigator.userAgent);
    
    // Only show on Android if not already installed
    if (isAndroid && !pwa?.isInstalled) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [pwa?.isInstalled]);

  const handleInstallClick = async () => {
    if (!pwa?.deferredPrompt) {
      alert(language === 'bn' ? 'ব্রাউজার মেনু থেকে "Install Application" এ ক্লিক করুন' : 'Click "Install Application" from your browser menu');
      return;
    }

    try {
      const success = await pwa.install();
      if (success) {
        setIsVisible(false);
      }
    } catch (err) {
      console.error("Install prompt error:", err);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-[#D4AF37] text-black px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-95 transition-all shrink-0 border border-[#D4AF37]/50"
          >
            <Download size={14} strokeWidth={4} className="animate-bounce" />
            {language === 'bn' ? 'অ্যাপ ইনস্টল' : 'Install App'}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
