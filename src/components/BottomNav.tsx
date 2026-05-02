import { Home, Grid, ShoppingCart, Clock, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function BottomNav() {
  const { t } = useLanguage();
  
  const links = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/products', icon: Grid, label: t('nav.shop') },
    { to: '/cart', icon: ShoppingCart, label: t('nav.cart') },
    { to: '/orders', icon: Clock, label: t('nav.orders') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex justify-around items-center h-20 md:hidden px-2 pb-safe">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
              isActive ? 'text-primary' : 'text-slate-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <motion.div
                whileTap={{ scale: 0.8 }}
                className={isActive ? 'bg-primary/10 p-2 rounded-xl' : 'p-2'}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
