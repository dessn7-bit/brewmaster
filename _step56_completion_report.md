# Adım 56 — Sprint 56a Tamamlandı (deploy edilmedi, kazanımlar arşivlendi)

**Tarih:** 2026-04-29  
**Sprint:** 56a — Etiket temizliği + Dedupe revizyon (Plan C)  
**Sonuç:** ⚠️ V18.3 ve V18.3.1 deploy DEĞİL. **V18.2 production'da kalır** (commit 82ad4eb).  
**Kazanım:** Bilgi/metodoloji birikimi (ABV outlier hipotezi doğrulandı, dedupe Plan C tested, KURAL 5 yazıldı, transformative slug'lar artifact'lerde).

---

## Sprint 56a Faz Sonuçları

### Faz A1.5 — Hibrit dedupe (Plan C) ✓
- Method: title + slug + og_bucket(5pt) + srm_bucket(3pt) + default name exclusion
- Recovery: V18.2 301,316 → V18.3 387,564 (+86,248, +%28.6)
- Default name exclusion 14K reçete kazandırdı ("awesome recipe" 1265×, "favorite add to favorites" 119× vs)
- Audit dosyası: `_sprint56a_a15_audit_samples.json`

### Faz A0.5 — V18.2 slug taxonomy preserve ✓
- V18.2 alias merge + Trappist taşıma + 9 yeni slug etkisi V18.3 pre-dataset'e re-applied
- 301,318 V18.2 ID match preserved, 86,246 yeni reçete (recovery'den) original slug korundu
- Audit: `_sprint56a_a05_taxonomy_audit.json`

### Faz A1 — Etiket temizliği (4 task) ✓
- **Task 1** golden_or_blonde_ale → blonde_ale merge: 266 reçete taşındı, slug çıkarıldı
- **Task 2** english_pale_ale Bitter cleanup: 15 reçete (13 SBB, 2 ESB) — sample %62 önerdiğim, gerçek %12
- **Task 3** belgian_quadrupel filter sıkılaştırma: 11 sızan tespit edildi (4 BSDA, 4 Dubbel, 3 Blonde) — sample %38, gerçek %12
- **Task 4** belgian_gueuze tarama: **156 yanlış etiket** düzeltildi (76 gose pun, 64 lambic, 15 fruit, 1 berliner) — sample %75 doğruydu
- Audit: `_sprint56a_a1_cleanup_audit.json`

### Faz A2 — Sanity check (KURAL 1) ⚠️ → Faz A2.5
- **KURAL 1 ALARM**: V18.3 dataset'te std deviations 8× büyüdü (OG std 0.022 → 0.180, IBU std 26.6 → 128.8)
- Sebep: 4,230 parse-hatalı reçete (OG 111, IBU 43,372, ABV -12,963)
- **Faz A2.5 outlier drop**: %1.09 dropped, V18.3 final 383,334 reçete
- Std normal aralığa döndü (OG 0.0163, IBU 28.22, ABV 1.67)
- V18.2'de gizli ABV outlier'lar varmış (V18.2 ABV std 23.74) — V18.3'te temizlendi

### Faz A3 — V18.3 retrain
- Reg tuning V18.2 ile aynı (alpha=1.0, lambda=2.0, mcw=5, n_est=300, depth=4)
- Headline slug t1: 55.06% (V18.2 55.86%, **-0.80pp regresyon**)
- Train-test gap: 4.14pp ✓ (KURAL 4 PASS)
- 5 stat gain: 5.69% → 6.65% ⭐ (Kaan ABV hipotezi doğrulandı)
- NEIPA collapse: holdout %50 → %24 (-26pp), sentetik profilde her OG'de AIPA tahmin
- Witbier collapse: sensitivity her OG'de mixed_fermentation_sour
- Brett +25pp ⭐⭐, dunkles_bock +17.6pp, gose +12pp, belgian_lambic +3.7pp transformative kazançlar

### Faz A4 — V18.3.1 retrain (reg gevşek + 6 yeni feature)
- Yeni feature'lar: has_coriander, has_orange_peel, has_chamomile, has_salt, has_dry_hop_heavy, has_whirlpool_heavy
- Coverage zayıf: Witbier %0.3 has_coriander (rmwoods misc detail YOK), NEIPA %16 has_dry_hop_heavy (anlamlı)
- Reg gevşek: alpha=0.5, lambda=1.5, mcw=3, n_est=400
- Headline slug t1: 55.36% (V18.2'den **-0.50pp**, V18.3'ten +0.30pp)
- **Train-test gap: 5.78pp 🔴 KURAL 4 FAIL** (gevşek reg overfitting)
- Witbier sensitivity **kısmen düzeldi**: OG ≥1.075 doğru tahmin, OG <1.075 hala mixed_ferm
- NEIPA hala collapse (her OG'de AIPA)
- 5 stat gain V18.3'ten geriledi (5.90% vs 6.65%) — gevşek reg yeast feature'ları daha dominant yaptı

---

## Net Kazanımlar (Deploy Edilmedi Ama Değerli)

### 1. ABV outlier bug retrospective doğrulandı
- V18.2'de ABV std 23.74 (parse-hatalı outlier'lar), 5 stat gain 5.69% bastırılıyordu
- V18.3'te outlier drop ile std 1.67, gain 6.65% (+0.97pp)
- **KURAL 1 sanity check'in uzun vadeli kanıtlanmış değeri**
- Adım 58/V19'da bu öğrenim zorunlu — outlier drop pipeline standard adım olmalı

### 2. Dedupe Plan C metodolojisi tested
- Title-only (V18.2 öncesi): 110,227 dropped (%26.8), %63-68 değerli kayıp
- Plan C (title + slug + og_bucket + srm_bucket): 23,979 dropped (%5.8), default name exclusion +14K
- **86K reçete recovery validated** (zayıf slug için belgian_ipa +73, rye_ipa +109, red_ipa +109)
- Adım 58/V19 dedupe için baseline metod

### 3. KURAL 5 yazıldı (memory)
- Code'un uyguladığı algoritma kararları "uygulandı + 5 sample test ile doğrulandı" formatında raporlanmalı
- Sebep: K5 dedupe kararı boş "uygulandı" raporu, 70K reçete kayıp 2 hafta sonra ortaya çıktı
- Memory: `feedback_kural5_audit_kanitli_uygulama.md`

### 4. rmwoods raw misc/hops detay YOK confirmed
- has_coriander parser %0.3 coverage Witbier'da
- has_salt %2.3 Gose'da
- Ana sebep: rmwoods HDF5 parse'ında misc/hops detail field skip edilmiş
- **Adım 58 scope: rmwoods raw HDF5 re-parse + Witbier/NEIPA feature yeniden tasarım**

### 5. Reg tuning sweet spot belirsizlik bandı
| Tuning | Gap | Headline | KURAL 4 |
|---|---|---|---|
| V18.3 sıkı (a=1.0, l=2.0, mcw=5, n=300) | 4.14pp ✓ | -0.80pp | gap PASS, headline FAIL |
| V18.3.1 gevşek (a=0.5, l=1.5, mcw=3, n=400) | 5.78pp 🔴 | -0.50pp | gap FAIL, headline kısmen iyi |
| **Adım 58 deneme** | **a=0.85, l=1.85, mcw=4, n=350** | (V18.3 sıkı yakını) | Sweet spot V18.3 tarafında — gap güvenli kalsın |

### 6. Transformative slug kazanımları (artifact'lerde, Adım 58'de geri gelecek)
- brett_beer: 0% → 30% (+30pp)
- festbier: 6.2% → 15%
- dunkles_bock: 0% → 17.6%
- gose: 25% → 37.2%
- belgian_lambic: 29.3% → 33%
- Bunlar V18.3 retrain ile elde edildi, V18.3 dataset archive'da, Adım 58'de yeniden test edilecek

---

## Dosya Yönetimi

### Archive
- `working/archive/v18_3/` (2.7 GB) — V18.3 model + 4 dataset + script + log
- `working/archive/v18_3_1/` (789 MB) — V18.3.1 model + dataset + script + log

### Kalıcı (root)
- `_step56_completion_report.md` (bu dosya)
- `_step56_preflight_v18_2_weak_slugs_detailed.md` (44 KB pre-flight detay)
- `_step56_dedupe_audit.md` (15 KB dedupe audit, K5 boş "uygulandı" finding)
- `_step56_a2_null_metric_audit.md` (14 KB null-metric audit, hipotez çürüdü)
- `_sprint56a_*.py` (5 script) ve `_sprint56a_*.json` (4 audit JSON)
- `_sprint56a_sensitivity_v18_3_1.py/.log`

### Production'da (değişiklik YOK)
- `Brewmaster_v2_79_10.html` — V18.2 model dosyalarına bağlı
- `_v18_2_*.json` (model, label encoder, metrics, v6_inline.js)
- `working/_v18_2_dataset.json`

---

## Adım 57 Hazırlığı

V18.2 production'da, kullanıcı için kayıp yok (NEIPA %50, Witbier tam çalışıyor, brett %0 kabullenildi).

Adım 57 = **M1-M10 UX iyileştirmeleri**.
- CLAUDE.md notu: "M1-M10 UX iyileştirmeleri var ama detayı şu an belirsiz, Kaan hatırladıkça eklenecek"
- Kaan'ın bahis 3 (sour cluster t3) kazandığı için ilk M seçimi onun
- M1-M10 listesi henüz net değil — Kaan hatırladıkça oluşacak

## Adım 58 Hazırlığı (V19 deploy hedefi)

1. **rmwoods raw HDF5 re-parse**:
   - `_step53_b1_parse_rmwoods.py` (eski parse script) audit
   - misc/hops detail field'larını HDF5'ten çek (önceki parse skip etmiş)
   - Beklenen: 200K+ reçete için misc/hops populated
2. **Yeni feature'lar coverage hedef**:
   - has_coriander (Witbier %0.3 → %30+)
   - has_dry_hop_heavy (NEIPA %16 → %50+) — gerçek dry hop g/L hesapla
   - has_late_hop_pct (modern IPA discriminator)
   - dry_hop_grams_per_liter (continuous, NEIPA imza)
3. **V18.3 dataset baz** (working/archive/v18_3_dataset_clean.json) — etiket temizlik + dedupe Plan C kazanımları korunur, baştan başlamaya gerek yok
4. **Outlier drop pipeline standard** (KURAL 1 zorunlu)
5. **Reg tuning sweet spot dene**: alpha=0.85, lambda=1.85, mcw=4, n_est=350 (V18.3 sıkı yakını, gap güvenli)

## Adım Sıralama (Kaan kararı, memory #29)

- **Adım 57** = Sprint 56a kapanış (BUGÜN) — rapor + archive + commit
- **Adım 58** = rmwoods raw HDF5 re-parse + Witbier/NEIPA kurtarma → V19 deploy
- **Adım 59** = Faz B sour cluster (gose has_salt güçlü, brett strain) → V19.1 deploy
- **Adım 60** = V6 strateji yeniden değerlendirme (memory #26 referans, KNN distance audit, dataset/tier/feature subset revize)

---

## Sayısal Özet

| Metric | V18.2 | V18.3 | V18.3.1 | Hedef Adım 58 |
|---|---|---|---|---|
| Slug top-1 | 55.86% | 55.06% | 55.36% | ≥56.5% |
| Slug top-3 | 79.85% | 79.15% | 79.50% | ≥80.5% |
| 14cat top-1 | 65.19% | 64.81% | 64.84% | ≥65.5% |
| Train-test gap | 5.24pp | 4.14pp | 5.78pp | <4.5pp |
| 5 stat gain | 5.69% | 6.65% ⭐ | 5.90% | ≥7% |
| Dataset size | 301K | 383K | 383K | 400K+ (rmwoods re-parse) |

**Sprint 56a sonu — V18.2 production'da, Adım 57'ye geçiyoruz.**
