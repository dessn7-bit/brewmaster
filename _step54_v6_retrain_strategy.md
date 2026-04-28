# Adım 54 — V6 KNN Retrain Stratejisi (Onay 4 öneri)

**Tarih:** 2026-04-28
**Hedef:** V18 dataset 301,316 reçete → V6 browser-side KNN için 10K stratified subsample + Brett/Sour balance.

---

## V6 KNN nedir, neden önemli?

V6 = Brewmaster HTML'inde inline JavaScript KNN motoru (~216 reçete eski subset, V13 dataset'inden). V12 (XGBoost) main motor olduğu için **V6 fallback ve karşılaştırma için kullanılıyor**:
- `_build_inline_v6.js`, `_build_inline_v6_2.js` — KNN örneği + RF + rule ensemble
- HTML embed: `RECS = [...]` array (compact dataset)

V18 ile dataset 301K'ya çıktı — V6 retrain ile KNN örneği güncellenebilir.

**Browser kısıtı:** 10K reçete × 81 feature × float32 = ~3.2 MB inline JS. Daha fazlası HTML'i şişirir, mobile yavaşlatır.

---

## Strateji önerileri

### Option A: Naive uniform stratified (basit)

10K reçete / 91 slug = **~110/slug ortalama**. Küçük slug'larda hepsini al, büyüklerden random seç.

| Slug | n V18 | Subsample target |
|---|---|---|
| american_india_pale_ale | 44,407 | 110 (random) |
| american_pale_ale | 34,560 | 110 |
| ... | ... | 110 |
| brett_beer | 76 | 76 (hepsini al) |
| belgian_quadrupel | 15 | 15 (hepsini al) |

