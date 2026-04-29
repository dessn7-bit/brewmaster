# Adım 56 Pre-flight — V18.2 ≤250 Reçete Slug'ların Detaylı Analizi

**Tarih:** 2026-04-29  
**Dataset:** `working/_v18_2_dataset.json` (301,316 reçete, 96 feature, 124 unique slug, 91 train slug ≥10)  
**Production model:** V18.2 (commit 82ad4eb, deploy 2026-04-29 01:16)  
**Kapsam:** Bu rapor V18.2'de **train edilebilir ama zayıf** olan slug'ların her birini ayrı paragraf halinde analiz eder. Her slug için: dataset durumu, V18.1 → V18.2 değişimi, holdout test sonucu, confusion analizi, BJCP plausibility, Adım 56 önerisi.

---

## 1. V18.2 ≤250 Reçeteli Slug Listesi (en az→çok sırasıyla)

13 slug ≤250 bucket'ında, 2 slug (belgian_gueuze 301, red_ipa 308) kritik zayıf olduğu için listeye dahil edildi.

| # | Slug | Cluster (14cat) | n V18.2 | n V18.1 | V18.2 t1 | V18.2 t3 |
|---|---|---|---|---|---|---|
| 1 | dunkles_bock | bock | 69 | 69 | 0.0% | 21.4% |
| 2 | brett_beer | sour | 76 | 76 | 0.0% | 26.7% |
| 3 | german_oktoberfest_festbier | lager | 80 | 80 | 6.2% | 43.8% |
| 4 | kellerbier | lager | 89 | 89 | 11.1% | 27.8% |
| 5 | belgian_quadrupel | belgian | 89 | 15 | 0.0% | 11.1% |
| 6 | gose | sour | 102 | 102 (yeni V18) | 25.0% | 60.0% |
| 7 | english_pale_ale | pale_ale | 102 | 102 | 5.0% | 25.0% |
| 8 | juicy_or_hazy_india_pale_ale | ipa | 132 | 132 | 50.0% | 65.4% |
| 9 | belgian_ipa | belgian | 146 | 146 (yeni V18) | 10.3% | 24.1% |
| 10 | rye_ipa | ipa | 200 | 200 (yeni V18) | 15.0% | 57.5% |
| 11 | golden_or_blonde_ale | cream | 200 | 200 | 15.0% | 30.0% |
| 12 | white_ipa | ipa | 203 | 203 (yeni V18) | 22.0% | 29.3% |
| 13 | mixed_fermentation_sour_beer | sour | 213 | 213 | 16.3% | 44.2% |
| 14 | belgian_gueuze | sour | 301 | 301 (yeni V18) | 8.3% | 35.0% |
| 15 | red_ipa | ipa | 308 | 308 (yeni V18) | 6.5% | 40.3% |

