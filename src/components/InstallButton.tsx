import React, { useState, useEffect, useContext } from 'react';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../App';

export const InstallButton: React.FC = () => {
  const { language } = useLanguage();
  const { pwa } = useContext(AuthContext);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (pwa?.isInstalled) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [pwa?.isInstalled]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    if (!pwa?.deferredPrompt) {
      alert(language === 'bn' ? 'ব্রাউজার মেনু থেকে "Install" বা "Add to Home Screen" এ ক্লিক করুন' : 'Click "Install" or "Add to Home Screen" from your browser menu');
      return;
    }

    try {
      const success = await pwa.install();
      if (success) {
        setIsVisible(false);
        alert(language === 'bn' ? 'সফলভাবে ইনস্টল হয়েছে! আপনার অ্যাপ ড্রয়ারে এটি পাবেন।' : 'Installed successfully! You can find it in your app drawer.');
      }
    } catch (err) {
      console.error("Install prompt error:", err);
      alert(language === 'bn' ? 'ব্রাউজার মেনু থেকে ইনস্টল করুন' : 'Please install from browser menu');
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
            className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-lg shadow-red-500/20 active:scale-95 transition-transform shrink-0"
          >
            <Download size={12} strokeWidth={3} />
            {language === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSHint && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-6"
            onClick={() => setShowIOSHint(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-[3rem] max-w-sm w-full text-center space-y-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Download size={32} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2">iOS ইনস্টল পদ্ধতি</h3>
                <div className="space-y-4 text-sm text-white/70">
                  <p className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">১</span>
                    নিচের <Share size={16} className="text-blue-400 mx-1" /> Share বাটনে ক্লিক করুন
                  </p>
                  <p className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">২</span>
                    নিচে গিয়ে "Add to Home Screen" এ ক্লিক করুন
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowIOSHint(false)}
                className="w-full py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-transform"
              >
                বুঝেছি
              </button>
            </motion.div>
            
            <button 
              className="absolute top-6 right-6 p-2 text-white/40 hover:text-white"
              onClick={() => setShowIOSHint(false)}
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
