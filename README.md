# Brewmaster

Türkçe ev üretimi (homebrewing) hesap ve reçete uygulaması. Tek dosyada toplanmış (`Brewmaster_v2_79_10.html`, ~5.2 MB) yerel-öncelikli web uygulaması; PWA olarak telefona kurulabilir.

**Canlı:** https://magical-sopapillas-bef055.netlify.app

## Ne Yapar

- Reçete tasarımı: malt, şerbetçiotu, maya seçimi; OG / FG / ABV / IBU / SRM hesabı
- Mash / sparge / kaynama / fermantasyon kontrol akışı
- Stil otomatik tahmin (BA 2026 + BJCP 2021 hibrit, 203 stil + 58 alt-stil)
- Reçete kütüphanesi, batch günlüğü, ölçüm-temelli kalibrasyon

## V6 Stil Tahmin Motoru (production)

İçerideki ML pipeline:

- **1100 gerçek reçete** üzerinde eğitilmiş (Brulosophy + BYO + brewery clones + AHA NHC + Milk The Funk + V6 expansion)
- **Multi-K weighted KNN ensemble + veto rules + feature weighting** (k=5, Manhattan distance, inverse-distance voting)
- **79 feature** — orijinal 61 + 18 ekstra (mash/fermantasyon sıcaklığı, su kimyası, maya alt türleri, lagering, dry-hop)
- **5-fold CV (seed 42, 1100 reçete):** top-1 **%78.5**, top-3 **%86.5**, top-5 **%87.3**
- **Holdout (840 train / 260 test, seed 42):** top-1 **%73.8**, top-3 **%80.8**, top-5 **%81.5**
- **Leave-one-out smoke (5 reçete):** 4/5 top-1, 5/5 top-3 — Dark Belgian Dubbel leakage-free top-1 %100, en yakın 5 komşunun hepsi belgian_dubbel
- Tüm motor (1100 reçete + KNN voting + veto + feature weights) HTML'e inline gömüldü — ek runtime/sunucu yok

**Random Forest YOK.** Önceki sürümlerde "RF" iddiaları placeholder'dı; V7 motoru hardcoded if/else mockScores ve sahte LOOCV %83 console.log içeriyordu, kaldırıldı. V6 motoru saf weighted KNN — etiketleme dürüst.

V5 motoru fallback olarak HTML'de duruyor (default değil). V5 5-fold CV referansı: top-1 %61.8, top-3 %79.7, top-5 %86.5.

**Bilinen kısıt:** specialty kategorileri (örn. `pumpkin_spice_beer` sadece 1 örnek) az veriden dolayı top-1 zayıf. P1 data expansion sprintinde adres edilecek. XGBoost ensemble P2.1'de planlanıyor.

Detaylı not için `CLAUDE.md` içindeki "Stil Skorlama Motoru" bölümü.

## Yapı / Stack

- Tek dosya HTML + inline JS (vanilla, framework yok)
- Inline ML motoru (style_engine.js HTML'e gömülü)
- localStorage tabanlı state + reçete kütüphanesi
- PWA: `manifest.webmanifest`, service worker, offline-ready
- Hosting: Netlify (continuous deployment via GitHub)

## Önemli Dosyalar

- `Brewmaster_v2_79_10.html` — uygulama (asıl ürün)
- `STYLE_DEFINITIONS.json` — 203 stil tanımı (BA + BJCP hibrit)
- `STYLE_FAMILIES.json` — 33 stil ailesi + tie-break discriminator
- `SUBSTYLE_VARIANTS.json` — 58 alt-stil
- `style_engine.js` — kural-tabanlı stil eşleme motoru
- `_ml_dataset.json` — 1031 reçete × 61 feature (V5 baseline dataset)
- `_ml_dataset_normalized.json` — 1016 reçete × 61 feature, alias normalize (V5 motor referansı)
- `_ml_dataset_v6_final_comprehensive.json` — 1100 reçete × 79 feature (V6 production dataset)
- `style_aliases.json` — slug normalizasyon (gueuze↔lambic, hefeweizen↔weissbier vb.)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — PWA varlıkları
- `netlify.toml`, `_redirects` — Netlify yapılandırması

## Kişisel Proje Notu

Brewmaster, Bulldog Brewer ile 10–12 L batch ölçeğinde çalışan tek bir kullanıcının (ben, Kaan) günlük üretim ihtiyaçlarına göre yazılmış kapalı bir araçtır. Ticari hedefi yok; gerçek kullanım sırasında biriken geri besleme ile öğrenen kişiselleştirilmiş bir sistem hâline getirmek uzun vadeli vizyonudur.

Geliştirme tamamen Claude Code (Anthropic) ile yürütülür; bu repo da o sürecin canlı çalışma alanıdır. 

