# Adım 56 Faz A2 — Null-Metric Audit Raporu

**Tarih:** 2026-04-29  
**Dataset:** `working/_v18_2_dataset.json` 301,316 reçete, 94 feature  
**Hedef:** Önceki raporda iddia edilen "rmwoods/brewersfriend null-metric problem" hipotezini doğrulamak veya çürütmek; Adım 56 scope'u final olarak belirlemek.

---

## ⚠️ KRİTİK DÜZELTMESİ — Önceki Hipotez ÇÜRÜTÜLDÜ

`_step56_preflight_v18_2_weak_slugs_detailed.md` (44 KB rapor) Bölüm #2'de iddia edilen:
> "rmwoods/brewersfriend reçetelerinde OG/FG/IBU/SRM null. Bu, yeni 9 slug performansının düşük olmasının ana sebebi."

Bu iddia **YANLIŞ TEŞHİS** çıktı. Sebebi:
- Sample extraction (`_step56_extract_samples.py`) `raw.og` field'ına baktı, null gördü.
- Model training **`features.og`** field'ını kullanır (V18 dataset'inde features dict ayrı populate ediliyor).
- raw.og null olan rmwoods reçetelerinin features.og POPULATED.

---

## 1. Globally Truly-Null Sayısı

`features.og`, `features.ibu`, `features.srm` tümü null/0 olan reçete sayısı:

| Metrik | Değer |
|---|---|
| Toplam reçete | 301,316 |
| Truly fully-null (3 metric birden null) | **4** (%0.001) |
| `raw.og` null ama `features.og` POPULATED | 292,337 (%97) — false positive |

**4 truly-null reçete:**
- `tmf_eisadam-hotd-dave-clone.html` — German Eisbock (TMF blog)
- `tmf_beet-and-brett-saison.html` — Specialty Saison
- `tmf_rhubarb-berliner-weisse-again.html` — Berliner Weisse
- `tmf_sour-bourbon-barrel-porter.html` — American Wild Ale

**Sonuç:** Null-metric REJECT planı GEREKSIZ — 4 reçete ihmal edilebilir, hepsi TMF, manuel düzeltme yapılabilir.

---

## 2. Per-Source Feature Coverage (V18.2 Dataset)

Yedi farklı kaynak için kritik feature'ların `features` dict'inde populated olma yüzdesi:

| Feature | rmwoods | aha | byo | mmum | braureka | recipator | tmf |
|---|---|---|---|---|---|---|---|
| og | **100%** | 100% | 100% | 100% | 100% | 100% | 97.6% |
| fg | **100%** | 99.9% | 100% | 100% | 99.8% | 97.4% | — |
| ibu | **98.6%** | 75.7% | 99.3% | 99.9% | 100% | 99.3% | — |
| srm | **99.9%** | 72.9% | 100% | 100% | 100% | 96.9% | — |
| abv | **100%** | 94.3% | 100% | 100% | 99.8% | 97.4% | — |
| has_dry_hop | 27.9% | 0% | 0% | 27.5% | 27.8% | 0.9% | — |
| has_whirlpool | 7.5% | 0% | 0% | 0% | 0% | 0% | — |
| has_fwh | 7.0% | 0% | 0% | 0% | 0% | 0% | — |
| has_late_hop | 72.3% | 0% | 0% | 0% | 0% | 0% | — |
| has_brett | 1.3% | 2.2% | 5.2% | 0.3% | 0.3% | 0.4% | — |
| yeast_belgian | 1.3% | 5.3% | 9.1% | 5.6% | 6.4% | 5.7% | — |
| yeast_witbier | 0.7% | 1.3% | 1.6% | 1.1% | 1.4% | 1.0% | — |
| yeast_saison | 3.9% | 4.4% | 3.3% | 2.9% | 1.1% | 0.6% | — |
| yeast_brett | 1.3% | 2.9% | 4.0% | 0.2% | 0.3% | 0% | — |
| yeast_lab_wyeast | 31.6% | 0% | 0% | 0% | 0% | 0% | — |
| yeast_lab_white_labs | 30.4% | 0% | 0% | 0% | 0% | 0% | — |
| yeast_lab_fermentis | 25.2% | 0% | 0% | 0% | 0% | 0% | — |
| yeast_lab_other | 12.8% | 100% | 100% | 100% | 100% | 100% | — |

