/* JM Control Center — Service Worker (shell PWA + Web Push, Fase 5) */
const CACHE = "jm-control-shell-v3";

// --- Web Push (VAPID) ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "JM Control Center", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "JM Control Center";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/cobros" },
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
const APP_SHELL = ["/", "/login", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

// Solo cacheamos assets ESTÁTICos inmutables (llevan hash en el nombre o no
// cambian). NUNCA cacheamos datos dinámicos (HTML/RSC/datos), porque eso dejaba
// "datos atrapados" en un dispositivo: una navegación interna (RSC) servía la
// copia vieja en vez de lo último de Supabase. Lo dinámico va network-first.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|svg|webp|gif|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Assets estáticos: cache-first (rápido, inmutables).
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Todo lo dinámico (navegaciones, RSC, datos): NETWORK-FIRST. Estando online
  // siempre se ve lo último; la cache es solo respaldo offline para navegaciones.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (request.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(request)
          .then((r) => r || (request.mode === "navigate" ? caches.match("/") : Response.error())),
      ),
  );
});
