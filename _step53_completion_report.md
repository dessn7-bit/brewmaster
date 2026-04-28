# Adım 53 — rmwoods entegrasyonu + V17 deploy (TAMAM)

**Tarih:** 2026-04-28
**Hash başlangıç:** 10d2886 (pre-flight)
**Hash bitiş:** _bekleniyor (commit + push)_

## Özet

Rory Woods 2018 dataset'i (`rmwoods.zip`, 1 GB) **ZorroV2** sayfasından non-commercial lisansla entegre edildi.
Dataset:
- HDF5: `all_recipes.h5` (403,157 reçete, ham JSON+İngrediente parse)
- Pickle maps: `fermmap` (2,793) + `hopmap` (1,537) + `yeastmap` (1,192) + `miscmap` (1,455) — ingredient canonicalization
- BJCP `style_guide` tek değer ('bjcp', 226 unique cat+name pair, hibrit BJCP 2008+2015)

V17 dataset: **301,316 reçete** (V16'nın 31.5×'i).

## Faz dökümü

| Faz | Açıklama | Süre | Çıktı |
|---|---|---|---|
| B-1 | rmwoods H5 parse → intermediate pickle | 40s | `_rmwoods_b1_parsed.pickle` (475 MB) |
| B-2 | Style mapping (cat+name → V15 slug) | 1s | `_rmwoods_style_to_v15slug.json` (mapping %99.7, 1152 cider/mead skip) |
| B-3 | V15 81-feature compute + Tinseth/Morey/ABV NaN fill | 56s | `_rmwoods_v15_format.json` (683 MB, 401,991 kayıt) |
| B-4 | (B-3 içinde): src_* NaN doldur | — | OG/FG/ABV: 330,783 estimate; IBU: 327,166 Tinseth; SRM: 330,573 Morey |
| B-5 | Title dedup + V16+rmwoods birleştirme | 28s | `_v17_dataset.json` (521 MB, 301,316 reçete, 109K rmwoods duplicate elendi) |
| B-6 | V17 retrain (14cat + 82-slug, XGBoost hist) | ~6 dk | `_v17_model_14cat.json` (3.7 MB), `_v17_model_slug.json` (44.5 MB) |
| B-7 | V16 vs V17 karşılaştırma | <1s | `_step53_v16_v17_compare.md` |
| B-8 | HTML V16 → V17 path replace | — | `Brewmaster_v2_79_10.html` |
| — | Smoke test (browser) | — | _Kaan kendi makinesinde test edecek (production)_ |

## V17 Metrikleri

### Genel (test split = 60,235 reçete, %20)

| Metric | V16 | V17 | Δ |
|---|---|---|---|
| Slug top-1 | 53.9% | **55.2%** | 🟢 +1.3pp |
| Slug top-3 | 76.3% | **79.9%** | 🟢 **+3.6pp** |
| Slug top-5 | 83.9% | **88.3%** | 🟢 **+4.4pp** |
| 14-cat top-1 | 69.4% | 64.5% | 🔴 -5.0pp* |
| 14-cat top-3 | 90.3% | 88.9% | ⚪ -1.3pp |
| 14-cat top-5 | 96.3% | 95.7% | ⚪ -0.6pp |

\* 14-cat top-1 regresyon: V17'de 16 cluster (V16'da 14 perceptual grouping). Naming taksonomi farklı, direkt karşılaştırma adil değil. Top-3/top-5 yakın → pratikte motorun davranışı benzer.

### Spotlight slug — Kazançlar

