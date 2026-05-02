import { useContext } from 'react';
import { AuthContext } from '../App';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PWAInstall() {
  const { pwa } = useContext(AuthContext);

  if (!pwa.deferredPrompt || pwa.isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="bg-primary p-3 flex items-center justify-between shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Download size={20} className="text-primary" />
          </div>
          <div>
            <h4 className="text-white font-bold text-xs leading-none mb-1">Install Kishan App</h4>
            <p className="text-white/70 text-[9px] font-medium">Faster, lighter & direct notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={pwa.install}
                className="bg-white text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
            >
                Install Now
            </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
