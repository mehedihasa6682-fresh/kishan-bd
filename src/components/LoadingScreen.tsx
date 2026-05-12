import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBasket } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const LoadingScreen: React.FC = () => {
  const { settings } = useSettings();

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-[#F9FAFB] rounded-[2.5rem] flex items-center justify-center shadow-sm mb-6 relative overflow-hidden group border border-[#ECECEC]">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent animate-pulse" />
          {settings.logo ? (
            <img src={settings.logo} className="w-16 h-16 object-contain relative z-10" alt={settings.appName} />
          ) : (
            <ShoppingBasket size={48} className="text-primary relative z-10" />
          )}
        </div>
        
        <h1 className="text-2xl font-display font-black text-[#111111] tracking-tight uppercase mb-1">
          {settings.appName || 'সদাই ভাই'}
        </h1>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Pure Freshness</p>
        
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
              className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(226,30,38,0.2)]"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
