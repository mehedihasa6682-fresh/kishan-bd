import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../App';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';

export default function PWAInstall() {
  const { pwa } = useContext(AuthContext);
  const { settings: appSettings } = useSettings();
  const [isDismissed, setIsDismissed] = useState(false);

  const isStandalone = typeof window !== 'undefined' && 
                        (window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true);

  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  if (!isAndroid || pwa?.isInstalled || isStandalone || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[100] bg-[#050E21] border border-[#D4AF37]/30 p-4 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:max-w-md md:left-auto md:right-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            {appSettings.logo ? (
                <img src={appSettings.logo} className="w-8 h-8 object-contain" alt="Logo" />
            ) : (
                <Download size={24} className="text-[#D4AF37]" />
            )}
          </div>
          <div>
            <h4 className="text-white font-black text-sm tracking-tight leading-none mb-1">সদাই ভাই এ্যাপ</h4>
            <p className="text-white/40 text-[10px] font-bold leading-tight">সেরা অভিজ্ঞতার জন্য ইনস্টল করুন</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <button 
              onClick={pwa.install}
              className="bg-[#D4AF37] text-black px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_10px_20px_rgba(212,175,55,0.2)] active:scale-90 transition-all border border-white/20"
            >
              ইনস্টল
            </button>
            <button 
              onClick={() => setIsDismissed(true)}
              className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors rounded-full hover:bg-white/5"
            >
              <X size={20} />
            </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
