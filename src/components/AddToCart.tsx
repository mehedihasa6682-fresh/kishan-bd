import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

interface AddToCartProps {
  initialQuantity?: number;
  onUpdate: (quantity: number) => void;
  min?: number;
  max?: number;
}

export const AddToCart: React.FC<AddToCartProps> = ({ 
  initialQuantity = 0, 
  onUpdate,
  min = 0,
  max = 99
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isAdded, setIsAdded] = useState(initialQuantity > 0);

  const handleAddClick = () => {
    setIsAdded(true);
    const newQty = 1;
    setQuantity(newQty);
    onUpdate(newQty);
  };

  const handleIncrement = () => {
    if (quantity < max) {
      const newQty = quantity + 1;
      setQuantity(newQty);
      onUpdate(newQty);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      onUpdate(newQty);
    } else {
      setIsAdded(false);
      setQuantity(0);
      onUpdate(0);
    }
  };

  return (
    <div className="w-full relative h-10 overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg">
      <AnimatePresence mode="wait">
        {!isAdded ? (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddClick}
            className="w-full h-full flex items-center justify-center text-[12px] font-black uppercase tracking-[0.3em] text-white"
          >
            Add
          </motion.button>
        ) : (
          <motion.div
            key="qty-selector"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full h-full flex items-center justify-between px-1"
          >
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleDecrement}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Minus size={16} strokeWidth={3} />
            </motion.button>
            
            <div className="flex items-center justify-center min-w-[30px]">
              <motion.span 
                key={quantity}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-sm font-black text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]"
              >
                {quantity}
              </motion.span>
            </div>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleIncrement}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
            >
              <Plus size={16} strokeWidth={3} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
