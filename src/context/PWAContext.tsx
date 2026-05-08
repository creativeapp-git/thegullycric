import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface PWAContextType {
  isInstallable: boolean;
  installPrompt: any;
  promptInstall: () => Promise<void>;
  isInstalled: boolean;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  installPrompt: null,
  promptInstall: async () => {},
  isInstalled: false,
});

export const usePWA = () => useContext(PWAContext);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Delay showing the install prompt button by 15 seconds
      setTimeout(() => {
        setIsInstallable(true);
      }, 15000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
      }
    } catch {
      // promptInstall error — ignore
    }
  };

  return (
    <PWAContext.Provider value={{ isInstallable, installPrompt, promptInstall, isInstalled }}>
      {children}
    </PWAContext.Provider>
  );
};
