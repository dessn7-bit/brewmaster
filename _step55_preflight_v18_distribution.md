# Adım 55 Pre-flight A — V18.1 Slug Full Distribution

**Tarih:** 2026-04-29  
**Dataset:** `_v18_dataset.json` 301,316 reçete, 91 slug ≥10 train, 36 slug <10 dropped
**Sıralama:** En az reçeteden en çoka (zayıftan güçlüye).

---

## 1. Tam slug tablosu (91 satır)

| # | Slug | Cluster (14cat) | n V18 | %V18 | n V17 | Δ V17→V18 | Test n | Test t1 | Test t3 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | belgian_quadrupel | belgian | 15 | 0.00% | 15 | +0 | 3 | 0.0% | 33.3% |
| 2 | american_barleywine | barleywine | 16 | 0.01% | 16 | +0 | 3 | 33.3% | 66.7% |
| 3 | sweet_stout_or_cream_stout | stout | 19 | 0.01% | 19 | +0 | 4 | 50.0% | 100.0% |
| 4 | cream_ale | cream | 62 | 0.02% | 62 | +0 | 12 | 41.7% | 58.3% |
| 5 | dunkles_bock | bock | 69 | 0.02% | 69 | +0 | 14 | 21.4% | 64.3% |
| 6 | brett_beer | sour | 76 | 0.03% | 76 | +0 | 15 | 6.7% | 26.7% |
| 7 | german_oktoberfest_festbier | lager | 80 | 0.03% | 80 | +0 | 16 | 0.0% | 25.0% |
| 8 | kellerbier | lager | 89 | 0.03% | 89 | +0 | 18 | 5.6% | 16.7% |
| 9 | gose | sour | 102 | 0.03% | 0 | YENİ | 20 | 40.0% | 45.0% |
| 10 | english_pale_ale | pale_ale | 102 | 0.03% | 102 | +0 | 20 | 10.0% | 20.0% |
| 11 | juicy_or_hazy_india_pale_ale | ipa | 132 | 0.04% | 132 | +0 | 26 | 23.1% | 46.2% |
| 12 | belgian_ipa | belgian | 146 | 0.05% | 0 | YENİ | 29 | 3.4% | 17.2% |
| 13 | rye_ipa | ipa | 200 | 0.07% | 0 | YENİ | 40 | 5.0% | 37.5% |
| 14 | golden_or_blonde_ale | cream | 200 | 0.07% | 200 | +0 | 40 | 5.0% | 15.0% |
| 15 | white_ipa | ipa | 203 | 0.07% | 0 | YENİ | 41 | 14.6% | 29.3% |
| 16 | mixed_fermentation_sour_beer | sour | 213 | 0.07% | 213 | +0 | 43 | 27.9% | 34.9% |
| 17 | belgian_gueuze | sour | 301 | 0.10% | 0 | YENİ | 60 | 23.3% | 40.0% |
| 18 | red_ipa | ipa | 308 | 0.10% | 0 | YENİ | 62 | 4.8% | 29.0% |
| 19 | experimental_beer | specialty | 323 | 0.11% | 323 | +0 | 65 | 0.0% | 1.5% |
| 20 | dortmunder_european_export | lager | 329 | 0.11% | 329 | +0 | 66 | 18.2% | 31.8% |
| 21 | bamberg_maerzen_rauchbier | lager | 334 | 0.11% | 334 | +0 | 67 | 61.2% | 76.1% |
| 22 | black_ipa | ipa | 402 | 0.13% | 402 | +0 | 80 | 30.0% | 52.5% |
| 23 | belgian_lambic | sour | 409 | 0.14% | 1,831 | -1422 | 82 | 30.5% | 56.1% |
| 24 | belgian_fruit_lambic | sour | 427 | 0.14% | 0 | YENİ | 85 | 18.8% | 38.8% |
| 25 | oud_bruin | sour | 437 | 0.15% | 437 | +0 | 87 | 24.1% | 43.7% |
| 26 | american_strong_pale_ale | pale_ale | 453 | 0.15% | 453 | +0 | 91 | 34.1% | 61.5% |
| 27 | pale_lager | lager | 539 | 0.18% | 539 | +0 | 108 | 25.0% | 50.9% |
| 28 | german_rye_ale | wheat | 600 | 0.20% | 600 | +0 | 120 | 75.0% | 84.2% |
| 29 | german_bock | bock | 605 | 0.20% | 605 | +0 | 121 | 40.5% | 62.8% |
| 30 | flanders_red_ale | sour | 694 | 0.23% | 0 | YENİ | 139 | 57.6% | 74.8% |
| 31 | french_biere_de_garde | saison | 763 | 0.25% | 763 | +0 | 153 | 18.3% | 43.8% |
| 32 | munich_dunkel | lager | 801 | 0.27% | 801 | +0 | 160 | 46.2% | 63.1% |
| 33 | porter | porter | 827 | 0.27% | 827 | +0 | 165 | 23.6% | 50.3% |
| 34 | south_german_weizenbock | wheat | 868 | 0.29% | 868 | +0 | 174 | 60.3% | 80.5% |
| 35 | smoked_beer | specialty | 982 | 0.33% | 982 | +0 | 196 | 35.7% | 70.4% |
| 36 | pre_prohibition_lager | lager | 987 | 0.33% | 987 | +0 | 197 | 25.4% | 50.3% |
| 37 | german_schwarzbier | lager | 999 | 0.33% | 999 | +0 | 200 | 55.5% | 70.5% |
| 38 | german_heller_bock_maibock | bock | 1,078 | 0.36% | 1,078 | +0 | 216 | 53.2% | 65.7% |
| 39 | munich_helles | lager | 1,163 | 0.39% | 1,163 | +0 | 233 | 58.4% | 73.4% |
| 40 | export_stout | stout | 1,223 | 0.41% | 0 | YENİ | 245 | 14.3% | 39.2% |
| 41 | german_doppelbock | bock | 1,231 | 0.41% | 1,231 | +0 | 246 | 55.3% | 70.7% |
| 42 | british_barley_wine_ale | barleywine | 1,265 | 0.42% | 1,265 | +0 | 253 | 42.3% | 65.2% |
| 43 | berliner_weisse | sour | 1,382 | 0.46% | 1,484 | -102 | 276 | 71.4% | 81.9% |
| 44 | vienna_lager | lager | 1,433 | 0.48% | 1,433 | +0 | 287 | 46.3% | 68.6% |
| 45 | baltic_porter | porter | 1,474 | 0.49% | 1,474 | +0 | 295 | 23.7% | 44.1% |
| 46 | german_altbier | cream | 1,518 | 0.50% | 1,518 | +0 | 304 | 61.8% | 72.4% |
| 47 | ordinary_bitter | bitter | 1,589 | 0.53% | 1,589 | +0 | 318 | 45.6% | 62.3% |
| 48 | south_german_dunkel_weizen | wheat | 1,651 | 0.55% | 1,651 | +0 | 330 | 74.8% | 87.9% |
| 49 | old_ale | bitter | 1,780 | 0.59% | 1,780 | +0 | 356 | 23.9% | 42.4% |
| 50 | belgian_strong_golden | belgian | 1,794 | 0.60% | 1,940 | -146 | 359 | 38.7% | 67.1% |
| 51 | scottish_export | bitter | 1,932 | 0.64% | 1,932 | +0 | 386 | 36.5% | 63.0% |
| 52 | brown_porter | porter | 2,048 | 0.68% | 2,048 | +0 | 410 | 23.2% | 57.3% |
| 53 | winter_seasonal_beer | specialty | 2,107 | 0.70% | 2,107 | +0 | 421 | 32.1% | 50.4% |
| 54 | special_bitter_or_best_bitter | bitter | 2,194 | 0.73% | 2,194 | +0 | 439 | 35.3% | 64.0% |
| 55 | scotch_ale_or_wee_heavy | bitter | 2,241 | 0.74% | 2,241 | +0 | 448 | 64.5% | 76.8% |
| 56 | common_beer | cream | 2,294 | 0.76% | 2,294 | +0 | 459 | 47.5% | 62.1% |
| 57 | american_barley_wine_ale | barleywine | 2,483 | 0.82% | 2,483 | +0 | 497 | 50.9% | 75.7% |
| 58 | brown_ale | brown | 2,503 | 0.83% | 2,503 | +0 | 501 | 42.1% | 71.1% |
| 59 | belgian_dubbel | belgian | 2,510 | 0.83% | 2,510 | +0 | 502 | 65.1% | 79.1% |
| 60 | irish_dry_stout | stout | 2,593 | 0.86% | 2,593 | +0 | 519 | 59.0% | 76.7% |
| 61 | belgian_strong_dark_ale | belgian | 2,596 | 0.86% | 2,596 | +0 | 519 | 69.0% | 82.1% |
| 62 | mild | mild | 2,636 | 0.87% | 2,636 | +0 | 527 | 61.7% | 72.7% |
| 63 | belgian_tripel | belgian | 2,708 | 0.90% | 2,708 | +0 | 542 | 59.2% | 80.4% |
| 64 | german_maerzen | lager | 2,851 | 0.95% | 2,851 | +0 | 570 | 66.0% | 80.2% |
| 65 | fruit_beer | specialty | 2,867 | 0.95% | 2,867 | +0 | 573 | 8.9% | 42.6% |
| 66 | german_koelsch | cream | 3,066 | 1.02% | 3,066 | +0 | 613 | 71.1% | 82.7% |
| 67 | british_india_pale_ale | ipa | 3,170 | 1.05% | 3,170 | +0 | 634 | 20.2% | 50.0% |
| 68 | american_cream_ale | cream | 3,335 | 1.11% | 3,335 | +0 | 667 | 57.9% | 76.2% |
| 69 | herb_and_spice_beer | specialty | 3,448 | 1.14% | 3,448 | +0 | 690 | 32.9% | 50.3% |
| 70 | specialty_saison | saison | 3,940 | 1.31% | 3,940 | +0 | 788 | 10.3% | 45.4% |
| 71 | oatmeal_stout | stout | 3,983 | 1.32% | 3,983 | +0 | 797 | 69.1% | 87.0% |
| 72 | american_lager | lager | 4,037 | 1.34% | 4,037 | +0 | 807 | 27.3% | 48.9% |
| 73 | sweet_stout | stout | 4,082 | 1.35% | 5,305 | -1223 | 816 | 58.7% | 77.6% |
| 74 | german_pilsener | lager | 4,585 | 1.52% | 4,585 | +0 | 917 | 69.8% | 84.7% |
| 75 | belgian_blonde_ale | belgian | 4,601 | 1.53% | 4,601 | +0 | 920 | 43.7% | 63.4% |
| 76 | irish_red_ale | mild | 4,632 | 1.54% | 4,632 | +0 | 926 | 52.4% | 71.2% |
| 77 | belgian_witbier | belgian | 4,716 | 1.57% | 4,919 | -203 | 943 | 74.2% | 87.4% |
| 78 | stout | stout | 5,229 | 1.74% | 5,229 | +0 | 1,046 | 41.2% | 81.9% |
| 79 | blonde_ale | cream | 5,834 | 1.94% | 5,834 | +0 | 1,167 | 46.5% | 73.4% |
| 80 | extra_special_bitter | bitter | 6,002 | 1.99% | 6,002 | +0 | 1,200 | 46.7% | 68.4% |
| 81 | south_german_hefeweizen | wheat | 6,448 | 2.14% | 6,448 | +0 | 1,290 | 77.6% | 92.1% |
| 82 | robust_porter | porter | 6,610 | 2.19% | 6,610 | +0 | 1,322 | 58.4% | 84.9% |
| 83 | american_brown_ale | brown | 6,937 | 2.30% | 6,937 | +0 | 1,387 | 55.4% | 77.8% |
| 84 | american_wheat_ale | wheat | 7,001 | 2.32% | 7,001 | +0 | 1,400 | 62.3% | 85.7% |
| 85 | american_imperial_stout | stout | 7,139 | 2.37% | 7,139 | +0 | 1,428 | 86.2% | 93.8% |
| 86 | american_amber_red_ale | pale_ale | 9,093 | 3.02% | 9,401 | -308 | 1,819 | 42.7% | 74.2% |
| 87 | french_belgian_saison | saison | 10,667 | 3.54% | 10,667 | +0 | 2,133 | 84.9% | 91.2% |
| 88 | double_ipa | ipa | 12,664 | 4.20% | 12,664 | +0 | 2,533 | 62.6% | 92.4% |
| 89 | specialty_beer | specialty | 21,961 | 7.29% | 21,961 | +0 | 4,392 | 17.0% | 74.4% |
| 90 | american_pale_ale | pale_ale | 34,560 | 11.47% | 34,560 | +0 | 6,912 | 62.9% | 90.8% |
| 91 | american_india_pale_ale | ipa | 44,210 | 14.67% | 44,410 | -200 | 8,842 | 78.1% | 96.1% |

