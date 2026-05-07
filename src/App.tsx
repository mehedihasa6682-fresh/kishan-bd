import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import { HelmetProvider } from 'react-helmet-async';
import { MessagingService } from './services/messagingService';

// Pages - to be created
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import SellerDashboard from './pages/SellerDashboard';
import AdminPanel from './pages/AdminPanel';
import Wishlist from './pages/Wishlist';
import RiderDashboard from './pages/RiderDashboard';
import Discounts from './pages/Discounts';

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import OfflineIndicator from './components/OfflineIndicator';
import PWAInstall from './components/PWAInstall';
import WhatsAppSupport from './components/WhatsAppSupport';
import NotificationPrompt from './components/NotificationPrompt';
import QuickCheckoutToast from './components/QuickCheckoutToast';
import { LoadingScreen } from './components/LoadingScreen';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dataLoading: boolean;
  setDataLoading: (loading: boolean) => void;
  role: 'customer' | 'seller' | 'admin' | 'rider' | null;
  profile: any | null;
  pwa: any;
}

export const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  dataLoading: true,
  setDataLoading: () => {},
  role: null, 
  profile: null, 
  pwa: null 
});

function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          ('standalone' in window.navigator && (window.navigator as any).standalone === true);
      if (isStandalone) setIsInstalled(true);
    } catch (e) {
      console.warn("PWA check error:", e);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA: install prompt captured');
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA: App installed successfully');
    });
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  return { deferredPrompt, isInstalled, install };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [role, setRole] = useState<'customer' | 'seller' | 'admin' | 'rider' | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const pwa = usePWA();

  useEffect(() => {
    let bannersLoaded = false;
    let categoriesLoaded = false;
    let productsLoaded = false;

    const checkAllLoaded = () => {
      if (bannersLoaded && categoriesLoaded && productsLoaded) {
        setTimeout(() => setDataLoading(false), 800);
      }
    };

    const unsubBanners = onSnapshot(query(collection(db, 'banners')), () => {
      bannersLoaded = true;
      checkAllLoaded();
    });
    const unsubCategories = onSnapshot(query(collection(db, 'categories')), () => {
      categoriesLoaded = true;
      checkAllLoaded();
    });
    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved')), () => {
      productsLoaded = true;
      checkAllLoaded();
    });

    // Fallback if data is empty or taking too long
    const timeout = setTimeout(() => setDataLoading(false), 5000);

    return () => {
      unsubBanners();
      unsubCategories();
      unsubProducts();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        MessagingService.requestPermissionAndGetToken();
        // Init settings
        try {
          const { getDoc, doc, setDoc } = await import('firebase/firestore');
          const settingsRef = doc(db, 'settings', 'app');
          const snap = await getDoc(settingsRef);
          if (!snap.exists()) {
            await setDoc(settingsRef, {
              whatsappNumber: '+8801337147436',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (e) {
          console.warn("Settings init skipped:", e);
        }

        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const docRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(docRef);
          
          if (u.email === 'mehedihasa6682@gmail.com') {
            setRole('admin');
          }

          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(data);
            if (u.email !== 'mehedihasa6682@gmail.com') {
                setRole(data.role || 'customer');
            }
          } else {
            setRole('customer');
            setProfile(null);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (message.includes('offline') || message.includes('unavailable')) {
            console.warn("Using default 'customer' role (Offline)");
          } else {
            console.error("Error fetching role:", e);
          }
          setRole('customer');
          setProfile(null);
        }
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <HelmetProvider>
      <AuthContext.Provider value={{ user, loading, dataLoading, setDataLoading, role, profile, pwa }}>
        <SettingsProvider>
          <LanguageProvider>
            <CartProvider>
              <Router>
                <RoutesContent />
              </Router>
            </CartProvider>
          </LanguageProvider>
        </SettingsProvider>
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

function RoutesContent() {
  const { role, dataLoading } = useContext(AuthContext);
  const location = useLocation();
  const [navLoading, setNavLoading] = useState(false);
  const isDashboardRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller') || location.pathname.startsWith('/rider');

  useEffect(() => {
    setNavLoading(true);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setNavLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className={`flex flex-col min-h-screen bg-background ${isDashboardRoute ? '' : 'pb-24 md:pb-0'}`}>
      <AnimatePresence>
        {dataLoading && <LoadingScreen />}
      </AnimatePresence>

      {/* Top Progress Bar */}
      <AnimatePresence>
        {navLoading && (
          <motion.div
            initial={{ width: 0, opacity: 1 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 left-0 h-0.5 bg-primary z-[9999] shadow-[0_0_10px_rgba(212,175,55,0.5)]"
          />
        )}
      </AnimatePresence>

      <OfflineIndicator />
      {!isDashboardRoute && <NotificationPrompt />}
      {!isDashboardRoute && <WhatsAppSupport />}
      {!isDashboardRoute && <Navbar />}
      <QuickCheckoutToast />
      
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/discounts" element={<Discounts />} />
            
            {/* Seller/Apply Routes */}
            <Route path="/seller/*" element={role ? <SellerDashboard /> : <Navigate to="/profile" />} />
            
            {/* Admin Protected Routes */}
            <Route path="/admin/*" element={role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
            
            {/* Rider Routes */}
            <Route path="/rider/*" element={role === 'rider' || role === 'admin' ? <RiderDashboard /> : <Navigate to="/" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      </main>

      {!isDashboardRoute && <BottomNav />}
    </div>
  );
}
