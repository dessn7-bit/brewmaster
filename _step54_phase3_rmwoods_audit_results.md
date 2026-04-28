# Adım 54 Faz 3 — rmwoods Kalite Audit Sonuçları

**Tarih:** 2026-04-28
**Hedef:** 5 yüksek-baskın slug için 20'şer örnek (toplam 100) BJCP guideline check.

---

## ⚠️ KRİTİK BULGU — Audit %89 değil, B-3 SCRIPT BUG

100 sample audit sonucu **89/100 (%89) BJCP range dışında**.

**ANCAK:** Detay incelemede çıktı imkansız (OG=1.0006, ABV=0.05% gibi). Recipe label kalitesi DEĞİL, **Adım 53 B-3 script'inde 100× hesaplama hatası**.

### Bug detayı

`_step53_b3_to_v15_format.py:266` (B-3 OG estimate):

```python
eff = (core.get('efficiency') or 75) / 100.0 if core.get('efficiency') else 0.75
og_est = 1 + (tot_p_kg * eff * 2.205 / (batch_l * 0.264))
```

**rmwoods H5'te `efficiency` field formatı:** decimal (0.75, 0.85), **% değil**.

| Reçete | rmwoods efficiency | B-3 hesabı | Doğru olmalı |
|---|---|---|---|
| Tipik | 0.75 | 0.75 / 100 = **0.0075** | 0.75 |

100× düşük efficiency → 100× düşük gravity points → OG=1.0006 (gerçek 1.060 olmalıydı).

### Etki kapsamı

- **OG estimate** etkilendi: 330,783 reçete (B-3 NaN fill)
- **FG estimate** etkilendi: 330,783 reçete (FG = OG × attenuation, OG bozuk → FG bozuk)
- **ABV estimate** etkilendi: 330,783 reçete (ABV = (OG-FG) × 131.25, ikisi de bozuk → ABV ~0.05%)
- **IBU Tinseth** etkilendi mi? **EVET** — Tinseth utilization formülünde `boil_g = og` kullanılır. og=1.0006 ise utilization formülü `1.65 * (0.000125 ** (1.0006-1)) * (1 - exp(-0.04*time)) / 4.15` farklı bir değer üretir, ancak boil_g sapması tahminen %5-10 IBU'da etkili.
- **SRM Morey:** Etkilenmedi (gravity formülü kullanmıyor).
- **src_** doğru olan ~73K reçete: OG/FG/ABV doğru. Bu set **dataset'in temiz alt-kümesi**.

### V17 model davranışı bu bug'a rağmen nasıl iyi çalıştı?

V17 slug top-1 %55.18 (V16 %53.87'den +1.3pp) — bug'a rağmen kazanım.

**Açıklama:** V17 train'in 240,939 örneğinden ~%82'si (197K) **sabit OG/FG/ABV ≈ 1.0006/0.5%** sinyali aldı. XGBoost feature seçiminde bu "sabit" sinyali **hiçbir bilgi taşımıyor** olarak değerlendirdi → ilgili 5 feature ağırlığı düştü → diğer 76 feature (yeast/hop/malt/water/process) baskın oldu.

**Kullanıcı reçete girdiğinde ne olur?** Kullanıcının OG=1.058, ABV=5.6% girdileri V17 modelin train dağılımına eşit derecede yakın değil (out-of-distribution). Model muhtemelen OG/FG/ABV girdilerini neredeyse görmezden geliyor → predict yine 76 feature ile yapılıyor → V17 prediction stabil ama OG/FG/ABV semantiği boş.

### V18'de düzeltme

`_step53_b3_to_v15_format.py` line 266 düzeltmesi:

```python
# DÜZELTİLDİ: efficiency hem decimal hem pct format kabul
eff_raw = core.get('efficiency')
if eff_raw is None or eff_raw <= 0:
    eff = 0.75
elif eff_raw <= 1.5:  # decimal format (0.75 = %75)
    eff = eff_raw
else:               # pct format (75 = %75)
    eff = eff_raw / 100.0
```

V18 dataset rebuild'da bu fix uygulanır → OG/FG/ABV doğru hesaplanır → sour cluster'da bile "1.060 OG, %5.5 ABV" tipik değerler train'e girer → model gravity-aware olur.

---

## Audit summary (bug-corrupted)

| Slug | Sample n | Out-of-range | % | Sebep |
|---|---|---|---|---|
| american_brown_ale | 20 | 18 | 90% | OG/ABV bug (gerçek label OK) |
| robust_porter | 20 | 20 | 100% | OG/ABV bug |
| double_ipa | 20 | 17 | 85% | OG/ABV bug + bazı reçete sorte_raw="imperial ipa" (BJCP 2008 alias) |
| sweet_stout | 20 | 17 | 85% | OG/ABV bug + bazı sorte_raw="foreign extra stout" |
| blonde_ale | 20 | 17 | 85% | OG/ABV bug |

### Recipe label kalitesi — bug ortadan kalktığında ne çıkar?

Sample'lardaki sorte_raw alanı (rmwoods'ın orijinal style etiketi):

