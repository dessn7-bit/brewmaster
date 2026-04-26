# AUDIT STEP 34 — V7 XGBOOST TRAIN

**Tarih:** 2026-04-26
**Mod:** Otonom
**Önceki:** Adım 33 (commit fb44abb) — `_ml_dataset_v7_clean.json` 613 reçete × 69 feature × 101 stil
**Sonuç:** XGBoost model trained. **Test top-1 36.4%, top-3 51.7%, top-5 59.3%.** Belgian cluster zayıf (n=1 her test stilinde). ONNX export FAİL (library bug), JSON model 8.6 MB ile JS tree-eval inference template hazır.

---

## İş A — Python venv + paket kurulumu

- Python 3.12.10 winget ile kuruldu (user-scope, no UAC)
- venv: `venv_v7/`
- Paketler (`_v7_requirements.txt`):
  ```
  xgboost==2.1.4
  scikit-learn==1.5.2
  numpy==2.1.3
  pandas==2.2.3
  onnx==1.17.0
  onnxruntime==1.20.1
  onnxmltools==1.13.0
  skl2onnx==1.17.0
  ```
- Toplam install ~3 dakika.

## İş B — Veri yükleme + preprocess

- `_ml_dataset_v7_clean.json` yüklendi
- 613 reçete × 69 feature
- `in_split` field'ından train/test ayrımı
- LabelEncoder **train ONLY** üzerinde fit edildi (XGBoost contiguous class indices şartı)
- 5 test sample'ı drop edildi (class train'de yok — single-sample stiller)
- **Final boyut:** Train 467 × 69, Test 141 × 69 (5 dropped), 73 unique class
- `_v7_label_encoder.json` yazıldı (classes + feature_list)

## İş C — XGBoost training

### CV sweep (BAŞARISIZ)

5-fold CV her fold'da class gap problemi (n<2 stiller bazı fold'larda hiç yok). Tüm config'ler CV acc 0.0 (XGBoost 'Invalid classes inferred' hatası attı).

```
{'max_depth':4, 'learning_rate':0.1, 'n_estimators':200} → CV 0.0 (fold errors)
{'max_depth':6, 'learning_rate':0.1, 'n_estimators':200} → CV 0.0
{'max_depth':6, 'learning_rate':0.05, 'n_estimators':400} → CV 0.0
{'max_depth':8, 'learning_rate':0.05, 'n_estimators':400} → CV 0.0
```

**Workaround:** En küçük config (max_depth=4, lr=0.1, n_est=200) "best" olarak seçildi (CV failed → ilki kazandı). Final train tüm train data üstünde başarılı.