| Slug | V16 → V17 top-1 | Δ |
|---|---|---|
| **belgian_lambic** | 0.0% → 50.3% | 🟢 **+50.3pp** transformative |
| **oud_bruin** | 0.0% → 21.8% | 🟢 +21.8pp |
| **german_oktoberfest_festbier** | 0.0% → 18.8% | 🟢 +18.8pp |
| **french_belgian_saison** | 69.7% → 84.4% | 🟢 +14.7pp |
| **south_german_weizenbock** | 42.9% → 57.5% | 🟢 +14.6pp |
| **american_amber_red_ale** | 29.5% → 42.3% | 🟢 +12.8pp |
| **specialty_beer** (top-3) | 27.6% → 76.0% | 🟢 +48.4pp top-3 |
| **berliner_weisse** | 66.7% → 74.3% | 🟢 +7.7pp |
| **smoked_beer** | 30.0% → 37.2% | 🟢 +7.2pp |

### Spotlight slug — Regresyonlar (Adım 54 backlog)

| Slug | V16 → V17 top-1 | Δ | Sebep tahmini |
|---|---|---|---|
| **brett_beer** | 62.5% → 6.7% | 🔴 -55.8pp | rmwoods'ta brett_beer kategorisi az, mixed_fermentation ile karışıyor |
| **mixed_fermentation_sour_beer** | 78.6% → 23.3% | 🔴 -55.3pp | Aynı kategori, brett ile çakışan signal |
| **american_strong_pale_ale** | 43.2% → 27.5% | 🔴 -15.7pp | rmwoods'ta düşük presence, IPA family ile karışıyor |
| **belgian_witbier** | 82.1% → 71.0% | 🔴 -11.1pp | rmwoods witbier %30 specialty IPA ile karışıyor (white IPA) |
| **south_german_hefeweizen** | 82.5% → 75.6% | 🔴 -7.0pp | wheat cluster genişledi (american_wheat_ale dahil) |

## DECISIONS

1. **K1=C** Pre-flight onayı (tarihsel, Adım 53 başlangıçta verildi)
2. **K2=A** Public release lisansı non-commercial OK (Rory Woods izin verdi)
3. **K3=A YENİ** FULL 412K retrain (alternatif K3=A 100K subsample reddedildi: model boyutu hesabı yanlıştı, full ile ~44 MB makul)
4. **K4=C** rmwoods + V16 dedup
5. **K5=B** style_name primary slug mapping (Bug 7 audit dersi)
6. **K6=B** Tinseth/Morey/ABV calc src_* NaN doldur
7. **K7** Plan revize (Faz B-1 → B-8 tek script chain)
8. **K8=A** V12 motor güncelleme (V16 → V17 path replacement)

## Dosya organizasyonu (KONU 2)

`external/` ve `working/` klasörleri `.gitignore`'da. rmwoods 1 GB dataset commit edilmedi.

**Açık sorular (Kaan kontrol etsin):**
- Desktop/rmwoods.zip (1 GB orijinal): silinebilir mi?
- Desktop/Recipe Defteri standalone HTML × 2: Brewmaster export mı?
- Desktop/Kabeer/ + Kabeer.html: shortcut, sil?
- Downloads/karbsayar*.html × 8: alakasız muhtemelen, kontrol et

## Adım 54 backlog

- **Brett/Mixed regresyon düzeltmesi:** rmwoods sour subset analizi, BRETT_RE pattern güçlendirme, yeast_brett/yeast_lacto signal weight artırma
- **american_strong_pale_ale**: rmwoods'ta etiketli reçete sayısı az, V16 önceliklendirme veya bu slug'ı retire
- **Witbier vs White IPA**: feature ayrıştırma (specialty_ipa_white sub-class)
- **Hefeweizen/Dunkelweizen ailesi**: yeast_wheat_german signal güçlendirme

## Production deploy

V17 model dosyaları root'ta. `Brewmaster_v2_79_10.html` V17 path'leriyle güncellendi.

GitHub Pages canlı: bir sonraki `git push origin main` deploy.

Drive push: `Brewmaster_v2_79_10.html` (büyük), `_v17_*.json`, `_step53_completion_report.md`, `_step53_v16_v17_compare.md` parent `18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-`'ye gönder (her major iş bitiminde kuralı).
