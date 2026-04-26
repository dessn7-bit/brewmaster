# AUDIT STEP 18 — V6 BUILDER FULL İNCELEME

**Tarih:** 2026-04-26
**Hedef dosya:** `Brewmaster_v2_79_10.html` satır 13338-13405 (`V6_DEFAULTS` + `__v6Features` IIFE)
**Dataset:** `_ml_dataset_v6_final_comprehensive.json` (1100 reçete × 79 feature)
**Test reçetesi:** Seed Dark Belgian Dubbel (HTML satır 17609)

---

## 1. Feature kategorize tablosu

V6 builder satır 13350-13404'ten 79 feature, dataset feature schema ile birebir uyumlu (manuel sayım: 5+16+3+16+7+10+4+7+4+7=79 ✓).

### A — Scalar (5)
| Feature | Hesaplama | Beklenen aralık |
|---|---|---|
| og  | `r._og`  | 1.020-1.130 |
| fg  | `r._fg`  | 1.000-1.040 |
| abv | `r._abv` | 0-15 |
| ibu | `r._ibu` | 0-120 |
| srm | `r._srm` | 1-50 |

### B — Malt yüzdeleri (16)
| Feature | Hesaplama (V2c builder regex'i, satır 13277-13291) |
|---|---|
| pct_pilsner | regex `pilsner|pils|bohem|bel_pils|...|pale_ale|...` |
| pct_base | regex `pilsner|pils|pale|maris|munich|vienna|...|wheat` |
| pct_munich | regex `munich|muenchner|...` |
| pct_vienna | regex `vienna|viyana|...` |
| pct_wheat | regex `wheat|bugday|weizen|...` |
| pct_oats | regex `oat|yulaf` |
| pct_crystal | regex `crystal|caramel|cara[_-]?|kristal|caravienna|caramunich|...` |
| pct_choc | regex `choc|chocolate|cikolata|carafa|dehusked` |
| pct_roast | regex `roast|kavrulmus|black|siyah|patent` |
| pct_corn | regex `corn|misir|mais|flaked_corn` |
| pct_rice | regex `rice|pirinc` |
| pct_sugar | regex `sugar|seker|candi|candy|nobet|...` |
| pct_aromatic_abbey | regex `aromatic|abbey|special_b` |
| pct_smoked | `p.smokedPct||0` (V2c'de smokedPct **inşa edilmiyor** — dataset şemasında var ama V2c builder set etmiyor → her zaman 0) |
| pct_rye | `p.ryePct||0` (aynı sorun — V2c'de set edilmiyor) |
| pct_sixrow | **HARDCODED `0`** (satır 13361: `f.pct_sixrow = 0;`) |

### C — Derived malt (3)
| Feature | Hesaplama (satır 13362-13364) |
|---|---|
| total_dark | `p.crystalPct + p.chocPct + p.roastPct` |
| total_adjunct | `p.cornPct + p.ricePct + p.sugarPct` |
| crystal_ratio | `p.crystalPct / max(1, p.baseMaltPct + p.pilsnerPct + p.munichPct)` |

### D — Yeast binary (16) — `_mayaTip` + `mayaId` substring match
Satır 13365-13378. `mt = r._mayaTip||'ale'`, `mid = r.mayaId||''`.
| Feature | Tetik |
|---|---|
| yeast_english | `mt==='ale' && mid içerir 'wlp00'/'wy10'/'wy11'` |
| yeast_american | `mt==='ale' && mid içerir 'us05'/'wy10'/'bry97'` |
| yeast_belgian | `mt==='belcika'` |
| yeast_saison | `mt==='saison'` |
| yeast_wheat_german | `mt==='wheat'` |
| yeast_german_lager | `mt==='lager' && mid içerir 'wy20'/'wy21'/'w-34'` |
| yeast_czech_lager | `mt==='lager' && mid içerir 'wy21'` |
| yeast_american_lager | `mt==='lager' && mid içerir 'wy20'/'s-23'` |
| yeast_kolsch | `mid içerir 'wlp029'/'wy2565'` |
| yeast_altbier | `mid içerir 'wy1007'` |
| yeast_cal_common | `mid içerir 'wlp810'/'wy2112'` |
| yeast_brett | **HARDCODED `0`** (satır 13377) |
| yeast_lacto | **HARDCODED `0`** (satır 13377) |
| yeast_sour_blend | `mt==='sour'` |
| yeast_kveik | `mt==='kveik'` |
| yeast_wit | `mt==='wit'` |

### E — Hop signature (7) — TÜMÜ HARDCODED 0
Satır 13379-13380:

    f.hop_american_c = 0; f.hop_english = 0; f.hop_german = 0;
    f.hop_czech_saaz = 0; f.hop_nz = 0; f.hop_aged = 0; f.hop_northern_brewer = 0;

### F — Katki (10) — 9'u HARDCODED 0
Satır 13381-13384:

    f.katki_lactose = r.lactose ? 1 : 0;
    f.katki_fruit = 0; f.katki_spice_herb = 0; f.katki_chocolate = 0;
    f.katki_coffee = 0; f.katki_chile = 0; f.katki_smoke = 0;
    f.katki_honey = 0; f.katki_pumpkin = 0; f.katki_salt = 0;

Sadece `katki_lactose` veriden besleniyor (`r.lactose` flag — V2c builder'da `_hasKatki(/laktoz|lactose/i)` ile set ediliyor, satır 13293).

### G — Derived flag (4)
Satır 13385-13388:

    f.high_hop = (r._ibu>40) ? 1 : 0;
    f.strong_abv = (r._abv>7.5) ? 1 : 0;
    f.dark_color = (r._srm>15) ? 1 : 0;
    f.pale_color = (r._srm<6) ? 1 : 0;

### H — Process (7) — TÜMÜ V6_DEFAULTS fallback
Satır 13389-13396, pattern: `f.X = (r.X > 0) ? r.X : V6_DEFAULTS.X;`. Ama `__recipeV2` builder'ı bu alanları **set etmiyor** (V2c builder satır 13270-13298 üstüne baktım — mash_temp_c/fermentation_temp_c/water_*/yeast_attenuation/boil_time_min hiçbiri tanımlı değil). Dolayısıyla **`r.X` daima `undefined` → `(undefined > 0) === false` → daima `V6_DEFAULTS.X`**.

V6_DEFAULTS değerleri (satır 13338-13346):

    mash_temp_c: 66
    fermentation_temp_c: 19
    yeast_attenuation: 78
    boil_time_min: 60
    water_ca_ppm: 150
    water_so4_ppm: 250
    water_cl_ppm: 120

### I — Other / fix-value (4)
Satır 13396-13397:

    f.dry_hop_days = (r.dhPer10L>0) ? 5 : 0;   // r.dhPer10L V2c builder'da hardcoded 0 (satır 13296), yani DAİMA 0
    f.mash_type_step = 0;
    f.mash_type_decoction = 0;
    f.lagering_days = (mt==='lager') ? 14 : 0;

### J — Yeast specifik (7)
Satır 13398-13403:

    f.yeast_abbey = (mt==='belcika') ? 1 : 0;
    f.yeast_witbier = (mt==='wit') ? 1 : 0;
    f.yeast_golden_strong = 0;                      // HARDCODED 0
    f.yeast_saison_3724 = (mid.indexOf('wy3724')>=0) ? 1 : 0;
    f.yeast_saison_dupont = (mid.indexOf('dupont')>=0) ? 1 : 0;
    f.yeast_english_bitter = 0;                     // HARDCODED 0
    f.yeast_english_mild = 0;                       // HARDCODED 0

---

## 2. Bug analizi — kategori bazlı

### 2A. Hop signature — KRITIK BUG (7 feature, hepsi 0)

**Builder kodu (satır 13379-13380):**

    f.hop_american_c = 0; f.hop_english = 0; f.hop_german = 0;
    f.hop_czech_saaz = 0; f.hop_nz = 0; f.hop_aged = 0; f.hop_northern_brewer = 0;

**Beslenme kaynağı:** YOK. `S.hoplar[].id` dizisi (`__recipeV2.hopIds`) builder'a giriyor ama hiç **kullanılmıyor**.

**Dataset karşılaştırması (1100 reçete üzerinde — istatistik):**

| Feature | non-zero count | mean | Anlamı |
|---|---:|---:|---|
| hop_american_c | 307/1100 | 0.28 | Citra/Cascade/Mosaic vs. — yaygın sinyal |
| hop_english | 303/1100 | 0.28 | Fuggle/EKG/Goldings vb. |
| hop_german | 344/1100 | 0.31 | Hallertau/Tettnang/Spalt vs. |
| hop_czech_saaz | 139/1100 | 0.13 | Saaz, Premiant |
| hop_nz | 16/1100 | 0.01 | Nelson Sauvin vb. (rare) |
| hop_aged | 1/1100 | 0.00 | Lambic için (very rare) |
| hop_northern_brewer | 25/1100 | 0.02 | Cluster vb. |

**Sonuç:** Dataset'te bu 7 feature aktif kullanılıyor, özellikle hop_german/hop_english/hop_american_c (~28-31% non-zero). UI builder bunları sıfır'a sabitlediği için her UI reçetesi, hop sinyali olmayan az sayıdaki dataset reçetelerine sürükleniyor — KNN distance bozulur. 

**Belgian Dubbel etkisi:** Dataset Dubbel'lerin çoğu hallertau/spalt kullandığı için `hop_german=1` olur. UI Dubbel `hop_german=0` — bir feature mismatch daha. Düşük önem (Dubbel için ana sinyal yeast/malt) ama distance'a katkı verir.

**Düzeltme önerisi:** V2c builder'daki `hopIds[]` kullanarak `signatureFlag(YEAST_SIG.X, hopStr)` benzeri logic uygula (motor V5 zaten satır 567-575'te `HOP_SIG` regex tanımları var — kopyala). **Fix yapma — bu sadece teşhis adımı.**

### 2B. Katki — KÜÇÜK BUG (10 feature, 9'u 0)

**Builder (satır 13381-13384):** sadece `katki_lactose` `r.lactose`'tan besleniyor. Diğer 9 hardcoded 0.

**Dataset istatistik:**

| Feature | non-zero/1100 |
|---|---:|
| katki_lactose | 6 |
| katki_fruit | 7 |
| katki_spice_herb | 10 |
| katki_chocolate | 5 |
| katki_coffee | 7 |
| katki_chile | 2 |
| katki_smoke | **0** (dataset'te de hep 0!) |
| katki_honey | 2 |
| katki_pumpkin | 7 |
| katki_salt | 1 |

**Sonuç:** Dataset'te de bu feature'lar son derece sparse (max 10/1100 = %0.9). Yani bu "bug"un genel KNN performansına etkisi minimal — UI'da 0 olması dataset'in 99%'iyle uyumlu. **Specialty stilleri (Pastry Stout vb.) için 0 olma sorunu, normal stiller için fark etmez.**

**Belgian Dubbel etkisi:** Yok (dataset Dubbel'lerinde de bu feature'lar 0).

**Önem:** DÜŞÜK. Specialty/fruited stiller için orta.

### 2C. Malt yüzdeleri — KRİTİK BUG (dataset'in kendisi de bozuk!)

**Çakışma kanıtı (sum-of-pcts sanity check, dataset üzerinde):**

| Persentil | Sum of 16 pct features |
|---|---:|
| min | 56.7 |
| p25 | 100.0 |
| medyan | **102.4** |
| p75 | **156.0** |
| max | **246.3** |
| Sum > 100.5 | 597/1100 |
| Sum > 120 | 459/1100 |

%100'ü aşan reçete sayısı: 597/1100. Bu şu demek: pct_pilsner ve pct_base aynı malt'ı sayıyor (çakışıyor). pct_pilsner regex `pilsner|...|pale_ale` ve pct_base regex `pilsner|pils|pale|...|munich|vienna` — pale_ale her iki regex'e de uyuyor.

**Pilsner+Base overlap:** 519/1100 reçetede pct_pilsner>5 AND pct_base>5 (yani aynı malt iki kez sayılmış).

**Öne çıkan: dataset_d feature'ları ham olduğu için motor bu çakışmayla zaten eğitildi. Yani UI builder'da çakışma "olmasa" daha kötü olurdu.** Çünkü motor "pale_ale → pilsner=70 AND base=70" davranışını öğrendi.

Ama pct_smoked, pct_rye, pct_sixrow **V2c builder tarafından set edilmiyor**:

- `p.smokedPct` — V2c percents objesinde **yok** (`__recipeV2.percents` 15 alan içerir; smokedPct yok). UI'dan motora `0` olarak akar.
- `p.ryePct` — V2c percents'te **yok**. Aynı sorun.
- pct_sixrow hardcoded 0.

Dataset'te:
- pct_smoked: 20/1100 nonzero (Rauchbier vb.)
- pct_rye: 27/1100 nonzero (Rye IPA, Roggenbier)
- pct_sixrow: 0/1100 (dataset'te de hep 0)

Yani pct_smoked/pct_rye için UI 0 verirse Rauchbier veya Rye IPA reçetelerini doğru sınıflandıramaz. UI'da rye-içeren Belgian Dubbel'de pct_rye=0 → sinyal kayboldu.

**Belgian Dubbel etkisi (mental simülasyon, seed reçetesi malts):**

Maltlar (toplam 3.855 kg): pale_ale 2.0, munich 0.64, chateau_biscuit 0.35, c40 0.2, rye 0.17, c120 0.11, dark_wheat 0.055, rice_hulls 0.13, candy_drk 0.2.

Regex çıktıları:
- pct_pilsner ≈ pale_ale 2.0 / 3.855 = **51.9%** (regex 'pale_ale' match)
- pct_base ≈ (pale_ale 2.0 + munich 0.64) / 3.855 = **68.6%** (pale + munich match)
- pct_munich ≈ 0.64 / 3.855 = **16.6%**
- pct_wheat ≈ dark_wheat 0.055 / 3.855 = **1.4%** (dark_wheat → wheat regex match)
- pct_rice ≈ rice_hulls 0.13 / 3.855 = **3.4%** (rice regex match — ama rice_hulls fermentable değil, BUG)
- pct_rye ≈ rye 0.17 / 3.855 = **4.4%** (ama V2c builder ryePct'i set etmiyor → hash'e 0 düşer!) ← **AYRI BUG**
- pct_sugar ≈ candy_drk 0.2 / 3.855 = **5.2%**
- pct_crystal ≈ 0% (c40, c120 → "cara" regex'e uymuyor — c40 ≠ "cara"). **AYRI BUG** (caramel maltları kategorize edilemiyor!)
- pct_aromatic_abbey ≈ 0 (chateau_biscuit "biscuit" regex'inde değil, "abbey" hiç değil)

Sum: ~152% (çakışmadan dolayı).

**Dataset Dubbel ortalaması:**
- pct_pilsner=64% (UI: 52%)  ← yakın
- pct_base=1.6%, nonzero=2/26 (UI: 69%) ← **MAJOR mismatch — UI'da pale_ale → pct_base'e düşüyor, dataset Dubbel'lerde pct_base ~0**
- pct_munich=17% (UI: 17%) ← perfect
- pct_crystal=4.1% (UI: 0%) ← **mismatch (c40/c120 regex'e uymuyor)**
- pct_aromatic_abbey=1.6% (UI: 0%) ← mismatch (chateau_biscuit aromatic değil)
- pct_sugar=10.9% (UI: 5.2%) ← yakın

**KRİTİK:** UI'nin pct_base=69% değeri, dataset Dubbel'lerin pct_base=1.6% ortalamasından **67 puan farklı**. Bu KNN'de devasa bir distance kontribüsü. (Feature normalize edilmemişse weight × 67² ile patlar.)

### 2D. Yeast binary + specifik — SMOKING GUN BUG

**Builder satır 13368 + 13398:**

    f.yeast_belgian = (mt==='belcika') ? 1 : 0;
    f.yeast_abbey   = (mt==='belcika') ? 1 : 0;

**Aynı koşulla iki feature 1 yapılıyor.**

**Dataset gerçeği — co-occurrence analizi:**

| Kombinasyon | Sayı |
|---|---:|
| yeast_belgian=1 AND yeast_abbey=1 | **0/1100** |
| yeast_belgian=1 AND yeast_abbey=0 | 56 |
| yeast_belgian=0 AND yeast_abbey=1 | 68 |

**Dataset'te bu iki feature MUTUALLY EXCLUSIVE.** UI builder ikisini de aynı anda 1 yapıyor → DATASET'TE HİÇ GÖRÜLMEMİŞ KOMBİNASYON üretiyor.

**Dataset feature → stil eşlemesi:**

`yeast_abbey=1` (68 reçete): **belgian_dubbel(26), belgian_tripel(18), belgian_strong_dark_ale(15), belgian_quadrupel(9)** — yani Trappist ailesi.

`yeast_belgian=1` (56 reçete): french_belgian_saison(14), juicy_or_hazy_india_pale_ale(10), belgian_session_ale(4), pale_ale(3), ipa(3), other_belgian_ale(2), ... — Saison + Belgian-yeast IPA + diğerleri (NOT Dubbel).

**Anlamı:** Dataset'te bu iki feature açıkça ayrı semantik taşıyor:
- `yeast_abbey` = "Trappist/Abbey style yeast" (Dubbel/Tripel/Quadrupel)
- `yeast_belgian` = "Belgian-style yeast in non-Trappist styles" (Saison, Belgian IPA, vb.)

UI builder bu semantiği görmemiş, ikisini de `mt==='belcika'` ile tetikliyor. **UI Dubbel için hem yeast_belgian=1 hem yeast_abbey=1**, ama dataset Dubbel'leri yeast_belgian=0 + yeast_abbey=1. Bu fark **distance hesabında garantili 1 birim** (binary feature, weight kim bilir kaç).

**KRİTİK SONUÇ:** Bu, Dubbel→winter_seasonal_beer yanlış tahmininin **birincil sebebi olabilir**. Tek bir hatalı binary feature, KNN'de yakın komşu havuzunu Trappist'lerden uzaklaştırıp başka bir cluster'a kaydırır.

**Önem:** **KRİTİK** — Dubbel'i doğrudan vuruyor.

### 2E. Process feature'lar — ORTA BUG (per-recipe sinyal kayboluyor)

**Builder (satır 13389-13395):** `f.X = (r.X > 0) ? r.X : V6_DEFAULTS.X;` — ama V2c builder `r.mash_temp_c` vb. set etmiyor → daima `V6_DEFAULTS`.

**V2c builder doğrulaması:** Satır 13270-13298'i taradım — `mash_temp_c`, `fermentation_temp_c`, `water_ca_ppm`, `water_so4_ppm`, `water_cl_ppm`, `yeast_attenuation`, `boil_time_min` **HİÇBİRİ** set edilmiyor. ✓

V6_DEFAULTS değerleri vs dataset medyanları:

| Feature | V6_DEFAULTS | Dataset medyan | Dataset min-max |
|---|---:|---:|---:|
| mash_temp_c | 66 | 66 | 63-68 |
| fermentation_temp_c | 19 | 19 | 9-26 |
| yeast_attenuation | 78 | 78 | 72-88 |
| boil_time_min | 60 | 60 | 60-90 |
| water_ca_ppm | 150 | 150 | 60-350 |
| water_so4_ppm | 250 | 250 | 40-450 |
| water_cl_ppm | 120 | 120 | 50-1000 |

**Kritik bulgu:** V6_DEFAULTS dataset medyanlarına **birebir uyuyor**. Yani UI'dan motora "ortalama bir reçete" sinyali gidiyor. KNN'de tüm UI reçeteleri bu eksende kümeleniyor → process feature'ları **discriminative gücünü kaybediyor**.

Ancak: dataset Dubbel'lerinde `mash_temp_c=67` (default 66'dan farklı), `fermentation_temp_c=20` (default 19'dan farklı), `yeast_attenuation=75` (default 78'den farklı), `water_ca_ppm=150` (default ile aynı). **UI Dubbel default 66/19/78/150 verecek → dataset Dubbel'in 67/20/75/150'sinden 1+1+3+0 = 5 birim uzakta.** Process feature'ları total 7 boyut, küçük katkı.

**Önem:** ORTA. Process'ler ana cluster'ları belirlemez ama dispersion'a katkı.

### 2F. Derived flag + derived malt — KÜÇÜK BUG

**Derived flag (satır 13385-13388):**

    high_hop = (r._ibu>40) ? 1 : 0;     // Dubbel ibu ~14 → 0 ✓
    strong_abv = (r._abv>7.5) ? 1 : 0;  // Dubbel abv ~6.8 → 0 ✓
    dark_color = (r._srm>15) ? 1 : 0;   // Dubbel srm ~17-21 → 1 ✓ (dataset Dubbel ortalaması 0.27, 7/26 dark=1, çoğu 0!)
    pale_color = (r._srm<6) ? 1 : 0;    // Dubbel srm ~17-21 → 0 ✓

**Bug yok — eşikler makul.** Ancak `dark_color`'da bir şey ilginç: dataset Dubbel'lerin **sadece %27'si** `dark_color=1` (yani SRM>15). Çoğu (73%) SRM<15 olarak label'lanmış. Bu UI'nın hesabı değil dataset'in kendi hatası. UI Dubbel SRM=21'le tipikinden daha koyu sinyal veriyor.

**Derived malt (satır 13362-13364):**

    total_dark = crystalPct + chocPct + roastPct
    total_adjunct = cornPct + ricePct + sugarPct
    crystal_ratio = crystalPct / max(1, baseMaltPct + pilsnerPct + munichPct)

**Bug yok formülde — ama:** UI Dubbel'de pct_crystal=0 (c40/c120 regex'e uymuyor), pct_chocolate=0, pct_roast=0 → total_dark=0. Dataset Dubbel total_dark=2.65 ortalama. **Mismatch — c40/c120 regex bug'ından dolayı.**

UI Dubbel total_adjunct = pct_corn(0) + pct_rice(3.4 — rice_hulls!) + pct_sugar(5.2) = ~8.6. Dataset Dubbel adjunct ortalaması ~11 (sugar dominant). Yakın.

---

## 3. Statistiksel kategori karşılaştırması (özet)

Yukarıdaki bulgular birleştirilmiş:

| Kategori | UI'da gerçek dağılım | Dataset'te gerçek dağılım | Bug yapısı |
|---|---|---|---|
| Hop sig (7) | TÜMÜ 0 | %1-31 nonzero | UI körfeziği — tamamı feature kayıp |
| Katki (10) | 9'u 0, lactose dolu | %0-1 sparse | Düşük etkili — dataset de sparse |
| Malt pct (16) | Çakışmalı (sum>100), pct_smoked/pct_rye/pct_sixrow=0 | Çakışmalı (medyan 102), pct_sixrow=0 | UI ile dataset semantiği eşleşik bozuk |
| Yeast binary (16) | semantik bozuk: belgian∩abbey=1 | mutually exclusive | **CRITICAL** |
| Yeast specifik (7) | yeast_abbey her belcika için 1 | Sadece Trappist için 1 | aynı CRITICAL |
| Hop fix-value (7→7) | sıfır | dolu (yukarıda) | aynı 2A bug |
| Process (7) | DAİMA V6_DEFAULTS medyan | gerçek dağılım var | ORTA bug — discriminative kayıp |
| Derived flag (4) | makul | makul | OK |
| Derived malt (3) | crystal regex bug'ı yansır | OK | E2 bağımlı |
| Other (4) | mash_type_step/decoction = 0 | step=97% true, decoction=3% | MOR ATBİR — `mash_type_step=0` UI tüm reçeteler için, dataset'te 1069/1100 = 1. Dev mismatch! |

**Özel keşif — `mash_type_step=0`:**

Dataset'te `mash_type_step=1` 1069/1100 (%97). UI builder hep 0 (`f.mash_type_step = 0;` satır 13397). Yani **her UI reçetesi bu boyutta tek başına dataset cluster'ından uzakta**. Bu da yapısal mismatch.

---

## 4. Belgian Dubbel — UI vs Dataset feature haritası

Seed Dubbel reçetesinden builder'ı geçirsek (mental simulasyon):

| Feature | UI Dubbel | Dataset Dubbel ort. | Mismatch |
|---|---:|---:|:---:|
| og | 1.064 | 1.07 | küçük |
| fg | 1.014 | 1.01 | küçük |
| abv | 6.8 | 7.16 | küçük |
| ibu | 14 | 22.15 | **ORTA (-8 IBU)** |
| srm | 21 | 17.69 | **ORTA (+3 SRM)** |
| pct_pilsner | 51.9 | 63.98 | -12 |
| **pct_base** | **68.6** | **1.60** | **+67 (KRİTİK)** |
| pct_munich | 16.6 | 16.86 | OK |
| pct_crystal | 0 | 4.11 | **-4 (regex bug)** |
| pct_aromatic_abbey | 0 | 1.59 | -1.6 |
| pct_sugar | 5.2 | 10.93 | -5.7 |
| pct_rye | 0 (V2c bug) | — | gerçek 4.4'ü kaybediyor |
| total_dark | 0 | 2.65 | -2.65 |
| **yeast_belgian** | **1** | **0** | **+1 (KRİTİK BINARY)** |
| yeast_abbey | 1 | 1 | OK |
| **yeast_saison_3724** | 0 | 0 | OK |
| **mash_type_step** | **0** | **~1** | **-1 (KRİTİK BINARY)** |
| mash_temp_c | 66 (default) | 67 | -1 |
| ferm_temp_c | 19 (default) | 20 | -1 |
| yeast_attenuation | 78 (default) | 75 | +3 |
| water_ca_ppm | 150 (default) | 150 | 0 |
| dark_color | 1 (srm>15) | 0.27 ort. | uyumlu ama atypical |
| high_hop | 0 | 0 | OK |
| strong_abv | 0 | 0 | OK |
| hop_german | 0 (UI bug) | büyük ihtimal 1 | -1 (binary bug) |

**Anomali sıralaması (KNN distance hesabında en büyük katkı sırasına göre):**

1. **`pct_base = 68.6 vs 1.6` → fark 67² = 4489** — distance bombası. (Pilsner/base regex çakışması, pale_ale her ikisine düşüyor)
2. **`yeast_belgian = 1 vs 0`** — binary feature, dataset'te yapısal mutual exclusion'ı bozuyor. KNN nearest-neighbor algoritmasında bu tek farklı bit, başka cluster komşularını çekebilir.
3. **`mash_type_step = 0 vs 1`** — yapısal binary mismatch, bütün UI reçetelerinde aynı. Tek başına Dubbel'i değil tüm UI sınıflandırma sapmasını yapıyor.
4. **`pct_crystal = 0 vs 4.1`** — c40/c120 regex'e uymuyor (caramel sayılmıyor).
5. **`hop_german = 0 vs ~1`** — UI hop hardcode 0 bug'ı.
6. **`pct_pilsner = 52 vs 64`** — 12 puan altında. Pale_ale-base çakışması yüzünden pct_pilsner kısmen kayboluyor.
7. Process feature'lar (toplam ~5 birim) — küçük katkı.

**Sonuç (Belgian Dubbel için):** Yanlış tahmin (winter_seasonal_beer) **ÇOKLU bug'ın bileşik etkisi**. Tek başına yeast_belgian=1 bug'ı çözülse bile, pct_base mass'ı ve mash_type_step mismatch'i hâlâ Dubbel cluster'ından uzaklaştırıyor. **Yapısal builder revizyonu gerekiyor** (multiple coordinated fixes).

---

## 5. Bug listesi — öncelikli sıra

| # | Bug | Kategori | Etki | Düzeltme zorluğu | Önerilen sıra |
|--:|-----|----------|------|-------------------|--------------:|
| 1 | `yeast_belgian` ve `yeast_abbey` her belcika maya için 1 (dataset'te mutually exclusive — Trappist vs non-Trappist) | yeast_specific + yeast_binary | **KRİTİK** (Dubbel'i doğrudan etkiliyor) | DÜŞÜK (3-4 satır + Trappist vs non-Trappist heuristic) | **1** |
| 2 | `mash_type_step` UI'da daima 0, dataset'te %97 = 1 — tüm reçetelerde yapısal mismatch | other | KRİTİK (genel) | DÜŞÜK (`f.mash_type_step = 1;` veya recipe'den oku) | **2** |
| 3 | `pct_base` regex `pale_ale`/`munich`'i yakalıyor, dataset Dubbel'lerinde pct_base ~0 ortalama (semantik mismatch) | malt pct | KRİTİK (Dubbel için 67 birim uzaklık) | YÜKSEK (regex semantiği yeniden tanımlanmalı; dataset ile aligned olmalı) | 3 (dikkatli) |
| 4 | Hop signature 7 feature hep 0 (V5'te `HOP_SIG` regex var, kopyala) | hop sig | ORTA-KRİTİK (genel) | DÜŞÜK (regex'leri V5'ten al, hopIds[]'yi tara) | 4 |
| 5 | `pct_crystal` regex'i `c40/c120` gibi kısa malt id'lerini yakalamıyor (caramel maltları kategorize edilemiyor) | malt pct | ORTA (Dubbel için 4 birim) | DÜŞÜK (regex'e `^c\d+$` veya `[cС]\d+` ekle) | 5 |
| 6 | V2c builder'da `pct_smoked`, `pct_rye` set edilmiyor (V6 builder'da `||0` ile sıfır akar) | malt pct | ORTA (Rauchbier, Roggenbier, Rye IPA için) | DÜŞÜK (V2c builder'a 2 satır ekle) | 6 |
| 7 | Process 7 feature daima V6_DEFAULTS (per-recipe sinyal kayboluyor) | process | ORTA (genel discriminative kayıp) | ORTA (V2c builder'ı genişlet: S.mashSc → mash_temp_c, S.suMineralleri → water_*) | 7 |
| 8 | Katki 9 feature hep 0 (lactose hariç) | katki | DÜŞÜK (dataset'te de sparse) | DÜŞÜK (V5'in `KATKI_SIG` regex'i kopyala) | 8 |
| 9 | `dry_hop_days` daima 0 (V2c'de `dhPer10L = 0` hardcode) | other | DÜŞÜK | DÜŞÜK | 9 |
| 10 | `mash_type_decoction`, `yeast_golden_strong`, `yeast_english_bitter`, `yeast_english_mild`, `yeast_brett`, `yeast_lacto` — hardcoded 0 | yeast_binary + yeast_specific + other | DÜŞÜK (sparse stiller) | DÜŞÜK | 10 |

**Düzeltme stratejisi (yine fix yapılmıyor — sadece öneri):**

- **Faz 1 — Hızlı kazanım (Dubbel fix beklenen):** Bug #1 (yeast_belgian/abbey ayrımı). Lokal test: maya tipinin yanı sıra `mid.indexOf('abbaye'/'abbey'/'tripel'/'trappist'/'westmalle') >= 0` heuristic ile yeast_abbey=1, başka belcika maya'lar yeast_belgian=1.
- **Faz 2 — Yapısal:** Bug #2 (`mash_type_step = 1` defaultu).
- **Faz 3 — Regex restorasyonu:** Bug #3, #5, #6 — pct_* regex semantiği dataset ile aligned hale getirilmeli. Bu en riskli kısım — yanlış düzeltme tüm motoru bozar.
- **Faz 4 — Hop/Katki:** Bug #4, #8 — V5'ten `HOP_SIG`, `KATKI_SIG` kopyalanır.
- **Faz 5 — Process:** Bug #7 — S → process mapping.

Her faz sonrası Adım 17B harness'ıyla regression test gerek (rapor scope dışı, gelecek adım).

---

**Adım 18 bitti — sadece teşhis.**
