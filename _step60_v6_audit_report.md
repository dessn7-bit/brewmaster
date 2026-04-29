# Adım 60 V6 Strateji Audit Raporu

**Tarih:** 2026-04-29  
**Veri:** V19 dataset (383,334 reçete, 89 feature) + V19 V6 subset (10,069 reçete, 56 compact feature) + HTML production V6 engine (`window.BM_ENGINE_V6_FINAL`)

---

## ⚠️ KRİTİK BULGU — KURAL 2 YARISI UYGULANMAMIŞ

`window.BM_ENGINE_V6_FINAL` (HTML satır 1708-1725) içeriği:
```js
RECS_COUNT: 1100  // V6 TRAINING_RECS array
FEATURES_COUNT: 79
PERFORMANCE_5FOLD: { top1: 0.785, top3: 0.865, top5: 0.873, N: 1100 }
PERFORMANCE_HOLDOUT: { top1: 0.738, top3: 0.808, train: 840, test: 260 }
```

**Production'daki V6 = Adım ~49 öncesi 1100 reçete, 79 feature.**

V19 V6 retrain artifact (`_v19_v6_inline.js`, 1.9 MB) **production'a hiç embed edilmemiş**:
- V19 V6 inline: 10,069 reçete, 56 compact feature
- V18.2 V6 inline: vardı
- V18.1 V6 inline: vardı
- V17 V6 inline: vardı
- **Hiçbiri HTML'e gömülmedi** — KURAL 2'nin "V6+V12 paralel retrain" mantığı sadece script tarafında uygulandı, deploy yapılmadı

**Production etki:**
- Kullanıcı V6 toggle seçerse → 1100 reçete, 79 feature (eski)
- V12 (XGBoost, default) toggle → V19 91-slug (yeni)
- Yani kullanıcı V6 seçiminde Sprint 56b kazanımları (Witbier, brett, gose) yok

---

## 1. V19 Dataset Slug & Tier Breakdown

87 slug train edilebilir (≥10 reçete in V19):

| Tier | Threshold | Slug count | V6 subset strateji | Etki |
|---|---|---|---|---|
| **A** | ≥1000 reçete | 18 slug | 100 reçete each (sour 500) | %1.1 örnekleme — büyük slug az temsil |
| **B** | 250-999 reçete | 11 slug | 80 reçete each (sour 500) | %8-15 örnekleme |
| **C** | 10-249 reçete | 18 slug | %100 alındı (hepsi) | tam temsil |

### Tier A top 10 (V19 → V6 subset oranı):
| Slug | V19 | V6 | % |
|---|---|---|---|
| american_india_pale_ale | 56,108 | 100 | 0.2% |
| american_pale_ale | 43,246 | 100 | 0.2% |
| specialty_beer | 28,398 | 100 | 0.4% |
| double_ipa | 14,581 | 100 | 0.7% |
| french_belgian_saison | 14,085 | 100 | 0.7% |
| american_amber_red_ale | 11,483 | 100 | 0.9% |
| american_brown_ale | 9,128 | 100 | 1.1% |

### Tier C (kritik zayıf):
| Slug | V19 | V6 | % |
|---|---|---|---|
| belgian_ipa | 218 | 80 | 36.7% |
| **gose** | **214** | **214** | **100%** |
| **belgian_gueuze** | 199 | 199 | 100% |
| **NEIPA** | 144 | 144 | 100% |
| english_pale_ale | 103 | 103 | 100% |
| **brett_beer** | 101 | 101 | 100% |
| festbier | 100 | 100 | 100% |
| kellerbier | 97 | 97 | 100% |
| dunkles_bock | 85 | 85 | 100% |
| belgian_quadrupel | 78 | 78 | 100% |

### Sour Cluster Overrepresent

- V19 dataset: 4,874 sour reçete (%1.3 of 383K)
- V6 subset: 3,282 sour reçete (**%32.6** of 10K)
- **Overrepresent oranı: 25×**

Memory'de KURAL 2 "sour 3× boost" diyordu. Gerçek 25× — çok agresif. Sour cluster için %15-20 hedef daha makul olabilir.

---

## 2. Feature Setinin KNN Distance'a Etkisi

### V6 inline 56 compact feature breakdown:

| Tip | Count | Range | KNN distance ağırlığı (z-score sonrası) |
|---|---|---|---|
| Continuous (og, fg, abv, ibu, srm) | 5 | broad (1.02-1.14, 0-150 vs) | düşük (std büyük) |
| Continuous pct_* (grain) | 15 | 0-100 | orta |
| Continuous (dry_hop_days, dpl, lhp) | 3 | 0-100 | orta |
| **BINARY** (yeast_*, hop_*, katki_*, has_*) | **33** | 0/1 | **YÜKSEK** |

