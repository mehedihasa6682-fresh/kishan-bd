import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MessagingService } from '../services/messagingService';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Wait a bit before showing the prompt to be less intrusive
    const timer = setTimeout(() => {
      const isDismissed = localStorage.getItem('notif_prompt_dismissed');
      const isGranted = "Notification" in window && Notification.permission === 'granted';
      const isDenied = "Notification" in window && Notification.permission === 'denied';

      if (!isDismissed && !isGranted && !isDenied && "Notification" in window) {
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
          // If logged in, help the app get the token
          await MessagingService.requestPermissionAndGetToken();
      }
      setShow(false);
      localStorage.setItem('notif_prompt_dismissed', 'true');
    } catch (e) {
      console.error(e);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notif_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4 bg-[#121212]/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Bell size={32} />
              </div>
              
              <h3 className="text-xl font-display font-bold text-slate-800 mb-3">
                নোটিফিকেশন অন রাখুন
              </h3>
              
              <p className="text-sm text-[#6B7280] leading-relaxed mb-8">
                আমাদের নিত্যনতুন সব পণ্যের অফার এবং ডেলিভারি আপডেট সম্পর্কে তাৎক্ষণিক জানতে নোটিফিকেশন অ্যালাউ করুন।
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAllow}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                >
                  <ShieldCheck size={18} />
                  অ্যালাউ করুন
                </motion.button>
                
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 text-[#6B7280] font-bold text-sm hover:text-[#6B7280] transition-colors"
                >
                  পরে করব
                </button>
              </div>
            </div>

            {/* Subtle Close Button */}
            <button 
              onClick={handleDismiss}
              className="absolute top-6 right-6 text-slate-300 hover:text-[#6B7280] transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
