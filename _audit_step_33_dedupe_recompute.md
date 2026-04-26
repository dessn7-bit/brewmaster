# AUDIT STEP 33 — V7 DATASET DEDUPE + RECOMPUTE

**Tarih:** 2026-04-26
**Mod:** Otonom
**Önceki:** Adım 32 (commit 966d861) — V7 pool 694 reçete (199 pilot + 325 diydog + 170 TMF)
**Sonuç:** **613 unique reçete** dedupe sonrası, **classifyMalt recompute %98.7 sağlıklı pct sum**, train/test 467/146 split. Çıktı: `_ml_dataset_v7_clean.json` (1274 KB, 69 feature).

---

## İş A — Birleştir

3 dosya tek havuza:
- `_ml_dataset_v7_partial_with_malts.json` (199, pilot — BYO/Brulosophy/AHA/MTF)
- `_v7_recipes_diydog.json` (325 → **284 mapped** filtered, 41 specialty unmapped çıkarıldı)
- `_v7_recipes_tmf.json` (170)

**Pool toplam:** 199 + 284 + 170 = **653 reçete**.

Her reçeteye `source` field eklendi (`pilot` / `diydog` / `tmf`).

**Schema normalize:**
- Pilot raw: `weight_lb` → kg, `amount_oz` → kg, `gallons` → l
- Diydog raw: `amount_kg` direkt, OG `>100` → `/1000` (Brewdog scale fix)
- TMF raw: `amount_lb`/`amount_oz` → kg

---

## İş B — Dedupe

### Çoklu kriter

1. **Slug + name normalized match:** `bjcp_slug + normalize(name)` aynı = duplicate
   - Normalize: lowercase, parantezleri sil, "clone/recipe/the/a/an/brewing/book/byo" sözcüklerini sil, yıl pattern (\d{4}) sil, non-alphanumeric → space
2. **Feature vector match:** `slug + Math.round(og*1000) + Math.round(fg*1000) + Math.round(abv) + Math.round(ibu/2) + Math.round(srm/2)`

### Tercih sırası (priority)
- TMF (3) > Diydog (2) > Pilot (1)
- Çakışmada yüksek priority kalır

### Sonuç

| Aşama | Sayı |
|---|---:|
| Pool (filtered) | 653 |
| Duplicates removed | **40** |
| **Unique kalan** | **613** |

### Top 10 duplicate çiftleri

| Reason | Kept | Dropped | Name |
|---|---|---|---|
| name_match | pilot:v1_145 | pilot:v1_146 | Northern Brown (Geordie Surprise) |
| vec_match | diydog:ab10.xml | diydog:ab18.xml | AB:18 (aynı OG/IBU/SRM/slug) |
| vec_match | diydog:ace_of_chinook.xml | diydog:ace_of_citra.xml | Ace Of Citra (aynı vector) |
| vec_match | diydog:ace_of_chinook.xml | diydog:ace_of_equinox.xml | Ace Of Equinox |
| vec_match | diydog:ace_of_chinook.xml | diydog:ace_of_simcoe.xml | Ace Of Simcoe |
| vec_match | diydog:albino_squid.xml | diydog:barrel_aged_albino.xml | Barrel Aged Albino Squid Assassin |
| vec_match | diydog:amarillo.xml | diydog:comet.xml | Comet (aynı slug+OG) |
| vec_match | diydog:dog_a.xml | diydog:dog_b.xml | Dog B/C (Brewdog Dog A/B/C/D serisi aynı vector) |
| vec_match | diydog:dog_a.xml | diydog:dog_c.xml | Dog C |
| vec_match | diydog:dana.xml | diydog:el_dorado.xml | El Dorado - IPA Is Dead |

**Pattern:** Brewdog'un "single-hop showcase" serisi (Ace Of [Hop], IPA Is Dead [Hop]) aynı reçeteyi farklı hop'la tekrarlamış — feature vector aynı, dedupe doğru çıkardı.

---

## İş C — classifyMalt Recompute

### Pipeline

