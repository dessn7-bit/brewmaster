# Brewmaster (Kabeer) — Tasarım Sistemi

> Extract kaynağı: `Brewmaster_v2_79_10.html` (tek dosyalı PWA, ~3.5 MB).
> Not: extract isteği `index.html` diyordu; repo'da **index.html kodda bulunamadı** —
> üretim dosyası `Brewmaster_v2_79_10.html`. Extract tarihi: 2026-06-10.
> Bu dosya yalnız kodda **gerçekten var olan** kalıpları belgeler; bulunamayanlar açıkça işaretlidir.

## Yön (Direction)

Vintage/sıcak "bira defteri" estetiği: nötr kırık beyaz taban + espresso mürekkep +
bakır/amber vurgu. Serif başlık (Cormorant Garamond) + sans gövde (Mulish), marka
elementlerinde Cinzel. Derinlik border-ağırlıklı, gölgeler kahve tonlu ve hafif.
Marka adı: **Kabeer** (`.bm-sidebar-title`), ana sayfa hero sloganı: **"HER BİRA BİR MİT"** (`.bm-ana-hl`).

## Renk Token'ları (`:root`, satır 104-205)

### Taban
| Token | Değer | Rol |
|---|---|---|
| `--bg-app` | `#F7F3EC` | nötr kırık beyaz taban |
| `--bg-card` | `#FFFFFF` | tam beyaz kart |
| `--bg-sunken` | `#F1ECE2` | iç alan / satır |

### Mürekkep hiyerarşisi
| Token | Değer | Rol |
|---|---|---|
| `--metin` | `#3D2A1C` | başlık metni (espresso) |
| `--ink` | `#2E2620` | gövde metni (daha koyu nötr) |
| `--metin-soluk` | `#7A6E60` | soluk metin — Adım 137-A: `#8A7E70`→`#7A6E60` WCAG AA (bg-card 4.97:1 PASS) |

### Vintage vurgu
| Token | Değer | Rol |
|---|---|---|
| `--vintage` | `rgb(184,118,63)` | brand primary amber/copper |
| `--vintage-mid` = `--bakir` | `rgb(139,90,43)` | aktif nav rengi, avatar bg |
| `--vintage-koyu` = `--kahve-koyu` | `rgb(92,58,14)` | koyu başlık, primary buton hover |
| `--altin` | `#B8874E` | altın vurgu |
| `--accent-soft` | `#F4E7D2` | hover/seçili/ikon bg (amber-soft) |

### Masthead (header)
| Token | Değer | Rol |
|---|---|---|
| `--kahve-masthead` | `#63492F` | strip bg + header gradient TOP (Adım 137-G) |
| `--kahve-masthead-dark` | `#48351F` | header gradient BOTTOM |
| `--masthead-ink` | `#F6EAD7` | krem metin/ikon — hamburger `#3D2817` WCAG 1.67:1 FAIL sonrası tek token'a bağlandı |

### Çizgi / Border
- `--cizgi-arac: #E9E1D2` — **tek border standardı** (eski `--bor`/`--bor2`/`--kahve-border` hepsi buna alias, Adım 135-Q).

### Semantic
- `--crit: #BC4533` / `--crit-bg: #FBEDEA`, `--warn: #C08A2E`, `--ok: #4A7C59`
- Badge çiftleri (koyu/açık): `--yk:#5A6B2A`/`--ya:#E8E4C8`, `--kk:#8B3A1A`/`--ka:#F0D8C8`, `--mk:#4A5970`/`--ma:#DAE0E4`, `--sk:#8B6A1A`/`--sa:#F0E4BC`

### Malt kategori renkleri (I1)
- `--kat-base:#8B9D3D` (zeytin — tahıl tarlası), `--kat-ozel:#C8A040` (altın — karakter),
  `--kat-koyu:#5D341A` (kahve — kavurma), `--kat-ek:#A8896B` (sıcak bej — Adjunct/Ek Tahıl),
  `--kat-seker:#D9823C` (yanmış turuncu — fermente şeker)