**Net bulgu:** rmwoods aslında **en zengin feature coverage'ına sahip kaynak**. AHA/BYO/mmum/braureka basic OG/FG/IBU/SRM iyi ama hop schedule (has_dry_hop/has_whirlpool/has_fwh/has_late_hop) ve yeast_lab dağılımı yapmıyorlar.

---

## 3. Per-Slug Feature Coverage (Zayıf 15 Slug)

15 zayıf slug için `features.og` null oranı (model'in gerçekten gördüğü):

| Slug | n | feat_og null % | feat_fully_null % |
|---|---|---|---|
| dunkles_bock | 69 | 0.0% | 0.0% |
| brett_beer | 76 | 0.0% | 0.0% |
| german_oktoberfest_festbier | 80 | 0.0% | 0.0% |
| kellerbier | 89 | 0.0% | 0.0% |
| belgian_quadrupel | 89 | 0.0% | 0.0% |
| gose | 102 | 0.0% | 0.0% |
| english_pale_ale | 102 | 0.0% | 0.0% |
| juicy_or_hazy_india_pale_ale | 132 | 0.0% | 0.0% |
| belgian_ipa | 146 | 0.0% | 0.0% |
| rye_ipa | 200 | 0.0% | 0.0% |
| golden_or_blonde_ale | 200 | 0.0% | 0.0% |
| white_ipa | 203 | 0.0% | 0.0% |
| mixed_fermentation_sour_beer | 213 | 0.0% | 0.0% |
| belgian_gueuze | 301 | 0.0% | 0.0% |
| red_ipa | 308 | 0.0% | 0.0% |

**Tüm zayıf slug'larda %0 null** — model her reçete için OG/IBU/SRM'i görüyor. Performans düşüklüğünün sebebi metric eksikliği DEĞİL.

---

## 4. Asıl Problem: Discriminative Feature Eksikliği

Performans düşüklüğünün gerçek sebebi 13 önemli feature'ın **dataset'te hiç olmaması**:

### V18.2'de hiç olmayan feature'lar (13 adet)

| Feature | Hangi slug için kritik | Kullanım |
|---|---|---|
| **has_salt** | gose | Gose ↔ Berliner Weisse ayrımı |
| **has_coriander** | gose, witbier | Gose, Witbier marker |
| **mash_temp** | dunkles_bock, festbier, kellerbier, doppelbock | German lager alt-stiller |
| **mash_time** | bock family, lambic | Single vs decoction infusion |
| **fermentation_temp** | saison, kveik, brett | Yeast strain ayrımı |
| **dry_hop_days** | NEIPA, modern IPA variant | Biotransformation timing |
| **boil_time** | wee_heavy (90-120dk), Pilsner (75dk) | Boil-driven SRM/maillard |
| **efficiency** | sistem-spesifik | brewer offset |
| **lagering_days** | festbier, märzen, doppelbock | Lager cluster sub-style |
| **yeast_lager** | tüm lager cluster | Lager yeast presence binary |
| **yeast_belgian_high_bu_gu** | belgian_ipa | Phase 1'de düşünüldü, dataset'e eklenmedi |
| **yeast_witbier_high_og_ibu** | white_ipa | Phase 1'de düşünüldü, dataset'e eklenmedi |
| **katki_brett** | brett_beer, mixed-ferm | Brett addition (yeast değil ama spice/inoculation) |

### V18.2'de var ama düşük coverage'a sahip feature'lar

| Feature | rmwoods % | Ne anlama geliyor |
|---|---|---|
| has_whirlpool | 7.5% | Modern IPA imza (NEIPA, West Coast) ama nadir flag — eksik populated |
| has_fwh | 7.0% | Saison, Belgian style imza — nadir |
| has_brett | 1.3% | Brett presence — gerçekten az ama belki false negatif |
| yeast_belgian | 1.3% | Belgian yeast nadir flag — mantıklı ama belgian_ipa için yetersiz |
| yeast_witbier | 0.7% | Witbier yeast — white_ipa için kritik ama 0.7% çok az |
| yeast_brett | 1.3% | Brett yeast specifically — brett_beer için kritik |

**Sonuç:** has_whirlpool/has_fwh düşük coverage parser zayıflığı (rmwoods hop schedule'ında "whirlpool"/"first wort" keyword tarama sınırı). yeast_belgian/witbier/brett düşük coverage gerçek (bu yeasts nadir kullanılıyor) — feature tek başına yetersiz, **kombinasyonel feature** lazım (örn. yeast_belgian + ibu_high → belgian_ipa).

---

## 5. AHA + V15_orig Source Coverage (Zayıf Slug Bazında)

Kaan'ın talebi: "AHA + v15_orig yeterli reçete sağlıyorsa, rmwoods brewersfriend kısmını bu slug'lar için reject" — ama null-metric problem olmadığı için reject gerekmez. Yine de ek scrape için coverage gözden geçirme:

| Slug | n | rmwoods | aha | byo | mmum | braureka | recipator | tmf | non-rmwoods toplam |
|---|---|---|---|---|---|---|---|---|---|
| dunkles_bock | 69 | 29 | 2 | 0 | 0 | 19 | 19 | 0 | **40 (%58)** |
| brett_beer | 76 | 48 | 11 | 16 | 0 | 0 | 0 | 1 | **28 (%37)** |
| german_oktoberfest_festbier | 80 | 38 | 1 | 1 | 3 | 15 | 19 | 1 | **42 (%52)** |
| kellerbier | 89 | 28 | 0 | 0 | 31 | 29 | 1 | 0 | **61 (%69)** ⭐ |
| belgian_quadrupel | 89 | 72* | 0 | 2 | 0 | 4 | 0 | 2 | 17 (%19) |
| gose | 102 | 97 | 0 | 1 | 0 | 1 | 0 | 2 | 5 (%5) |
| english_pale_ale | 102 | 36 | 31 | 0 | 5 | 4 | 24 | 0 | **66 (%65)** ⭐ |
| juicy_or_hazy_ipa | 132 | 53 | 0 | 0 | 31 | 35 | 0 | 9 | **79 (%60)** ⭐ |
| belgian_ipa | 146 | 141 | 0 | 2 | 0 | 0 | 3 | 0 | 5 (%3) |
| rye_ipa | 200 | 197 | 0 | 0 | 0 | 0 | 0 | 1 | 3 (%2) |
| golden_or_blonde_ale | 200 | 185 | 15 | 0 | 0 | 0 | 0 | 0 | 15 (%8) |
| white_ipa | 203 | 201 | 0 | 0 | 0 | 1 | 0 | 0 | 2 (%1) |
| mixed_fermentation_sour | 213 | 152 | 55 | 5 | 0 | 1 | 0 | 0 | **61 (%29)** |
| belgian_gueuze | 301 | 299* | 0 | 2 | 0 | 0 | 0 | 0 | 2 (%1) |
| red_ipa | 308 | 306 | 0 | 0 | 0 | 2 | 0 | 0 | 2 (%1) |

*belgian_quadrupel/belgian_gueuze rmwoods sayısı brewtoad+brewersfriend ayırımı gözetmeden toplam

**6 slug'da non-rmwoods yeterli (≥%50):** kellerbier, juicy_or_hazy, english_pale_ale, dunkles_bock, festbier, mixed-ferm. Bunlar için rmwoods reject mümkün ama null-metric sebebi yok → reject gerekçesi yok.

**9 slug'da rmwoods aşırı dominant (≥%85):** belgian_quadrupel, gose, belgian_ipa, rye_ipa, golden_or_blonde, white_ipa, belgian_gueuze, red_ipa. Bunlar için **ek metric-rich kaynak ekleme** stratejik (rmwoods'u korumak + non-rmwoods büyütmek).

---

## 6. Eksik Reçete Sayısı — Kaynak Bazında Tahmin

### a. BYO Magazine (https://byo.com/recipes)
- Mevcut V18.2'de: 427 reçete (Adım 50'de scrape)
- Tahmini ek (re-scrape full sitemap): ~500-800 reçete
- Zayıf slug katkı: brett_beer +10-15, gose +5-10, belgian_ipa +5, white_ipa +3-5, rye_ipa +5
- Effort: 4 saat (re-scrape + parser fix)
- **Öncelik: ORTA**

