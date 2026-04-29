# Adım 60c — D3 K=15 Sample Test Raporu

**Tarih:** 2026-04-29  
**Test:** V6_C2 dataset (32K, M=2000) sabit, sadece K parametresi 5 → 15  
**Yöntem:** Node.js headless (V6 engine HTML extract), 5 sample reçete  
**Source:** `_v6_c2_test_wrapper.js` (K=15 ile çalıştırıldı)

---

## Sample Test Yan Yana Karşılaştırma

| # | Test | Expected | K=5 top-1 | K=15 top-1 | Sonuç |
|---|---|---|---|---|---|
| 1 | Witbier (Hoegaarden) | belgian | **belgian** ✓ | **belgian** ✓ | (zaten doğru) |
| 2 | American IPA (SN Pale) | pale_ale | **pale_ale** ✓ | **pale_ale** ✓ | (zaten doğru) |
| 3 | **Brett Pale Ale (100% Brett)** | **sour** | specialty ❌ | **saison** ❌ | yanlış değişti, sour'a gelmedi |
| 4 | Belgian Quadrupel (Westvleteren 12) | belgian | **belgian** ✓ | **belgian** ✓ | (zaten doğru) |
| 5 | **Dortmunder (DAB)** | **lager** | belgian ❌ | **saison** ❌ | yanlış değişti, lager'a gelmedi |

| Metric | K=5 | K=15 | Δ |
|---|---|---|---|
| Top-1 hit | 3/5 | 3/5 | 0 |
| Top-3 hit | 3/5 | 3/5 | 0 |
| Latency | 32-36 ms | 30-49 ms | benzer |

### Top-5 Detay

**Brett Pale K=15:** saison, specialty, cream, belgian (sour 5'te de yok)
**Dortmunder K=15:** saison, belgian, cream, bock (lager 5'te de yok!)

---

## Senaryo Karar Matrisi

| Senaryo | Şart | Karar |
|---|---|---|
| 1 | Brett **VE** Dortmunder düzeldi | K=15 redeploy |
| 2 | Sadece BİRİ düzeldi | K=15 redeploy (anlamlı kısmen) |
| **3** | **Hiçbiri düzelmedi** | **K=5 deploy yeterli** |

**Senaryo 3 GERÇEKLEŞTİ.** K=15 ile sample test'te:
- Brett: specialty → saison (her ikisi de yanlış)
- Dortmunder: belgian → saison (her ikisi de yanlış)
- K=15'in CV kazanımı (+1.64pp top-1, +4.7pp top-3) **sample test'te yansımadı**

---

## CV vs Sample Test Tutarsızlık Analizi

K=15 5-fold CV +1.64pp daha iyi ama gerçek sample test'te değişmedi. Olası sebepler:

1. **Sample profil eksik feature** — 5 test profilinde sadece 17/56 feature set, geri kalan 0 default. CV'de gerçek dataset reçeteleri tüm feature'ları içeriyor → K artışı CV'de yardımcı, eksik profilde değil.
2. **Saison cluster K=15'te baskın** — saison cluster 3 slug × 2000 = 6,000 reçete, K büyüdükçe saison komşu sayısı artar, eksik profile reçeteleri saison'a kayıyor.
3. **Brett ve Dortmunder cluster boundary problemi** — Brett (sour, 9 slug × 2000 = 18K) ve Dortmunder (lager, 13 slug × 2000 = 26K) arasında saison/specialty cluster'lar feature space'de "yakın" — K artışı bunu çözmüyor.

---

## Code Önerisi: K=5 Deploy

**Sebepler:**
1. Sample test top-1 hit DEĞİŞMEDİ (3/5 her ikisi)
2. K=15 CV kazanımı **gerçek dünya UX'inde görünmüyor**
3. Brett ve Dortmunder yanlışları **feature engineering (Adım 61)** gerek — K parametresi çözüm değil
4. K=5 mevcut embed hazır, redeploy çabası boşa gider

**V6_C2 K=5 deploy karar:** ✅
- HTML 36.3 MB embed (V6_C2 32K, 56 features, K=5 default)
- V19-aliased holdout +14.8pp vs eski V6 (kanıtlanmış kazanım)
- Sample test 3/5 top-1 (Brett + Dortmunder Adım 61 feature engineering ile)
- Latency 32-36 ms (kabul edilebilir)

---

## Sıradaki Adımlar

1. **Onay 3 (Kaan)**: K=5 mevcut embed deploy onayı
2. Commit + push origin/main, tag v2.79.11
3. KURAL 6 memory güncelleme (cluster-level versiyonu)
4. Adım 61 prep:
   - Brett strain feature extract (yeast_brett_brux/trois/clausen) — sour cluster discriminator
   - Lager-specific feature (water_so4/cl ratio, lagering_days) — lager cluster discriminator
   - Specialty cluster split veya kabul (heterojen %16 acc, alt-cluster mantığı)

---

## Yan Dosyalar

- `_step60c_d3_ht_grid.json` (16 K-weight combo CV sonuçları)
- `_step60c_d3_ht_grid.log` (full grid log)
- `_step60c_d3_k15_sample_test.md` (bu rapor)
- `_v6_c2_test_wrapper.js` (K=15 ile çalıştırılan, debug için sakla)
- `Brewmaster_v2_79_10.html` — V6_C2 K=5 embedded (36.3 MB, deploy hazır)
