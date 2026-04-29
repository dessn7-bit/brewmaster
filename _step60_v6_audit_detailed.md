# Adım 60 — RAPOR 1: V6 Subset Detaylı Analiz

**Tarih:** 2026-04-29  
**Dosya:** `working/_v19_v6_subset.json` (V19 V6 retrain çıktısı)  
**Subsample script:** `_v19_v6_retrain.py` (working/archive/v19_1/'a taşınmadı, root'ta)

---

## A. Dataset Boyutu

| Metric | Değer |
|---|---|
| Toplam reçete | **10,069** |
| Feature list (full, JSON içinde) | 89 feature |
| V6 inline compact features | **56 feature** (`COMPACT_FEATURES` list, `_v19_v6_retrain.py` satır 38-50) |
| Sour ratio (meta) | 0.326 (%32.6) |

**Not:** 89 full feature'dan 33'ü V6 inline JS'e dahil edilmedi (V6 KNN bunları kullanmaz). Drop edilenler: yeast_*'in bazıları, derived feature'lar (ibu_og_ratio, og_fg_ratio, srm_high_ibu_high vs), pct_six_row, pct_other, total_kg, has_clean_us05_isolate, has_late_hop, has_whirlpool, has_fwh, dry_hop_extreme.

---

## B. Tier Sınırları (Kod Referansı)

`_v19_v6_retrain.py:18-22`:

```python
def tier_of(n):
    if n >= 5000: return 1   # Tier 1: en büyük slug
    if n >= 1000: return 2   # Tier 2
    if n >= 200:  return 3   # Tier 3
    return 4                  # Tier 4: en küçük (≤199)
```

**TARGET dict** (`_v19_v6_retrain.py:32-35`) — slug başına alınan reçete sayısı:

| (Tier, sour) | Hedef |
|---|---|
| (T1, non-sour) | 100 |
| (T2, non-sour) | 80 |
| (T3, non-sour) | 80 |
| (T4, non-sour) | 9999 (= hepsi, slug ≥10 filter sonrası) |
| (T1, sour) | 500 |
| (T2, sour) | 500 |
| (T3, sour) | 500 |
| (T4, sour) | 9999 (= hepsi) |

**Sınırlar hardcoded** — değişmek için `_v19_v6_retrain.py` satır 18-35 düzenlenmesi gerek. Memory veya KURAL 2'de bu rakamlar yazılı değil.

### Slug filter (≥10 reçete)
`_v19_v6_retrain.py:42` `if slug_counts[slug] < 10: continue` — V19'da <10 reçete 38 slug DROPPED (V6'da yer almıyor).

---

## C. Sour Overrepresent Tam Hesabı

### Globally
| | V19 dataset | V6 subset |
|---|---|---|
| Sour reçete count | 4,874 | 3,282 |
| Total | 383,334 | 10,069 |
| **Sour ratio** | **1.27%** | **32.60%** |
| **Multiplier** | — | **25.6×** |

### Per-sour-slug (9 slug)

| Slug | V19 n | V19 % | V6 n | V6 % | × boost | Tier |
|---|---|---|---|---|---|---|
| berliner_weisse | 1,598 | 0.42% | 500 | 4.97% | 11.9× | T2 |
| flanders_red_ale | 858 | 0.22% | 500 | 4.97% | 22.2× | T3 |
| oud_bruin | 562 | 0.15% | 500 | 4.97% | 33.9× | T3 |
| belgian_lambic | 544 | 0.14% | 500 | 4.97% | 35.0× | T3 |
| belgian_fruit_lambic | 530 | 0.14% | 500 | 4.97% | 36.0× | T3 |
| mixed_fermentation_sour_beer | 268 | 0.07% | 268 | 2.66% | 38.1× | T3 |
| gose | 214 | 0.06% | 214 | 2.13% | 38.1× | T3 |
| belgian_gueuze | 199 | 0.05% | 199 | 1.98% | 38.0× | T4 |
| brett_beer | 101 | 0.03% | 101 | 1.00% | 38.1× | T4 |

