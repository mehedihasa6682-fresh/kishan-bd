import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

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
    let currentManifestURL: string | null = null;

    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(data);
        
        // Dynamically update site title and favicon
        if (data.appName) document.title = data.appName;
        if (data.logo) {
            const favicon = document.getElementById('favicon') as HTMLLinkElement;
            if (favicon) favicon.href = data.logo;
            
            const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
            if (appleIcon) appleIcon.href = data.logo;
        }

        // Generate Dynamic Manifest
        const manifest = {
          "short_name": data.appName || "Kishan",
          "name": data.appName || "Kishan - Farm Fresh Marketplace",
          "description": "Connect with farmers directly and buy fresh, organic farm products.",
          "icons": [
            {
              "src": data.logo || "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
              "sizes": "192x192",
              "type": "image/png",
              "purpose": "any maskable"
            },
            {
              "src": data.logo || "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
              "sizes": "512x512",
              "type": "image/png",
              "purpose": "any maskable"
            }
          ],
          "start_url": "/",
          "display": "standalone",
          "orientation": "portrait",
          "theme_color": "#16A34A",
          "background_color": "#F8FAFC",
          "lang": "bn-BD",
          "dir": "ltr",
          "screenshots": [
            ...(data.screenshotMobile ? [{
              "src": data.screenshotMobile,
              "sizes": "1080x1920",
              "type": "image/png",
              "form_factor": "narrow",
              "label": `${data.appName || 'Kishan'} Mobile View`
            }] : []),
            ...(data.screenshotDesktop ? [{
              "src": data.screenshotDesktop,
              "sizes": "1920x1080",
              "type": "image/png",
              "form_factor": "wide",
              "label": `${data.appName || 'Kishan'} Desktop View`
            }] : [])
          ]
        };

        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], {type: 'application/json'});
        
        if (currentManifestURL) URL.revokeObjectURL(currentManifestURL);
        currentManifestURL = URL.createObjectURL(blob);
        
        let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (!manifestLink) {
          manifestLink = document.createElement('link');
          manifestLink.rel = 'manifest';
          document.head.appendChild(manifestLink);
        }
        manifestLink.href = currentManifestURL;
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/app');
      setLoading(false);
    });

    return () => {
        unsub();
        if (currentManifestURL) URL.revokeObjectURL(currentManifestURL);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
