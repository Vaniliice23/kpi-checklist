const CACHE_NAME = 'kpi-checklist-v2'; // версия повышена — старый кэш будет удалён
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
        console.log('Cache install error:', err);
      });
    })
  );
  self.skipWaiting(); // новая версия SW активируется сразу, без ожидания закрытия вкладок
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name); // удаляем весь старый закэшированный мусор
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API вызовы — всегда сеть, никогда не кэшируем
  if (e.request.method !== 'GET' || url.searchParams.get('action') === 'state') {
    return;
  }

  // Навигация (загрузка страницы) — СНАЧАЛА СЕТЬ, кэш только как запасной
  // вариант если нет интернета. Это гарантирует, что новая версия сайта
  // подхватывается сразу, а не показывается старая закэшированная копия.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return res;
      }).catch(() => {
        return caches.match(e.request).then(cached => cached || caches.match('./index.html'));
      })
    );
  }
});
