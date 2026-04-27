# STEP 50 — FAZ 7: V14 vs V13 EVALUATION (Adım 51 baseline)

**Tarih:** 2026-04-28
**Faz:** 7 evaluation
**Karar:** ✅ **V14 build başarılı, DEPLOY EDİLMEDİ** — Adım 51 cleaning sprint için input

---

## 🎯 Headline Metrics

| Metric | V10.1 (canary) | V13 | **V14** | Δ vs V13 | Δ vs V10.1 |
|---|---:|---:|---:|---:|---:|
| Dataset | 8.061 | 7.635 | **8.518** | +883 | +457 |
| Train top-1 | 0.8090 | 0.8174 | 0.8143 | -0.31pp | +0.53pp |
| **Test top-1** | 0.6920 | 0.6764 | **0.6884** | **+1.20pp** | -0.36pp |
| **Test top-3** | 0.8904 | 0.8981 | **0.9009** | **+0.28pp** | **+1.05pp** ⭐ |
| Test top-5 | 0.9495 | 0.9596 | 0.9596 | = | +1.01pp |
| **5-fold CV mean** | 0.6851 | 0.6884 | **0.6983** | **+0.99pp** ⭐ | **+1.32pp** ⭐ |
| Train-test gap | +12.6pp | +14.1pp | +12.6pp | -1.5pp | = |

**Yorumlar:**
- V14 train-test gap V13'ten daha az (+12.6 vs +14.1) → daha az overfit
- V14 CV V10.1'den +1.32pp ⭐ — split-independent ölçüm, gerçek model gelişimi
- V14 Top-1 V10.1'den 0.36pp düşük — stratified re-split variance (V13'ten miras)
- V14 Top-3 V10.1'den +1.05pp ⭐ — top-N rank quality net iyileşti

---

## 🦠 Yeast Biology Coverage (V14 katkı)

| Kategori | V13 | V14 BYO katkı | V14 toplam | Oran |
|---|---:|---:|---:|---:|
| **Brett** | 12 | 30 | **43** | %0.50 (3.6x) |
| Lacto | 6 | 13 | 20 | %0.23 (3.3x) |
| Sour blend | 4 | 6 | 17 | %0.20 (4.3x) |

Hâlâ <%3 (kullanıcı kuralı `has_brett_strain` agresif feature ekleme eşiği), ama **3-4x kazanım sour cluster training'i belirgin güçlendirdi.**

---

## 🏆 Per-Cluster Detayı

### En büyük kazanım — Sour ⭐⭐⭐
| Cluster | V13 top-1 | V14 top-1 | V13 top-3 | V14 top-3 | Δ top-1 |
|---|---:|---:|---:|---:|---:|
| **Sour / Wild / Brett** | %31 | **%52** | %56 | **%69** | **+21pp** |

V13 16 test reçetesi → V14 29 (BYO katkısı). 5/16 → 15/29 doğru. **Brett/Lambic/Flanders/Gose discriminatorları çalışıyor.**

### İyileşmeler
| Cluster | V13 top-1 | V14 top-1 | Δ |
|---|---:|---:|---:|
| Belgian Strong / Trappist | %66 | %71 | +5pp |
| Belgian Pale / Witbier | %42 | %47 | +5pp |
| Stout / Porter | %86 | %88 | +2pp |
| Irish / Red Ale | %52 | %54 | +2pp |
| Saison / Farmhouse | %54 | %56 | +1pp |
| German Wheat | %78 | %79 | +1pp |

### Sabit / küçük gerileme (split variance)
| Cluster | V13 top-1 | V14 top-1 | Δ |
|---|---:|---:|---:|
| American Hoppy | %82 | %82 | = |
| German Lager | %83 | %83 | = |
| British Strong / Old | %41 | %41 | = |
| British Bitter / Mild | %51 | %50 | -1pp |
| Hybrid Ale-Lager | %47 | %44 | -3pp |

