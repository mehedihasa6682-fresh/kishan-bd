import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { ShieldCheck, RefreshCcw, Headset } from 'lucide-react';

export default function Footer() {
  const { language, t } = useLanguage();
  const { settings: appSettings } = useSettings();
  const [dynamicPages, setDynamicPages] = useState<any[]>([]);

  const appName = appSettings.appName && !appSettings.appName.toLowerCase().includes('supermarket') && !appSettings.appName.toLowerCase().includes('kishan') 
    ? appSettings.appName 
    : t('app.name');

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const q = query(collection(db, 'pages'), where('isVisible', '==', true));
        const snap = await getDocs(q);
        setDynamicPages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Error fetching footer pages:", e);
      }
    };
    fetchPages();
  }, []);

  const policyItems = [
    { icon: ShieldCheck, label: language === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy', slug: 'privacy-policy' },
    { icon: RefreshCcw, label: language === 'bn' ? 'রিফান্ড পলিসি' : 'Refund Policy', slug: 'refund-policy' },
    { icon: Headset, label: language === 'bn' ? 'যোগাযোগ' : 'Contact Us', slug: 'contact-us' },
  ];

  return (
    <footer className="bg-[#050E21] border-t border-white/5 py-16 pb-32 md:pb-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center gap-10">
          {/* Brand Logo or App Name */}
          <div className="flex flex-col items-center gap-4">
             {appSettings.logo ? (
                 <img src={appSettings.logo} className="h-12 w-auto object-contain drop-shadow-2xl mb-2" alt="Footer Logo" />
             ) : null}
             <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">
               {appName}
             </h2>
          </div>

          {/* Styled Buttons for Links */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {policyItems.map((item, idx) => {
              const exists = dynamicPages.some(p => p.slug === item.slug);
              return (
                <Link 
                  key={idx} 
                  to={exists ? `/page/${item.slug}` : '/#'}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 group
                    ${exists 
                      ? 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:border-primary/40 hover:text-primary shadow-xl shadow-black/20' 
                      : 'bg-transparent border-transparent text-white/10 cursor-not-allowed'}
                  `}
                >
                  <item.icon size={18} className={exists ? 'text-primary transition-colors' : ''} />
                  <span className="text-sm font-black uppercase tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Copyright line */}
          <div className="pt-8 border-t border-white/5 w-full max-w-lg text-center">
            <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} {appName} • All rights reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
