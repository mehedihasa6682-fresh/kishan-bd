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
        <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.3)] mb-6 animate-pulse">
          <ShoppingBasket size={48} className="text-white" />
        </div>
        
        <h1 className="text-2xl font-display font-black text-white tracking-widest uppercase mb-2">
          {settings.appName || 'Supermarket'}
        </h1>
        
        <div className="flex gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2 
              }}
              className="w-2 h-2 bg-red-600 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