**Sebep:** 73 stil × 467 sample = ortalama 6.4/stil. Bazı stiller 1-2 sample. 5-fold split bunları ayıramıyor → class gap. Çözüm: stiller n>=5 için merge gerekir (Adım 35'te ele alınabilir).

### Final model

- max_depth=4, learning_rate=0.1, n_estimators=200
- subsample=0.8, colsample_bytree=0.8, tree_method='hist'
- objective='multi:softprob', num_class=73
- 200 ağaç, ~3 saniye train

## İş D — Evaluation

| Metrik | Train | Test |
|---|---:|---:|
| top-1 | **0.987** ⚠️ overfit | **0.364** |
| top-3 | 0.998 | **0.517** |
| top-5 | — | **0.593** |

**Train top-1 %98.7 vs test %36.4** → SEVERE OVERFIT. Model ezbere kaymış. Sebep: 467 train sample, 73 class, max_depth=4 + 200 trees yetersiz regularization.

### Per-class accuracy (test, n>=2)

| Stil | n | Correct | Acc |
|---|---:|---:|---:|
| american_imperial_stout | 14 | 12 | **0.86** ✅ |
| american_india_pale_ale | 11 | 8 | 0.73 |
| double_ipa | 6 | 3 | 0.50 |
| pale_ale | 5 | 2 | 0.40 |
| porter | 3 | 2 | 0.67 |
| pale_lager | 3 | 2 | 0.67 |
| american_barleywine | 3 | 1 | 0.33 |
| french_belgian_saison | 3 | 1 | 0.33 |
| specialty_saison | 3 | 0 | 0.00 |
| south_german_hefeweizen | 2 | 0 | 0.00 |
| juicy_or_hazy_india_pale_ale | 2 | 1 | 0.50 |
| session_india_pale_ale | 2 | 1 | 0.50 |

**Pattern:** En kalabalık 4 stil (American Imperial Stout, American IPA, Double IPA, Pale Ale = 36 test sample) ortalama %62 doğru. Geri kalan 22 stil her biri 1-3 sample → istatistiksel olarak gürültü.

### Belgian cluster özel test

| Stil | Test n | Top-1 | Top-3 |
|---|---:|---:|---:|
| belgian_dubbel | 1 | 0/1 | 0/1 |
| belgian_tripel | 1 | 0/1 | 0/1 |
| belgian_quadrupel | 1 | 0/1 | **1/1** ✅ |
| belgian_strong_dark_ale | 1 | 0/1 | 0/1 |
| belgian_blonde_ale | 1 | 0/1 | 0/1 |

**Tüm Belgian sınıflarında n=1 (Adım 33 audit zaten flag'lemişti).** Tek başarı: belgian_quadrupel top-3'e girdi. **V7 motoru Belgian cluster'da Brewmaster Dubbel kullanıcısının test reçetesini çözmek için yetersiz.**

## İş E — Feature importance

### Top 25

| Feature | Importance |
|---|---:|
| **yeast_wheat_german** | **0.126** ⭐ (en önemli — wheat detector) |
| pct_smoked | 0.052 |
| katki_smoke | 0.039 |
| hop_czech_saaz | 0.036 |
| fermentation_temp_c | 0.029 |
| pct_roast | 0.028 |
| srm | 0.028 |
| yeast_saison | 0.026 |
| pct_oats | 0.025 |
| og | 0.024 |
| pct_rye | 0.024 |
| ibu | 0.023 |
| yeast_american | 0.023 |
| yeast_english | 0.023 |
| yeast_lacto | 0.023 |
| pct_corn | 0.022 |
| pct_pilsner | 0.022 |
| pct_choc | 0.021 |
| katki_honey | 0.021 |
| pct_wheat | 0.021 |

### Group importance

| Grup | Feature # | Total Importance | % |
|---|---:|---:|---:|
| **pct (malt)** | 18 | **0.335** | **33.5%** ⭐ |
| **yeast** | 19 | **0.289** | **28.9%** ⭐ |
| katki | 10 | 0.116 | 11.6% |
| scalar (og/fg/abv/ibu/srm) | 5 | 0.109 | 10.9% |
| hop | 7 | 0.091 | 9.1% |
| derived | 4 | 0.031 | 3.1% |
| process | 7 | 0.029 | 2.9% |

**Yorum:**
- **Malt komposizyonu + yeast = %62.4** model gücü. Bunlar core diferansiyatörler — Adım 26B'nin mutually exclusive pct tasarımı + V6'dan port edilen yeast feature'lar fayda sağlıyor.
- **Scalar (gravity/IBU/SRM) sadece %10.9** — saf metric'in az değerli olduğu doğrulandı (V6 audit'inden bu yana hipotez).
- **Process feature'lar %2.9** — V6_DEFAULTS fallback'leri çoğu reçetede aynı, model bu feature'lara bağımlı değil. (Iyi haber: V6_DEFAULTS placeholder'ları kayıp veri için sorun yaratmamış.)

## İş F — ONNX export

### BAŞARISIZ

İki farklı hata denendi:
1. **target_opset=18:** "target_opset 18 is higher than the number of the installed onnx package or the converter support (15)"
2. **target_opset=12 / 15:** "Field onnx.AttributeProto.ints: Expected an int, got a boolean"

**Kök neden:** `onnxmltools 1.13.0 + xgboost 2.1.4` versiyon uyumsuzluğu. Bilinen ONNX converter bug — XGBoost 2.x JSON format'taki bool alanlarını int beklemiş.

**Workaround:** ONNX export atlandı. Yerine **JSON model + manuel JS tree evaluator** template'ı (`_v7_inference_template.js`) yazıldı.

### Model boyutları

| Format | Boyut | Browser uyumu |
|---|---:|---|
| `_v7_model.json` (XGBoost native) | 8.6 MB | ✅ Manuel tree-eval |
| `_v7_model.onnx` | — | ❌ Export başarısız |
| `_v7_label_encoder.json` | <1 KB | ✅ |

