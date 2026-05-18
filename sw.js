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
// Adim 131-A (18.05.2026): v131-1 -> v131-2, sub-sprint 131-B sidebar markup prep, KURAL 12.3.
// Strategy C ribbon baseline alindi (4/4 agreement + %87.5 consensus + strong_ale eager intact).
// HTML degismedi, sadece SW version bump (sub-sprint 131-B'de HTML degisikligi gelecek).
// Adim 131-B (18.05.2026): v131-2 -> v131-3, sidebar markup deploy (240px sol panel, Image 2 stili).
// HTML degisiklikleri: body grid, <aside id="bm-sidebar">, sidebar CSS, renderSidebar() + 8 SVG icon,
// logo refactor (const BM_LOGO_DATAURL global single-source). Mevcut sekme/klasor bar/aksiyon
// bar/aramaInp/taniBtn INTACT (131-C..G icin sirada). KURAL 12.3 zorunlu bump.
// Adim 131-C (18.05.2026): v131-3 -> v131-4, ust header markup deploy (Image 2 stili).
// HTML degisiklikleri: body wrapper (.bm-main flex column header+ekran), <header id="bm-header">,
// header CSS (~26 satir), BM_SVG +4 ikon (search/cloud/package/bell), renderHeader() + bildirim
// dropdown placeholder + bildirimPanelToggle handler. rListe icinden uist aksiyon bar + aramaKutu
// KALDIRILDI; aramaInp ID + handler'lar (aramaGuncelle, clearArama, aramaMetni) header'a tasindi
// intact. syncDurum text silindi (yesil dot yeterli). KURAL 12.3 zorunlu bump.
// Adim 131-D (18.05.2026): v131-4 -> v131-5, 4 stat karti + YAPIM ASAMASINDA vurgu karti
// (Image 2 stat grid + Image 1 yapim vurgu). renderYapimdaVurgu() + renderStatKartlar() helper'lar
// rListe sekme bar oncesine inject. Eski dashboard widget markup (yapimda.length>0 ise koyu kart)
// KALDIRILDI, yeni krem #FAEEDA bg + orange border-left vurgu kart. Stat 4 kart grid: 0.5px border
// (aktif sekme 1px orange), sayilar Planlananlar/Istek turuncu Aktif/Arsiv yesil. Tiklanmaz.
// Sidebar (131-B) + header (131-C) + sekme bar + klasor bar + recete kartlari + taniBtn INTACT.
// Adim 131-E (18.05.2026): v131-5 -> v131-6, klasor chip yeniden tasarim (Image 2 stili) +
// sekme bar KALDIRILDI (sidebar tek kaynak, 131-B) + sari taslak banner yeniden tasarim.
// renderKlasorChip() + renderTaslakBanner() + _relTime() helper'lar. CSS ~40 satir: chip pill
// (aktif turuncu bg + 1px orange, pasif beyaz + 0.5px gri + turuncu ti-folder ikon), + Yeni
// klasor dashed 1px chip, inline input/silonay UX intact. Taslak: bg #FAEEDA + 22x22 yuvarlak !
// ikon + biraAd bold + "son duzenleme X once" relative time + Geri yukle/Sil butonlar.
// Mevcut handler'lar (setAktifKlasor, klasorSilIste, klasorSilOnay, yeniKlasor*, restoreDraft,
// dismissDraft) tamamen INTACT. Sidebar/header/stat/yapim/recete/taniBtn intact. KURAL 12.3 bump.
// Adim 131-F (18.05.2026): v131-6 -> v131-7, recete kartlari buyuk gradient banner yeniden tasarim
// (Image 2 stili). tarifKart(t) function tamamen yeniden yazildi (imza + silOnayBar(t.id) intact).
// CSS ~80 satir / 27 yeni class: bm-recete-kart/banner.light(turuncu)/medium(koyu turuncu)/dark
// (gradient 4F2A0E->412402) + badge-row/badge.taslak + baslik 22px font-display + meta (tarih +
// klasor) + ac-btn position absolute sag ust + info section + metric-row 4 pill + renk-chip dot
// + malzeme onizleme + eylem-bar 5 chip (Aktife Al/Plana Al/Planla durum bazli + Arsiv + Istek +
// Stoktan Dus + Iade) + Sil kirmizi pastel + klasor-dropdown native select chip-styled (margin-
// left:auto saga). BM_SVG +3 ikon (arrow-back-up, chevron-down, calendar). Mevcut handler'lar
// (tarifAcById, tarifDurumDegistir, stoktenManuelDus, stoktenManuelIade, silOnayById, klasoruDegistir)
// tamamen INTACT. Sidebar/header/stat/yapim/klasor/taslak/taniBtn intact. KURAL 12.3 bump.
// Adim 131-G SON (18.05.2026): v131-7 -> v131-8, taniBtn sil + post-sanity + Adim 131 sprint kapanis.
// JS dinamik eklenen yuzen yuvarlak 44x44 #taniBtn (fixed bottom-right bg #5A3000 + 🔍 icon, sat
// 20596-20731 IIFE) komple SILINDI (~135 satir). taniPaneliAc + taniPaneliKopya + taniPaneliExport
// + insanOku + zamanFark + butonEkle helper'lari tek IIFE icindeydi, baska referans YOK -> hepsi
// silindi. CSS rule yoktu (inline style). Image 2 tasarim icinde yuzen buton yer kalmadi (sidebar
// settings + header icon bar test/tani icin yeterli). Sidebar/header/stat/yapim/klasor/taslak/recete
// kart INTACT. Tum motor + handler INTACT. KURAL 12.3 bump.
// Adim 131-H (18.05.2026): v131-8 -> v131-9, mobile responsive fix (<=768px).
// CSS: body grid 1fr mobile, .bm-sidebar position:fixed transform:translateX(-100%) transition .25s
// z-index:50 (artik display:none degil), .bm-sidebar.open translateX(0). Backdrop element
// (#bm-backdrop): position:fixed inset:0 bg rgba 0.4 z-index:40 opacity:0 transition, .open ile
// opacity:1. Hamburger button (.bm-hamburger-btn) sol basinda, sadece <768px gorunur, ti-menu ikon.
// Mobile header: search input %100 flex:1, iconbtn 28x28, breadcrumb display:none.
// JS: BM_SVG['menu'] (ti-menu 3 yatay cizgi), window.toggleSidebar + window.closeSidebar global,
// backdrop element DOMContentLoaded'ta body'ye eklenir. setListeSekme + setAktifKlasor sonuna
// closeSidebar() inject (sekme/klasor tikla -> sidebar otomatik kapanir UX). Tum mevcut handler
// INTACT. Test viewport'lar: 360/393/412/430 (Android Chrome) + 768/1280/1440. KURAL 12.3 bump.
// Adim 131-I (18.05.2026): v131-9 -> v131-10, sidebar sekme button BUG fix + stat kart clickable UX.
// TANI: Mobile drawer CSS sat 56'da idi, mevcut .bm-sidebar desktop rule sat 142'de (DAHA SONRA),
// CSS cascade order ile z-index:50 -> 2 override edildi. Sidebar acikken backdrop (z-index:40)
// sidebar (z-index:2) UZERINE cikti, sekme button click backdrop'a gidip closeSidebar tetikledi.
// FIX: Mobile drawer CSS sidebar tum rule'larinin (sat 142-167) SONRASINA tasindi. Aynı specificity,
// sonra gelen kazanir -> mobile match olunca .bm-sidebar z-index:50 aktif, sekme button click dogru.
// FEATURE: renderStatKartlar her karta onclick=setListeSekme(i) + role=button + tabindex=0 + Enter/
// Space keyboard support. CSS: cursor:pointer + hover transform translateY(-1px) + box-shadow +
// focus-visible outline. Aktif kart turuncu border (131-D) intact. Mobile'da stat click sidebar
// aciklik gerekmiyor. KURAL 12.3 bump.
// Adim 131-J (18.05.2026): v131-10 -> v131-11, stat kart ARSIV/ISTEK mapping bug fix + empty state.
// TANI (puppeteer mobile 393): Mapping BUG YOK (stat onclick 0/1/2/3, setListeSekme dizi sirali
// aktif/yapimda/arsiv/istek, sidebar/header/header titles tutarli). Side effect BUG YOK (klasor
// click listeSekme intact). GERCEK BUG: bosMetin hardcoded objesinde yapimda anahtari EKSIK ->
// listeSekme=yapimda + filtreliKR=[] durumunda bos ekran mesaj YOK (UX bug).
// FIX: bosMetin'e yapimda anahtari eklendi ("Aktif tarif yok - Planlananlar'dan bir tarifi 'Aktife
// Al' ile baslat."). Diger 3 mesaj intact (aktif/arsiv/istek). 4 sekme icin empty state dinamik.
// KURAL 12.3 bump.
// Adim 131-K (18.05.2026): v131-11 -> v131-12, aktif stat kart grid tasma defense-in-depth fix.
// TANI (puppeteer mobile 393, real touch + programmatic + direct fn 12/12 PASS + 5 edge senaryo
// 5/5 PASS): production'da REPRO YOK. WIDTH DELTA = 0.000px her sekmede (181.5px sabit). Browser
// CSS 0.5px'i computed style'da 1px'e yuvarlamis, box-sizing universal border-box (sat 18) zaten
// aktif. Yani inactive ve active render border ESIT 1px, grid stable.
// DEFENSE-IN-DEPTH FIX: gelecekteki dpr=1 / eski cihaz / browser sub-pixel rounding farki ihtimaline
// karsi CSS'te border-width'i EKSPLISIT 1px sabitle, active sadece border-color swap (border-width
// hic degismez -> grid'e etki imkansiz).
//   sat 204: .bm-stat-kart{border:0.5px solid #F1EFE8} -> border:1px solid #F1EFE8
//   sat 208: .bm-stat-kart.active{border:1px solid #EF9F27} -> .active{border-color:#EF9F27}
// Hover (border-color:#EF9F27) ve focus (outline:2px) zaten width-stable, intact. 131-A..J intact.
// KURAL 12.3 bump.
// Adim 131-L (18.05.2026): v131-12 -> v131-13, mobile spesifik defense in depth render fix.
// Kaan iddia: desktop temiz, Android Chrome'da stat kart bozulma. Puppeteer 12/12 PASS
// (iPhone13 + Pixel6 + GalaxyA52, widthDelta=0.000px, CLS=0, border=rgb(239,159,39) 1px).
// FIX: minmax(0,1fr) sub-pixel, transition layout-property kaldirildi (sadece bg-color), will-change:
// transform + translateZ(0) GPU layer, -webkit-tap-highlight-color:transparent + touch-action:
// manipulation, contain:layout style, backdrop-filter:none, @media(hover:hover) hover/active guard.
// 131-A..K intact. KURAL 12.3 zorunlu bump.
// Adim 131-M (18.05.2026): v131-13 -> v131-14, empty state container width daralma fix.
// Kaan iddia: ARSIV empty (filtreliKR=[]) sekmede sayfa wrapper DAR, non-empty TAM. Hipotez A/B/C.
// Puppeteer 36/36 PASS (iPhone13 + Pixel6 + GalaxyA52 × 4 sekme × 3 klasor matrix):
// .bm-main getBoundingClientRect().width SABIT her kombinasyon, empty vs non-empty deltaMain=0.000px.
// FIX: rListe inline-style div'ler CSS class'a tasindi: .bm-liste-wrap (eski padding:12px wrapper) +
// .bm-empty-state (eski empty placeholder). Iki class da width:100% box-sizing:border-box min-width:0
// explicit. .bm-main + #ekran width:100% + box-sizing:border-box stabilize. 131-A..L intact.
// Adim 131-N (18.05.2026): TANI, deploy YOK. 4-state Puppeteer (URLBarVisible 384x780 + URLBarHidden
// 384x830 × ARSIV + PLANLANANLAR): .bm-main widthDelta=0px her durumda KANIT, BUT heightDelta=50px.
// Karar: Hipotez D (URL bar dynamic viewport) ispatlandi. Width bug YOK, viewport height bug var.
// Kaan height degisimini width algiliyor (empty state alt yarisi bos + URL bar gorunur => "dar" hissi).
// Adim 131-O (18.05.2026): v131-14 -> v131-15, 100vh -> 100dvh dynamic viewport fix (Senaryo D cozum).
// 6 yer CSS cift katman (100vh fallback + 100dvh override): body grid-template-rows, .bm-main height,
// .bm-sidebar height (desktop + mobile), #ekran height (desktop), .brewday-timeline-icerik min-height.
// Viewport meta'ya viewport-fit=cover EKLEME (dvh ile uyumlu, notch destegi). 131-A..N intact.
// Adim 131-P (18.05.2026): v131-15 -> v131-16, DEBUG paneli ekle (real device tani icin, 131-Q kaldirilir).
// Sebep: 131-O Kaan cihazinda fix tutmadi, Puppeteer 4/4 PASS dedi ama real Chrome simule edilemiyor.
// Bottom-fixed yesil monospace overlay: SW version + sekme/klasor + visualVP + innerH + dvh/vh resolved
// + body + .bm-main + #ekran + stat-grid + klasor-bar + liste-wrap canli bounding boxes.
// Event hook'lari: resize + visualViewport.resize/scroll + 500ms poll + setListeSekme/setAktifKlasor.
// 131-A..O fix INTACT, motor zinciri dokunulmaz, sadece DEBUG ek. Rollback: 131-Q'da revert.
// Adim 131-R (18.05.2026): v131-16 -> v131-17, .bm-main width icerik-bazli sizing fix (REAL BUG).
// 131-P debug panel ortaya cikardi: body=1080x551 SABIT ama .bm-main DEGISKEN (AKTIF 448, PL 551,
// ARSIV 431). Kok neden: 1fr = minmax(auto,1fr) auto min = min-content. Implicit kolon (mobile @media
// yangimazsa veya .bm-main grid-column:2 1fr-grid'de implicit'e dusterse) icerik min-content sizing.
// FIX (defense-in-depth): body grid-template-columns 240px 1fr -> 240px minmax(0,1fr); mobile body
// 1fr -> minmax(0,1fr); body grid-auto-columns:minmax(0,1fr) (implicit kolon defense); .bm-main
// max-width:100% (defansif). 131-A..P (debug panel dahil) INTACT.
// Adim 131-S (18.05.2026): v131-17 -> v131-18, 131-R REGRESYON ACIL FIX.
// 131-R sonrasi Kaan debug panel: AKTIF .bm-main=275x1080 (body 551 / 2). Sayfa saga hizali, sol bos.
// Kok neden: grid-auto-columns:minmax(0,1fr) implicit kolon yaratti. .bm-main col:2 default (mobile
// @media line 168 .bm-main col:1 override edilmedi cunku CSS cascade source-order ile default (line
// 180) sonra geliyor) -> .bm-main implicit kolon 2'ye dustu, body iki esit 1fr track'a bolundu.
// FIX: .bm-main base kuralinda grid-column:2 -> grid-column:1/-1 GLOBAL. Full span (col 1 to -1).
// Side effect (desktop): sidebar z-index:2 overlay olarak sol 240px gorsel kapatir, fonksiyonel
// minimal. body grid-auto-columns:minmax(0,1fr) ve diger 131-R fix'leri INTACT.
const CACHE_VERSION = 'bm-cache-v131-18';

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