**Alias merge V18.1 → V18.2 sonuçları (≤250 bucket'ı etkileyen):**
- `belgian_quadrupel`: 15 → 89 (+74) — quadrupel/quad alias merged in (brewtoad dominant)
- `american_barleywine` (16) → `american_barley_wine_ale` (2,499'a katıldı, ayrı slug yok artık)
- `sweet_stout_or_cream_stout` (19) → `sweet_stout` (4,101'e katıldı)
- `cream_ale` (62) → `american_cream_ale` (3,397'ye katıldı)

V18.1'de 16 zayıf slug vardı; V18.2'de 4'ü merge edildi, 1'i (belgian_quadrupel) bucket'tan büyüdü ama hala zayıf, net 13 kaldı.

---

## 2. Özet Bulgu — rmwoods/brewersfriend Null-Metric Sorunu

V18.2 kritik finding: **rmwoods alt-kaynak `brewersfriend` reçetelerinde OG/FG/IBU/SRM null** (sample dump'larda görülüyor — `og: null, fg: null, ibu: null` pattern). Yalnız `sorte_raw` (BJCP slug etiketi) ve grain/yeast metadata var.

Bu, "yeni 9 slug" performansının düşük olmasının ana sebebi. Aşağıdaki slug'lar brewersfriend-dominant (≥%95) ve V18.2 t1 düşük:

| Slug | brewersfriend % | V18.2 t1 |
|---|---|---|
| white_ipa | 99% (201/203) | 22.0% |
| rye_ipa | 99% (197/200) | 15.0% |
| red_ipa | 99% (306/308) | 6.5% |
| belgian_ipa | 97% (141/146) | 10.3% |
| gose | 95% (97/102) | 25.0% |
| golden_or_blonde_ale | 92% (185/200) | 15.0% |

Karşılaştırmalı: aha/byo/braureka dominant slug'ların metrik datası tam, modelin discriminator gücü yüksek (örn. `juicy_or_hazy` braureka+tmf kuvvetli, %50 t1).

**Stratejik sonuç:** Yeni dataset eklemede metric-rich kaynak (BYO, AHA, braureka, mmum) tercih edilmeli. Yeni "specialty IPA" alt-stillerinde brewersfriend sadece etiket bilgisi veriyor, model OG/IBU farkını öğrenemiyor.

---

## 3. Slug-bazında Detaylı Analiz (15 slug)

### dunkles_bock (V18.2: 69 reçete, 🔴 0.0% top-1)

**Cluster (14cat):** bock

**Dataset durumu:**
- V18.2: 69 reçete (V18.1 ile aynı, alias merge etkilemedi)
- Source baskınlık: rmwoods/brewersfriend %42 (29), recipator %28 (19), braureka %28 (19), aha %3 (2)
- BYO/MMUM yok

**Holdout test sonuçları:**
- Test n=14 (20% split)
- V18.2 top-1: 0.0% / V18.1 top-1: 21.4% → **🔴 -21.4pp** (tüm V18.2 retrain'in en büyük slug regresyonu)
- V18.2 top-3: 21.4% / V18.1 top-3: 64.3% → **🔴 -42.9pp**
- KARŞILAŞTIRMA: V6 KNN'de de %0.0 (`_step55_post_rapor_C`)

**Confusion analizi:**
- Yanlış predict edildiği slug'lar (V18.1 verisinden, V18.2 ayrıntısı yok): german_bock (4/14), baltic_porter (2), german_doppelbock (2)
- Bock ailesi içinde karışıklık baskın — discriminator yetersiz
- Feature engineering Adım 55: pct_oats_high, pct_rye_high, has_late_hop, ibu_og_ratio, og_fg_ratio eklendi — bock'a hiç fayda yapmadı (zaten lager-tipi feature setiyle olmazdı). Reg tuning (alpha=1.0, lambda=2.0, mcw=5) bu küçük örneklemde overfitting önledi ama bock alt-tipleri için ayırt edici değil

**BJCP plausibility (sample 8):**
- recipator_10098 "lager 2" OG 1.069/FG 1.015/IBU 29/SRM 23/ABV 6.9 ✓ BJCP traditional bock range (OG 1.064-1.072, IBU 20-27, SRM 14-22)
- recipator_10230 "Cardboard Bock" OG 1.071/IBU 25/SRM 15 ✓
- recipator_10272 "SKH_Bock" OG 1.077/SRM 22/ABV 7.2 ✓
- recipator_1681 "Bocktoberfest" OG 1.078/IBU 38/SRM 21/ABV 7.8 — IBU outlier (BJCP max 27, ama doppelbock-sınırı)
- 8/8 BJCP plausible, etiket gürültüsü yok. Sorun veri yetersizliği DEĞİL — slug bock-aile içinde germane discriminator yok (oats/rye yok, yeast aynı, mash temp featuru yok).

**Adım 56 önerisi:**
- Ek dataset: **mmum dunkles_bock filter** (German kaynak, ~30-50 reçete bekleniyor); Brewfather public recipes API (eğer açıksa); BeerXML community shares
- Yeni feature: **mash_temp** (dunkles_bock 65-67°C tipik, doppelbock 64-65°C, baltic_porter 68°C) — şu an feature_list'te yok
- **lagering_days** veya **decoction** boolean — German lager ailesi için çok diskriminatif
- Slug birleştirme: **DEĞİL**, BJCP ayrı stil
- Effort: 6 saat (mmum scrape filter + mash_temp feature compute + retrain test)
- **Öncelik: ORTA** — küçük örneklem (test n=14 → istatistiksel gürültü payı yüksek), düzeltme zor ama sample boyut düşük olduğu için production etki minimal

---

### brett_beer (V18.2: 76 reçete, 🔴 0.0% top-1)

**Cluster (14cat):** sour

**Dataset durumu:**
- V18.2: 76 reçete (V18.1 ile aynı)
- Source baskınlık: rmwoods/brewersfriend %63 (48), byo %21 (16), aha %14 (11), tmf %1 (1)
- byo+aha+tmf %36 metric-rich kaynak — brewersfriend null payı yüksek

**Holdout test sonuçları:**
- Test n=15
- V18.2 top-1: 0.0% / V18.1 top-1: 6.7% → **🔴 -6.7pp** (1 doğruyu da kaçırdı)
- V18.2 top-3: 26.7% / V18.1 top-3: 26.7% → ⚪ +0.0pp (top-3 stabil, model "sour ailesi" tespit ediyor ama brett'i ayıramıyor)

**Confusion analizi:**
- Yanlış predict slug'lar: french_belgian_saison (5/15), mixed_fermentation_sour_beer (3), american_pale_ale (2)
- Saison karışıklığı **kritik**: Brett'li saison tarzları (Saison Rue, Bam Biere clones) gerçekten sınırda. Sample 6 "Terreux Saison Rue clone" görüldü — etiket "brett_beer" ama Saison-Brett crossover
- Mixed-ferm sour ile karışıklık doğru (her ikisi de Brettanomyces içerir); BJCP'de Brett Beer = %100 Brett primary, mixed-ferm = Brett+Lacto+Pedio karışım. Ayırt edici feature: yeast count + sec_yeast presence
- has_brett feature (V18'de eklendi) sample 8/8'de pozitif olmalı ama saison'da da pozitif → discriminator zayıflığı

**BJCP plausibility (sample 8):**
- byo_108186 "All-Grain" OG 1.049/FG 1.009/IBU 22/SRM 3 ✓ Brett Pale-tipi (BJCP 28A range OG 1.040-1.080)
- byo "Muscat Brett Saison clone" OG 1.056/FG 1.007/ABV 6.8 — yeast crossover (Saison+Brett, etiket "brett_beer" ama saison karakteri belirgin)
- byo "Belgian Strong Golden" OG 1.072/FG 1.011/ABV 7.9 — strong golden + Brett, BJCP'de "Brett Beer" tag'lenebilir ama Golden Strong da
- byo "Black Velvet Stout" OG 1.058/SRM 55 — **Brett Stout** edge case
- byo "Flanders Red" OG 1.057/SRM 15 — etiket yanlış olabilir (Flanders Red = oud_bruin/flanders_red_ale slug'larında olmalı)
- 7/8 BJCP-uyumlu, 1 etiket gürültü şüphesi (Flanders Red)

**Adım 56 önerisi:**
- Ek dataset: **MTF Wiki SKIP** (Adım 52 audit, sadece 4 reçete page); **The Mad Fermentationist blog scrape** (~40 brett-pure reçete tahmini); **AHA NHC Wild/Sour kategorisi filter** (~20 ek)
- Yeni feature: **brett_only_yeast** boolean (yeast.lab/strain'de sadece Brett, Sacc yok) — discriminator anahtarı; **dry_hop_after_brett** flag (Brett dry hop interaction)
- Slug birleştirme: **HAYIR** — Brett Beer BJCP'de gerçek bir kategori (28A); ama sour cluster içi tie-break gerek
- Feature crossover fix: **saison vs brett_beer ayrımı için yeast_brett_only feature kritik**
- Effort: 8 saat (3 kaynak scrape ~30 reçete + brett_only_yeast feature compute + retrain)
- **Öncelik: YÜKSEK** — sour cluster'ın kalitesi için Brett ayırt edilmeli, mevcut %0 utanç verici

---

### german_oktoberfest_festbier (V18.2: 80 reçete, 🟢 6.2% top-1)

**Cluster (14cat):** lager

**Dataset durumu:**
- V18.2: 80 reçete (V18.1 ile aynı)
- Source baskınlık: rmwoods/brewersfriend %48 (38), recipator %24 (19), braureka %19 (15), mmum %4 (3), roerstok %3 (2), tmf+byo+aha %4

**Holdout test sonuçları:**
- Test n=16
- V18.2 top-1: 6.2% (1/16) / V18.1 top-1: 0.0% → **🟢 +6.2pp** (küçük improvement, hala çok zayıf)
- V18.2 top-3: 43.8% (7/16) / V18.1 top-3: 25.0% → **🟢 +18.8pp** (anlamlı top-3 gain — feature engineering işe yaradı)
- Reg tuning (mcw=5) küçük örnekleme overfitting önledi

**Confusion analizi:**
- Yanlış predict slug'lar: german_maerzen (6), munich_helles (3), german_koelsch (2)
- Festbier ↔ Märzen karışıklığı **klasik problem** — modern Festbier (1990 sonrası) = pale Helles-tipi, klasik Märzen-tipi 1953'ten önce. BJCP 4B (modern Festbier) vs 4B (Märzen tipi) overlap büyük
- Sample data'da `sorte_raw` "Märzen/Oktoberfest" baskın → etiketleme tutarsızlığı; recipator ve braureka kaynakları German "Märzen/Oktoberfest" tag kullanıyor, model bunu festbier'a vs märzen'a gönderirken kararsız
- mmum 3 reçete "Helles" sorte_raw'a sahip ama festbier slug'lı (etiket gürültüsü)

**BJCP plausibility (sample 8):**
- recipator_4408 "Oktoberfest" OG 1.054/FG 1.012/ABV 5.4/IBU 20/SRM 9 ✓ BJCP 4B range
- mmum_1016 "Sengenthaler Festbier" OG 1.0505/IBU 25/SRM 7.6 ✓
- mmum_266 "Hefebier mit Cascade" OG 1.0568/IBU 30/SRM 9.1 ✓ (IBU yüksek sınır)
- mmum_563 "Festbier Märzen" sorte_raw "Helles" — **etiketleme inconsistency**
- recipator_10477 "Satan's Oktoberfest" OG 1.062/IBU 22/SRM 8 ✓ 
- 8/8 BJCP plausible (range içinde) ama 1 etiket tutarsızlığı

**Adım 56 önerisi:**
- Ek dataset: **mmum festbier filter** (~15-20 reçete daha potansiyel, German kaynak doğru etiketleme); **Bayrische Brauerschule public recipes** (varsa)
- Yeni feature: **lagering_days** (festbier 4-6 hafta, märzen 8-12 hafta — discriminator), **decoction_count** (festbier modern infusion tek, märzen klasik triple decoction)
- Slug birleştirme: **DÜŞÜN** — Festbier ile Märzen birleştirme kararı stratejik (BJCP 2021'de ayrı, ama dataset'te overlap %75) — Kaan kararı
- Effort: 4 saat (mmum scrape + lagering_days feature)
- **Öncelik: ORTA** — top-3 +18.8pp gain V18.2'de iyi, top-1'i artırmak için lagering_days kritik

---

### kellerbier (V18.2: 89 reçete, 🟢 11.1% top-1)

**Cluster (14cat):** lager

**Dataset durumu:**
- V18.2: 89 reçete (V18.1 ile aynı)
- Source baskınlık: **mmum %35 (31)** ⭐ German metric-rich!, braureka %33 (29), rmwoods/brewersfriend %31 (28), recipator %1 (1)
- Tek German-kaynak ağırlıklı slug bu listede — sample data kalitesi yüksek

**Holdout test sonuçları:**
- Test n=18
- V18.2 top-1: 11.1% (2/18) / V18.1 top-1: 5.6% → **🟢 +5.6pp**
- V18.2 top-3: 27.8% (5/18) / V18.1 top-3: 16.7% → **🟢 +11.1pp**
- Feature engineering anlamlı gain getirdi

**Confusion analizi:**
- Yanlış predict slug'lar: german_maerzen (4), german_pilsener (3), dortmunder_european_export (2)
- Kellerbier = unfiltered Helles/Märzen-tipi, doğal karbonatlama. **Kategori tanımı zayıf** — bazı kaynaklar Pils-style, bazıları Märzen-style Kellerbier üretiyor
- Sample 4 mmum_1042 "Wolf's dunkel" SRM 22.9 → bu actually dark Kellerbier (BJCP 7A range 4-22 SRM, sınırda). Sample 4 mmum_1069 "Klosterbier a.d.Ruhr" SRM 50.8 → çok koyu, BJCP-dışı (parse hatası şüphesi veya alt-stil)

**BJCP plausibility (sample 8):**
- mmum_549 "Kellerbier" OG 1.0526/IBU 26/SRM 12.2 ✓ BJCP 7A pale Kellerbier (SRM 4-12 sınır), borderline
- mmum_1037 "Jürgen's" OG 1.0526/IBU 34/SRM 12.7 ✓
- mmum_1042 "Wolf's dunkel" SRM 22.9 — dark Kellerbier (BJCP'de değil, dialectal)
- mmum_1069 "Klosterbier" SRM 50.8 — **OUTLIER** (parse hatası şüphesi, normal Kellerbier max SRM 22)
- mmum_1092 "Gohrer" OG 1.0484/IBU 26/SRM 6.1 ✓ pale style
- mmum_1141 "Kaminfeuer" OG 1.0526/IBU 26/SRM 7.6 ✓
- 7/8 BJCP plausible, 1 outlier (Klosterbier SRM 50.8 — drop adayı)

**Adım 56 önerisi:**
- Veri kaliteli, **outlier düşür** (mmum_1069 SRM 50.8 sanity-check)
- Ek dataset: **mmum recently added recipes** (~10-20 ek), Bayrische Bierfreunde forum scrape
- Yeni feature: **carbonation_level_natural** (Kellerbier doğal karbonasyon), **filter_unfiltered** boolean (Keller = unfiltered tanım gereği)
- Slug birleştirme: **HAYIR** — BJCP 7A ayrı stil
- Feature crossover fix: pale Kellerbier ↔ Helles ayrımı için natural_carbonation kritik
- Effort: 5 saat (mmum filter + 2 yeni feature + outlier sanity)
- **Öncelik: ORTA** — German segment için önemli, mmum kanıtladı ki German-kaynak kalite yüksek

---

### belgian_quadrupel (V18.2: 89 reçete, 🔴 0.0% top-1)

**Cluster (14cat):** belgian

**Dataset durumu:**
- V18.2: 89 reçete (V18.1: 15) → **+74 alias merge** ("quadrupel"/"quad"/"trappist quad" aliases merged)
- Source baskınlık: rmwoods/brewtoad %55 (49), rmwoods/brewersfriend %26 (23), roerstok %6 (5), braureka %4 (4), twortwat+tmf+byo+amervallei %9
- **brewtoad dominant** — brewtoad reçeteleri brewersfriend'e göre daha fazla metric data içeriyor ama yine de %55'i null OG/FG'a sahip

**Holdout test sonuçları:**
- Test n=18 (alias merge sonrası 18'e çıktı, V18.1'de n=3'tü — daha güvenilir test artık)
- V18.2 top-1: 0.0% / V18.1 top-1: 0.0% → ⚪ +0.0pp (sıfır kaldı, alias merge yardım etmedi)
- V18.2 top-3: 11.1% (2/18) / V18.1 top-3: 33.3% (1/3) → **🔴 -22.2pp** (test büyüdü ama top-3 düştü, alias eklenen 74 reçete model'i bulandırdı)

**Confusion analizi:**
- V18.1 confusion (n=3): stout (1), belgian_blonde_ale (1), belgian_strong_dark_ale (1) — her birinde 1 yanlış, sample küçüktü
- V18.2 confusion: belgian_strong_dark_ale ile karışıklık baskın (Quad ile BSDA çok yakın — Quadrupel BJCP 26D, BSDA 26C; OG 1.085+ vs 1.075+ overlap)
- Trappist filter (Adım 55'te eklendi) Quad'ı belgian_strong_dark_ale'den ayırmaya yetmedi — Westvleteren/Rochefort 10 BSDA mı Quad mı, BJCP-içi tartışmalı

**BJCP plausibility (sample 8):**
- braureka_12721 "Westvleteren Clon TW12" OG 1.1015/FG 1.0161/ABV 12/IBU 34/SRM 44.7 ✓ Klasik Quad (Westvleteren 12)
- braureka_47889 "Istari-Trank" OG 1.0564/FG 1.0098/ABV 6.2/SRM 3.6 — **etiket yanlış**, ABV 6.2 + SRM 3.6 = Belgian Pale Ale, Quad değil (BJCP min OG 1.085)
- braureka_53614 "Klosterbruder" OG 1.0513/ABV 5.5 — yine **etiket yanlış**, Quad min OG 1.085
- braureka_54560 "Le Tripper" OG 1.0654/ABV 7 — Tripel range, Quad değil
- roerstok_291 "Quadrupel" OG 1.095/ABV 9.84 ✓
- twortwat_161 "Chimay Blauw" OG 1.08/ABV 9 ✓
- tmf "Easter Spiced Pomegranate Quadruppel" OG 1.082 ✓ borderline
- 5/8 BJCP-uyumlu, 3 **etiket gürültüsü** (Istari, Klosterbruder, Le Tripper aslında BPA/Tripel) — alias merge'de "Trappistenbier" Almanca tag herşeyi Quad sınıfladı

**Adım 56 önerisi:**
- **Acil veri temizliği:** alias merge filter sıkılaştır — "Trappistenbier" + OG ≥ 1.085 birlikte gerek (yoksa BSDA/Tripel/BPA olabilir)
- Yeni feature: **dark_candi_sugar** boolean, **rochefort_yeast** strain spesifik flag
- Slug birleştirme: **DÜŞÜN** — belgian_quadrupel + belgian_strong_dark_ale single slug "belgian_dark_strong" yapma kararı (BJCP 2021'de neredeyse eş anlamlı, AHA tek kategori) — Kaan kararı
- Feature crossover fix: BSDA tier-break için **dark_candi_sugar + Westmalle/Rochefort yeast strain**
- Ek dataset: BJCP-only sources (NHC winners) ~20 ek
- Effort: 6 saat (alias filter sıkılaştır + Trappistenbier sanity drop + dark_candi feature)
- **Öncelik: YÜKSEK** — alias merge regresyonu gösterdi, veri kalitesi sorunu var, hemen düzeltilmeli

---

### gose (V18.2: 102 reçete, 🔴 25.0% top-1)

**Cluster (14cat):** sour

**Dataset durumu:**
- V18.2: 102 reçete (V18.1'de yeni eklendi, V17'de yoktu)
- Source baskınlık: **rmwoods/brewersfriend %95 (97)**, tmf+braureka+twortwat+byo %5 (5)
- **Aşırı brewersfriend dominant** → metric data null, sadece sorte_raw="gose"

**Holdout test sonuçları:**
- Test n=20
- V18.2 top-1: 25.0% / V18.1 top-1: 40.0% → **🔴 -15.0pp** (regresyon)
- V18.2 top-3: 60.0% / V18.1 top-3: 45.0% → **🟢 +15.0pp** (top-3 daha iyi, sour ailesi tespit ediliyor)
- V18.2 t1 düşüşü has_late_hop %70 dağılım nedeniyle olabilir (low-entropy feature gose-specific bilgi vermez)

**Confusion analizi:**
- Yanlış predict slug'lar: south_german_hefeweizen (3), berliner_weisse (3), specialty_beer (2)
- **Berliner Weisse karışıklığı kritik** — her ikisi de düşük OG sour wheat. Gose ekstra: tuz + coriander. Bunlar dataset'te feature olarak yok (sadece raw text)
- Hefeweizen karışıklığı yeast crossover (Brett/Lacto + wheat malt + low IBU)
- Specialty karışıklığı normal (sour cluster nadir)

**BJCP plausibility (sample 8):**
- tmf "Gose: NEIPA Principles" OG 1.041/FG 1.005/ABV 4.7/IBU 0/SRM 5.3 ✓ BJCP 27 range
- tmf "Sour Leipziger Gose" OG 1.053/IBU 10.3/SRM 4.6 ✓
- braureka_53316 "Quitt-it" OG 1.068/FG 1.0129/ABV 7.4 — **OUTLIER** (BJCP gose max OG 1.056, ABV 4.2-4.8; bu reçete imperial gose tipi olabilir)
- twortwat_364 "Gans?" OG 1.051/IBU 13/SRM 3 ✓
- byo "Raspberry Gose" OG 1.046/IBU 0/SRM 3 ✓
- rmwoods 3 reçete tüm metric null — sadece sorte_raw="gose"
- 4/8 BJCP-uyumlu, 1 outlier (imperial gose), 3 metric-yok

**Adım 56 önerisi:**
- Ek dataset: **MTF Wiki SKIP** (Adım 52); **AHA NHC sour kategorisi filter** (~10-15 ek metric-rich); **BYO sour-recipes scrape** (~5-10)
- Yeni feature: **has_salt** boolean (misc.name'de "salt" veya "salzig"), **has_coriander** boolean (misc.name) — gose imza ingredient
- Slug birleştirme: **HAYIR** — gose BJCP 27, distinct
- Feature crossover fix: berliner_weisse ↔ gose ayrımı için has_salt + has_coriander kritik
- Effort: 5 saat (NHC scrape + 2 ingredient feature)
- **Öncelik: YÜKSEK** — sour cluster için önemli, salt/coriander feature kolay implementasyon

---

### english_pale_ale (V18.2: 102 reçete, 🔴 5.0% top-1)

**Cluster (14cat):** pale_ale

**Dataset durumu:**
- V18.2: 102 reçete (V18.1 ile aynı)
- Source baskınlık: rmwoods/brewersfriend %35 (36), aha %30 (31), recipator %24 (24), mmum %5 (5), braureka %4 (4), twortwat %2 (2)
- **Balanced source distribution** ⭐ — metric data %65 mevcut

**Holdout test sonuçları:**
- Test n=20
- V18.2 top-1: 5.0% / V18.1 top-1: 10.0% → **🔴 -5.0pp**
- V18.2 top-3: 25.0% / V18.1 top-3: 20.0% → **🟢 +5.0pp**
- Top-1 regresyonu küçük örneklem gürültüsü (1 reçete farkı)

**Confusion analizi:**
- Yanlış predict slug'lar: american_pale_ale (5), extra_special_bitter (3), special_bitter_or_best_bitter (3)
- **APA karışıklığı klasik** — English vs American Pale Ale ayrımı yeast (English = Wyeast 1968, US = US-05) ve hop (English = EKG/Fuggles, US = Cascade/Centennial). Sample'da yeast metadata çoğunda yok
- ESB / Best Bitter karışıklığı **etiketleme gürültüsü** — English Pale Ale ile Best Bitter BJCP 2021'de çok yakın (English Pale Ale BJCP'de yok aslında, "British Golden Ale" var, dataset'te legacy etiket); sample'da 8/8'den 5 tanesi sorte_raw="Bitter" → bunlar aslında bitter slug'a gitmeli
- Etiket gürültüsü **YÜKSEK**

**BJCP plausibility (sample 8):**
- mmum_1245 "Timmy" OG 1.0409/IBU 32/SRM 5.6 — **sorte_raw "Pale Ale"** ✓
- mmum_1320 "D|C ESB" sorte_raw "Bitter" — **etiket yanlış**, ESB slug'a gitmeli
- mmum_1517 "Daylight Robbery" sorte_raw "Pale Ale" ✓
- mmum_1569 "Fuggles Best Bitter" sorte_raw "Bitter" — **etiket yanlış**, ordinary_bitter slug'a
- twortwat_141 "Ordinary Bitter" sorte_raw "Bitter" — **etiket yanlış**
- recipator_10256 "Styrlicius" sorte_raw "English Pale Ale ?" — soru işareti ile etiketlemeci kararsız
- recipator_1068 "Maris Otter Best Bitter" sorte_raw "English Best (Special) Bitter" — **etiket yanlış**, special_bitter_or_best_bitter slug'a
- 3/8 doğru, 5/8 etiket yanlış (bitter kategorisine ait olanlar EPA'ya kaydedilmiş)

**Adım 56 önerisi:**
- **Acil etiket temizliği** — sorte_raw="Bitter" olanları (5/8 sample'da) special_bitter_or_best_bitter veya extra_special_bitter slug'a taşı; bu tek başına %30+ improvement getirebilir
- Slug birleştirme: **DÜŞÜN** — english_pale_ale slug'ı tamamen kaldır, recipeleri bitter slug'larına dağıt (BJCP 2021'de "English Pale Ale" yok aslında, modern "British Golden Ale" 12A var)
- Yeni feature: **yeast_english_strain** (Wyeast 1968/1469, WLP002/005), **hop_english_only** boolean (Fuggles/EKG/Northdown only)
- Effort: 4 saat (etiket temizleme + retrain validation)
- **Öncelik: YÜKSEK** — kolay düzeltme, %30+ potansiyel gain, taxonomy fix Adım 54'ün ruhuna uygun

---

### juicy_or_hazy_india_pale_ale (V18.2: 132 reçete, 🟢 50.0% top-1)

**Cluster (14cat):** ipa

**Dataset durumu:**
- V18.2: 132 reçete (V18.1 ile aynı)
- Source baskınlık: rmwoods/brewersfriend %40 (53), braureka %27 (35), mmum %23 (31), tmf %7 (9), twortwat+amervallei %3 (4)
- **Mükemmel balanced distribution** ⭐⭐ — TMF (Mad Fermentationist NEIPA experts) dahil, mmum German NEIPA scene aktif

**Holdout test sonuçları:**
- Test n=26
- V18.2 top-1: 50.0% (13/26) / V18.1 top-1: 23.1% → **🟢 ⭐ +26.9pp** (V18.2'nin transformative gain'i, headline metric)
- V18.2 top-3: 65.4% / V18.1 top-3: 46.2% → **🟢 +19.2pp**
- Feature engineering jackpot — has_dry_hop, has_whirlpool, ibu_og_ratio NEIPA için ayırt edici

**Confusion analizi:**
- Yanlış predict slug'lar: american_india_pale_ale (14, V18.1'de — V18.2'de daha az), american_pale_ale (5), german_koelsch (1)
- AIPA karışıklığı azaldı ama hala baskın — NEIPA = AIPA'nın low-IBU/high-OG/dry-hop variant'ı, sınır flu
- Köelsch karışıklığı (V18.1'de 1) ilginç — düşük IBU + light SRM + clean fermentation overlap

**BJCP plausibility (sample 8):**
- braureka_23761 "New England IPA" OG 1.0728/FG 1.0173/ABV 7.4/IBU 66.7/SRM 5.1 ✓
- tmf "Rings of Light" OG 1.052/FG 1.018/ABV 4.8/IBU 73.7 ✓ Pale Ale-NEIPA crossover
- tmf "Citra-Galaxy NEIPA" OG 1.06/FG 1.016/IBU 78.1/SRM 3.8 ✓ classic
- tmf "Denali Hazy Daze" OG 1.062/IBU 52/SRM 4.2 ✓
- tmf "New England Pale Ale: Brewing Video" — **etiket sınırı** (Pale Ale mı NEIPA mı, kaynak Mad Fermentationist juicy pale yapıyor)
- tmf "Australian NEIPA" OG 1.064/IBU null ✓
- tmf "Cryo Lupulin NEIPA" OG 1.059/IBU 67.7 ✓
- tmf "Ruby Red Grapefruit NEIPA" OG 1.059/IBU 67.7 ✓
- 7/8 BJCP-uyumlu, 1 sınırda

**Adım 56 önerisi:**
- **Modeli koru** — V18.2 NEIPA metriği headline gain, regresyon riski yok
- Ek dataset: **TMF blog full scrape** (~20-30 ek NEIPA reçetesi var) → 132 → 160+
- Yeni feature: **mostly_oats_high** (NEIPA klasik %20+ oats, eklendi), **biotransformation_dryhop** (fermentation aktif iken dry-hop, NEIPA imza tekniği — has_dryhop_during_ferm)
- Slug birleştirme: **HAYIR** — BJCP 21B'de NEIPA distinct
- Effort: 3 saat (TMF ek scrape, biotransformation feature)
- **Öncelik: DÜŞÜK** — zaten %50 top-1, marginal improvement; effort'u brett_beer/red_ipa'ya yatır

---

### belgian_ipa (V18.2: 146 reçete, 🟢 10.3% top-1)

**Cluster (14cat):** belgian

**Dataset durumu:**
- V18.2: 146 reçete (V18.1'de yeni eklendi, V17'de yoktu)
- Source baskınlık: **rmwoods/brewersfriend %97 (141)**, recipator %2 (3), byo %1 (2)
- **Aşırı brewersfriend dominant** → metric null

**Holdout test sonuçları:**
- Test n=29
- V18.2 top-1: 10.3% (3/29) / V18.1 top-1: 3.4% → **🟢 +6.9pp**
- V18.2 top-3: 24.1% / V18.1 top-3: 17.2% → **🟢 +6.9pp**
- yeast_belgian_high_bu_gu feature (Adım 55) işe yaradı, ama signal zayıf (%0.68 dağılım)

**Confusion analizi:**
- Yanlış predict slug'lar: american_india_pale_ale (13/29 V18.1), double_ipa (6), belgian_blonde_ale (2)
- **AIPA karışıklığı dominant** — Belgian IPA = AIPA + Belgian yeast. Yeast metadata olmadan ayırt edilemez
- Brewersfriend null OG/IBU → model AIPA'dan ayıramıyor (her ikisi de IPA-style hop schedule)

**BJCP plausibility (sample 8):**
- recipator_10004 "Belgian IPA - RB Clone" OG 1.072/IBU 62/SRM 9 ✓ classic Belgian IPA
- recipator_8732 "Belgian IPA" OG 1.077/IBU 61/ABV 8 ✓
- recipator_9434 "Dubbel IPA" OG 1.074/IBU 209/SRM 20 — **OUTLIER**, IBU 209 imkansız (parse hatası, max gerçekçi IBU ~120)
- byo "Belgian IPA clone" OG 1.093/IBU 44/ABV 9.9 ✓ strong Belgian IPA
- byo "IPAbbey clone" OG 1.072/IBU 76/ABV 8.3 ✓
- 3 rmwoods reçete tüm metric null — sadece sorte_raw="specialty ipa: belgian ipa"
- 4/8 BJCP-uyumlu, 1 outlier, 3 metric-yok

**Adım 56 önerisi:**
- **Outlier düşür** — recipator_9434 IBU 209 sanity-check (BJCP max ~80 Belgian IPA için)
- Ek dataset: **BYO Belgian IPA scrape** (~5-10 ek), **AHA NHC IPA kategorisi Belgian-yeast filter** (~10 ek metric-rich)
- Yeni feature: **yeast_belgian_strain + ibu_high** crossover (zaten var, ama threshold gevşet ibu>60'tan ibu>50'ye)
- Slug birleştirme: **HAYIR** — distinct BJCP 21B variant
- Feature crossover fix: AIPA ↔ Belgian IPA için yeast_belgian_strain hard rule
- Effort: 4 saat (outlier sanity + 15 ek reçete + threshold tune)
- **Öncelik: ORTA** — V18.2'de +6.9pp gain umut verici, devam et

---

### rye_ipa (V18.2: 200 reçete, 🟢 15.0% top-1)

**Cluster (14cat):** ipa

**Dataset durumu:**
- V18.2: 200 reçete (V18.1'de yeni eklendi)
- Source baskınlık: **rmwoods/brewersfriend %99 (197)**, twortwat %1 (2), tmf %0.5 (1)
- **Aşırı brewersfriend dominant** → metric null

**Holdout test sonuçları:**
- Test n=40
- V18.2 top-1: 15.0% (6/40) / V18.1 top-1: 5.0% → **🟢 +10.0pp** (anlamlı improvement)
- V18.2 top-3: 57.5% / V18.1 top-3: 37.5% → **🟢 +20.0pp** (büyük top-3 gain)
- pct_rye_high feature (Adım 55) Rye IPA için doğrudan discriminator, işe yaradı

**Confusion analizi:**
- Yanlış predict slug'lar: american_india_pale_ale (27/40 V18.1), double_ipa (6), american_pale_ale (2)
- AIPA karışıklığı baskın — Rye IPA = AIPA + %10+ rye. Brewersfriend null OG/IBU + grain metadata zayıf → pct_rye_high yine de işe yaradı çünkü grain.name parse'ı brewersfriend'de mevcut

**BJCP plausibility (sample 8):**
- tmf "India Red Rye Ale" OG 1.063/IBU 73.9/SRM 13.3 ✓
- twortwat_276 "Tangerine Dream" OG 1.065/IBU 70/SRM 23.4/ABV 6.5 ✓ red rye-style
- twortwat_284 "Sierra Nevada Ruthless Rye IPA" OG 1.062/IBU 55/SRM 15.2 ✓ canonical Rye IPA
- 5 rmwoods reçete tüm metric null — sorte_raw="specialty ipa: rye ipa"
- Pre-flight'ta belirtilen "BJCP plausibility 60% range içinde" muhtemelen rmwoods nullları sayıldığı için; metric-rich kısım %100 plausible

**Adım 56 önerisi:**
- Ek dataset: **mmum German Rye IPA filter** (~10-15 ek), **twortwat + tmf full scrape** (~10 ek metric-rich)
- Yeni feature: **rye_pct_continuous** (boolean yerine pct_rye değeri float, granül signal)
- Slug birleştirme: **HAYIR** — BJCP 21B variant
- Effort: 4 saat (kaynak scrape + rye_pct float feature)
- **Öncelik: ORTA** — V18.2 zaten +10pp gain, momentum var

---

### golden_or_blonde_ale (V18.2: 200 reçete, 🟢 15.0% top-1)

**Cluster (14cat):** cream

**Dataset durumu:**
- V18.2: 200 reçete (V18.1 ile aynı)
- Source baskınlık: rmwoods/brewersfriend %92 (185), aha %8 (15)
- **Aşırı brewersfriend dominant** → metric büyük oranda null

**Holdout test sonuçları:**
- Test n=40
- V18.2 top-1: 15.0% / V18.1 top-1: 5.0% → **🟢 +10.0pp**
- V18.2 top-3: 30.0% / V18.1 top-3: 15.0% → **🟢 +15.0pp**

**Confusion analizi:**
- Yanlış predict slug'lar: american_pale_ale (12/40 V18.1), blonde_ale (11), special_bitter_or_best_bitter (3)
- **blonde_ale ile karışıklık kritik** — golden_or_blonde_ale ile blonde_ale (5,834 reçete) gerçekten benzer; iki slug ayrı tutulmuş ama discriminator yok. Slug birleştirme adayı
- APA karışıklığı low-IBU APA + golden ale overlap

**BJCP plausibility (sample 8):**
- 5 aha reçete OG 1.044-1.055, IBU 17-33, SRM 3-6 — tümü ✓ BJCP 18A range
- aha "Big Brew 2013 More Fun Blonde" OG 1.065/IBU 42 — borderline (BJCP max OG 1.054), strong blonde
- aha "Now That's A Knife Australian Sparking" sorte_raw "Pale Ale" — etiket gürültüsü (Australian Pale Ale slug'ına gitmeli, listede 3 reçete var)
- 7/8 BJCP plausible

**Adım 56 önerisi:**
- **Slug birleştirme kararı kritik:** golden_or_blonde_ale (200) + blonde_ale (5,834) = 6,034 birleşmiş slug. BJCP 18A "Blonde Ale" tek isim, "Golden" Australian/British alt-etiket. Bu birleşme tek başına test'te %50+ accuracy potansiyeli
- Ek dataset: **AHA NHC blonde kategorisi expand** (~10 ek)
- Yeni feature: **australian_pale_ale_marker** (sorte_raw'da "australian"/"sparking") — alternatif slug birleştirme yapılmazsa
- Effort: 2 saat (slug merge + retrain validation)
- **Öncelik: YÜKSEK** — slug merge kolay ve büyük gain potansiyeli, taxonomy clean-up

---

### white_ipa (V18.2: 203 reçete, 🟢 22.0% top-1)

**Cluster (14cat):** ipa

**Dataset durumu:**
- V18.2: 203 reçete (V18.1'de yeni eklendi)
- Source baskınlık: **rmwoods/brewersfriend %99 (201)**, braureka %0.5 (1), twortwat %0.5 (1)
- **Aşırı brewersfriend dominant** → metric null

**Holdout test sonuçları:**
- Test n=41
- V18.2 top-1: 22.0% (9/41) / V18.1 top-1: 14.6% → **🟢 +7.3pp**
- V18.2 top-3: 29.3% / V18.1 top-3: 29.3% → ⚪ +0.0pp (top-3 stabil, top-1 iyileşti — discriminator gücü arttı)
- yeast_witbier_high_og_ibu feature (Adım 55, %0.04 dağılım çok zayıf signal) yine de marjinal yardım etti

**Confusion analizi:**
- Yanlış predict slug'lar: american_india_pale_ale (26/41 V18.1), american_pale_ale (4), double_ipa (2)
- **AIPA karışıklığı dominant** — White IPA = AIPA + witbier yeast (Belgian witbier strain) + coriander/orange peel. Yeast/spice metadata olmadan ayırt edilemez

**BJCP plausibility (sample 8):**
- braureka_22775 "Sud 26 Weizen IPA" OG 1.0547/FG 1.0105/ABV 5.8/IBU 42.1/SRM 5.6 ✓ classic White IPA
- twortwat_387 "Wipa" OG 1.059/IBU 48/SRM 5.1/ABV 6 ✓
- 6 rmwoods reçete tüm metric null — sorte_raw="specialty ipa: white ipa"
- 2/8 metric-rich, 6/8 metric null

**Adım 56 önerisi:**
- Ek dataset: **mmum German White IPA filter** (~5-10 ek), **AHA NHC IPA kategorisi witbier-yeast filter** (~5 ek)
- Yeni feature: **has_wheat_pct + ibu_high** crossover (zaten yeast_witbier_high_og_ibu var, kombinasyonel ek), **has_coriander + has_orange_peel** witbier-spice ingredients
- Slug birleştirme: **DÜŞÜN** — White IPA ile Belgian IPA birleştirme adayı (her ikisi de Belgian-yeast IPA), ama BJCP 21B'de ayrı variant
- Effort: 5 saat (5-10 ek reçete + 2 spice feature compute)
- **Öncelik: ORTA** — V18.2'de +7.3pp gain, devam et ama yüksek effort öncelikli değil

---

### mixed_fermentation_sour_beer (V18.2: 213 reçete, 🔴 16.3% top-1)

**Cluster (14cat):** sour

**Dataset durumu:**
- V18.2: 213 reçete (V18.1 ile aynı)
- Source baskınlık: rmwoods/brewersfriend %71 (152), aha %26 (55), byo %2 (5), braureka %0.5 (1)
- aha %26 ile metric-rich kaynak güçlü

**Holdout test sonuçları:**
- Test n=43
- V18.2 top-1: 16.3% (7/43) / V18.1 top-1: 27.9% → **🔴 -11.6pp** (anlamlı regresyon)
- V18.2 top-3: 44.2% / V18.1 top-3: 34.9% → **🟢 +9.3pp**
- Top-1 düşüşü reg tuning yan etkisi olabilir (mcw=5 aşırı conservative oldu mixed-ferm için)

**Confusion analizi:**
- Yanlış predict slug'lar: french_belgian_saison (7), specialty_beer (6), american_wheat_ale (4)
- **Saison karışıklığı kritik** — mixed-ferm sour'lar genellikle Saison-base + Brett/Lacto/Pedio addition. Sample data'da byo "Alsatian Funky Saison", byo "Nu Zuland Saison" tam bu crossover
- Specialty karışıklığı normal (sour cluster nadir)
- american_wheat_ale karışıklığı **garip** — Berliner-style wheat sour mu olur, etiket gürültüsü olabilir

**BJCP plausibility (sample 8):**
- braureka "Bam Biere" OG 1.0384/FG 1.0082/ABV 4/IBU 34.7/SRM 5.1 ✓ Jolly Pumpkin Bam (mixed-ferm classic)
- byo "Alsatian Funky Saison" OG 1.047/FG 1.003/ABV 6.1 ✓ — saison karışım borderline
- byo "Nu Zuland Saison" OG 1.062/FG 1.007/ABV 7.25 ✓ — saison borderline
- byo "Rhodan's Back (Amber Acid Ale)" OG 1.053/FG 1.006/ABV 5.4/SRM 11 ✓ amber sour
- byo "Russian River Sanctification clone" OG 1.056/FG 1.007/ABV 6.3 ✓ Brett-Lacto-Pedio
- byo "Temptation clone" OG 1.062/FG 1.012/ABV 6.8 ✓
- aha "Throwing the Dice Again" OG 1.05/FG 1.01/ABV 5.25 ✓
- aha "Andanzas Sangue de Dragão Fruit Beer" OG 1.05/IBU 7 ✓ — fruit kombinasyonu
- 8/8 BJCP plausible — veri kaliteli, problem sınıflandırma boundary

**Adım 56 önerisi:**
- Ek dataset: **AHA NHC sour kategorisi expand** (~20 ek metric-rich)
- Yeni feature: **multi_yeast_count** (yeasts.length > 1, mixed-ferm imza), **lacto_pedio_strain** specific yeast lab markers (Wyeast 5335 Lacto, 5733 Pedio)
- Slug birleştirme: **HAYIR** — BJCP 28B distinct
- Feature crossover fix: saison ↔ mixed-ferm sour ayrımı için multi_yeast_count + has_brett kombinasyonu
- Effort: 6 saat (NHC scrape + yeast count feature + retrain validation)
- **Öncelik: YÜKSEK** — sour cluster için kritik, regresyon endişe verici

---

### belgian_gueuze (V18.2: 301 reçete, 🔴 8.3% top-1)

**Cluster (14cat):** sour

**Dataset durumu:**
- V18.2: 301 reçete (V18.1'de yeni eklendi, V17'de yoktu)
- Source baskınlık: **rmwoods/brewtoad %85 (257)**, rmwoods/brewersfriend %14 (42), byo %1 (2)
- **brewtoad dominant** — ama brewtoad'ın gueuze etiketlemesi çok gevşek (sample data göstereceği gibi)

**Holdout test sonuçları:**
- Test n=60
- V18.2 top-1: 8.3% (5/60) / V18.1 top-1: 23.3% → **🔴 -15.0pp** (büyük regresyon)
- V18.2 top-3: 35.0% / V18.1 top-3: 40.0% → **🔴 -5.0pp**
- Bu en büyük V18.2 regresyonu (mixed-ferm sonrası)

**Confusion analizi:**
- Belgian Gueuze ile belgian_lambic karışıklığı baskın olmalı (her ikisi de %100 spontaneous fermentation, gueuze = blended lambic)
- katki_fruit_strong feature (Adım 55) belgian_fruit_lambic'i belgian_gueuze'den ayırmaya yarıyor — ama gueuze'de fruit OLMAMASI imza, "yokluk" feature zayıf

**BJCP plausibility (sample 8):**
- byo "Gilligan's Gueuze" OG 1.052/FG 1.003/ABV 5/IBU 0/SRM 4 ✓ classic gueuze
- byo "Steady as She Gueuze" OG 1.044/FG 1.005/ABV 5.1/IBU 8/SRM 7 ✓
- rmwoods/brewtoad "36 chambers batch 1" sorte_raw="gueuze" — metric null
- rmwoods/brewtoad "coffee berliner 3 gallon" sorte_raw="gueuze" — **etiket yanlış** (Berliner Weisse, gueuze değil)
- rmwoods/brewtoad "kind of kriek" sorte_raw="gueuze" — **etiket yanlış** (Kriek = fruit lambic, gueuze değil)
- rmwoods/brewtoad "lambic fall 2016" sorte_raw="gueuze" — **etiket yanlış** (lambic, gueuze unblended değil)
- rmwoods/brewtoad "there she gose again" sorte_raw="gueuze" — **etiket yanlış** (gose, gueuze pun)
- rmwoods/brewtoad "sew it gose" sorte_raw="gueuze" — **etiket yanlış** (gose pun)
- 2/8 doğru, **6/8 etiket yanlış** — brewtoad'ın gueuze etiketi pun/keyword'lerle bulanmış

**Adım 56 önerisi:**
- **Acil veri temizliği:** brewtoad gueuze reçetelerinde keyword filter sıkılaştır — "gose"/"berliner"/"kriek" recipe name'de varsa drop, sadece gerçek gueuze "blend"/"lambic blend"/"old lambic" tag içerenler
- Ek dataset: **BYO sour-recipes scrape full** (~5-10 ek metric-rich), Brouwerij De Cam clone tarifleri
- Yeni feature: **age_in_barrel_months** (gueuze 1-3 yıl, lambic ditto, ama essential discriminator), **has_blending** boolean (multiple lambic blends marker)
- Slug birleştirme: **DÜŞÜN** — belgian_gueuze + belgian_lambic + belgian_fruit_lambic = "lambic_family" superslug. BJCP 23'te ayrı ama dataset boyutu küçük, birleştirme makul
- Effort: 8 saat (brewtoad veri temizliği + age_in_barrel feature + slug merge karar)
- **Öncelik: ÇOK YÜKSEK** — %75 etiket gürültüsü kabul edilemez, bu slug için temizlik şart

---

### red_ipa (V18.2: 308 reçete, 🟢 6.5% top-1)

**Cluster (14cat):** ipa

**Dataset durumu:**
- V18.2: 308 reçete (V18.1'de yeni eklendi)
- Source baskınlık: **rmwoods/brewersfriend %99 (306)**, braureka %1 (2)
- **Aşırı brewersfriend dominant** → metric null

**Holdout test sonuçları:**
- Test n=62
- V18.2 top-1: 6.5% (4/62) / V18.1 top-1: 4.8% → **🟢 +1.7pp** (marjinal)
- V18.2 top-3: 40.3% / V18.1 top-3: 29.0% → **🟢 +11.3pp** (anlamlı top-3 gain)
- srm_high_ibu_high feature (Adım 55, %12.69 dağılım) Red IPA için doğrudan signal, ama %12.69 specific olmaktan ziyade genel "amber+hoppy"

**Confusion analizi:**
- Sample data'da rmwoods reçeteleri sadece sorte_raw="specialty ipa: red ipa"
- AIPA + amber malt karışıklığı baskın olmalı; american_amber_red_ale (9,093 reçete) ile de overlap

**BJCP plausibility (sample 8):**
- braureka_29853 "Norma Jeane" OG 1.0581/FG 1.0121/ABV 6.1/IBU 32.5/SRM 13.7 ✓ classic Red IPA
- braureka_54708 "Barbarossa Red IPA (neu)" OG 1.0501/FG 1.0121/ABV 5/IBU 41.1/SRM 19.8 ✓
- 6 rmwoods reçete tüm metric null — sorte_raw="specialty ipa: red ipa"
- 2/8 metric-rich, 6/8 metric null

**Adım 56 önerisi:**
- Ek dataset: **mmum Red IPA filter** (German amber-IPA scene aktif, ~10-15 ek metric-rich), **AHA NHC Specialty IPA kategorisi red filter** (~10 ek)
- Yeni feature: **srm_amber_band** (12-18 SRM specific, current srm_high_ibu_high çok geniş 14+), **caramel_malt_pct** (Red IPA tipik %10-20 caramel)
- Slug birleştirme: **DÜŞÜN** — red_ipa ile american_amber_red_ale ayrımı stratejik (Red IPA = Amber Red Ale + IPA hop schedule); birleşme makul değil ama discriminator zayıf
- Effort: 5 saat (kaynak scrape + 2 yeni feature + retrain)
- **Öncelik: ORTA** — V18.2 marjinal gain, brewersfriend null bottleneck

---

## 4. Kritik Slug Sample Recipe Dump'ları (6-8 reçete her biri)

Yukarıdaki paragraflarda zaten detayda verilmişti, burada özetli ek data:

### brett_beer ek context (n=15 holdout, 0/15 doğru)
Sample dump'a göre BYO+TMF+AHA reçeteleri tam metric-rich, brett_only yeast veya saison-brett crossover. 1/8 etiket gürültü (Flanders Red).

### belgian_quadrupel alias merge sonrası karışım (74 ek reçete)
Sample dump'a göre 3/8 etiket yanlış (BPA/Tripel reçeteleri Quad'a geldi) — alias filter "Trappistenbier" + OG ≥ 1.085 yapılmalı. Brewtoad %55 dominant ama brewersfriend'e göre daha az null.

### white_ipa, rye_ipa, red_ipa, belgian_ipa (yeni 4 IPA variant)
Hepsi rmwoods/brewersfriend %95+ dominant → metric null. Sample dump'larda 6/8 reçete OG/FG/IBU/SRM=null. Sorun veri MİKTARI değil veri KALİTESİ. Yeni metric-rich kaynak (BYO, AHA, TMF, mmum) ekleme gerek.

### gose, belgian_gueuze (sour cluster yeni)
Gose: %95 brewersfriend dominant ama sample'lar düzgün etiketli (1 outlier OG 1.068 imperial gose).
Gueuze: brewtoad dominant ama **6/8 etiket gürültü** (gose puns, kriek, berliner gueuze etiketiyle yazılmış). Veri temizliği şart.

### dunkles_bock (n=14 holdout, %0 V18.2)
Sample 8/8 BJCP plausible, recipator/braureka kalite yüksek, ama bock alt-tipleri için discriminator yok (mash_temp, lagering_days feature gerek).

---

## 5. Adım 56 Önerileri Konsolidasyon (Öncelik Sıralı)

### ÇOK YÜKSEK Öncelik
1. **belgian_gueuze veri temizliği** — brewtoad keyword filter (gose/berliner/kriek drop), age_in_barrel feature. Effort 8s. Sebep: %75 etiket gürültü, en büyük V18.2 regresyon.

### YÜKSEK Öncelik
2. **belgian_quadrupel alias filter sıkılaştırma** — "Trappistenbier" + OG ≥ 1.085 zorunlu. Effort 6s. Sebep: alias merge regresyonu, 3/8 etiket yanlış.
3. **brett_beer veri ek + brett_only_yeast feature** — TMF blog scrape + AHA filter. Effort 8s. Sebep: %0 top-1 utanç verici, sour cluster sağlığı kritik.
4. **english_pale_ale taxonomy fix** — bitter etiketli reçeteleri uygun slug'lara taşı veya slug tamamen kaldır. Effort 4s. Sebep: 5/8 sample yanlış etikette, kolay düzeltme +%30 potansiyel.
5. **gose has_salt + has_coriander feature** — ingredient marker. Effort 5s. Sebep: berliner_weisse karışıklığı bu feature'larla çözülür.
6. **golden_or_blonde_ale ↔ blonde_ale slug merge** — BJCP 18A tek slug. Effort 2s. Sebep: kolay, büyük gain potansiyeli.
7. **mixed_fermentation_sour_beer multi_yeast_count + lacto_pedio strain** — saison ayrımı. Effort 6s. Sebep: V18.2'de regresyon, sour cluster sağlığı.

### ORTA Öncelik
8. **dunkles_bock mash_temp + lagering_days** + mmum scrape. Effort 6s.
9. **kellerbier carbonation + filter feature** + outlier düşür. Effort 5s.
10. **german_oktoberfest_festbier lagering_days + mmum scrape**. Effort 4s.
11. **belgian_ipa outlier düşür + threshold tune**. Effort 4s.
12. **rye_ipa rye_pct float feature + ek scrape**. Effort 4s.
13. **white_ipa coriander/orange peel feature + ek scrape**. Effort 5s.
14. **red_ipa srm_amber_band + caramel_malt feature**. Effort 5s.

### DÜŞÜK Öncelik
15. **juicy_or_hazy_india_pale_ale** — modeli koru, TMF ek scrape opsiyonel. Effort 3s. Sebep: %50 t1 zaten transformative gain, marjinal effort.

### Toplam Effort
- ÇOK YÜKSEK: 8 saat (1 madde)
- YÜKSEK: 31 saat (6 madde)
- ORTA: 33 saat (7 madde)
- DÜŞÜK: 3 saat (1 madde)
- **Genel toplam: ~75 saat** = 2-3 haftalık iş

### Stratejik Sıralama Önerisi
Adım 56'yı 3 alt-faza böl:

**Faz A (Veri temizliği — ~16 saat):** gueuze + quadrupel + english_pale_ale fix + golden/blonde merge → V18.3 deploy. Beklenen gain: %5+ ortalama slug top-1.

**Faz B (Sour cluster sağlık — ~19 saat):** brett_beer + gose + mixed-ferm feature engineering + ek dataset → V18.4 deploy. Beklenen gain: sour cluster %20+ (16.3% → ~36%).

**Faz C (German/IPA variant rafineleme — ~30 saat):** dunkles_bock, kellerbier, festbier, belgian_ipa, white/rye/red_ipa → V18.5 deploy. Beklenen gain: lager+ipa cluster marjinal +5pp.

---

## 6. Sonuç ve Üst-Seviye Tespitler

1. **rmwoods/brewersfriend null-metric problem temel bottleneck** — 6+ slug'ın discriminator yetersizliği bu kaynaktan. Yeni dataset eklemede metric-rich kaynak öncelikli.

2. **Etiket gürültüsü gueuze ve quadrupel'de kritik** — V18.2'de iki büyük regresyon bunlardan. Adım 56 Faz A'nın önceliği.

3. **Feature engineering V18.2'de işe yaradı** — NEIPA +26.9pp, sour cluster top-3 +2.4pp. Ama küçük örneklem (≤200 reçete) slug'larda gürültü payı hala yüksek; yeni feature'lar (mash_temp, lagering_days, has_salt, has_coriander, multi_yeast_count) eklenmeli.

4. **Slug birleştirme adayları** — golden_or_blonde_ale + blonde_ale (kesin), belgian_gueuze + belgian_lambic + belgian_fruit_lambic (düşün), belgian_quadrupel + belgian_strong_dark_ale (Kaan kararı). Taxonomy tartışılmadan model performansı tavanı aşamayız.

5. **KURAL 4 monitoring** — Faz A sonrası 5 stat gain trend metric kontrol; %3'ün altına düşerse alarm. V17→V18.1→V18.2: 7.14→6.87→5.69%. V18.3 hedefi >%6.

---

**Rapor sonu.** Detaylı sample data: `_step56_samples_v18_2.json`. Throwaway extraction script: `_step56_extract_samples.py`.