- Her birinin `-bg`/`-t` rozet çifti var. JS eşlemesi: `katKodu(g)` (DB'de `g` alanı "Adjunct" İngilizce kalır, gösterim "Ek Tahıl" — `katAd()`).

### Alias mimarisi (DRY)
Eski token isimleri silinmedi, yeni token'lara yönlendirildi (Adım 135-P/Q, ~209+143 kullanım otomatik geçti):
`--bg→--bg-app`, `--bg2→--bg-sunken`, `--card→--bg-card`, `--bor/--bor2→--cizgi-arac`,
`--kahve→--metin`, `--soluk/--dim→--metin-soluk`, `--golge→--elv-1`, `--kahve-bg→--accent-soft`.
**Kural: yeni kod yeni token isimlerini kullanır; eski isimler legacy uyumluluk içindir.**

## Spacing — 4px ritmi

`--sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:32px`

## Radius

`--r-sm:9px; --r-md:14px; --r-lg:18px` — legacy `.kart` 10px hardcoded (token öncesi).

## Derinlik (Depth)

**Border-ağırlıklı strateji**: dosyada 217 adet `border:1px solid` vs 74 `box-shadow`.
İki kademeli kahve tonlu elevation (`rgba(74,53,38)`):
- `--elv-1: 0 1px 2px …05, 0 1px 3px …06` (varsayılan; `--golge` alias)
- `--elv-2: 0 2px 6px …05, 0 6px 16px …07` (hover)
- `--elv-3: 0 10px 30px …13` (modal/öne çıkan)

Legacy `.kart` imza gölgesi — "paspartu" katmanlı çerçeve:
`inset 0 0 0 1px rgba(250,247,238,.55), 0 0 0 3px var(--bg2), 0 1px 0 3px var(--bor), var(--golge)`

## Tipografi

### Aileler
- `--font-baslik: "Cormorant Garamond", Georgia, serif` (alias `--font-display`)
- `--font-govde: "Mulish", system-ui, sans-serif` (alias `--font-body`)
- `Cinzel` w500 — yalnız marka elementleri (aşağıda).

### Skala
`--fs-xs:11 / --fs-sm:13 / --fs-base:14 / --fs-md:16 / --fs-lg:20 / --fs-xl:25` (px)
Ağırlıklar: `--fw-regular:400 / medium:500 / semibold:600 / bold:700`
Satır yüksekliği: `--lh-tight:1.2 / base:1.45 / loose:1.6`

### Font yükleme + Türkçe glyph kuralı (latin-ext)
- Cormorant Garamond + Mulish: **base64 data-URI inline** @font-face, 4 blok ~170KB —
  her aile için **latin + latin-ext ayrı blok** (Adım 138). Cinzel `fonts/Cinzel.woff2` dosyadan.
- Diğer picker fontları `fonts/*.woff2` dosyalarından, `unicode-range` split:
  latin (`U+0000-00FF,U+0131,…`) ve **latin-ext (`U+0100-02BA,…`) ayrı @font-face**.
- **Kural: Türkçe glyph'ler (ı, ğ, ş, İ, Ğ, Ş…) latin-ext bloğunda — yeni font eklerken
  latin-ext varyantı zorunlu**, yoksa Türkçe metin fallback'e düşer. Dosyada 64 @font-face,
  `fonts/` klasöründe 417 dosya.

### 200-font kütüphanesi + tipografi paneli
- `window.BM_TIPO_FONTS` — **tam 200 font ailesi** (doğrulandı: liste 200 eleman).
- `SERIFS` map (29 serif) → `fontStack(name)`: serif ise `Georgia,serif`, değilse `system-ui,sans-serif` fallback.
- Kullanıcı tercihi `localStorage["bm_tipografi"]`; `bmTipografiUygula()` runtime'da
  `--font-baslik`/`--font-govde` + panel slotlarını `documentElement.style` ile set eder.
- Panel token slotları (Sprint 2.7c+2): başlık `--tip-h-{fw,ls,lh,tt,fvc,col,scale,fst}` +
  gövde `--tip-b-{…}` + `--tip-b-fvn` (sayı hizalama). Initial = `initial` → fallback aktif,
  görünüm değişmez. Tüm özelleştirilebilir metin stilleri
  `var(--tip-x-Y, fallback)` deseniyle bağlı (ör. `font-size:calc(var(--fs-md) * var(--tip-h-scale, 1))`).

## Marka Kilidi — Cinzel (statik bölge)

Cinzel elementleri tipografi paneline **bağlı DEĞİL** — kilit değerleri hardcoded:
`font-variant-caps:normal; font-style:normal; text-transform:none` (var() değil, literal).

| Element | İçerik / rol |
|---|---|
| `.bm-sidebar-title` | "Kabeer" — sidebar logo metni |
| `.bm-sidebar-version` | versiyon satırı |
| `.bm-header-title` | aktif ekran başlığı, `#F6EAD7`, 19px |
| `.bm-header-breadcrumb` | `#A98E73` |
| `.bm-ana-hl` / `.bm-ana-hs` / `.bm-ana-kn` | Ana sayfa "Marka Kapısı" hero (Adım 137-G P2): 23px/ls 1.6px, 11px/ls 2.6px, 16px/ls 1.2px |

- Cinzel @font-face yorumla korunur: "Cinzel @font-face korundu (Marka Kapisi)" (satır 20).
- Mobil marka şeridi `#bm-marka-serit` **statik HTML** (JS render DEĞİL), yalnız ≤768px görünür (satır 1081 yorumu).

## Nav / Sekme — small-caps + sabit renk kilidi

- `.sb-btn` (editör sekme barı), `.bm-sidebar-tab`, `.bm-sidebar-folder`, `.bm-sidebar-folder-add`:
  `font-variant-caps:small-caps` + `text-transform:none` **hardcoded** (panel slotuna bağlı değil).
- **Sabit renk kilidi**: bu elementlerde `color` `--tip-b-col`'a bağlanmaz —
  pasif `var(--metin-soluk)` → hover `var(--ink)` → aktif `var(--vintage-mid)` + `var(--accent-soft)` bg
  (sb-btn aktif: alt çizgi `2.5px solid var(--vintage)`).
- `.bm-sidebar-section`: `text-transform:uppercase` + `font-variant-caps:normal` kilidi, ls .7px.
- Karşıt örnek: `.bm-sidebar-tab-badge` panel'e bağlıdır (`var(--tip-b-col, …)`) — kilit yalnız nav metnine uygulanır.

### `lang="und"` kuralı
Small-caps/uppercase nav butonları HTML'de `lang="und"` taşır (satır 11707, 11720, 11734-11738, 20174):
sidebar tab/folder/section, "Yeni klasör" butonu ve `sb-btn` sekme butonları.
Amaç: Türkçe büyük/küçük İ-i locale eşlemesinin small-caps render'ını bozmaması
(dil "undetermined" → tr locale casing devre dışı). **Yeni small-caps nav elementi eklerken `lang="und"` zorunlu.**
(Kodda açıklayıcı yorum bulunamadı; kalıp HTML attribute olarak mevcut ve tutarlı.)

## Statik vs Dinamik Bölge

Kodda "static zone / dynamic zone" adlı açık bir yorum **bulunamadı**; kalıp şöyle gerçekleşmiş:
- **Statik (kilitli) bölge**: marka (Cinzel elementleri), nav/sekme (small-caps + sabit renk),
  `.bm-sidebar-section` — tipografi paneli ve `--tip-*` slotları bu bölgeye **işlemez**.
- **Dinamik bölge**: içerik metinleri (kart başlıkları, değerler, açıklamalar) —
  `var(--tip-h-*)` / `var(--tip-b-*)` slotlarına bağlı, panel ile özelleştirilebilir.
- `#bmKartListesi` **kodda bulunamadı** — ana dinamik içerik scroll container'ı `#ekran`
  (`grid-column:2; overflow-y:auto; height:100dvh`, satır 318). İçerik ekranları JS ile `#ekran` içine render edilir.

## Yerleşim (Layout)

- `body`: `display:grid; grid-template-columns:240px minmax(0,1fr); grid-template-rows:100dvh`
  (240px sidebar + ana alan; `minmax(0,1fr)` Adım 131-R min-content taşma savunması).
- Breakpoint **768px**: ≤768px tek kolon, `.bm-sidebar` fixed + `translateX(-100%)` slide
  (`.open` ile açılır), `.bm-backdrop` arkalık; ≥769px backdrop gizli.
- `html,body{overflow:hidden}` — scroll yalnız `#ekran` içinde.
- Grid yardımcıları: `.iki` (1fr 1fr, gap 8px), `.uc` (1fr 1fr 1fr, gap 6px),
  `.bm-stat-grid` (4 kolon → mobil 2 kolon), `.bm-statmini-grid` (repeat(4,1fr) → mobil 2).

## Bileşen Kalıpları

- **Buton** `.btn`: `border:none; border-radius:var(--r-sm); padding:var(--sp-2) var(--sp-4);`
  gövde fontu semibold, `font-size:var(--fs-sm)`, transition .15s (bg/color/shadow) + .08s transform.
- **Primary CTA** `.bm-sidebar-cta`: `background:var(--vintage)` + beyaz metin + `--elv-1`;
  hover `var(--vintage-koyu)` + `--elv-2`.
- **Input** `.inp`: `background:var(--bg-card); border:1px solid var(--cizgi-arac);
  border-radius:var(--r-sm); padding:var(--sp-2) var(--sp-3); font:var(--font-govde) var(--fs-base)`.
- **Kart**: legacy `.kart` (paspartu gölge, 10px radius, 14px padding) ve `.bm-recete-kart` (yeni reçete kartı).
- **Header arama** `.bm-header-search input`: koyu masthead üstünde
  `rgba(255,255,255,.06)` bg + `rgba(255,255,255,.12)` border, radius 18px.

## SRM / Cam-Rengi Motoru (swatch kararları)

İki katman:
1. **`srmR(s)`** — 15 kademeli SRM→hex lookup: `3→#dbb74b … 50→#170000`, SRM<3 fallback `#e2d589` (satır 4981).
   Türkçe/İngilizce ad karşılıkları `renk_adi(s)` ("Saman"→"Kara Amber") ve `bjcp_adi(s)` ("Pale Straw"→"Black").
2. **`motorRenk(srm, oranMap, pH)`** — tam spektral renk motoru (satır 5068):
   CIE 1931 gözlemci gauss yaklaşımı (xb/yb/zb), D65 illuminant tablosu (380-700nm),
   Beer-Lambert malt absorbans eğrisi (`maltA`, SRM/12.7 ölçekli), pigment absorbans bantları
   (`PIG`: karadut/vişne/cranberry/ahududu… antosiyanin pKh 3.8 **pH-bağımlı**, mavi_kelebek pH<3.5 asit formu),
   Lab uzayında malt-baz farkı ekleme, dönüş `{hex, nameTr, nameEn}`.
   Renk adı `PAL` paletinden nearest-ΔE (Saman/Straw, Buğday/Wheat, Bal/Honey, Kehribar/Amber, Bakır/Copper…).

### Swatch UI kararları (ortak helper'lar, satır 5026-5050)
- `aktif_renk_hex(srm, pigDurum)`: pigment yok / `mode==='izli'` → saf `srmR` hex; pigment varsa `motorRenk().hex`.
  **Reçete kartı renk dot'ları ve swatch'lar bu hex'i kullanır** (cam-içi görünen renk).
- `_camRenkAdTr/_camRenkAdEn`: **"birincil ad = pigment-aware (motorRenk); farklıysa SRM adı parantezde"**
  (satır 5041 yorumu). Pigmentsiz reçetede iki ad eşit → tek isim, parantez yok.
- Defter chip deseni: renk adı + `·` ayırıcı + stil adı (`.bm-recete-renk-chip`, satır 12069).
- Profil satırı etiketi: **"🌈 Eklenen Pigment"** (satır 19729) — pigment katkısının görsel renge yansıdığını gösterir.

## Değişiklik Disiplini (mevcut proje kuralları)

- Tek dosyalı PWA: her görsel değişiklik `Brewmaster_v2_79_10.html` içinde; SW cache bump gerekir
  (bu extract dosya değişikliği DEĞİLDİR, bump yok).
- Token değişikliği önce `:root`'ta; alias zinciri kırılmaz (eski isimler silinmez).
- WCAG AA kontrast: soluk metin ve masthead ink için geçmişte düzeltme yapıldı (137-A, 137-G) — yeni renk eklerken kontrol et.