## 2. Threshold breakdown

| Bucket | Slug count | Slug listesi (kısaltılmış) |
|---|---|---|
| **500+** | 65 | pale_lager, german_rye_ale, german_bock, flanders_red_ale, french_biere_de_garde, munich_dunkel, porter, south_german_weizenbock ... +57 |
| **100-499** | 18 | gose, english_pale_ale, juicy_or_hazy_india_pale_ale, belgian_ipa, rye_ipa, golden_or_blonde_ale, white_ipa, mixed_fermentation_sour_beer ... +10 |
| **30-99** | 5 | cream_ale, dunkles_bock, brett_beer, german_oktoberfest_festbier, kellerbier |
| **10-29** | 3 | belgian_quadrupel, american_barleywine, sweet_stout_or_cream_stout |

### Bucket 30-99 detayı (kritik zayıf)

| Slug | n V18 |
|---|---|
| cream_ale | 62 |
| dunkles_bock | 69 |
| brett_beer | 76 |
| german_oktoberfest_festbier | 80 |
| kellerbier | 89 |

### Bucket 10-29 detayı (kritik zayıf)

| Slug | n V18 |
|---|---|
| belgian_quadrupel | 15 |
| american_barleywine | 16 |
| sweet_stout_or_cream_stout | 19 |

