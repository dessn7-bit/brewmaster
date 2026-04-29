# Adım 60c — V6 Cluster-Level İnvestigation Raporu

**Tarih:** 2026-04-29  
**Sprint:** Adım 60c (Adım 60b V6_A slug-level deneyinin geri alınması + cluster-level yeni plan)  
**Durum:** HTML rollback ✅ (fc952aa state'inde, 5.1 MB), V6_A artifact archive ✅

---

## 1. Slug-Level Geçişi Tarihçesi

### Memory tarama

**`feedback_v6_v12_paralel_retrain.md` (KURAL 2):**
> V6 stratified strategy (Tier-based + sour boost — Onay 4 4A B+):
> - Tier 1 (≥5K): 150/slug
> - Tier 2 (1K-5K): 100/slug
> - Tier 3 (200-1K): 100/slug + sour 3× boost
> - Tier 4 (10-199): tümü
> - Toplam ~10K, sour cluster %28-30

KURAL 2 **SLUG-LEVEL strategy** yazılı (Tier-based per-slug). Adım 60b'de ben V6_A'yı bu mantığa göre slug-level test ettim.

**Sonraki memory dosyaları (step54-59) V6 retrain'leri "_v{n}_v6_inline.js" üretti** — slug-level subset, ama **HTML'e hiç embed edilmedi**:
- V17 retrain → embed YOK
- V18.1, V18.2, V19 retrain → embed YOK
- V6_A (V19-aliased balanced 87×78) → embed denedi, Adım 60c'de geri alındı

### HTML mevcut V6 engine analizi

**`window.BM_ENGINE_V6_FINAL`** (HTML satır 1565-1725):

```js
function predictV6Enhanced(testRecipe, trainingRecords, k) {
    // ...
    distances.push({ recipe: trainRecipe, distance: ... });
    // ...
    const styleVotes = {};
    for (let n = 0; n < neighbors.length; n++) {
      const style = neighbors[n].recipe.label_slug;  // ← SLUG-LEVEL
      styleVotes[style] = (styleVotes[style] || 0) + w;
    }
    // ...
}
```

**Mevcut V6 production engine SLUG-LEVEL** — `label_slug` field'ı kullanarak prediction yapar. 1100 reçete dataset'inde de slug-level çalışmış olmalı (eski 14cat naming'e rağmen).

Recipe data structure (HTML inline):
```js
{
  "name": "Munich Helles",
  "label_slug": "munich_helles",      // ← KNN bu kullanır
  "label_family": "german_lager",     // ← cluster, kullanılmıyor
  "label_ferm": "lager",              // ← ferm type, kullanılmıyor
  "features": {...}
}
```

**Sonuç:** V6 production HER ZAMAN slug-level olmuş. label_family field'ı recipe'de var ama predictV6Enhanced fonksiyonunda kullanılmıyor.

### Git log

V6 retrain commit'leri "feat(step54): V18.1 deploy", "feat(step55): V18.2 deploy" vs içinde kalmış — V6 retrain hep slug-level subset üretti (10K Tier-based, sour 3× boost) ama deploy YAPILMADI.

**Net bulgu:** Slug-level "geçişi" diye bir an yok — V6 hep slug-level idi. Adım 60b'de Kaan ilk kez gerçek embed yapıldı, problem net görüldü (Witbier sample top-1 yanlış), Adım 60c'de cluster-level alternatif istendi.

---

## 2. STYLE_DEFINITIONS.json Slug → Cluster Mapping

V19-aliased dataset'te `SLUG_TO_CLUSTER` (V19 train script'i) ile **88 slug → 16 cluster** kanonik mapping:

### 16 Cluster × Slug Listesi

| Cluster | Slug count | Slugs |
|---|---|---|
| **ipa** | **9** | aipa, dipa, black_ipa, british_ipa, brut_ipa, juicy_or_hazy_ipa, red_ipa, rye_ipa, white_ipa |
| **lager** | **13** | american_lager, bamberg_maerzen_rauchbier, dortmunder_european_export, german_maerzen, festbier, german_pilsener, german_schwarzbier, kellerbier, munich_dunkel, munich_helles, pale_lager, pre_prohibition_lager, vienna_lager |
| **belgian** | **8** | belgian_blonde_ale, belgian_dubbel, belgian_ipa, belgian_quadrupel, belgian_strong_dark_ale, belgian_strong_golden, belgian_tripel, belgian_witbier |
| **sour** | **9** | belgian_fruit_lambic, belgian_gueuze, belgian_lambic, berliner_weisse, brett_beer, flanders_red_ale, gose, mixed_fermentation_sour_beer, oud_bruin |
| **specialty** | 6 | experimental_beer, fruit_beer, herb_and_spice_beer, smoked_beer, specialty_beer, winter_seasonal_beer |
| **stout** | 6 | american_imperial_stout, export_stout, irish_dry_stout, oatmeal_stout, stout, sweet_stout |
| **bitter** | 6 | extra_special_bitter, old_ale, ordinary_bitter, scotch_ale_or_wee_heavy, scottish_export, special_bitter_or_best_bitter |
| **wheat** | 5 | american_wheat_ale, german_rye_ale, south_german_dunkel_weizen, south_german_hefeweizen, south_german_weizenbock |
| **cream** | 5 | american_cream_ale, blonde_ale, common_beer, german_altbier, german_koelsch |
| **pale_ale** | 4 | american_amber_red_ale, american_pale_ale, american_strong_pale_ale, english_pale_ale |
| **porter** | 4 | baltic_porter, brown_porter, porter, robust_porter |
| **bock** | 4 | dunkles_bock, german_bock, german_doppelbock, german_heller_bock_maibock |
| **saison** | 3 | french_belgian_saison, french_biere_de_garde, specialty_saison |
| **brown** | 2 | american_brown_ale, brown_ale |
| **mild** | 2 | irish_red_ale, mild |
| **barleywine** | 2 | american_barley_wine_ale, british_barley_wine_ale |

**Toplam:** 88 slug, 16 cluster, unmapped 0.

---

## 3. "14cat" Tarihsel İsim Referansları

HTML'de hangi yerlerde "14cat" geçiyor:

| Kategori | Adet | Örnek |
|---|---|---|
| URL/file path | 8 | `_v85_model_14cat.json`, `_v9_model_14cat.json`, `_v19_model_14cat.json`, vs |
| `_meta.motor` field | 4 | `'V8.5_14cat'`, `'V9_14cat'`, `'V10_14cat'`, `'V10.1_14cat'` |
| Comment | 4 | `// V8.5 CANARY MOTOR (Adım 43) — XGBoost 14cat`, vs |
| Console log | 1 | `[BM V12 (V19) cluster] 14-cat XGBoost` |

**Toplam: 17 referans.** Hepsi tarihsel — V8.5 döneminde (Adım 43, ~5847 reçete) cluster sayısı gerçekten 14 idi (BJCP 2021 14 ana kategori). V9, V10, V10.1, V12 retrain'lerinde slug ekleme + alias merge sonrası gerçek cluster 16'ya çıktı ama "14cat" naming korundu.

**Deploy sonrası rename gerek mi?** Hayır — kullanıcı UI'da görünmüyor (sadece file name + console log). V12 V19 model file'ı hala `_v19_model_14cat.json` (16 class içerse de). Rename HTML embed kodu + dosya isimleri etkiler, çok büyük iş, kazanç düşük. **Skip öneri**.

---

## 4. Cluster Reçete Dağılımı (V19-aliased)

| # | Cluster | Slug count | Reçete count | % toplam |
|---|---|---|---|---|
| 1 | ipa | 9 | 76,427 | 19.94% |
| 2 | pale_ale | 4 | 55,363 | 14.44% |
| 3 | specialty | 6 | 41,289 | 10.77% |
| 4 | stout | 6 | 32,873 | 8.58% |
| 5 | belgian | 8 | 23,988 | 6.26% |
| 6 | lager | 13 | 22,837 | 5.96% |
| 7 | wheat | 5 | 20,785 | 5.42% |
| 8 | cream | 5 | 20,618 | 5.38% |
| 9 | saison | 3 | 19,947 | 5.20% |
| 10 | bitter | 6 | 19,684 | 5.13% |
| 11 | porter | 4 | 14,796 | 3.86% |
| 12 | brown | 2 | 12,301 | 3.21% |
| 13 | mild | 2 | 9,401 | 2.45% |
| 14 | sour | 9 | 4,883 | 1.27% |
| 15 | barleywine | 2 | 4,533 | 1.18% |
| 16 | bock | 4 | 3,606 | 0.94% |

**Toplam:** 383,331 reçete, 16 cluster.

**Cluster boyut dağılımı:**
- En büyük: ipa (76K) — ortalama %6.25 oranın 3.2× üstü
- En küçük: bock (3.6K), barleywine (4.5K), sour (4.9K)
- Median: ~17K (saison/bitter civarı)

---

## 5. Sampling Strategy Tahmini Boyutlar

### V6_C2 — Cluster Sabit N=1000

Her cluster max 1000 reçete:
- 16 cluster × min(1000, n) = ?
- Tüm cluster'lar ≥1000 (en küçük bock 3,606)
- **Toplam: 16 × 1000 = 16,000 reçete** (kesin)

### V6_C3a — Cluster İçi Slug Balance M=1000

| Cluster | Slug count | Per-slug hedef | Yetersiz slug | Gerçek toplam |
|---|---|---|---|---|
| ipa | 9 | 111 | brut_ipa n=3 | 8×111 + 3 = **891** |
| lager | 13 | 77 | yok | 13×77 = **1,001** |
| belgian | 8 | 125 | belgian_quadrupel n=78 | 7×125 + 78 = **953** |
| sour | 9 | 111 | brett_beer n=103 | 8×111 + 103 = **991** |
| specialty | 6 | 167 | yok | 6×167 = **1,002** |
| stout | 6 | 167 | yok | 6×167 = **1,002** |
| bitter | 6 | 167 | yok | 6×167 = **1,002** |
| wheat | 5 | 200 | yok | 5×200 = **1,000** |
| cream | 5 | 200 | yok | 5×200 = **1,000** |
| pale_ale | 4 | 250 | english_pale_ale n=103 | 3×250 + 103 = **853** |
| porter | 4 | 250 | yok | 4×250 = **1,000** |
| bock | 4 | 250 | dunkles_bock n=85 | 3×250 + 85 = **835** |
| saison | 3 | 333 | yok | 3×333 = **999** |
| brown | 2 | 500 | yok | 2×500 = **1,000** |
| mild | 2 | 500 | yok | 2×500 = **1,000** |
| barleywine | 2 | 500 | yok | 2×500 = **1,000** |

**V6_C3a tahmini toplam: ~15,529 reçete** (4 cluster <1000: ipa 891, belgian 953, sour 991, pale_ale 853, bock 835)

### Boyut Karşılaştırma (V6_A ve V6_B önceki deney)

| Strategy | Toplam reçete |
|---|---|
| V6 production (eski 1100) | 1,100 |
| V6_A (slug-level, 87×78) | 6,786 |
| V6_B (log-balanced) | 27,837 |
| **V6_C2 (cluster sabit N=1000)** | **16,000** |
| **V6_C3a (cluster içi slug balance, M=1000)** | **~15,529** |

V6_C2 ve V6_C3a benzer boyut (~16K). Slug detayında fark:
- **V6_C2**: cluster içi slug **dağılımı orantılı** — büyük slug'lar (AIPA, APA) cluster'da daha çok temsil
- **V6_C3a**: cluster içi slug **eşit** — küçük slug'lar (Quadrupel, Brett) korunur

---

## 6. Karar Noktaları (Onay 5)

1. **V6_C2 vs V6_C3a sampling stratejisi onay** — ikisini paralel mi test edelim, yoksa birini öncelikli mi?
2. **M=1000 değeri kabul mü?** Alternatif: M=500 (~8K dataset) veya M=2000 (~32K dataset, V6_B benzeri)
3. **V6 KNN cluster-level prediction** — `label_family` field'ı kullan, `label_slug` değil. predictV6Enhanced fonksiyonu güncelleme gerek.
4. **HTML embed sonrası 14cat naming** — rename SKIP onay (mevcut dosya/log isimleri korunur)?

### Yapılacak (onay sonrası)
- 2 sampling script (V6_C2, V6_C3a)
- 2 retrain (cluster-level KNN, label_family)
- 5 sample test (cluster prediction, slug detayı opsiyonel)
- Karşılaştırma raporu
- Kazanan motor → HTML embed (predictV6Enhanced label_family kullanacak)

---

## Net Özet

✅ HTML rollback (fc952aa state, 5.1 MB)
✅ V6_A artifact archive (working/archive/v6_a_slug_level/, 88 MB, 13 dosya)
✅ V6 production hep slug-level idi (KURAL 2 memory + HTML kod analizi)
✅ V19-aliased 16 cluster × 88 slug kanonik mapping mevcut
✅ "14cat" tarihsel naming, gerçek 16 cluster
✅ V6_C2 ve V6_C3a tahmini boyutlar hesaplandı (~16K her ikisi)

Kaan'ın Onay 5 sonrası sampling + retrain pipeline'ına geçilir.
