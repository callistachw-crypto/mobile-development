const CACHE_NAME = "wuzzchat-G2ak";

// Perbaikan: Mendefinisikan variabel yang tadi hilang/terpotong
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./index-push.html",
  "./manifest.json",
  "./widget-adaptive-card.json",
  "./widget-demo.html",
  "./TODO*.md",
  "./assets/style.css",
  "./icons/logo 192x192.png",
  "./icons/logo 512x512.png",
  "./icons/wa-button.png",
  "./icons/screenshoot*.png",
  "./icons/screenshot*.png",
  "./icons/screenshots_mobile.png",
  "./icons/baju kain*.png",
  "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap"
];

// 1. INSTALL: Simpan file ke memori HP
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Mengamankan aset ke cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Hapus cache lama kalau ada update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

// 3. FETCH: Logic Offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. PUSH NOTIFICATIONS - Handle push events for re-engaging users
self.addEventListener('push', function(event) {
  let title = 'Chat waiting on WuzzChat!';
  let options = {
    body: 'New connections waiting. Open to chat!',
    icon: './icons/logo 192x192.png',
    badge: './icons/logo 192x192.png',
    vibrate: [100, 50, 100],
    actions: [
      {action: 'chat', title: 'Open WuzzChat', icon: './icons/wa-button.png'},
      {action: 'dismiss', title: 'Dismiss'}
    ]
  };

  // Customize from server data
  if (event.data) {
    const payload = event.data.json();
    title = payload.title || title;
    options.body = payload.body || options.body;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 5. Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
