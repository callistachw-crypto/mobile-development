const CACHE_NAME = "wuzzchat-G2ak";

// Perbaikan: Mendefinisikan variabel yang tadi hilang/terpotong
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./widget-adaptive-card.json",
  "./widget-demo.html",
  "./TODO-widgets.md",
  "./icons/logo 192x192.png",      
  "./icons/wa-button.png",
  "./icons/screenshoot1.png"
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