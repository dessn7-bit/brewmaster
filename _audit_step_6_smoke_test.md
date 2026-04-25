# Adım 6 — V6 final smoke test (CHECKPOINT)

## Komutlar

```
node _smoke_test_v6.js
```

Script: production HTML'den `<script id="bm-engine-v6-final">` extract → vm sandbox'ta çalıştır → 5 test reçetesi üzerinde `classifyMulti` çağır.

Test reçeteleri:
1. Dark Belgian Dubbel v1 (test set'teki gerçek reçete, label `belgian_dubbel`)
2-5. `_ml_dataset_v6_final_comprehensive.json` reçeteleri seed=42 shuffle ile ilk 4 reçete

NOT: Test reçeteleri zaten training set'in içinde (1100 reçete) — bu **leakage**, doğruluk ölçümü değil, sadece motorun çalıştığını ve makul tahmin verdiğini test ediyor. Gerçek metrikler Adım 2'deki 5-fold CV %78.5.

## Ham çıktı

```
[BM_ENGINE_V6_FINAL] loaded: 1100 recipes, 79 features
[BM_ENGINE_V6_FINAL] 5-fold CV (seed 42): top-1 78.5%, top-3 86.5%, top-5 87.3%
[BM_ENGINE_V6_FINAL] holdout (840/260, seed 42): top-1 73.8%, top-3 80.8%, top-5 81.5%
[BM_ENGINE_V6_FINAL] method: multi-K weighted KNN + veto rules + feature weighting (NO Random Forest)

═══ V6 FINAL SMOKE TEST ═══

Loaded engine: V6_FINAL
Method: multi-K weighted KNN + veto + feature weighting
Recipes: 1100 Features: 79

--- Test 1: Dark Belgian Dubbel v1 ---
Beklenen: belgian_dubbel (belgian)
Özellikler: og=1.072 fg=1.015 abv=7.5 ibu=22 srm=17
Maya: yeast_abbey
Top-3 (28ms):
  1. belgian_dubbel (Belgian Dubbel) %100 ✓
Top-1 doğru mu: EVET ✓
Top-3 doğru mu: EVET ✓

--- Test 2: Hill Farmstead Anna ---
Beklenen: french_belgian_saison (belgian)
Özellikler: og=1.06 fg=1.004 abv=6.5 ibu=25 srm=4
Maya: yeast_belgian, yeast_saison, yeast_saison_3724
Top-3 (30ms):
  1. french_belgian_saison (French Belgian Saison) %100 ✓

--- Test 3: Dogfish Head Punkin Ale ---
Beklenen: pumpkin_spice_beer (specialty_adjunct)
Özellikler: og=1.065 fg=1.016 abv=7 ibu=28 srm=18
Maya: yeast_american
Top-3 (27ms):
  1. pumpkin_spice_beer (Pumpkin Spice Beer) %71 ✓
  2. american_amber_red_ale (American Amber Red Ale) %19
  3. winter_seasonal_beer (Winter Seasonal Beer) %11

--- Test 4: Left Hand Milk Stout ---
Beklenen: sweet_stout (english)
Özellikler: og=1.058 fg=1.02 abv=5 ibu=25 srm=45
Maya: yeast_english, yeast_american
Top-3 (26ms):
  1. sweet_stout (Sweet Stout) %100 ✓

--- Test 5: Tröegs Hopback Amber ---
Beklenen: american_amber_red_ale (american)
Özellikler: og=1.053 fg=1.012 abv=5.6 ibu=42 srm=14
Maya: yeast_american
Top-3 (28ms):
  1. american_amber_red_ale (American Amber Red Ale) %77 ✓
  2. common_beer (Common Beer) %23
```

## Sonuç tablosu

| # | Reçete | Beklenen | Top-1 tahmin | Doğru mu? | Süre |
|---|---|---|---|---|---|
| 1 | Dark Belgian Dubbel v1 | belgian_dubbel | belgian_dubbel %100 | ✓ | 28ms |
| 2 | Hill Farmstead Anna | french_belgian_saison | french_belgian_saison %100 | ✓ | 30ms |
| 3 | Dogfish Head Punkin Ale | pumpkin_spice_beer | pumpkin_spice_beer %71 | ✓ | 27ms |
| 4 | Left Hand Milk Stout | sweet_stout | sweet_stout %100 | ✓ | 26ms |
| 5 | Tröegs Hopback Amber | american_amber_red_ale | american_amber_red_ale %77 | ✓ | 28ms |

5/5 top-1 doğru, 5/5 top-3 doğru. Confidence range %71-100. Süre 26-30ms (KNN over 1100 records, makul).

## Önemli not — leakage

Test reçeteleri training set'in içinde (1100 reçete). Bu nedenle bu test:
- ✅ Motor inline'da doğru parse oluyor mu — geçti
- ✅ classifyMulti çalışıyor mu — geçti
- ✅ V5 API uyumlu output dönüyor mu — geçti
- ✅ Belgian Dubbel reçetesi belgian_dubbel diyor mu — geçti
- ❌ Out-of-sample doğruluk — bu test ölçmüyor (Adım 2'deki 5-fold CV %78.5 ölçüyor)

## Durum: ✅

## Tek satır yorum

V6 motor production HTML'de doğru parse oluyor, 1100 reçete + 79 feature ile 26-30ms tahmin süresi veriyor, 5/5 smoke test top-1 doğru (test reçeteleri training'de olduğu için doğruluk ölçümü değil; gerçek out-of-sample %78.5 5-fold CV); push'a geçmek için Kaan onayı gerekli.

---

=== KAAN ONAYI BEKLENİYOR ===

Smoke test sonuçları yukarıda. Push'a geçmek için Kaan onayı gerekli. DURUYORUM.