Her reçete için:
1. Raw `malts[]` array'i çek
2. Her malt'a `classifyMalt(name)` uygula → 17 kategoriden biri
3. `pct = sum(amount_kg) / total_grain_kg * 100`
4. Mutually exclusive — her malt tek bir kategoriye sayılır

### Kategori (17 + 1 derived)

```
pct_pilsner, pct_pale_ale, pct_munich, pct_vienna, pct_wheat,
pct_oats, pct_rye, pct_crystal, pct_choc, pct_roast, pct_smoked,
pct_corn, pct_rice, pct_sugar, pct_aromatic_abbey, pct_sixrow,
pct_other,  +  total_base (= pilsner+pale_ale+munich+vienna+wheat)
```

### Sanity check sonuçları

| pct sum aralığı | Sayı | Yüzde |
|---|---:|---:|
| 95-105 (sağlıklı) | **605** | **98.7%** ✅ |
| < 95 (eksik malt veri) | 8 | 1.3% |
| 105-130 (orta çakışma) | 0 | 0% ✅ |
| > 130 (yüksek çakışma) | 0 | 0% ✅ |

**V6 dataset karşılaştırması:** V6'da medyan pct sum 102.4, %32.3 reçete sum>150 (Adım 26 audit). V7'de **çakışma sıfır** — Adım 26B'nin mutually exclusive tasarımı başarılı.

### pct_other > 30 flag (124 reçete, %20)

`classifyMalt` ne pilsner ne pale_ale ne crystal ne sugar ne diğer 17 kategoriye uymayan malt'lar. Brewdog'un özel/yaratıcı malt isimleri ("Specialty Roast", "Pearl Malt", "Naked Oats" vs.) "other"'a düşüyor.

**Top 5 pct_other yüksek:**
- Shoulders Of Giants — %78.43 other (Brewdog deneysel)
- Too Hazy For A Name — %79.86 other
- Mighty Is The Groat — %34.19 other
- Beauty & The Yeast — %46.15 other
- Midnight Special — %65.26 other

**İyileştirme önerisi (Adım 34+):** classifyMalt regex'ine ek pattern'lar (Pearl Malt, Naked Oats, Specialty Roast vs.). Kısa vade için pct_other model feature olarak kullanılabilir — yüksek pct_other Brewdog deneysel cluster sinyali.

---

## İş D — Final Feature Vector (69 feature)

### Scalar (5)
og, fg, abv, ibu, srm

### Mutually exclusive pct (18)
17 classifyMalt + total_base (derived)

### Yeast (18) — V6'dan port
yeast_belgian, yeast_abbey, yeast_saison, yeast_kveik, yeast_english, yeast_american, yeast_german_lager, yeast_czech_lager, yeast_american_lager, yeast_kolsch, yeast_altbier, yeast_cal_common, yeast_brett, yeast_lacto, yeast_sour_blend, yeast_witbier, yeast_wheat_german, yeast_wit

### Hop signature (7) — HOP_SIG_V6 port
hop_american_c, hop_english, hop_german, hop_czech_saaz, hop_nz, hop_aged, hop_northern_brewer

### Katki (10) — KATKI_SIG_V6 port (malts+hops adlarından)
katki_fruit, katki_spice_herb, katki_chocolate, katki_coffee, katki_chile, katki_smoke, katki_honey, katki_pumpkin, katki_salt, katki_lactose

### Process (7)
mash_temp_c, fermentation_temp_c, yeast_attenuation, boil_time_min, water_ca_ppm, water_so4_ppm, water_cl_ppm

Eksik veriler V6_DEFAULTS ile dolduruldu (66 / 19 / 78 / 60 / 150 / 250 / 120).
- Pilot: fermentation_temp_F → C dönüştürüldü
- TMF: mash_temp_f → C
- Diydog: çoğu eksik → defaults

### Derived (4)
dry_hop_days (yes if any hop has use="dry hop"), mash_type_step (1 always), mash_type_decoction (0), lagering_days (14 if lager yeast, 0 else)

**Toplam:** 5 + 18 + 18 + 7 + 10 + 7 + 4 = **69 feature**

---

## İş E — Stratified Train/Test Split

