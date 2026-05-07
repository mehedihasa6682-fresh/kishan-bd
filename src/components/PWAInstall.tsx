import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../App';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';

export default function PWAInstall() {
  const { pwa } = useContext(AuthContext);
  const { settings: appSettings } = useSettings();
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // Check if already dismissed in session
    const isDismissed = sessionStorage.getItem('pwa_hint_dismissed');
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_hint_dismissed', 'true');
  };

  if (dismissed || pwa?.isInstalled) return null;

  // For Android/Chrome/Desktop
  const showPrompt = pwa?.deferredPrompt;

  if (!showPrompt && !isIOS) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[100] bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl md:max-w-md md:left-auto md:right-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shrink-0">
            {appSettings.logo ? (
                <img src={appSettings.logo} className="w-8 h-8 object-contain" alt="Logo" />
            ) : (
                <Download size={24} className="text-primary" />
            )}
          </div>
          <div>
            <h4 className="text-white font-bold text-sm tracking-tight">App ইনস্টল করুন</h4>
            <p className="text-white/40 text-[10px] font-medium leading-tight">দ্রুত ব্যবহার ও আপডেট পেতে অ্যাপটি ইনস্টল করুন</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {isIOS ? (
              <button 
                onClick={() => setShowIOSHint(true)}
                className="bg-primary text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                পদ্ধতি দেখুন
              </button>
            ) : (
              <button 
                onClick={pwa.install}
                className="bg-primary text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                ইনস্টল
              </button>
            )}
            <button onClick={handleDismiss} className="p-2 text-white/40 hover:text-white">
              <X size={16} />
            </button>
        </div>

        {/* Modal for iOS Instructions */}
        <AnimatePresence>
          {showIOSHint && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-6"
              onClick={() => setShowIOSHint(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/5 border border-white/10 p-8 rounded-[3rem] max-w-sm w-full text-center space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
                  <Download size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">iOS ইনস্টল পদ্ধতি</h3>
                  <div className="space-y-4 text-sm text-white/60">
                    <p className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
                      <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-[10px] font-bold">১</span>
                      নিচের <Share size={16} className="text-blue-400" /> Share বাটনে ক্লিক করুন
                    </p>
                    <p className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
                      <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-[10px] font-bold">২</span>
                      নিচে গিয়ে "Add to Home Screen" এ ক্লিক করুন
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowIOSHint(false)}
                  className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest"
                >
                  বুঝেছি
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
