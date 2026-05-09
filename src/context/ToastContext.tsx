import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Info, AlertCircle, Bell } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'order' | 'registration';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info', duration: number = 2000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-0 right-0 z-[9999] flex flex-col items-center gap-3 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] shadow-2xl backdrop-blur-xl border pointer-events-auto min-w-[280px] max-w-sm ${
                toast.type === 'success' || toast.type === 'order' || toast.type === 'registration'
                  ? 'bg-primary/20 border-primary/30 text-primary shadow-primary/20'
                  : toast.type === 'error'
                  ? 'bg-red-500/20 border-red-500/30 text-red-500 shadow-red-500/20'
                  : 'bg-white/10 border-white/20 text-white shadow-black/40'
              }`}
            >
              <div className="flex-shrink-0">
                {toast.type === 'success' || toast.type === 'order' || toast.type === 'registration' ? (
                  <CheckCircle size={20} className="animate-pulse" />
                ) : toast.type === 'error' ? (
                  <AlertCircle size={20} />
                ) : (
                  <Bell size={20} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.05em] leading-tight">
                  {toast.message}
                </p>
                <div className="h-0.5 bg-current/20 mt-2 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: 0 }}
                        transition={{ duration: (toast.duration || 2000) / 1000, ease: 'linear' }}
                        className="h-full bg-current"
                    />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
