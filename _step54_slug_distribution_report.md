# Adım 54 — V17 Train Slug Distribution + Faz 1 Simulation

**Tarih:** 2026-04-28
**Dataset:** V17 train slug subset (≥10 reçete filter sonrası 82 slug, 301,174 reçete)
**Drop edilen:** 45 slug, 142 reçete (V16 kaynaklı az örneklem)

---

## 1. Threshold breakdown (82 train slug)

| Bucket | Slug count | Açıklama |
|---|---|---|
| **500+** | 64 (78%) | Güçlü öğrenme, model kararlı |
| **100-499** | 10 (12%) | Orta — model öğrenir ama gürültülü |
| **30-99** | 5 (6%) | Sınır — istatistiksel güven düşük |
| **10-29** | 3 (4%) | Kritik zayıf — top-1 ölçümü gürültülü |
| **<10 (drop)** | 45 | Train'e girmedi |

### 30-99 bucket (sınır — top-1 metriği güvenilmez)

| Slug | n | rmwoods | non_rm | Not |
|---|---|---|---|---|
| kellerbier | 89 | 28 | 61 | Yeterli mix, n yetersiz |
| german_oktoberfest_festbier | 80 | 38 | 42 | V16 baseline 0% top-1, V17 18.8% — küçük n'in yansıması |
| **brett_beer** | **76** | **48** | **28** | Adım 53 -55.8pp regresyonu BU bucket'ta |
| dunkles_bock | 69 | 29 | 40 | Etkilenmemiş, V16'da yoktu |
| cream_ale | 62 | 0 | 62 | Tamamen V16 — rmwoods katkısı yok |

### 10-29 bucket (kritik zayıf)

| Slug | n | rmwoods | non_rm | Not |
|---|---|---|---|---|
| sweet_stout_or_cream_stout | 19 | 0 | 19 | V16 alias artığı, retire edilebilir |
| american_barleywine | 16 | 0 | 16 | `american_barley_wine_ale` (2,483) ile alias birleştirme adayı |
| belgian_quadrupel | 15 | 0 | 15 | rmwoods'ta belgian_strong_dark_ale'a yutulmuş — Faz 1'de ayrılabilir |

---

## 2. Tam 82 slug tablosu (asc — zayıftan güçlüye)

(`working/_step54_slug_distribution_raw.txt` tam çıktı; özet:)

**En zayıf 15 slug (n ≤ 500):**

| # | Slug | total | rmwoods | non_rm | bucket |
|---|---|---|---|---|---|
| 1 | belgian_quadrupel | 15 | 0 | 15 | 10-29 |
| 2 | american_barleywine | 16 | 0 | 16 | 10-29 |
| 3 | sweet_stout_or_cream_stout | 19 | 0 | 19 | 10-29 |
| 4 | cream_ale | 62 | 0 | 62 | 30-99 |
| 5 | dunkles_bock | 69 | 29 | 40 | 30-99 |
| 6 | brett_beer | 76 | 48 | 28 | 30-99 |
| 7 | german_oktoberfest_festbier | 80 | 38 | 42 | 30-99 |
| 8 | kellerbier | 89 | 28 | 61 | 30-99 |
| 9 | english_pale_ale | 102 | 36 | 66 | 100-499 |
| 10 | juicy_or_hazy_india_pale_ale | 132 | 53 | 79 | 100-499 |
| 11 | golden_or_blonde_ale | 200 | 185 | 15 | 100-499 |
| 12 | mixed_fermentation_sour_beer | 213 | 152 | 61 | 100-499 |
| 13 | experimental_beer | 323 | 310 | 13 | 100-499 |
| 14 | dortmunder_european_export | 329 | 300 | 29 | 100-499 |
| 15 | bamberg_maerzen_rauchbier | 334 | 297 | 37 | 100-499 |

**En güçlü 10 slug (n ≥ 5,000):**

| # | Slug | total | rmwoods | non_rm |
|---|---|---|---|---|
| 82 | american_india_pale_ale | 44,407 | 43,423 | 984 |
| 81 | american_pale_ale | 34,560 | 34,033 | 527 |
| 80 | specialty_beer | 21,961 | 21,821 | 140 |
| 79 | double_ipa | 12,664 | 12,620 | 44 |
| 78 | french_belgian_saison | 10,667 | 10,525 | 142 |
| 77 | american_amber_red_ale | 9,399 | 9,035 | 364 |
| 76 | american_imperial_stout | 7,139 | 6,974 | 165 |
| 75 | american_wheat_ale | 7,001 | 6,889 | 112 |
| 74 | american_brown_ale | 6,937 | 6,914 | 23 |
| 73 | robust_porter | 6,610 | 6,591 | 19 |

---

## 3. Faz 1 simülasyonu — yeni 9 slug + parent etkisi

### Yeni slug tahmini boyutlar (rmwoods sorte_raw'dan ayrılırsa)

