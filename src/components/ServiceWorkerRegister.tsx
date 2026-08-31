'use client';

import { useEffect } from 'react';

// Registers the minimal service worker that mobile browsers require before
// they'll allow ServiceWorkerRegistration.showNotification() to fire —
// see public/sw.js and lib/utils/geofence.ts for why this exists.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }, []);

  return null;
}
