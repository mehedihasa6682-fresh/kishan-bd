import React, { useState, useEffect, useRef } from 'react';
import { Bell, Package, Tag, Info, CreditCard, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationService, AppNotification } from '../services/notificationService';
import { auth } from '../firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

export default function NotificationCenter() {
  const { settings: appSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastProcessedIdRef = useRef<string>(localStorage.getItem('last_notif_alert') || '');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);

      // Check for new notification
      const newest = data[0];
      if (newest && !newest.read && newest.id !== lastProcessedIdRef.current) {
        lastProcessedIdRef.current = newest.id;
        localStorage.setItem('last_notif_alert', newest.id);
        
        // 1. Show In-App Heads-up (Toast)
        setActiveToast(newest);
        
        // 2. Try Real System Notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(newest.title, {
            body: newest.message,
            icon: appSettings.logo || '/logo.png'
          });
        }

        // 3. Play sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (e) {}

        setTimeout(() => {
          setActiveToast(prev => prev?.id === newest.id ? null : prev);
        }, 5000);
      }
    });

    return () => unsubscribe();
  }, [appSettings.logo]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    NotificationService.markAsRead(id);
    setActiveToast(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="text-primary" size={16} />;
      case 'promo': return <Tag className="text-orange-500" size={16} />;
      case 'payment': return <CreditCard className="text-blue-500" size={16} />;
      default: return <Info className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toast Notification (Heads-up) */}
      <div className="fixed top-6 left-0 right-0 z-[100] pointer-events-none flex justify-center px-4">
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ y: -120, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -120, opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={() => {
                if (activeToast.link) window.location.hash = activeToast.link;
                setActiveToast(null);
              }}
              className="w-full max-w-sm bg-white/95 backdrop-blur-2xl border border-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] p-4 rounded-[2.5rem] pointer-events-auto flex gap-4 items-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-white rounded-[1.25rem] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200 overflow-hidden">
                {appSettings.logo ? (
                  <img src={appSettings.logo} className="w-full h-full object-cover" alt="App Logo" />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                    {getTypeIcon(activeToast.type)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-2 py-0.5 bg-blue-50 rounded-full">System</span>
                  <span className="text-[10px] text-slate-400 font-bold">Now</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate leading-snug">{activeToast.title}</h4>
                <p className="text-[11px] text-slate-500 truncate leading-relaxed">{activeToast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white font-black">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsOpen(false)}
               className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] md:hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:top-full md:mt-3 w-auto md:w-96 bg-white rounded-[2.5rem] md:rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden font-sans"
            >
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => NotificationService.markAllAsRead(notifications)}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Mark Read
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-300">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Inbox is clear</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b border-slate-50 relative group transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
                        {getTypeIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                           <span className="text-[10px] text-slate-400 font-bold">
                             {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'h:mm a') : 'Now'}
                           </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 mb-0.5">{notif.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                        
                        {notif.link && (
                          <Link to={notif.link} onClick={() => setIsOpen(false)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                            View <ChevronRight size={10} />
                          </Link>
                        )}
                      </div>
                      {!notif.read && (
                        <div className="mt-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

             <div className="p-3 bg-slate-50/50 text-center border-t border-slate-50">
                <button 
                  onClick={() => NotificationService.clearNotifications(notifications)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Clear History
                </button>
             </div>
           </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
