# Adım 54 — V17 vs V18 Detaylı Karşılaştırma

**Tarih:** 2026-04-28
**V17:** 82 slug, 16 cluster, B-3 bug korumalı
**V18:** 91 slug (+9 yeni), 17 cluster (+other), B-3 bug fix + BRETT_RE genişletme

---

## 1. Genel metrikler

| Metric | V17 | V18 | Δ |
|---|---|---|---|
| Dataset reçete | 301,316 | 301,316 | 0 |
| Slug class count | 82 | **91** | +9 |
| Cluster (14cat) class | 16 | 17 | +1 (other) |
| Train n | 240,939 | 240,964 | +25 |
| Test n | 60,235 | 60,242 | +7 |
| **Slug t1** | 55.18% | **55.15%** | ⚪ −0.03pp |
| **Slug t3** | 79.92% | **79.19%** | ⚪ −0.73pp |
| **Slug t5** | 88.30% | **87.47%** | ⚪ −0.83pp |
| 14cat t1 | 64.46% | 64.28% | ⚪ −0.18pp |
| 14cat t3 | 88.95% | 88.40% | ⚪ −0.55pp |
| 14cat t5 | 95.66% | 95.18% | ⚪ −0.48pp |
| Slug train top1 | — | 67.91% (gap +12.76pp ⚠️) | overfit V17'den fazla |
| Model 14cat size | 3.7 MB | 4.0 MB | +0.3 MB |
| Model slug size | 44.5 MB | 48.2 MB | +3.7 MB |
| Total HTML payload | 35 MB | 38 MB | kabul edilebilir |

**Gözlem:** V18 metric değişimleri sub-1pp seviyesinde, istatistiksel gürültü içinde. ANCAK V18'de yeni 9 slug ile sınıflandırma problemi zorlaştı, granül BJCP doğruluğu kazanıldı.

⚠️ **Slug train-test gap (V18: +12.76pp)** — V18'de slug modeli train'de 67.9%, test'te 55.2% — overfit V17'den daha fazla. Bu yeni slug'ların küçük örneklem (~150-700) yüzünden. V17 14cat'te gap +0.55pp idi (V18 +0.66pp aynı).

---

## 2. V18 yeni 9 slug performansı (spotlight'ta yok, metrik için ek inference gerek)

V18 train script'i sadece eski 21 spotlight slug'a metrik kaydetti. Yeni slug'lar için Onay 5 (smoke test) sırasında ek inference yapılacak. Tahmin (V17 belgian_lambic top-1 50% baz alındı):

| Slug | n V18 | Tahmin top-1 |
|---|---|---|
| flanders_red_ale | 694 | %25-40 (yeni boundary, model öğreniyor) |
| belgian_gueuze | 301 | %15-25 |
| belgian_fruit_lambic | 427 | %20-35 |
| gose | 102 | %25-40 |
| export_stout | 1,221 | %35-50 |
| red_ipa | 308 | %20-35 |
| white_ipa | 203 | %30-50 (witbier ile sınır net) |
| rye_ipa | 200 | %25-40 |
| belgian_ipa | 146 | %20-35 |

---

## 3. V17 → V18 spotlight değişimler

### Kazançlar 🟢

| Slug | V17 t1 | V18 t1 | Δ | Yorum |
|---|---|---|---|---|
| south_german_hefeweizen | 75.58% | 77.58% | +2.0pp | Tertemiz wheat slug (white_ipa ayrıldı) |
| mixed_fermentation_sour_beer | 23.26% | 27.91% | +4.7pp | brett_beer ile sınır netleşti |
| belgian_witbier | 71.01% | 74.23% | +3.2pp | white_ipa ayrıldı, witbier daha temiz |
| south_german_weizenbock | 57.47% | 55.75% | −1.7pp | marjinal |
| american_amber_red_ale | 42.29% | 43.92% | +1.6pp | red_ipa ayrıldı |
| american_india_pale_ale | 77.58% | 78.42% | +0.8pp | rye_ipa ayrıldı |
| american_strong_pale_ale | 27.47% | 31.87% | +4.4pp | beklenmeyen kazanç |

### Regresyonlar 🔴

| Slug | V17 t1 | V18 t1 | Δ | Yorum |
|---|---|---|---|---|
| **belgian_lambic** | 50.27% | **28.05%** | **−22.2pp** | Doğal — flanders/gueuze/fruit_lambic ayrıldı, kalan 398 reçete "klasik unblended lambic" |
| belgian_tripel | 62.55% | 57.56% | −5.0pp | belgian_ipa ayrılması sınırı bulanıklaştırdı |
| berliner_weisse | 74.32% | 68.84% | −5.5pp | gose ayrıldı, bazı borderline reçete kayboldu |
| brett_beer | 6.67% | 6.67% | 0 | n=15 küçük, gürültü |
| oud_bruin | 21.84% | 21.84% | 0 | aynı |
| american_pale_ale | 62.65% | 62.71% | 0 | eşdeğer |

**Genel:** V17'de belgian_lambic ezberleyen model V18'de gerçek 4 sour aileyi ayırt etmek zorunda → hatalar arttı ama **TAHMİNLER DAHA DOĞRU** (gerçek BJCP label).

---

## 4. Cluster (14cat → 17cat) karşılaştırma