**Tüm 9 sour slug aynı oranda overrepresent** (~38× küçük slug'larda, 11-22× büyük sour'da). Bu MATEMATIKSEL bir yan etki:
- Büyük non-sour slug'lar (AIPA 56K, APA 43K) 100'e indirilince payları %1.0
- Küçük sour slug'lar (gueuze 199, brett 101) tam tutulunca payları %1-5
- Sour cluster bütünü %32.6'ya çıkıyor

**Net:** Code'un "sour 3× boost" memory notu yanıltıcı. Gerçek mekanizma: T1 squashing + sour T1-3 hedef 500.

---

## D. Slug-by-slug Breakdown (TÜM 91 train slug)

### Bucket dağılımı V6 subset'inde

| V6 reçete bucket | Slug count |
|---|---|
| ≥100 reçete | **33 slug** |
| 50-99 | 54 slug |
| 10-49 | 0 slug |
| <10 (drop) | 38 slug |

### Sample at target value
| Target | Açıklama | Slug count |
|---|---|---|
| n=100 | Tier 1 non-sour hedef | 22 slug |
| n=80 | Tier 2/3 non-sour hedef | 51 slug |
| n=500 | Sour Tier 1/2/3 hedef | 5 slug |

### Tier dağılımı (V19'da slug count)

| Tier | V19 slug count | V6 reçete kontribüsyon | Strateji |
|---|---|---|---|
| **T1** (≥5000) | 21 slug | 21×100 = 2,100 | büyük slug squashed |
| **T2** (1000-4999) | 39 slug | 38×80 + 1×500 (berliner) = 3,540 | non-sour 80, sour 500 |
| **T3** (200-999) | 17 slug | 12×80 + 5×500 (lambic/oud_bruin/flanders/fruit_lambic/mixed_ferm/gose) = 3,322 | sour boost devreye giriyor |
| **T4** (<200) | 10 slug | hepsi = 1,107 (gueuze 199 + brett 101 + 8 non-sour 644) | tam temsil |

**Wait — gose 214 T3 olmalı** (≥200). Gerçekten T3 SOUR (target 500 ama 214 kaldı, hepsi alındı).

### Tüm slug listesi (V19 büyükten küçüğe ilk 30 ve son 30)

**İlk 25 (büyük slug, T1-T2):**
| # | slug | V19 | V6 | V6 % |
|---|---|---|---|---|
| 1 | american_india_pale_ale | 56,108 | 100 | 0.2% |
| 2 | american_pale_ale | 43,246 | 100 | 0.2% |
| 3 | specialty_beer | 28,398 | 100 | 0.4% |
| 4 | double_ipa | 14,581 | 100 | 0.7% |
| 5 | french_belgian_saison | 14,085 | 100 | 0.7% |
| 6 | american_amber_red_ale | 11,483 | 100 | 0.9% |
| 7 | american_brown_ale | 9,128 | 100 | 1.1% |
| 8 | american_imperial_stout | 8,976 | 100 | 1.1% |
| 9 | american_wheat_ale | 8,919 | 100 | 1.1% |
| 10 | robust_porter | 8,887 | 100 | 1.1% |
| 11 | south_german_hefeweizen | 7,985 | 100 | 1.3% |
| 12 | extra_special_bitter | 7,656 | 100 | 1.3% |
| 13 | blonde_ale | 7,330 | 100 | 1.4% |
| 14 | stout | 7,248 | 100 | 1.4% |
| 15 | irish_red_ale | 6,064 | 100 | 1.6% |
| ... | ... | ... | ... | ... |
| 21 | american_lager | 5,270 | 100 | 1.9% |
| 22 | specialty_saison | 4,951 | 80 | 1.6% |
| 23 | herb_and_spice_beer | 4,711 | 80 | 1.7% |

