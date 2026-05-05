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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-t border-white/5 flex justify-around items-center h-20 md:hidden px-2 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.4)]">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 ${
              isActive ? 'text-primary' : 'text-white/40'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <motion.div
                whileTap={{ scale: 0.8 }}
                className={isActive ? 'bg-primary/10 p-2.5 rounded-2xl' : 'p-2.5'}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : 'text-white/40'} />
              </motion.div>
              <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-primary' : 'text-white/40 opacity-60'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