8.6 MB browser için marjinal — first-load yavaş, sonra cache'lenebilir. Optimize: tree pruning veya quantization (Adım 35).

## İş G — Inference template

`_v7_inference_template.js` (Adım 36'da HTML'e inline edilecek):

- `loadV7Model()` — async fetch + JSON parse
- `predictStyleV7(featureVector)` — 69-dim vector → top-3 [{slug, conf}]
- XGBoost JSON tree walking (multi-class softprob)
- Softmax normalization
- Browser API: `window.loadV7Model`, `window.predictStyleV7`

**Ek iş Adım 36'da:** Recipe → 69-feature vector builder (V6 builder'a paralel, ama yeni feature schema ile).

---

## V7 vs V6 karşılaştırma

| Metrik | V6 (LOOCV holdout 260) | V7 (test 141) |
|---|---:|---:|
| Top-1 | 0.738 | 0.364 |
| Top-3 | 0.808 | 0.517 |
| Top-5 | 0.815 | 0.593 |

**V7 V6'dan KÖTÜ.** Sebepler:
1. **V7 dataset KÜÇÜK** — V6 holdout 260 sample, V7 test 141 + train 467
2. **V7 sınıf yüzeyi DAĞINIK** — 73 unique class avg 6.4/class. V6 1100 reçete daha az class'a yığılmış
3. **V7 train SEVERE OVERFIT** (98.7% train vs 36.4% test). 200 trees max_depth=4 — ya regularize ya tree sayısını azalt
4. V6 KNN+veto rules zaten "small data"ya optimize, V7 XGBoost değil

## Sıradaki adımlar (öncelik sırası)

### Acil — V7 modeli production'a koymak için yetersiz

1. **Adım 35a: Class merge** — n<5 stiller `bjcp_main_category`'ye birleştir (Adım 26D hierarchy). 73 class → ~14 class. Sample/class artar (467/14 = 33), istatistiksel anlam güçlenir. Beklenen: top-1 %50+, top-3 %75+.

2. **Adım 35b: Regularization** — max_depth=3, n_estimators=100, reg_lambda=1, reg_alpha=0.5. Overfit'i azalt. CV sweep (post-merge stratify çalışacak).

3. **Adım 35c: Belgian-specific upsampling** — Belgian Trappist sınıflarında n<5 → SMOTE veya manual data collection (Belgian Dubbel/Tripel/Quad odaklı).

### Orta — V7 production-ready olmak için

4. **Adım 35d: ONNX alternatif** — `pmml4s` veya direkt XGBoost binary format → JS port (`xgboost-predictor-js` npm). 8.6 MB → ~3 MB compress edilebilir.

5. **Adım 36: HTML inject** — V7 motor V6'nın yanına inline (canary mode). V6 vs V7 paralel çalışsın, A/B test data toplansın.

### Uzun

6. **Adım 37+: Veri toplama** — Belgian cluster'a 50-100 manuel reçete eklemek, total dataset ~1000+'a çıkarmak. Brewer's Friend Premium trial (30 gün) bu pencerede kullanılabilir.

---

## Production readiness assessment

❌ **PRODUCTION'A HAZIR DEĞİL.** Sebepler:
- Test top-1 %36 V6'nın %74'ünden çok düşük
- Belgian Trappist cluster yetersiz coverage (n<5 her stil)
- Train/test gap %62 — overfit
- ONNX export bozuk — JSON inference 8.6 MB latency riski

✅ **DEMO/CANARY için hazır.** Adım 35'teki düzeltmelerden sonra A/B test kurulabilir.

**Tahmini iş yükü production-ready V7'ye:**
- Adım 35 (merge + regularize + ONNX alternatif): 1-2 sprint
- Adım 36 (HTML inject + canary): 1 sprint
- Adım 37+ (veri toplama, Belgian focus): 2-3 sprint
- **Toplam: 4-6 sprint** V7 deploy'a kadar

V7 sprint kararı (devam et veya pause): **devam etmek mantıklı** çünkü:
- Pipeline çalışıyor
- Feature importance açıkça gösteriyor: malt + yeast en güçlü sinyal (V7 yapısal hipotez doğru)
- Ana eksiklik **veri** — daha fazla reçete + Belgian cluster boost ile metrikler iyileşir
