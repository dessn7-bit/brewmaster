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
// Adim 131-T (18.05.2026): v131-18 -> v131-19, 131-S DESKTOP REGRESYON ACIL FIX.
// 131-S global 1/-1 desktop'i kirdi: .bm-main 1707x985 sidebar uzerine bindi, icerik gorunmuyor.
// FIX (restructure): .bm-main base kural grid-column 1/-1 -> 2 (RESTORE desktop). Default RULE
// SONRASI yeni @media (max-width:768px){.bm-main{grid-column:1/-1}} block ekle (mobile override,
// CSS cascade source-order ile default'tan SONRA geldigi icin mobile'da 1/-1 kazanir).
// Source-order kritik: ek @media block default'tan ONCE olsaydi (line 168 gibi), default override
// eder ve 131-R bug geri gelirdi. 131-A..S fix'leri INTACT, debug panel BIRAK.
// Adim 132-pre-cleanup (18.05.2026): v131-19 -> v131-20, 131-P DEBUG paneli kaldirildi.
// Gercek device tani tamamlandi (131-N/R/S/T -> mobil/desktop regresyon zinciri kapandi). Sprint
// 132 (UI tasarim genisletme) baslangic hazirligi: temiz baseline.
// KALDI: <div id="bm-debug"> + <script id="bm-debug-script"> body sonu blok. setListeSekme/
// setAktifKlasor icindeki setTimeout(bmDebugUpdate,50) cagrilari. KORUNDU: window.listeSekme/
// window.aktifKlasor expose (sat 5937 + setter sync) - Sprint 132 sub-sprint'leri (Klonla vs)
// state expose kullanir. 131-A..T fix'leri INTACT, motor zinciri dokunulmadi.
// Adim 134-C (19.05.2026): v131-40 -> v131-41, Süreç tab 5 akordiyon (Image 2 stil, 132-F pattern).
// rEditorSurec (sat 13077-13432, ~180 sat tek uzun fonksiyon) — 5 grup caller-level accordion wrap.
// 8 görünür blok 5 gruba konsolide:
//   surec-hazirlik   🔧 Hazırlık Kontrolü       _hazirHTML var      açık (her zaman ilgili)
//   surec-brewday    🍺 Brewday Modu            banner + timer      açık (brewday aktif: window._brewday.aktif || pitching/og_olcum log)
//   surec-olcum      📏 Brewday Ölçümleri       Pre-boil + OG/FG manuel + correction tools accordion (nested accGrup INTACT)  kapalı
//   surec-mash       🌾 Mash Süreci             adım listesi + presets   kapalı
//   surec-kaynatma   🔥 Kaynatma + Hop Timeline kaynatma süre + _tl + katki takvimi IIFE + dry hop (4 blok birleşik)   kapalı
// Block extraction: _hazirHTML var (zaten) + 4 yeni const (_surecBrewday/_surecOlcum/_surecMash/_surecKaynatma).
// Local _bmAccWrap helper (132-F kopya). brewdayBaslatEkran/brewTimerBaslat/mashAdimEkle/setSurecKDk handler DOKUNULMAZ.
// 134-Q hop event chip #B8763F + katki event chip #8B5A2B + Süreç uyari kart #F5E8D0/#D4B58A INTACT.
// Brewday modal full-screen koyu kahve stil ayrı (.brewday-timeline/.brewday-modal-icerik) INTACT.
// S.brewLog 11 log tip + auto-side-effects (fg_olcum→fgManuel, og_olcum→ogManuel, pitching→durum=yapımda) INTACT.
// Sprint 132 + 133 + 134-Q + 134-A + 134-B INTACT. Motor zinciri DOKUNULMADI.
// Adim 134-B (19.05.2026): v131-39 -> v131-40, Su tab 5 akordiyon (Image 2 stil, 132-F pattern).
// rEditorSu (sat 12626-13076, ~450 sat tek uzun fonksiyon) — 5 grup caller-level accordion wrap.
// 7 grup spec'inden gerçek 5 görünür blok (su-rapor + profil-db ayrı kart değil, mevcut blok içinde):
//   su-stil      🎯 Stil Önerisi         meta: profil adı     default: varsa açık (S.maltlar.length)
//   su-kaynak    💧 Su Kaynağı + Hedef   meta: kaynak adı     default: açık
//   su-hesap     🧮 ChemPalmer Sonuç     meta: "Ca X ppm · N uyarı"  default: açık (ana sonuç + uyarılar)
//   su-ekle      ➕ Mineral Ekle         meta: "N mineral"    default: kapalı
//   su-mash-ph   🧪 Mash pH Tahmini      meta: yok            default: kapalı (advanced + maltlar.length conditional)
// Block extraction: suOneriHTML var + 2 IIFE + 2 template literal. _bmAccWrap local helper (132-F kopya).
// İç handler+hesap (mineralEkle, suProfilUygula, suProfilOneriUygula, ChemPalmer pH, hardness uyarıları) DOKUNULMAZ.
// Stil renk DATA + ALARM kırmızı/sarı (#FAECEC/#FDF4E0) + hardness gradient INTACT.
// Sprint 132 + 133 + 134-Q + 134-A INTACT. Motor zinciri DOKUNULMADI.
// Sticky özet global Su tab'da intact (132-E).
// Adim 134-A (19.05.2026): v131-38 -> v131-39, Hesap tab 5 akordiyon (Image 2 stil, 132-F pattern).
// rEditorHesap (sat 13712-13793) final return REWRITE: 5 kart caller-level accordion wrap.
// İç kart HTML+handler (batchOlcek, beerXmlExport, primingHesap, suHesap, besin tablo) DOKUNULMAZ.
// 5 akordiyon grup:
//   hesap-bath    🥃 Batç Hacmi          [açık]   meta: "{N}L"
//   hesap-export  📤 Reçete Dışa Aktarma [kapalı] meta: yok
//   hesap-priming 🍾 Priming / Şişeleme  [kapalı] meta: "{vol} vol"
//   hesap-su      💧 Su Hesabı           [açık]   meta: "{L}L toplam"
//   hesap-nutri   🧬 Besin Değerleri     [kapalı] meta: "{kcal}/330mL" — og>1.001 conditional
// Local _bmAccWrap helper (rEditorTakvim 132-F emsali kopya, gelecekte global çıkarım opsiyonel).
// 5 kart string'i ayrı değişkenlere atılı: _kartBatch, _kartExport, _kartPriming, _kartSu, _kartNutri.
// bmAccToggle/bmAccInit framework (132-D) intact, render() sonu state restore + ARIA bind otomatik.
// Sticky özet (132-E global) Hesap tab'da intact. Vintage Amber palette (134-Q sonrası) intact.
// Sprint 132 + 133 + 134-Q INTACT. Motor zinciri DOKUNULMADI.
// Adim 134-Q (19.05.2026): v131-37 -> v131-38, Toplu mekanik hex swap + HTML title fix.
// Sprint 134 Faz 1: keşif raporu mekanik alanlar tek commit. 18 hex migration + 1 title fix.
//   A. Hesap tab pastel: #FFF4DC×5 / #E4ECE7×3 / #EAEED8×3 → #F5E8D0 + #DDE2C2×1 → #E8C28A
//   B. Süreç tab: #2D7A2D (hop event renk) → #B8763F, #8B3A8B (katki event renk) → #8B5A2B
//      #FFF8EE×5 → #F5E8D0 (uyari kart bg), #F0C070×5 → #D4B58A (border, 11884 DATA chip INTACT)
//   C. Katki tab: #F0F8E8/#E0F0D8 → #F5E8D0/#E8C28A (stil öneri kart, 13398 atten history INTACT)
//      #7A9A4A×2 → #B8763F (border), #FFF8E0/#FFF4D0 → #F5E8D0/#E8C28A (favoriler, 19187 brewday onay INTACT)
//      #E8B830×3 → #B8763F (favoriler border)
//   D. Not tab tadım: #FFB74D×3 → #B8763F (border-left)
//   E. Sync panel: #1A3A5A×3 → #5C3A0E (koyu kahve), #A0D0F0 → #E8C28A, #F0F6FF → #F5E8D0
//   F. HTML title: <title>Kabeer</title> → <title>Brewmaster</title> (manifest tutarlılık)
// 18 alan migrate, 4 DATA/semantic context INTACT:
//   - #F0C070 sicaklik DATA chip (11884) INTACT
//   - #FFF4D0 brewday onay bildirim izin warning (19187) INTACT
//   - #F0F8E8 rEditorMaya atten history (13398) INTACT
//   - #8B3A8B Kondisyon faz DATA renk (11976) INTACT
// Semantic kırmızı (Sil/destructive #FCEBEB/#FAECEC/#A32D2D/#FAE8E8) INTACT.
// Semantic yeşil (positive/iade #1D9E75/#3FBF73) INTACT. Stil renk dot DATA srmR INTACT.
// Sprint 132 + 133-A-1/2/3/4 + 133-B-1 INTACT. Motor zinciri DOKUNULMADI.
// 4 fn syntax check (rEditorHesap/Surec/Katki/syncPanelAc) PASS.
// Adim 133-A-4 (19.05.2026): v131-36 -> v131-37, Recete Doktoru cozum chip aksiyon entegrasyon.
// 133-A-2 layout sonrasi chip'ler interactive: tıklanabilir + arrow icon + hover transform.
// Parse: window.bmDoctorChipParse(text, ikon) — regex ladder:
//   "+9g Centennial/Columbus" → action=hop_ekle, gram=9, name="Centennial"
//   "+0.5 kg Crystal 40" → action=malt_ekle, kg=0.5, name="Crystal 40"
//   "azalt|kaldır|düşür" → action=malt_azalt (veya hop_azalt ikon=🌿 ise)
//   Belirsiz → action=info (safe fallback)
//   ikon hint context routing: 🌿→hop, 📈/📉/🎨→malt.
// Dispatch: window.bmDoctorChipClick(text, ikon) — switch action:
//   hop_ekle: HOPLAR.find(ad) exact→partial, S.hoplar.push({id,g,dk:60,tur:'boil',...}) + flash + render
//   malt_ekle: MALTLAR.find(ad), existing varsa kg toplama / yoksa push + flash + render
//   malt_azalt: setSekme('malt') + .satir keyword match (Chocolate/Roasted/Crystal/Black/Munich/Carafa) → .bm-malt-highlight pulse 2.2sn
//   hop_azalt: setSekme('hop') + flash hint
//   info: flash "manuel uygulama" toast
// Render: chip'e onclick + onkeydown (Enter/Space) + data-text + data-ikon + role=button + tabindex=0 + arrow icon.
// CSS: cursor pointer + hover transform(-1px) + box-shadow + focus outline + .bm-chip-arrow opacity transition.
// .bm-malt-highlight keyframes bmMaltPulse (transparent → #E8C28A bg + box-shadow #B8763F 2px).
// 133-A-2 BUILD logic (oneriler[] push, ~530 sat rule) + 133-A-2 render parse fallback INTACT.
// hopEkle/maltEkle signature DOKUNULMAZ (chip handler S arrays'e dogrudan push, render() ile sync).
// Sprint 132 + 133-A-1/2/3 + 133-B-1 INTACT. Motor zinciri DOKUNULMADI.
// Adim 133-A-3 (19.05.2026): v131-35 -> v131-36, Motor toggle V12 sadeleştirme + arsiv flag.
// rEditorGenel motor toggle (sat 17099-17125): V12 tek aktif motor, V8.5/V9/V10/V101 arsiv.
// YAKLAŞIM A (minimal): SHOW_ARCHIVE_MOTORS=false flag eklendi, arsiv motor btn() cagrilari
// if (SHOW_ARCHIVE_MOTORS) altina alindi (dormant, gelecek aktivasyon icin korundu).
// Render: html = '<span>'+btn('V12', ...)+ (SHOW_ARCHIVE_MOTORS ? btn('V101')+btn('V10')+btn('V9')+btn('V85') : '') + '</span>';
// V12 click handler intact. localStorage 'bm_motor_version' default 'V12' intact.
// Arsiv motor renkleri (#0D47A1 V101 / #1B5E20 V10 / #7B1FA2 V9 / #C88A13 V8.5) INTACT dormant kodda.
// Gelecek motor (V13 vs): btn('V13', ...) + flag flip ile yeniden UI'a ekle.
// Sprint 132 + 133-A-1/2 + 133-B-1 INTACT. Motor zinciri (B1+V12+V20+F1+Strategy C) DOKUNULMADI.
// Adim 133-B-1 (19.05.2026): v131-34 -> v131-35, Defter ana sayfa 3 hex vintage swap.
// 133-B discovery raporu sonrasi: Defter ana sayfa %85+ zaten vintage (J-1 + 131 sprint chain), 3 nokta non-vintage:
//   1. CSS sat 396 .bm-recete-banner.medium (SRM 12-22 amber/dark beer kart header):
//      #D97706 (parlak amber) -> linear-gradient(135deg, #B8763F 0%, #8B5A2B 100%)
//      Hierarchy: .light solid #B8763F → .medium gradient (vintage primary→dark) → .dark gradient #4F2A0E→#412402
//   2. CSS sat 422 .bm-recete-eylem-chip.aktife .ti (Aktife Al/Plana Al icon):
//      #D85A30 (turuncu icon) -> #B8763F (vintage primary)
//   3. CSS sat 140 .bm-sidebar-cta:hover (+ Yeni recete CTA hover):
//      #D88A18 -> #A8632E (vintage primary dark variant)
// Banner.light + banner.dark INTACT. Stil renk dot DATA (srmR SRM-based) INTACT.
// Semantic kırmızı (Sil eylem chip #FCEBEB/#A32D2D) + semantic yeşil (.iade #1D9E75) INTACT.
// Sprint 132 + 133-A-1 + 133-A-2 tum sub-sprint INTACT. Motor zinciri DOKUNULMADI.
// Adim 133-A-2 (19.05.2026): v131-33 -> v131-34, Recete Doktoru kart UX refactor (alan E).
// Mevcut inline <br>+<b>Cozum N:</b> regex-split fragility yerine yapısal layout:
//   .bm-doctor-kart > .bm-doctor-header (ikon+baslik+durum-badge) +
//     .bm-doctor-aciklama (prose) + .bm-doctor-cozumler (label + chip-rows) + .bm-doctor-hedef (italic, üst dash)
// DATA TRANSFORM: oneriler[] BUILD logic INTACT (sat ~17143-17680, ~530 sat rule logic dokunulmadi).
// Sadece RENDER aşamasında o.coz body string parse (Quick path) — <br>\s* split + her satır kategori:
//   <b>Çözüm N(?:\s*(\w+)?):</b> → cozum chip
//   • <b>...</b> → cozum chip (bullet form, IBU low / SRM low)
//   → ... → hedef (italic alt satır)
//   diğer → aciklama paragraph
// Quick path push schema migration YAPILMADI (~30 push noktasi, ROBUST PARSER yeterli). Backward compat 100%.
// CSS .bm-doctor-* (~20 satir): vintage amber palette (#B8763F primary, #C68B5B kırmızı border,
//   #D4B58A sarı border, #F5E8D0 chip bg, #E8C28A chip:hover bg, #5C3A0E body text, #8B5A2B label,
//   #F5E8E0 kırmızı pastel, #F5EFDC sarı pastel). Mobile <=768px kompakt (font 12/13, padding 6 10).
// Durum label hesap: kırmızı→Kritik, sarı→Uyarı, diğer→Bilgi (yeni badge).
// Reçete Doktoru LOGIC + öneri tetik koşulları + hedef hesaplama DOKUNULMADI.
// Action item entegrasyon (chip → otomatik hopEkle/maltEkle) bu scope DISI (133-A-4 backlog).
// Sprint 132 + 133-A-1 INTACT. Motor zinciri DOKUNULMADI. Stil renk dot DATA INTACT.
// Adim 133-A-1 (19.05.2026): v131-32 -> v131-33, Editor Genel tab eski icerik vintage migration.
// 5 alan (A+B+C+D+F) — discovery'de tespit edilen 6 alandan E (Recete Doktoru UX) HARIC mekanik hex swap:
//   A. Cluster ribbon (mor): #7B1FA2 -> #B8763F (×3 UI nokta), rgba(123,31,162,0.08) -> rgba(184,118,63,0.08)
//      sat 16902-16903 + 21760 _hybridRibbonInner. console.log decorator + V9 archive toggle INTACT.
//   B. Strategy C ribbon (teal): #00897B -> #8B5A2B (×3 UI nokta), rgba(0,137,123,0.10) -> rgba(139,90,43,0.10)
//      sat 16912-16913 + 21801 _scRibbonInner. #8B5A2B = --bakir (ana sonuç vurgu, hierarchy kahve).
//      5 console.log decorator INTACT (dev tool color). 132-H 4/4 badge zaten vintage J-1.
//   C. Hibrit (V19+V20)/2 alt kart (yeşil): #388E3C/#E8F5E9 -> #B8763F/#E8C28A
//      sat 17117 _f1Color/_f1Bg. console.log 16487 INTACT.
//   D. Motor toggle V12 (mor): #6A1B9A/#F3E5F5 -> #B8763F/#E8C28A
//      sat 17083 btn arg + 17089 color (V12 branch) + 17090 bgC (V12 branch).
//      V8.5/V9/V10/V101 arsiv toggle hex'leri DOKUNULMADI (133-A-3 sadelestirme'de ele alinacak).
//      3 console.log decorator INTACT.
//   F. Durum "Istek Listesi" badge (mor varyant): #E0D6DC/#6B5A7A/#9A8898 -> #E8C28A/#8B5A2B/#D4B58A
//      sat 17705. Log kategori #E0D6DC (11395) + 2 stok kategori (13762, 13764) INTACT (data renkleri).
// INTACT (zaten vintage): Top-3 stil pill (var(--bakir/altin/dim)), BU:GU/Atten/SRM kartlar (var(--card/bor)),
//   Recete Doktoru ana kart (#F5E8E0/#F5EFDC pastel kahve-krem, var(--bakir) border), bm-badge-4-4/3-4/low (J-1).
// 9/9 hex + 2/2 rgba migration delta PASS (targeted Edit, replace_all yasak — console/archive overlap).
// Sprint 132 tum sub-sprint INTACT. Motor zinciri DOKUNULMADI. Stil renk dot DATA INTACT.
// Adim 132-I (19.05.2026): v131-31 -> v131-32, Detay/Readonly mode toggle (edit/view switch).
// POZISYON: Editor header sag, Kaydet butonu solunda segmented mini toggle [Düzenle | Görüntüle].
// Vintage Amber (J-1) palette: aktif #B8763F bg + #FFFFFF text, pasif #D4B58A border + #8B5A2B text.
// DEFAULT MOD (rEditor body'sinde _recMode):
//   S.durum==='arsiv' -> view, diger (planlananlar/aktif/istek) -> edit, localStorage 'bm_recete_mode_'+recId override.
//   render() icinde document.body.setAttribute('data-mode', _recMode) → CSS hide tetiklenir.
// READ-ONLY MODDA (body[data-mode="view"]) gizlenen:
//   .bm-edit-only display:none → Kaydet butonu, Hedef Stil dropdown row, Log form (Yeni Kayit Ekle),
//   log sil/duzenle butonlari (sat 11420-11422), mineralEkle +Ekle, mash +Adim, katki_ekle_tarif/ozel buttons.
//   .bm-acc.bm-edit-only-acc display:none → malt-ekle/hop-ekle/maya-sec collapsible accordions.
//   .bm-chip pointer-events:none + opacity:.6 → muadil chip onclick devre disi.
// GORUNUR HER IKI MODDA: Klonla, breadcrumb, sticky ozet, Strategy C ribbon + 4/4 badge, akordiyon header
// aç/kapat (bm-acc-header genel), mevcut malzeme satirlari + log kayitlari, grafikler, milestone timeline.
// JS: window.bmReceteMode(recId, mode) — localStorage persist + data-mode set + render(). render() icinde
// _recMode hesabi her render'da yenilenir (data sync). 131-A..T + 132-pre/B/C/A/D/E/F/G/H + fix-1 + J-1 + J-2/3/4/5 intact.
// Motor zinciri DOKUNULMADI. S.brewLog data + event handler intact (sadece UI gizli, data korunur).
// Adim 132-J-2/3/4/5 (19.05.2026): v131-30 -> v131-31, Polish toplu deploy (4 alt-task tek commit).
// J-2 (header stat duplicate sil + sticky KH ekle):
//   sat 18266-18268 editor ust kahve header 6 stat (OG/FG/ABV/IBU/EBC/KH) blok kaldirildi.
//   sticky ozet 132-A+E zaten OG/FG/ABV/IBU/SRM gosteriyor + KH stat eklendi (6 stat sticky).
//   EBC duplicate (SRM*1.97), gosterilmiyor. Mobile <=768px sticky compact (gap 6, font 11).
// J-3 (Malt/Hop/Maya sira ters):
//   rEditorMalt/Hop/Maya ic refactor: mevcut malzeme listesi USTTE, "+Yeni X Ekle" collapsible
//   .bm-acc data-acc-id=malt-ekle/hop-ekle/maya-sec ALTTA (default kapali, bos liste ise acik).
//   maya tab: detay kart USTTE + 2.maya detay + "Maya Sec/Degistir" collapsible altta.
//   maltEkle/hopEkle event handler + S.maltlar/hoplar/mayaId data INTACT.
// J-4 (mobile overflow fix):
//   (a) eh header Kaydet+Klonla flex row 380px: .eh .btn,.eh .bm-btn-primary padding 6 10 + font 11
//   (b) milestone gun hucresi .bm-ms-cell class + @media max-width:420px min-width 4px override.
//   Body scrollWidth <= 380 hedef (132-pre baseline restore).
// J-5 (132-H badge tooltip ribbon_prob):
//   _scRibbonInner badge title: "N/M motor consensus · pct% · ribbon prob X.X%" (was sadece N/M).
//   stc._meta.ribbon_prob || stc.topProb fallback. Backward compat (eski stcRes still PASS).
// J-1 Vintage Amber palette intact, 131-A..T + 132-pre/B/C/A/D/E/G/H/F + fix-1 intact.
// Motor zinciri (B1/V12c/V20/F1) dokunulmadi. Stil renk dot DATA intact.
// Adim 132-J-1 (19.05.2026): v131-29 -> v131-30, Vintage Amber accent global migration (Scope B).
// Mevcut parlak turuncu palette -> Vintage Amber palette. 5 hex × 55 occurrence global migrate.
//   #EF9F27 -> #B8763F  (primary accent, 32 match)  button bg/border/icon/focus ring/badge border
//   #FAEEDA -> #E8C28A  (light hover/active bg, 10 match)  sidebar-active/chip:hover/badge-3-4/klasor-active
//   #F0DDB8 -> #D4B58A  (light accent border, 3 match)  yapımda-vurgu/taslak-banner border (derived)
//   #854F0B -> #8B5A2B  (dark accent text, 8 match)  sidebar/klasor active text/yapımda-baslik
//                        --bakir variable ile birlesik 2B (kahve header rengi ile harmonize)
//   #FFF7E6 -> #F5E8D0  (item hover bg, 2 match)  yapimda-item:hover, recete-ac-btn:hover
// Stil renk dot DATA (srmR 10 hex F3F993..2A1107) + hop origin (#B87A3D) INTACT, sadece accent migrate.
// Semantic hexler (alarm red/yellow #FAECEC/FAE8E8/FFF8E8, manuel positive #EFFFEF, bg2 ivory #EFE6D0)
// DOKUNULMADI. Migration sonrasi --bakir/--altin (#8B5A2B/#B8874E) ile palette tam harmonize.
// 5 replace_all global + grep delta dogrulama: 5/5 eski 0 + yeni count=spec match.
// 131-A..T + 132-pre/B/C/A/D/E/F/G/H + 132-fix-1 intact. Motor zinciri dokunulmadi.
// Adim 132-fix-1 (19.05.2026): v131-28 -> v131-29, Firebase syncAl URL cift json path fix.
// BUG (production 3 cihaz loop): user Firebase URL'ini full path olarak yapistirinca
//   (ör: "https://kabir-35fe1-default-rtdb.firebaseio.com/brewmaster_kabir.json")
//   syncUrl() basina ekstra "/brewmaster_<oda>.json" daha eklerek cift path olusturuyor:
//   "...firebaseio.com/brewmaster_kabir.json/brewmaster_kabir.json" -> 400 Bad Request.
// syncDinle 5sn interval ile sonsuz loop, syncGonder de ayni bug (PUT cift path), 3 cihaz
// senkron tamamen down. Bug code'da dormant baslangictan beri (^83bab02 2026-04-25);
// 131-W'de Kaan dogru base URL girmis, son re-entry full path yapismis tetiklenmis.
// FIX (sat 20608 syncUrl, tek satir defansif strip):
//   base = url.replace(/\/$/, '').replace(/\/brewmaster_[^\/]*\.json$/i, '');
//   User'in localStorage'ini elle duzeltmesine gerek yok, syncUrl her durumda dogru
//   URL inşa ediyor. 4/4 smoke test PASS (full path, base, trailing slash, farkli oda).
// 131-W veri kurtarma mantigi (Firebase BOS yerel dolu -> EZME REDDEDILDI) regresyon
// yok, tam tersine RESTORE (URL bozukken res.ok=false ile bypass oluyordu).
// 131-A..T + 132-pre/B/C/A/D/E/F/G/H intact. Motor zinciri (B1/V12c/V20/F1) dokunulmadi.
// Adim 132-F (19.05.2026): v131-27 -> v131-28, Takvim tab 132-D akordiyon refactor (Image 2 stil).
// rEditorTakvim() final return REWRITE (sat ~12489): 10 ic render bloğu (_ustDurum, _milestoneTl,
// _alarmKart, _kaliteKart, _stilIdealKart, _sonrakiKart, _grafikKart, _takvimKart, _detaylarKart,
// _logFormKart) DOKUNULMAZ, sadece dısa 6 .bm-acc grubuna sarıldı (caller-level wrap, 132-E pattern):
//   takvim-faz       🎯 Faz & Sonraki Adım    [açık]  _ustDurum + _sonrakiKart
//   takvim-milestone 📊 Milestone Timeline    [açık]  _milestoneTl
//   takvim-alarm     🚨 Alarmlar              [varsa] _alarmKart  (default = (sayı>0))
//   takvim-log       📝 Fermantasyon Günlüğü  [açık]  _logFormKart
//   takvim-grafik    📈 Grafikler & Kalite    [kapalı] _grafikKart + _kaliteKart
//   takvim-detay     📅 Detay Takvimler       [kapalı] _stilIdealKart + _takvimKart + _detaylarKart
// Meta hesaplamalar: faz adı (Primary N.gün / Dry Hop / Cold Crash / Kondisyon / Hazırlık),
// "Gün X" milestone, alarm bekleyen sayısı (_alarmlariOku), brewLog.length, kaliteSkoru toplam/100.
// Local _bmAccWrap helper (rEditorTakvim ic) eklendi (132-E pattern HTML inline, .bm-acc-body class).
// Event handler INTACT: logEkle/logSil/logDuzenle/toggleLogForm/toggleTakGor/logTipDegisti/_setLogNot/
// logExport/logDuzenleSifirla. S.brewLog data + auto-side-effect (fg_olcum→S.fgManuel,
// og_olcum→S.ogManuel, pitching→durum=yapımda) INTACT. Brewday modal (window._brewday) ayri DOKUNULMADI.
// bmAccInit() render() sonu setTimeout 132-D intact, yeni 6 akordiyon otomatik state restore + ARIA.
// 131-A..T + 132-pre/B/C/A/D/E/G/H intact. Motor zinciri (B1/V12c/V20/F1) DOKUNULMADI.
// Adim 132-H (19.05.2026): v131-26 -> v131-27, 4/4 ensemble agreement badge Strategy C ribbon.
// Mevcut Strategy C predict result stcRes.hybrid_agreement ZATEN "N/M" formatinda dosyada (sat
// 22868). _meta.agreement + _meta.total integer'lar da var. 4 motor karsilastirma backend'de
// hyba.agreeCount/totalVotes ile zaten yapiliyor (motors: v_cluster_slug + v12_slug + v20_slug
// + hyb_slug). Sub-sprint sadece UI rozet ekledi.
// _scRibbonInner (sat ~21548) icine badge HTML inject: hybrid_agreement parse → class+icon.
//   4/4 (ag=tot>=4): bm-badge-4-4 yesil ✨
//   3/4 (ag>=3): bm-badge-3-4 turuncu ◆
//   ≤2/4 (ag<3): bm-badge-low gri ◇
// CSS .bm-ensemble-badge + 3 varyant + .bm-badge-icon (sat ~257).
// Motor zinciri (B1/V12c/V20/F1) DOKUNULMADI - sadece predict sonucu okunur ve rozet inject.
// 131-A..T + 132-pre/B/C/A/D/E/G intact.
// Adim 132-G (19.05.2026): v131-25 -> v131-26, Muadil chip kompakt Malt/Hop satirlari altinda.
// HTML her item iteration sat ~10157 oncesi chip-row inject + eski full panel collapsible:
//   <div class="bm-muadil-wrap">
//     <div class="bm-muadil-row"> MUADIL: chip1 chip2 chip3 +detay </div>
//     <div class="bm-muadil-panel-full" style="display:none">eski büyük panel intact</div>
//   </div>
// Chip top 3 muadil için: bm-chip-stok yeşil (✓ stoktaki), bm-chip gri (stoksuz).
// Chip onclick="muadilSec(this)" - mevcut handler intact (data-src/tgt/kat/mik/birim attrs aynı).
// "+detay" bm-chip-more inline JS toggle full panel display.
// CSS .bm-muadil-wrap + .bm-muadil-row + .bm-muadil-label + .bm-chip + .bm-chip-stok + .bm-chip-more
// + .bm-muadil-panel-full. Mobile <=768 daha kompakt (gap 4 + chip padding 2 8 + font 10).
// muadilSec handler INTACT (132-G sadece UI shell, backend dokunmadi).
// 131-A..T + 132-pre/B/C/A/D/E intact. Motor zinciri (B1/V12c/V20/F1) dokunulmadi.
// Adim 132-E (19.05.2026): v131-24 -> v131-25, Akordiyon yay Malt/Hop/Maya + sticky ozet global.
// 1) Sticky ozet panel rEditorGenel'den cikarildi, rEditor wrapper'a tasindi (uy ile sb arasi).
//    Her tab'da gorunur. renk dot srmR(srm) (Genel'in karmasik renk_hex hesabi gerekmiyor).
//    data-tab attribute kaldirildi. updateStickySummary global helper intact.
// 2) Malt/Hop/Maya tab dispatch noktasinda (rEditor switch sat ~17937) ic = rEditorXXX() cagrisi
//    accordion wrap ile guncellendi - mevcut rEditorMalt/Hop/Maya return'leri DOKUNULMADI,
//    sadece dis wrapper accordion eklendi (caller-level wrap, en guvenli pattern).
//    Meta badge'ler: malt-liste "{N} malt · {kg} kg", hop-sema "{N} ekleme · {IBU} IBU",
//    maya-birincil "{maya ad} · {att}% att".
//    1 section per tab pilot. Cogu section (muadil ayri, ikincil maya ayri, fg-hesap) sub-sprint
//    132-E-2'ye ertelendi (mevcut muadil panel'ler her satir altinda inline render).
// 3) bmAccInit() zaten render() sonu cagriliyor (132-D), Malt/Hop/Maya da otomatik isler.
// 4) Sticky ozet (132-A) intact, hop/malt/maya tab degisinde stat'lar guncel (calc() her render).
// 131-A..T + 132-pre/B/C/A/D intact. Motor zinciri (B1/V12c/V20/F1) dokunulmadi.
// Adim 132-D (19.05.2026): v131-23 -> v131-24, Akordiyon temel patern + Genel tab 3 section.
// CSS .bm-acc framework: background:#fff border:#E5DCC8 radius:12, header:padding:12 14 min-height:44px
// hover:#FAEEDA focus:outline 2 #EF9F27. title (ellipsis) + meta (collapsed iken bile ozet badge, max 160px)
// + chevron (▾ rotate -90 collapsed). body max-height transition 0.3s ease.
// JS framework: bmAccToggle(id, force?) + bmAccInit() + localStorage 'bm_acc_state'. ARIA aria-expanded.
// Inline onclick + onkeydown (Enter/Space) header element.
// render() sonu setTimeout bmAccInit (state restore + binding).
// Genel tab PILOT 3 section:
//   #1 "🎯 Stil Tahmini & Reçete Doktoru" (expanded) - eski big gradient card refactor, color stripe
//      acc-body border-top 6px ${renk_hex}. Recipe Doctor IIFE icerige dahil (132-D-2'de ayrilir).
//   #2 "📊 Reçete Profili" (collapsed) - Tahmini Bira Profili kart + Karbonhidrat/Kalori +
//      Stok Durumu & Muadiller IIFE'leri wraps.
//   #3 "🍻 Fermentasyon Durumu" (expanded) - _fermDurum self-header (<div class="th">..</div>)
//      regex.replace ile strip, accordion header tek baslik olur.
// PILOT: sadece Genel tab. 132-E'de Malt/Hop/Maya tablarina yayilir.
// 131-A..T + 132-pre/B/C/A intact. Motor zinciri dokunulmadi.
// Adim 132-A (19.05.2026): v131-22 -> v131-23, Sticky ozet paneli Genel tab pilot.
// HTML: rEditorGenel return basinda <div class="bm-sticky-summary" id="bm-summary" data-tab="genel">
//   - <span class="bm-ss-renk" id="ss-renk"> srmR(srm) hex bg
//   - <span class="bm-ss-label" id="ss-stil"> S.stil > S.stilTah > S.biraAd fallback
//   - 5 stat: OG/FG/ABV/IBU/SRM (calc() sonuclari, initial render dolu)
// CSS .bm-sticky-summary + .bm-ss-* (cream BG + backdrop-filter blur + sticky top:var(--bm-header-h))
//   Desktop: gap 14, current max-width 200. Mobile <=768: gap 8, current max-width 140, kompakt.
// JS:
//   - window.updateStickySummary(): predict.then() hook - stil + renk dot DOM update
//   - window._bmUpdateHeaderH(): .eh height olcum + --bm-header-h CSS var set
//   - render() sonu setTimeout _bmUpdateHeaderH (sticky-summary top hizalama)
//   - ResizeObserver .eh degisirse (breadcrumb wrap vs) auto-update
// Predict.then() 6 hook'a updateStickySummary call eklendi (updateRibbon strategy-c yanina).
// PILOT: sadece Genel tab. 132-E'de diger tablara yayilir.
// 131-A..T + 132-pre/B/C intact. Motor zinciri dokunulmadi.
// Adim 132-C (18.05.2026): v131-21 -> v131-22, Breadcrumb editor header'da.
// HTML: .eh header restructure - 1. satir <nav class="bm-breadcrumb"> ("← Defter / klasor / biraAd"),
// 2. satir [biraAd input | Kaydet | Klonla] (132-B intact). "‹" geri buton kaldirildi, fonksiyonu
// "← Defter" link'inde korunuyor. biraAd input oninput → breadcrumb current text canli update
// (textContent only, DOM rebuild yok).
// CSS .bm-breadcrumb + .bm-bc-link + .bm-bc-sep + .bm-bc-current. Mobile <=768 daha kucuk: gap 4, current max-width 100.
// JS: window._bcKlasorAc(k) - klasor link helper (setAktifKlasor yerine direkt assign + render).
// 131-A..T + 132-pre + 132-B intact. Motor zinciri dokunulmadi.
// Adim 132-B (18.05.2026): v131-20 -> v131-21, Klonla butonu + tarifKlonla handler.
// HTML: editor header (sat ~18023) Kaydet butonu yanina '📑 Klonla' button (sadece _editId set ise).
// CSS: .bm-btn-primary (#EF9F27 turuncu bg, hover #D88A1F, 8px radius, 10px 16px padding, mobile-friendly).
// JS: function tarifKlonla(srcId) - deep clone JSON parse+stringify + crypto.randomUUID (fallback
// Date.now+Math.random) + biraAd " (kopya)" suffix + durum='aktif' (Planlananlar display label, NOT
// 'planlananlar' string - sat 10770 statTanim mapping) + olusturma/guncelleme timestamps + KR.unshift
// + _origKy(KR) localStorage save + _syncGonderDebounced Firebase push + tarifAc(yeni.id) editor yonlendir.
// flash mesaj. 131-A..T + 132-pre intact. Motor zinciri dokunulmadi.
// Adim 137-G (Parca 1, 2026-05-21): v131-81 -> v131-82, mobil kalici Kabeer marka seridi.
// HTML degisiklikleri: <div class="bm-main"> ic ilk child <div id="bm-marka-serit"> (logo img +
// Kabeer span, statik). CSS ~10 satir (.bm-marka-serit default display:none + mobile @media flex
// + bm-header border-radius:0 mobile, "iki satir tek header" gorsel butunluk). Logo src init IIFE
// BM_LOGO_DATAURL tanim sonrasi (markup'a 54KB base64 kopya YOK). 135-I .bm-header gradient + .eh
// editor header rengi/sticky DOKUNULMADI; sekmeBasliklari + breadcrumb + motor zinciri + masaustu
// header+sidebar INTACT. Mobil only (<=768px), desktop'ta sidebar zaten logo gosteriyor.
// Tıklama handler eklenmedi (Parca 2 kapsami).
// Adim 137-G cila (Parca 1, 2026-05-21): v131-82 -> v131-83, marka seridi V4 + C tonu + header.
// Sirf CSS cila (HTML eleman + logo IIFE INTACT):
//   1) Marka seridi V4: logo 20→30px, "Kabeer" --fs-sm→--fs-lg Fraunces krem,
//      padding sp-2 sp-3 → sp-3 sp-4 (kalin band, eski ince band hissi gitti),
//      justify-content:center (ortalı), bg var(--metin) espresso → var(--kahve-masthead) #63492F
//      sicak C tonu, ::after 2px amber gradient (transparent→var(--vintage)→transparent) alt
//      tam genislik ince çizgi.
//   2) Header (.bm-header) C tonuna: 135-I espresso gradient #46301F→#3A2818 yer degisti
//      var(--kahve-masthead) #63492F → var(--kahve-masthead-dark) #48351F. Tum viewport'lar
//      (mobile + desktop) ayni gradient (kasıtlı). Strip + header tek aile, görsel kaynastir.
//   3) Token: 2 yeni token (--kahve-masthead + --kahve-masthead-dark) :root içinde. Tek iyi-
//      isimli aile (masthead kahve). Scattered hardcoded hex YOK.
// .eh editor reçete header (135-I beyaz-krem) DOKUNULMADI. sekmeBasliklari + motor + Sprint
// 132/133/134 + IIFE + HTML DOM yapisi INTACT.
// Adim 137-G cila duzeltme (Parca 1, 2026-05-21): v131-83 -> v131-84, 3 gorsel hata fix.
// CILA_3SORUN_TESHIS.md raporundaki 3 kok neden duzelten deger degisimleri:
//   1) Serit kose krem leke: .bm-marka-serit mobile border-radius var(--r-md) var(--r-md) 0 0
//      → 0. Sebep: tam genislik (w=360) seritte üst köseler R=14px yarıçapla geri çekildiği
//      için arkadaki body bg #F7F3EC görünüyor → krem leke. Düz köse → leke kaybolur.
//   2) Hamburger gizli: .bm-hamburger-btn color #3D2817 (koyu kahve) → var(--masthead-ink)
//      (#F6EAD7 krem); .bm-header-iconbtn color #F6EAD7 → ayni token (token-pure unify).
//      Yeni :root token --masthead-ink:#F6EAD7. 4 header ikonu (1 hamburger + 3 iconbtn)
//      birebir ayni renk. WCAG kontrast 1.67:1 FAIL → 7:1 AAA pass (krem on C tonu).
//   3) Üstte 3 ton sandvic: <meta name="theme-color"> + manifest.webmanifest theme_color
//      #6B4423 → #63492F (=var(--kahve-masthead) literal). Statusbar artık serit + header
//      TOP ile birebir aynı C tonu, 3 ton kayboluyor.
// DOKUNULMADI: 135-I .bm-header gradient (sat 285) + .eh editor header (sat 182) + renderHeader/
// sekmeBasliklari + serit DOM + logo IIFE + motor zinciri + DATA/semantic 132/133/134.
// Adim 137-G Parca 1 devami (2026-05-21): v131-84 -> v131-85, masthead wordmark = KABEER+demon
// gorsel (360x174 RGBA PNG, base64 inline). HTML degisiklikleri:
//   - F:11158 yeni const BM_WORDMARK_DATAURL='data:image/png;base64,...' (~67KB)
//   - F:738 <img bm-marka-logo> alt="Kabeer" -> alt="" (dekoratif)
//   - F:739 <span bm-marka-isim>Kabeer</span> -> <img bm-marka-isim-img alt="Kabeer">
//   - IIFE (~F:11163): __bmwm = #bm-marka-isim-img.src = BM_WORDMARK_DATAURL atamasi eklendi
//   - CSS .bm-marka-serit @media mobile: +height:54px +overflow:hidden (serit sabit, tasan kirpilir)
//   - CSS yeni rule: .bm-marka-isim-img{height:70px;width:auto;display:block;flex-shrink:0}
//   - CSS .bm-marka-isim (span class kurali) silindi (span artik yok, kullanim YOK)
// kabeer-wordmark.png LOCAL'de tutuldu, repo/precache'e EKLENMEDI.
// DOKUNULMADI: 135-I .bm-header gradient + .eh + renderHeader/sekme + motor + Sprint 132/133/134.
// verim-fix (2026-05-24): rEditorMalt() "Sistem Verimi" kontrolu "Yeni Malt Ekle"
// akordeonunun (c15e0c7/Adim 132-J ile gomulmustu) DISINA alindi — standalone, her modda
// gorunur (bm-edit-only-acc YOK). Akordeon (malt arama/ekle) kapali-default KORUNDU.
// HTML degisti -> KURAL 12.3 CACHE_VERSION bump v131-106 -> v131-107.
// malt-typeahead (2026-05-24): rEditorMalt() MALT EKLE arama kutusuna canli oneri dropdown
// (oninput debounce 150ms, TR-normalize prefix>contains, top 10). Secim = kategori akordeonuyla
// AYNI yol (yM.id + render()); Enter mevcut "ilk eslesen" KORUNDU; Esc/disari tik/secim kapatir.
// HTML degisti -> KURAL 12.3 CACHE_VERSION bump v131-107 -> v131-108.
// typeahead-genel (2026-05-24): malt type-ahead TEK genel helper'a tasindi (bmArama/_bmAramaCfg/
// bmAramaSec) + Hop + Maya arama kutularina da yayildi. Secim her sekmenin MEVCUT mekanizmasi
// (malt yM.id, hop yH.id, maya S.mayaId; +render). Katki zaten canli grid, Su native select -> haric.
// HTML degisti -> KURAL 12.3 CACHE_VERSION bump v131-108 -> v131-109.
const CACHE_VERSION = 'bm-cache-v131-109';

// Same-origin pre-cache. Adim 135-B: Fraunces + Hanken Grotesk woff2 eklendi (4 dosya, 180KB total)
// — Google Fonts CDN <link> kaldirildi, offline PWA tam destek.
const CRITICAL_LOCAL = [
  './Brewmaster_v2_79_10.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './fonts/Fraunces-latin.woff2',
  './fonts/Fraunces-latin-ext.woff2',
  './fonts/HankenGrotesk-latin.woff2',
  './fonts/HankenGrotesk-latin-ext.woff2',
  './fonts/Cinzel.woff2'
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