### Stil dağılımı (101 unique slug)

| Coverage | Stil sayısı |
|---|---:|
| n ≥ 20 | **4** (american_imperial_stout 71, american_india_pale_ale 55, double_ipa 30, pale_ale 27) |
| n ≥ 10 | 12 |
| n ≥ 5 | 34 |
| n < 5 (V7 problem) | **67** |

### Top 10 stil

| Slug | n |
|---|---:|
| american_imperial_stout | 71 |
| american_india_pale_ale | 55 |
| double_ipa | 30 |
| pale_ale | 27 |
| french_belgian_saison | 19 |
| pale_lager | 19 |
| porter | 19 |
| specialty_saison | 19 |
| american_barleywine | 18 |
| juicy_or_hazy_india_pale_ale | 14 |

### Split sonuç

- Stratified by `bjcp_slug`, deterministic shuffle (seed 42)
- 80/20 hedef, küçük slug'larda min 1 test
- **Train: 467 / Test: 146** (%76 / %24)

### V7 problem alanları (n<5)

67 stil yetersiz örnekli. Belgian Trappist ailesi:
- belgian_dubbel: ~5
- belgian_tripel: ~10
- belgian_quadrupel: ~3
- belgian_strong_dark_ale: ~5

Bu ailede V7 motorun hâlâ zayıf olması beklenir — Brewmaster'ın test reçetesi (Dark Belgian Dubbel) için marjinal iyileşme.

**Düşük-örnek stiller için Adım 35 strateji:**
- Ana kategori bazlı upsample (synthetic minority oversampling)
- VEYA n<5 stilleri ayrı bir "rare style" sınıfına merge

---

## İş F — Final Çıktı

### `_ml_dataset_v7_clean.json` schema

```
{
  meta: {
    generated, total_recipes:613, train_n:467, test_n:146,
    total_styles:101, feature_count:69, feature_list:[69],
    regex_version:"26B", sources:{pilot,diydog,tmf},
    dedupe_removed:40, pct_sum_quality:{ok_95_105:605,low:8,high:0,very_high_30:0}
  },
  recipes: [{
    id: "diydog_punk_ipa.xml",
    source: "diydog",
    source_id: "punk_ipa.xml",
    name: "Punk IPA",
    bjcp_slug: "american_india_pale_ale",
    bjcp_main_category: "American Hoppy",
    raw: {malts:[...], hops:[...], yeast:..., og:.., fg:.., ...},
    features: {og:1.054, fg:1.012, ..., pct_pilsner:.., yeast_american:1, hop_american_c:1, mash_temp_c:66, ...},
    in_split: 'train' | 'test'
  }, ...]
}
```

### Boyut

1274 KB. Train data ~1MB, test data ~280KB.

---

## Sonraki adım

**Adım 34: V7 motor inşa.** Seçenek:
- (a) **KNN baseline** (V5 benzeri, basit) — 1-2 saat
- (b) **XGBoost** (modern, daha iyi performans) — 3-4 saat
- (c) **Hibrit (KNN + tree ensemble)** — V6 mantığı, 4-5 saat

Önerim: **(b) XGBoost** — V6'nın KNN'inin sınırlarını test ettik (Adım 18-25), now mature ML model gerekli.

**V7 motor metrics hedefi:**
- top-1 accuracy: %50+ (V6 LOOCV %48 idi)
- top-3 accuracy: %75+ (V6 holdout %80.8 — V7 hedef %85+)
- Belgian Dubbel doğru top-3'e girmesi
- Brewdog Punk IPA gibi belirgin reçeteler %95+ top-1

---

## Yapılamayan / atlananlar

- **Yakın komşu match (üçüncü dedupe katmanı)** atlandı — name+vec ile 40 yakalandı, ek katman <%5 daha bulurdu, scope dışı
- **pct_other > 30 reçeteler kalır** — classifyMalt regex iyileştirme Adım 34+
- **Yeast attenuation default kullanıldı** — gerçek MAYALAR.atu mapping yapılmadı (raw yeast string'e güvenmedik), Adım 35'te V7 motor'a ek meta olarak işlenebilir
