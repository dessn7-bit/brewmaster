# PWA FILES — DIAGNOSIS

**Tarih:** 2026-04-26
**Hedef repo:** `C:\Users\Kaan\brewmaster`

---

## Manifest

- **Dosya:** `manifest.webmanifest` (var)
- **Path:** `manifest.webmanifest` (repo kökü)
- **Boyut:** 511 bytes
- **Tam içerik:**

```json
{
  "name": "Brewmaster",
  "short_name": "Brewmaster",
  "description": "Türkçe ev üretimi (homebrewing) hesap motoru",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#6B4423",
  "background_color": "#FDF8E8",
  "lang": "tr",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

**Yorum:** `start_url`, `scope`, ve `icons[].src` üçü de **mutlak kök yolu (`/`)** kullanıyor. Netlify (custom domain veya `*.netlify.app` root) için OK, GitHub Pages alt-path (`/brewmaster/`) için **KIRIK** — manifest `/icon-192.png`'i `https://dessn7-bit.github.io/icon-192.png` olarak çözer, hâlbuki dosya `/brewmaster/icon-192.png` altında.

---

## Service Worker

- **Dosya:** YOK
- **Path:** —
- **Glob taraması:** `sw*.js` 0 eşleşme, `service-worker*` 0 eşleşme, `workbox*` 0 eşleşme.
- **HTML grep:** `serviceWorker` / `service-worker` / `caches.` / `workbox` patternleri **0 eşleşme**.

**Yorum:** Service worker hiç yok. Yani:
- Offline cache YOK.
- Background sync YOK.
- Push notification YOK.
- "PWA" sadece manifest + theme-color seviyesinde — tam kurulu PWA değil. Add-to-Homescreen desteklenir ama uçaktan ofline kullanım çalışmaz.

---

## Icon dosyaları

| Path | Boyut |
|------|------:|
| `icon-192.png` | 33,021 B (~32 KB) |
| `icon-512.png` | 161,568 B (~158 KB) |

**Glob'lar:** `**/{icon,favicon,apple-touch}*` → sadece bu iki PNG. `**/*.ico` 0 eşleşme. `git ls-files | grep -iE '(icon|favicon|...)'` → aynı iki PNG + manifest.

Apple touch icon ayrı dosya YOK — HTML head'de **base64 inline** olarak gömülü (aşağıda detay).

---

## HTML içinde PWA referansları

`Brewmaster_v2_79_10.html` head bölgesi (satır 9-15):

