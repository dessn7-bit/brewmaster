# Adım 59 Faz B Tamamlandı (V19.1 deploy edilmedi)

**Tarih:** 2026-04-29  
**Sprint:** Adım 59 — Faz B sour cluster + NEIPA + white_ipa + brett kurtarma  
**Sonuç:** ⚠️ V19.1 deploy DEĞİL. **V19 production'da kalır** (commit 5c5ac61).  
**Kazanım:** Audit bulguları, 4 yeni feature compute denemesi, Adım 60'a hazırlık.

---

## Adım 59 Faz Sonuçları

### Faz B Pre-flight A-E Audit
- **A. V19 zayıf slug:** 10 slug ≤250 (V18.3 ile aynı, dedupe etkisi sınırlı)
- **B. has_salt:** zaten gose-dominant (gose %72.4 vs Berliner %4.6, 14× ayrım) — filter sıkılaştırma GEREK YOK
- **C. NEIPA collapse:** **TMF parser fail tespit edildi** — NEIPA'nın %37'sinde dpl=0 (TMF blog parser hop list extract edemedi). Asıl sorun parser, feature değil. Adım 61+'a ertele.
- **D. white_ipa SÜRPRİZ BULGU:** AIPA'ya kaçıyor (%44.7), witbier'a değil (%0.8). has_coriander **YANILTMIYOR** — model witbier feature'ları olmadan default AIPA varsayıyor. Coverage düşük (has_coriander %17, yeast_witbier %11.4).
- **E. brett strain detail:** **%72.3 strain bilgisi YOK** (sadece "brett" generic). BYO/AHA/TMF reçetelerinin pickle'da yeast detail yok. Adım 60 sonrası ek dataset gerek.

### Faz B-1 — 4 Feature Compute (KURAL 5 sample test pass)

| # | Feature | Coverage hedef | Gerçek | Sample test |
|---|---|---|---|---|
| 1 | white_ipa_signal | white_ipa %20 | %11.7 | ✓ formula doğru |
| 2 | has_neipa_name | NEIPA %70 | %41 | ✓ TMF reçeteleri yakaladı |
| 3 | neipa_og_ibu_combo | NEIPA %50 | %11.8 | ⚠ TMF metric null |
| 4 | late_hop_extreme | NEIPA-AIPA discriminator | NEIPA %28.5 / AIPA %10.3 | ⚠ Berliner %39.9 (mixed signal) |

### Faz B-2 — V19.1 Retrain
- Reg V19 ile aynı (alpha=0.85, lambda=1.85, mcw=4, n_est=350)
- Headline slug t1: 55.37% (V19 55.40%, **-0.03pp gürültü**)
- Headline slug t3: 79.60% (V19 79.59%, +0.01pp eşit)
- 14cat top-1: 65.10% (V19 65.12%, -0.02pp eşit)
- Train-test gap: 5.29pp (V19 5.21pp, marjinal)
- 5 stat gain: 6.30% (V19 6.52%, **-0.22pp düşüş — yeni feature gravity payını yedi**)

### Faz B-3 — Sensitivity V19 vs V19.1
- **Imperial Stout REGRESYON:** V19 1.075 imperial doğru, V19.1 stout (yanlış) — deploy blocker
- Witbier ✓ stabil (V19 kazanımı korundu)
- Saison ✓ stabil
- NEIPA: hep AIPA tahmin (has_neipa_name sentetik profilde tetiklenmedi — recipe name boş)

### Faz B-4 — Per-slug Holdout (V19 → V19.1)

**Pozitif:**
- belgian_ipa: 4.5% → 6.8% (+2.3pp)
- rye_ipa: 17.7% → 19.4% (+1.6pp)
- festbier: 15% → 20% (+5pp)
- black_ipa: 31.7% → 34.1% (+2.4pp)
- belgian_lambic: 33% → 34.9% (+1.9pp)

**Negatif (Sprint 56b kazanımları yıpranıyor):**
- white_ipa: 11.3% → 7.5% (**-3.8pp ⚠️** — white_ipa_signal yardım etmedi)
- gose: 39.5% → 34.9% (**-4.7pp ⚠️**)
- brett_beer: 25% → 20% (-5pp)
- dunkles_bock: 23.5% → 17.6% (-5.9pp)
- NEIPA: 24.1% → 20.7% (-3.4pp)

