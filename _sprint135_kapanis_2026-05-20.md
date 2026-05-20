# Sprint 135 Kapanış Raporu — 2026-05-20

## Özet

Sprint 135 (Tasarım refactor — modern+vintage onaylı mockup) **19 sub-sprint** ile tamamlandı.
SW cache: **v131-58 → v131-77** (19 sürüm). HTML: **+414 satır / -284 satır** (sw.js + 4 woff2 font dosyası dahil).

**Hedef**: Onaylı mockup'a tam tasarım refactor — modern UI tonu + vintage karakter dengeli, Fraunces serif başlık + Hanken Grotesk sans gövde, ince border + iki-kademe modern elevation + 4px ritim spacing + uniform feature ayrımı.

**Süre**: 19 Mayıs (Sprint 134 kapanış) → **20 Mayıs Sprint 135 başlangıç + bitiş** (tek gün).

**Production**: GitHub Pages canlı (commit `93fca6e` → `135-R kapanış`).

**Snapshot**: `Brewmaster_v2_79_10.SNAPSHOT.F.sprint135-final.html` (2,992,491 bayt, **byte-identical** production).

## Sprint 135 Commit Zinciri

| Sub-sprint | Commit | SW | Açıklama |
|---|---|---|---|
| 135-A | `6b71f18` | v131-59 | Design audit + token sistemi + POC (Genel tab 4 stat mini-kart) |
| 135-A1 | `b9346de` | v131-60 | bl-2 --kahve-* çakışma çözümü var() alias (DRY) |
| 135-A2 | `e778f85` | v131-61 | Token değerleri onaylı mockup'a senkron (renk + elevation + radius + spacing) |
| 135-B | `fffed81` | v131-62 | Tipografi — Fraunces + Hanken Grotesk local woff2 (180KB sw.js precache) |
| 135-C | `6f7f344` | v131-63 | Accordion (.bm-acc) token + mockup refactor (kalın border-left kaldırıldı, açık/kapalı elv-2/elv-1) |
| 135-D | `6c1dd45` | v131-64 | Ana sayfa reçete kartları (.bm-recete-kart) — banner gradient'ler kaldırıldı, beyaz sade |
| 135-E | `2d2a43f` | v131-65 | Özet strip + sekme bar — Fraunces değerler + dikey ayraç + vintage alt-çizgi |
| 135-F | `62275b8` | v131-66 | Form input (.inp) + butonlar uniform (primary/secondary/destructive — 135-A2 token) |
| 135-G | `ece38b5` | v131-67 | Stil tahmini sonuç kartları (Cluster + Strategy C ribbon) — `.bm-tahmin-ribbon` class |
| 135-H | `2014341` | v131-68 | Reçete Doktoru kart + chip + 135-G helper inline color → token migration |
| 135-I | `446f190` | v131-69 | Header — app banner koyu kahve + reçete header beyaz-krem (rol takası) |
| 135-J | `267e513` | v131-70 | Stil Tahmini accordion feature stil (.bm-acc-feature krem gradient) |
| 135-K | `45f42f4` | v131-71 | Stok ekranı header + 3 sekme + Ayarlar/Bildirim kartları |
| 135-L | `e6fa436` | v131-72 | Stok liste kartları (.satir) — düşük stok crit-bg + üniform butonlar |
| 135-M | `5d41a00` | v131-73 | Brewday timeline — bg-sunken + DATA faz_renk inline INTACT |
| 135-N | `b2189b7` | v131-74 | Sidebar (.bm-sidebar) — Fraunces logo + accent-soft aktif + vintage-mid avatar |
| 135-O | `b53c1b8` | v131-75 | Layout spacing + renk disiplini final pass (--golge2 ölü kod kaldırıldı, audit) |
| 135-P | `c7dde92` | v131-76 | Eski token swap GRUP A (bg/bg2/card/kahve/kahve-bg/golge, ~262 kullanım alias) |
| 135-Q | `93fca6e` | v131-77 | Eski token swap GRUP B (bor/bor2/soluk/dim/kahve-border, ~402 kullanım alias) |
| 135-R | (bu) | v131-78 | Sprint 135 kapanış + Snapshot F |

