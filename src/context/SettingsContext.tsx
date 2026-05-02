import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface AppSettings {
  logo?: string;
  announcementBar?: string;
  whatsappNumber?: string;
  appName?: string;
  [key: string]: any;
}

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  loading: true
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(data);
        
        // Dynamically update site title and favicon if needed
        if (data.appName) document.title = data.appName;
        if (data.logo) {
            const favicon = document.getElementById('favicon') as HTMLLinkElement;
            if (favicon) favicon.href = data.logo;
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Settings Listener Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
