# Adım 55 Pre-flight C — V6 KNN Her Slug Reçete Sayısı

**Tarih:** 2026-04-29  
**V6 dataset:** `_v18_v6_subset.json` 9,735 reçete, sour 2,965 (30.5%)
**Strateji:** B+ tier-based + sour 3× boost (Onay 4 4A)

---

## 1. Tam V6 slug tablosu (91 satır, en azdan en çoka)

| # | Slug | Cluster | n V6 | %V6 | n V18 | V6/V18 ratio |
|---|---|---|---|---|---|---|
| 1 | belgian_quadrupel | belgian | 15 | 0.15% | 15 | 1.000 |
| 2 | american_barleywine | barleywine | 16 | 0.16% | 16 | 1.000 |
| 3 | sweet_stout_or_cream_stout | stout | 19 | 0.20% | 19 | 1.000 |
| 4 | cream_ale | cream | 62 | 0.64% | 62 | 1.000 |
| 5 | dunkles_bock | bock | 69 | 0.71% | 69 | 1.000 |
| 6 | brett_beer | sour | 76 | 0.78% | 76 | 1.000 |
| 7 | german_oktoberfest_festbier | lager | 80 | 0.82% | 80 | 1.000 |
| 8 | south_german_weizenbock | wheat | 80 | 0.82% | 868 | 0.092 |
| 9 | munich_helles | lager | 80 | 0.82% | 1,163 | 0.069 |
| 10 | belgian_dubbel | belgian | 80 | 0.82% | 2,510 | 0.032 |
| 11 | belgian_blonde_ale | belgian | 80 | 0.82% | 4,601 | 0.017 |
| 12 | sweet_stout | stout | 80 | 0.82% | 4,082 | 0.020 |
| 13 | porter | porter | 80 | 0.82% | 827 | 0.097 |
| 14 | south_german_dunkel_weizen | wheat | 80 | 0.82% | 1,651 | 0.048 |
| 15 | german_altbier | cream | 80 | 0.82% | 1,518 | 0.053 |
| 16 | common_beer | cream | 80 | 0.82% | 2,294 | 0.035 |
| 17 | pale_lager | lager | 80 | 0.82% | 539 | 0.148 |
| 18 | bamberg_maerzen_rauchbier | lager | 80 | 0.82% | 334 | 0.240 |
| 19 | belgian_tripel | belgian | 80 | 0.82% | 2,708 | 0.030 |
| 20 | rye_ipa | ipa | 80 | 0.82% | 200 | 0.400 |
| 21 | oatmeal_stout | stout | 80 | 0.82% | 3,983 | 0.020 |
| 22 | specialty_saison | saison | 80 | 0.82% | 3,940 | 0.020 |
| 23 | belgian_strong_dark_ale | belgian | 80 | 0.82% | 2,596 | 0.031 |
| 24 | belgian_witbier | belgian | 80 | 0.82% | 4,716 | 0.017 |
| 25 | brown_ale | brown | 80 | 0.82% | 2,503 | 0.032 |
| 26 | british_barley_wine_ale | barleywine | 80 | 0.82% | 1,265 | 0.063 |
| 27 | mild | mild | 80 | 0.82% | 2,636 | 0.030 |
| 28 | export_stout | stout | 80 | 0.82% | 1,223 | 0.065 |
| 29 | old_ale | bitter | 80 | 0.82% | 1,780 | 0.045 |
| 30 | special_bitter_or_best_bitter | bitter | 80 | 0.82% | 2,194 | 0.036 |
| 31 | irish_dry_stout | stout | 80 | 0.82% | 2,593 | 0.031 |
| 32 | brown_porter | porter | 80 | 0.82% | 2,048 | 0.039 |
| 33 | german_pilsener | lager | 80 | 0.82% | 4,585 | 0.017 |
| 34 | german_doppelbock | bock | 80 | 0.82% | 1,231 | 0.065 |
| 35 | german_koelsch | cream | 80 | 0.82% | 3,066 | 0.026 |
| 36 | german_rye_ale | wheat | 80 | 0.82% | 600 | 0.133 |
| 37 | scotch_ale_or_wee_heavy | bitter | 80 | 0.82% | 2,241 | 0.036 |
| 38 | baltic_porter | porter | 80 | 0.82% | 1,474 | 0.054 |
| 39 | french_biere_de_garde | saison | 80 | 0.82% | 763 | 0.105 |
| 40 | american_strong_pale_ale | pale_ale | 80 | 0.82% | 453 | 0.177 |
| 41 | german_maerzen | lager | 80 | 0.82% | 2,851 | 0.028 |
| 42 | german_heller_bock_maibock | bock | 80 | 0.82% | 1,078 | 0.074 |
| 43 | herb_and_spice_beer | specialty | 80 | 0.82% | 3,448 | 0.023 |
| 44 | black_ipa | ipa | 80 | 0.82% | 402 | 0.199 |
| 45 | german_schwarzbier | lager | 80 | 0.82% | 999 | 0.080 |
| 46 | vienna_lager | lager | 80 | 0.82% | 1,433 | 0.056 |
| 47 | smoked_beer | specialty | 80 | 0.82% | 982 | 0.081 |
| 48 | american_lager | lager | 80 | 0.82% | 4,037 | 0.020 |
| 49 | scottish_export | bitter | 80 | 0.82% | 1,932 | 0.041 |
| 50 | fruit_beer | specialty | 80 | 0.82% | 2,867 | 0.028 |
| 51 | british_india_pale_ale | ipa | 80 | 0.82% | 3,170 | 0.025 |
| 52 | pre_prohibition_lager | lager | 80 | 0.82% | 987 | 0.081 |
| 53 | munich_dunkel | lager | 80 | 0.82% | 801 | 0.100 |
| 54 | irish_red_ale | mild | 80 | 0.82% | 4,632 | 0.017 |
| 55 | dortmunder_european_export | lager | 80 | 0.82% | 329 | 0.243 |
| 56 | ordinary_bitter | bitter | 80 | 0.82% | 1,589 | 0.050 |
| 57 | winter_seasonal_beer | specialty | 80 | 0.82% | 2,107 | 0.038 |
| 58 | belgian_strong_golden | belgian | 80 | 0.82% | 1,794 | 0.045 |
| 59 | white_ipa | ipa | 80 | 0.82% | 203 | 0.394 |
| 60 | red_ipa | ipa | 80 | 0.82% | 308 | 0.260 |
| 61 | experimental_beer | specialty | 80 | 0.82% | 323 | 0.248 |
| 62 | german_bock | bock | 80 | 0.82% | 605 | 0.132 |
| 63 | golden_or_blonde_ale | cream | 80 | 0.82% | 200 | 0.400 |
| 64 | american_barley_wine_ale | barleywine | 80 | 0.82% | 2,483 | 0.032 |
| 65 | american_cream_ale | cream | 80 | 0.82% | 3,335 | 0.024 |
| 66 | kellerbier | lager | 89 | 0.91% | 89 | 1.000 |
| 67 | south_german_hefeweizen | wheat | 100 | 1.03% | 6,448 | 0.016 |
| 68 | american_pale_ale | pale_ale | 100 | 1.03% | 34,560 | 0.003 |
| 69 | american_india_pale_ale | ipa | 100 | 1.03% | 44,210 | 0.002 |
| 70 | american_wheat_ale | wheat | 100 | 1.03% | 7,001 | 0.014 |
| 71 | double_ipa | ipa | 100 | 1.03% | 12,664 | 0.008 |
| 72 | american_amber_red_ale | pale_ale | 100 | 1.03% | 9,093 | 0.011 |
| 73 | american_imperial_stout | stout | 100 | 1.03% | 7,139 | 0.014 |
| 74 | french_belgian_saison | saison | 100 | 1.03% | 10,667 | 0.009 |
| 75 | blonde_ale | cream | 100 | 1.03% | 5,834 | 0.017 |
| 76 | stout | stout | 100 | 1.03% | 5,229 | 0.019 |
| 77 | robust_porter | porter | 100 | 1.03% | 6,610 | 0.015 |
| 78 | extra_special_bitter | bitter | 100 | 1.03% | 6,002 | 0.017 |
| 79 | specialty_beer | specialty | 100 | 1.03% | 21,961 | 0.005 |
| 80 | american_brown_ale | brown | 100 | 1.03% | 6,937 | 0.014 |
| 81 | gose | sour | 102 | 1.05% | 102 | 1.000 |
| 82 | english_pale_ale | pale_ale | 102 | 1.05% | 102 | 1.000 |
| 83 | juicy_or_hazy_india_pale_ale | ipa | 132 | 1.36% | 132 | 1.000 |
| 84 | belgian_ipa | belgian | 146 | 1.50% | 146 | 1.000 |
| 85 | mixed_fermentation_sour_beer | sour | 213 | 2.19% | 213 | 1.000 |
| 86 | belgian_gueuze | sour | 301 | 3.09% | 301 | 1.000 |
| 87 | belgian_lambic | sour | 409 | 4.20% | 409 | 1.000 |
| 88 | belgian_fruit_lambic | sour | 427 | 4.39% | 427 | 1.000 |
| 89 | oud_bruin | sour | 437 | 4.49% | 437 | 1.000 |
| 90 | flanders_red_ale | sour | 500 | 5.14% | 694 | 0.720 |
| 91 | berliner_weisse | sour | 500 | 5.14% | 1,382 | 0.362 |

## 2. Tier breakdown (B+ stratejisi actual)

| Tier | V18 n aralığı | Slug count | V6 reçete | Sour reçete |
|---|---|---|---|---|
| Tier 1 | ≥5,000 | 14 | 1,400 | 0 |
| Tier 2 | 1,000-4,999 | 40 | 3,620 | 500 |
| Tier 3 | 200-999 | 25 | 3,807 | 2,287 |
| Tier 4 | 10-199 | 12 | 908 | 178 |

**Toplam:** 9,735 reçete, sour **30.5%**

## 3. V6'da yetersiz slug'lar (V6 < 30)

**Count:** 3 slug

| Slug | n V6 | n V18 | Yorum |
|---|---|---|---|
| belgian_quadrupel | 15 | 15 | V18'de de zayıf, V6 KNN için kullanılamaz |
| american_barleywine | 16 | 16 | V18'de de zayıf, V6 KNN için kullanılamaz |
| sweet_stout_or_cream_stout | 19 | 19 | V18'de de zayıf, V6 KNN için kullanılamaz |

**NOT:** V6 holdout test set yok (KNN inline JS, browser-side). Per-slug accuracy V18 XGBoost'tan derive edilemez. V6 retrain Adım 55 sonrası UI smoke test ile doğrulanır.