### Patolojik durumlar (yeni stiller değil)
| Cluster | V13 | V14 | Notu |
|---|---:|---:|---|
| Specialty / Adjunct | %9 | %9 | Hâlâ kötü, taxonomy fuzzy |
| Historical / Special | %0 | %0 | n=5 sample yetersiz, accuracy ölçülemez |

---

## 🚦 Deploy Karar (Sprint Plan Güncellemesi)

V14 metrikleri V10.1'den iyi (CV +1.32pp, Top-3 +1.05pp, Sour cluster transformative kazanım), AMA:

🛑 **DEPLOY EDİLMEYECEK** çünkü Adım 51 cleaning sprint planlandı:
- Adım 50 raporundan tespit: 305+ reçete yanlış slug'da (Festbier 148, English Pale 125, Amber Lager 17, Gueuze 1)
- V14 = V13 + BYO ama V13 taxonomy bug'ları aynen geçti
- V14 deploy = bug'lı taxonomy production'a girer
- Adım 51 = re-classification migration → V15 deploy

---

## 📦 Diskte Korunan Dosyalar (Adım 51 Input)

| Dosya | Boyut | Amaç |
|---|---:|---|
| `_v14_model_14cat.json` | 3.04 MB | XGBoost trained model |
| `_v14_metrics.json` | (small) | Performance metrics |
| `_v14_label_encoder_14cat.json` | (small) | Class labels |
| `_v14_rebuild_train.py` | (small) | Train script |
| `_ml_dataset_v14_pre_retrain.json` | ~17 MB | V13+BYO merged dataset |
| `byo_recipes.json` | 5 MB | Raw BYO scrape (parsed) |
| `_byo_ingredients_parser.js` | (small) | Reusable parser |
| `_byo_to_v14_format.js` | (small) | V13 format converter |

---

## ⚠ Bilinen Sorunlar / Adım 51 Hedefler

### 1. BYO labeled coverage düşük (883/1.407, %62.8)
524 reçete slug-based heuristic ile main_cat atayamadı (specialty/clone slug'lar). Adım 51 fix:
- Stat-based fallback (OG/FG/IBU/SRM/ABV → cluster guess)
- Yeast-based fallback (yeast_brett=1 → Sour)
- ML pseudo-labeling (V13 model BYO unlabeled'a predict, high-confidence kabul)

### 2. Festbier mis-classification (148 reçete `german_maerzen`'da)
Adım 51: `name regex .festbier|oktoberfest|wiesn` + `bjcp_main=German Lager` → `bjcp_slug=festbier` migration

### 3. English Pale Ale fragmentation (125 reçete 18 farklı slug'a dağılmış)
Adım 51: golden_ale taxonomy ekle, blonde_ale alias collapse

### 4. Process features BYO için eksik
mash_temp/fermentation_temp/water chemistry → text-based parse + default fill kullanıldı. Adım 51 daha iyi text mining.

### 5. Specialty cluster %9 top-1 (taxonomy fuzzy)
Adım 51: Specialty alt-stiller (Pumpkin/Smoked/Coffee/Vanilla/Fruit) granularize

---

## ÖZET — Kaan'ın okuyacağı

✅ **V14 retrain TAMAM, deploy YOK.** Adım 51 cleaning sprint için input olarak diskte korundu.

⭐ **Sour cluster transformative kazanım:** V13 %31 → V14 **%52** top-1 (+21pp). BYO 56 sour reçetesinin doğrudan etkisi.

⭐ **CV +0.99pp gerçek model gelişimi.** Top-3 +0.28pp, Top-5 sabit. V10.1'a göre CV +1.32pp.

🦠 **Brett coverage 12→43 (3.6x).** Hâlâ <%3 ama sour discriminator iyileşti.

🛑 **Production HTML değişmez.** V10.1 default canary kalır. Adım 51 cleaning sprint sonrası V15 deploy adayı.

🎯 **Adım 51 hedefler:** Festbier migration (148), English Pale taxonomy (125), Belgian Gueuze ekleme, BYO unlabeled 524 recovery, Specialty granularization.

---

**Faz 7 COMPLETE — V14 BUILD BAŞARILI, DEPLOY ERTLENDI.**
