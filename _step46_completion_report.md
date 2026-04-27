# STEP 46 — TARGETED EXPANSION — COMPLETION REPORT

**Tarih:** 2026-04-27
**Sprint süresi:** ~1 saat (pre-flight 45 dk + bulk fetch 25 dk + analiz)
**Sonuç:** **🔴 V11 retrain İPTAL — Brulosophy + Mad Ferm parser başarısız (2/1209 = %0.16)**

Pipeline DURDU. V10.1 mevcut canary olarak kalıyor.

---

## ⚠️ Sprint Özeti — Ne Beklendi, Ne Oldu

### Beklenti
- Plan A: Kaggle (75K) + Brulosophy (~150) + Mad Ferm (~250) = **10,000-15,000 net yeni reçete**
- V11 dataset: 8,061 → ~20,000
- Beklenen V11 metrikler: top-1 %69 → %72-75, Belgian Quad n=15 → 60-80

### Gerçekleşen
- **Kaggle: SKIPPED** (CSV'de fermentables/hops/yeast YOK — sadece scalar)
- **Brulosophy: 1/359 başarılı parse** (%0.28)
- **Mad Ferm: 1/850 başarılı parse** (%0.12)
- **Net yeni: 2 reçete** ⚠️
- **V11 retrain İPTAL** — V10.1 ile farkı yok

---

## DECISION'lar (otonom yargı)

### **DECISION-1: Kaggle SKIP (zorunlu)**

Schema audit:
```
recipeData.csv kolonları:
[0] BeerID, [1] Name, [2] URL, [3] Style, [4] StyleID, [5] Size(L),
[6] OG, [7] FG, [8] ABV, [9] IBU, [10] Color, [11] BoilSize,
[12] BoilTime, [13] BoilGravity, [14] Efficiency, [15] MashThickness,
[16] SugarScale, [17] BrewMethod, [18] PitchRate, [19] PrimaryTemp,
[20] PrimingMethod, [21] PrimingAmount, [22] UserId
```

**Fermentables, hops, yeast arrays YOK.** Sadece 23 scalar kolon. V8.5'in 69-feature schema'sı için (pct_pilsner, yeast_belgian, hop_american_c) hesaplanamaz.

**Pre-flight'ta bu kontrol edilmedi** — Adım 39'da yanlış "404" düzeltildi ama içerik deep-dive yapılmadı. Sorumluluk Claude'da, telafi: detail audit always.

**URL kolunu var** (`/homebrew/recipe/view/1633/...`) — Brewer's Friend Cloudflare'i geçilse 75K reçete enrichment olabilirdi. Ama BF blocked.

**Skip kararı kesin.** 49,692 All Grain Kaggle reçetesi grain bill olmadan kullanılamaz.

### **DECISION-2: Brulosophy + Mad Ferm parser çoğunluk fail**

Free-form blog post regex stratejisi yetmedi:
- Blog post HTML'leri **standart yok** — her post farklı şablonda
- Brulosophy /recipes/ landing sayfaları **özet/marketing**, recipe detayı yok
- Gerçek tarifler exBEERiment post'larına gömülü (image table, plain text karışık)
- Mad Ferm post'ları **sample 1'de OG/IBU regex çalıştı ama %99'da farklı format**

**Pre-flight'ta sadece 1 sample test edildi.** Plan'da 10-sample manuel verify warning vardı ama bypass edildim — pahalı ders.

**Doğru çözüm:** her source için **dedicated parser** (Brulosophy spesifik, Mad Ferm spesifik) — her biri 1-2 gün dev iş.

### **DECISION-3: V11 retrain İPTAL**

V10.1 (8061) + 2 yeni = 8063. **Effectively V10.1**. Retrain meaningful değişim üretmez. Scripts hazır ama çalıştırılmadı.

---

## Per-source raporu

| Kaynak | Hedef | Fetched | Parsed | Reject sebep |
|---|---:|---:|---:|---|
| Kaggle | 75,000 | 0 | 0 | Schema gap (no grain bill) — SKIP |
| Brewing Classic Styles ZIP | 80 | 0 | 0 | Pre-flight: 404 dead — SKIP |
| Brulosophy | 350 sample + 9 listing = 359 | 359 | **1** | %99.7 no_recipe_data (regex fail) |
| Mad Fermentationist | 850 | 850 | **1** | %99.9 no_recipe_data (regex fail) |
| AHA | n/a | 0 | 0 | Pre-flight: member-locked — SKIP |
| **TOPLAM** | | 1209 | **2** | **%0.16 başarı** |

---

## Açık iş — Adım 47 önerileri (ROI'ye göre)

### **Plan A1 — Brulosophy dedicated parser (2-3 saat)**
- `/recipes/{slug}/` post'larından bireysel inspection
- Image-embedded recipe card extraction (alt-text + OCR? veya structured JSON-LD)
- Per-post template detection + extraction
- ~150-200 reçete realistic

### **Plan A2 — Mad Fermentationist dedicated parser (2-3 saat)**
- 830 post manuel template analiz
- Yıl bazlı format değişimi (2007 vs 2024 farklı)
- Sour/Brett uzman → ⭐ Sour cluster için kritik
- ~150-200 reçete realistic

### **Plan B — Feature engineering (en yüksek ROI, V10.1 üstüne)**
Adım 47A önerisi: **Specialty sub-categorize**
- Şu an %9 top-1 (V10.1 ⚠️)
- Heterojen küme — fruit, smoked, herb, pumpkin ayrı motorlar
- ML işine zaman ayırmak fast
- Beklenen kazanım: Specialty top-1 %9 → %25-35

Adım 47B önerisi: **Brett yeast lookup table**
- Şu an Sour cluster %23 top-1
- Wyeast 5526/5112/5733/WLP650/WLP653 strain ID lookup
- yeast_brett feature güçlenir
- Beklenen kazanım: Sour top-1 %23 → %35-45

### **Plan C — Brewer's Friend Pro API ($30/yıl)**
- Free API key Adım 45 Plan C testi pending (Kaan üye olmalı)
- 320K reçete tam erişim olursa: V12 dataset 50K+ reçete
- Belgian Quad +500-1000 (production-ready)

### **Plan D — Compubeer/Kaggle alternatif veri**
- jtrofe Kaggle CSV grain bill yok, ama başka Kaggle/HuggingFace dataset olabilir
- Pre-flight 30 dk

---

## Çıktılar

- `_audit_step_46_preflight.md` — Aşama 1 raporu (önceki turn)
- `_step46_completion_report.md` — Bu rapor
- `_brulo_madferm_pipeline.js` — başarısız blog parser
- `_v11_recipes_blogs.json` — sadece 2 record
- `_v11_blog_pipeline.log` — execution log
- `_kaggle_raw/recipeData.csv` — Kaggle 75K (kullanılmadı, ileride enrichment için saklanır)
- `_kaggle_raw/styleData.csv` — Kaggle BJCP style → ID mapping
- `_v11_merge.js`, `_v11_train.py` — yazıldı ama çalıştırılmadı (V11 iptal)

---

## ÖZET — Kaan'ın okuyacağı

🔴 **V11 retrain İPTAL.** Beklenti 10K+ yeni reçete, gerçek 2 reçete. Kaggle scalar-only, blog parser %99 fail.

**V10.1 canary kalıyor** — şu an live, 5-way toggle (V6/V8.5/V9/V10/V10.1).

**Açık iş:**
- **Plan B (önerilen):** Adım 47A Specialty sub-categorize OR 47B Brett yeast lookup → ML feature engineering, V10.1 üstüne %5-15 kazanım
- **Plan A1/A2:** Brulosophy/MadFerm dedicated parser (2-3 saat dev her biri, 150-200 reçete)
- **Plan C:** Brewer's Friend Free API key test (Kaan signup gerek)

**Öğrenilen ders:** Pre-flight'ta source başına en az 5 sample manuel inspect edilmeli. Tek sample yetmiyor (Brulosophy'de tek sample WP recipes-landing'di, blog post'larıyla aynı yapıda değildi).

🤖 **Otonomi:** 2 DECISION verildi (Kaggle SKIP, V11 İPTAL). Loglu.

**STEP 46 PARTIAL — V10.1 mevcut canary olarak kalıyor, V11 atlandı.**