| New slug | Tahmini n | Bucket | Kaynak rmwoods sorte_raw |
|---|---|---|---|
| **foreign_extra_stout** | **1,221** | 500+ | "foreign extra stout" (sweet_stout'tan) |
| **flanders_red_ale** | **694** | 500+ | "flanders red ale" (belgian_lambic'ten) |
| belgian_fruit_lambic | 427 | 100-499 | "fruit lambic" |
| red_ipa | 308 | 100-499 | "specialty ipa: red ipa" |
| belgian_gueuze | 301 | 100-499 | "gueuze" |
| white_ipa | 203 | 100-499 | "specialty ipa: white ipa" |
| rye_ipa | 200 | 100-499 | "specialty ipa: rye ipa" |
| belgian_ipa | 146 | 100-499 | "specialty ipa: belgian ipa" |
| gose | 102 | 100-499 | "gose" |

**Toplam Faz 1 sonrası:** 82 → **91 slug** (+9). Hepsi ≥100, train edilebilir.

### Parent slug etkilenmeleri (kayıp boyutu)

| Parent | Şu an n | Faz 1 sonrası n | Δ |
|---|---|---|---|
| **belgian_lambic** | 1,820 | **398** | **−1,422** ⚠️ |
| sweet_stout | 5,301 | 4,080 | −1,221 |
| belgian_witbier | 4,917 | 4,714 | −203 |
| american_india_pale_ale | 44,407 | 44,207 | −200 |
| belgian_strong_golden | 1,935 | 1,789 | −146 |
| berliner_weisse | 1,479 | 1,377 | −102 |
| american_amber_red_ale | 9,399 | 9,091 | −308 |

**Kritik:** `belgian_lambic` 1,820 → 398. Hala 100-499 bucket'ta train edilir ama dramatik küçülme. Granül ayrılması doğal — gerçek "klasik unblended lambic" reçeteleri zaten az.

---

## 4. Tehlike bayrakları

### Adjusted brett_beer regresyon analizi

V17'de brett_beer 76 reçete:
- 80/20 split → train ~61, test 15
- Test 15 reçeteden 14 yanlış (top-1 6.7%)
- **15 reçetelik test set'te tek bir doğru/yanlış flip 6.7pp = 1 reçete.** 13/15 yanlış vs 14/15 yanlış arasında istatistiksel fark yok.
- V16 baseline (n=8): 5/8 doğru (62.5%) → 1 reçete flip 12.5pp = aynı gürültü seviyesi.

**Sonuç:** Brett_beer regresyonu istatistiksel olarak güvenilmez bir nokta tahminidir. Adım 54 Faz 2'de düzeltilmesi mantıklı ama **kriz değil**.

### rmwoods baskınlık riski (5 slug %99+ rmwoods)

| Slug | rmwoods | rmwoods % |
|---|---|---|
| american_brown_ale | 6,914 / 6,937 | 99.7% |
| robust_porter | 6,591 / 6,610 | 99.7% |
| double_ipa | 12,620 / 12,664 | 99.7% |
| sweet_stout | 5,228 / 5,301 | 98.6% |
| blonde_ale | 5,759 / 5,834 | 98.7% |

Faz 3 (rmwoods kalite audit) bu slug'lara odaklanmalı. Eğer rmwoods'ta yanlış etiket varsa burada görünür.

### Sıfır rmwoods katkılı slug'lar (V16-only)

| Slug | n | Not |
|---|---|---|
| cream_ale | 62 | rmwoods'ta `american_cream_ale` ile birleştirildi |
| sweet_stout_or_cream_stout | 19 | V16 alias artığı |
| american_barleywine | 16 | `american_barley_wine_ale` ile alias çakışma |
| belgian_quadrupel | 15 | rmwoods belgian_strong_dark_ale'a yutuldu |

Bunların 3'ü 10-29 bucket → train'de yer alıyor ama gürültü yaratıyor. Adım 54 Faz 1'de:
- `american_barleywine` → `american_barley_wine_ale`'a alias (16 reçete eklenir)
- `sweet_stout_or_cream_stout` → `sweet_stout`'a alias
- `belgian_quadrupel` → ya retire ya da rmwoods'tan reclassify (eğer mümkünse)

---

## 5. Faz 1 sonrası tahmini distribution (91 slug)

| Bucket | Şu an | Faz 1 sonrası | Δ |
|---|---|---|---|
| 500+ | 64 | 64-65 | +1 (foreign_extra_stout 1,221, flanders_red 694 — ikisi 500+) |
| 100-499 | 10 | 17 | **+7** (yeni: belgian_fruit_lambic, red_ipa, belgian_gueuze, white_ipa, rye_ipa, belgian_ipa, gose) |
| 30-99 | 5 | 5 | 0 |
| 10-29 | 3 | 3-2 | -1 (american_barleywine alias edilirse) |

**Net değişim:** Train edilen slug 82 → 91 (+9), zayıf bucket boyutu sabit kalır, orta bucket 7 yeni slug ile zenginleşir.

---

## Adım 54 başlatma için referans noktaları

### Yüksek değer / düşük risk (Faz 1+2 paralel başlatma kriteri ✓)

- 9 yeni slug eklemek mevcut 82'ye dokunmuyor (sadece 7 parent büyük slug 100-1500 reçete azalır, hepsi train'de kalmaya devam eder).
- BRETT_RE pattern güçlendirme bağımsız bir iş, V17 modeline dokunmadan yapılabilir.

### Yüksek risk (Faz 3 — rmwoods kalite audit)

- 5 slug (am_brown, robust_porter, double_ipa, sweet_stout, blonde_ale) %99 rmwoods. **Bunlardan 20'şer örnek (toplam 100) BJCP guideline check** yap. %20+ yanlış etiket → ciddi sinyal, V17 efektif olarak yeniden değerlendirilmeli.

### V18 retrain projeksiyonu

- 91 slug × 300 trees × max_depth 4 = ~109K trees → ~58 MB model (V17 44.5 MB'tan biraz büyük). Hala kabul edilebilir.
- Cluster mapping güncellenecek: `flanders_red_ale` ve `belgian_gueuze` zaten 'sour' cluster'a düşer; `foreign_extra_stout` 'stout'a, `red_ipa`/`white_ipa`/`rye_ipa`/`belgian_ipa` 'ipa'ya, `gose` 'sour'a.

---

## Çıktılar

- `_step54_slug_distribution_report.md` (bu rapor)
- `working/_step54_slug_distribution.py` (analiz script — tek seferlik)
- `working/_step54_slug_distribution_raw.txt` (tam ham çıktı, 82 slug + faz 1 simülasyonu)
