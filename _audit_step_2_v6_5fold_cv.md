# Adım 2 — V6 SCRIPT motoru 5-fold CV teyidi

## Komutlar

1. Dataset yapısı kontrolü:
```
node -e "const v5n = JSON.parse(fs.readFileSync('_ml_dataset_normalized.json'))..."
node -e "const v6 = JSON.parse(fs.readFileSync('_ml_dataset_v6_final_comprehensive.json'))..."
```

2. Feature uyumluluk diff:
```
V5 features: 61, V6 features: 79, common: 61, onlyV5: [], onlyV6: 18
```

3. V6 5-fold CV (seed 42, k=5):
```
node _v6_5fold_cv_audit.js
```

## Ham çıktı

### Dataset yapısı

```
V5 normalized dataset (_ml_dataset_normalized.json):
  records: 1016
  feature_keys: 61
  first record features keys count: 61

V6 dataset (_ml_dataset_v6_final_comprehensive.json):
  records: 1100
  first record features keys count: 79
  first record fields: id, source, name, label_slug, label_family, label_ferm, features, process_features, strain_features
```

### Feature set diff

```
V5 features: 61 V6 features: 79 common: 61
Only in V6 (18): [
  'mash_temp_c', 'fermentation_temp_c',
  'water_ca_ppm', 'water_so4_ppm', 'water_cl_ppm',
  'yeast_attenuation', 'boil_time_min', 'dry_hop_days',
  'mash_type_step', 'mash_type_decoction', 'lagering_days',
  'yeast_abbey', 'yeast_witbier', 'yeast_golden_strong',
  'yeast_saison_3724', 'yeast_saison_dupont',
  'yeast_english_bitter', 'yeast_english_mild'
]
Only in V5: []
```

V5 ⊂ V6 (V5 feature'ları V6'da tamamen mevcut). 18 ekstra feature V6'da yeni (su kimyası, fermantasyon, maya alt türleri, mash tipi, lagering).

### V6 motor 5-fold CV (predictV6Enhanced kopyası)

```
═══ V5 dataset (1016, alias-on, normalized) | V6 motor ═══
Dataset: 1016 records
V6 motor 5-fold CV (seed 42): top1=54.2%  top3=72.4%  top5=74.0%  N=1016 (1.7s)

═══ V6 dataset (1100, comprehensive, raw) | V6 motor ═══
Dataset: 1100 records
V6 motor 5-fold CV (seed 42): top1=78.5%  top3=86.5%  top5=87.3%  N=1100 (4.4s)
```

### Karşılaştırma tablosu

| Konfigürasyon | Dataset | N | top-1 | top-3 | top-5 |
|---|---|---|---|---|---|
| V5 motor (referans, alias-on) | _ml_dataset_normalized.json | 1016 | 61.8% | 79.7% | 86.5% |
| **V6 motor on V5 dataset** | _ml_dataset_normalized.json | 1016 | **54.2%** | **72.4%** | **74.0%** |
| **V6 motor on V6 dataset** | _ml_dataset_v6_final_comprehensive.json | 1100 | **78.5%** | **86.5%** | **87.3%** |

### Fark

- V6 motor on V5 dataset (apples-to-apples): **−7.6 / −7.3 / −12.5 puan** (V5'ten kötü)
- V6 motor on V6 dataset (V6 native): **+16.7 / +6.8 / +0.8 puan** (V5'ten iyi)

## Durum: ⚠️ BELİRSİZ — KAAN'A SOR

İki farklı sonuç var, hangisi "V6'nın gerçek performansı":

**A) V6 motor V5 ile aynı dataset üzerinde (1016 reçete, alias-on, normalize):**
   top1=54.2%, top3=72.4%, top5=74.0% → **V5'ten KÖTÜ**.
   - Sebep: V5 dataset normalize edilmiş (z-score), V6 motoru raw değerlerle çalışmak üzere tasarlanmış. Manhattan distance + ENHANCED_FEATURE_WEIGHTS z-score değerlerde anlamsız ölçüm üretiyor.
   - V6'nın 18 ekstra feature'ı V5 dataset'inde yok → veto rules tetiklenmiyor, ENHANCED_FEATURE_WEIGHTS boost'u (yeast_abbey 3.0 vb.) çalışmıyor.

**B) V6 motor V6 dataset üzerinde (1100 reçete, raw, +18 ekstra feature):**
   top1=78.5%, top3=86.5%, top5=87.3% → **V5'ten İYİ**.
   - V6'nın native ortamı.
   - Ama V5 ile fair değil: dataset boyutu farklı (1100 vs 1016), normalizasyon farklı (raw vs z-score), feature seti farklı (79 vs 61).

**Apples-to-apples bir karşılaştırma için seçenekler:**
   - V5 motorunu V6 dataset üzerinde 5-fold koştur (V5 motor sklearn-style normalize bekliyor — V6 raw dataset'i normalize etmek gerek)
   - VEYA V6 dataset'i alias-normalize V5 dataset boyutuna indir, ekstra feature'ları çıkar — V6'nın katma değerini kaybeder

## Tek satır yorum

V6 motorunun "%73.8 top-1" iddiası **V6 dataset üzerinde holdout** çıktısıydı; aynı motor V5 dataset üzerinde 5-fold CV ile **%54.2** veriyor — apples-to-apples karşılaştırma V5'in (%61.8) **altında**, V6 native dataset'inde (%78.5) **üstünde**. Opus'un kuralı uyarınca V5'ten kötü çıkma ihtimali var, **inline'a geçmeden Kaan kararı gerekli**.
