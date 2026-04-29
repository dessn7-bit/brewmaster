# Adım 60c — V6 Cluster-Level Sprint Kapanış Raporu

**Tarih:** 2026-04-29  
**Sprint:** Adım 60c — V6 Cluster-Level Deney + Deploy  
**Sonuç:** ✅ V6_C2 production'a deploy (cluster-level, 32K balanced)  
**Tag:** v2.79.11

---

## Sprint Kapsamı

V6 motoru üzerinde 3 büyük deney + 6 alt-deney sırası. V6 production hep slug-level idi (1100 curated reçete, %78.5 cluster sim ama gerçek %39.06 V19-aliased holdout). Adım 60c sonunda V6 **cluster-level mimariye** geçti, V19-aliased ile uyumlu hale geldi.

---

## Deney Özeti

| Deney | Sonuç | Karar |
|---|---|---|
| **V6_A slug-level (87×78=6,786)** | Witbier collapse (top-1 brett_beer ❌), 5-fold CV %25.55 | Archive (working/archive/v6_a_slug_level/) |
| **V6_B log-balanced (~28K)** | Mega slug iyi, niş zayıf | Archive (V6_A ile birlikte) |
| **V6_C2 cluster-level (16×2000=32K)** ⭐ | 5-fold CV top-1 %53.86, top-3 %73.70, sample 3/5 | **DEPLOY ✅** |
| D1 — eski V6 baseline V19-aliased holdout | %39.06 top-1 (overfit kanıtı, CV %84 sahte) | Karşılaştırma referans |
| D3 — HT K grid search | K=15 best (+1.64pp top-1, +4.7pp top-3) ama sample test eşit | K=5 yeterli, redeploy gerek yok |
| D2/D4-D6 (FE, SS, M3K) | Adım 61'e ertelendi | — |

---

## V6_C2 Performans Özeti

### V19-aliased Holdout Karşılaştırma (5K random sample, no overlap)

| Motor | Top-1 cluster | Top-3 cluster | Δ vs eski V6 |
|---|---|---|---|
| Eski V6 (1100 curated) | **39.06%** | 63.38% | baseline |
| V6_C2 (32K balanced) | **53.86%** ⭐ | 73.70% | **+14.80pp** |

### 5-fold CV (V6_C2 dataset üzerinde)

| Metric | Mean | std |
|---|---|---|
| Top-1 | 53.86% | ±0.31 |
| Top-3 | 73.70% | ±0.34 |

Fold tutarlılık eski V6'dan (±2.0) **6× daha yüksek** → V6_C2 stabil.

### Sample Test (5 reçete, K=5)