## Kapsam Özeti

### A. Token sistemi (135-A/A1/A2) — yeni paleti

- **Renk taban** (mockup-aligned): `--bg-app` #F7F3EC, `--bg-card` #FFFFFF, `--bg-sunken` #F1ECE2, `--accent-soft` #F4E7D2
- **Metin** (Espresso/Ink/Muted): `--metin` #3D2A1C (espresso), `--ink` #2E2620 (gövde), `--metin-soluk` #8A7E70 (muted), `--cizgi-arac` #E9E1D2 (subtle divider)
- **Vintage accent alias**: `--vintage-koyu: var(--kahve-koyu)` #5C3A0E + `--vintage-mid: var(--bakir)` #8B5A2B (DRY 135-A1)
- **Semantic**: `--crit` #BC4533 + `--crit-bg` #FBEDEA + `--warn` #C08A2E + `--ok` #4A7C59
- **Elevation** (iki-kademe modern kahve-tabanlı rgba): `--elv-1` (subtle), `--elv-2` (orta), `--elv-3` (yüksek)
- **Spacing 4px ritim**: `--sp-1..6` (4/8/12/16/24/32)
- **Radius**: `--r-sm` 9px, `--r-md` 14px, `--r-lg` 18px
- **Tipografi**: `--fs-xs..xl` (11/13/14/16/20/25) + `--fw-regular/medium/semibold/bold` + `--lh-tight/base/loose`

### B. Tipografi (135-B) — Local font

- **Fraunces** serif başlık (latin + latin-ext 127KB) — `--font-baslik`
- **Hanken Grotesk** sans gövde (latin + latin-ext 54KB) — `--font-govde`
- **Eski alias intact**: `--font-display: var(--font-baslik)`, `--font-body: var(--font-govde)`
- Toplam 4 woff2 = 180KB sw.js precache (offline PWA tam destek)

### C. Komponent refactor (135-C/D/E/F/G/H/I/J/K/L/M/N)

