import React, { useState, useEffect, useRef } from 'react';
import { Bell, Package, Tag, Info, CreditCard, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationService, AppNotification } from '../services/notificationService';
import { auth } from '../firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(notifications);
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
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
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
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative group ${!notification.read ? 'bg-primary/5' : ''}`}
                    onClick={() => NotificationService.markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 p-2 rounded-lg bg-white shadow-sm border border-slate-100`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-bold truncate ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                             {notification.createdAt?.toDate ? format(notification.createdAt.toDate(), 'hh:mm a') : 'Just now'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        {notification.link && (
                          <Link 
                            to={notification.link}
                            className="mt-2 text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                            onClick={() => setIsOpen(false)}
                          >
                            View Details <ChevronRight size={10} />
                          </Link>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                       <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
              <button className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                View All Notification History
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
