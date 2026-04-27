# STEP 47 — FE Sprint — COMPLETION REPORT

**Tarih:** 2026-04-27
**Sprint süresi:** ~1 saat (pre-flight 30 dk + rebuild 5 dk + train 5 dk + sour audit 5 dk + rapor 15 dk)
**Sonuç:** **🟡 MARGINAL** — V11 trained ama deploy threshold karşılanmadı (Top-1 +0.43pp <%1, Specialty +2pp <%5)

V11 NOT DEPLOYED. V10.1 mevcut canary. Code base'de V11 model + feature kalır.

---

## 🎯 V10.1 vs V11 metrik karşılaştırma

### Aggregate

| Metric | V10.1 | **V11 (76 feat)** | Δ |
|---|---:|---:|---:|
| 5-fold CV mean | 0.6851 | **0.6860** | +0.09pp |
| Train top-1 | 0.8090 | 0.8127 | +0.37pp |
| **Test top-1** | 0.6920 | **0.6963** | **+0.43pp** |
| Test top-3 | 0.8904 | 0.8904 | ≈ |
| Test top-5 | 0.9495 | 0.9495 | ≈ |
| Overfit gap | +0.117 | +0.116 | ≈ |

### Per-class top-1

| Cluster | V10.1 (n/top1/acc) | V11 (n/top1/acc) | Δ |
|---|---|---|---|
| American Hoppy | 460/396/86% | 460/396/86% | ≈ |
| German Lager | 289/233/81% | 289/238/82% | **+1pp ⭐** |
| Stout / Porter | 173/157/91% | 173/155/90% | -1pp |
| Irish / Red Ale | 147/85/58% | 147/89/61% | **+3pp ⭐** |
| Hybrid Ale-Lager | 114/53/46% | 114/52/46% | ≈ |
| **Specialty / Adjunct** | **83/7/8%** | **83/8/10%** | **+2pp** |
| German Wheat | 78/63/81% | 78/61/78% | -3pp ⚠️ |
| British Bitter / Mild | 65/33/51% | 65/32/49% | -2pp |
| **Belgian Pale / Witbier** | **62/33/53%** | **62/37/60%** | **+7pp ⭐⭐** |
| British Strong / Old | 59/19/32% | 59/19/32% | ≈ |
| Belgian Strong / Trappist | 50/34/68% | 50/34/68% | ≈ |
| Saison / Farmhouse | 33/16/52% | 33/17/52% | ≈ |
| **Sour / Wild / Brett** | **22/6/27%** | **22/6/27%** | **≈** (data quality issue, beklendi) |

### En büyük kazanım: Belgian Pale / Witbier +7pp

`has_belgian_yeast` feature (rank 12/76 importance 0.0202) — Belgian abbey yeast detection signal güçlü. Witbier reçetelerinde Wyeast 3787, WLP530 etc. yakalanıyor → **+7pp top-1 net kazanım** Belgian Pale/Witbier cluster'ında.

### Beklenen vs gerçek

| Cluster | Pre-flight beklenti | Gerçek | Status |
|---|---:|---:|---|
| Specialty Top-1 | %15-22 (revize) | **%10** | ⚠️ Düşük (sample n=83 küçük + heterojen) |
| Sour Top-1 | %23-26 (data fix yok) | **%27** | ✓ Tahmin tutarlı |
| Belgian Strong/Trappist | %71-74 | **%68** | ⚠️ Beklenenin altı |
| Belgian Pale/Witbier | (belirtilmedi) | **%60** | ⭐ Sürpriz kazanım |
| **Top-1 ortalama** | %70-72 | **%69.6** | ⚠️ Borderline (+0.43pp) |

---

## 🔍 Yeni feature ranking (76 feature içinde)

| Feature | Rank | Importance |
|---|---:|---:|
| **has_belgian_yeast** | **#12/76** | **0.0202** ⭐ |
| has_clean_us05_isolate | #35 | 0.0085 |
| has_fruit | #40 | 0.0069 |
| has_chili | #44 | 0.0064 |
| has_coffee | #56 | 0.0050 |
| has_smoke | #60 | 0.0045 |
| has_spice | #66 | 0.0030 |

→ has_belgian_yeast kuvvetli, diğer 6 marjinal. Adjunct keyword'ler düşük rank (ama kullanıldıklarında belirleyici).

---

## 🚦 Deploy Karar

User kuralları:
1. ✗ Top-1 V10.1 +1pp+ → V11 deploy → **gerçek +0.43pp** (eşik altı)
2. ✗ Top-1 V10.1'den DÜŞÜK → V11 deploy etme → değil (+0.43pp yüksek)
3. ✗ Specialty Top-1 +5pp+ → bağımsız deploy → **gerçek +2pp** (eşik altı)

**KARAR: V11 DEPLOY EDİLMİYOR.**

V10.1 default canary kalıyor (5-way toggle: V6/V8.5/V9/V10/V10.1). V11 model + feature code base'de kalır (`_v11_model_14cat.json`, `_ml_dataset_v11_pre_retrain.json`, `_v11_train_fe.py`) — gelecekte data quality fix sonrası yeniden değerlendirmeye uygun.

### Karar Gerekçesi

V11 marjinal kazanım (+0.43pp ortalama, +7pp Belgian Pale/Witbier, +3pp Irish/Red, +1pp German Lager, +2pp Specialty). Ama:
- Aggregate +0.43pp eşik altı (+1pp gerek)
- Specialty +2pp eşik altı (+5pp gerek)
- 2 cluster minor regression (-3pp German Wheat, -2pp British Bitter)
- Sour cluster IYILEŞMEDI (data quality bug çözülmedi, FE çare olmadı)

