import { Errand } from '@/types/errand';

/**
 * Calculates the great-circle distance between two points in meters using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Triggers a native browser notification if permission is granted.
 *
 * Mobile Chrome (and most mobile browsers) throw on the plain
 * `new Notification()` constructor unless there's an active service worker —
 * they require ServiceWorkerRegistration.showNotification() instead. We try
 * that path first (registered in ServiceWorkerRegister.tsx / public/sw.js)
 * and fall back to the plain constructor for browsers that don't need it.
 */
export async function triggerBrowserNotification(title: string, body?: string | null) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notificationTitle = `📍 Waypoint Geofence: ${title}`;
  const options: NotificationOptions = {
    body: body || 'You have entered the target radius for this errand.',
    icon: '/icon-192.png',
    tag: `geofence-${title}`,
  };

  if ('serviceWorker' in navigator) {
    try {
      // Guard with a timeout in case the service worker never becomes ready
      // (e.g. registration failed) so we don't hang and skip the fallback.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (registration) {
        await registration.showNotification(notificationTitle, options);
        return;
      }
    } catch (e) {
      console.warn('Service worker notification failed, falling back:', e);
    }
  }

  try {
    new Notification(notificationTitle, options);
  } catch (e) {
    console.warn('Could not launch native notification:', e);
  }
}

/**
 * Requests browser notification permission if not yet decided.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
