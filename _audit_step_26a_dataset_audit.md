# AUDIT STEP 26A — DATASET AUDIT

**Tarih:** 2026-04-26
**Dataset:** `_ml_dataset_v6_final_comprehensive.json` (1100 reçete × 79 feature × 150 stil)

---

## 1. Pct çakışma haritası (sum-of-pcts histogram)

16 malt percent feature'ın reçete bazında toplamı. Sağlıklı: ~100. Çakışma: >105.

| Aralık | Reçete sayısı | Yüzde |
|---|---:|---:|
| Sum < 95 (eksik) | 27 | 2.5% |
| Sum 95-105 (sağlıklı) | 573 | 52.1% |
| Sum 105-150 | 145 | 13.2% |
| **Sum > 150 (aşırı çakışma)** | **355** | **32.3%** |

**Dataset'in 1/3'ünde regex çakışması nedeniyle pct toplamı anlamsız (sum>150). Sağlıklı oran %52.1 — yarıdan biraz fazla.**

## 2. Stil bazlı çakışma — top 15 (n>=5)

| Stil | n | Çakışma % | Ort sum |
|---|---:|---:|---:|
| `special_bitter_or_best_bitter` | 8 | 100% | 169.5 |
| `scottish_export` | 6 | 100% | 166.1 |
| `sweet_stout` | 13 | 100% | 153.2 |
| `american_imperial_stout` | 29 | 100% | 151.2 |
| `irish_dry_stout` | 8 | 100% | 150.9 |
| `american_barleywine` | 13 | 100% | 164.2 |
| `pumpkin_squash_beer` | 6 | 100% | 146.9 |
| `british_barley_wine_ale` | 7 | 100% | 167.6 |
| `pumpkin_spice_beer` | 5 | 100% | 158.5 |
| `british_imperial_stout` | 5 | 100% | 154.3 |
| `dessert_stout_or_pastry_beer` | 10 | 100% | 154.9 |
| `double_ipa` | 20 | 95% | 162.8 |
| `german_schwarzbier` | 11 | 91% | 105.5 |
| `american_india_pale_ale` | 59 | 90% | 158.9 |
| `common_beer` | 8 | 88% | 148.4 |

**Pattern:** İngiliz/Amerikan stilleri (Bitter, Stout, Porter, Barleywine, IPA) toplu çakışmalı çünkü pale_ale tabanlı malt setleri. Regex `pale_ale` hem `pct_pilsner` (alternation `pale_ale`) hem `pct_base` (alternation `pale`)'e düşüyor. Belçika/Alman stilleri (Pilsner-tabanlı) daha temiz.

## 3. Stil dağılımı

| Metrik | Değer |
|---|---:|
| Toplam unique stil | **150** |
| Min n | 1 |
| Max n | 59 (`american_india_pale_ale`) |
| Medyan n | **4** |
| Stil sayısı n<5 | **76** (%50.7) |
| Stil sayısı n<10 | **109** (%72.7) |
| Stil sayısı n>=10 | 41 |
| Stil sayısı n>=20 | 8 |
| Stil sayısı n>=30 | 4 |

**KRİTİK:** Yarıdan fazlası (109/150 = %72.7) 10'dan az örnek. ML training için stratify edilmiş split pratik değil. V7 için ya örnek toplama ya stilleri merge etmek gerekiyor (ana kategori bazlı, bkz. Adım 26D hierarchy).

## 4. Outlier kontrolü (og/fg/abv/ibu/srm)

| Feature | Aralık | Outlier sayısı | Örnek |
|---|---|---:|---|
| og (1.020-1.150) | 2 | `b2_318` american_barleywine og=1.17, `b2_360` british_imperial_stout og=1.22 |
| fg (0.995-1.045) | 2 | `b2_318` fg=1.05, `b2_445` strong_ale fg=1.05 |
| abv (0-16) | 3 | `b2_318` abv=18, **`b2_360` british_imperial_stout abv=32**, **`b2_445` strong_ale abv=28** |
| ibu (0-150) | 0 | — |
| srm (0-60) | 25 | Imperial Stout/Barleywine/RIS ait — örn. `v1_111` srm=74 |

**Net problemler:**
- `b2_360` abv=32%: gerçekçi değil (klasik beer max ~14-16% with eisbock). Veri girişi hatası.
- `b2_445` abv=28%: aynı kategori.
- `b2_318` abv=18% (american_barleywine, og=1.17): eisbock olabilir, sınırda.

SRM>60 reçeteleri Imperial Stout/RIS için olağan (yağlı kara), outlier ele alınmamalı (ayrı sınıf).

## 5. Çift kayıt kontrolü

**Slug+Name eşleşmesi (case-insensitive trim):**

44 duplikat tespit edildi (~%4 dataset). İlk 5 örnek:
- `b2_136` ↔ `v1_120` — sweet_stout — Young's Double Chocolate Stout
- `b2_351` ↔ `v1_067` — scotch_ale_or_wee_heavy — Steelhead Wee Heavy clone
- `b2_352` ↔ `v1_072` — irish_red_ale — Smithwick's clone
- `b2_353` ↔ `v1_059` — irish_dry_stout — Guinness Draught clone
- `b2_542` ↔ `b2_058` — gose — Off Color Troublesome

**Pattern:** v1 (BYO/eski) ve b2 (brewery clones) batches'ı arasında 44 reçete iki kez giriş yapılmış. KNN'i bias eder — V7 için dedupe gerekli.

**Feature vector duplikat (5 scalar, og/fg/abv/ibu/srm):**

22 duplikat (~%2). Bazı örnekler farklı stil etiketli (örn. `b2_328` chili_pepper_beer vs `b2_116` american_india_pale_ale aynı 5-scalar). Bu daha az kritik (farklı stilse feature engineering eksikliği gösteriyor).

---

## Özet bulgular

| Sorun | Boyut | Etki |
|-------|------|------|
| Pct sum >150 (regex çakışması) | 32.3% | KRİTİK — ML feature space bozuk |
| Pct sum 105-150 | 13.2% | ORTA — sınır |
| Yetersiz örnekli stil (n<10) | 72.7% | KRİTİK — train split imkânsız |
| Slug+name duplikat | 44/1100 = %4 | ORTA — KNN bias, dedupe gerek |
| Feature vector duplikat | 22/1100 = %2 | DÜŞÜK — feature engineering signal |
| ABV outlier (>16) | 3 | DÜŞÜK — manuel düzeltme |

**V7 için yapılması gereken sıralı:**
1. **Dedupe** — 44 slug+name duplikatı çıkar (~1056 unique).
2. **Outlier düzelt** — 3 abv > 16 reçeteyi manuel doğrula veya çıkar.
3. **Regex recompute** — pct_* feature'ları yeniden hesapla (Adım 26B'deki yeni regex tasarımı ile). **Engel:** Dataset raw malt listesi tutmuyor (sadece computed features). Recompute için kaynak reçeteler (BYO/Brulosophy/clone DB) yeniden toplanmalı veya raw malts ayrı bir veri olarak bulunmalı.
4. **Stil merge** — n<5 stilleri (76 stil, 76*ort_4=304 reçete) kategori bazına merge et VEYA ayrı outlier sınıfına at.
5. **Regen dataset** — temiz recompute sonrası `_ml_dataset_v7_clean.json` üret.

**Kullanılabilir reçete sayısı (post-dedupe):** ~1056 (1100 − 44 duplikat).
**Ana kategori coverage:** 150 stil 14 ana kategoriye (Adım 26D) maple, ana kategori bazlı stratify mümkün.
