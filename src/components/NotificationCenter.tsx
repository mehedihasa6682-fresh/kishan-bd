import React, { useState, useEffect, useRef } from 'react';
import { Bell, Package, Tag, Info, CreditCard, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationService, AppNotification } from '../services/notificationService';
import { auth } from '../firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    let lastNotificationId = '';

    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);

      // Check for new notification to show toast
      const newest = data[0];
      if (newest && !newest.read && newest.id !== lastNotificationId) {
        lastNotificationId = newest.id;
        setActiveToast(newest);
        
        // Play notification sound if possible
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (e) {}

        // Auto hide toast after 5 seconds
        setTimeout(() => {
          setActiveToast(prev => prev?.id === newest.id ? null : prev);
        }, 5000);
      }
    });

    return () => unsubscribe();
  }, []);

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
      <div className="fixed top-4 left-4 right-4 z-[100] pointer-events-none flex justify-center">
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ y: -100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -100, opacity: 0, scale: 0.9 }}
              onClick={() => {
                if (activeToast.link) window.location.hash = activeToast.link;
                setActiveToast(null);
              }}
              className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-100 p-4 rounded-[1.5rem] shadow-[0_15px_35px_rgba(0,0,0,0.1)] pointer-events-auto flex gap-4 items-center cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                {getTypeIcon(activeToast.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Kishan Market</span>
                  <span className="text-[10px] text-slate-400 font-bold">Now</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{activeToast.title}</h4>
                <p className="text-[11px] text-slate-500 truncate">{activeToast.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveToast(null);
                }}
                className="p-1 text-slate-300 hover:text-slate-500"
              >
                <X size={16} />
              </button>
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
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden font-sans"
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
               <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">
                 Clear History
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