## 3. Cluster bazında özet (16 cluster)

| Cluster (14cat) | Slug count | Reçete count | %toplam |
|---|---|---|---|
| ipa | 8 | 61,289 | 20.35% |
| pale_ale | 4 | 44,208 | 14.68% |
| specialty | 6 | 31,688 | 10.52% |
| stout | 7 | 24,268 | 8.06% |
| belgian | 8 | 19,086 | 6.34% |
| lager | 13 | 18,227 | 6.05% |
| wheat | 5 | 16,568 | 5.50% |
| cream | 7 | 16,309 | 5.41% |
| bitter | 6 | 15,738 | 5.22% |
| saison | 3 | 15,370 | 5.10% |
| porter | 4 | 10,959 | 3.64% |
| brown | 2 | 9,440 | 3.13% |
| mild | 2 | 7,268 | 2.41% |
| sour | 9 | 4,041 | 1.34% |
| barleywine | 3 | 3,764 | 1.25% |
| bock | 4 | 2,983 | 0.99% |

## 4. Source baskınlık (V18 dataset)

| Source | Reçete count | %toplam |
|---|---|---|
| rmwoods | 292,337 | 97.02% |
| recipator | 3,935 | 1.31% |
| braureka | 1,939 | 0.64% |
| mmum | 1,120 | 0.37% |
| aha | 1,104 | 0.37% |
| byo | 427 | 0.14% |
| twortwat | 210 | 0.07% |
| tmf | 164 | 0.05% |
| roerstok | 76 | 0.03% |
| amervallei | 4 | 0.00% |