| Satır | Tag | Raw kod (uzunsa kısaltılmış) |
|------:|-----|-------|
| 9 | `meta theme-color` | `<meta name="theme-color" content="#6B4423">` |
| 10 | `link apple-touch-icon 192` | `<link rel="apple-touch-icon" sizes="192x192" href="data:image/png;base64,iVBORw0...` (44.103 char — base64 INLINE) |
| 11 | `link apple-touch-icon 512` | `<link rel="apple-touch-icon" sizes="512x512" href="data:image/png;base64,iVBORw0...` (215.499 char — base64 INLINE) |
| 12 | `link icon 192` | `<link rel="icon" type="image/png" sizes="192x192" href="data:image/png;base64,iVBORw0...` (44.108 char — base64 INLINE) |
| 13 | `link icon 512` | `<link rel="icon" type="image/png" sizes="512x512" href="data:image/png;base64,iVBORw0...` (215.504 char — base64 INLINE) |
| 14 | `title` | `<title>Kabeer</title>` |
| 15 | `link manifest` | `<link rel="manifest" href="manifest.webmanifest">` (RELATIVE path — alt-path'te de çalışır) |

`navigator.serviceWorker.register` patterni **0 eşleşme** — service worker registration kodu HTML'de yok.

**Toplam base64 yük:** ~520 KB sadece head'de — HTML'in büyüklüğünün önemli bir parçası 4 base64 icon'dan geliyor. Aynı resimler dosya olarak da repoda (`icon-192.png`, `icon-512.png`).

**Title anomalisi:** `<title>Kabeer</title>` — manifest `name: "Brewmaster"`, ama HTML title "Kabeer". Tarayıcı sekmesinde Kabeer görünür, install edildiğinde uygulama adı Brewmaster olur (manifest baskın). Tutarsız ama PWA install için kırıcı değil.

---

## Açık sorunlar

### 1. `icon-192.png` 404 — repoda VAR mı?

**EVET, repoda var:**
- `git ls-files` çıktısı: `icon-192.png` ve `icon-512.png` track'lenmiş.
- Filesystem `ls -la`: ikisi de mevcut (32 KB + 158 KB).

**Production'da 404 veriyorsa sebep dağıtım/path:**
- Manifest `/icon-192.png` (root-absolute) referans veriyor.
- Eğer hosting **alt-path** altındaysa (örn. `dessn7-bit.github.io/brewmaster/`), tarayıcı `dessn7-bit.github.io/icon-192.png` çağrısı yapar → 404.
- Netlify'da custom domain veya `magical-sopapillas-bef055.netlify.app` root'unda barındırılıyorsa absolute path doğru çözülür → 404 olmamalı.
- 404 hangi production'da? GitHub Pages mı yoksa Netlify mi? CLAUDE.md'ye göre "magical-sopapillas-bef055.netlify.app" üstünde deploy var → manifest `/icon-192.png` orada çalışmalı. **Eğer Netlify'da 404 veriyorsa, dosyanın deploy'a dahil edilmediğini araştırmak gerek** (Netlify build settings, .gitignore, publish dir vb.).

### 2. Manifest `start_url: "/"` — GitHub Pages alt-path uyumsuzluğu

- Mevcut manifest **root-absolute paths** kullanıyor (`start_url`, `scope`, icon `src`'leri hep `/` ile başlıyor).
- GitHub Pages tipik adresleri:
  - User site (`<user>.github.io`) — root'tur, `/` çalışır.
  - Project site (`<user>.github.io/<repo>/`) — alt-path, `/` ile başlayan tüm referanslar **kırılır**.
- Repo adı `brewmaster` ve user `dessn7-bit` — eğer GitHub Pages açıksa URL `dessn7-bit.github.io/brewmaster/` olur → manifest path'leri tüm 3 alanda kırık (start_url icon yüklemez, scope dışına düşer, icons 404).

**Mevcut manifest GitHub Pages alt-path ile UYUMSUZ.** Düzeltmek için icon `src`'lerini relative (`"icon-192.png"`) yapmak veya `start_url: "./"` + `scope: "./"` kullanmak gerek.

### 3. Service Worker scope ve cache stratejisi

- **Service worker yok.** Dolayısıyla scope ve cache stratejisi soruları YOKTUR — kayıt yapılmıyor, hiçbir cache aktif değil.
- "GitHub Pages'le çalışır mı?" — sorusu boşa düşer. PWA'nın offline tarafı zaten kurulu değil; her sayfa yenilemede tarayıcı standart cache'e güvenir, custom strateji yok.

### 4. Bonus — base64 icon redundancy

- HTML head'de 4 link tag'i base64 inline icon (apple-touch 192/512 + icon 192/512), toplam ~520 KB.
- Aynı görseller repoda dosya olarak da var (190 KB).
- Manifest yalnızca dosya path'lerine referans veriyor; HTML'in inline base64'leri tarayıcı tab favicon ve iOS Add-to-Homescreen için. Yani dosya icon'ları manifest install için, base64'ler doğrudan HTML icon'lar için — kısmen örtüşüyor ama ikisi farklı tarayıcı yolları besliyor.
- Optimizasyon önerisi (bu rapor scope'unda DEĞİL ama not): inline base64'ler dosya referansına çevrilirse HTML ~520 KB küçülür.
