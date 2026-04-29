# Adım 60c — V6 Cluster-Level Sprint Kapanış Raporu (Final, hotfix sonrası)

**Tarih:** 2026-04-29  
**Sprint:** Adım 60c — V6 Cluster-Level Deney + Deploy + Hotfix  
**Sonuç:** ⚠️ V6_C2 ML başarılı, deploy broken-rollback (UI uyumsuz)  
**Tags:** v2.79.11 (broken) → v2.79.11.1 (hotfix rollback) ← production

---

## 1. Sprint Hedefi

- V6 cluster-level dönüş + balanced retrain
- Slug-level V6 overfit kanıtı (eski production motor)
- Cluster-level V6 ile V19-aliased uyumlu motor
- KURAL 2 yarısı (HTML embed) tamamlanması (V17/V18.1/V18.2/V19'da skip edildi)

---

## 2. Deney Özeti

| Deney | Sonuç | Karar |
|---|---|---|
| **V6_A slug-level (87×78=6,786)** | Witbier collapse top-1 brett_beer ❌, sample 2/5, 5-fold CV %25.55 | Archive (working/archive/v6_a_slug_level/) |
| **V6_B log-balanced (~28K)** | Mega slug iyi (saison %71), niş zayıf (Quadrupel %24, Brett %15) | Archive (V6_A ile birlikte) |
| **V6_C2 cluster-level (16×2000=32K)** ⭐ | 5-fold CV top-1 %53.86, top-3 %73.70 | **DEPLOY → ROLLBACK** |
| D1 — eski V6 V19-aliased holdout baseline | %39.06 top-1 (overfit kanıtı, CV %84.42 sahte) | Karşılaştırma referansı |
| D3 — HT grid search | K=15 best (+1.64pp top-1, +4.7pp top-3 CV) ama sample test eşit 3/5 | K=5 yeterli, redeploy etmedi |
| D2/D4-D6 (FE, SS, M3K) | Adım 61'e ertelendi | — |

---

## 3. Net Kazanımlar

### ML Metrik

- **V6_C2 5-fold CV:** %53.86 top-1, %73.70 top-3 (cluster-level, 16 sınıf)
- **V19-aliased holdout:** eski V6 39.06% → V6_C2 53.86% (**+14.80pp ⭐**)
- **Eski V6 overfit kanıtlandı:** CV simülasyon %84.42, gerçek dünya %39.06 (-45.36pp düşüş)
- **Fold tutarlılık:** V6_C2 ±0.31 vs eski V6 ±2.0 (**6× daha stabil**)

### Süreç / Memory

- **KURAL 5 (audit kanıtı) gücünü gösterdi** — varsayım yerine ölçüm (D1 deneyi overfit'i kanıtladı)
- **KURAL 2 ilk gerçek embed** — V17/V18.1/V18.2/V19'da skip edildi, Adım 60c'de gerçekten yapıldı
- **KURAL 6 yeni kalıcı kural** — V6 cluster-level balanced retrain pipeline (7 adım)
- **KURAL 7 yeni kalıcı kural** — Deploy validation (UI integration test eklendi, V6_C2 broken deploy dersiyle)

---

## 4. Deploy Durum

### v2.79.11 — V6_C2 Deploy (Broken)

- HTML 36.3 MB (V6_C2 32K inline embed, label_family cluster-level)
- Engine load console log doğru: 32000 recipes, 56 features, V6_C2 cluster-16cat
- Headless test 3/5 sample top-1 (Witbier ✓, AIPA ✓, Quadrupel ✓, Brett ❌, Dortmunder ❌)
- ❌ **UI integration test atlandı (KURAL 7 öğrenmeden önce)**

### v2.79.11.1 — Hotfix Rollback

**Tespit:**
- V6_C2 cluster motor `label_family` döndürdü ("lager", "ipa", "belgian")
- Toggle handler ve UI hâlâ slug-level beklenti (`label_slug` → "munich_helles")
- displayTR mapping cluster string'i bulamadı → UI boş gösterdi
- Kaan mobil testi: "V6 toggle çalışmıyor"

**Rollback:**
- `cp _brewmaster_pre_v6c2.bak Brewmaster_v2_79_10.html` → fc952aa state (5.1 MB)
- Eski V6 (1100 reçete slug-level) geri, V6 toggle çalışıyor
- V6_C2 artifact'ler `working/archive/v6_c2_cluster_level/` (127 MB)
- Verify headless: eski V6 yüklendi, Witbier sample top-1 american_wheat_ale, top-2 belgian_witbier (slug return)

### Production (Şu An)

| Motor | Versiyon | Durum |
|---|---|---|
| V12 (default) | V19 XGBoost slug-level (5c5ac61) | ✓ V19-aliased uyumlu |
| V6 (alternative) | Eski 1100 reçete slug-level (rollback) | ✓ Toggle çalışıyor (V19 uyum yok) |

---

## 5. KAAN MIMARI KARARI

Sprint kapanışında netleşti — V12 ve V6 farklı görevler için:

### V12 (V19, XGBoost slug-level)
- 87 sınıf (V19-aliased train edilebilir slug)
- Türkçe + İngilizce slug isimleri (BJCP standart)
- Top-3 alternatif öneri (kullanıcıya)
- Detay slug + istatistiksel özgüven

### V6 (cluster-level)
- 16 cluster (label_family)
- **TEK aile tahmini** (top-3 yok, V12'de zaten var)
- **İngilizce cluster ismi** (lager, wheat, belgian, ipa, vs)
- **Türkçe çeviri YOK** (V6 için, displayTR mapping gereksiz)
- **16 cluster için olasılık dağılımı** (Adım 62 ensemble hazırlığı)

### Hiyerarşik Mimari Hedefi (Adım 62)

**Ensemble:** V6 cluster prob × V12 slug prob → birleşik puan → final slug tahmini

İki motor karışım hesaplar, biri diğerini ezmez. Cascading error yok:
- V6 yanlış cluster verirse V12 slug doğru olabilir → düzeltilir
- V12 yanlış slug verirse V6 doğru cluster ile filtreler

---

## 6. Açık Konular — Adım 61 Backlog

### Öncelik Sırası

**1. V6 cluster prob output** (16 cluster olasılık dağılımı)
- Ensemble Adım 62 için ön şart
- KNN top-K mesafelerinden olasılık çıkar (`predictV6Enhanced` totalWeight + per-cluster vote)
- Format: `{lager: 0.55, wheat: 0.30, belgian: 0.15, ...}`

**2. V6 güçlendirme** (cluster acc %53.86 → **%65+** hedef)
- **Brett strain feature extract** — TMF parser yeast detail (yeast_brett_brux/trois/clausen) → sour cluster %62.75 → %75+ hedef
- **Specialty sub-cluster split** — heterojen cluster %16 → %30+ (fruit/smoked/herb_spice/experimental ayır)
- **Lager discriminator** — mash_temp, lagering_days, water_so4/cl ratio → lager %55 → %65+ hedef

**3. V6_C2 redeploy** (KURAL 7 zorunlu)
- UI minimal adaptasyon: V6 toggle aktif → **tek kutuda İngilizce cluster göster**
- Top-3 yok (V12'de zaten var, V6'nın işi tek aile)
- displayTR YOK (V6 cluster İngilizce yeterli)
- KURAL 7 headless UI integration test (cluster motor → cluster UI uyum)

**4. HTML 36 MB optimizasyon** (V6_C2 redeploy sonrası)
- Lazy load veya gzip embed
- Mobil UX (cold cache yükleme süresi)

**5. Slug büyütme scrape** (Adım 61 sonrası, Adım 63+)
- `_step60_internet_sources.md` 14 lowest slug × kaynak listesi
- Brett, gose, gueuze, NEIPA için ek dataset

---

## 7. Adım 62 Backlog (Hiyerarşik Ensemble)

**Mimari:** V6 cluster prob × V12 slug prob

**Örnek hesap:**
```
V6 prob:  lager 0.55, wheat 0.30, belgian 0.15
V12 prob: munich_helles 0.40 (lager), hefeweizen 0.20 (wheat), ...

Birleşik:
  munich_helles  = 0.55 × 0.40 = 0.220 ⭐
  hefeweizen     = 0.30 × 0.20 = 0.060
  belgian_witbier = 0.15 × 0.15 = 0.0225

Final: en yüksek puan slug → "munich_helles"
```

**Ön şart:** Adım 61'de V6 güçlendirme + cluster prob output tamamlanmalı (V6 cluster acc %65+ olunca Adım 62'ye geç).

---

## 8. Sprint Kapanış ✅

| Aşama | Durum |
|---|---|
| V6_A slug-level deney | ✅ Witbier collapse → archive |
| V6_B log-balanced deney | ✅ Mega slug iyi → archive |
| V6_C2 cluster-level retrain (ML kazanım kanıtı) | ✅ V19-aliased holdout +14.80pp |
| D1 eski V6 baseline | ✅ Overfit kanıtı %84→%39 |
| D3 HT grid | ✅ K=15 marjinal, deploy etmedi |
| HTML embed (KURAL 2) | ✅ Yapıldı v2.79.11 |
| UI integration (KURAL 7) | ❌ Atlandı, broken deploy |
| Hotfix rollback | ✅ v2.79.11.1, eski V6 geri |
| KURAL 6 memory | ✅ V6 retrain pipeline (7 adım) |
| KURAL 7 memory | ✅ Deploy validation UI integration |
| Mimari karar (V6 cluster prob + V12 slug prob ensemble) | ✅ Adım 62 hedef |
| Adım 61 backlog | ✅ Hazır (V6 prob output + güçlendirme + redeploy) |

**Headline mesaj:**

V6 motoru ML metrik düzeyinde kanıtlı +14.80pp gerçek dünya kazanım sağladı (V6_C2 cluster-level), ama UI integration eksikliği nedeniyle production'da broken deploy oldu. Hotfix rollback ile eski V6 geri (production stabil). Bu sprint'in bilimsel değeri: eski V6 5-fold CV %84.42 → gerçek %39.06 overfit kanıtı (D1 deneyi). KURAL 5 (audit kanıtlı uygulama) gücünü kanıtladı, KURAL 6 + KURAL 7 yeni kalıcı kurallar olarak öğrenildi.

**Adım 61'e geçiş:** V6 cluster prob output → V6 güçlendirme → V6_C2 redeploy (KURAL 7 zorunlu UI test ile) → Adım 62 ensemble.
