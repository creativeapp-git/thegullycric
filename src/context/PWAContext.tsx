import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let promptDelay: ReturnType<typeof setTimeout> | undefined;

    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      promptDelay = setTimeout(() => {
        setIsInstallable(true);
      }, 15000);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (promptDelay) clearTimeout(promptDelay);
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
      // Browsers reject when the prompt is no longer available.
    }
  };

  return (
    <PWAContext.Provider value={{ isInstallable, installPrompt, promptInstall, isInstalled }}>
      {children}
    </PWAContext.Provider>
  );
};
