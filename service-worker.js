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
          return caches.match('./offline.html');
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

// 6. BACKGROUND SYNC - Queue WhatsApp launches for online retry
let db;
const DB_NAME = 'WuzzQueue';
const STORE_NAME = 'whatsapp';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Queue WhatsApp URL from client
self.addEventListener('message', event => {
  if (event.data.type === 'QUEUE_WHATSAPP') {
    openDB().then(() => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add({ url: event.data.url, timestamp: Date.now() });
      tx.oncomplete = () => {
        event.ports[0].postMessage('queued');
        if ('sync' in self.registration) {
          self.registration.sync.register('whatsapp-sync');
        }
      };
    });
  }
});

// Process queued WhatsApp launches when online
self.addEventListener('sync', event => {
  if (event.tag === 'whatsapp-sync') {
    event.waitUntil(openDB().then(() => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      return store.getAll().then(items => {
        items.forEach(item => {
          clients.openWindow(item.url);
          store.delete(item.id);
        });
      });
    }).catch(console.error));
  }
});

// 7. PERIODIC BACKGROUND SYNC - Daily fresh data
const PERIODIC_DB_STORE = 'periodic-data';

self.addEventListener('periodicsync', event => {
  if (event.tag === 'whatsapp-data') {
    event.waitUntil(openDB().then(() => {
      // Mock API data fetch
      return fetch('https://mockapi.wuzzchat/data/trends').catch(() => ({
        countries: [], trends: ['Popular chat starters...']
      })).then(resp => resp.json()).then(data => {
        const tx = db.transaction([STORE_NAME, PERIODIC_DB_STORE], 'readwrite');
        tx.objectStore(PERIODIC_DB_STORE).put({
          lastSync: Date.now(),
          data: data
        });
      });
    }).catch(console.error));
  }
});
