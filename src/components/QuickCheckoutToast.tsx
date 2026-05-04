import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/utils';

export default function QuickCheckoutToast() {
  const { showCheckoutToast, setShowCheckoutToast, total, items } = useCart();
  const { t } = useLanguage();

  if (items.length === 0) return null;

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
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <ShoppingCart size={14} className="text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'} Added
                </span>
              </div>
              <button 
                onClick={() => setShowCheckoutToast(false)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            
            <Link 
              to="/checkout" 
              onClick={() => setShowCheckoutToast(false)}
              className="flex items-center justify-between p-4 bg-primary hover:bg-primary/90 transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900/60 leading-none mb-1">
                  Total Amount
                </span>
                <span className="text-lg font-display font-bold text-slate-900 leading-none">
                  ৳{formatCurrency(total)}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest group-active:scale-95 transition-transform">
                <span>{t('cart.checkout')}</span>
                <ArrowRight size={14} strokeWidth={3} />
              </div>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
