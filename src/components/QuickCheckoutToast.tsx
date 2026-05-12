import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowRight, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/utils';

export default function QuickCheckoutToast() {
  const { showCheckoutToast, setShowCheckoutToast, total, items } = useCart();
  const { t } = useLanguage();
  const location = useLocation();

  const isHiddenRoute = location.pathname === '/cart' || location.pathname === '/checkout';

  if (items.length === 0 || isHiddenRoute) return null;

  return (
    <AnimatePresence>
      {showCheckoutToast && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-80"
        >
          <div className="bg-white text-[#111111] rounded-2xl shadow-2xl overflow-hidden border border-[#ECECEC]">
            <div className="p-4 flex items-center justify-between border-b border-[#ECECEC] bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart size={14} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] leading-none">
                    {items.length} {items.length === 1 ? 'Item' : 'Items'} 
                  </span>
                  <span className="text-[9px] font-bold text-primary mt-0.5">Ready for Delivery</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutToast(false)}
                className="p-1 hover:bg-[#F9FAFB] rounded-full transition-colors"
              >
                <X size={14} className="text-[#6B7280]" />
              </button>
            </div>
            
            <div className="p-4 bg-white flex flex-col gap-3">
              <div className="flex justify-between items-center bg-[#F9FAFB] p-3 rounded-xl border border-[#ECECEC]">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Grand Total</span>
                <span className="text-base font-display font-black text-primary">৳{formatCurrency(total)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Link 
                  to="/cart" 
                  onClick={() => setShowCheckoutToast(false)}
                  className="flex items-center justify-center gap-2 py-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#ECECEC] text-[#6B7280]"
                >
                  View Cart
                </Link>
                <Link 
                  to="/checkout" 
                  onClick={() => setShowCheckoutToast(false)}
                  className="flex items-center justify-center gap-2 py-3 bg-primary text-white transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Checkout</span>
                  <ArrowRight size={12} strokeWidth={3} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
