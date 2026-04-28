# V16 vs V17 karşılaştırma

- **V16**: 9552 reçete
- **V17**: 301316 reçete  (×31.5)

## 14-Category model

| Metric | V16 | V17 | Δ |
|---|---|---|---|
| top-1 | 69.4% | 64.5% (🔴 -5.0pp) |  |
| top-3 | 90.3% | 88.9% (🔴 -1.3pp) |  |
| top-5 | 96.3% | 95.7% (⚪ -0.6pp) |  |

## Cluster (per-class top-1)

| Cluster | V16 n | V16 top-1 | V17 n | V17 top-1 | Δ |
|---|---|---|---|---|---|
| ipa | — | — | 12154 | 83.8% |
| pale_ale | — | — | 8903 | 62.4% |
| specialty | — | — | 6337 | 26.4% |
| stout | — | — | 4854 | 87.3% |
| belgian | — | — | 3856 | 67.0% |
| lager | — | — | 3646 | 67.6% |
| wheat | — | — | 3314 | 81.8% |
| cream | — | — | 3262 | 55.5% |
| bitter | — | — | 3147 | 54.0% |
| saison | — | — | 3074 | 63.9% |
| porter | — | — | 2192 | 50.2% |
| brown | — | — | 1888 | 50.7% |
| mild | — | — | 1453 | 50.2% |
| sour | — | — | 805 | 59.8% |
| barleywine | — | — | 753 | 52.6% |
| bock | — | — | 597 | 47.9% |
| German Wheat | 81 | 79.0% | — | — |
| Historical / Special | 5 | 0.0% | — | — |
| American Hoppy | 502 | 82.9% | — | — |
| Saison / Farmhouse | 45 | 64.4% | — | — |
| British Strong / Old | 57 | 40.4% | — | — |
| Specialty / Adjunct | 113 | 23.9% | — | — |
| German Lager | 335 | 85.1% | — | — |
| British Bitter / Mild | 77 | 49.4% | — | — |
| Hybrid Ale-Lager | 117 | 44.4% | — | — |
| Belgian Strong / Trappist | 61 | 65.6% | — | — |
| Sour / Wild / Brett | 41 | 65.9% | — | — |
| Belgian Pale / Witbier | 68 | 48.5% | — | — |
| Stout / Porter | 212 | 86.8% | — | — |
| Irish / Red Ale | 153 | 51.0% | — | — |

## Slug model

| Metric | V16 | V17 | Δ |
|---|---|---|---|
| top-1 | 53.9% | 55.2% (🟢 +1.3pp) |  |
| top-3 | 76.3% | 79.9% (🟢 +3.6pp) |  |
| top-5 | 83.9% | 88.3% (🟢 +4.4pp) |  |

## Spotlight slug (per-class top-1)

| Slug | V16 n / top-1 / top-3 | V17 n / top-1 / top-3 | Δ top-1 |
|---|---|---|---|
| german_oktoberfest_festbier | 7 / 0.0% / 28.6% | 16 / 18.8% / 50.0% |  (🟢 +18.8pp) |
| belgian_lambic | 5 / 0.0% / 80.0% | 364 / 50.3% / 68.1% |  (🟢 +50.3pp) |
| english_pale_ale | 19 / 15.8% / 31.6% | 20 / 15.0% / 35.0% |  (⚪ -0.8pp) |
| american_pale_ale | 127 / 64.6% / 90.6% | 6912 / 62.6% / 91.0% |  (🔴 -1.9pp) |
| american_strong_pale_ale | 44 / 43.2% / 97.7% | 91 / 27.5% / 63.7% |  (🔴 -15.7pp) |
| brett_beer | 8 / 62.5% / 75.0% | 15 / 6.7% / 33.3% |  (🔴 -55.8pp) |
| mixed_fermentation_sour_beer | 14 / 78.6% / 78.6% | 43 / 23.3% / 58.1% |  (🔴 -55.3pp) |
| french_belgian_saison | 33 / 69.7% / 84.8% | 2133 / 84.4% / 90.8% |  (🟢 +14.7pp) |
| belgian_dubbel | 25 / 68.0% / 84.0% | 502 / 66.5% / 80.9% |  (🔴 -1.5pp) |
| belgian_tripel | 33 / 66.7% / 81.8% | 542 / 62.5% / 84.5% |  (🔴 -4.1pp) |
| south_german_hefeweizen | 63 / 82.5% / 95.2% | 1290 / 75.6% / 89.8% |  (🔴 -7.0pp) |
| belgian_witbier | 28 / 82.1% / 82.1% | 983 / 71.0% / 85.4% |  (🔴 -11.1pp) |
| south_german_weizenbock | 7 / 42.9% / 85.7% | 174 / 57.5% / 78.2% |  (🟢 +14.6pp) |
| specialty_beer | 29 / 10.3% / 27.6% | 4392 / 17.5% / 76.0% |  (🟢 +7.1pp) |
| american_amber_red_ale | 78 / 29.5% / 76.9% | 1880 / 42.3% / 75.1% |  (🟢 +12.8pp) |
| berliner_weisse | 3 / 66.7% / 66.7% | 296 / 74.3% / 85.5% |  (🟢 +7.7pp) |
| oud_bruin | 2 / 0.0% / 0.0% | 87 / 21.8% / 41.4% |  (🟢 +21.8pp) |
| smoked_beer | 10 / 30.0% / 70.0% | 196 / 37.2% / 67.9% |  (🟢 +7.2pp) |
| fruit_beer | 14 / 14.3% / 14.3% | 573 / 10.5% / 37.9% |  (🔴 -3.8pp) |
| american_india_pale_ale | — | 8881 / 77.6% / 96.4% |  |
| german_pilsener | — | 917 / 71.9% / 85.7% |  |

## Sources

- V16: {'recipator': 4019, 'braureka': 2021, 'twortwat': 211, 'mmum': 1128, 'roerstok': 86, 'tmf': 166, 'amervallei': 4, 'byo': 781, 'aha': 1136}
- V17: {'recipator': 3935, 'braureka': 1939, 'twortwat': 210, 'mmum': 1120, 'roerstok': 76, 'tmf': 164, 'amervallei': 4, 'byo': 427, 'aha': 1104, 'rmwoods': 292337}