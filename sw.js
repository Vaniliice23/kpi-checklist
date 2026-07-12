const CACHE_NAME = 'kpi-checklist-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_FILES).catch(err => {
        // Если не удаётся кэшировать файлы (например, на локальном диске), просто пропускаем
        console.log('Cache install error (expected for local files):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // API вызовы — всегда сеть
  if (e.request.method !== 'GET' || url.searchParams.get('action') === 'state') {
    return;
  }
  
  // Навигация (загрузка страницы) — cache first, fallback to network
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, copy);
          });
          return res;
        }).catch(() => {
          return caches.match('./index.html');
        });
      })
    );
  }
});
