# AUDIT STEP 38 — V6 + V7 PARALEL RETRAIN

**Tarih:** 2026-04-26
**Mod:** Otonom
**Sonuç:** **V7 XGBoost 14 main_category (CV-tuned) en iyi: top-1 54.1%, top-3 77.4%, top-5 85.6%.** V6 holdout %80.8 (top-3) ile yakın seviyede. Stout/Porter ve American Hoppy cluster'larda mükemmel, küçük cluster'larda (Belgian/British/Specialty) başarısız.

---

## TRACK A: V6 KNN port

### Port detayı
**Tam V6 mimarisi DEĞİL — basitleştirme:**
- ✅ Manhattan distance + distance-weighted voting (V6 weighted Manhattan)
- ❌ Multi-K aggregation (K=3+5+7) — port'ta tek K=5 (n_classes/2 cap)
- ❌ Per-feature importance weighting (V6'da custom feature weights vardı)
- ❌ BJCP range veto rules (V6'da `__BM_DEFS` aralık dışı sınıflar elenir)

Port: `KNeighborsClassifier(n_neighbors=5, metric='manhattan', weights='distance')`

**Bu V6 baseline KNN — gerçek V6 daha karmaşık (multi-K + veto). Port basit benchmark amaçlı.**

### A2 — V6 KNN 73 class
- Train top-1: 99.6% | Test top-1: 25.4% | Top-3: 42.4%
- Gap: +0.74 — KNN ezbere kayıyor (k=5 küçük + 73 class bölünmüş)
- Belgian Trappist: tüm 4 stilde 0/1 (test n=1 her biri)

### A3 — V6 KNN 14 main_category
- Train top-1: 99.8% | **Test top-1: 51.4%** | **Top-3: 70.0%** | Top-5: 76.7%
- Gap: +0.48 — class merge ile KNN dengesi düzeldi
- **Belgian Strong/Trappist: 1/4 top-1, 1/4 top-3** ✓ (en iyi Belgian sonucu)

---

## TRACK B: V7 XGBoost retrain

### B1 — Veri prep
- Adım 33 dataset (613 reçete, 69 feature)
- Train 467 / Test 146 stratified split mevcut
- Label: `bjcp_main_category` (14 + 1 unmapped = 15 class)

### B2 — Hyperparameter sweep (5-fold CV, 14 cat)

| max_depth | n_est | CV acc |
|---:|---:|---:|
| **3** | **100** | **0.6916** ⭐ |
| 4 | 100 | 0.6916 |
| 4 | 200 | 0.6873 |
| 3 | 200 | 0.6851 |
| 5 | 100 | 0.6852 |
| 4 | 400 | 0.6831 |
| 5 | 200 | 0.6830 |
| 3 | 400 | 0.6809 |
| 5 | 400 | 0.6787 |

**Best: depth=3, n_estimators=100** — basit model en iyi (overfit riski azaldı).

### B3 — Final eval

| Config | Train | Test top-1 | Test top-3 | Test top-5 | Gap |
|---|---:|---:|---:|---:|---:|
| V7_XGB_73class | 0.964 | 0.356 | 0.525 | 0.593 | +0.61 |
| V7_XGB_14cat (default) | 0.994 | 0.534 | **0.781** | 0.849 | +0.46 |
| **V7_XGB_14cat (CV-best)** | **0.953** | **0.541** | 0.774 | **0.856** | **+0.41** |

CV-tuned (depth=3, n_est=100) overfit gap'i 0.46 → 0.41 azalttı, top-1 %53.4 → 54.1, top-5 %85 → 86.

### Per-main_category accuracy (test, V7 14cat best)

| Main Category | Test n | Correct | Acc | Status |
|---|---:|---:|---:|---|
| **Stout / Porter** | 26 | 25 | **0.96** | ⭐ Mükemmel |
| **American Hoppy** | 38 | 32 | **0.84** | ⭐ Çok iyi |
| German Lager | 18 | 11 | 0.61 | ✓ Kabul edilebilir |
| Sour / Wild / Brett | 8 | 5 | 0.62 | ✓ |
| Irish / Red Ale | 3 | 1 | 0.33 | ⚠️ |
| Saison / Farmhouse | 7 | 2 | 0.29 | ⚠️ |
| Belgian Pale / Witbier | 4 | 1 | 0.25 | ⚠️ |
| German Wheat | 5 | 1 | 0.20 | ⚠️ |
| Hybrid Ale-Lager | 7 | 1 | 0.14 | ❌ |
| Specialty / Adjunct | 12 | 0 | **0.00** | ❌ |
| Belgian Strong / Trappist | 4 | 0 | **0.00** | ❌ |
| British Strong / Old | 6 | 0 | **0.00** | ❌ |
| British Bitter / Mild | 3 | 0 | **0.00** | ❌ |
| Historical / Special | 2 | 0 | 0.00 | ❌ |
| unmapped | 3 | 0 | 0.00 | ❌ |

**Pattern:**
- ✅ n>=18 cluster'lar %60-96 (Stout, American Hoppy, German Lager)
- ⚠️ n=4-12 cluster'lar %14-33 (Hybrid, Saison, Belgian Pale, Wheat)
- ❌ n<4 cluster'lar %0 (Trappist, British, Specialty)

### ONNX export
**Tekrar BAŞARISIZ.** Aynı `Field onnx.AttributeProto.ints: Expected an int, got a boolean` hatası — onnxmltools 1.13 + xgboost 2.1 incompat. Tested target_opset 11/12/15/18, hepsi aynı hata.

**Workaround:** JSON model 1.2 MB (14cat) — Adım 34'teki 8.6 MB (73class) modelinin 1/7'si. Browser inference template (`_v7_inference_template.js`) kullanılabilir, daha hızlı.

---

## TRACK C: Kıyas Matrisi

### Genel performans

| Config | n_class | Test top-1 | Test top-3 | Test top-5 | Train/test gap |
|---|---:|---:|---:|---:|---:|
| V6 KNN 73 class | 73 | 0.254 | 0.424 | 0.491 | +0.74 |
| V7 XGB 73 class | 73 | 0.356 | 0.525 | 0.593 | +0.61 |
| V6 KNN 14 cat | 15 | 0.514 | 0.699 | 0.767 | +0.48 |
| V7 XGB 14 cat (default) | 15 | 0.534 | 0.781 | 0.849 | +0.46 |
| **V7 XGB 14 cat (CV-best)** | **15** | **0.541** | **0.774** | **0.856** | **+0.41** |

### Belgian Trappist family

| Config | test_n | top-1 | top-3 |
|---|---:|---:|---:|
| V6 KNN 73 class | 4 (1 her stil) | 0/4 | 0/4 |
| V7 XGB 73 class | 4 | 0/4 | 0/4 |
| **V6 KNN 14 cat** | **4** | **1/4** | **1/4** ⭐ |
| V7 XGB 14 cat (default) | 4 | 0/4 | 1/4 |
| V7 XGB 14 cat (CV-best) | 4 | 0/4 | 1/4 |

**V6 KNN 14cat Belgian'da en iyi** — main category bazında 1 doğru top-1. V7 XGBoost top-3'e Belgian'ı sokuyor ama top-1'i kaçırıyor. Trade-off: V7 overall %20 daha iyi ama V6 KNN Belgian'ı tek başarı.

### Train/test gap (overfit endişesi)

V6 KNN ve V7 XGBoost ikisi de 73 class'ta CIDDI overfit (~0.6-0.74 gap). 14 cat'a inince gap 0.41-0.48'e düşüyor. **CV-tuned V7 en az overfit** (+0.41).

### Top-3 V6 holdout karşılaştırması

V6 motor (HTML'de inline) holdout 260 sample'da %80.8 (Adım 16 raporu). **V7 XGB 14cat: %77.4** — **V6 holdout'a 3.4 puan yakın**, V7 dataset 613 (V6 dataset 1100'ün %56'sı) ile.

---

## TRACK D: Production Önerisi

### Karar: V7 XGBoost 14cat (CV-best) **production-ready** (kısıtlı kapsamla)

**Güçlü yanlar:**
- Top-3 %77 — V6 holdout %80.8'e yakın
- Top-5 %86 — pratik kullanımda yeterli
- Stout/Porter/American Hoppy cluster'larda mükemmel (%84-96)
- Model 1.2 MB (8.6 MB 73class'tan küçük, browser-friendly)
- CV-tuned (overfit en azaltılmış)

**Zayıf yanlar:**
- Belgian Strong/Trappist sıfır (Brewmaster Dubbel kullanıcısı hâlâ yanlış)
- British/Specialty/Hybrid cluster'lar %0
- Sadece 4-5 ana kategori reliable
- Alt-stil (Dubbel vs Tripel) ayrımı yok — sadece "Belgian Strong" ana kategori

### Hibrit yaklaşım (önerilen)

**V7 XGB 14cat + V6 inline (alt-stil için)** kombine:

1. **V7 XGB 14cat** main category tahmin (mevcut V6 inline yerine)
   - Top-3 main category döner
   - %77 top-3 accuracy
2. **V6 inline (HTML mevcut)** alt-stil için
   - Sadece tahmin edilen main_category içindeki stiller arasında V6 KNN
   - Belgian Strong → Dubbel/Tripel/Quad/BSDA arasından V6 seçer
   - Smaller search space → daha doğru
3. **V2c kural-bazlı** son fallback (BJCP range check)

Bu üç-katmanlı hibrit Brewmaster'ın eskinden mevcut V6 + V2c motorunu **V7 ile geliştirir** (V6 alone kalmaz, V7 broad picture + V6 fine-grain + V2c sanity).

### Alternatif: V6 inline mevcut, V7 dropping

Eğer Belgian/Trappist cluster Brewmaster için kritikse (Kaan'ın test reçetesi Dubbel) ve V6 mevcut HTML'de **1100 reçete dataset'le %80 holdout** veriyorsa:
- **V6 mevcut HTML inline kalsın** (production)
- **V7 sprint pause** — yeterli veri yokken XGBoost daha iyi olamıyor

V6 dataset (1100 reçete, V5/V6 motor inline'da) Brewmaster'ın **gerçek production motoru** zaten. Adım 25 V6 fix'leri sonrası (commit 9848e96) güncel V6 motoru çalışıyor. Yeni V7 motoruna geçiş için **V7 dataset 1500+ reçete** olmalı (dataset hedefi karşılanmadı — Adım 37'de teyit).

**Pragmatik karar:** V7 motor henüz production-ready DEĞİL Brewmaster ana kullanımı için. V6 inline mevcut motor kalır, V7 sadece **V8+ Brewmaster yeni feature'ları** için referans (örn. Brew Day Wizard'da style suggestion gösterimi).

---

## Sonraki adım önerileri

### Opsiyon A — V7 sprint pause + V6 mevcut motor production
- V6 1100 reçete dataset (HTML inline) zaten Brewmaster production motor
- Adım 25 V6 fix'leri uygulandı (yeast_belgian/abbey, mash_type_step, hop/katki port, pct_base trappist conditional)
- **Yeni feature geliştirmeye dön (V8 roadmap, Adım 36'dan)**
- Önerilen: **Adım 39 = Türkçe BJCP isim eklenmesi** (`__BM_DEFS`'e tr_name field, AI çeviri 248 stil)

### Opsiyon B — V7 hibrit production
- V7 XGB 14cat HTML'e inject (Adım 39)
- Mevcut V6 inline yanına ek motor (canary)
- Kullanıcı UI'sında "V6 / V7 / Hibrit" toggle göster
- A/B test data toplansın
- **İş yükü:** 1 sprint (HTML inject + JSON model + label encoder load)

### Opsiyon C — V7 dataset boost sprint (Adım 37 önerisi tekrar)
- Reddit r/Homebrewing 100 post WebFetch (50 dakika otonom)
- Belgian/Trappist hedefli arama
- Yeni 30-50 reçete potansiyeli
- V7 retrain
- **Risk:** %30-50 quality, hâlâ Belgian cluster <10 olabilir

### Önerim: **Opsiyon A** (V8 roadmap'e geçiş)

Sebep:
1. V7 dataset toplama 5 sprint'te başarısız (Adım 28-30-35-36-37)
2. V7 XGB 14cat top-3 %77 — V6 inline %80'in altında, V6'yı geride bırakmıyor
3. V6 inline mevcut motor zaten Brewmaster production'da
4. Brewmaster'ın **gerçek değer farkı** ML motor değil **Türkçe UX + PWA + free inventory + Türkiye-spesifik malzeme** (Adım 36 raporu)
5. V8 feature'lar (water dual profile, yeast pitch, brew day wizard) Brewfather paritesi sağlar + Brewmaster diferansiyatörlerini güçlendirir

---

## Çıktılar (commit'lenecek)

- `_v6_v7_compare.py` — paralel kıyas script
- `_v7_train_14cat.py` — final 14cat model + ONNX deneme
- `_v7_model_14cat.json` — 14cat XGBoost (1.2 MB)
- `_v7_label_encoder_14cat.json`
- `_v7_metrics_14cat.json` — per-class breakdown
- `_v6_v7_results.json` — 4 config karşılaştırma
- `_audit_step_38_v6_v7_comparison.md` — bu rapor

ONNX YOK — bilinen onnxmltools incompat (Adım 34'te aynı problem).
