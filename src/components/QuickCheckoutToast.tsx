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
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <ShoppingCart size={14} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                    {items.length} {items.length === 1 ? 'Item' : 'Items'} 
                  </span>
                  <span className="text-[9px] font-bold text-primary mt-0.5">Added to Cart</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutToast(false)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 bg-slate-900/80 backdrop-blur-md flex flex-col gap-3">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                <span className="text-base font-display font-black text-secondary">৳{formatCurrency(total)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Link 
                  to="/cart" 
                  onClick={() => setShowCheckoutToast(false)}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10"
                >
                  View Cart
                </Link>
                <Link 
                  to="/checkout" 
                  onClick={() => setShowCheckoutToast(false)}
                  className="flex items-center justify-center gap-2 py-3 bg-primary text-slate-900 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  <span>সরাসরি চেকআউট</span>
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
