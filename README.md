# Brewmaster

Türkçe ev üretimi (homebrewing) hesap ve reçete uygulaması. Tek dosyada toplanmış (`Brewmaster_v2_79_10.html`, ~3.6 MB) yerel-öncelikli web uygulaması; PWA olarak telefona kurulabilir.

**Canlı:** https://magical-sopapillas-bef055.netlify.app

## Ne Yapar

- Reçete tasarımı: malt, şerbetçiotu, maya seçimi; OG / FG / ABV / IBU / SRM hesabı
- Mash / sparge / kaynama / fermantasyon kontrol akışı
- Stil otomatik tahmin (BA 2026 + BJCP 2021 hibrit, 203 stil + 58 alt-stil)
- Reçete kütüphanesi, batch günlüğü, ölçüm-temelli kalibrasyon

## V5 Stil Tahmin Motoru

İçerideki ML pipeline (production):

- **1016 gerçek reçete** üzerinde eğitilmiş (Brulosophy + BYO + brewery clones + AHA NHC + Milk The Funk)
- **Multi-Ensemble:** KNN (1016 örnek) + Random Forest (50 ağaç, depth 15) + slug aliasing
- **LOOCV:** top-1 ~%55, top-3 **%76.6**, top-5 %80.3
- Tüm motor (KNN örnekleri, RF ağaçları, alias tablosu) HTML içine inline gömüldü — ek runtime/sunucu yok

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
- `_ml_dataset.json` — 1016 reçete × 61 feature ML dataset
- `style_aliases.json` — slug normalizasyon (gueuze↔lambic, hefeweizen↔weissbier vb.)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — PWA varlıkları
- `netlify.toml`, `_redirects` — Netlify yapılandırması

## Kişisel Proje Notu

Brewmaster, Bulldog Brewer ile 10–12 L batch ölçeğinde çalışan tek bir kullanıcının (ben, Kaan) günlük üretim ihtiyaçlarına göre yazılmış kapalı bir araçtır. Ticari hedefi yok; gerçek kullanım sırasında biriken geri besleme ile öğrenen kişiselleştirilmiş bir sistem hâline getirmek uzun vadeli vizyonudur.

Geliştirme tamamen Claude Code (Anthropic) ile yürütülür; bu repo da o sürecin canlı çalışma alanıdır. 