**NOT:** rmwoods source field tek monolitik etiket. Orjinal HDF5'te `origin` field 4 alt-kaynak (brewtoad ~330K, brewersfriend ~72K, homebrewersassociation, smokemonster) ama V17/V18 schema'sında ayrılmadı.

## 5. V18 yeni 9 slug detay

| Slug | n V18 | Cluster | Test n | Test t1 | Test t3 | Sources |
|---|---|---|---|---|---|---|
| **flanders_red_ale** | 694 | sour | 139 | 57.6% | 74.8% | rmwoods=687, tmf=5, braureka=1 |
| **belgian_gueuze** | 301 | sour | 60 | 23.3% | 40.0% | rmwoods=299, byo=2 |
| **belgian_fruit_lambic** | 427 | sour | 85 | 18.8% | 38.8% | rmwoods=425, braureka=1, twortwat=1 |
| **gose** | 102 | sour | 20 | 40.0% | 45.0% | rmwoods=97, tmf=2, braureka=1 |
| **export_stout** | 1,223 | stout | 245 | 14.3% | 39.2% | rmwoods=1219, braureka=2, tmf=1 |
| **red_ipa** | 308 | ipa | 62 | 4.8% | 29.0% | rmwoods=306, braureka=2 |
| **white_ipa** | 203 | ipa | 41 | 14.6% | 29.3% | rmwoods=201, braureka=1, twortwat=1 |
| **rye_ipa** | 200 | ipa | 40 | 5.0% | 37.5% | rmwoods=197, twortwat=2, tmf=1 |
| **belgian_ipa** | 146 | belgian | 29 | 3.4% | 17.2% | rmwoods=141, recipator=3, byo=2 |
