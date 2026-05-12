import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { PromotionProvider } from './context/PromotionContext';
import { ToastProvider } from './context/ToastContext';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { MessagingService } from './services/messagingService';
import { useLanguage } from './context/LanguageContext';

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
import DynamicPage from './pages/DynamicPage';
import DealDetails from './pages/DealDetails';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import OfflineIndicator from './components/OfflineIndicator';
import PWAInstall from './components/PWAInstall';
import WhatsAppSupport from './components/WhatsAppSupport';
import NotificationPrompt from './components/NotificationPrompt';
import QuickCheckoutToast from './components/QuickCheckoutToast';
import { LoadingScreen } from './components/LoadingScreen';
import { Search } from 'lucide-react';

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
    const checkIsInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone || 
                          document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkIsInstalled();
    
    // Check periodically for state changes (like uninstallation)
    const interval = setInterval(checkIsInstalled, 3000);
    
    window.addEventListener('focus', checkIsInstalled);
    window.addEventListener('visibilitychange', checkIsInstalled);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // If we get a prompt, we are definitely NOT installed in standalone mode
      setIsInstalled(false);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        const platform = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS' : 'Android';
        addDoc(collection(db, 'pwa_installs'), {
          timestamp: new Date(),
          platform: platform,
          userAgent: navigator.userAgent
        });
      } catch (e) {
        console.warn("PWA logging error:", e);
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkIsInstalled);
      window.removeEventListener('visibilitychange', checkIsInstalled);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
        return true;
      }
    }
    return false;
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
    }, (error) => {
      console.error("App Banners error:", error);
      bannersLoaded = true; // Still mark as "loaded" to avoid blocking UI
      checkAllLoaded();
    });
    const unsubCategories = onSnapshot(query(collection(db, 'categories')), () => {
      categoriesLoaded = true;
      checkAllLoaded();
    }, (error) => {
      console.error("App Categories error:", error);
      categoriesLoaded = true;
      checkAllLoaded();
    });
    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved')), () => {
      productsLoaded = true;
      checkAllLoaded();
    }, (error) => {
      console.error("App Products error:", error);
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
        MessagingService.onMessageListener();
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
      <Helmet>
        <title>{profile?.storeName || (role === 'admin' ? 'Admin Console' : (role === 'rider' ? 'Rider Ops' : 'Market'))}</title>
      </Helmet>
      <AuthContext.Provider value={{ user, loading, dataLoading, setDataLoading, role, profile, pwa }}>
        <SettingsProvider>
          <PromotionProvider>
            <ToastProvider>
              <LanguageProvider>
                <SettingsSEOManager />
                <CartProvider>
                  <Router>
                    <RedirectManager />
                    <RoutesContent />
                  </Router>
                </CartProvider>
              </LanguageProvider>
            </ToastProvider>
          </PromotionProvider>
        </SettingsProvider>
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

function SettingsSEOManager() {
    const { settings } = useSettings();
    const { language } = useLanguage();
    
    const title = settings.seoTitle || settings.appName || 'সদাই ভাই';
    const description = settings.seoDescription || 'Modern grocery shopping experience.';
    const keywords = settings.seoKeywords || settings.domainMisspellings || 'grocery, fresh, shopping';
    const canonical = settings.canonicalUrl || `https://${settings.primaryDomain || window.location.hostname}${window.location.pathname}`;

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={canonical} />
            
            {/* Open Graph */}
            <meta property="og:title" content={settings.ogTitle || title} />
            <meta property="og:description" content={settings.ogDescription || description} />
            {settings.logo && <meta property="og:image" content={settings.logo} />}
            <meta property="og:type" content="website" />

            {/* Robots */}
            {!settings.allowIndexing && <meta name="robots" content="noindex, nofollow" />}
            {settings.allowIndexing && <meta name="robots" content="index, follow" />}
            
            {/* Language Alternative */}
            <link rel="alternate" hrefLang={language === 'bn' ? 'bn-BD' : 'en-US'} href={canonical} />
        </Helmet>
    );
}

