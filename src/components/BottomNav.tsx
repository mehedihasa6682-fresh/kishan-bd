import { Home, Tag, ShoppingBasket, ShoppingBag, User, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function BottomNav() {
  const location = useLocation();
  const { items } = useCart();

  const tabs = [
    { name: 'Home', icon: Home, path: '/', label: 'হোম' },
    { name: 'Deals', icon: Tag, path: '/discounts', label: 'ডিসকাউন্ট' },
    { name: 'Cart', icon: ShoppingBag, path: '/cart', label: 'কার্ট', isCenter: true },
    { name: 'Orders', icon: ClipboardList, path: '/orders', label: 'অর্ডার' },
    { name: 'Profile', icon: User, path: '/profile', label: 'প্রোফাইল' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-4 pt-3 h-20 bg-white border-t border-slate-100 md:hidden flex justify-around items-center shadow-[0_-10px_25px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;

        if (tab.isCenter) {
          return (
            <Link key={tab.name} to={tab.path} className="relative -top-6">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(220,38,38,0.3)] border-4 border-white relative"
              >
                <Icon size={24} strokeWidth={2.5} className="text-white" />
                {items.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-red-600 shadow-lg"
                  >
                    {items.length.toString().padStart(2, '0')}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          );
        }

        return (
          <Link
            key={tab.name}
            to={tab.path}
            className="flex flex-col items-center justify-center gap-1.5 relative group min-w-[50px]"
          >
            <div className="relative">
              <Icon
                size={22}
                className={`transition-all duration-300 ${
                  isActive ? 'text-red-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-600 rounded-full"
                />
              )}
            </div>
            <span
              className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-300 ${
                isActive ? 'text-red-600' : 'text-slate-400'
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