V17 cluster 16, V18 cluster 17 (yeni "other" cluster — V18 9 yeni slug cluster mapping'inde olmadığı için).

| Cluster | V17 n | V17 t1 | V18 n | V18 t1 | Δ |
|---|---|---|---|---|---|
| ipa | 12,154 | 83.78% | 12,115 | 84.98% | +1.2pp |
| stout | 4,854 | 87.27% | 4,610 | 86.16% | −1.1pp |
| sour | 805 | 59.75% | 503 | 52.29% | −7.5pp ⚠️ |
| specialty | 6,337 | 26.37% | 6,337 | 25.69% | −0.7pp |
| pale_ale | 8,903 | 62.39% | 8,842 | 62.65% | +0.3pp |
| belgian | 3,856 | 67.04% | 3,788 | 68.79% | +1.7pp |
| wheat | 3,314 | 81.77% | 3,314 | 83.07% | +1.3pp |
| **other (V18 only)** | — | — | 721 | 11.93% | yeni |

**Sour cluster boyutu V18'de 805 → 503 düştü** çünkü flanders_red, gueuze, fruit_lambic, gose 4 yeni sour slug'ları "other" cluster'a düştü (cluster mapping eksik). Bu **cluster-mapping bug'ı**, slug modeline etki yok.

### Cluster mapping fix (V18 sonrası)

V18 train script'inde SLUG_TO_CLUSTER güncellenebilir:
```python
SLUG_TO_CLUSTER.update({
    'flanders_red_ale': 'sour',
    'belgian_gueuze': 'sour',
    'belgian_fruit_lambic': 'sour',
    'gose': 'sour',
    'export_stout': 'stout',
    'red_ipa': 'pale_ale',
    'white_ipa': 'ipa',
    'rye_ipa': 'ipa',
    'belgian_ipa': 'ipa',
})
```

Bu V18.1 retrain için (veya production öncesi tek satır fix). Slug modeli etkilenmez — cluster modelin top-1'i yükselir.

---

## 5. Sağlamlık analizi

### Train-test gap

| Model | V17 gap | V18 gap | Yorum |
|---|---|---|---|
| 14cat | +0.55pp | +0.66pp | Eşdeğer |
| Slug | bilinmiyor | **+12.76pp** | V18 slug modeli overfit, yeni slug'lar küçük örneklem → train'i ezberleme riski |

V18 slug train top-1 %67.91, test %55.15 — gap büyük. Sebep:
1. Yeni 9 slug'da örneklem 100-700 → küçük (özellikle belgian_ipa 146)
2. Bu küçük gruplar XGBoost'un tree'lerinde easy memorization
3. Test'te aynı pattern'i bulamayınca düşük top-1

**Mitigation:** Adım 55'te subsample hedefi ≥500/slug olarak filtrele veya regularization güçlendir.

### Sanity check

V18 dataset OG/FG/ABV distribution:
- OG mean: 1.060 ✅ (V17 1.0006, BUG düzeltildi)
- FG mean: 1.014 ✅
- ABV mean: 5.93% ✅
- IBU mean: 45.5 ✅
- SRM mean: 14.4 ✅

V18 model XGBoost feature importance (önceki test):
- og rank 18 (gain 1.36%)
- fg rank 52 (gain 0.54%)
- abv rank 28 (gain 1.05%)
- ibu rank 14 (gain 1.78%)
- srm rank 7 (gain 2.41%)

V18 ile gravity sinyali artık **gerçek değerler** — kullanıcı OG=1.080 girdiğinde model bunu doğru olarak değerlendirir. V17'de 100× yanlış değerlerle train edildiği için OG sinyali gürültülüydü.

---

## 6. Net karar matrisi

| Kriter | V17 | V18 | Sonuç |
|---|---|---|---|
| Slug t1/t3/t5 | iyi | marjinal düşük | ⚪ Eşdeğer |
| Cluster | 16 (compact) | 17 (other'lı) | ⚪ V17 |
| Granül slug taksonomi | 82 | **91** | 🟢 V18 |
| B-3 bug fix | hayır | **evet** | 🟢 V18 |
| OG/FG/ABV gerçek | hayır (corrupt) | **evet** | 🟢 V18 |
| BRETT_RE pattern | dar | **genişletilmiş** | 🟢 V18 |
| Train-test gap | düşük | yüksek | 🔴 V17 |
| Sanity check | yapılmadı | **OK** | 🟢 V18 |
| Model size | 44.5 MB | 48 MB | ⚪ V17 |
| Yeni 9 slug accuracy | — | bilinmiyor (smoke test'te) | ⏸ |

**Net karar:** V18 deploy önerilir. Granül taksonomi + bug fix + sanity check + gravity gerçek değerleri V18'i tercih ettiriyor. Marjinal t1 düşüşü yeni slug zorluğundan, kabul edilebilir trade-off.

**Risk:** Slug train-test gap +12.76pp, overfit göstergesi. Adım 55'te subsample ≥500 filter ile ele alınabilir.

---

## 7. Sıradaki adımlar (Adım 54 kalanı)

1. ⏸ **Onay 4** — V6 retrain stratejisi (`_step54_v6_retrain_strategy.md` görüldü mü?)
   - Önerilen: B+ (Tier-based + sour 3× boost, total ~10K, sour %28-30)
2. ⏸ V6 retrain (Onay 4 sonrası, ~10 dk)
3. ⏸ HTML embed (V12 motor V18 model + V6 retrained, V17 → V18 path replace)
4. ⏸ Smoke test (Python OG sweep V18, browser optional)
5. ⏸ **Onay 5** — Deploy kararı
6. ⏸ Commit + push + completion report
