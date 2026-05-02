import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { HelmetProvider } from 'react-helmet-async';

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

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import PWAInstall from './components/PWAInstall';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: 'customer' | 'seller' | 'admin' | 'rider' | null;
  pwa: any;
}

export const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null });

function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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
  const [role, setRole] = useState<'customer' | 'seller' | 'admin' | 'rider' | null>(null);
  const pwa = usePWA();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (u.email === 'mehedihasa6682@gmail.com') {
            setRole('admin');
          } else if (userDoc.exists()) {
            setRole(userDoc.data().role || 'customer');
          } else {
            setRole('customer');
          }
        } catch (e) {
          console.error("Error fetching role:", e);
          setRole('customer');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <HelmetProvider>
      <AuthContext.Provider value={{ user, loading, role, pwa }}>
        <LanguageProvider>
          <CartProvider>
            <Router>
              <RoutesContent />
            </Router>
          </CartProvider>
        </LanguageProvider>
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

function RoutesContent() {
  const { role } = useContext(AuthContext);
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller') || location.pathname.startsWith('/rider');

  return (
    <div className={`flex flex-col min-h-screen bg-background ${isDashboardRoute ? '' : 'pb-24 md:pb-0'}`}>
      {!isDashboardRoute && <PWAInstall />}
      {!isDashboardRoute && <Navbar />}
      
      <main className={`flex-1 overflow-x-hidden ${isDashboardRoute ? '' : 'pt-16'}`}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wishlist" element={<Wishlist />} />
            
            {/* Seller/Apply Routes */}
            <Route path="/seller/*" element={role ? <SellerDashboard /> : <Navigate to="/profile" />} />
            
            {/* Admin Protected Routes */}
            <Route path="/admin/*" element={role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
            
            {/* Rider Routes */}
            <Route path="/rider/*" element={role === 'rider' || role === 'admin' ? <RiderDashboard /> : <Navigate to="/" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>

      {!isDashboardRoute && <BottomNav />}
    </div>
  );
}