### Top 20 Features V19.1
- yeast_witbier 9.54% (V19 10.20%, küçük düşüş)
- has_lacto **4.59%** (V19 3.18%, mixed_ferm bias geri geldi)
- has_coriander 2.23%, has_orange_peel 1.30% (Sprint 56b kazanımları korundu)
- **YENİ feature'lar top 20'de YOK** (white_ipa_signal, has_neipa_name, neipa_og_ibu_combo, late_hop_extreme — 4'ü de marjinal gain)

---

## Deploy Kararı — V19.1 ETME

**Sebepler:**
1. Headline -0.03pp gürültü düzeyinde
2. **Imperial Stout sensitivity REGRESYON** (V19 doğru, V19.1 yanlış) — deploy blocker
3. Sprint 56b kazanımları yıpranıyor (gose -4.7pp, brett -5pp, dunkles_bock -5.9pp, white_ipa -3.8pp)
4. has_lacto baskınlığı geri (3.18 → 4.59) — V19'da çözülmüş probleme dönüş
5. 4 yeni feature top 20'de yok, coverage yetersiz, küçük n=20-50 holdout gürültüsü

**V19 stabil, V19.1 marjinal trade-off negatif. Production'da değişiklik yok.**

---

## Net Kazanımlar (Deploy Edilmedi Ama Değerli)

### 1. NEIPA collapse'in asıl sebebi parser fail
- TMF blog reçetelerinin %37'sinde dpl=0 (HTML parser hop list extract edemedi)
- has_neipa_name name fallback'i palyatif çözüm (NEIPA %41 yakaladı ama küçük holdout n=29 gürültü)
- **Adım 61+'a TMF parser fix'i kaydet**

### 2. white_ipa AIPA collapse — has_coriander yanıltıcı DEĞİL
- Beklenti yanlıştı: V19'da white_ipa AIPA'ya kaçıyor (%44.7), witbier'a değil (%0.8)
- has_coriander coverage zaten düşük (%17), feature açılmıyor → model AIPA default
- **white_ipa_signal coverage %11.7 — yeterli signal değil, daha agresif feature gerek (Adım 60+)**

### 3. has_salt zaten gose-dominant ✓
- gose %72.4, Berliner %4.6, ESB %1.8 → 14× ayrım net
- Filter sıkılaştırma gereksiz, V19'da has_salt feature optimum

### 4. brett strain detail veri yetersiz
- %72.3 brett_beer reçetesi spesifik strain bilgisi YOK
- BYO/AHA/TMF pickle'da yeast detail yok
- **Adım 60 sonrası ek dataset gerek** (Brett uzmanı kaynaklar — Bootleg Biology lab releases, Wild Brews kitap reçeteleri)

### 5. KURAL 5 sample test başarılı
- 4 feature compute "uygulandı + sample test pass" formatında raporlandı
- Coverage rakamları + sample 10-20 dump KURAL 5 standardına uygun

---

## Dosya Yönetimi

### Archive
- `working/archive/v19_1/` (836 MB) — V19.1 model + dataset + 8 dosya

### Kalıcı (root)
- `_step59_completion_report.md` (bu dosya)
- `_step59_audit_report.md` (A-E pre-flight audit)
- `_step59_a_e_audit.py`, `_step59_audit_data.json`
- `_step59_b1_feature_compute.py`, `_step59_b1_feature_audit.json`
- `_step59_sensitivity_v19_1.py`, `_step59_sensitivity_v19_1.log`

### Production (V19, değişiklik YOK)
- `Brewmaster_v2_79_10.html` — V19 model URL'leri
- `_v19_*.json` (model, label encoder, metrics, v6_inline.js)
- `working/_v19_dataset.json` (726 MB)

---

## Adım 60 Hazırlığı (V6 Strateji Audit)

**Memory referans:** KURAL 2 (V6+V12 paralel retrain) + Adım 56 (V18.3 dataset Plan C dedupe) + Adım 58 (V19 rmwoods raw re-parse, 89 feature)

### Audit Kapsamı

1. **V6 mevcut yapı:**
   - V19 dataset 10K stratified subsample (B+ tier-based)
   - Sour overrepresent %32.6 (V19'da, V18.2'de %30.5)
   - Multi-K weighted KNN + veto + feature weighting
   - V6 V19 dataset ile retrain (KURAL 2 ✓)

2. **Yeni feature setinin KNN'ye etkisi:**
   - 89 feature içinde KNN distance'a aykırı feature var mı?
   - has_coriander, has_orange_peel, has_salt binary — KNN distance'da çok ağır basabilir
   - Feature normalizasyon nasıl
   - Feature subset (en ayırt edici 30-40) testi

3. **Dataset boyutu:**
   - 10K yeterli mi V19 için (V18 için kuruldu)
   - 15K, 20K denemeli mi
   - Compute zaman / accuracy trade-off

4. **Tier oranları:**
   - B+ tier-based hala uygun mu
   - V19'da slug dağılımı: A tier (>1000), B tier (250-1000), C tier (<250)
   - Sour overrepresent V19'da mantıklı mı

5. **Yol 2 FAISS fallback:**
   - V6 KNN compute zamanı V19'da nasıl
   - FAISS approximate KNN gerekli olur mu (10K küçük dataset, muhtemelen değil)

6. **V6 production performance audit:**
   - Şu an Brewmaster'da V6 kullanılıyor
   - Kullanıcı UX'de V6 vs V12 (XGBoost slug) farkı
   - V6'nın production'daki rolü ne (BJCP rule fallback?)

---

## Adım Sıralama (memory #29 referans)

- **Adım 59** = Faz B sour cluster + NEIPA + white_ipa + brett (BUGÜN, deploy yok)
- **Adım 60** = V6 strateji yeniden değerlendirme (audit + onay + retrain veya kabul)
- **Adım 61+** = TMF parser fix + brett strain ek dataset + Faz B yeniden deneme (V19.2 deploy hedef)

---

**Sprint 56a-58-59 ML pipeline gözlemleri:**
- V18.2 → V19 transformative (rmwoods raw re-parse, Witbier ÇÖZÜLDÜ)
- V19 → V19.1 marjinal (4 yeni feature küçük n holdout'da gürültü)
- Headline %55-56 platosu — model rule-tabanlı tavanına yaklaşıyor (Adım 53 sonrası %55-56 stable)
- Asıl gain ya feature kaynağında (TMF parser fix, ek dataset) ya model değişikliğinde (XGBoost → ensemble?)
- **V19 production'da stabil, kullanıcı için NEIPA/Witbier/Brett kazanımları canlıda**