function RedirectManager() {
    const { settings } = useSettings();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!settings.redirectRules) return;

        const rule = settings.redirectRules.find((r: any) => r.from === location.pathname);
        if (rule) {
            console.log(`Smart Redirect: ${rule.from} -> ${rule.to} (${rule.type})`);
            navigate(rule.to, { replace: rule.type === '301' });
        }

        // WWW Enforcement logic
        if (settings.enforceWww && !window.location.hostname.startsWith('www.')) {
            const newUrl = window.location.href.replace('://', '://www.');
            if (process.env.NODE_ENV === 'production') {
                window.location.replace(newUrl);
            }
        }
    }, [location.pathname, settings]);

    return null;
}

function BrokenUrlPage() {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (settings.brokenUrlAction === 'home') {
            navigate('/', { replace: true });
        }
    }, [settings.brokenUrlAction, navigate]);

    if (settings.brokenUrlAction === 'home') return null;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-white/5 border border-white/10 p-12 rounded-[3.5rem] shadow-2xl text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10 space-y-8">
                    <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto text-primary">
                        <Search size={40} />
                    </div>
                    <div>
                        <h2 className="font-display font-black text-2xl text-white mb-3">Path Not Identified</h2>
                        <p className="text-white/40 text-sm font-medium leading-relaxed">
                            The section <span className="text-primary font-mono">{location.pathname}</span> is beyond our current grid.
                        </p>
                    </div>
                    
                    {settings.brokenUrlAction === 'suggest' && (
                        <div className="p-6 bg-[#FFFFFF] border border-white/5 rounded-3xl space-y-4">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Cognitive Suggestion</p>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => navigate('/')}
                                    className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Return to Home Core
                                </button>
                                <button 
                                    onClick={() => navigate('/products')}
                                    className="w-full py-4 bg-white/5 text-white/60 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Access Global Catalog
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {settings.brokenUrlAction === '404' && (
                         <button 
                             onClick={() => navigate('/')}
                             className="w-full py-4 bg-white/5 text-white/60 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                         >
                             Return to Home
                         </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function RoutesContent() {
  const { role, dataLoading } = useContext(AuthContext);
  const { settings } = useSettings();
  const location = useLocation();
  const [navLoading, setNavLoading] = useState(false);
  const isDashboardRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller') || location.pathname.startsWith('/rider');

  useEffect(() => {
    setNavLoading(true);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setNavLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Adjust padding depending on the Navbar state
  let contentPadding = 'pt-[90px] md:pt-[100px]';
  if (['/', '/discounts'].includes(location.pathname)) {
    contentPadding = settings.announcementBar ? 'pt-[124px] md:pt-[124px]' : 'pt-[96px] md:pt-[96px]';
  } else {
    contentPadding = settings.announcementBar ? 'pt-[88px] md:pt-[88px]' : 'pt-[60px] md:pt-[60px]';
  }

  return (
    <div className={`flex flex-col min-h-screen bg-[#F9FAFB] ${isDashboardRoute ? '' : 'pb-24 md:pb-0'}`}>
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
      
      <main className={`flex-1 overflow-x-hidden`}>
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
            <Route path="/page/:slug" element={<DynamicPage />} />
            <Route path="/deal/:id" element={<DealDetails />} />
            
            {/* Seller/Apply Routes */}
            <Route path="/seller/*" element={role ? <SellerDashboard /> : <Navigate to="/profile" />} />
            
            {/* Admin Protected Routes */}
            <Route path="/admin/*" element={role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
            
            {/* Rider Routes */}
            <Route path="/rider/*" element={role === 'rider' || role === 'admin' ? <RiderDashboard /> : <Navigate to="/" />} />
            
            <Route path="*" element={<BrokenUrlPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      </main>

      {!isDashboardRoute && <Footer />}
      {!isDashboardRoute && <BottomNav />}
    </div>
  );
}
