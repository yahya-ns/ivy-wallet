import { useState, useEffect, useCallback } from 'react';
import { subscribeSyncStatus, syncAll, SyncStatus } from './syncEngine';

let deferredInstallPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('ivy-pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('ivy-pwa-installed'));
  });
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  });

  const [isInstallable, setIsInstallable] = useState<boolean>(!!deferredInstallPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });

    const handleInstallable = () => setIsInstallable(true);
    const handleInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('ivy-pwa-installable', handleInstallable);
    window.addEventListener('ivy-pwa-installed', handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('ivy-pwa-installable', handleInstallable);
      window.removeEventListener('ivy-pwa-installed', handleInstalled);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    return await syncAll();
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredInstallPrompt) return false;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setIsInstallable(false);
    return outcome === 'accepted';
  }, []);

  return {
    ...status,
    isInstallable,
    isInstalled,
    syncNow: triggerSync,
    installPwa: promptInstall,
  };
}