**13 ana komponent** mockup'a refactor:
- Accordion (.bm-acc) + feature varyantı (.bm-acc-feature)
- Reçete kart (.bm-recete-kart) — banner gradient'ler kaldırıldı
- Sticky özet strip (.bm-sticky-summary) — Fraunces metric + dikey ayraç
- Sekme bar (.sb + .bm-stok-anatabs + .bm-stok-ictab-bar) — vintage alt-çizgi
- Form input (.inp) + 5 buton varyantı (.btn, .bm-btn-primary, .bm-ayar-btn, .bm-ayar-btn-sec, .bm-ayar-btn-uyari) — uniform mapping
- Stil Tahmini ribbon (`.bm-tahmin-ribbon`) — yeni class
- Reçete Doktoru kart (.bm-doctor-kart) + cozum-chip
- Header — app banner (.bm-header) koyu kahve + reçete header (.eh) beyaz-krem
- Stok ekran (.header + .bm-stok-anatabs) + Ayarlar (.bm-ayar-kart) + Bildirim (.bm-bildirim-*)
- Stok liste (.satir) global token (Stok + editör tab'larında uniform)
- Brewday timeline (.bm-ms-container) — DATA faz_renk INTACT
- Sidebar (.bm-sidebar) — Fraunces logo + accent-soft aktif

### D. Eski token swap (135-P/Q) — ~664 kullanım

**Grup A (düşük risk, 135-P)**:
- --bg (×5) → var(--bg-app)
- --bg2 (×59) → var(--bg-sunken)
- --card (×46) → var(--bg-card)
- --kahve (×107) → var(--metin)
- --kahve-bg (×27) → var(--accent-soft)
- --golge (×18) → var(--elv-1)

**Grup B (yüksek risk, 135-Q)**:
- --bor (×136) → var(--cizgi-arac)
- --bor2 (×7) → var(--cizgi-arac)
- --soluk (×149) → var(--metin-soluk)
- --dim (×99) → var(--metin-soluk)
- --kahve-border (×11) → var(--cizgi-arac)

**Toplam ×664 kullanım** otomatik yeni 135-A2 paletinden resolve oldu. Eski isimler korundu (geri uyumluluk, geçiş süresi yok).

## Erişilebilirlik Notları

- **Pasif metin kontrast**: --metin-soluk #8A7E70 üzerinde bg-card #FFFFFF → **3.96:1** kontrast oranı
  - **WCAG AA large text (18pt+ veya 14pt+ bold) PASS** (3.0:1 ≥)
  - **WCAG AA normal text** ≤ 4.5:1 sınırı altında (borderline)
  - Bağlam: muted metin sadece label/sub bilgi, ana metin --metin/--ink (5.0:1+)
- **Border kontrast**: --cizgi-arac #E9E1D2 hafif (subtle divider, decorative)
- **Aktif buton kontrast**: --vintage #B8763F + white text → 3.66:1 (büyük text AA)

## DOKUNULMAYAN

- ✅ **Motor zinciri**: B1_v8 (ONNX cluster) + V12c_v5 (V19 XGBoost) + V20 (α=0.30) + F1 (V19+V20 blend) + Strategy C (hierarchical V_cluster) — INTACT
- ✅ **DATA hex'leri**: srmR (renk topu/dot/cell), faz_renk (Primary/Dry Hop/Cold Crash/Kondisyon hex), kategori palet (--kat-base/-ozel/-koyu/-ek/-seker), hop origin renkleri — DOKUNULMADI
- ✅ **Semantic feedback**: --ka/--ya/--kk/--yk + --mk/--ma + --sk/--sa (alarm/warning/success/info) — INTACT
- ✅ **Tahmin render JS**: `_hybridRibbonInner`, `_scRibbonInner`, `updateRibbon`, `predictRawWith`, `__lastB1ClusterResult`, `__lastV12ClusterResult` — DOKUNULMADI (yalnızca inline span color token isimleri güncellendi 135-H)
- ✅ **Chip aksiyon mantığı**: `bmDoctorChipClick`/`bmDoctorChipParse`/`bmDoctorChipDisable` (133-A-4 / 134-bl-4/6/7/8) — INTACT
- ✅ **Brewday timeline JS**: `_alarmKartRender`, `_alarmlariOku`, brewLog, milestone hesaplama — INTACT
- ✅ **Stok + Ayar + Bildirim JS**: `stokEkle`, `stokGuncelle`, `bmStokDusurTek`, `bmCacheTemizle`, `bmSwGuncelle`, `bmVeriExport/Import`, `bmBildirimTercihToggle` — INTACT
- ✅ **Header + sekme + sticky JS**: `setSekme`, `setListeSekme`, `setAktifKlasor`, `bmGeriDon` (134-GERI smart nav), `toggleSidebar`, `bmReceteMode` (132-I mode toggle), `updateRibbon`, `updateStickySummary` — INTACT
- ✅ **Sprint 132+133+134** zinciri INTACT (132-D accordion framework, 132-I mode toggle, 132-F alarm sistemi, 132-A sticky özet, 132-fix-1 Firebase URL strip, 132-J-1..5, 134-A..H accordion tab'lar, 134-G toast, 134-H form input vintage, 134-bl-1..8 chip zinciri, 134-GERI breadcrumb, 134-TEMA toggle, 134-AYAR sekme sistemi, 134-S skeleton/error/disabled)

## Açık/Devreden (Sprint 136+ için)

- **Hardcoded font-size** (CSS 17 distinct, body inline çok) → fs-token full migration (büyük scope, component-spesifik değerler için kalabilir)
- **Hardcoded border-radius** (CSS 11 distinct) → r-token (3 değer), 8 spesifik kalmaya devam edebilir (50% avatar, 2px scrollbar)
- **Hardcoded spacing** (12 distinct) → sp-token (6 değer), 6 spesifik kalabilir (5/7/9/10/14/20 fine-tune)
- **Inline hex** (154 yer body) — çoğu DATA, manuel filtreleyip non-DATA token (büyük iş, eski referanslar)
- **WCAG AA normal text 4.5:1 hedef** — `--metin-soluk` muted için pasif metin %53 kontrast, normal text için yetersiz olduğu durumlar var. İhtiyaç oldukça daha koyu muted varyant (`--metin-orta` #6A5F50) eklenebilir.

## Final Sanity (Snapshot F)

- Snapshot F **byte-identical** production HTML (cmp -s PASS) ✓
- Yeni token sistemi (135-A2): `--bg-app/-card/-sunken`, `--ink`, `--metin/-soluk`, `--cizgi-arac`, `--accent-soft`, `--vintage`, `--crit/-bg`, `--warn`, `--ok`, `--elv-1/2/3`, `--sp-1..6`, `--r-sm/md/lg`, `--fs-xs..xl`, `--fw-*`, `--lh-*`, `--font-baslik/govde` — 30+ token tanımlı ✓
- Alias zincirleri: `--vintage-koyu = var(--kahve-koyu)`, `--vintage-mid = var(--bakir)`, `--espresso = var(--metin)`, `--font-display = var(--font-baslik)`, `--font-body = var(--font-govde)` (135-A1) ✓
- Eski token swap (Grup A+B 11 token, ~664 kullanım) alias resolve doğru — eski isim → yeni değer ✓
- Tüm sub-sprint final sanity 5/5 veya 6/6 PASS

## Drive Push Talimatı (134-K emsali)

CLAUDE.md kuralı: parent `18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-`.

**Küçük dosyalar (MCP push)**:
- `sw.js` (~48 KB) — Kaan'ın MCP setup'ı varsa script push edebilir
- Bu rapor (`_sprint135_kapanis_2026-05-20.md`, ~12 KB) — MCP create_file ile push

**Büyük dosyalar (Kaan manuel)**:
- `Brewmaster_v2_79_10.html` (~2.99 MB)
- `Brewmaster_v2_79_10.SNAPSHOT.F.sprint135-final.html` (~2.99 MB)
- 4 woff2 font dosyası (~180 KB total) — opsiyonel arşiv

Pattern: HTML + Snapshot aynı isim, duplicate oluşsun (Drive modifiedTime desc ile en güncel). Snapshot F ayrı dosya (versiyon arşivi).

## Özet Tablo

| Metrik | Değer |
|---|---|
| Sub-sprint sayısı | **19** (A, A1, A2, B-Q + R) |
| SW cache aralığı | **v131-58 → v131-77** (19 sürüm) |
| Toplam değişim | **+414 / -284** satır (HTML + sw.js, font dosyaları hariç) |
| Yeni token tanımı | **30+ token** + 5 alias zinciri |
| Eski token swap | **11 token, ~664 kullanım** otomatik alias resolve |
| Yeni font dosyası | **4 woff2** (Fraunces + Hanken Grotesk latin/latin-ext) — 180 KB |
| Snapshot dosyası | `Brewmaster_v2_79_10.SNAPSHOT.F.sprint135-final.html` (2.99 MB) |
| Kapsam | Onaylı mockup tasarım refactor + token sistemi + tipografi + 13 komponent + eski token migration |
| Motor zinciri | **DOKUNULMADI** (B1_v8 + V12c_v5 + V20 + F1 + Strategy C intact) |
| Production durumu | GitHub Pages canlı (`93fca6e` + 135-R commit) |