User'ın eşikleri konservatif — V11 model "fena değil ama deploy değer yok" kategorisinde. Belgian Pale/Witbier kazanımı tek başına deploy gerektirmiyor.

---

## 🐛 Sour Yeast Audit Özeti (Aşama 2.5)

**87 Sour reçetenin %59'u yeast field corrupted:**
- 13 empty
- 7 "[object Object]" (6/6 pilot bug)
- 20 prose paragraph (12 TMF + 6 recipator + 2 braureka)
- 11 medium freeform
- Sadece **33 short_strain_id (good!)** = %38

**Source breakdown:**
- pilot: 6/6 bozuk (100%) — `JSON.stringify({})` bug
- tmf: 12/31 prose (39%) — blog post body parse leakage
- recipator: 6/22 prose + 9 short_id (good)
- braureka: 14/19 short_id (good, %74)
- twortwat: 3 short_id (clean)

**Brett/Lacto/Pedio strain ID gerçek kullanım sayısı: ~5/87** (fiziken yetersiz). FE feature imkansız.

Detay: `_step47_sour_yeast_audit.md`

---

## 🛠️ Adım 48 önerisi — Data Quality Sprint

### 48A: pilot Brewfather re-fetch (~30 dk)
- 6 Sour pilot reçete `[object Object]` fix
- Diğer cluster'larda da pilot bug var mı tara
- Brewfather API tekrar kullan (Adım 1 token: `HGrEC0Rg7uN8vyerICT8Lo4gOJh1`)

### 48B: tmf yeast section re-parse (~1 saat)
- TMF 31 Sour recipe HTML re-parse
- "Yeast:" section regex (post body değil structured area)
- 12 prose-corrupted recipe → temiz strain ID

### 48C: recipator yeast cell validation (~30 dk)
- Recipator 22 Sour recipe yeast cell re-extract
- Notes vs Yeast ayrımı (HTML table column)

### Beklenen kazanım Adım 48 sonrası
- Sour cluster yeast usable rate: %41 → **%85+**
- Brett strain coverage Sour: %1 → **%30-50**
- Brett feature ML signal güçlenir → V12 Sour Top-1 %27 → **%40-50** tahmini
- has_belgian_yeast Sour'da çalışmaya başlar

### Yan etkiler
- Diğer cluster'larda da yeast data temizlenir
- Belgian Strong/Trappist abbey yeast signal güçlenir
- V12 retrain → genel Top-1 +%2-4 tahmini

---

## 📋 DECISION'lar (otonom)

- **DECISION-1:** brett/lacto/pedio/sour_blend feature'ları SKIP — pre-flight coverage <%0.2.
- **DECISION-2:** has_cocoa SKIP — Stout 55% false positive, regex broken, fix yetersiz (<10 record).
- **DECISION-3:** V11 NOT DEPLOY — user threshold karşılanmadı (+0.43pp < +1pp).
- **DECISION-4:** V11 model + feature code base'de SAKLA — Adım 48 sonrası yeniden değerlendirilecek.

---

## 📦 Çıktılar

- `_audit_step_47_preflight_summary.md` — Aşama 1 raporu
- `_step47_completion_report.md` — Bu rapor
- `_step47_sour_yeast_audit.md` — Sour audit raporu
- `_a47_yeast_coverage.js`, `_a47_adjunct_coverage.js`, `_a47_sour_yeast_audit.js` — analysis scripts
- `_a47_yeast_freq.json`, `_a47_adjunct_freq.json`, `_a47_sour_yeast_buckets.json` — data
- `_v11_rebuild.js` — V11 dataset builder
- `_v11_train_fe.py` — V11 train script
- `_ml_dataset_v11_pre_retrain.json` (17.2 MB) — V11 dataset (76 feature)
- `_v11_model_14cat.json` (3.0 MB) — V11 model (NOT DEPLOYED)
- `_v11_label_encoder_14cat.json` — V11 labels + 76 feature_list
- `_v11_metrics.json` — full metrics + per-class + feature importances

---

## 📊 ÖZET — Kaan'ın okuyacağı

🟡 **V11 marjinal — DEPLOY ETMEDİM.** Test Top-1 +0.43pp (eşik +1pp), Specialty +2pp (eşik +5pp). User kuralı sıkı uygulandı.

⭐ **Tek büyük kazanım: Belgian Pale/Witbier +7pp** (has_belgian_yeast feature rank 12 strong). Ama aggregate eşiği yetiştirmiyor.

🐛 **Sour cluster yeast field %59 bozuk:**
- pilot bug `[object Object]` 6/6 (%100)
- TMF blog parse leakage 12/31 prose
- Sadece ~5 gerçek brett strain ID — Sour cluster için FE imkansız bu data ile

🔧 **Adım 48 önerisi: Data quality sprint**
- pilot/tmf/recipator yeast re-extract
- Sour usable rate %41 → %85+
- V12 retrain sonrası Sour Top-1 %27 → %40-50 tahmini
- ~2-3 saat iş

📦 **V11 code base'de saklı** — data quality fix sonrası yeniden değerlendirilecek.

🤖 **4 DECISION verildi** — yeast pattern skip, cocoa skip, V11 not deploy, code save.

**STEP 47 COMPLETE — V11 trained, NOT DEPLOYED. Commit: pending.**
