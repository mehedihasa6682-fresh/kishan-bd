import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { ShieldCheck, RefreshCcw, Headset } from 'lucide-react';

export default function Footer() {
  const { language, t } = useLanguage();
  const { settings: appSettings } = useSettings();
  const appName = appSettings.appName && !appSettings.appName.toLowerCase().includes('supermarket') && !appSettings.appName.toLowerCase().includes('kishan') 
    ? appSettings.appName 
    : t('app.name');

  const policyItems = [
    { icon: ShieldCheck, label: language === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy', slug: 'privacy-policy' },
    { icon: RefreshCcw, label: language === 'bn' ? 'রিফান্ড পলিসি' : 'Refund Policy', slug: 'refund-policy' },
    { icon: Headset, label: language === 'bn' ? 'যোগাযোগ' : 'Contact Us', slug: 'contact-us' },
  ];

  return (
    <footer className="bg-white border-t border-[#ECECEC] py-16 pb-32 md:pb-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center gap-10">
          {/* Brand Logo or App Name */}
          <div className="flex flex-col items-center gap-4">
             {appSettings.logo ? (
                 <img src={appSettings.logo} className="h-12 w-auto object-contain mb-2" alt="Footer Logo" />
             ) : null}
             <h2 className="text-2xl font-display font-black text-[#111111] uppercase tracking-tighter">
               {appName}
             </h2>
          </div>

          {/* Styled Buttons for Links */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {policyItems.map((item, idx) => {
              return (
                  <Link 
                  key={idx} 
                  to={`/page/${item.slug}`}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 group bg-white border-[#ECECEC] text-[#4B5563] hover:bg-[#F9FAFB] hover:border-primary/40 hover:text-primary shadow-sm`}
                >
                  <item.icon size={18} className="text-primary transition-colors" />
                  <span className="text-sm font-black uppercase tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Copyright line */}
          <div className="pt-8 border-t border-[#ECECEC] w-full max-w-lg text-center">
            <p className="text-[11px] font-bold text-[#6B7280]/60 uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} {appName} • All rights reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
