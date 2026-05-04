import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Ticket, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, deliveryFee, total, discount, setDiscount } = useCart();
  const { t, dData } = useLanguage();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'FRESH10') {
      setDiscount(Math.round(subtotal * 0.1));
      setAppliedCoupon(couponCode.toUpperCase());
      setCouponError('');
    } else {
      setCouponError('Invalid coupon code');
      setDiscount(0);
    }
  };

  if (items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto pt-20 px-10 text-center"
      >
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={40} className="text-primary/20" />
        </div>
        <h2 className="font-display font-bold text-xl mb-2">{t('cart.empty')}</h2>
        <p className="text-slate-400 text-sm mb-8">Let's find some fresh products for you!</p>
        <Link to="/products" className="btn-primary">
          {t('home.see_all')}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto px-5 pb-10"
    >
      <h1 className="font-display font-bold text-2xl mb-8">{t('cart.title')}</h1>

      <div className="space-y-4 mb-10">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-4 flex gap-4 items-center bg-white border-slate-100"
            >
              <img src={item.image} referrerPolicy="no-referrer" className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-800 mb-1 truncate">{dData(item.name, item.nameEn)}</h3>
                <p className="text-primary font-bold text-sm mb-3">৳{item.price || 0} <span className="text-xs text-slate-400 font-normal">/ {item.unit || 'unit'}</span></p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-400 hover:text-primary">
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity || 0}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-400 hover:text-primary">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => removeFromCart(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Coupon Section */}
      <div className="mb-8">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3 pl-1">Got a Coupon?</label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Ticket size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Enter code (e.g. FRESH10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs font-bold uppercase placeholder:normal-case"
                />
            </div>
            <button 
                onClick={applyCoupon}
                className="bg-primary text-white font-bold text-xs px-6 rounded-2xl shadow-lg shadow-primary/10 active:scale-95 transition-all"
            >
                Apply
            </button>
        </div>
        {couponError && <p className="text-[10px] text-red-500 font-bold mt-2 pl-1">{couponError}</p>}
        {appliedCoupon && (
            <div className="flex items-center gap-1.5 mt-2 pl-1 text-primary">
                <CheckCircle2 size={12} />
                <p className="text-[10px] font-bold">Coupon '{appliedCoupon}' applied successfully!</p>
            </div>
        )}
      </div>

      {/* Summary */}
      <div className="glass-card p-6 bg-slate-900 border-none text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <div className="space-y-3 mb-6 relative z-10">
          <div className="flex justify-between items-center text-slate-400 text-sm">
            <span>{t('cart.subtotal')}</span>
            <span className="text-white font-medium">৳{subtotal || 0}</span>
          </div>
          {(discount || 0) > 0 && (
            <div className="flex justify-between items-center text-secondary text-sm">
                <span>Discount (10%)</span>
                <span className="font-medium">-৳{discount}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-400 text-sm">
            <span>{t('cart.delivery')}</span>
            <span className="text-white font-medium">৳{deliveryFee || 0}</span>
          </div>
          <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
            <span className="font-bold">{t('cart.total')}</span>
            <span className="text-2xl font-display font-bold text-secondary">৳{total || 0}</span>
          </div>
        </div>

        <Link to="/checkout" className="btn-secondary w-full relative z-10">
          {t('cart.checkout')} <ArrowRight size={18} />
        </Link>
      </div>
    </motion.div>
  );
}
