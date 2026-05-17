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

// Adim 123-fix-4 (17.05.2026): v123-4 install KIRILDI — Cache Storage bm-cache-v123-4 BOS 0 entry,
// HTML offline acilmadi (v123-3 baseline regresyon). Kok neden hipotezi:
//   CRITICAL_REMOTE cross-origin fetch+put install event'inde exception firlatti -> install event abort -> hicbir asset cache'lenmedi.
//   Promise.allSettled cross-origin opaque/CORS edge case SW context'inde tum cache'i kirdi.
// Fix:
//   1. CRITICAL_REMOTE TAMAMEN KALDIRILDI (ort.min.js + b1_v8 cal). Runtime Cache First handler zaten cover ediyor.
//   2. CRITICAL_LOCAL v123-3 baseline'a geri dondu: HTML + manifest + 2 icon (4 entry, TEST EDILMIS).
//      _v20_alpha_030_14cat.json kaldirildi (3.4 MB, runtime SWR handler'a birakildi).
//   3. Install event sequential for-loop async/await try/catch — Promise.allSettled SW edge case fix.
//   4. CACHE_VERSION bump v123-4 -> v123-5 (eski boş v123-4 invalidate).
//   5. Fetch handler same-origin SWR + HTML Network First KORUNUR (Adim 123-fix-3 yapisi dogru is).
// Adim 125-fix (17.05.2026): HTML deploy (Adim 125 V12/V20 slug kart kaldirma) sonrasi
// Kaan browser'da eski HTML gordu. CACHE_VERSION sabit kalinca yeni install tetiklenmiyor,
// v123-5 cache'inde stale HTML serve ediliyor. Bump ile yeni SW install + skipWaiting
// + clients.claim → eski cache silinir, yeni HTML cache'e girer. Tek hard refresh yeterli.
// KALICI KURAL: HTML degisikligi olan her sub-sprint deploy'da CACHE_VERSION bump zorunlu.
// Format: bm-cache-vXXX-Y (XXX=Adim no, Y=sub-fix counter).
// Adim 130 KOMPLE ROLLBACK (17.05.2026): Adim 126 (Recete Defteri yeniden tasarim PILOT) +
// 126-fix-1 (arama duplicate) + 127 (Logo + arama + CMD+K + bell dropdown) + 127-fix-1
// (bmListeRefresh innerHTML fix) + 129 (detay banner) zinciri komple silindi.
// Kaan talimat: "yeni tasarım işine geçmeden öncesine dönecez" -> Adim 125-fix (5c618f3) hali.
// CACHE_VERSION bump v130-1 -> v131-1 (eski v126/v127/v129/v130 cache'leri invalidate).
const CACHE_VERSION = 'bm-cache-v131-1';

// Same-origin pre-cache (v123-3 baseline 4 asset, test edilmis)
const CRITICAL_LOCAL = [
  './Brewmaster_v2_79_10.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  console.log('[BM SW] install start ' + CACHE_VERSION);
  event.waitUntil((async function(){
    var cache;
    try {
      cache = await caches.open(CACHE_VERSION);
    } catch (e) {
      console.error('[BM SW] caches.open FAIL: ' + (e && e.message));
      return;
    }
    // Sequential for-loop try/catch — her asset ayri (allSettled SW edge case fix)
    for (var i = 0; i < CRITICAL_LOCAL.length; i++) {
      var url = CRITICAL_LOCAL[i];
      try {
        await cache.add(url);
        console.log('[BM SW] cached: ' + url);
      } catch (err) {
        console.error('[BM SW] cache FAIL: ' + url + ' — ' + (err && err.message));
      }
    }
    console.log('[BM SW] install done ' + CACHE_VERSION);
  })());
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
