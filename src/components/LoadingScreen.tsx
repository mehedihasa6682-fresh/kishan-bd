import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBasket } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const LoadingScreen: React.FC = () => {
  const { settings } = useSettings();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050E21] flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-[#D4AF37] rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.2)] mb-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent animate-pulse" />
          <ShoppingBasket size={48} className="text-[#050E21] relative z-10" />
        </div>
        
        <h1 className="text-2xl font-display font-black text-white tracking-[0.2em] uppercase mb-1">
          {settings.appName || 'Supermarket'}
        </h1>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] opacity-60">Authentic Excellence</p>
        
        <div className="flex gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