### b. AHA Recipe Library Faz 2
- Mevcut V18.2'de: 1,104 reçete (Adım 52'de scrape)
- Tahmini ek (toplam 4,000+ reçete tahmini, 2,800-3,000 ek alınabilir)
- Zayıf slug katkı: brett_beer +10, mixed-ferm +30, belgian_ipa +10, festbier +5, dunkles_bock +5
- Effort: 6 saat (Phase 2 scrape + dedupe)
- **Öncelik: YÜKSEK** (büyük volüm + metric-rich)

### c. mmum.de (German homebrew)
- Mevcut V18.2'de: 1,120 reçete
- Tahmini ek: ~500-1,000 reçete (mmum aktif growing forum)
- Zayıf slug katkı: dunkles_bock +15, festbier +10, kellerbier +20, white_ipa +5, rye_ipa +5
- Effort: 5 saat (sitemap re-scrape)
- **Öncelik: YÜKSEK** German cluster için kritik

### d. braureka (Almanca DB)
- Mevcut V18.2'de: 1,939 reçete
- Tahmini ek: ~500-1,000 reçete
- Zayıf slug katkı: dunkles_bock +10, kellerbier +15, festbier +5, juicy_or_hazy +20
- Effort: 4 saat
- **Öncelik: ORTA**

