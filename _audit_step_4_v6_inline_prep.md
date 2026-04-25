# Adım 4 — V6 inline snippet hazırlığı

## Komutlar

```
node _build_v6_final_inline.js
ls -la _tmp_v6_inline_final.html
node -e "<embedded parse test>"
```

## Ham çıktı

### Build script çıktısı

```
Records prepared: 1100
Snippet written: _tmp_v6_inline_final.html
Size: 1651727 bytes ( 1613.0 KB)
Records inline: 1100
```

### Dosya boyutu

```
-rw-r--r-- 1 Kaan 197121 1651727 Apr 25 23:12 _tmp_v6_inline_final.html
```

### İçerik istatistiği

```
Total bytes: 1651309
label_slug occurrences: 1100
label_family occurrences: 1100
features key occurrences: 1100
```

### Smoke parse test (vm sandbox)

```
Engine loaded: true
VERSION: V6_FINAL
METHOD: multi-K weighted KNN + veto + feature weighting
RECS_COUNT: 1100
FEATURES_COUNT: 79
classifyMulti is fn: function
```

## İçerik özeti

`_tmp_v6_inline_final.html`:
- `<script id="bm-engine-v6-final">` tag içinde IIFE
- Header yorumu: V6 FINAL, 1100 reçete, 79 feature, 5-fold CV %78.5/%86.5/%87.3, holdout %73.8/%80.8/%81.5, "RF YOK"
- `TRAINING_RECS` array: 1100 reçete (name, label_slug, label_family, label_ferm, features object × 79 feature)
- `CONSERVATIVE_VETO_RULES`: extreme_abv_veto, yeast_style_contradiction (faz5 eval'den birebir kopya)
- `ENHANCED_FEATURE_WEIGHTS`: yeast_abbey 3.0, yeast_attenuation 3.5, abv 2.2, srm 2.0, vb. (faz5 eval'den birebir kopya)
- `predictV6Enhanced(testRecipe, trainingRecords, k)` — Manhattan weighted KNN + veto + inverse-distance voting
- `toV5Output(pred)` — V5 API uyumlu çıktı: `{ top1, top3, top5, _meta }` (her item: `{slug, score, confidence, displayTR}`)
- `classifyMulti(input, opts)` — public API, V5 ile uyumlu
- `window.BM_ENGINE_V6_FINAL = { classifyMulti, predict, RECS_COUNT, FEATURES_COUNT, VERSION, METHOD, PERFORMANCE_5FOLD, PERFORMANCE_HOLDOUT }`
- Console log: doğru sayılar, "NO Random Forest" notu

## Durum: ✅

## Tek satır yorum

1100 reçete + 79 feature + predictV6Enhanced inline edildi (1.61 MB), VM sandbox'ta sorunsuz parse oluyor, V5 API uyumlu wrapper hazır, "NO Random Forest" header yorumunda dürüst etiketlenmiş.