### Binary Feature Distribution (V6 subset, %)

| Feature | mean | std | z-score impact (1.0 değer) |
|---|---|---|---|
| yeast_witbier | 0.007 | 0.084 | **+11.8 std** ⚠️ |
| has_chamomile | 0.002 | 0.050 | **+19.9 std** ⚠️⚠️ |
| katki_smoke | 0.003 | 0.052 | **+19.2 std** ⚠️⚠️ |
| yeast_kveik | 0.003 | 0.053 | **+18.8 std** ⚠️⚠️ |
| yeast_sour_blend | 0.006 | 0.078 | +12.7 std |
| has_dry_hop_heavy | 0.025 | 0.156 | +6.3 std |
| has_salt | 0.026 | 0.158 | +6.2 std |
| **og** | 1.058 | **0.019** | **+0.1 std (typical query)** |

**Net:** Bir reçetede `has_chamomile=1` olması, KNN distance'ında 200 farklı OG değerinden daha fazla impact yapıyor. Binary nadir feature'lar **distance metric'i domine ediyor**.

### KNN Sample Test (Witbier, NEIPA, Brett)

**Witbier sample (`simpelwit`):**
```
dist=0.000  belgian_witbier      simpelwit (kendisi)
dist=3.912  belgian_witbier      hoegaardenish ✓
dist=6.451  berliner_weisse      nick be nine berliner ⚠
dist=6.616  belgian_witbier      witbier ✓
dist=6.633  south_german_hefeweizen sour pour ⚠
dist=6.771  gose                 galena gose ⚠
```
**5 nearest: 2 witbier doğru, 3 sour/wheat yanlış.** Sour overrepresent etkisi — KNN witbier'ı sour'a doğru çekiyor.

**Brett Pale Ale sample:**
```
dist=0.000  brett_beer (kendisi)
dist=1.779  belgian_lambic       Lambic the Real King of Funk ⚠
dist=2.822  belgian_lambic       Brewing Lambic 2.0 ⚠
dist=2.883  belgian_lambic       Lambic 3 - Turbid Mash ⚠
dist=2.915  gose                 Sour Leipziger Gose ⚠
dist=3.455  berliner_weisse      Berliner Weiss ⚠
```
**5 nearest: 0 brett_beer doğru.** KNN top-1 belgian_lambic tahmin edecek — yanlış.

**NEIPA (`New England IPA`):**
```
dist=0.000  juicy_or_hazy_india_pale_ale (kendisi)
dist=5.013  juicy_or_hazy_india_pale_ale  juicy estherhazy ✓
dist=5.223  juicy_or_hazy_india_pale_ale  Never Sleep ✓
dist=5.487  juicy_or_hazy_india_pale_ale  NEIPA Wedel ✓
dist=5.525  old_ale              arrogant bastard clone ⚠
dist=5.647  blonde_ale           043 Summer Ale ⚠
```
**5 nearest: 3 NEIPA doğru, 2 yanlış.** İyi sonuç.

---

## 3. Tier Oranları Değerlendirme

### B+ tier-based stratejinin V19'a uygunluğu

V18.2'de oluşturulmuş strateji V19'a aynı uygulandı. Ama V19'da:
- Yeni 9 slug var (red_ipa, white_ipa, rye_ipa, belgian_ipa, gose, belgian_gueuze, belgian_fruit_lambic, flanders_red_ale, export_stout)
- Sour cluster büyüdü (V18.2 4041 → V19 4874, +%21)
- Tier A büyük slug'larda %0.2-0.7 örnekleme (çok seyrek)

### Önerilen tier revizyon

| Tier | Mevcut | Öneri | Sebep |
|---|---|---|---|
| A (≥1000) | 100/slug | **150-200/slug** | Büyük slug'ların KNN'de daha çok temsil hakkı |
| B (250-999) | 80/slug, sour 500 | 100/slug, **sour 250** | Sour overrepresent azalt |
| C (10-249) | %100 | **%100** ✓ | Korunsun |

V6 toplam: 10K → 12-13K. Compute zaman küçük artış, slug temsili daha dengeli.

### Sour Overrepresent Analizi

