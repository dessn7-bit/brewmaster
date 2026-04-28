# Adım 55 Faz 1 — Feature Definition Onay 3

**Tarih:** 2026-04-29
**Dataset:** V18.2 base (alias #1-4 merged), 301,316 reçete
**Hedef:** 81 feature → 91 feature (+10 yeni)

---

## 10 Feature Definition Tablosu

### 1. pct_rye_high

- **Formül:** `sum(ferm.amount_kg) for f if 'rye' in f.name OR 'roggen' in f.name) / total_kg > 0.10`
- **Encoding:** boolean (0/1)
- **Dağılım:** 9,809 reçete (%3.26)
- **False positive riski:** Düşük — "rye" keyword ferm_name'de spesifik (rye malt, rye flakes)
- **Sample 5 (true):**
  1. "white rye pa" (american_wheat_ale, OG 1.053) ✓
  2. "rye the fuck not..." (saison) ✓
  3. "drye 2" (saison) ✓
  4. "juniperye" (specialty) ✓
  5. "rye opener" (stout) ✓

### 2. pct_oats_high

- **Formül:** `sum(ferm.amount_kg if 'oat' in f.name) / total_kg > 0.10`
- **Encoding:** boolean
- **Dağılım:** 9,021 reçete (%3.00)
- **False positive riski:** Düşük — "oat" keyword ferm specific (flaked oats, oat malt)
- **Sample 5 (true):**
  1. "ipa v0.7 (centennial)" (american_ipa) — şüpheli? oats >10% IPA var (%10 oats Hazy IPA)
  2. "bgb clone high og norm" (american_imperial_stout) ✓ Oatmeal Stout-style
  3. "white stout" (american_pale_ale) ✓
  4. "bfp stout" (export_stout) ✓
  5. "braggot draft" (specialty) ✓

### 3-6. hop_schedule (4 boolean — basit yaklaşım)

Code kararı: **Granül IBU breakdown yerine 4 boolean** (basit, interpretable, retrain hızlı). Granül sürüm Adım 56'ya ertelenebilir.

| Feature | Formül | Dağılım | Sample (true) |
|---|---|---|---|
| **has_dry_hop** | `any(h.use == 'dry hop' for h in hops)` | 27.09% (V17 zaten var, refined) | "Tanzender Maharadscha" IPA ✓, "Maracuja NEIPA" ✓ |
| **has_whirlpool** | `any('whirl' OR 'flame' OR 'aroma' in h.use)` | 7.29% (21,960) | "blanche" witbier ✓, "calirye" IPA ✓, "sosdipa11gal" double_ipa ✓ |
| **has_fwh** | `any('first' in h.use)` | 6.82% (20,554) | "bbd saison furtif" ✓, "wet hop-alotamous" ✓ |
| **has_late_hop** | `any(time≤15 AND 'boil' in h.use)` | **70.18%** (211,454) | Çoğunluk feature — modern brewing standardı |

**Not:** has_late_hop %70 → düşük entropy, model'e az bilgi katar. Ama ipa/late-hopping ailelerini düşük IBU/SRM aileleriyle ayırmaya yarayabilir. Tutmak istersen tut, drop etmek istersen %70 majority class.

**Has_dry_hop bug fix:** Önceki run'da non-rmwoods reçetelerde `True/False` string döndü (8,093 'False', 886 'True'). Düzeltme: tüm feature'lar `int(0/1)` cast edilecek.

### 7. ibu_og_ratio (BU:GU)

- **Formül:** `ibu / ((og - 1.0) * 1000)`
- **Encoding:** **float** (continuous, 0.0-2.0 tipik)
- **Dağılım:**
  - <0.5: 96,351 (%32.0) — düşük hop (lager, blonde, weizen)
  - 0.5-0.8: 95,447 (%31.7) — medium hop (APA, brown, stout)
  - ≥0.8: 104,981 (%34.8) — yüksek hop (IPA, double IPA)
  - zero/null: 4,537 (%1.5)
- **Sample 10:**
  - "newengland style ipa" OG 1.062 IBU 83 → **1.334** (yüksek)
  - "hopfensahne stout" OG 1.055 IBU 40 → 0.73 (medium)
  - "ellis county blond ale" OG 1.050 IBU 15 → 0.296 (düşük)
  - vb.

### 8. og_fg_ratio (Attenuation)

- **Formül:** `(og - fg) / (og - 1.0)`
- **Encoding:** **float** (0.5-0.95 tipik)
- **Dağılım:**
  - 0.5-0.8: 244,362 (%81.1) — normal attenuation
  - ≥0.8: 56,614 (%18.8) — yüksek attenuation (saison, kveik, brett, dry yeast)
  - <0.5: 81 (%0.03) — anormal düşük (FG yüksek, sweet stout)
- **Sample:** "citra blossom buzz v3" OG 1.053 FG 1.008 → 0.855 (saison-tipi)

### 9. katki_fruit_strong

- **Formül:** Refined — sadece `misc.name`'de fruit keyword (recipe name DEĞİL)
- **Mevcut katki_fruit:** %13.5 (recipe name false positive dahil)
- **Yeni katki_fruit_strong:** %1.37 (4,116 reçete) — 10× sıkılaştırma
- **False positive riski:** Düşük (sadece misc.use)
- **Sample 5:**
  1. "kriek" (belgian_lambic) ✓ cherry kriek
  2. "Schneeweißchen Rosenrot" (fruit_beer) ✓
  3. "Blood Orange Double IPA" (american_ipa) ✓
  4. "Sud 26 Weizen IPA" (white_ipa) ✓
  5. "4-Korn Weisse" (munich_helles) — şüpheli (helles'te fruit?)

**Not:** Mevcut `katki_fruit` (broader) feature de feature_list'te tutulur. Yeni `_strong` versiyonu özellikle lambic/fruit_lambic için boundary feature.

### 10. srm_high_ibu_high (red_ipa için)

- **Formül:** `srm > 14 AND ibu > 40`
- **Encoding:** boolean
- **Dağılım:** 38,252 reçete (%12.69)
- **Sample 5:**
  1. "Sleepy Gogmagog" (american_barley_wine) SRM 20 IBU 68 ✓
  2. "Czech-Baltic Porter" SRM 33 IBU 49 ✓
  3. "Wenner's Bitter Stout" SRM 46 IBU 55 ✓
  4. "Dunkelweizen" SRM 17 IBU 151 — bu yanlış (Dunkelweizen IBU 151 imkansız, dataset hatası)
  5. "Hols der Teufel" (imperial_stout) ✓

**Not:** %12.69 dağılım yüksek — red_ipa diskriminator olmaktan çok genel "amber+hoppy" gösterici. Etkisi karışık.

### 11. yeast_belgian_high_bu_gu (belgian_ipa için)

- **Formül:** `(yeast_belgian OR yeast_abbey) AND ibu_og_ratio > 0.7`
- **Encoding:** boolean
- **Dağılım:** 2,057 reçete (%0.68)
- **Sample 5:**
  1. "Bryan's Cali-Belgique Pale Ale" — Cali-Belgique IS belgian_ipa style ✓
  2. "winter warmer #4" (specialty) — borderline
  3. "Flo's Golden Ale" (belgian_blonde) — high IBU borderline
  4. "Bam Biére" (mixed_ferm) — saison/sour
  5. "Jackson's Browne" (brown) — şüpheli

### 12. yeast_witbier_high_og_ibu (white_ipa için)

- **Formül:** `yeast_witbier AND og > 1.060 AND ibu > 40`
- **Encoding:** boolean
- **Dağılım:** 123 reçete (%0.04) ⚠️ **çok düşük signal**
- **Yorum:** white_ipa V18'de 203 reçete, bu feature sadece 123'ünü yakalıyor. Threshold daha gevşek (ibu>30) yapılabilir ama signal hala düşük olur.
- **Sample 5:**
  1. "saint krampus" (specialty_saison) — saison ile karışım
  2. "extra pale double ipa" (apa) — yeast farklı?
  3. "pear witwine" (witbier) — fruit witbier
  4. "Sud 26 Weizen IPA" (white_ipa) ✓
  5. "bewitchment" (german_rye_ale) — şüpheli

**Karar:** Sample %20 white_ipa, %80 başka kategori — feature **zayıf signal**. White IPA için yine de tut (alternatif yok), ama tek başına yetersiz olduğu kabul.

### 13. yeast_lab (categorical, one-hot)

- **Formül:** `yeasts[0].lab → wyeast | white_labs | fermentis | imperial | other`
- **Encoding:** **one-hot 5 categori** veya **4 boolean** (`yeast_lab_wyeast`, `yeast_lab_white_labs`, `yeast_lab_fermentis`, `yeast_lab_other`) — imperial drop (%0.20 çok az)
- **Dağılım:**
  - wyeast: 92,350 (%30.65)
  - white_labs: 88,775 (%29.46)
  - fermentis: 73,765 (%24.48)
  - other: 45,836 (%15.21)
  - imperial: 590 (%0.20) ⚠️ drop adayı
- **Yorum:** 4 boolean encoding XGBoost için daha temiz (one-hot 5'i 4 ayrı feature olarak ele alır zaten).

---

## Toplam feature count

| Adım | Feature count |
|---|---|
| V18.1 base | 81 |
| + pct_rye_high | 82 |
| + pct_oats_high | 83 |
| + has_dry_hop (var, refined) | 83 |
| + has_whirlpool | 84 |
| + has_fwh | 85 |
| + has_late_hop | 86 |
| + ibu_og_ratio (float) | 87 |
| + og_fg_ratio (float) | 88 |
| + katki_fruit_strong | 89 |
| + srm_high_ibu_high | 90 |
| + yeast_belgian_high_bu_gu | 91 |
| + yeast_witbier_high_og_ibu | 92 |
| + yeast_lab_wyeast | 93 |
| + yeast_lab_white_labs | 94 |
| + yeast_lab_fermentis | 95 |
| + yeast_lab_other | 96 |
| **V18.2 total** | **96** |

(has_dry_hop V18.1'de zaten dry_hop_days var; refined boolean ek feature olur veya replace, karar Kaan'ın)

---

## Onay 3 — Karar noktaları

1. **has_late_hop %70 dağılım** — drop mu tut mu? (Düşük entropy ama IPA boundary için katkı verebilir)
2. **yeast_witbier_high_og_ibu %0.04 zayıf signal** — tut (white_ipa için tek alternatif) veya drop?
3. **yeast_lab_imperial %0.20** — drop ile 4 boolean (önerilen) veya tut 5 categori
4. **has_dry_hop refined** — V18.1 `dry_hop_days` feature'ı ile çakışıyor. Replace mi yoksa ek feature mi?
5. **Toplam feature: 81 → ~96** (Kaan onay ile devam)

Onay 3 sonrası: V18.2 feature compute pipeline implementation + V18.2 dataset rebuild + V18.2 retrain.