### e. Brewer's Friend native scrape (Cloudflare bypass)
- Adım 45'te SKIP listesinde (Cloudflare bloke). Tekrar değerlendirme:
  - Memory'de NO-GO: 3 yöntem (curl/Playwright/API key) denendi
  - **Sonuç: yine SKIP** — null-metric sebebi olmadığı için bu kaynağa ihtiyaç da azaldı
- **Öncelik: ERTELE / Adım 57+**

### f. The Mad Fermentationist blog (TMF)
- Mevcut V18.2'de: 164 reçete
- Tahmini ek: ~50-100 reçete (blog ~250 toplam recipe page)
- Zayıf slug katkı: brett_beer +20-30 (TMF Brett uzmanı), mixed-ferm +15
- Effort: 4 saat
- **Öncelik: YÜKSEK** Brett/Sour cluster için kritik

### Toplam Tahmin
6 kaynaktan ek: **~3,000-4,500 reçete** potansiyel. Etki:
- brett_beer: 76 → 130-150 (+%70-95)
- mixed_fermentation_sour: 213 → 300-350 (+%40-65)
- dunkles_bock: 69 → 100-130 (+%45-90)
- kellerbier: 89 → 150-200 (+%70-125)
- belgian_ipa: 146 → 170-200 (+%15-35)
- white/rye/red IPA: marjinal artış (~5-10 reçete each)

---

## 7. Stratejik Sonuç ve Adım 56 Scope Revizyonu

### Eski plan (Faz A2'den ÖNCE)
- Faz A1 etiket temizliği (gueuze/quadrupel/EPA/golden merge) ~10 saat
- Faz A2 null-metric reject + ek kaynak scrape ~paralel

