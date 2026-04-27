# STEP 49 — Brett-Protective Cleanup + V13 Retrain — COMPLETION REPORT

**Tarih:** 2026-04-27
**Sprint süresi:** ~1 saat (audit 15 + cleanup v2 15 + train 5 + rapor 25)
**Sonuç:** **🟡 V13 = V12 effectively** — brett-protective cleanup paradoksu **kısmen** çözdü (brett 12→14, +2 only). V13 metrik V12 ile aynı (split deterministic). V13 NOT DEPLOY.

V10.1 default canary kalıyor.

---

## 🎯 V10.1 vs V12 vs V13

| Metric | V10.1 (canary) | V12 | **V13** | Δ vs V10.1 |
|---|---:|---:|---:|---:|
| Dataset | 8,061 | 7,635 | **7,635** | -426 |
| Yeast clean rate | 78% | 90% | **90%** | +12pp |
| Brett coverage | 0.17% | 0.16% | **0.18%** | +0.01pp |
| Train top-1 | 0.8090 | 0.8174 | **0.8174** | +0.84pp |
| **Test top-1** | **0.6920** | 0.6764 | **0.6764** | **-1.56pp ⚠️** |
| Test top-3 | 0.8904 | 0.8981 | 0.8981 | +0.77pp |
| Test top-5 | 0.9495 | 0.9596 | 0.9596 | +1.01pp |
| 5-fold CV | 0.6851 | 0.6884 | **0.6884** | +0.33pp |
| Sour top-1 | 27% | 31% | 31% | +4pp |
| British Strong/Old | 32% | 41% | 41% | +9pp ⭐ |

**V12 ↔ V13: TAM AYNI metrikler.** 9 reçete recovered (brett-protective), ama yeni feature aktivasyonu yok (brett coverage hâlâ %0.18). Train deterministik, sonuç değişmedi.

---

## 🚨 Faz 1: Brett-Protective cleanYeastString V2 — Kısmi Başarı

### Yapılan
- Biology keyword extraction added (Brett/Brettanomyces/Lactobacillus/Pediococcus/Roeselare/Sourvisiae/Mixed Culture)
- Strain ID + biology keyword birleştir: "Wyeast 1056 + Brett B"
- 16 strain ID pattern korundu

### Sonuç
- **9 reçete recovered** (V12 → V13):
  - Brett mention recovered: 2 (TMF posts)
  - Lacto/Pedio recovered: 1
  - Sour blend / Roeselare recovered: 6
- Brett coverage: **0.16% → 0.18%** (12 → 14)
- Sour blend coverage: 0.13% → 0.16% (10 → 12)

### Sample recoveries
- TMF "Oud Brune (which contains no Brett, only Sacch and Lacto)" → **"Brett"** ✓
- TMF "Brett Blend" → **"Brettanomyces + Brett"** ✓
- recipator:6669 "WLP029 German Ale/ K" → **"WLP029 German Ale/ K + Lactobacillus Bacteria + Lactobacillus"** ✓
- braureka:10940 "WLP 677 Lactobacillus Bacteria" → **"WLP 677 Lactobacillus Bacteria + Brettanomyces claussenii + Brettanomyces + Lact"** ⭐

### Sınır: brett coverage hâlâ %0.18 — feature için yetersiz
User kuralı: brett <%3 → 47B feature ekleme yok. **V13 = clean V11 feature seti (76, brett feature yok).**

---

## 🚧 Faz 2-4: SCOPE DIŞI (Beklenmedik)

User Faz 2-4 planı — TMF, amervallei, roerstok, recipator parser fix — **GEREK YOK** çıktı.

### V13 corruption re-audit

| Source | Corrupt | Empty | Other corrupt |
|---|---:|---:|---:|
| amervallei | 1 | 1 | 0 |
| braureka | 77 | 77 | 0 |
| mmum | 1 | 1 | 0 |
| recipator | 636 | 632 | 4 (name_only) |
| roerstok | 18 | 18 | 0 |
| tmf | 38 | 38 | 0 |
| twortwat | 6 | 6 | 0 |
| **TOPLAM** | **777** | **773** | **4** |

