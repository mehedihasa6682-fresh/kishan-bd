import { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(showNotification || isOffline) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-80"
        >
          <div className={`glass-card p-4 flex items-center gap-4 ${isOffline ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOffline ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
              {isOffline ? <WifiOff size={20} /> : <Wifi size={20} />}
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-white">
                {isOffline ? 'You are offline' : 'Internet restored'}
              </h4>
              <p className="text-[10px] text-white/60 font-medium leading-tight">
                {isOffline 
                  ? 'Please check your connection. Some features may not work.' 
                  : 'Your connection is back. Syncing data...'}
              </p>
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="text-white/20 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
