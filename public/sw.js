const CACHE_NAME = 'tracey-trials-v2';

function shouldBypassRequest(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return true;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return true;
  }

  if (url.origin !== self.location.origin) {
    return true;
  }

  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname === '/vite.svg'
  ) {
    return true;
  }

  return false;
}

// Cache the app shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/index.html'])
    )
  );
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first strategy for navigations to avoid stale app-shell blank screens.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (shouldBypassRequest(request)) {
    return;
  }

  // Let API and upload requests always go to the network (no caching)
  if (request.url.includes('/api/') || request.url.includes('/uploads/')) {
    return;
  }

  // For navigation requests (page loads), use network-first and fallback to cached index.
  // Do not cache route-specific HTML responses to avoid stale deep-link entries.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return Response.error();
        })
    );
    return;
  }

  // For static assets, use network-first and fallback to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return Response.error();
      })
  );
});

// Show a notification when a push message arrives
self.addEventListener('push', (event) => {
  let data = { title: 'The Tracey Trials', body: 'You have a new update!' };

  try {
    data = event.data?.json() ?? data;
  } catch {
    data.body = event.data?.text() ?? data.body;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-ttt-concept-1.png',
      badge: '/icon-ttt-192px.png',
      tag: 'tracey-trials-notification',
      renotify: true,
    })
  );
});

// Open the app when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
