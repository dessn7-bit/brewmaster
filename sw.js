// Brewmaster Service Worker — Adim 123 (16.05.2026)
// Strateji:
//   - Same-origin (HTML/manifest/icons): Network First, fallback cache (deploy guncelleme yansir)
//   - ML modeller (brewmaster-models.dessn7.workers.dev): Cache First (versioned URL `_<sha8>.json`, immutable)
//   - CDN (cdn.jsdelivr.net): Cache First (versioned)
//   - Firebase Realtime DB (*.firebaseio.com/firebaseapp.com): Network Only (anlik veri, offline yazma fail)
//
// CACHE_VERSION her major deploy'da artirilir, eski cache'ler activate event'inde silinir.
// Rollback: F12 Application -> Service Workers -> Unregister + Storage -> Clear site data + git revert.

const CACHE_VERSION = 'bm-cache-v123-1';
const CRITICAL_ASSETS = [
  './',
  './Brewmaster_v2_79_10.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  console.log('[BM SW] install ' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(CRITICAL_ASSETS);
    }).catch(function(err) {
      console.warn('[BM SW] install cache.addAll fail:', err && err.message);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[BM SW] activate ' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k.indexOf('bm-cache-') === 0 && k !== CACHE_VERSION; })
            .map(function(k) {
              console.log('[BM SW] eski cache silindi: ' + k);
              return caches.delete(k);
            })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  // Sadece GET request'ler cache'lenir (POST/PUT/DELETE direkt network)
  if (event.request.method !== 'GET') return;

  var url;
  try { url = new URL(event.request.url); } catch (e) { return; }

  // Firebase Realtime DB: Network Only (anlik veri, offline error normal)
  if (url.hostname.indexOf('firebaseio.com') >= 0 || url.hostname.indexOf('firebaseapp.com') >= 0) {
    return; // default fetch, no cache
  }

  // ML modeller + CDN: Cache First (versioned URL, immutable)
  if (url.hostname === 'brewmaster-models.dessn7.workers.dev' ||
      url.hostname === 'cdn.jsdelivr.net' ||
      url.hostname === 'www.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(function(hit) {
        if (hit) return hit;
        return fetch(event.request).then(function(res) {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            var clone = res.clone();
            caches.open(CACHE_VERSION).then(function(c) {
              c.put(event.request, clone).catch(function(){});
            });
          }
          return res;
        }).catch(function(err) {
          console.warn('[BM SW] ML/CDN fetch fail (network down):', url.pathname);
          throw err;
        });
      })
    );
    return;
  }

  // Same-origin (HTML + manifest + icons + sw.js): Network First, fallback cache
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(function(res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_VERSION).then(function(c) {
            c.put(event.request, clone).catch(function(){});
          });
        }
        return res;
      }).catch(function() {
        return caches.match(event.request).then(function(hit) {
          if (hit) return hit;
          // Navigation fallback: HTML cache yoksa critical asset HTML'i dondur
          if (event.request.mode === 'navigate') {
            return caches.match('./Brewmaster_v2_79_10.html');
          }
          // Match yoksa default 504
          return new Response('Offline (cache miss)', { status: 504, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Diger cross-origin: default network (SW geçişsiz)
});
