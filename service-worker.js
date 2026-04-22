const CACHE_NAME = "wuzzchat-v8"; // ⬅️ WAJIB ganti versi
const DB_NAME = "WuzzQueue";
const STORE_NAME = "whatsapp";
const PERIODIC_DB_STORE = "periodic-data";

// ======================
// ASSETS TO CACHE
// ======================
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./index-push.html",
  "./offline.html",
  "./manifest.json",
  "./assets/style.css",
  "./icons/logo 192x192.png",
  "./icons/logo 512x512.png",
  "./icons/wa-button.png",
  "./icons/screenshots_mobile.png",
  "./icons/screenshots2.png"
];

// ======================
// INSTALL
// ======================
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// ======================
// ACTIVATE
// ======================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ======================
// FETCH (FIXED)
// ======================
self.addEventListener("fetch", event => {
  // ❌ jangan cache request aneh (WA, external API, dll)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {

      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // ❗ hanya cache kalau response valid
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // ✅ fallback offline untuk halaman
          if (event.request.mode === "navigate") {
            return caches.match("./offline.html");
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// ======================
// PUSH NOTIFICATION
// ======================
self.addEventListener("push", event => {
  let title = "Chat waiting on WuzzChat!";
  let options = {
    body: "New connections waiting. Open to chat!",
    icon: "./icons/logo 192x192.png",
    badge: "./icons/logo 192x192.png",
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "Open WuzzChat" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      options.body = payload.body || options.body;
    } catch {}
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// ======================
// NOTIFICATION CLICK
// ======================
self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "dismiss") return;

  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes("index.html") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("./index.html");
    })
  );
});

// ======================
// INDEXED DB
// ======================
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains(PERIODIC_DB_STORE)) {
        db.createObjectStore(PERIODIC_DB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

// ======================
// MESSAGE (QUEUE WA)
// ======================
self.addEventListener("message", event => {
  if (event.data.type === "QUEUE_WHATSAPP") {
    openDB().then(db => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.add({
        url: event.data.url,
        timestamp: Date.now()
      });

      tx.oncomplete = () => {
        event.ports[0]?.postMessage("queued");

        if ("sync" in self.registration) {
          self.registration.sync.register("whatsapp-sync");
        }
      };
    });
  }
});

// ======================
// BACKGROUND SYNC
// ======================
self.addEventListener("sync", event => {
  if (event.tag === "whatsapp-sync") {
    event.waitUntil(
      openDB().then(db => {
        return new Promise(resolve => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            request.result.forEach(item => {
              clients.openWindow(item.url);
              store.delete(item.id);
            });
            resolve();
          };
        });
      })
    );
  }
});

// ======================
// PERIODIC SYNC
// ======================
self.addEventListener("periodicsync", event => {
  if (event.tag === "whatsapp-data") {
    event.waitUntil(
      openDB().then(db => {
        return fetch("https://mockapi.wuzzchat/data/trends")
          .then(resp => resp.json())
          .catch(() => ({
            trends: ["Popular chat starters"]
          }))
          .then(data => {
            const tx = db.transaction(PERIODIC_DB_STORE, "readwrite");
            tx.objectStore(PERIODIC_DB_STORE).put({
              lastSync: Date.now(),
              data: data
            });
          });
      })
    );
  }
});