V19 production-realistic ratio %1.3. V6 subset'te %32.6 = 25× boost.
- **Avantaj**: küçük sour slug (gose, brett, gueuze) tüm reçeteler temsil
- **Dezavantaj**: KNN witbier/wheat reçetelerinde sour'a doğru bias (yukarıdaki sample'da görüldü)
- **Öneri**: Sour boost azalt 25× → 10× (%13-15 ratio), küçük sour slug yine %100 ama büyük sour (lambic, oud_bruin, flanders_red, berliner_weisse) için 250 sınır

---

## 4. FAISS Değerlendirme

V6 subset 10K reçete × 56 feature = **çok küçük veri**.

KNN compute (naive Euclidean):
- Per query: 10K × 56 ops = ~560K floating ops
- ~1-5 ms per query (modern CPU)
- 5-fold CV (10K fold): saniyeler

**FAISS GEREK YOK**. FAISS approximate KNN sadece N > 100K, D > 100 için faydalı. Mevcut compute zaman zaten cep bilgisayarında milisaniye seviyesinde.

V6 retrain script (Python) zaten saniyelerde bitiyor (`_v19_v6_retrain.log`: 13 saniye).

---

## 5. V6 Production Rolü Audit

### Mevcut durum (HTML)

- **V12 (V19 XGBoost, default)** — kullanıcı motor seçimi yapmazsa V12 çalışır (toggle migration `_v85/V9/V10/V101 → V12`)
- **V6 (KNN, alternative)** — kullanıcı toggle ile V6 seçebilir, eski 1100 reçete versiyonu çalışır
- **V101 fallback** — V12 model yüklenmezse V101 (V10.1) çalışır

### V6'nın production'daki gerçek değeri

Eğer:
1. Kullanıcı V6'yı manuel seçiyor (UI'da toggle "V6 (KNN)") → eski model
2. Kullanıcı V12'yi seçiyor (default ⭐) → V19 XGBoost (mevcut)

V6 deploy edilmiş olsa bile (V19 V6 ile) kullanıcı default V12'yi göreceği için V6 etki azalır. Ancak:
- Brewmaster V12 başarısız olursa V6 fallback olarak değerli
- Kullanıcı debug/karşılaştırma için V6 toggle yapabilir
- KURAL 2 mantığı paralel motor yedeği sağlar

---

## 6. Adım 60 Önerileri (Kaan onayı için)

### Acil (bu sprint'te yapılabilir):

1. **V19 V6 inline JS HTML'e embed et** ⚠️ KRİTİK
   - Mevcut HTML satır 1300-1725 V6 engine kodu var (1100 reçete inline)
   - V19 V6 inline JS (1.9 MB, 10K reçete) ile değiştir
   - Yöntem A: Inline replace (HTML şişer, ama tek dosya)
   - Yöntem B: `<script src="_v19_v6_inline.js"></script>` ile dış yükleme + V6 engine kodu güncelle
   - Effort: ~2-3 saat

2. **KURAL 2 güncelleme** (memory)
   - "V6 retrain + HTML embed" şeklinde sürdür
   - Adım 53/54/55/58'de V6 retrain yapıldı ama embed atlandı — gelecekte HTML embed dahil

### Orta vade (Adım 61+):

3. **V6 dataset stratejisi revize**
   - Tier A 100 → 150-200/slug
   - Sour boost 25× → 10× (%13-15 ratio)
   - Toplam 10K → 12-13K
   - Beklenen: küçük slug temsili korunur, sour bias azalır

4. **Binary feature distance weighting**
   - Z-score sonrası nadir binary'lerin (yeast_kveik, has_chamomile vs) impact azalt
   - Olası yöntemler: feature weight × 0.5 binary için, veya log scaling, veya binary'leri categorical olarak ele al
   - V6 engine kodu (HTML inline) revize gerek

### Skip:
- **FAISS** — gerek yok (küçük dataset)
- **V6 retire** — KURAL 2 yedek motor mantığı geçerli, V6 fallback değerli

---

## 7. Karar Noktaları (Kaan Onay 1)

**A. V19 V6 production embed** — yapsak mı (KURAL 2 yarısı eksik kalmış, kritik)?
- Yöntem A inline replace
- Yöntem B `<script src="...">` external

**B. V6 dataset revizyonu** (sour boost azalt + tier A artır) — bu sprint mi, Adım 61'e ertele mi?

**C. Binary feature distance weighting** — V6 engine kodu revize, riskli (mevcut V6 algoritması çalışıyor)?

Audit veri: `_step60_v6_audit_data.json` (87 slug tier breakdown, sample distance test).
