/* Adviuz Hub — Service Worker (push notifications) */
const SW_VERSION = 'adviuz-sw-v1';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: (event.data && event.data.text && event.data.text()) || '' }; }

  var title = data.title || 'Adviuz Hub';
  var options = {
    body:    data.body || 'You have a new message',
    icon:    data.icon || '/apple-touch-icon.png',
    badge:   '/apple-touch-icon.png',
    tag:     data.tag || 'adviuz-msg',
    renotify: true,
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
          c.focus();
          if ('navigate' in c && url && url !== '/') { try { c.navigate(url); } catch (e) {} }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
