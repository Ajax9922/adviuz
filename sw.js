/* Adviuz Hub — Service Worker (push notifications) */
const SW_VERSION = 'adviuz-sw-v3';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: (event.data && event.data.text && event.data.text()) || '' }; }
  var title = data.title || 'Adviuz Hub';
  var options = {
    body:    data.body || 'You have a new message',
    icon:    data.icon || '/apple-touch-icon.png',  // large colour icon
    badge:   '/badge-72.png',                        // small status-bar icon (white silhouette)
    tag:     data.tag || 'adviuz-msg',
    renotify: true,
    silent:  false,
    vibrate: [200, 100, 200],
    requireInteraction: true,                        // stay until tapped, so replies aren't missed
    data:    { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) {
          // Tell the already-open app where to go. This is the reliable path on
          // iOS PWAs, where client.navigate() is flaky/unsupported. The app's
          // service-worker message listener routes to the lead/review.
          try { c.postMessage({ url: url }); } catch (e) {}
          // Fallback for browsers that DO support navigate().
          if ('navigate' in c && url && url !== '/') { try { c.navigate(url); } catch (e) {} }
          return c.focus();
        }
      }
      // App not open — launch it at the target URL; the app reads ?lead=/?review= on load.
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
