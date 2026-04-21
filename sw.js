const CACHE_NAME = "wuzzchat-v2"; // Gunakan versi agar mudah update
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.png",      // Ganti sesuai nama file logomu
  "./wa-button.png"  // Gambar tombol yang kamu upload
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

// 3. FETCH: Ini yang paling penting (Logic Offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Jika ada di cache, pakai itu. Jika tidak, ambil dari internet.
      return cachedResponse || fetch(event.request).catch(() => {
        // Jika internet mati & file tidak ada di cache, arahkan ke index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});