### Yeni plan (Faz A2 audit sonrası)
- **Faz A1 etiket temizliği KORUNUR** (10 saat) — gueuze 75% etiket gürültüsü gerçek, quadrupel 38% sızma gerçek
- **Faz A2 null-metric reject İPTAL** — sadece 4 truly-null reçete, manuel düzelt
- **Faz A3 (YENİ) — feature engineering öncelikli** — 13 eksik feature'dan kritik 5'i ekle:
  1. `mash_temp` — bock/festbier/kellerbier için
  2. `has_salt` + `has_coriander` — gose/witbier ayrımı için
  3. `dry_hop_days` — NEIPA/modern IPA biotransformation için
  4. `lagering_days` — festbier/märzen/doppelbock için
  5. `yeast_lager` (binary) + `yeast_brett_only` — Brett ayrımı için
- **Faz A4 (YENİ) — ek dataset scrape** — Sıralı:
  1. AHA Faz 2 (~2,800 reçete) — büyük volüm, metric-rich, **YÜKSEK öncelik**
  2. mmum re-scrape (~500-1,000) — German cluster, **YÜKSEK öncelik**
  3. TMF blog (~50-100) — Brett/Sour, **YÜKSEK öncelik**
  4. BYO re-scrape (~500-800) — geneli, **ORTA öncelik**
  5. braureka re-scrape (~500-1,000) — German backup, **ORTA öncelik**

### Effort Karşılaştırma

| Faz | Eski plan | Yeni plan |
|---|---|---|
| A1 etiket temizliği | 10s | **10s** ✓ |
| A2 null-metric audit | 5s (paralel) | **0s (yapıldı, scope iptali)** |
| A3 feature engineering | — | **12s** (5 feature compute + train) |
| A4 ek dataset scrape | — (yoktu) | **23s** (5 kaynak ardışık) |
| **Toplam Adım 56** | 10s | **45s** |

### Beklenen Gain (V18.3)
- A1 sonrası: gueuze 8.3% → ~25-30% (etiket temizliği), quadrupel 0% → ~10-15%, EPA 5% → ~25%
- A3 sonrası: gose 25% → ~35-40% (has_salt/coriander), bock cluster +5pp ortalama (mash_temp/lagering_days)
- A4 sonrası: brett_beer 0% → ~15-20% (TMF + AHA Brett ek), mixed-ferm 16% → ~25-30%

**Toplam V18.3 t1 hedef:** mevcut 55.3% → **~60-62%** (yaklaşık +5-7pp slug-level)

---

## 8. KARAR İÇİN ÖZET (Kaan)

1. **Null-metric reject planı İPTAL** — sadece 4 truly-null reçete, gerekçe yok.
2. **Faz A1 etiket temizliği DEVAM** — gueuze + quadrupel + EPA + golden merge (10 saat).
3. **Faz A3 yeni — feature engineering** (12 saat) — 5 yeni feature: mash_temp, has_salt, has_coriander, dry_hop_days, lagering_days.
4. **Faz A4 yeni — ek dataset** (23 saat) — sıralı: AHA Faz 2 → mmum → TMF → BYO → braureka.
5. **V18.3 single deploy hedefi** — A1+A3+A4 birleşik, KURAL 4 deploy gate ile validate.

### Sıralama Önerisi
Adım 56'yı **2 alt-sprint'e böl**:
- **Sprint 56a (10s):** Faz A1 etiket temizliği + V18.2.1 ara deploy (sadece etiket fix, model retrain isteğe bağlı). Hızlı kazanım, risk düşük.
- **Sprint 56b (35s):** Faz A3 feature engineering + Faz A4 ek dataset → V18.3 deploy. Büyük iş, KURAL 4 deploy gate.

---

**Audit sonu.** Detaylı veri: `_step56_a2_audit_v2.json` (per-slug null %), `_step56_a2_feature_coverage.json` (per-source × feature %).
