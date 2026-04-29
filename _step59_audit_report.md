# Adım 59 Faz B Pre-flight — A/B/C/D/E Audit Raporu

**Tarih:** 2026-04-29  
**V19 production'da** (commit 5c5ac61, 2-3 saat üzeri canlı)  
**Veri:** `working/_v19_dataset.json` 383,334 reçete, 89 feature

---

## A. V19 Zayıf Slug Tablosu (≤250 bucket)

V19'da 10 slug ≤250 reçete (V18.3'te 13 idi, V19'da Plan C dedupe'tan +recovery'le bazıları 250 üstüne çıktı). Ek olarak 5 slug 250-500 bandında ama hala kritik zayıf.

| # | Slug | n V19 | n V18.3 | Δ (rmwoods raw re-parse etkisi) |
|---|---|---|---|---|
| 1 | belgian_quadrupel | 78 | 78 | 0 (Trappist filter aynı) |
| 2 | dunkles_bock | 85 | 85 | 0 |
| 3 | kellerbier | 97 | 97 | 0 |
| 4 | german_oktoberfest_festbier | 100 | 100 | 0 |
| 5 | brett_beer | 101 | 101 | 0 |
| 6 | english_pale_ale | 103 | 119 | -16 (taxonomy temizliği önceden) |
| 7 | juicy_or_hazy_india_pale_ale (NEIPA) | 144 | 145 | -1 |
| 8 | belgian_gueuze | 199 | 199 | 0 |
| 9 | gose | 214 | 214 | 0 |
| 10 | belgian_ipa | 218 | 219 | -1 |
| 250-500 bandı | | | | |
| 11 | white_ipa | 264 | 264 | 0 |
| 12 | mixed_fermentation_sour_beer | 268 | 269 | -1 |
| 13 | rye_ipa | 309 | 309 | 0 |
| 14 | red_ipa | 417 | 417 | 0 |

**Net:** rmwoods raw re-parse misc/hops detail ekledi ama slug COUNTS değişmedi (slug taxonomy aynı kaldı). 8 yeni feature compute edildi.

---

## B. has_salt Slug-Level Coverage Audit