**Son 27 train slug (küçük, T3-T4):**
| # | slug | V19 | V6 | V6 % | Sour? |
|---|---|---|---|---|---|
| 49 | berliner_weisse | 1,598 | 500 | 31.3% | SOUR T2 |
| 62 | flanders_red_ale | 858 | 500 | 58.3% | SOUR T3 |
| 67 | oud_bruin | 562 | 500 | 89.0% | SOUR T3 |
| 68 | belgian_lambic | 544 | 500 | 91.9% | SOUR T3 |
| 69 | belgian_fruit_lambic | 530 | 500 | 94.3% | SOUR T3 |
| 71 | red_ipa | 417 | 80 | 19.2% | T3 |
| 75 | rye_ipa | 309 | 80 | 25.9% | T3 |
| 76 | mixed_fermentation_sour_beer | 268 | 268 | 100% | SOUR T3 |
| 77 | white_ipa | 264 | 80 | 30.3% | T3 |
| 78 | belgian_ipa | 218 | 80 | 36.7% | T3 |
| 79 | gose | 214 | 214 | 100% | SOUR T3 |
| 80 | belgian_gueuze | 199 | 199 | 100% | SOUR T4 |
| 81 | juicy_or_hazy_india_pale_ale | 144 | 144 | 100% | T4 |
| 82 | english_pale_ale | 103 | 103 | 100% | T4 |
| 83 | brett_beer | 101 | 101 | 100% | SOUR T4 |
| 84 | german_oktoberfest_festbier | 100 | 100 | 100% | T4 |
| 85 | kellerbier | 97 | 97 | 100% | T4 |
| 86 | dunkles_bock | 85 | 85 | 100% | T4 |
| 87 | belgian_quadrupel | 78 | 78 | 100% | T4 |

### Drop edilen slug (V19'da <10 reçete, V6'da yok)
38 slug DROPPED:
- 12 slug (n=1): juicy_or_hazy_double_ipa, smoke_porter, english_brown_ale, gluten_free_beer, foreign_extra_stout, scottish_heavy, piwo_grodziskie, historical_beer, vs.
- 8 slug (n=2): cream_ale, west_coast_ipa, american_fruited_sour_ale, czech_amber_lager, new_zealand_pilsner, finnish_sahti, vs.
- 6 slug (n=3): franconian_rotbier, australian_pale_ale, brut_ipa, vs.
- 12 slug (n=4-9): imperial_red_ale, coffee_beer, german_eisbock, session_india_pale_ale, dark_lager, vs.

---

## E. Subsample Script Anlamlı Satırlar

**`_v19_v6_retrain.py:30-58`:**

```python
slug_counts = Counter(r['bjcp_slug'] for r in recipes if r.get('bjcp_slug'))
slug_recipes = defaultdict(list)
for r in recipes:
    if r.get('bjcp_slug'):
        slug_recipes[r['bjcp_slug']].append(r)

TARGET = {
    (1, False): 100, (2, False):  80, (3, False):  80, (4, False): 9999,
    (1, True):  500, (2, True):  500, (3, True):  500, (4, True):  9999,
}

selected = []
slug_picked = Counter()
for slug, recs in slug_recipes.items():
    if slug_counts[slug] < 10:
        continue
    is_sour = slug in SOUR_SLUGS
    tier = tier_of(slug_counts[slug])
    target = TARGET[(tier, is_sour)]
    chosen = recs if target >= len(recs) else random.sample(recs, target)
    selected.extend(chosen)
    slug_picked[slug] = len(chosen)
```

**Mantık:**
1. Slug bazında gruplama
2. <10 reçete slug'lar atılıyor
3. Tier ve sour flag'e göre target sayı belirleniyor
4. `random.sample(recs, target)` — stratified sampling (random.seed(42) deterministic)
5. Sour boost: tier'dan bağımsız 500 (Tier 4 hariç, hepsi alınır)

---

## Net Bulgular

1. **Tier sınırları doğrulandı:** T1 ≥5000, T2 ≥1000, T3 ≥200, T4 <200. Memory'de bu rakamlar yazılı değil, yalnız kodda.
2. **Sour 25× overrepresent matematiksel yan etki** — gerçekten "agresif sour boost" değil, T1 büyük slug'ları 100'e indirip sour'lar 500/100% tutulduğu için ortaya çıkıyor.
3. **Coverage patalojisi:** AIPA 56K reçete %0.2 temsil, gose 214 reçete %100 temsil — KNN distance'da küçük slug'lar büyük slug'ları "çevreliyor".
4. **Subsample script hardcoded** — TARGET dict ve tier_of değiştirmek için kod düzenlemesi gerek.
5. **38 slug DROPPED** (<10 reçete in V19) — V6 KNN bunları hiç görmüyor.

**Veri:** `_step60_audit_detailed_data.json` (full slug breakdown, sour per-slug, bucket distribution).
