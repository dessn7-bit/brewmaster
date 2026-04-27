# STEP 47 — SOUR CLUSTER YEAST FIELD AUDIT

**Tarih:** 2026-04-27
**Sprint:** Adım 47 Aşama 2.5 (yan iş)
**Sonuç:** **Sour cluster yeast data %62 unusable** (boş + corrupt + prose). Ana suçlu: `pilot` source `[object Object]` bug + TMF blog parse leakage.

---

## 1. Özet

Sour/Wild/Brett cluster: **87 reçete** (V10.1 dataset).

### Kalite dağılımı

| Bucket | n | % | Açıklama |
|---|---:|---:|---|
| **empty** | **13** | **15%** | yeast field tamamen boş |
| **object_string** | **7** | **8%** | "[object Object]" — array stringify bug |
| **prose_paragraph** | **20** | **23%** | >80 char, blog post body sızmış |
| **medium_freeform** | **11** | **13%** | 40-80 char, parse-able olmayan |
| short_strain_id (good!) | 33 | 38% | <40 char, gerçek strain ID |
| array_string | 3 | 3% | "Yeast A \| Yeast B" multiline |
| **TOPLAM USABLE** | **36** | **41%** | (short + array, kullanılabilir) |
| **TOPLAM CORRUPTED** | **51** | **59%** | empty + obj + prose + medium |

→ **Sour cluster'ın %59'u feature engineering için kayıp.** Brett/Lacto/Pedio strain ID feature'ı bu data ile imkansız.

---

## 2. Source breakdown

Sour by source (87 toplam):
| Source | Sour count |
|---|---:|
| tmf | 31 |
| recipator | 22 |
| braureka | 19 |
| pilot | 6 |
| diydog | 6 |
| twortwat | 3 |

### Bug 1: `pilot` source — `[object Object]` (6/6 = %100)

```
pilot:v1_046  "Gordon Strong German Gose"          → "[object Object]"
pilot:v1_048  "Berliner Weisse Napoleon's Champagne" → "[object Object]"
pilot:v1_061  "DewBrew Flanders Red"                 → "[object Object]"
pilot:v1_102  "Lindemans Lambic clone"               → "[object Object]"
pilot:v1_172  "Flanders Brown Ale"                   → "[object Object]"
+ 1 more
```

**Kök neden:** Pilot dataset (Adım 1-2 dönemi, 2026-04-23) Brewfather BeerXML import'unda yeast array → string conversion'ı `JSON.stringify({}) → "[object Object]"` ile yanlış yapılmış. Gerçek strain isimleri kayıp.

### Bug 2: `tmf` (Mad Fermentationist) — prose contamination (12/31 = %39)

TMF blog post parse'ında `<RECIPE>` BeerXML içindeki yeast field değil, blog **post body** sızmış:

```
tmf:fermented-acorn-sour-brown.html → 
  "Oud Brune (which contains no Brett, only Sacch and Lacto). ECY Flemish Ale is sti..."

tmf:american-lambic-spontaneous.html → 
  "I captured in my backyard and barrel room boosted my confidence, the starters had..."

tmf:lambic-that-real-king-of-funk.html → 
  "and bacteria will feed on during the long fermentation. I did a simpler procedure..."
```

**Kök neden:** TMF parse script (Adım 14 öncesi, eski) recipe HTML'inden yeast section'ı extract ederken sentence boundary tespit edememiş. İlk paragrafı yeast field'a yapıştırmış. Sonradan Adım 33+ TMF data integrate edildi — bug taşındı.

### Bug 3: `recipator` — partial parse (6/22 prose)

Recipator HTML parse (Adım 42'de yazıldı) bazı reçetelerde recipe tablosundaki Notes alanını yeast'a karıştırmış.

### İyi data: `braureka` 14/19 short ID (%74)

Braureka BeerXML structured data — yeast field clean strain ID veriyor. Best source.

---

## 3. Sour cluster gerçek yeast strain ID dağılımı (33 short_strain_id)

| Yeast strain | n |
|---|---:|
| US-05 | 2 (Sour'da pitch hata, tahminim) |
| Wyeast 5278 Belgian Lambic Blend | 2 |
| Lallemand Sourvisiae | 2 |
| culture maredsous + westmalle | 1 |
| Boulevard Saison Brett Dregs | 1 |
| Wyeast Bavarian Wheat | 1 |
| ... ve 25 farklı strain (her biri 1 kez) |

→ **Gerçek brett/lacto/pedio strain ID kullanım sayısı: ~5.** Feature için fiziksel olarak yetersiz n.

---

## 4. Etki — V11 feature'larına yansıma

V11'de eklediğim 7 feature'dan **brett/lacto/pedio/sour_blend** zaten Aşama 1 pre-flight'ta SKIP edildi (coverage <%0.2).

**Eğer Sour yeast data temiz olsaydı** (Adım 48 fix), brett feature potansiyel coverage:
- Mevcut: 5 brett strain → V11 feature 14 hits
- Fix sonrası: 51 corrupted record fix edilirse → tahmini **+20-30 brett strain hits**, %0.5 coverage olabilirdi (hâlâ düşük ama anlamlı)
- Sour cluster içinde brett feature %25-40 hit oranı olabilirdi (%6 mevcut)

→ Sour Top-1 iyileşmesi için **data quality fix Adım 48 zorunlu**.

---

## 5. Adım 48 önerisi — Data Quality Sprint

### 48A: pilot `[object Object]` re-extraction
- 6 pilot Sour recipe Brewfather'dan re-fetch
- Yeast array → string conversion fix
- Diğer cluster'larda da pilot bug var mı tara (American Hoppy, Stout)
- ~30 dk iş

### 48B: tmf yeast extraction re-parse
- TMF 31 Sour recipe HTML re-parse
- Recipe HTML'de "Yeast" section regex (post body değil)
- 12 prose-corrupted recipe → temiz strain ID
- ~1 saat iş

### 48C: recipator yeast field validation
- Recipator 22 Sour recipe yeast field re-extract
- Notes vs Yeast cell ayrımı
- ~30 dk iş

### Toplam Adım 48 hedef
- Sour cluster yeast usable rate: %41 → **%85+**
- Brett/Lacto/Pedio feature coverage Sour cluster içinde: %1 → %30-50
- Brett feature ML signal güçlenir → Sour Top-1 %27 → **%40-50** tahmini

### Yan etki
- Diğer cluster'lar için de yeast data temizliği gelir
- Belgian Strong/Trappist içinde abbey yeast feature güçlenir
- Saison içinde yeast_saison signal artar

---

## 6. Çıktılar

- `_step47_sour_yeast_audit.md` — Bu rapor
- `_a47_sour_yeast_audit.js` — audit script
- `_a47_sour_yeast_buckets.json` — full bucket detail (87 recipe per-yeast)
