# Web/PWA mühendisliği, test, CI, izleme ve barındırma araçları — Brewmaster için tarama (2026-11-07)

Kapsam notu: Bu notlar önceki (yarıda kesilen) araştırmacının araç sonuçlarını (özet dosyası) + bu oturumdaki ek doğrulamaları birleştirir. Fiyat/limit sayıları resmi sayfalardan, erişim tarihi 2026-11-07 (önceki ajan aynı gün). Yerel repo gözlemleri (/home/claude/brewmaster, GitHub dessn7-bit/brewmaster) "[YEREL ÖLÇÜM]" diye işaretli; bunların kaynağı repo dosyasıdır, URL değildir.

## 0. Yerel gerçekler (Brewmaster'ın bugünkü durumu — öneri değerlendirmesinin zemini)

### Takeaway
Bazı "eksik" sanılan şeyler zaten var (Wake Lock CEV koşusunda alınıyor, storage.persist çağrılıyor, yerel hata günlüğü var, Worker 404/410 ölü aboneliği budar); asıl açıklar: CEV wake lock'u sekme gizlenip geri gelince yeniden alınmıyor, sw.js'te pushsubscriptionchange yok, hata günlüğü cihazdan dışarı çıkmıyor, CI hiç yok, Firebase REST erişimi kimlik doğrulamasız.

