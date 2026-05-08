import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dData: (bn: string, en?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  bn: {
    // Navbar
    'nav.home': 'হোম',
    'nav.shop': 'বাজার',
    'nav.cart': 'ব্যাগ',
    'nav.orders': 'অর্ডার',
    'nav.profile': 'প্রোফাইল',
    'nav.lang': 'EN',
    'app.name': 'সদাই ভাই',
    
    // Home
    'home.search_placeholder': 'তাজাতাজা গ্রোসারি বা পণ্য খুঁজুন...',
    'home.categories': 'ক্যাটাগরি',
    'home.see_all': 'সব দেখুন',
    'home.featured': 'সেরা গ্রোসারি পণ্য',
    'home.stories': 'সুপারমার্কেট স্টোরি',
    'home.add_yours': 'মতামত দিন',
    
    // Cart & Checkout
    'cart.title': 'আপনার ব্যাগ',
    'cart.empty': 'আপনার ব্যাগ খালি!',
    'cart.checkout': 'অর্ডার করুন',
    'cart.subtotal': 'পণ্যের দাম',
    'cart.delivery': 'ডেলিভারি খরচ',
    'cart.total': 'মোট',
    'checkout.title': 'পেমেন্ট ও ডেলিভারি',
    'checkout.place_order': 'অর্ডার নিশ্চিত করুন',
    'checkout.cod': 'ক্যাশ অন ডেলিভারি',
    'checkout.phone': 'ফোন নম্বর',
    'checkout.address': 'ডেলিভারি ঠিকানা',
    
    // Profile
    'profile.title': 'আমার প্রোফাইল',
    'profile.logout': 'লগআউট',
    'profile.seller_center': 'মার্কেট ড্যাশবোর্ড',
    'profile.history': 'অর্ডার হিস্ট্রি',
    
    // Auth
    'auth.welcome': 'স্বাগতম',
    'auth.login': 'লগইন',
    'auth.register': 'রেজিস্ট্রেশন',
    'auth.google': 'গুগল দিয়ে লগইন',
    'auth.customer_role': 'আমি কাস্টমার',
    'auth.seller_role': 'আমি পার্টনার সেলার',
  },
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.cart': 'Cart',
    'nav.orders': 'Orders',
    'nav.profile': 'Profile',
    'nav.lang': 'বাংলা',
    'app.name': 'Sodai Bhai',
    
    // Home
    'home.search_placeholder': 'Search fresh grocery, fruits...',
    'home.categories': 'Categories',
    'home.see_all': 'See All',
    'home.featured': 'Fresh Groceries',
    'home.stories': 'Store Reviews',
    'home.add_yours': 'Add Feedback',
    
    // Cart & Checkout
    'cart.title': 'Your Cart',
    'cart.empty': 'Your cart is empty!',
    'cart.checkout': 'Checkout Now',
    'cart.subtotal': 'Subtotal',
    'cart.delivery': 'Delivery Fee',
    'cart.total': 'Total',
    'checkout.title': 'Payment & Delivery',
    'checkout.place_order': 'Place Order',
    'checkout.cod': 'Cash on Delivery',
    'checkout.phone': 'Phone Number',
    'checkout.address': 'Delivery Address',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.logout': 'Logout',
    'profile.seller_center': 'Partner Dashboard',
    'profile.history': 'Order History',
    
    // Auth
    'auth.welcome': 'Welcome',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.google': 'Login with Google',
    'auth.customer_role': 'I am Customer',
    'auth.seller_role': 'I am Partner Seller',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'bn';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const dData = (bn: string, en?: string) => {
    return language === 'en' ? (en || bn) : bn;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dData }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
