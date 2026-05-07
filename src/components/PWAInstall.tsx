import { useContext } from 'react';
import { AuthContext } from '../App';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';

export default function PWAInstall() {
  const { pwa } = useContext(AuthContext);
  const { settings: appSettings } = useSettings();

  if (!pwa?.deferredPrompt || pwa?.isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[100] glass-card p-4 flex items-center justify-between shadow-2xl md:max-w-xs md:left-auto md:right-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            {appSettings.logo ? (
                <img src={appSettings.logo} className="w-full h-full object-cover" alt="Logo" />
            ) : (
                <Download size={20} className="text-primary" />
            )}
          </div>
          <div>
            <h4 className="text-white font-bold text-xs leading-none mb-1">Install {appSettings.appName || 'Supermarket'}</h4>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">Direct access & updates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={pwa.install}
                className="bg-primary text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
                Install
            </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