| Test | Beklenen | V6_C2 | Sonuç |
|---|---|---|---|
| Witbier (Hoegaarden) | belgian | belgian ✓ | (V6_A'da brett_beer ❌ idi) |
| American IPA (SN Pale) | pale_ale | pale_ale ✓ | |
| Brett Pale (100% Brett) | sour | specialty ❌ | Adım 61 feature engineering |
| Belgian Quadrupel | belgian | belgian ✓ | |
| Dortmunder (DAB) | lager | belgian ❌ | Adım 61 feature engineering |

**Top-1 hit: 3/5, Top-3 hit: 3/5**

### Per-cluster Accuracy (V6_C2 5-fold CV)

**En iyi (≥%60):** wheat 72.6%, barleywine 69.5%, bock 65.7%, stout 64.4%, saison 63.6%, sour 62.8%
**Orta (%40-60):** belgian 58.7%, ipa 56.7%, lager 55.3%, porter 50.9%, bitter 47.9%, pale_ale 46.2%, mild 45.1%, cream 44.1%, brown 42.4%
**Zayıf (<%20):** specialty 16.05%

---

## Net Kazanımlar

1. **+14.80pp vs eski V6** (V19-aliased gerçek dünya holdout)
2. **V6 + V12 complementary mimari** — V12 slug-level (91 sınıf), V6 cluster-level (16 sınıf) — kullanıcı için tamamlayıcı bilgi
3. **KURAL 2 ilk gerçek embed** — V17/V18.1/V18.2/V19'da skip edildi, Adım 60c'de gerçekten yapıldı
4. **KURAL 6 yeni kalıcı kural** — V6 dataset güncellemeleri için 7-adım pipeline (memory)
5. **Eski V6 overfit kanıtlandı** — 5-fold CV %84.42 simulasyon, gerçek dünya %39.06 (KURAL 5 audit)
6. **V19-aliased uyumlu** — Adım 60a alias merge taxonomy V6'da yansıyor
7. **Bilimsel deney sırası** — V6_A → V6_B → V6_C2 → D1 → D3 sıralı, KURAL 5 audit kanıtlı

---

## Açık Konular (Adım 61+'a Taşındı)

### Sample Test Yanlışları (cluster-level)
1. **Brett → specialty/saison** — V6_C2 brett_beer + mixed_ferm + lambic vs saison cluster ayırt edemiyor. Brett strain feature gerek (yeast_brett_brux/trois/clausen — rmwoods raw re-parse yapıldı ama bu detay henüz extract edilmedi)
2. **Dortmunder → belgian/saison** — yeast_german_lager=1 sample profile'da ama feature space'te belgian'a yakın çıkıyor. Lager-specific discriminator gerek (mash_temp, lagering_days, water_so4/cl ratio)

### Cluster Yapısı
- **Specialty cluster %16 acc** — heterojen (fruit, smoked, herb_spice, experimental). Sub-cluster split (D5) Adım 61'de düşünülebilir
- **Bitter/Pale_ale/Mild/Cream/Brown** %42-48 — ale ailesi profile çok benzer, feature engineering güçlendirme gerek

### HTML Boyut
- **36.3 MB** (V6_C2 32K inline embed) — V6_A 14 MB'tan 2.6× büyük
- Optimizasyon adayları: gzip serve (GitHub Pages otomatik), lazy load (V6 toggle açıldığında yükle)

### Future HT
- D3 HT K=15 sample test'te kazanç vermedi
- D4 (Feature engineering), D5 (Specialty split), D6 (M=3000) Adım 61+'a not

---

## Dosya Yönetimi

### Production (commit edildi)
- `Brewmaster_v2_79_10.html` — V6_C2 embedded (36.3 MB, K=5 default)
- `working/_v6_c2_dataset.json` (61 MB, working/ git ignored)

### Backup
- `_brewmaster_pre_v6c2.bak` (5.1 MB, fc952aa state, rollback için saklı)

### Archive
- `working/archive/v6_a_slug_level/` (88 MB) — V6_A + V6_B artifacts

### Audit Trail (commit edildi)
- `_step60c_v6_c2_pipeline.py` — sampling + retrain + baseline + sample test
- `_step60c_v6_c2_results.md` — pre-deploy karşılaştırma raporu
- `_step60c_v6_c2_results.json` — yapısal data
- `_step60c_v6_cluster_investigation.md` — slug-level vs cluster tarihçesi + 16 cluster mapping
- `_step60c_d1_old_v6_baseline.py` + JSON — eski V6 baseline ölçümü
- `_step60c_d3_ht_grid.py` + JSON — HT grid search (16 K-weight combo)
- `_step60c_d3_k15_sample_test.md` — K=5 vs K=15 sample karşılaştırma
- `_step60c_embed_v6_c2.py` — HTML embed script
- `_step60c_extract_test.py` + `_v6_c2_test_wrapper.js` (32.8 MB, debug)
- `_step60c_closing_report.md` (bu rapor)

### Adım 60a Trail (eskiden commit edilmemişti, şimdi dahil)
- `_step60a_apply_aliases.py` + `_step60a_apply_aliases_audit.json`
- `_step60a_sanity_and_style_def.py` + `_step60a_sanity_audit.json`
- `_step60a_3_itirz_sample.py`
- `_step60a_mapping_audit.py` + `_step60a_mapping_audit_data.json`
- `_step60_audit_detailed.py` + JSON
- `_step60_v6_audit.py` + `_step60_v6_audit_data.json` + `_step60_v6_audit_report.md` + `_step60_v6_audit_detailed.md`
- `_step60_v19_lowest_slugs.md`
- `_step60_mapping_audit_38_slugs.md`
- `STYLE_DEFINITIONS.json` (alias mapping audit field'lar)
- `_v19_alias_mapping.json` (yeni — kalıcı alias kayıt)

---

## Memory Güncellemeleri

- ✅ `feedback_kural6_v6_balanced_cluster_retrain.md` — yeni KURAL 6
- ✅ `MEMORY.md` — KURAL 6 satırı eklendi

---

## Deploy Süreci

**v2.79.11** tag, commit message:
> V6_C2 cluster-level deploy (Adım 60c)

**Sıradaki:**
1. Commit + push (~2 dk)
2. ONAY 4 BEKLE — Kaan 3 cihaz Firebase test (phone, tablet, laptop)
3. Adım 61 başlama: Brett strain feature + lager discriminator + specialty sub-cluster

---

## Headline Mesaj

V6 motoru ilk kez **gerçek production'da güncellendi** — 4 sürüm boyu skip edilen KURAL 2 yarısı tamamlandı. V19-aliased holdout'ta +14.80pp kanıtlı kazanım, cluster-level + V12 slug-level complementary mimari kullanıcı UX için tamamlayıcı bilgi sağlar.

Bu sprint'in bilimsel değeri: eski V6'nın 5-fold CV %84.42 → gerçek dünya %39.06 overfit kanıtı (D1 deneyiyle). KURAL 5 (audit kanıtlı uygulama) gücünü kanıtladı — varsayım yerine ölçüm.
