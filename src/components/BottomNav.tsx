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
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-4 pt-3 h-20 bg-[#FFFFFF]/95 border-t border-[#ECECEC] flex md:hidden justify-around items-center backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;

        if (tab.isCenter) {
          return (
            <Link key={tab.name} to={tab.path} className="relative -top-8">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-white relative group"
              >
                <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Icon size={26} strokeWidth={2.5} className="text-white" />
                {items.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-[#111111] text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
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
                  isActive ? 'text-primary scale-110 drop-shadow-[0_0_10px_rgba(213,0,0,0.2)]' : 'text-[#6B7280] group-hover:text-[#111111]'
                }`}
              />
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"
                />
              )}
            </div>
            <span
              className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-300 ${
                isActive ? 'text-primary' : 'text-[#6B7280]'
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