| Rank | Slug | n | has_salt count | % |
|---|---|---|---|---|
| 1 | **gose** | 214 | 155 | **72.4%** ⭐ |
| 2 | belgian_gueuze | 199 | 14 | 7.0% |
| 3 | berliner_weisse | 1,598 | 73 | 4.6% |
| 4 | special_bitter_or_best_bitter | 2,703 | 71 | 2.6% |
| 5 | dortmunder_european_export | 379 | 9 | 2.4% |
| 6 | NEIPA | 144 | 3 | 2.1% |
| 7 | extra_special_bitter | 7,656 | 141 | 1.8% |
| 8 | old_ale | 2,155 | 37 | 1.7% |
| 9 | ordinary_bitter | 2,001 | 34 | 1.7% |
| 10-25 | (diğer slug'lar) | | | < 1.5% |

**Sonuç:** has_salt **zaten gose-dominant** (gose %72 vs Berliner %5 = 14× ayrım). Filter sıkılaştırma GEREK YOK.

**Sample 20 non-gose has_salt=true reçete analizi:**
- Çoğu legitimate brewing salt kullanımı (saison/grisette farmhouse — `rmwoods_1363 minor miner grisette`)
- ESB/Bitter'da water chemistry için sodium chloride (`dad's best bitter`)
- Pickled/specialty IPA'lar ("pliny clone" gibi water profile)
- Yanlış pozitif değil — gerçek kullanım

**Aksiyon:** has_salt feature olduğu gibi kalsın, gose ↔ Berliner ayrımı zaten net.

---

## C. NEIPA Collapse Derin Tanı

### NEIPA dataset profili (n=144):

| Metric | p25 | p50 | p75 | max |
|---|---|---|---|---|
| dry_hop_grams_per_liter | 0.00 | 5.20 | 8.17 | 38.49 |
| late_hop_pct | 16.7 | 44.4 | 80.8 | 100.0 |

### AIPA control (n=56,108):

| Metric | p50 | p75 |
|---|---|---|
| AIPA dpl | **1.56** | 3.33 |
| AIPA lhp | 40.0 | 55.6 |

**NEIPA dpl 5.20 vs AIPA dpl 1.56 = 3.3× discriminator var. AMA:**
- NEIPA dpl > 0: %62.5 (sadece 90/144)
- NEIPA lhp > 0: %83.3 (120/144)

### KRİTİK BULGU — TMF reçeteleri (sample 10):

```
braureka_23761            dpl=0.00 lhp=100 dry_h=0 wp_h=1   "New England IPA"
tmf_rings-of-light...     dpl=0.00 lhp=0   dry_h=0 wp_h=0   "Rings of Light - Hazy Pale Ale"
tmf_citra-galaxy-neipa... dpl=0.00 lhp=0   dry_h=0 wp_h=0   "Citra-Galaxy NEIPA"
tmf_denali-hazy-daze...   dpl=0.00 lhp=0   dry_h=0 wp_h=0   "Denali, Hazy Daze"
tmf_new-england-pale-ale  dpl=0.00 lhp=0   dry_h=0 wp_h=0
tmf_australian-neipa...   dpl=0.00 lhp=0   dry_h=0 wp_h=0
tmf_cryo-lupulin-neipa... dpl=0.00 lhp=0   dry_h=0 wp_h=0
```

**TMF reçetelerinin tümünde dpl=0, has_dry_hop_heavy=0**. TMF blog reçeteleri raw.hops field içermiyor (parser HTML scrape'ten hop list çıkaramadı). Bu yüzden NEIPA test set'inin ~%37'si dpl=0 — model bu reçeteleri AIPA olarak görüyor.

**Aksiyon:** NEIPA için yeni feature gerek — `dpl=0` durumda da NEIPA'yı tespit edecek alternatif:
- Recipe name match: `^(neipa|hazy|juicy|new england|northeast)` → name fallback bias
- yeast_haze (vermont/london iii/imperial juice strain) — rmwoods'ta yeast_product_id'lerden çıkar
- og_low_ibu_high (NEIPA tipik OG 1.060, IBU 60+, bu kombinasyon AIPA'dan ayrım sağlar)

---

## D. white_ipa ↔ Witbier Confusion

### V19 model üzerinde white_ipa prediction dağılımı (n=264):

| Predicted | Count | % |
|---|---|---|
| **american_india_pale_ale** | **118** | **44.7%** ⚠️ |
| white_ipa (doğru) | 93 | 35.2% |
| american_pale_ale | 20 | 7.6% |
| american_wheat_ale | 12 | 4.5% |
| french_belgian_saison | 5 | 1.9% |
| double_ipa | 4 | 1.5% |
| belgian_witbier | 2 | 0.8% |

**Sürpriz:** white_ipa daha çok AIPA'ya kaçıyor (%44.7), witbier'a değil (%0.8). Yani has_coriander witbier'a yanıltmıyor — model witbier feature'ları olmadan AIPA varsayıyor.

### Feature coverage white_ipa (n=264):

| Feature | Count | % |
|---|---|---|
| has_coriander | 45 | 17.0% |
| has_orange_peel | 47 | 17.8% |
| yeast_witbier | 30 | 11.4% |

Düşük coverage — white_ipa reçetelerinin çoğunda witbier marker'ı yok (rmwoods misc/yeast detayı eksik).

### Sample 10 white_ipa:

```
braureka_22775   cor=0 op=0 yw=0 ibu=42 og=1.055 dpl=0      "Sud 26 Weizen IPA"
twortwat_387     cor=0 op=0 yw=0 ibu=48 og=1.059 dpl=0      "Wipa"
rmwoods_331785   cor=0 op=0 yw=1 ibu=50 og=1.061 dpl=10.00  "moby white ipa"
rmwoods_331948   cor=1 op=1 yw=0 ibu=63 og=1.071 dpl=2.80   "badkuip"
rmwoods_332272   cor=1 op=0 yw=0 ibu=61 og=1.071 dpl=2.72   "kylie's canines"
rmwoods_332340   cor=0 op=0 yw=0 ibu=81 og=1.066 dpl=5.45   "#ifaf iipa"
rmwoods_332779   cor=0 op=0 yw=0 ibu=57 og=1.059 dpl=8.99   "milkshake ipa"
rmwoods_332845   cor=0 op=1 yw=1 ibu=56 og=1.070 dpl=2.72   "white ipa all grain"
rmwoods_333122   cor=0 op=0 yw=0 ibu=22 og=1.060 dpl=5.43   "future farm ipa"
```

**Aksiyon:** white_ipa için spesifik feature gerek — `yeast_witbier OR has_coriander OR has_orange_peel` + `ibu > 40` + `dpl > 2` birleşik. Veya Sürpriz: name fallback (witbier kelimesi vs `wit`, `weizen ipa`, `belgian wit ipa` pattern).

---

## E. Brett Strain Detail Audit

### Brett strain breakdown (brett_beer n=101):

| Strain marker | Count | % |
|---|---|---|
| **No specific strain (only "brett" generic)** | **73** | **72.3%** ⚠️ |
| WLP brett ID match (WLP644-672 vs) | 22 | 21.8% |
| bruxellensis keyword | 20 | 19.8% |
| trois (Drie Fonteinen 3 strain) | 10 | 9.9% |
| Wyeast brett ID match (5112, 5151 vs) | 5 | 5.0% |
| lambicus | 2 | 2.0% |
| clausenii | 0 | 0% |

### Sample 30 brett_beer yeast detail:

**TÜM 30 SAMPLE'DA `[NONE]`!** BYO/AHA/TMF reçetelerinin pickle'da yeast detail YOK çünkü pickle sadece rmwoods raw'dan extract edilmiş — non-rmwoods reçetelerin yeast detail'i V19 dataset'in `features` dict'inde flag olarak duruyor (yeast_brett=1 vs) ama detay (brux/trois) yok.

Yani brett_beer'in %72.3'ü için spesifik strain bilgisi YOK. Sadece %27.7'si (28/101) için brux/trois/clausen ayırt edilebilir.

**Aksiyon:** brett strain detail feature engineering **veri yetersiz** — Adım 60'a ertele. Mevcut yeast_brett boolean'ı korunsun.

---

## Faz B Scope Önerileri (Onay 1 Bekliyor)

Audit bulgularına göre Faz B'de uygulanabilir feature'lar:

### Yapılabilir (data destekli):
1. **white_ipa_signal** birleşik feature
   - `(yeast_witbier OR has_coriander OR has_orange_peel) AND ibu > 40 AND dpl > 2`
   - Veya name fallback: `wit ipa`, `weizen ipa`, `white ipa`
   - Coverage tahmini: white_ipa %50+

2. **NEIPA name + og_low_ibu_high feature**
   - `name regex (neipa|hazy|juicy|new england|northeast)` veya
   - `og 1.055-1.075 AND ibu 50+ AND dpl > 3 AND srm < 6` birleşik
   - TMF reçeteleri name'den yakalanır
   - Coverage tahmini: NEIPA %70+

3. **has_dry_hop_extreme** (boolean)
   - `dpl >= 5.0` (NEIPA'nın p50'si)
   - Mevcut has_dry_hop_heavy threshold 5 g/L = aynı tanım, gerçekte ayrı feature olmaz
   - **Skip** — has_dry_hop_heavy ile aynı

4. **late_hop_extreme** (boolean)
   - `late_hop_pct >= 70%` (NEIPA p75 değerleri)
   - NEIPA'nın hop schedule imzası

### Yapılmayabilir (data yetersiz):
5. **Brett strain detail** (brux/trois/clausenii) — %27 coverage, signal zayıf
   - **Adım 60'a ertele**

6. **English bitter/EPA discriminator** — EPA n=103 zaten zayıf, sample'a dayalı feature güvensiz
   - **Mevcut taxonomy korunsun, küçük örneklem gürültüsü kabul**

7. **belgian_quadrupel ek dataset** — Adım 56'da denendi (Trappist filter), n=78 sınırı var
   - **Ek scrape gerek** (BJCP NHC winners, BeerXML community) — Adım 60'a ertele

### Skip (gerek yok):
- **has_salt filter sıkılaştırma** — zaten gose %72 vs Berliner %5 net ayrım

---

## Onay 1 Karar Noktaları (Kaan)

1. **white_ipa_signal feature** ekleyelim mi? (yeast_witbier OR has_coriander OR has_orange_peel) AND ibu>40 AND dpl>2
2. **NEIPA name fallback** ekleyelim mi? Recipe name'de neipa/hazy/juicy/new england pattern → has_neipa_name=1
3. **NEIPA og_ibu_combo feature** ekleyelim mi? og 1.055-1.075 AND ibu>50 AND dpl>3 AND srm<6
4. **late_hop_extreme** (lhp >= 70) ekleyelim mi?
5. **Brett strain detail Adım 60'a ertele** ✓ (data yetersiz)
6. **English EPA, Quadrupel ek scrape Adım 60'a ertele** ✓
7. **has_salt filter SKIP** ✓ (gose-dominant zaten)

**Net:** 4 yeni feature öneriliyor (white_ipa_signal, has_neipa_name, neipa_og_ibu_combo, late_hop_extreme). Dataset 89 → 93 feature olur.

V19.1 retrain reg V19 ile aynı (alpha=0.85, lambda=1.85, mcw=4, n_est=350).

Hangi yönde devam edelim?
