// Brewmaster Service Worker — Adim 123 (16.05.2026)
// Strateji:
//   - Same-origin HTML (navigate): Network First, fallback cache (deploy guncelleme yansir)
//   - Same-origin static (JSON/JS/WASM/MJS): Stale While Revalidate (cache hit instant + background revalidate)
//   - ML modeller (brewmaster-models.dessn7.workers.dev): Cache First (versioned URL `_<sha8>.json`, immutable)
//   - CDN (cdn.jsdelivr.net + www.gstatic.com): Cache First (versioned)
//   - Firebase Realtime DB (*.firebaseio.com/firebaseapp.com): Network Only (anlik veri, offline yazma fail)
//
// CACHE_VERSION her major deploy'da artirilir, eski cache'ler activate event'inde silinir.
// Rollback: F12 Application -> Service Workers -> Unregister + Storage -> Clear site data + git revert.

// Adim 123-fix-3 (17.05.2026): version v123-3 -> v123-4 bump.
// Kaan F12 retest: HTML cache PASS, ML offline FAIL (v12c + label_encoder + _v20_alpha_030 + ort.min.js + v_cluster).
// Kok neden: Kaan ONLINE iken ML auto-load + eager preload bitmeden offline'a gecti -> runtime cache populate olmadi.
// Fix:
//   1. CRITICAL_ASSETS genisledi: + _v20_alpha_030_14cat.json (3.4 MB same-origin) + ort.min.js (340 KB CDN) + b1_v8 cal (150 KB)
//      -> Install event'te garanti pre-cache, online warm-up gerek YOK
//   2. Same-origin static asset (JSON/JS/WASM) Network First -> Stale While Revalidate
//      -> Cache hit instant + background revalidate; offline cache hit deterministik
//   3. HTML navigate icin Network First korunur (deploy guncelleme yansir)
//   4. Big ML modeller (V12 slug 28MB, V20 slug 31MB, V_cluster 11-18MB each) runtime warm-up:
//      -> Online'da auto-load + eager preload sirasinda Cache First handler ile cache populate
//      -> Kaan online 30 sn beklesin, sonra offline (Cache Storage check)
const CACHE_VERSION = 'bm-cache-v123-4';

// Same-origin pre-cache (small + kritik static asset'ler)
const CRITICAL_LOCAL = [
  './Brewmaster_v2_79_10.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './_v20_alpha_030_14cat.json'   // V20 cluster (3.4 MB same-origin)
];

// Cross-origin pre-cache (cache.add opaque sorunu olmasin diye fetch+put manuel)
const CRITICAL_REMOTE = [
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.min.js',  // 340 KB
  'https://brewmaster-models.dessn7.workers.dev/b1_v8_calibration_29744456.json'  // 150 KB B1 isotonic
];

self.addEventListener('install', function(event) {
  console.log('[BM SW] install start ' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      var localPromises = CRITICAL_LOCAL.map(function(url) {
        return cache.add(url)
          .then(function(){ console.log('[BM SW] cached: ' + url); })
          .catch(function(err){ console.error('[BM SW] cache FAIL: ' + url + ' — ' + (err && err.message)); });
      });
      var remotePromises = CRITICAL_REMOTE.map(function(url) {
        return fetch(url, { cache: 'no-cache' }).then(function(res) {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            return cache.put(url, res).then(function(){ console.log('[BM SW] cached remote: ' + url.split('/').pop()); });
          } else {
            console.error('[BM SW] cache FAIL remote (HTTP ' + (res && res.status) + '): ' + url);
          }
        }).catch(function(err){ console.error('[BM SW] cache FAIL remote: ' + url.split('/').pop() + ' — ' + (err && err.message)); });
      });
      return Promise.allSettled(localPromises.concat(remotePromises));
    }).then(function(){ console.log('[BM SW] install done ' + CACHE_VERSION); })
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

// Stale While Revalidate: cache hit instant + background revalidate (cache yoksa fetch'i bekle)
function _staleWhileRevalidate(request) {
  return caches.match(request).then(function(cached) {
    var networkFetch = fetch(request).then(function(networkResp) {
      if (networkResp && networkResp.status === 200) {
        var clone = networkResp.clone();
        caches.open(CACHE_VERSION).then(function(c) {
          c.put(request, clone).catch(function(){});
        });
      }
      return networkResp;
    }).catch(function() { return null; });
    // Cache hit -> instant + background revalidate. Cache miss -> wait network.
    return cached || networkFetch.then(function(r){
      return r || new Response('Offline (cache miss + network down)', { status: 504, statusText: 'Offline' });
    });
  });
}

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

  // Same-origin
  if (url.origin === self.location.origin) {
    var pathname = url.pathname;
    // HTML navigate request: Network First (deploy guncelleme yansir)
    if (event.request.mode === 'navigate' || pathname.endsWith('.html')) {
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
            return caches.match('./Brewmaster_v2_79_10.html')
              || new Response('Offline (cache miss)', { status: 504, statusText: 'Offline' });
          });
        })
      );
      return;
    }
    // Same-origin static (JSON, JS, WASM, MJS, png, webmanifest): Stale While Revalidate
    event.respondWith(_staleWhileRevalidate(event.request));
    return;
  }

  // Diger cross-origin: default network (SW geçişsiz)
});
