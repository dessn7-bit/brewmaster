# Adım 55 — KARŞILAŞTIRMA (V18.1 vs V18.2 yeni 9 slug + V6)

**V18.1 → V18.2 holdout per-slug t1 değişimi (yeni 9 slug Adım 53'te eklenmişti)**


| Slug | n V18 | V18.1 t1 | V18.2 t1 | Δ t1 | V18.1 t3 | V18.2 t3 | Δ t3 | n V6 V18.2 |
|---|---|---|---|---|---|---|---|---|
| **flanders_red_ale** | 694 | 57.6% | 63.3% | 🟢 ++5.8pp | 74.8% | 71.9% | 🔴 -2.9pp | 500 |
| **belgian_gueuze** | 301 | 23.3% | 8.3% | 🔴 -15.0pp | 40.0% | 35.0% | 🔴 -5.0pp | 301 |
| **belgian_fruit_lambic** | 427 | 18.8% | 34.1% | 🟢 ++15.3pp | 38.8% | 50.6% | 🟢 ++11.8pp | 427 |
| **gose** | 102 | 40.0% | 25.0% | 🔴 -15.0pp | 45.0% | 60.0% | 🟢 ++15.0pp | 102 |
| **export_stout** | 1223 | 14.3% | 13.5% | 🔴 -0.8pp | 39.2% | 43.7% | 🟢 ++4.5pp | 80 |
| **red_ipa** | 308 | 4.8% | 6.5% | 🟢 ++1.6pp | 29.0% | 40.3% | 🟢 ++11.3pp | 80 |
| **white_ipa** | 203 | 14.6% | 22.0% | 🟢 ++7.3pp | 29.3% | 29.3% | ⚪ +0.0pp | 80 |
| **rye_ipa** | 200 | 5.0% | 15.0% | 🟢 ++10.0pp | 37.5% | 57.5% | 🟢 ++20.0pp | 80 |
| **belgian_ipa** | 146 | 3.4% | 10.3% | 🟢 ++6.9pp | 17.2% | 24.1% | 🟢 ++6.9pp | 146 |

## Genel slug bazında değişim özeti

| Kategori | Count |
|---|---|
| 🟢 Improvement (>0.5pp) | 45 |
| ⚪ Eşdeğer | 18 |
| 🔴 Regresyon (>0.5pp) | 25 |
| Ortak slug count | 88 |

## Top 10 improvement

| Slug | V18.1 t1 | V18.2 t1 | Δ |
|---|---|---|---|
| juicy_or_hazy_india_pale_ale | 23.1% | 50.0% | +26.9pp |
| belgian_fruit_lambic | 18.8% | 34.1% | +15.3pp |
| oud_bruin | 24.1% | 36.8% | +12.6pp |
| golden_or_blonde_ale | 5.0% | 15.0% | +10.0pp |
| rye_ipa | 5.0% | 15.0% | +10.0pp |
| white_ipa | 14.6% | 22.0% | +7.3pp |
| belgian_ipa | 3.4% | 10.3% | +6.9pp |
| german_oktoberfest_festbier | 0.0% | 6.2% | +6.2pp |
| flanders_red_ale | 57.6% | 63.3% | +5.8pp |
| kellerbier | 5.6% | 11.1% | +5.6pp |

## Top 10 regression

| Slug | V18.1 t1 | V18.2 t1 | Δ |
|---|---|---|---|
| dunkles_bock | 21.4% | 0.0% | -21.4pp |
| belgian_gueuze | 23.3% | 8.3% | -15.0pp |
| gose | 40.0% | 25.0% | -15.0pp |
| mixed_fermentation_sour_beer | 27.9% | 16.3% | -11.6pp |
| black_ipa | 30.0% | 21.2% | -8.8pp |
| brett_beer | 6.7% | 0.0% | -6.7pp |
| german_rye_ale | 75.0% | 68.3% | -6.7pp |
| english_pale_ale | 10.0% | 5.0% | -5.0pp |
| bamberg_maerzen_rauchbier | 61.2% | 56.7% | -4.5pp |
| belgian_strong_dark_ale | 69.0% | 65.5% | -3.5pp |