### Cited Findings
- [YEREL ÖLÇÜM] Canlı HTML (https://dessn7-bit.github.io/brewmaster/Brewmaster_v2_79_10.html) 4.942.504 bayt (≈4,9 MB; CLAUDE.md'deki "3,7 MB" eskimiş), 43.104 satır; sw.js 83.618 bayt.
- [YEREL ÖLÇÜM] GitHub Pages yanıtı: `Accept-Encoding: gzip` → `content-encoding: gzip`, 1.561.982 bayt; `Accept-Encoding: br` → sıkıştırmasız 4.942.504 bayt (brotli YOK); `cache-control: max-age=600`; `server: GitHub.com`, `via: 1.1 varnish` (Fastly). Yerelde brotli q11 = 1.191.421 bayt (gzip'ten ≈%24 küçük), q5 = 1.333.867; gzip -9 = 1.542.861.
- [YEREL ÖLÇÜM] sw.js:751 `const CACHE_VERSION='bm-cache-v131-540'` — elle bump; sw.js'te `pushsubscriptionchange` sayısı = 0; `push` ve `notificationclick` dinleyicileri var (sw.js:983, 1006).
- [YEREL ÖLÇÜM] HTML 38505: CEV/AI koşusu başında `navigator.wakeLock.request('screen')` alınıyor, 38553'te bitince bırakılıyor; ama bu kilit için visibilitychange'te yeniden alma YOK (23236'daki visibilitychange yeniden alma yalnız Brew Day `_brewday.wakeLock` için; 40003 sync, 43066 alarm kontrolü). Sonuç: telefon ekranı bir kez kapanır/sekme arka plana giderse kilit düşer ve geri alınmaz.
- [YEREL ÖLÇÜM] HTML 7654–7656: `navigator.storage.persisted()` → değilse `persist()` çağrılıyor (zaten var).
- [YEREL ÖLÇÜM] HTML 1129–1172: `bm_hata_log_v1` (MAX 50) yerel hata günlüğü; `window.onerror` + `unhandledrejection` yakalanıyor, obje sebep gizlilik için serileştirilmiyor — ama günlük localStorage'da kalıyor, sunucuya gitmiyor.
- [YEREL ÖLÇÜM] Worker (_cf_worker/src/index.js): VAPID JWT kendi kodu; TTL varsayılan 60 sn, alarm için TTL 24 sa + `Urgency: high`; cron gönderiminde 404/410 → ölü abonelik budanıyor (satır 363). wrangler.toml: `crons = ["*/5 * * * *"]`, KV + R2 bağlı, `compatibility_date = "2025-05-01"`, `observability` bloğu YOK.
- [YEREL ÖLÇÜM] HTML 26361–26363: `getSubscription()` yoksa `subscribe({userVisibleOnly:true, applicationServerKey})`; 26401+: Ayarlar açılışında `getSubscription()` ↔ localStorage kıyası (sıfır-ağ yerel doğrulama) zaten var.
- [YEREL ÖLÇÜM] Firebase eşitlemesi SDK'sız REST: `https://<proje>-default-rtdb.firebaseio.com/brewmaster_<oda>.json` (HTML 39476–39485); istekte `auth=` parametresi yok (grep 0) → güvenlik yalnız oda adının gizliliğine + RTDB kurallarına dayanıyor. `odaToken` Worker'a (X-BM-Token) gidiyor, Firebase'e değil.
- [YEREL ÖLÇÜM] Repo'da `.github/` klasörü yok (CI yok). package.json: test = `node tests/regresyon.mjs`; devDependency **puppeteer ^24.43.0** (Playwright değil); regresyon.mjs 16.517 satır, `--parca=i/n` dilimleme zaten var (CEV3 E6: "bellek baskısında paket gruplara bölünüp SIRAYLA koşulur").
- [YEREL ÖLÇÜM] Türkçe büyük/küçük harf: HTML'de `.toLowerCase()` 184, `.toUpperCase()` 40, `toLocaleLowerCase('tr')` 24, `toLocaleLowerCase('tr-TR')` 3; `toLocaleString('tr-TR'…)` 11; `toFixed(` 740 (ondalık nokta üretir).
- [YEREL ÖLÇÜM] HTML ve netlify.toml'da Content-Security-Policy yok. manifest.webmanifest: `display: standalone`, `lang: tr`, iki ikon "any maskable" (tek ikonda iki amaç).

### Inferences
- "3,7 MB" sayısı CLAUDE.md'de güncellenmeli: ölçülen 4,94 MB (gzip ile tel üzerinde 1,56 MB).
- CEV koşusu için en ucuz düzeltme yeni araç değil, mevcut koda visibilitychange'te yeniden alma eklemektir (Brew Day'deki desen zaten aynı dosyada).

### Gaps
- Firebase RTDB kurallarının gerçek içeriği konsolda; repoda kural dosyası yok, canlı veritabanı yoklanmadı (hesap/anahtar kullanmama kısıtı).

## 1. CI: GitHub Actions (public repo), runner gücü, Playwright/Puppeteer dilimleme, önbellek, gece koşusu, artifact; alternatifler

### Takeaway
Public repo'da standart GitHub-hosted runner ücretsiz ve sınırsız; Linux x64/arm64 runner 4 vCPU / 16 GB RAM / 14 GB SSD — dizüstünü boğan 546 vakalık süiti 6 dilimli matrix ile buluta taşımak için en güçlü ve bedava seçenek (Brewmaster zaten `--parca=i/n` dilimlemesine sahip). Karar: **AL** (efor M).

### Cited Findings
- Public repo için `ubuntu-latest` (x64) ve `ubuntu-24.04-arm` (arm64): 4 CPU, 16 GB RAM, 14 GB SSD; private repo'da 2 CPU / 8 GB. Standart GitHub-hosted runner "free and unlimited on public repositories" — [GitHub Docs: GitHub-hosted runners reference](https://docs.github.com/en/enterprise-cloud@latest/actions/reference/runners/github-hosted-runners) (erişim 2026-11-07)
- Public repo runner gücünün artırılması 2024-01-17 tarihli "GitHub-hosted runners: Double the power for open source" duyurusuyla geldi (tarihsel bağlam; yalnız başlık arama sonucundan, sayfa açılmadı, eski/yeni sayılar buradan doğrulanmadı) — [GitHub Blog](https://github.blog/2024-01-17-github-hosted-runners-double-the-power-for-open-source/)
- 2026 fiyat değişikliği (sayfa tarihi 2025-12-15): hosted runner fiyatları 2026-01-01'den "up to 39%" düştü; self-hosted için duyurulan $0.002/dk platform ücreti ERTELENDİ ("postponing… to re-evaluate"); "Standard GitHub-hosted or self-hosted runner usage on public repositories will remain free." — [GitHub Resources: 2026 pricing changes for GitHub Actions](https://github.com/resources/insights/2026-pricing-changes-for-github-actions)
- Playwright dilimleme: `npx playwright test --shard=x/y`; `fullyParallel: true` ile test düzeyinde dengeleme; CI'da `blob` reporter, `npx playwright merge-reports --reporter html ./all-blob-reports`; resmi GitHub Actions örneği: matrix `shardIndex: [1,2,3,4]`, `fail-fast: false`, `actions/upload-artifact@v5` (`if: ${{ !cancelled() }}`, blob için `retention-days: 1`), birleştirme işi `download-artifact@v5` `pattern: blob-report-*` + `merge-multiple: true`, HTML rapor `retention-days: 14` — [Playwright Docs: Sharding](https://playwright.dev/docs/test-sharding)
- [YEREL ÖLÇÜM] Brewmaster süiti Puppeteer kullanıyor (package.json `puppeteer ^24.43.0`), Playwright değil; `tests/regresyon.mjs` zaten `--parca=i/n` (1 tabanlı dilim) destekliyor ve CLAUDE.md "npm test 6 dilim 91/91 ×6" diyor.

### Inferences
- Playwright'a geçmeye gerek yok: GitHub Actions matrix `parca: [1,2,3,4,5,6]` → her iş `node tests/regresyon.mjs --parca=${{matrix.parca}}/6` koşar; 6 iş PARALEL çalışır (her biri ayrı 16 GB'lık VM), dizüstünde sıralı koşulan dilimler bulutta aynı anda biter. Playwright'ın blob/merge raporlaması yerine her dilimin metin çıktısı artifact olarak yüklenir (Playwright örneğindeki `upload-artifact` + `!cancelled()` deseni aynen uygulanabilir).
- Puppeteer Chrome'u ilk kurulumda indirir; `actions/cache` ile Puppeteer önbellek klasörü saklanabilir (Puppeteer'in önbellek yolu bu oturumda resmi belgeden doğrulanmadı → Gaps).
- Gece koşusu: `on: schedule: - cron: '…'` (UTC) + `workflow_dispatch` (elle tetik). Public repo'da dakika maliyeti yok.
- KISIT/RİSK: (1) Repo PUBLIC — CI log'ları herkese açık; testler gerçek API çağırmamalı (CLAUDE.md kuralı zaten "gerçek API harcaması YALNIZ Kaan düğmeye basınca"); hiçbir secret workflow'a verilmemeli. (2) `tests/cev_seti_heldout.json` ve `*TAM_heldout_iceriyor*` dosyaları CC tarafından açılmıyor — CI işi bu dosyaları okuyan testleri koşmamalı ya da mevcut "dosya yoksa SKIP" davranışı korunmalı; held-out zaten repoda mı, değil mi bu oturumda doğrulanmadı. (3) Zamanlanmış workflow'lar public repo'da 60 gün etkinlik yoksa GitHub tarafından devre dışı bırakılabilir (bu oturumda resmi kaynaktan doğrulanmadı → Gaps).
- Alternatifler: Cloudflare Pages build (500 build/ay, 20 dk zaman aşımı, eşzamanlı 1 — bkz. §9) test koşturmak için tasarlanmamış; Netlify build dakikaları da kredi sistemine bağlı (doğrulanmadı). Test için GitHub Actions açık ara en uygun.

### Gaps
- Puppeteer önbellek dizini ve `actions/cache` anahtarı için resmi Puppeteer belgesi açılmadı.
- GitHub'ın public repo'da etkinlik olmayınca zamanlanmış workflow'u devre dışı bırakma kuralı (60 gün) bu oturumda kaynaktan doğrulanmadı.
- GitHub Actions iş başına süre sınırı (6 sa) ve eşzamanlı iş sayısı (Free hesap) resmi sayfadan bu oturumda okunmadı.

## 2. Web Push güvenilirliği: abonelik düşmesi, pushsubscriptionchange, Android Chrome vs iOS, Declarative Web Push, otomatik yeniden abonelik

### Takeaway
`pushsubscriptionchange` artık Chrome'da var ama yalnız "izin geri verilince yeniden abonelik" durumunda ve boş old/new ile; abonelik yenilemede (refresh) Chrome bu olayı ATEŞLEMİYOR, iOS Safari hiç desteklemiyor. Bu yüzden asıl çözüm olay değil, istemci tarafında periyodik "uzlaştırma" (getSubscription ↔ sunucu kaydı, farklıysa yeniden gönder) + sunucuda 404/410 budaması; sw.js'e pushsubscriptionchange eklemek ucuz bir ek katman. Karar: pushsubscriptionchange dinleyicisi **AL** (S); uzlaştırma deseni **AL** (S–M); Declarative Web Push **İZLE** (iPhone kullanılmıyorsa ALMA).

### Cited Findings
- MDN: olay, abonelik "uygulamanın kontrolü dışında" değişince (tarayıcı yenilediğinde, iptal/kayıp) servis işçisine gelir; örnek desen `event.oldSubscription.options` ile `pushManager.subscribe()` + sunucuya eski/yeni yükü `fetch` ile bildir, `event.waitUntil()`; çevrimdışıyken `fetch` başarısız olur → sağlam tekrar mekanizması önerilir; özellik "Limited availability", Baseline değil. Sayfa son değişiklik 2026-10-26 — [MDN: pushsubscriptionchange event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event)
- MDN uyumluluk verisi (BCD): pushsubscriptionchange — Chrome 138 (Chrome Android/WebView/Samsung "mirror"), Firefox 44 (kısmi: oldSubscription/newSubscription özellikleri yok, bug 1497429), Safari 16 (masaüstü), **Safari iOS: desteklenmiyor (false)**; Edge 17–79 arası vardı, kaldırıldı. Karşılaştırma: `push` olayı Safari iOS 16.4 ("web apps saved to the home screen") — [mdn/browser-compat-data ServiceWorkerGlobalScope.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ServiceWorkerGlobalScope.json)
- Chrome Intent to Ship (2025-04-17): Chrome, izni granted→denied/default olup kaybolan aboneliği olan bir origin'e izin yeniden verilince olayı ateşler; old/new boş; hedef **Chrome 137** masaüstü+Android; iOS'ta yok; Android WebView etkilenmez çünkü "the Web Push API is not enabled there"; Chrome abonelik yenilemede (refresh) olayı ateşlemiyor (spec MUST diyor — boşluk) — [blink-dev Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/_ckNx_SZIjc). ÇELİŞKİ: Intent to Ship 137 diyor, BCD 138 diyor; kesin sürüm askıda (ikisi de Kasım 2026 itibarıyla eski sürümler, pratik etkisi yok).
- WebKit "Meet Declarative Web Push" (Brady Eidson, 2025-03-27): servis işçisi gerekmeden bildirim; yük `"web_push": 8030` + `notification.title` + `navigate` URL; abonelik `window.pushManager` ile `userVisibleOnly: true`; klasik Web Push'ta betik bildirim göstermezse abonelik iptal edilir, declarative mesaj hep görünür bildirim olduğundan bu ceza uygulanmaz; pencere düzeyi abonelik servis işçisinin (ITP dahil) silinmesinden etkilenmez; test: iOS 18.4, iPadOS 18.4, macOS 15.5 beta; eski tarayıcılar declarative yükü JS ile eskisi gibi işler — [WebKit Blog](https://webkit.org/blog/16535/meet-declarative-web-push/)
- [YEREL ÖLÇÜM] Worker cron gönderiminde 404/410 → ölü abonelik siliniyor; alarm push'u TTL 24 sa + Urgency high; istemcide Ayarlar açılışında getSubscription ↔ localStorage kıyası var; sw.js'te pushsubscriptionchange yok.

### Inferences
- Android Chrome'da "sessizce düşen abonelik" belirtisi sunucu tarafında 404/410 olarak görülür ve Worker zaten bunu budar — ama bu, kullanıcıya haber vermeden alarmın kaybolması demek. Önerilen 3 katman: (1) sw.js'e MDN desenindeki `pushsubscriptionchange` dinleyicisi (Chrome 137/138+ izin-geri-verme durumunu yakalar; Firefox'ta old/new yok → `self.registration.pushManager.subscribe({userVisibleOnly:true, applicationServerKey})` ile yeniden abone ol, Worker'a `/sub` ile gönder); (2) uygulama her açılışta/`visibilitychange` görünürde: `getSubscription()` null ise veya endpoint, Worker'daki kayıttan farklıysa sessizce yeniden abone ol ve upsert et (izin hâlâ `granted` ise kullanıcı etkileşimi gerekmez); (3) Worker 404/410 budadığında KV'ye "cihaz X aboneliği öldü" işareti koysun, uygulama açılışta bunu görünce yeniden abone olsun ve "Alarm aboneliği yenilendi" tostu göstersin. (3) mevcut healthchecks.io cron izlemesini tamamlar: cron çalışıyor ama abonelik ölü durumu ayrıca görünür olur.
- `web-push` (Node kütüphanesi) gerekmiyor: Worker zaten VAPID imzasını kendisi yapıyor; kütüphane Node API'lerine dayandığından Worker'a taşımak ek iş — ALMA (kütüphanenin Workers uyumluluğu bu oturumda doğrulanmadı).
- Declarative Web Push yalnız Apple tarafında (iOS/iPadOS 18.4+, macOS Safari); Kaan'ın cihazı Android ise faydası yok → İZLE. Bir gün iPhone kullanılırsa: iOS'ta pushsubscriptionchange yok, sessiz push cezası var → declarative format en sağlam yol olur.
- Notification Triggers (zamanlanmış yerel bildirim) — bu oturumda güncel durum kaynaktan doğrulanmadı (bkz. Gaps); Brewmaster'ın sunucu cron'lu push mimarisi zaten bu ihtiyacı karşılıyor.

### Gaps
- Android Chrome'da (FCM) aboneliklerin hangi koşullarda (uygulama verisi silme, uzun süre kullanılmama, FCM token yenileme) düştüğüne dair resmi Google belgesi bulunamadı/okunmadı — "bulamadım".
- `PushSubscription.expirationTime` Chrome'da null mı döner — resmi kaynakla doğrulanmadı.
- Notification Triggers API'nin (Chrome origin trial) son durumu bu oturumda doğrulanmadı.

## 3. Screen Wake Lock (Chrome Android, iOS Safari, kurulu PWA ve TWA), NoSleep.js, Background Sync / Periodic Sync / Background Fetch

### Takeaway
Wake Lock artık her yerde var (Chrome/Android 84, Firefox 126, Safari 16.4, iOS 18.4 — iOS'ta Home Screen web app'te 18.4'ten önce çalışmıyordu); Brewmaster CEV koşusunda kilidi zaten alıyor ama sekme gizlenince düşen kilidi geri almıyor — 1 saatlik koşu için eksik olan tek şey MDN'in visibilitychange yeniden-alma deseni. Karar: yeniden-alma düzeltmesi **AL** (S); NoSleep.js **ALMA**; Background Sync/Periodic Sync/Background Fetch bu iş için **ALMA**.

### Cited Findings
- Destek: Chrome 84, Chrome Android 84, Edge 84 (2020-07), Firefox 126 (2024-05-14), Safari 16.4 (2023-03-27), **Safari iOS 18.4 (2025-03-31)**; Baseline "Newly available" 2025-03-31, "Widely available" beklenen 2027-10-01 — [web-features explorer: Screen wake lock](https://web-platform-dx.github.io/web-features-explorer/features/screen-wake-lock)
- BCD notu: Safari iOS 16.4–18.4 arası kısmi: "Does not work in standalone Home Screen Web Apps. See bug 254545"; 18.4'ten itibaren tam; `webview_android` "mirror" (Chrome ile aynı) — [mdn/browser-compat-data WakeLock.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/WakeLock.json)
- MDN: kilit pil çok düşükse veya belge gizli/etkisiz olunca sistemce bırakılır, `WakeLockSentinel` `release` olayı atar ve yeniden kullanılamaz — yeni istek gerekir; önerilen desen: `document.addEventListener("visibilitychange", async () => { if (wakeLock !== null && document.visibilityState === "visible") wakeLock = await navigator.wakeLock.request("screen"); })`; yalnız HTTPS; Permissions-Policy `screen-wake-lock` (varsayılan `self`); istek güç tasarrufu/düşük pil/belge görünür değilken reddedilebilir; uygulama kilit durumunu göstermeli ve kapatma imkânı vermeli; uzun indirme için Background Fetch, veri eşitleme için Background Sync önerilir — [MDN: Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [YEREL ÖLÇÜM] HTML 38505/38553: CEV koşusu kilidi alıyor/bırakıyor, yeniden alma yok; Brew Day (23226–23237) yeniden almayı yapıyor.

### Inferences
- TWA (Chrome Custom Tab altyapısı, §4) ve kurulu PWA Chrome motorunda çalıştığı için Wake Lock aynı davranır; Capacitor'daki Android System WebView için BCD "mirror" diyor (Chrome sürümüne bağlı).
- Önemli sınır: Wake Lock ekranı açık tutar ama kullanıcı başka uygulamaya geçerse/ekranı elle kapatırsa sayfa gizlenir, kilit düşer ve Android sekmeyi dondurabilir; 55 soruluk koşu zaten `T3.segmentArsiv` ile ilerlemeyi saklıyor ve "Devam et" ile kaldığı yerden sürüyor (HTML ≈38495–38525 aralığı, `dongu()` içinde `T3.segmentArsiv(set, d)` ve `d.durdu` mesajları) — yani doğru tasarım "kilit + kaldığı yerden devam", arka plan API'si değil.
- Önerilen küçük düzeltme: `kilit` değişkenini modül düzeyine al; `kilit.addEventListener('release', …)` ile durum göstergesi; `visibilitychange` görünürde `T3.calisiyor && !kilit` ise yeniden iste; koşu bitince `kilit=null`. UI'da "🔆 Ekran açık tutuluyor" rozeti (MDN'in "durumu göster" önerisi).
- NoSleep.js (gizli video oynatma hilesi): tüm hedef tarayıcılarda yerel API olduğundan gereksiz; pil/medya yan etkisi → ALMA (NoSleep.js deposunun güncel durumu bu oturumda incelenmedi).
- Periodic Background Sync / Background Fetch: periyodik eşitleme deneysel, Baseline değil, Chrome'da yalnız kurulu (ayrı pencerede açılan) web app'e ve site etkileşim puanına göre veriliyor; ne zaman ateşleneceğine tarayıcı karar veriyor (bkz. Cited Findings ek madde) → kısa yenileme işleri içindir, 1 saatlik 55 soruluk koşu için değil. Ayrıca Anthropic API çağrıları anahtarla istemciden yapıldığından arka plana taşımak anlamsız. Uzun koşuyu gerçekten arka plana almak isteniyorsa doğru yer sunucu (Worker + Queue/Workflow) olurdu — ama bu, API anahtarının uygulamadan çıkmaması kuralına aykırı → ALMA.

### Gaps
- Periodic Background Sync için sürüm bazlı destek tablosu ve minimum minInterval değeri MDN sayfasında yer almıyordu; Background Fetch / Background Sync destek tabloları okunmadı.
- EK KAYNAK (Cited, §3'e ait): MDN — Periodic Background Sync servis işçisinde periyodik görev çalıştırır; HTTPS + `periodic-background-sync` izni; "Chrome: izin yalnız ayrı uygulama olarak açılan kurulu web app'e verilir ve site etkileşim puanı olayların ateşlenip ateşlenmeyeceğini/sıklığını belirler"; "Limited availability", "experimental" — [MDN: Web Periodic Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API)
- TWA'da bildirim yetkisinin (Android 13 POST_NOTIFICATIONS) nasıl devredildiğine dair güncel resmi belge bulunamadı (bkz. §4).

## 4. APK paketleme: TWA (Bubblewrap / PWABuilder) vs Capacitor; push ve wake lock davranışı; Play Store hedef API (2026)

### Takeaway
TWA, Chrome'un kendisini (Custom Tabs) kullandığı için Web Push, Wake Lock, servis işçisi ve depolama PWA ile birebir aynı çalışır; Capacitor ise Android System WebView kullanır ve WebView'da Web Push API kapalıdır — Brewmaster'ın VAPID/Worker push mimarisi Capacitor'da çalışmaz. Play'e güncelleme yüklenecekse 2026-08-31'den beri targetSdk 36 şart (uzatma 2026-11-01'de bitti). Karar: TWA (Bubblewrap) **AL/devam**; Capacitor **ALMA**.

### Cited Findings
- Google Play: 2026-08-31'den itibaren yeni uygulamalar ve güncellemeler **Android 16 (API 36)** veya üstünü hedeflemeli (Wear/Automotive 35, TV/XR 34); mevcut uygulamalar yeni kullanıcılara görünmeye devam etmek için en az API 35; ek süre talebiyle **2026-11-01**'e kadar uzatma; istisna: yalnız kurum içi dağıtılan özel uygulamalar — [Android Developers: Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)
- Bubblewrap sürümleri: v1.25.0 (31 Tem), v1.24.1 (29 Eyl), v1.24.0 (25 Eyl), v1.23.0 (25 Haz; billing library 1.1.0), v1.22.7 (16 Haz); v1.25.0, #1047 "Bump targetSdkVersion to 36" sorununu #1051 ile düzeltiyor; 130 açık issue / 35 açık PR — [GitHub: GoogleChromeLabs/bubblewrap releases](https://github.com/GoogleChromeLabs/bubblewrap/releases) (sayfa yıl göstermiyor; v1.25.0'ın 2025 mi 2026 mı olduğu askıda)
- TWA "display[s] web content in a customized Custom Tab without browser UI", "Shares cookies and storage with the user's main Chrome profile"; Chrome başlatan uygulamayı Digital Asset Links ile doğrular; kabuk mağazadan, web içeriği otomatik güncellenir. WebAPK'ta "Chrome hands over notifications to the WebAPK to display"; Android T+ bildirim izni sorgulama/isteme devri anlatılıyor — [Chromium: Android Web App Architectures (WebAPK and TWA)](https://chromium.googlesource.com/chromium/src/+/main/components/webapps/docs/android_architecture.md)
- Android WebView'da "the Web Push API is not enabled there" — [blink-dev Intent to Ship: pushsubscriptionchange](https://groups.google.com/a/chromium.org/g/blink-dev/c/_ckNx_SZIjc)
- Wake Lock `webview_android`: Chrome ile aynı ("mirror", 84+) — [mdn/browser-compat-data WakeLock.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/WakeLock.json)
- Bubblewrap: `bubblewrap update` + `bubblewrap build`; manifest değişikliği için önce `bubblewrap merge`; çıktı `app-release-bundle.aab`; konum izni devri seçeneği (sayfa 2020-12-02 tarihli, eski) — [Chrome Developers: What's new for Web In Play](https://developer.chrome.com/docs/android/trusted-web-activity/whats-new)
- [YEREL ÖLÇÜM] Repo'da `twa-manifest.json`, `.well-known/assetlinks.json` veya Capacitor dosyası yok; mevcut APK'nın nasıl üretildiği repodan anlaşılmıyor.

### Inferences
- TWA'da push: abonelik Chrome profilinde yaşar (depolama paylaşımı), bu yüzden mevcut VAPID + Worker akışı değişmeden çalışır; bildirimin uygulama adıyla görünmesi Chrome'un bildirim devrine bağlıdır (TWA için güncel resmi metin bulunamadı).
- Capacitor'a geçmek: Web Push yerine native FCM eklentisi + Worker'ın FCM HTTP v1'e (servis hesabı anahtarı) göre yeniden yazılması + WebView güncelleme farklılıkları demek → büyük iş (L), Brewmaster'a getirisi yok → ALMA.
- APK Play'de değil de elden (sideload) kuruluyorsa hedef API kuralı bağlamaz; Play'de ise yeni güncelleme için targetSdk 36 gerekir → Bubblewrap ≥ v1.25.0 ile yeniden derleme (S–M). Kaan'ın imza anahtarı (keystore) yerelde olmalı; anahtar repoya GİRMEZ (repo public).
- Digital Asset Links doğrulaması origin köküne bağlıdır; Brewmaster bir GitHub *project* sitesi (dessn7-bit.github.io/brewmaster) olduğundan asset links dosyası kullanıcı sitesinin köküne konmalı — bu kural bu oturumda resmi belgeden doğrulanmadı (Gaps); doğrulama başarısızsa TWA adres çubuklu Custom Tab'a düşer.

### Gaps
- Mevcut APK'nın türü (TWA mı, WebView sarmalayıcı mı, WebAPK mı) ve Play'de olup olmadığı bilinmiyor — Kaan'a sorulmalı.
- TWA'da Android 13+ bildirim izni devri ve Digital Asset Links yerleşimi için güncel resmi kaynak okunmadı.
- PWABuilder'ın Android paketleyicisinin güncel targetSdk'si doğrulanmadı.

## 5. İstemci hata izleme (ücretsiz katmanlar) — Sentry, GlitchTip, Highlight.io, LogRocket, Better Stack, Cloudflare Workers Logs; gizlilik; kendi Worker+KV uç noktası

### Takeaway
Brewmaster zaten hataları yerelde (`bm_hata_log_v1`, 50 kayıt) yakalıyor; eksik olan tek şey bunların cihazdan çıkması. En basit, bedava ve gizlilik dostu yol: mevcut Worker'a `/hata` uç noktası (toplu gönderim, günde ≤ birkaç KV yazımı) + Workers Logs'u açmak. Üçüncü taraf SaaS'lar (Sentry 5k hata/ay) çalışır ama yeni SDK, yeni hesap ve kişisel veri riski getirir. Karar: kendi uç nokta **AL** (S–M); Workers Logs **AL** (S); Sentry **DENE** (yalnız gerekirse); GlitchTip **İZLE**; Better Stack **İZLE**; Highlight.io **ALMA**; LogRocket **ALMA**.

### Cited Findings
- Sentry Developer (ücretsiz): 1 kullanıcı, 5.000 hata, 5 M span, 50 oturum tekrarı, 1 cron monitörü, 1 uptime monitörü, 5 GB log, 5 GB metrik, 1 GB ek, 30 gün geriye bakış; Team $29/ay (yıllık $26) — [Sentry Pricing](https://sentry.io/pricing/) (önceki ajan 2026-11-07'de okudu)
- Sentry gizlilik: kullanıcı bağlamı `sendDefaultPii` ile kontrol edilir; JavaScript SDK önceki log satırlarını breadcrumb olarak toplayabilir; sorgu dizeleri/URL'ler veride görünebilir; `beforeSend` ile tarayıcıdan çıkmadan temizleme; sunucu tarafı temizleme veriyi göndermeyi engellemez — [Sentry Docs: Scrubbing Sensitive Data](https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/) (sendDefaultPii varsayılan değeri sayfada yazmıyor)
- GlitchTip barındırılan: Free 1.000 olay/ay, 30 gün saklama; Small $15/ay 100k olay; Medium $50 500k; Large $250 3 M; "open source, Sentry API compatible"; kendi sunucuda çalıştırılabilir — [GlitchTip Pricing](https://www.glitchtip.com/pricing)
- Highlight.io: bağımsız hizmet **2026-02-28**'de kapanıyor, LaunchDarkly Observability'ye katılıyor; "The repo remains, but the running product won't." — [Bugsink: Is Highlight.io shutting down?](https://www.bugsink.com/is-highlight-io-shutting-down) (ikincil kaynak; highlight.io blog adresi launchdarkly.com'a yönleniyor — önceki ajan gözlemi)
- Better Stack Free: 10 monitör+heartbeat, 1 durum sayfası, **100.000 exception/ay**, 3 GB log 3 gün, 3 GB trace 3 gün, 5.000 session replay, Slack ve e-posta uyarısı — [Better Stack Pricing](https://betterstack.com/pricing.md)
- Cloudflare Workers Logs: `[observability] enabled = true` (+ `head_sampling_rate`), Wrangler ≥ 3.78.6; **Free: günde 200.000 log olayı, 3 gün saklama**; Paid: ayda 20 M + $0,60/M, 7 gün; log başına 256 KB; "starting December 1, 2026, Workers Logs will move to Cloudflare Observability pricing" — [Cloudflare Docs: Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- Workers Free: günde 100.000 istek (00:00 UTC sıfırlanır), HTTP isteği ve Cron başına 10 ms CPU, hesap başına 5 Cron Trigger, çağrı başına 50 alt istek, 128 MB bellek — [Cloudflare Docs: Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Workers KV Free: günde 100.000 okuma, **günde 1.000 yazma** (farklı anahtarlar), aynı anahtara saniyede 1 yazma, 1 GB depolama, değer 25 MiB, anahtar 512 bayt — [Cloudflare Docs: KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- [YEREL ÖLÇÜM] `bm_hata_log_v1`: aynı tip+kaynak 60 sn içinde birleştirilip sayaçlanıyor (n), mesaj 300 karakterle kesiliyor, obje sebepler serileştirilmiyor (gizlilik); wrangler.toml'da `observability` yok.

### Inferences
- Kendi uç nokta tasarımı (Claude yapar, Kaan'a iş düşmez): istemci, `bm_hata_log_v1`'deki yeni kayıtları en fazla saatte bir (ve `visibilitychange`→hidden'da `navigator.sendBeacon` ile) mevcut `X-BM-Token` başlığıyla `/hata`'ya yollar; Worker günlük tek anahtara (`hata:YYYY-MM-DD:<cihaz>`) birleştirerek yazar → günde birkaç yazım, KV'nin 1.000/gün sınırının çok altında; aynı anda `console.log(JSON)` ile Workers Logs'a da düşer (3 gün). Claude, Worker'ın mevcut yetkili okuma yolu üzerinden hataları sorgulayıp sprint başında rapor edebilir — üçüncü tarafa veri gitmez.
- Dikkat: KV yazma kotası push abonelikleri/alarm kayıtlarıyla PAYLAŞILIR; hata gönderimi mutlaka toplu (batch) olmalı, hata başına yazım değil. Gizlilik: mesajdan URL sorgu dizeleri, e-posta/anahtar kalıpları (`sk-ant-…`) maskelenmeli (uygulamada `MASK(...)` maskeleme fonksiyonu zaten kullanılıyor — HTML ≈38504, `MASK(r.hata.mesaj)`).
- Workers Logs'un fiyatı 2026-12-01'de değişiyor: açmadan önce yeni "Cloudflare Observability" ücretsiz kotası kontrol edilmeli (askıda).
- Sentry, tek kullanıcılı hobi uygulaması için 5.000 hata/ay ile fazlasıyla yeter; ama SDK eklemek 4,9 MB tek dosyaya dış betik/CDN bağımlılığı ve DSN'nin public repoda görünmesi demek (DSN gizli değildir ama kötüye kullanılıp kotayı doldurabilir). Ancak kaynak haritası (source map) yok ve kod tek HTML'de olduğundan yığın izleri zaten satır numarasıyla okunabilir — Sentry'nin ek değeri sınırlı.
- LogRocket araştırılmadı; oturum kaydı (session replay) tarif/defter içeriğini dışarı taşır → gizlilik kuralıyla çelişir → ALMA.

### Gaps
- LogRocket'in güncel ücretsiz katmanı bu oturumda doğrulanmadı.
- Cloudflare Observability'nin 2026-12-01 sonrası ücretsiz kotası bulunamadı.
- Sentry `sendDefaultPii` varsayılan değeri ve IP saklama davranışı sayfada yazmıyordu.

## 6. Uptime / sentetik izleme (UptimeRobot, Better Stack, Checkly), healthchecks.io sınırları

### Takeaway
Cron için seçilmiş healthchecks.io'nun ücretsiz Hobbyist planı (20 kontrol) fazlasıyla yeter; canlı HTML ve Worker için UptimeRobot ücretsiz (50 monitör, 5 dk, anahtar kelime kontrolü) en basit tamamlayıcı. Tarayıcıyla gerçek sayfa açan sentetik test (Checkly 1.000 tarayıcı koşusu/ay) güzel ama GitHub Actions gece koşusu aynı işi bedava yapar. Karar: healthchecks.io **AL** (zaten seçili); UptimeRobot **AL** (S); Checkly **İZLE**; Better Stack uptime **İZLE**.

### Cited Findings
- healthchecks.io Hobbyist (ücretsiz): 20 iş (check), iş başına 100 log kaydı (eski kayıtlar silinir); en ucuz ücretli "Supporter" $5/ay ve Hobbyist ile aynı limitler — [Healthchecks.io Pricing](https://healthchecks.io/pricing)
- UptimeRobot Free: 50 monitör, 5 dk aralık, HTTP/port/ping/keyword; heartbeat/cron, API, UDP, DNS, SSL/alan adı süresi YOK; 1 durum sayfası (özelleştirmesiz); belge "Personal projects, basic checks" diyor, ticari kısıt yazmıyor; en ucuz ücretli Solo €10/ay (yıllık €9/ay, 10 monitör) — [UptimeRobot Pricing (md)](https://uptimerobot.com/pricing.md). Not: önceki ajanın özeti uyarı kanalları olarak "5 entegrasyon (Google Chat, Discord, Pushover, Pushbullet, Splunk)" listeledi, e-postayı saymadı — e-posta bildiriminin ücretsizde olup olmadığı bu özetle netleşmedi (askıda).
- Better Stack Free: 10 monitör+heartbeat (ortak havuz), 1 durum sayfası; ücretsiz plan için kontrol aralığı yazmıyor; Slack ve e-posta uyarısı — [Better Stack Pricing](https://betterstack.com/pricing.md)
- Checkly Hobby: ayda 10.000 API kontrolü, **1.000 tarayıcı/Playwright kontrolü** (Check Suite'ler aynı havuzdan), 10 uptime monitörü, uptime için en sık 2 dk, 6 genel konum (kontrol başına en fazla 3), e-posta/Slack/webhook, 1 kullanıcı, ham veri 7 gün, toplu veri 30 gün; Starter $24/ay (yıllık) — [Checkly Pricing](https://www.checklyhq.com/pricing/)
- Sentry Developer planı da 1 cron + 1 uptime monitörü içeriyor — [Sentry Pricing](https://sentry.io/pricing/)

### Inferences
- Somut kurulum: (1) Worker cron işi her 5 dk'lık koşunun sonunda healthchecks.io ping URL'ine GET atar (period 5 dk, grace ~10 dk) — CF'nin 50 alt istek sınırına 1 ekler; (2) UptimeRobot: canlı HTML'de anahtar kelime monitörü (ör. "Brewmaster" veya sürüm etiketi) + Worker'da hafif `/saglik` uç noktası. 5 dk'lık kontrol günde 288 istek → Workers 100k/gün kotasında ihmal edilebilir.
- Dikkat: healthchecks.io ping URL'i ve UptimeRobot hesabı Kaan'ın hesap açmasını gerektirir (bu araştırmada hesap açılmadı); ping URL'i bir "secret" sayılmalı, public repoya yazılmamalı (Worker secret olarak saklanır).
- Checkly'nin tarayıcı kontrolü (Playwright) sayfayı gerçekten açıp konsol hatası arayabilir; ama 4,9 MB sayfa + Kaan'ın verisi olmadan ölçülen davranış sınırlı; GitHub Actions'ta gece Puppeteer koşusu bedava ve sınırsız → Checkly gereksiz.

### Gaps
- UptimeRobot ücretsiz planda e-posta uyarısının dahil olup olmadığı birincil sayfadan net okunamadı.

## 7. Firebase RTDB güvenlik kuralları araçları — Emulator Suite kural birim testleri, kimliksiz/anonim uygulama tuzakları, App Check

### Takeaway
Brewmaster RTDB'ye SDK'sız, kimlik doğrulamasız REST ile yazıyor; Firebase'in kendi belgesi "kimlik doğrulama + kural yoksa proje kimliğini tahmin eden herkes verini çalabilir, değiştirebilir, silebilir" diyor. Kural sertleştirmesi (kök okumayı kapat, yalnız `brewmaster_<oda>` yolu, `.validate` ile şekil/boyut) hemen yapılabilir; kalıcı çözüm ya anonim Auth + `auth != null` ya da yazmaları zaten tokenlı Worker üzerinden geçirmek. Karar: kural sertleştirme + Emulator kural testleri **AL** (M); App Check **ALMA** (şimdilik); Worker-vekil mimarisi **DENE** (M–L).

### Cited Findings
- Firebase: açık kurallar (`".read": true`, `".write": true`) için "NEVER use this ruleset in production; it allows anyone to overwrite your entire database"; "kullanıcıları doğrulamaz ve kuralları yapılandırmazsanız proje kimliğinizi tahmin eden herkes verileri çalabilir, değiştirebilir veya silebilir"; önerilen çözüm Firebase Authentication ile `auth !== null && auth.uid === $uid`; geliştirmede yerel Emulator Suite, hızlı kontrol için konsoldaki Rules simülatörü; Admin SDK/Cloud Functions kuralları atlar — [Firebase: Avoid insecure rules (firebase.google.cn ayna)](https://firebase.google.cn/docs/rules/insecure-rules) (firebase.google.com robots nedeniyle okunamadı)
- Kural birim testi: `@firebase/rules-unit-testing` — `initializeTestEnvironment()`, `authenticatedContext()`, `unauthenticatedContext()`, `assertSucceeds/assertFails`, `withSecurityRulesDisabled`; RTDB emülatörü `localhost:9000`, veritabanı `ns` parametresiyle; ilk erişimde otomatik oluşur ve KAPALI kurallarla başlar; `"owner"` yönetici token'ı; Spark sınırları (100 eşzamanlı bağlantı); gerçek Auth akışı emülatörde çalışmaz, kütüphanenin auth taklidi kullanılır; veri oturum içinde kalır, testler arasında temizlenmeli; kütüphane üretim kaynaklarına dokunmaz — [Firebase Docs: Build unit tests](https://firebase.google.com/docs/rules/unit-tests)
- App Check: Realtime Database'i korur; web sağlayıcısı reCAPTCHA Enterprise ("no-cost for 10,000 assessments each month"), Android'de Play Integrity (Standard API günde 10.000 çağrı); App Check "does not guarantee the elimination of all abuse", Authentication ile tamamlayıcı — [Firebase: App Check (firebase.google.cn)](https://firebase.google.cn/docs/app-check)
- [YEREL ÖLÇÜM] İstek yolu `…firebaseio.com/brewmaster_<oda>.json`, `auth=` yok; Worker için ayrı `odaToken` var.

### Inferences
- Bugünkü güvenlik "gizli oda adı" (yetenek URL'i) modeline dayanıyor; RTDB URL'i ve oda adı ele geçerse (ör. ekran görüntüsü, public repo'ya kazara yazılan yapılandırma) veri okunur/silinir. Kök düzeyde `.read` açıksa `/.json?shallow=true` tüm oda adlarını listeler (REST'in shallow özelliği bu oturumda belgeden doğrulanmadı).
- Kimlik doğrulamasız bile yapılabilecek sertleştirme (S–M): kök `.read/.write: false`; `brewmaster_$oda` altında okuma/yazma; `.validate` ile beklenen alanlar + boyut sınırı; tüm düğümü `null` yapmayı (silme) engelleme. Bunlar Emulator testleriyle (GitHub Actions'ta Java + firebase-tools gerekir) kilitlenebilir.
- Daha güçlü seçenek A: Firebase Anonymous Auth (REST ile token alıp `?auth=<idToken>`); ama anonim uid cihaz başına değişir → iki cihazın aynı odayı paylaşması için uid'leri odaya bağlayan ek kural gerekir. Seçenek B: Brewmaster'ın zaten var olan `odaToken`'ı ile Worker'ı vekil yapmak (Worker veritabanı gizli anahtarını secret olarak tutar), RTDB'yi istemciye tamamen kapatmak — tek kapı, Workers 100k istek/gün ve 50 alt istek sınırına uyar; ama eşitleme kodu yeniden yazılır (M–L).
- App Check REST isteğine özel başlık + reCAPTCHA Enterprise kurulumu ister, kuralların yerini tutmaz → tek kullanıcılı uygulamada maliyet/karmaşıklık fazla → ALMA (şimdilik).
- Kaan'ın kararı gereken nokta: Firebase konsolunda mevcut kuralları Claude'a göstermesi (ekran görüntüsü/metin) — kural dosyası repoda yok.

### Gaps
- Mevcut RTDB kuralları görülmedi.
- Firebase REST'te App Check başlığı (`X-Firebase-AppCheck`) ve anonim Auth REST akışı resmi belgeden okunmadı.

## 8. Servis işçisi araçları — Workbox (revizyonlu precache), Lighthouse CI, PWABuilder raporu, web.dev PWA kontrol listesi

### Takeaway
Workbox'ın elle CACHE_VERSION bump'ını kaldırma vaadi gerçek, ama Brewmaster için uygun mod (injectManifest) Node derleme adımı ister ve varsayılan 2 MiB dosya sınırı 4,9 MB'lık HTML'i sessizce dışarıda bırakır; aynı faydayı 20 satırlık "HTML md5 → CACHE_VERSION" betiği (CI'da veya deploy öncesi) verir. Karar: otomatik sürüm betiği **AL** (S); Workbox **ALMA** (şimdilik); Lighthouse CI / PWABuilder raporu **İZLE** (doğrulanmadı).

### Cited Findings
- workbox-build: `generateSW` tam SW üretir — "Web Push veya özel betik/önbellek mantığı gerekiyorsa kullanma"; `injectManifest` mevcut SW'ye (`swSrc`) `self.__WB_MANIFEST` noktasına precache listesini enjekte eder, dosyanın kalanına dokunmaz; her giriş `url` + `revision`; varsayılan `globPatterns` `**/*.{js,wasm,css,html}`; **`maximumFileSizeToCacheInBytes` varsayılanı 2097152 (2 MiB)**; her iki mod da Node tabanlı derleme süreci içindir — [Chrome Developers: workbox-build](https://developer.chrome.com/docs/workbox/modules/workbox-build)
- Workbox sürümleri: v7.4.0 (2025-11-19, bağımlılık güncellemeleri), v7.3.0 (2024-10-29), v7.1.0 (2024-04-23), v7.0.0 (2023-05-31, Node ≥16); bakım durumu açıkça yazmıyor — [upd.dev ayna: GoogleChrome/workbox releases](https://upd.dev/GoogleChrome/workbox/releases) (ikincil ayna; GitHub sayfası doğrudan açılmadı)
- [YEREL ÖLÇÜM] sw.js 83 KB, özel push/alarm/IDB mantığı içeriyor; CACHE_VERSION her deploy elle +1; CLAUDE.md kuralı "canlı md5 = yerel doğrulanır".

### Inferences
- generateSW Brewmaster'a uymaz (push mantığı var); injectManifest uyar ama: (a) HTML için `maximumFileSizeToCacheInBytes` ≥ 5 MB yapılmalı, yoksa ana dosya önbelleğe girmez — sessiz ve tehlikeli bir hata; (b) her deploy'dan önce Node derleme adımı (GitHub Actions + Pages "Actions'tan yayınla") gerekir — bugün dosyalar doğrudan push ediliyor; (c) Workbox'ın kendi çalışma zamanı modülleri SW'ye eklenir.
- Daha ucuz eşdeğer: deploy betiği/CI adımı `md5(Brewmaster_v2_79_10.html + veri JS'leri)` ilk 8 hanesini `CACHE_VERSION`'a yazar → içerik değişmeden sürüm değişmez, değişince mutlaka değişir; insan hatası (bump unutma) biter. CLAUDE.md'deki "+1" kuralı "içerik özeti" kuralına dönüşür (Kaan onayı gerekir).
- Lighthouse'un PWA kategorisinin güncel durumu, Lighthouse CI'nin bakım durumu ve PWABuilder rapor kartı bu oturumda doğrulanmadı.

### Gaps
- Lighthouse CI (GoogleChrome/lighthouse-ci) ve Lighthouse PWA denetimlerinin 2026 durumu — bulamadım (aranmadı/okunmadı).
- web.dev PWA kontrol listesi ve PWABuilder rapor kartı içeriği okunmadı.

## 9. Depolama — IndexedDB sarmalayıcıları (Dexie), OPFS, navigator.storage.persist, File System Access ile yedek

### Takeaway
`persist()` zaten çağrılıyor; Chrome bunu sessizce sezgiyle (kurulu/yer imi/bildirim izni/etkileşim) verir, Safari 17+ Home Screen web app'te sezgiyle verir. Gerçek kazanç yeni bir kütüphane değil: Ayarlar ▸ Tanı'da "kalıcı depolama: evet/hayır + kullanılan alan" göstermek ve Chrome 132+ ile Android'e gelen `showSaveFilePicker` ile tek dokunuşla dosyaya yedek. Karar: yedek-dosya + persist göstergesi **AL** (S–M); Dexie **ALMA**; OPFS **ALMA**.

### Cited Findings
- Chrome (masaüstü ve Android) `persist()` için istem göstermez; site etkileşimi, kurulu/yer imli olması, bildirim izni gibi sezgilerle sessizce verir/reddeder; reddedilen istek tekrar yapılabilir; Firefox kullanıcıya sorar; depolama baskısında en az kullanılan origin'den başlayarak Cache API + IndexedDB silinir; Chrome'da otomatik silme nadir, kullanıcı elle silmesi daha yaygın (makale son güncelleme 2020-05-12) — [web.dev: Persistent storage](https://web.dev/articles/persistent-storage)
- WebKit depolama politikası (Safari 17 / iOS 17, yazı 2023-08-10): origin kotası tarayıcı uygulamalarında diskin %60'ına, diğer uygulamalarda %15'ine kadar; Home Screen web app'ler tarayıcıdakiyle aynı kotayı alır; tahliye (eviction) origin bütünüyle, en az yakın zamanda kullanılandan; varsayılan "best-effort"; kalıcı mod sezgiyle verilir, örnek sezgi "Home Screen Web App olarak açılması" — [WebKit Blog: Updates to Storage Policy](https://webkit.org/?p=14403)
- Chrome 132: "From Chrome 132, the API is now available on Android and in WebViews" — `showOpenFilePicker()` ve `showSaveFilePicker()` (sayfa 2025-01-14 güncel) — [Chrome Developers: New in Chrome 132](https://developer.chrome.com/blog/new-in-chrome-132)
- MDN `showSaveFilePicker`: deneysel, Baseline değil, yalnız güvenli bağlam — [MDN: Window.showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)
- Dexie.js: "IndexedDB made simple", offline-first, isteğe bağlı Dexie Cloud eşitlemesi — [dexie.org](https://dexie.org/) (lisans/boyut ana sayfada yazmıyor)
- [YEREL ÖLÇÜM] persist() çağrısı HTML 7654–7656; 6 `indexedDB.open`, 85 `localStorage.getItem`, 57 `localStorage.setItem`; `showSaveFilePicker` kullanımı 0.

### Inferences
- Brewmaster verisinin çoğu localStorage'da; tahliye ya da "uygulama verisini temizle" tüm reçete/defteri siler; Firebase eşitlemesi kurulu değilse tek kopya telefondadır. Öneri: (1) Tanı ekranında `navigator.storage.persisted()` ve `navigator.storage.estimate()` sonucu; (2) "Yedeği dosyaya kaydet" düğmesi: `showSaveFilePicker` varsa (Chrome Android 132+, TWA dahil — Chrome motoru) JSON dosyasına yazar, yoksa `<a download>` yedeği; (3) haftalık hatırlatma tostu. Efor S–M; Kaan için tek dokunuş.
- Dexie: mevcut 6 IndexedDB çağrı noktasını yeniden yazmayı gerektirir; veri modeli küçük → getirisi düşük → ALMA. OPFS: büyük ikili dosyalar için anlamlı, Brewmaster'da yok → ALMA (OPFS destek tablosu bu oturumda doğrulanmadı).
- TWA depolaması kullanıcının ana Chrome profiliyle paylaşılır (§4) — Chrome'da "site verisini temizle" TWA verisini de siler; yedek düğmesinin önemi bundan.

### Gaps
- localStorage'ın Chrome Android'deki boyut sınırı resmi kaynaktan doğrulanmadı.
- Dexie lisansı, boyutu, son sürümü; OPFS tarayıcı destek tablosu okunmadı.
- WebKit'in 7 günlük betik-yazılabilir depolama sınırının Home Screen web app'lere uygulanıp uygulanmadığı WebKit yazısında geçmiyor.

## 10. 4,9 MB tek HTML için performans ve barındırma — GitHub Pages sıkıştırma, derleme sunucusuz bölme, Cloudflare Pages/Workers, Netlify

### Takeaway
GitHub Pages gzip veriyor (4,94 MB → 1,56 MB) ama brotli vermiyor ve özel HTTP başlığı (CSP, uzun önbellek) kabul etmiyor; Cloudflare (Pages ya da Workers static assets) brotli/zstd + `_headers` sağlar ve Worker ile aynı hesapta olur. Ancak origin değiştirmek localStorage/IndexedDB verisini, push aboneliklerini ve TWA doğrulamasını sıfırlar — kazanç (~%24 daha küçük transfer) bu riski şimdilik karşılamaz. Netlify Free'nin 300 kredi/ay ve deploy başına 15 kredi modeli Brewmaster'ın sık deploy'u için uygun değil. Karar: GitHub Pages'te **kal**; Cloudflare barındırma **İZLE** (planlı göç olursa DENE); Netlify **ALMA** (repodaki netlify.toml artık işlevsiz görünüyor); veri dosyalarını ayırma **DENE** (M).

### Cited Findings
- [YEREL ÖLÇÜM] GitHub Pages: gzip 1.561.982 bayt, brotli yok (br isteğine 4.942.504 bayt sıkıştırmasız), `cache-control: max-age=600`; brotli q11 yerelde 1.191.421 bayt (gzip'e göre ≈%24 küçük).
- GitHub Pages sınırları: yayınlanan site ≤ 1 GB, aylık 100 GB yumuşak bant genişliği, saatte 10 yumuşak build sınırı (özel GitHub Actions iş akışıyla yayınlananlarda geçerli değil), deploy 10 dk zaman aşımı, 429 hız sınırı; yasak/kısıtlı: online iş/e-ticaret/ticari SaaS için ücretsiz barındırma, parola/kart gibi hassas işlemler — [GitHub Docs: GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- GitHub Pages özel başlık desteklemiyor: personel (2023-05-02) "We don't support this feature today so a `meta` tag unfortunately is the only way"; (2024-07-10) "This is not an area that is being prioritized at the moment"; tartışma 2026-09-30'a kadar aktif ve açık; meta ile CSP'de `frame-ancestors` yok sayılıyor; geçici çözüm olarak Cloudflare'i önüne koymak/Cloudflare Pages/Netlify — [GitHub Community Discussion #54257](https://github.com/orgs/community/discussions/54257)
- Cloudflare Pages Free: ayda 500 build, eşzamanlı 1, build 20 dk, site başına 20.000 dosya, varlık başına 25 MiB, proje başına 100 özel alan adı, `_headers` dosyasında 100 kural (başlık başına 2.000 karakter), 2.000 statik + 100 dinamik yönlendirme; Functions istekleri Workers kotasına sayılır — [Cloudflare Docs: Pages limits](https://developers.cloudflare.com/pages/platform/limits)
- Workers static assets: "`_headers` and `_redirects` files are supported natively"; "requests for static assets on Workers are free"; Workers'ın "distinctly broader set of features" olduğu belirtiliyor (açık "yeni projeler için öneriyoruz" cümlesi bu sayfada yok) — [Cloudflare Docs: Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- Cloudflare sıkıştırma: "Free Plan: Content is compressed by default using Zstandard"; brotli/zstd için en az 50 bayt; text/html, application/javascript, application/json vb. kapsanıyor; yalnız 200 (ve 403/404) yanıtları; Pages/Workers varlıklarının kapsandığı açıkça yazmıyor — [Cloudflare Docs: Content compression](https://developers.cloudflare.com/speed/optimization/content/compression/)
- Netlify Free: ayda 300 kredi; üretim deploy'u 15 kredi, bant genişliği 20 kredi/GB, web istekleri 2 kredi/10k, compute 10 kredi/GB-saat; sınır dolunca site bir sonraki döneme kadar "paused"; ücretsiz planın sert aylık sınırları var, ek ücret çıkmaz; eşzamanlı 1 build — [Netlify Pricing](https://www.netlify.com/pricing/)
- [YEREL ÖLÇÜM] netlify.toml var (`publish = "."`, tüm yollara `Cache-Control: public, max-age=0, must-revalidate`), ama canlı adres GitHub Pages; SW sürümü v131-540 (çok sık deploy).

### Inferences
- Netlify Free'de 300/15 = ayda en fazla 20 üretim deploy'u (bant genişliği hiç kullanılmasa bile); Brewmaster sprintlerinde günde birden çok deploy olduğu için ALMA.
- Origin değişikliği riski (kritik): localStorage/IndexedDB/servis işçisi/push aboneliği origin'e bağlıdır; `dessn7-bit.github.io` → `*.pages.dev`/`*.workers.dev` geçişinde Kaan'ın cihazındaki veri yeni adreste görünmez, push aboneliği yeniden alınmalı, TWA asset links yeniden yapılmalı. Göç ancak Firebase eşitlemesi/yedek dosyası ile planlı yapılırsa düşünülmeli → İZLE.
- Derleme sunucusuz bölme: büyük, nadiren değişen veri bloklarını (stil tabloları, ML örnekleri, katalog) HTML'den ayrı `.js`/`.json` dosyalarına çıkarıp SW'nin ayrı önbellek adıyla saklamak — her HTML deploy'unda telefonun 4,9 MB yerine yalnız değişen kodu indirmesini sağlar. Ama "tek dosya" proje kararı ve tüm testlerin HTML'i dilimleyerek çalışması (regresyon.mjs "kaynağından dilimlenip node vm'de koşulur") nedeniyle M efor + test uyarlaması; CLAUDE.md'deki tek-dosya kuralı Kaan kararıdır → DENE (Kaan onayıyla).
- Telefon açısından gerçek maliyet: her CACHE_VERSION bump'ında SW tüm HTML'i yeniden indirir (~1,56 MB gzip); mobil veride sorun değil, bu yüzden aciliyet düşük.

### Gaps
- Cloudflare'in zstd/brotli sıkıştırmasının Pages ve Workers static assets yanıtlarına uygulandığı açık resmi cümle bulunamadı; zstd boyutu yerelde ölçülemedi (zstd kurulu değil).
- Workers static assets'in ücretsiz plandaki dosya sayısı/boyut sınırları okunmadı.

## 11. Güvenlik hijyeni — GitHub secret scanning / push protection, gitleaks / trufflehog, CodeQL (JS), Dependabot, CSP

### Takeaway
Public repo'da GitHub secret scanning ücretsiz ve otomatik; kullanıcı düzeyi push protection varsayılan açık ve public repoya sır push'unu durduruyor — bunlar zaten çalışıyor olmalı (kontrol S). Proje kendi `sk-ant-` taramasını yapıyor; gitleaks bunu CI'da genelleştirebilir. CodeQL JS'i destekliyor ama kodun tamamı HTML içi `<script>` olduğundan faydası belirsiz. Meta-CSP (`connect-src` izin listesi) API anahtarı sızıntısına karşı anlamlı bir ek kalkan olabilir ama kırma riski yüksek. Karar: secret scanning/push protection **AL** (zaten açık; doğrula); gitleaks CI **DENE** (S); CodeQL varsayılan kurulum **DENE** (S); Dependabot **İZLE**; meta-CSP **DENE** (M, dikkatli); trufflehog **ALMA** (gitleaks ile örtüşür, araştırılmadı).

### Cited Findings
- Public repolarda "Secret scanning runs automatically for free"; varsayılan tespit partner/sağlayıcı sırları; özel desenler ve genel (generic) desenler ek özellik — [GitHub Docs: About secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)
- Push protection: kullanıcı düzeyi "Is enabled by default" ve "Stops you from pushing secrets to public repositories on GitHub"; depo düzeyi push protection "Requires GitHub Secret Protection" ve varsayılan kapalı; kategoriler: partner desenleri, genel desenler (ayarlardan açılmalı), özel desenler, yapay zekâ ile tespit edilen genel sırlar (public preview) — [GitHub Docs: About push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection)
- gitleaks-action: kişisel hesaplarda "no license key is required"; organizasyon hesaplarında ücretsiz lisans anahtarı gerekir (gitleaks.io'dan ad/e-posta/şirket ile); örnek iş akışı `pull_request`, `push`, `workflow_dispatch` ve günlük zamanlama ile çalışıyor; action lisansı v2.0.0'da MIT'ten değişti, "Copyright © 2022 Gitleaks LLC - All Rights Reserved" — [GitHub: gitleaks/gitleaks-action](https://github.com/gitleaks/gitleaks-action)
- CodeQL: JavaScript/TypeScript destekli (`javascript-typescript`); "Default setup automatically chooses the languages to analyze, query suite to run, and events that trigger scans"; public repolarda kullanılabilir (sayfa fiyattan söz etmiyor) — [GitHub Docs: About code scanning with CodeQL](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql)
- GitHub Pages'te CSP yalnız `<meta>` ile; `frame-ancestors` meta'da çalışmıyor — [GitHub Community Discussion #54257](https://github.com/orgs/community/discussions/54257)
- [YEREL ÖLÇÜM] CSP yok; bağımlılıklar yalnız `pdf-parse` ve dev'de `puppeteer`; repo kişisel hesapta (dessn7-bit).

### Inferences
- Brewmaster repo'su kişisel hesapta → gitleaks-action lisanssız çalışır; ama action'ın lisansı artık özel (MIT değil) — alternatif olarak gitleaks CLI'ı (lisansı bu oturumda doğrulanmadı) CI adımında koşmak ya da mevcut `sk-ant-[A-Za-z0-9_-]{20,}` regex taramasını CI'a taşımak yeterli olabilir. Önemli kural: test fixture'larındaki eski sahte anahtarlar için `.gitleaksignore`/izin listesi gerekir (CLAUDE.md "testlerdeki eski sahte anahtarlar hariç").
- Anthropic `sk-ant-` anahtarlarının GitHub partner desenleri arasında olup olmadığı doğrulanmadı → projenin kendi taraması korunmalı.
- CodeQL'in HTML içi `<script>` bloklarını analiz edip etmediği belgede yok; 43 bin satırlık tek HTML'de sonuçlar ya çok az ya gürültülü olabilir → bir kez varsayılan kurulumla DENE, faydasızsa kapat.
- Meta-CSP: inline betik yoğun uygulamada `script-src` için `'unsafe-inline'` kaçınılmaz (hash'ler her deploy'da değişir) → XSS'e karşı zayıf; ama `connect-src 'self' https://api.anthropic.com https://*.workers.dev https://*.firebaseio.com …` izin listesi, olası bir enjeksiyonda API anahtarının başka sunucuya gönderilmesini zorlaştırır. Eksik bir kaynak (font, CDN, web arama) uygulamayı sessizce kırar → kapsamlı test + regresyon kontrolü gerekir (M).
- Dependabot: yalnız iki geliştirme aracı bağımlılığı var; PR gürültüsü > fayda → İZLE.

### Gaps
- GitHub'ın Anthropic API anahtarı desenini destekleyip desteklemediği (supported patterns listesi) okunmadı.
- gitleaks çekirdek lisansı, trufflehog ve Dependabot ayrıntıları bu oturumda doğrulanmadı.
- Meta etiketiyle `Content-Security-Policy-Report-Only` kullanılamadığı bilgisi kaynaktan doğrulanmadı.

## 12. Erişilebilirlik testi (axe-core, pa11y) ve Türkçe yerel ayar tuzakları (İ/ı, toLocaleUpperCase('tr'), ondalık virgül)

### Takeaway
axe-core (MPL-2.0) mevcut Puppeteer süitine eklenip WCAG sorunlarının ortalama ~%57'sini otomatik yakalayabilir — rapor modunda, kapı yapmadan. Daha somut risk Türkçe büyük/küçük harf: kodda 40 `.toUpperCase()` ve 184 `.toLowerCase()` yerel ayarsız; "i→I" ve "İ→i̇" dönüşümleri arama/eşleştirmeyi bozabilir. Karar: Türkçe harf/sayı denetimi **AL** (S–M); axe-core **DENE** (S); pa11y **ALMA** (axe ile örtüşür; araştırılmadı).

### Cited Findings
- axe-core: Mozilla Public License 2.0; "find on average 57% of WCAG issues automatically"; WCAG 2.0/2.1/2.2 A, AA, AAA + en iyi uygulama kuralları; mevcut otomatik testlere entegre olur; emin olmadığında "incomplete" işaretler, manuel inceleme gerekir; desteklenen yerel ayarlar arasında Türkçe yok, `axe.configure()` ile yerel ayar nesnesi verilebilir — [GitHub: dequelabs/axe-core](https://github.com/dequelabs/axe-core)
- MDN: `"istanbul".toLocaleUpperCase("en-US")` → "ISTANBUL", `"istanbul".toLocaleUpperCase("TR")` → "İSTANBUL"; Türkçe gibi bazı yerel ayarların büyük/küçük harf eşlemeleri Unicode varsayılanına uymaz; dönüşüm 1:1 değildir (uzunluk değişebilir) ve kararlı değildir (`x.toLocaleLowerCase() === x.toLocaleUpperCase().toLocaleLowerCase()` false olabilir) — [MDN: String.prototype.toLocaleUpperCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleUpperCase)
- [YEREL ÖLÇÜM] `.toUpperCase()` 40, `.toLowerCase()` 184, `toLocaleLowerCase('tr'|'tr-TR')` 27, `toLocaleString('tr-TR'…)` 11, `toFixed(` 740; manifest `lang: "tr"`.

### Inferences
- Yerel ayarsız `.toLowerCase()`, "İ" (U+0130) harfini "i" + birleşik nokta (U+0307) dizisine çevirir; bu yüzden "İrlanda"/"İnce" gibi kelimeler `includes`/eşitlik aramalarında bulunamayabilir; `.toUpperCase()` ise "i"yi "I" yapar (Türkçede "İ" olmalı) — bu davranış Unicode özel eşlemelerinden gelir, MDN yalnız "istanbul" örneğini veriyor (U+0307 ayrıntısı bu oturumda birincil kaynaktan okunmadı). Öneri: tek bir `trKucuk(s)` yardımcı (`s.normalize('NFC').toLocaleLowerCase('tr')`) ve kod tabanında arama/karşılaştırma yollarında kullanımı; makine anahtarları (slug, JSON anahtarı) için ise bilinçli olarak yerel ayarsız dönüşüm korunmalı — her çağrı tek tek sınıflanmalı (S–M).
- `toFixed` ondalık NOKTA üretir; ekranda Türkçe "1,050" beklenir; kullanıcı girdisinde "1,050" OG mi binlik mi belirsizliği → giriş ayrıştırıcısının virgülü ondalık kabul ettiği test edilmeli. `Intl.NumberFormat('tr-TR')` davranışı bu oturumda kaynaktan doğrulanmadı.
- Basit CI kontrolü: yeni eklenen satırlarda yerel ayarsız `.toUpperCase()`/`.toLowerCase()` görülürse uyarı veren grep (kapı değil) — mevcut `--parca` süitine bir vaka olarak eklenebilir.
- axe-core'u Puppeteer'da sayfaya enjekte edip `axe.run()` sonucunu rapora yazmak S efor; dokunma hedefi boyutu, kontrast, etiketsiz düğme gibi sorunlar çıkar; ilk raporda çok sayıda bulgu beklenir → kapı değil, liste.

### Gaps
- pa11y / pa11y-ci'nin güncel durumu birincil kaynaktan okunmadı.
- `Intl.NumberFormat('tr-TR')` ve `Intl.Collator('tr')` davranışı için MDN sayfaları okunmadı.

## 13. Tüm envanter — tek tablo karar listesi (AL / DENE / İZLE / ALMA)

### Takeaway
En yüksek getiri / en düşük efor: (1) CEV wake lock'unu visibilitychange'te yeniden almak, (2) GitHub Actions'ta 6 dilimli paralel regresyon, (3) Worker'a `/hata` uç noktası, (4) push abonelik uzlaştırma + pushsubscriptionchange, (5) Firebase kural sertleştirme + emulator testi, (6) içerik özetli otomatik CACHE_VERSION. Hiçbiri para gerektirmiyor.

### Cited Findings
| # | Araç / iş | Ücretsiz sınır (tarih 2026-11-07) | Brewmaster faydası | Efor | Risk | Karar |
|---|---|---|---|---|---|---|
| 1 | CEV wake lock yeniden alma (kod) | — (Wake Lock: Chrome 84+, iOS 18.4+) [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) | 1 saatlik koşuda ekran kapanınca düşen kilit geri gelir | S | yok | AL |
| 2 | GitHub Actions + `--parca` matrix | public repo: sınırsız, 4 vCPU/16 GB [GitHub Docs](https://docs.github.com/en/enterprise-cloud@latest/actions/reference/runners/github-hosted-runners) | dizüstü RAM sorunu biter, gece koşusu | M | public log; secret verilmemeli; held-out dosyaları | AL |
| 3 | Worker `/hata` + KV (kendi) | KV 1.000 yazma/gün [CF](https://developers.cloudflare.com/kv/platform/limits/) | kimsenin görmediği istemci hataları Claude'a görünür | S–M | KV kotası paylaşımlı → toplu yaz | AL |
| 4 | Workers Logs | 200k olay/gün, 3 gün (2026-12-01'de fiyat değişiyor) [CF](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) | Worker/cron hataları görünür | S | fiyat değişimi | AL (değişimi kontrol et) |
| 5 | pushsubscriptionchange + uzlaştırma | Chrome 137/138+, iOS yok [BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ServiceWorkerGlobalScope.json) | sessiz ölen alarm aboneliği kendini onarır | S–M | çevrimdışı fetch | AL |
| 6 | healthchecks.io | 20 kontrol [hc](https://healthchecks.io/pricing) | cron durursa e-posta | S | ping URL'i secret | AL (seçili) |
| 7 | UptimeRobot | 50 monitör, 5 dk [UR](https://uptimerobot.com/pricing.md) | canlı HTML + Worker erişilebilirliği | S | hesap gerekir | AL |
| 8 | Firebase kural sertleştirme + Emulator testi | Emulator yerel/ücretsiz [Firebase](https://firebase.google.com/docs/rules/unit-tests) | URL bilen herkesin silmesini engeller | M | eşitlemeyi kırma; konsol erişimi Kaan'da | AL |
| 9 | İçerik özetli CACHE_VERSION betiği | — | bump unutma hatası biter | S | CLAUDE.md kural değişikliği | AL |
| 10 | Dosyaya yedek (showSaveFilePicker) + persist göstergesi | Chrome 132+ Android [Chrome](https://developer.chrome.com/blog/new-in-chrome-132) | veri kaybına karşı tek dokunuş | S–M | yok | AL |
| 11 | Türkçe İ/ı + ondalık denetimi | — [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleUpperCase) | arama/eşleşme hataları | S–M | slug'ları bozma | AL |
| 12 | TWA (Bubblewrap ≥1.25, targetSdk 36) | ücretsiz [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap/releases) | Play güncellemesi mümkün | S–M | keystore Kaan'da | AL (Play'deyse) |
| 13 | axe-core (Puppeteer'a) | MPL-2.0 [axe](https://github.com/dequelabs/axe-core) | erişilebilirlik listesi | S | gürültü | DENE |
| 14 | gitleaks (CI) | kişisel hesapta lisanssız [gitleaks-action](https://github.com/gitleaks/gitleaks-action) | sır taraması CI'da | S | action lisansı özel | DENE |
| 15 | CodeQL default setup | public repoda kullanılabilir [GitHub Docs](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql) | JS güvenlik bulguları | S | inline HTML analizi belirsiz | DENE |
| 16 | Meta-CSP (connect-src) | — [Discussion #54257](https://github.com/orgs/community/discussions/54257) | anahtar sızıntısına ek kalkan | M | uygulamayı kırma | DENE |
| 17 | Sentry Developer | 5.000 hata/ay, 1 kullanıcı [Sentry](https://sentry.io/pricing/) | hazır hata paneli | S | 3. taraf, PII | DENE (gerekirse) |
| 18 | Veri bloklarını HTML'den ayırma | — | deploy başına indirme küçülür | M | tek-dosya kararı, testler | DENE (Kaan onayı) |
| 19 | Worker-vekil RTDB / anonim Auth | Workers 100k istek/gün [CF](https://developers.cloudflare.com/workers/platform/limits/) | gerçek erişim denetimi | M–L | eşitleme yeniden yazımı | DENE |
| 20 | Declarative Web Push | iOS/iPadOS 18.4+ [WebKit](https://webkit.org/blog/16535/meet-declarative-web-push/) | yalnız iPhone'da | M | Android'de faydasız | İZLE |
| 21 | Cloudflare Pages / Workers static assets | Pages 500 build/ay, 25 MiB/dosya [CF](https://developers.cloudflare.com/pages/platform/limits) | brotli/zstd, `_headers` | M | origin değişimi veriyi/push'u sıfırlar | İZLE |
| 22 | Checkly | 1.000 tarayıcı koşusu/ay [Checkly](https://www.checklyhq.com/pricing/) | sentetik sayfa testi | S | GH Actions aynı işi bedava yapar | İZLE |
| 23 | GlitchTip / Better Stack | 1.000 olay/ay / 100k exception/ay [GlitchTip](https://www.glitchtip.com/pricing), [Better Stack](https://betterstack.com/pricing.md) | Sentry alternatifi | S | 3. taraf | İZLE |
| 24 | Dependabot | — | 2 dev bağımlılığı | S | PR gürültüsü | İZLE |
| 25 | Workbox injectManifest | açık kaynak; varsayılan 2 MiB dosya sınırı [Chrome](https://developer.chrome.com/docs/workbox/modules/workbox-build) | revizyonlu precache | M | HTML'i sessizce dışlama, derleme adımı | ALMA (şimdilik) |
| 26 | Capacitor | — | yok | L | WebView'da Web Push kapalı [blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/_ckNx_SZIjc) | ALMA |
| 27 | Netlify Free | 300 kredi/ay, deploy 15 kredi [Netlify](https://www.netlify.com/pricing/) | yok | — | ayda ~20 deploy'da durur | ALMA |
| 28 | Highlight.io | 2026-02-28 kapandı [Bugsink](https://www.bugsink.com/is-highlight-io-shutting-down) | — | — | ürün yok | ALMA |
| 29 | NoSleep.js / Periodic Sync / Background Fetch | — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API) | yerel Wake Lock yeterli | — | pil/güvenilmezlik | ALMA |
| 30 | App Check | reCAPTCHA Enterprise 10k/ay [Firebase](https://firebase.google.cn/docs/app-check) | kötüye kullanım azaltma | M | kuralların yerini tutmaz | ALMA (şimdilik) |
| 31 | LogRocket | doğrulanmadı | — | — | oturum kaydı = gizlilik | ALMA |

### Inferences
- Kaan kararı gereken noktalar: (a) UptimeRobot/healthchecks.io hesapları; (b) Firebase konsol kurallarının Claude'a gösterilmesi; (c) CACHE_VERSION kuralının "+1"den "içerik özeti"ne dönmesi; (d) tek-dosya kuralının veri blokları için gevşetilmesi; (e) APK'nın Play'de olup olmadığı.
- CLAUDE.md'deki "~3,7 MB" ifadesi güncel değil (ölçülen 4,94 MB / 43.104 satır).

### Gaps
- Bu tablo, önceki ajanın 2026-11-07 tarihli okumaları ile bu oturumun okumalarını birleştirir; Sentry/UptimeRobot/Better Stack/healthchecks.io/GlitchTip sayfaları bu oturumda yeniden açılmadı (önceki ajanın aynı gün okuması kullanıldı).
