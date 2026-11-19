// Service Worker：只快取 App 外殼；GAS API 一律走網絡，不快取
const VERSION = 'v0.3.0-ui-refresh';   // 更新 index.html 後請改此版本號
const CACHE = 'logbook-' + VERSION;
const SHELL = ['./', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('logbook-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // API（跨網域/POST）不攔截
  if (req.mode === 'navigate') {            // 頁面：先用快取即刻開（配合本機資料），同時背景更新，下次開啟生效
    e.respondWith(caches.match('./index.html').then(hit => {
      const net = fetch(req).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return r;
      }).catch(() => hit);
      e.waitUntil(net.catch(() => {}));
      return hit || net;
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
  })));
});
