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
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[100] bg-slate-900 text-white p-4 rounded-3xl flex items-center justify-between shadow-2xl md:max-w-xs md:left-auto md:right-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Download size={20} className="text-primary" />
          </div>
          <div>
            <h4 className="text-white font-bold text-xs leading-none mb-1">Install Kishan App</h4>
            <p className="text-white/50 text-[9px] font-medium italic">Direct access & updates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={pwa.install}
                className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
            >
                Install
            </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
