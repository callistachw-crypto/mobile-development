const CACHE_NAME = "wuzzchat-v1";
const BASE_URL = self.registration.scope;

// Daftar aset yang WAJIB ada supaya aplikasi bisa jalan offline
const urlsToCache = [
  `${BASE_URL}`,
  `${BASE_URL}index.html`,
  `${BASE_URL}logo.png`,      // Pastikan nama file sesuai folder kamu
  `${BASE_URL}wa-button.png`, // Tombol WhatsApp hijau yang kamu upload
  `${BASE_URL}manifest.json`,
  // Jika kamu punya file offline.html silakan aktifkan baris bawah
  // `${BASE_URL}offline.html`, 
];

// Install Service Worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("WuzzChat: Mempersiapkan cache aset...");
      return cache.addAll(urlsToCache);
    })
  );
});

// Aktivasi & Bersihkan Cache Lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("WuzzChat: Menghapus cache usang:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategi Fetch: Cache-First untuk kecepatan maksimal
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan request selain GET (seperti analytics atau extension)
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Jika ada di cache, langsung berikan (Sangat Cepat)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika tidak ada, ambil dari internet
      return fetch(request)
        .then((networkResponse) => {
          // Jika request sukses dan asalnya dari domain kita atau Google Fonts, simpan ke cache
          if (
            networkResponse.status === 200 &&
            (url.origin === self.location.origin || url.host === "fonts.gstatic.com" || url.host === "fonts.googleapis.com")
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline dan aset tidak ada di cache sama sekali
          if (request.mode === 'navigate') {
            return caches.match(`${BASE_URL}index.html`);
          }
        });
    })
  );
});