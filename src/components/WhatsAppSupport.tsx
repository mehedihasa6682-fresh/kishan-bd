import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';

export default function WhatsAppSupport() {
  const { settings: appSettings } = useSettings();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const message = `আমাদের ${appSettings.appName || 'মার্কেটপ্লেস'} সম্পর্কে জানতে চাই।`;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) {
        setWhatsappNumber(snap.data().whatsappNumber || '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading || !whatsappNumber) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={openWhatsApp}
      className="fixed bottom-24 right-5 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center justify-center border-4 border-white no-print"
      title="WhatsApp Support"
    >
      <MessageCircle size={28} fill="currentColor" />
      <span className="absolute -top-2 -right-2 flex h-4 w-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-4 w-4 bg-white border-2 border-[#25D366]"></span>
      </span>
    </motion.button>
  );
}