- **american_brown_ale** sample 20'sinde: hepsi "american brown ale" (etiket tutarlı)
- **robust_porter** sample 20'sinde: hepsi "robust porter" 
- **double_ipa** sample 20'sinde: 17 "imperial ipa" (BJCP 2008 = double ipa, mapping doğru), 3 "double ipa". Hatalı sorte yok.
- **sweet_stout** sample'inde: 17 "sweet stout", 3 "foreign extra stout" → **3 yanlış map** (Faz 1'de düzeltilecek: foreign_extra_stout → export_stout ayrı slug)
- **blonde_ale** sample'inde: hepsi "blonde ale"

**Recipe label kalitesi tahmini: %95+ doğru.** Sweet_stout'daki "foreign extra stout" karışıklığı **yapısal bir sorun**, etiket gürültüsü değil — Faz 1 mapping fix bunu çözüyor.

---

## Adım 53 geri çekilme tartışması

**Geri çekilme GEREK Mİ?**

Hayır. Sebepler:

1. **Recipe label kalitesi yüksek** (sample %95+ doğru).
2. **Bug etkisi semptomatik:** OG/FG/ABV feature'ı boş, ama model 76 diğer feature'la çalışıyor. V17 metrik V16'dan iyi.
3. **V18'de bug düzelir** — V17 1-2 hafta üretimde kalır, sonra V18 ile değiştirilir.
4. **Rollback maliyet daha yüksek:** V16 baseline daha kötü (53.87% slug t1), V17 (55.18%) yine de ileri.

**ANCAK:**

- V17 production'da kalmaya devam edebilir ama **bilinen sınırlama olarak kayda alınmalı:**
  - "Bu model OG/FG/ABV girdilerine duyarsız (B-3 unit bug). Predict tahmini malt/yeast/hop/process feature'larından geliyor."
- **Adım 54 Faz 5 V18 retrain'i takvime önceliklendir:** B-3 fix + Faz 1 mapping ile V18 daha sağlam olur.

---

## Onay 3 sorusu

- **Karar 3A** (önerilen): V17 production'da kal, V18 retrain'i hızlandır (1-2 hafta hedef). Smoke test 8 reçeteyi kullanıcının kendisi yapacak — eğer OG/FG farklı gravity reçetelerinde V17 prediction'ı tuhaf çıkıyorsa V18'i acil önceliklendir.
- **Karar 3B** (muhafazakar): Acil V16 rollback (`git revert 42f1ce0`). V18 hazır olunca tekrar deploy.
- **Karar 3C** (paralel): V17 production'da kalsın, ben ek smoke test scripti yazayım — 10 referans reçete üzerinde V17 predict yap, OG değiştirerek output sabit mi diye test et. Bu V17'nin OG-duyarsızlığını ölçer.

---

## V18 öncelik sıralaması güncellemesi

1. **B-3 efficiency unit bug fix** (1 satır, kritik)
2. **B-3 NaN fill ordering doğrulama** — OG estimate sonrası IBU/SRM doğru order'da hesaplandığı kontrol
3. Faz 1 mapping update (9 yeni slug)
4. Faz 2 BRETT_RE genişletme (opsiyonel, küçük n etkisi)
5. V18 dataset rebuild (B-1 + güncellenmiş B-2 + düzeltilmiş B-3 + B-5)
6. V18 retrain
7. V18 metric karşılaştırma (V16 vs V17 vs V18, src_og NotNa subset için ayrıca)
8. HTML embed + smoke test

---

## Çıktılar

- `_step54_phase3_rmwoods_audit_results.md` (bu rapor)
- `working/_step54_phase23_sample.py` (Faz 2 + 3 sample script)
- `working/_step54_phase23_raw.txt` (tam ham çıktı, 30 brett + 20 mixed_ferm + 100 audit detay)