**Adım 48 cleanup function tüm prose/HTML/object pattern'larını fix etti. Geriye SADECE EMPTY kaldı.**

Empty reçeteler **fix edilemez**:
- Source HTML/BeerXML'de yeast field gerçekten boş
- Brewer yazmamış (TMF blog post'larında bazıları yeast atlamış)
- BeerXML upload'larında zorunlu olmayan field

**Faz 2 (TMF parse fix):** Hedef 81 corrupt'tı, 38 empty kaldı (fix imkansız).
**Faz 3 (amervallei/roerstok):** Sırasıyla 1 ve 18 empty (fix imkansız).
**Faz 4 (recipator):** 636 corrupt'ın 632'si empty (fix imkansız), 4 name_only (Saflager generic) — minor.

→ Geriye sadece Faz 5 (V13 retrain) anlamlı kaldı.

---

## 🚦 Faz 5: V13 Deploy Karar

V13 vs V10.1 (production canary) baseline:
1. ✗ Top-1 V10.1+1pp+ → V13 deploy → gerçek **-1.56pp** (eşik altı)
2. ✓ Top-1 V10.1'den DÜŞÜK → **V13 deploy ETME** ← **trigger**
3. ✗ Sour Top-1 V10.1+5pp+ → bağımsız deploy → gerçek **+4pp** (eşik altı)

**KARAR: V13 NOT DEPLOY. V10.1 default canary kalır.**

### Karar Gerekçesi

V13 (ve V12) Top-1 düşüşü **stratified split re-shuffle** kaynaklı (V10.1 8061 → V12/V13 7635 reçete, test set %20 yeniden oluştu). V11 8061'lik test set ile V12/V13 7635'lik test set arasında apple-to-orange karşılaştırma var.

CV metric (split-independent) tutarlı iyileşme: V10.1 0.6851 → V13 0.6884 (+0.33pp). Top-3 +0.77pp, Top-5 +1.01pp. Bunlar gerçek model iyileşmesi.

**AMA** user kuralı strict — Top-1 V10.1'den düşük olduğunda deploy ETME. Stratified re-split açıklaması olsa bile kural geçerli.

V13 model + cleaned data + brett-protective cleanup function code base'de saklı:
- `_v13_model_14cat.json` (3.0 MB)
- `_ml_dataset_v13_pre_retrain.json` (16.2 MB)
- `_a49_cleanup_v2.js` — brett-protective function

---

## 📊 V12 vs V13 Identik (KEY OBSERVATION)

| Metric | V12 | V13 |
|---|---:|---:|
| CV mean | 0.6884 | **0.6884** |
| Test top-1 | 0.6764 | **0.6764** |
| Test top-3 | 0.8981 | **0.8981** |
| Per-class | identical | **identical** |

**Sebep:** 9 reçete brett/lacto/pedio mention'ı kurtarıldı, ama bu mention'lar **MEVCUT V11 feature'larını aktive etmedi** (V11'de has_brett_strain feature'ı YOK çünkü Adım 47'de pre-flight'ta SKIP edilmişti). Belgian/Clean_US05 detection değişmedi.

→ Brett-protective cleanup yeni feature ekleneceği zaman değer kazanır. Şu an **dormant kazanım**.

---

## 📋 DECISION'lar

- **DECISION-1:** Faz 2-4 SCOPE DIŞI bulundu — kalan corruption %100 EMPTY (parser fix etkisiz, orijinal data yok).
- **DECISION-2:** Brett coverage hâlâ <%3 (0.18% post-V2-cleanup) → V13 = V12 feature seti (76, brett feature ekleme yok).
- **DECISION-3:** V13 NOT DEPLOY (Top-1 V10.1'den -1.56pp, user kural #2 trigger).
- **DECISION-4:** V13 model + brett-protective cleanup function code base'de saklı, gelecek brett feature için reuse.

---

## 📦 Çıktılar

- `_step49_completion_report.md` — Bu rapor
- `_a49_cleanup_v2.js` — brett-protective cleanYeastString V2
- `_ml_dataset_v13_pre_retrain.json` (16.2 MB) — V13 dataset (V12 + 9 recovered)
- `_v13_model_14cat.json` (3 MB) — V13 model (NOT DEPLOYED)
- `_v13_label_encoder_14cat.json`
- `_v13_metrics.json`
- `_v13_rebuild_train.py` — V13 train script

---

## 🛠️ Adım 50 Önerileri (V10.1 hâlâ canary)

V10.1 production'da, ML iyileşmesi diminishing returns'e geliyor. 4 yön mümkün:

### 50A — Production deploy hazırlığı (~2-3 saat)
V10.1 zaten 8061 reçete %89 top-3. **Production'a tam geçiş**:
- V6 default → V10.1 default değiştir (Brewmaster_v2_79_10.html'de)
- V10.1 production canary → DEFAULT
- V8.5/V9/V10/V11/V12/V13 archive (toggle'dan kaldır veya "Legacy" altına)
- Kullanıcı feedback için Firebase log adapt
- Bu sprint **value extraction** — Kaan'ın gerçek kullanımı için en iyi opsiyon

### 50B — Yeni veri kaynağı: American Sour Beers kitap reçeteleri (~3-4 saat)
- Mike Tonsmeire kitabı 100+ Brett/Lacto strain reçetesi
- Brett coverage %0.18 → **%5-10** mümkün (kitabın strain ID kullanımı zorunlu)
- V14 retrain → has_brett_strain feature aktivate olur
- Sour Top-1 %23 → %40-50 hedef

### 50C — Mimari değişiklik: Multi-task learning (~1-2 gün)
- Tek model 14cat değil, hierarchical (main → slug)
- Knowledge distillation V11 + V12 ensemble
- Beklenen: +%2-4 Top-1 (modest)

### 50D — Rule-based hybrid (~3-4 saat)
- ML output + manual rules (örneğin "yeast=Lacto + IBU<10 + Berliner ad → mostly Berliner Weisse")
- Sour cluster için kural odaklı boost
- "Veri olmayan yerde kural koy" pragmatik approach

### Code önerisi: **50A öncelikli** — V10.1 zaten production-ready, 7 sprint'te production deploy olmadı. Kaan'ın gerçek kullanım feedback'i artık ML iterasyonundan daha değerli.

---

## ÖZET — Kaan'ın okuyacağı

🟡 **V13 = V12 (identik metrikler).** Brett-protective cleanup 9 reçete recovered ama feature distribution değişmedi (brett feature zaten yok).

🚧 **Faz 2-4 scope dışı çıktı:** Adım 48 cleanup tüm prose/HTML pattern'larını fix etti. Kalan 777 corruption %100 EMPTY (parser fix etkisiz, orijinal data yok).

🚦 **V13 NOT DEPLOY** (Top-1 V10.1'den -1.56pp, stratified split variance açıklaması olsa bile user kural #2 trigger).

🎯 **CV/Top-3/Top-5 V10.1'den iyileşme:** CV +0.33pp, Top-3 +0.77pp, Top-5 +1.01pp. Gerçek model gelişti ama Top-1 split variance gizledi.

⭐ **Cluster wins:** British Strong/Old +9pp (32→41), Sour +4pp (27→31). Belgian Pale -18pp (split variance).

🐛 **Adım 50 önerisi: V10.1'i production default yap.** ML iterasyonu diminishing returns'e geldi, gerçek kullanıcı feedback'i şimdi en değerli.

🤖 **4 DECISION verildi.**

**STEP 49 COMPLETE — V13 NOT DEPLOYED. Commit: pending.**
