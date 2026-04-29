# Adım 60 — RAPOR 2: V19 En Düşük Slug'lar

**Tarih:** 2026-04-29  
**Veri:** `working/_v19_dataset.json` (383,334 reçete, 125 unique slug)  
**Karşılaştırma:** V18.2 (archive) ve V18.3 (archive)

---

## En Düşük 25 V19 Slug

| # | Slug | V19 | V18.3 | V18.2 | Cluster | Tier | Train? |
|---|---|---|---|---|---|---|---|
| 1 | juicy_or_hazy_double_india_pale_ale | 1 | 1 | 1 | (unmapped) | T4 | ❌ <10 |
| 2 | smoke_porter | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 3 | pumpkin_spice_beer | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 4 | english_brown_ale | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 5 | chocolate_or_cocoa_beer | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 6 | strong_scotch_ale | 1 | 1 | **0** | (unmapped) | T4 | ❌ (V18.3'te yeni) |
| 7 | gluten_free_beer | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 8 | foreign_extra_stout | 1 | 1 | 2 | (unmapped) | T4 | ❌ (V18.2'de daha fazla) |
| 9 | scottish_heavy | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 10 | piwo_grodziskie | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 11 | historical_beer | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 12 | international_pale_lager | 1 | 1 | 1 | (unmapped) | T4 | ❌ |
| 13 | west_coast_india_pale_ale | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 14 | pumpkin_squash_beer | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 15 | american_fruited_sour_ale | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 16 | tropical_stout | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 17 | finnish_sahti | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 18 | cream_ale | 2 | 2 | **0** | cream | T4 | ❌ (Sprint 56a alias merge sonrası 2 kaldı) |
| 19 | czech_amber_lager | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 20 | new_zealand_pilsner | 2 | 2 | 2 | (unmapped) | T4 | ❌ |
| 21 | franconian_rotbier | 3 | 3 | 3 | (unmapped) | T4 | ❌ |
| 22 | australian_pale_ale | 3 | 3 | 3 | (unmapped) | T4 | ❌ |
| 23 | specialty_honey_beer | 3 | 3 | 3 | (unmapped) | T4 | ❌ |
| 24 | american_light_lager | 3 | 3 | **2** | (unmapped) | T4 | ❌ (V18.2'de daha az) |
| 25 | brut_ipa | 3 | 3 | 3 | (unmapped) | T4 | ❌ |

**Not:** "(unmapped)" = `SLUG_TO_CLUSTER` dict'inde yok, V19 train script'inde `'other'` cluster'a düşüyor. Bunlar 14cat model'inde "other" sınıfı altında, slug model'inde de filtre dışı (≤10).

---

## Train Edilebilir Eşik (≥10) — En Düşük 10 Slug

| # | Slug | V19 | V18.3 | V18.2 | Cluster | Tier |
|---|---|---|---|---|---|---|
| 1 | belgian_quadrupel | 78 | 78 | 89 | belgian | T4 |
| 2 | dunkles_bock | 85 | 85 | 69 | bock | T4 |
| 3 | kellerbier | 97 | 97 | 89 | lager | T4 |
| 4 | german_oktoberfest_festbier | 100 | 100 | 80 | lager | T4 |
| 5 | brett_beer | 101 | 101 | 76 | sour | T4 |
| 6 | english_pale_ale | 103 | 119 | 102 | pale_ale | T4 |
| 7 | juicy_or_hazy_india_pale_ale | 144 | 145 | 132 | ipa | T4 |
| 8 | belgian_gueuze | 199 | 199 | 301 | sour | T4 |
| 9 | gose | 214 | 214 | 102 | sour | T3 |
| 10 | belgian_ipa | 218 | 219 | 146 | belgian | T3 |

### Trend Analizi (V18.2 → V19)

**Büyüyen slug'lar (Sprint 56a Plan C dedupe etkisi):**
- gose: 102 → 214 (+%110, dedupe + gueuze cleanup)
- belgian_ipa: 146 → 218 (+%49, dedupe)
- juicy_or_hazy: 132 → 144 (+%9)
- brett_beer: 76 → 101 (+%33)
- festbier: 80 → 100 (+%25)
- dunkles_bock: 69 → 85 (+%23)
- kellerbier: 89 → 97 (+%9)

**Küçülen slug'lar (etiket temizliği etkisi):**
- belgian_gueuze: 301 → 199 (-%34, gueuze tarama 156 yanlış etiket düzeltildi)
- belgian_quadrupel: 89 → 78 (-%12, filter sıkılaştırma)

**English Pale Ale dalgalanma:**
- V18.2: 102, V18.3: 119 (taxonomy temizliği), V19: 103 (Sprint 56b cleanup)

---

## Bucket Breakdown (V19 reçete sayısına göre)

| Bucket | Slug count | Açıklama |
|---|---|---|
| **≤30 (kritik, train DIŞI)** | **38 slug** | <10 → V6/V12 train edilmez, model bunları hiç görmez |
| 31-100 | 4 slug | belgian_quadrupel, dunkles_bock, kellerbier, festbier (T4 train edilir, %100 V6'ya alınır) |
| 101-250 | 6 slug | brett_beer, EPA, juicy_or_hazy, belgian_gueuze, gose, belgian_ipa |
| 251-1000 | 17 slug | red_ipa, rye_ipa, white_ipa, mixed_ferm, ... |
| 1001-5000 | 39 slug | belgian_witbier, belgian_dubbel, ... |
| >5000 | 21 slug | AIPA, APA, specialty, double_ipa, ... |

### Train DIŞI 38 slug (V19 ≤9 reçete)

Bu slug'lar V6/V12 train'de hiç görülmez. Kullanıcı bu stillerden birini tarif ederse model "other" veya en yakın train edilebilir slug'a basacak.

**Train dışı dağılım:**
- 12 slug × n=1: tropikal/exotic/historical
- 8 slug × n=2: cream_ale, west_coast_ipa, tropical_stout, finnish_sahti, czech_amber_lager, NZ_pilsner, ...
- 6 slug × n=3: brut_ipa, franconian_rotbier, australian_pale_ale, ...
- 12 slug × n=4-9: imperial_red_ale, coffee_beer, german_eisbock, session_ipa, ...

### Kritik 4 slug (31-100, V6'da %100 alınmış ama yine zayıf)

| Slug | V19 | V18.2 | V19 holdout test t1 |
|---|---|---|---|
| belgian_quadrupel | 78 | 89 | 0% (V19, n=15) |
| dunkles_bock | 85 | 69 | 17.6% (V19, n=17) |
| kellerbier | 97 | 89 | 0% (V19, n=19) |
| german_oktoberfest_festbier | 100 | 80 | 10% (V19, n=20) |

**Ortak özellik:** train set ~80, holdout ~15-20 — sample boyut istatistiksel gürültü payı yüksek.

---

## V19 Toplam İstatistik

| Metric | Değer |
|---|---|
| Total recipes | 383,334 |
| Unique slugs (her count dahil) | 125 |
| Train edilebilir slug (≥10) | 87 |
| Drop edilen slug (<10) | 38 |
| Train edilebilir reçete | ~382,800 |
| Drop edilen reçete (<10 slug) | ~530 |

---

## Adım 60 / Adım 61+ Karar Materyali

### Train DIŞI 38 slug için olası aksiyonlar:
1. **Slug birleştirme**: cream_ale (n=2) → american_cream_ale (n=4,482) merge
2. **Alias mapping ekle**: foreign_extra_stout → export_stout (n=1,580); english_brown_ale → brown_ale (n=3,172)
3. **Adım 61+ ek scrape**: brut_ipa, west_coast_ipa, czech_amber_lager — modern stiller, BJCP 2021'de var, BYO/AHA kaynakta bulunabilir
4. **Train DIŞI bırak**: historical_beer, piwo_grodziskie, gluten_free_beer — niş stiller, kullanıcı çok az görür

### Kritik 4 slug (31-100) için aksiyonlar:
- belgian_quadrupel: alias merge daha gevşek (Adım 56'da sıkılaştırılmıştı, geri al)
- dunkles_bock: mash_temp feature (Adım 56'da öneriydi, eklenmedi)
- kellerbier: filter_unfiltered feature, mmum natural_carbonation
- festbier: lagering_days feature

### V6 dataset revizyon parametreleri için referans:
- T1 (≥5000): 21 slug — 100/slug çok az, **150-200/slug** önerisi
- T2 (1000-4999): 39 slug — 80/slug
- T3 (200-999): 17 slug — 80/slug, sour 500
- T4 (<200): 10 slug train edilebilir — %100 (gose/gueuze/brett dahil)

**Sour boost net analiz:**
- Sour 9 slug'ın mevcut V6 toplamı: 3,282
- Eğer sour boost azalsa (örn 500 → 250), V6 sour: ~2,000 → V6 sour ratio %20 (mevcut %32.6)
- Bu değişiklik küçük sour slug (gose/gueuze/brett) hala %100 tutar (T3-T4 hepsi alınır)
- Sadece büyük sour (berliner, flanders, oud_bruin, lambic, fruit_lambic) 500 → 250 indirgenir

---

**İki rapor hazır.** Kaan'ın V6 dataset revizyon karar materyali:
1. T1 100/slug → ?
2. T2-T3 80/slug → ?
3. Sour boost 500 → ?
4. T4 train DIŞI 38 slug için (alias merge, ek scrape, drop)
