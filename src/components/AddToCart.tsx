import React, { useState, useEffect } from 'react';
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

  // Sync with parent state when weight selection changes
  useEffect(() => {
    setQuantity(initialQuantity);
    setIsAdded(initialQuantity > 0);
  }, [initialQuantity]);

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
    <div className="w-full relative h-10 overflow-hidden rounded-xl border border-[#ECECEC] bg-white shadow-sm group-hover:border-primary/30 transition-all">
      <AnimatePresence mode="wait">
        {!isAdded ? (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ backgroundColor: '#E21E26', color: '#FFFFFF' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddClick}
            className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-colors"
          >
            Add to Bag
          </motion.button>
        ) : (
          <motion.div
            key="qty-selector"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full h-full flex items-center justify-between px-1 bg-primary"
          >
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleDecrement}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <Minus size={16} strokeWidth={3} />
            </motion.button>
            
            <div className="flex items-center justify-center min-w-[30px]">
              <motion.span 
                key={quantity}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-sm font-black text-white"
              >
                {quantity}
              </motion.span>
            </div>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleIncrement}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <Plus size={16} strokeWidth={3} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
