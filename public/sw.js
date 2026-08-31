// Minimal service worker. Its only job is to exist and be active, because
// mobile Chrome (and most mobile browsers) refuse the plain
// `new Notification()` constructor from a page with no active service
// worker — geofence alerts must go through
// ServiceWorkerRegistration.showNotification() instead. This worker does
// no caching or offline handling, just enables that notification path.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Tapping a geofence notification focuses (or opens) the app on the map tab.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/map');
    })
  );
});