**Sour cluster top-up:** Sour aileleri 5K reçete (V18'de granül), %30 hedefiyle 3K sour subsample. Naive uniform 5 sour slug × 110 = 550 → yetersiz. **Sour boost gerekli.**

### Option B: Tier-based stratified (önerilen ⭐)

| Tier | n aralığı | slug count | Subsample | Toplam |
|---|---|---|---|---|
| Tier 1 (büyük) | ≥5,000 | 11 slug | 200/slug | 2,200 |
| Tier 2 (orta) | 1,000-4,999 | 26 slug | 150/slug | 3,900 |
| Tier 3 (küçük) | 200-999 | 22 slug | 100/slug | 2,200 |
| Tier 4 (mini) | 10-199 | 32 slug | tümü | ~1,500 |
| **Toplam** | | **91 slug** | | **~9,800** |

**Sour boost:** Tier 3 sour slug'larında (oud_bruin 437, mixed_ferm 213, vb.) +50% sample (100 yerine 150) → sour cluster ~30%'a çıkar.

### Option C: Aggressive sour overrepresentation

Hedef sour %35:
- Toplam 10K, sour 3,500
- Non-sour 91-5=86 slug → 6,500 reçete → ~75/slug
- Sour 5 slug → 3,500 / 5 = 700/slug ortalama (büyük sour slug'lardan oversample)

**Risk:** Non-sour cluster'larında subsample küçük, KNN comparison kalitesi düşer.

---

## Sour cluster gerçek boyutu (V18)

| Slug | n V18 | Tier |
|---|---|---|
| belgian_lambic | 1,820 | T2 |
| berliner_weisse | 1,479 | T2 |
| flanders_red_ale | 694 | T3 |
| oud_bruin | 437 | T3 |
| belgian_fruit_lambic | 427 | T3 |
| belgian_gueuze | 301 | T3 |
| mixed_fermentation_sour_beer | 213 | T3 |
| gose | 102 | T4 |
| brett_beer | 76 | T4 |
| **Toplam sour** | **5,549** | |

V18 sour 5,549 reçete (V17'de aynı sayı, granülleşme var).

### Tier-B (Option B önerilen) sonuçları sour için

- T2 (lambic, berliner): 150 + 150 = 300
- T3 (5 slug × 100): 500
- T4 (2 slug × tümü): 102 + 76 = 178
- **Toplam sour subsample: 978 / 9,800 = %10**

%30 hedef için bu YETERSİZ. Sour boost lazım.

### Tier-B + sour 2× boost

- T2 sour: 150 × 2 = 300 + 300 = 600
- T3 sour: 100 × 2 = 1,000
- T4 sour: tümü = 178
- **Toplam sour: 1,778 / 10,500 = %17**

%30 hedef için hala yetersiz. Sour 3× boost (T2 450, T3 300) → sour 2,778 / 11,500 = **%24**. Yine altta.

### Tier-B + sour cluster 5× boost

- T2 sour: 750
- T3 sour: 500
- T4 sour: tümü
- Toplam sour: ~3,178 / 12,000 = **%26**

5× boost ile %26'ya yaklaşıyor, ama dataset 12K'ya çıkıyor (browser şişer).

### Tier-B + non-sour subsample küçült

Non-sour Tier 1: 200 → 150 (büyük zaten 30K reçete, KNN için 150 yeterli)
Non-sour Tier 2: 150 → 100
- Tier 1 non-sour 11 slug × 150 = 1,650
- Tier 2 non-sour 24 slug × 100 = 2,400
- Tier 3 non-sour 17 slug × 100 = 1,700
- Tier 4 non-sour 30 slug × tümü = ~1,400
- **Non-sour total: ~7,150**

Sour 3× boost: ~2,778
**Toplam: 9,928 ≈ 10K. Sour %28.**

---

## Karar matrisi (Onay 4)

| Option | Total | Sour % | Non-sour quality | Brewser load | Yorum |
|---|---|---|---|---|---|
| A: Naive uniform | 10,000 | %5.5 | ⚠️ Sour az | ✅ Hafif | Sour regresyon riski |
| B: Tier-based no boost | 9,800 | %10 | ✅ İyi | ✅ Hafif | Sour hala düşük |
| **B+ : Tier + sour 3× + non-sour küçült** | **~10,000** | **%28** | **✅ İyi** | **✅ Hafif** | **⭐ Önerilen** |
| C: Aggressive sour | 10,000 | %35 | 🔴 Düşük | ✅ Hafif | Non-sour KNN zayıf |

**Önerim: B+ (Tier-based + sour 3× boost + non-sour küçült)** — sour %28, non-sour her tier'da min 100/slug. Hedef %30-35'in alt sınırı, %35 için ek 200-300 sour reçete eklenebilir.

---

## V6 KNN script taslağı

```python
import json, random
from collections import Counter

random.seed(42)
data = json.load(open('working/_v18_dataset.json'))
recipes = data['recipes']

SOUR_SLUGS = {'belgian_lambic', 'berliner_weisse', 'flanders_red_ale', 'oud_bruin',
              'belgian_fruit_lambic', 'belgian_gueuze', 'mixed_fermentation_sour_beer',
              'gose', 'brett_beer'}

def tier_of(n):
    if n >= 5000: return 1
    if n >= 1000: return 2
    if n >= 200:  return 3
    return 4

# Counts
slug_counts = Counter(r['bjcp_slug'] for r in recipes)
slug_recipes = {}
for r in recipes:
    slug_recipes.setdefault(r['bjcp_slug'], []).append(r)

# Sample per tier
TARGET = {
    (1, False): 150, (2, False): 100, (3, False): 100, (4, False): 9999,  # all
    (1, True):  450, (2, True):  300, (3, True):  300, (4, True):  9999,   # sour 3×
}

selected = []
for slug, recs in slug_recipes.items():
    if slug_counts[slug] < 10: continue
    is_sour = slug in SOUR_SLUGS
    tier = tier_of(slug_counts[slug])
    target = TARGET[(tier, is_sour)]
    if target >= len(recs):
        selected.extend(recs)
    else:
        selected.extend(random.sample(recs, target))

print(f'Total selected: {len(selected)}')
print(f'Sour count: {sum(1 for r in selected if r["bjcp_slug"] in SOUR_SLUGS)}')
print(f'Sour ratio: {100*sum(1 for r in selected if r["bjcp_slug"] in SOUR_SLUGS) / len(selected):.1f}%')
```

Bu script ~10K seçer, sour %28-30 olur. JSON output `_v6_v18_subset.json`.

---

## Sıradaki: V6 inline JS rebuild

V6 KNN dataset → inline JS format:
```javascript
const RECS = [
  {og:1.060, fg:1.014, abv:6.0, ibu:30, srm:8, ..., slug:'american_pale_ale'},
  ...10K records...
];
```

Boyut: 10K × 81 feature × ~5 byte (float compact) = ~4 MB inline JS. Brewmaster HTML 5 MB → 9 MB total. **Sınır zorluyor.** Optimizasyon:
- 81 feature yerine sadece V6 için kritik 30-40 feature (yeast/hop/malt %)
- Float → int8 quantization (precision kayıp)

Tahmin: ~2 MB inline JS, total HTML 7 MB.

---

## Onay 4 sorusu (Kaan'a)

- **Karar 4A** ⭐: B+ (tier-based + sour 3× boost + non-sour küçült). Sour %28-30, total ~10K.
- **Karar 4B**: Aggressive sour 5× boost, sour %35. Non-sour KNN zayıflar.
- **Karar 4C**: V6 retrain SKIP (Adım 55'e ertele). V18 XGBoost yeterli, V6 fallback eski 216-rec dataset'inde kalsın.

---

## V6 retrain süresi

- Stratified subsample: 30 saniye
- KNN örneği inline JS rebuild: 1-2 dk
- HTML embed: 5 dk
- Total: ~10 dk (V18 ile paralel yürür)
