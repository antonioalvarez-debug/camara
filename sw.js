const CACHE_NAME = "camara-pwa-v1";
const toCache = ["/camara/", "/camara/index.html", "/camara/icons/icon-192.png", "/camara/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(toCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => caches.match("/camara/")))
  );
});
