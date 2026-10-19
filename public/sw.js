// 1Rupya service worker: makes the app installable, loads faster on repeat visits, and shows an
// offline page. Money/draw data is NEVER cached: pages and API calls always go to the network.
const VERSION = "v2";
const SHELL = `1rupya-shell-${VERSION}`;
const STATIC = `1rupya-static-${VERSION}`;
const SHELL_FILES = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages: always fresh from the network; offline page as a fallback.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Build files are content-hashed, icons and fonts rarely change: cache-first.
  const cacheable =
    (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "fonts.googleapis.com";
  if (cacheable) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") cache.put(req, res.clone());
        return res;
      })
    );
  }
});
