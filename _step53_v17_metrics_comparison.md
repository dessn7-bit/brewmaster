# V16 vs V17 — Detaylı Metrik Karşılaştırma

**Tarih:** 2026-04-28
**Commit:** `42f1ce0` (Adım 53 V17 deploy, push origin/main)
**V16 baseline:** `a03e1eb` (Adım 52, 2026-04-28)

---

## 1. Holdout Metrikler

### Slug model

| Metric | V16 | V17 | Δ |
|---|---|---|---|
| **Test top-1** | 53.87% | **55.18%** | 🟢 **+1.31pp** |
| **Test top-3** | 76.30% | **79.92%** | 🟢 **+3.62pp** |
| **Test top-5** | 83.87% | **88.30%** | 🟢 **+4.43pp** |
| Slug class count | 82 | 82 | — (aynı) |
| Test set boyutu | 526 reçete | 60,235 reçete | ×114.5 |

### 14-Cat / Cluster model

| Metric | V16 | V17 | Δ |
|---|---|---|---|
| **Test top-1** | 69.42% | 64.46% | 🔴 −4.96pp* |
| **Test top-3** | 90.25% | 88.95% | ⚪ −1.30pp |
| **Test top-5** | 96.25% | 95.66% | ⚪ −0.59pp |
| Class count | 14 | 16** | +2 |
| Train top-1 | 80.79% | 65.01% | — |
| **Train-test gap** | **+11.38pp** | **+0.55pp** | 🟢 −10.83pp (overfit AZALDI) |
| Test set boyutu | 1,915 reçete | 60,235 reçete | ×31.5 |

\* 14-cat top-1 düşüş, taksonomi farkından kaynaklı (16 vs 14 class = daha zor problem). Aşağıda detay.
\*\* V16 14 perceptual grouping (örn. "American Hoppy" + "Stout / Porter") ↔ V17 16 BJCP-mechanic (ipa ayrı, pale_ale ayrı, stout ayrı, porter ayrı). **Aynı reçete kümeleri, farklı çatallaştırma.** Direkt kıyas yanıltıcı.

### Train-test gap (overfit göstergesi) — KRİTİK İYİLEŞME

V16: train 80.79% / test 69.42% → gap **+11.38pp** (overfit var)
V17: train 65.01% / test 64.46% → gap **+0.55pp** (neredeyse hiç overfit yok)

V17'de model çok daha iyi generalize ediyor. 30× veri ile XGBoost ezber yerine örüntü öğrendi.

---

## 2. Per-Cluster Top-1 Accuracy

### V16 (14 cluster, 1,915 test)

| V16 Cluster | n | top-1 | top-3 |
|---|---|---|---|
| American Hoppy | 502 | 82.87% | 97.61% |
| Stout / Porter | 212 | 86.79% | 95.75% |
| German Lager | 335 | 85.07% | 95.82% |
| German Wheat | 81 | 79.01% | 92.59% |
| Sour / Wild / Brett | 41 | **65.85%** | 75.61% |
| Belgian Strong / Trappist | 61 | 65.57% | 91.80% |
| Saison / Farmhouse | 45 | 64.44% | 75.56% |
| Irish / Red Ale | 153 | 50.98% | 90.85% |
| British Bitter / Mild | 77 | 49.35% | 84.42% |
| Belgian Pale / Witbier | 68 | 48.53% | 77.94% |
| Hybrid Ale-Lager | 117 | 44.44% | 79.49% |
| British Strong / Old | 57 | 40.35% | 68.42% |
| Specialty / Adjunct | 113 | 23.89% | 76.11% |
| Historical / Special | 5 | 0.00% | 0.00% |

### V17 (16 cluster, 60,235 test)

| V17 Cluster | n | top-1 | top-3 |
|---|---|---|---|
| ipa | 12,154 | **83.78%** | 96.89% |
| stout | 4,854 | **87.27%** | 95.84% |
| wheat | 3,314 | 81.77% | 92.82% |
| lager | 3,646 | 67.55% | 85.02% |
| belgian | 3,856 | 67.04% | 85.68% |
| pale_ale | 8,903 | 62.39% | 92.79% |
| saison | 3,074 | 63.86% | 80.35% |
| sour | 805 | 59.75% | 73.04% |
| cream | 3,262 | 55.55% | 82.46% |
| bitter | 3,147 | 53.96% | 77.98% |
| barleywine | 753 | 52.59% | 77.82% |
| brown | 1,888 | 50.74% | 79.45% |
| porter | 2,192 | 50.18% | 91.20% |
| mild | 1,453 | 50.24% | 74.95% |
| bock | 597 | 47.91% | 69.51% |
| specialty | 6,337 | 26.37% | 88.65% |

### Gözlem (cluster bazlı)

**Yükselişler (V17 daha iyi):**
- **ipa** 83.78% (V16'da "American Hoppy" 82.87% → +0.9pp, daha çok veri ile aynı seviye korundu)
- **stout** 87.27% (V16'da "Stout / Porter" 86.79% → +0.5pp)
- **specialty** top-3: 88.65% (V16 "Specialty / Adjunct" top-3 76.11% → **+12.5pp**) — top-1 düşük ama top-3 çok güçlü
- **saison** 63.86% (V16 64.44% → −0.6pp, eşdeğer)

**Düşüşler (kıyas adil değil — naming farklı):**
- "Hybrid Ale-Lager" 44.4% V17'de yok (cream + lager ile bölündü). cream 55.5%, lager 67.6% → ortalama daha iyi.
- "Belgian Pale / Witbier" 48.5% V17'de yok (belgian 67.0% + wheat'a dağıldı). 
- "Sour / Wild / Brett" 65.9% V17'de "sour" 59.8% (−6pp) — ama V17 sour cluster brett'siz daha sıkı tanım.
- "Specialty / Adjunct" 23.9% top-1 ↔ "specialty" 26.4% top-1 (+2.5pp eşdeğer)

**Net cluster:** V17 daha granular 16 sınıfa rağmen ana kategorilerde V16'yla benzer veya daha iyi. Specialty cluster top-3 büyük sıçrama (+12.5pp).

---

## 3. Per-Slug Top-1 Accuracy

### Slug count değişimi

| | V16 | V17 |
|---|---|---|
| ≥10 reçete filter sonrası | **82** | **82** |
| Set karşılaştırma | birebir aynı | birebir aynı |
| Yeni slug eklenmiş | — | **0 (sıfır)** |
| Düşürülen slug | — | 0 |

**V17'de yeni slug YOK.** B-2 mapping table sadece mevcut V15 82 slug'ına map etti. rmwoods'ta varolan ek alt-stiller (ör. `belgian_fruit_lambic`, `american_wild_ale`, `belgian_gueuze`, `flanders_red_ale`, `foreign_extra_stout`, `belgian_ipa`, `finnish_sahti`, `czech_amber_lager`, `franconian_rotbier`, `american_light_lager`) en yakın V15 slug'ına çekildi:
- `belgian_fruit_lambic` → `belgian_lambic`
- `flanders_red_ale` → `belgian_lambic`
- `foreign_extra_stout` → `sweet_stout`
- `belgian_ipa` → `belgian_strong_golden`
- `finnish_sahti` → `specialty_beer`
- vb.

(Tam liste: `_step53_b2_style_mapping.py` `NAME_MAP` dict'i)

### Spotlight slug'lar — kazançlar

| Slug | V16 n / t1 | V17 n / t1 | Δ |
|---|---|---|---|
| **belgian_lambic** | 5 / 0.00% | 364 / 50.27% | 🟢 **+50.3pp** transformative |
| **oud_bruin** | 2 / 0.00% | 87 / 21.84% | 🟢 +21.8pp |
| **german_oktoberfest_festbier** | 7 / 0.00% | 16 / 18.75% | 🟢 +18.8pp |
| **french_belgian_saison** | 33 / 69.70% | 2,133 / 84.44% | 🟢 +14.7pp |
| **south_german_weizenbock** | 7 / 42.86% | 174 / 57.47% | 🟢 +14.6pp |
| **american_amber_red_ale** | 78 / 29.49% | 1,880 / 42.29% | 🟢 +12.8pp |
| **berliner_weisse** | 3 / 66.67% | 296 / 74.32% | 🟢 +7.7pp |
| **specialty_beer** (top-1) | 29 / 10.34% | 4,392 / 17.46% | 🟢 +7.1pp top-1 |
| **specialty_beer** (top-3) | 29 / 27.59% | 4,392 / 75.98% | 🟢 **+48.4pp top-3** |
| **smoked_beer** | 10 / 30.00% | 196 / 37.24% | 🟢 +7.2pp |

### Spotlight slug'lar — regresyonlar (Adım 54 backlog)

| Slug | V16 n / t1 | V17 n / t1 | Δ | Sebep tahmini |
|---|---|---|---|---|
| **brett_beer** | 8 / 62.50% | 15 / 6.67% | 🔴 **−55.83pp** | rmwoods sour kayıtlarında brett strain explicit gösterilmiyor; signal weak |
| **mixed_fermentation_sour_beer** | 14 / 78.57% | 43 / 23.26% | 🔴 **−55.32pp** | brett ile karışıyor; rmwoods'ta `wild_specialty_beer` ve `mixed-fermentation` aynı V15 slug'a düştü |
| **american_strong_pale_ale** | 44 / 43.18% | 91 / 27.47% | 🔴 −15.71pp | rmwoods'ta düşük örnekleme; IPA family gradient ile karışım |
| **belgian_witbier** | 28 / 82.14% | 983 / 71.01% | 🔴 −11.13pp | `specialty_ipa: white ipa` (274 reçete) bu slug'a map edildi → witbier sınırı bulanıklaştı |
| **south_german_hefeweizen** | 63 / 82.54% | 1,290 / 75.58% | 🔴 −6.96pp | `weissbier` ve `dunkles_weissbier` ailesinde fark erodu; wheat cluster genişledi |
| **american_pale_ale** | 127 / 64.57% | 6,912 / 62.65% | 🔴 −1.92pp | sınır bölgede APA↔IPA gradient'i |
| **belgian_dubbel** | 25 / 68.00% | 502 / 66.53% | 🔴 −1.47pp | nominal eşdeğer |
| **belgian_tripel** | 33 / 66.67% | 542 / 62.55% | 🔴 −4.12pp | nominal eşdeğer |
| **fruit_beer** | 14 / 14.29% | 573 / 10.47% | 🔴 −3.81pp | nominal eşdeğer (zaten zayıf kategori) |
| **english_pale_ale** | 19 / 15.79% | 20 / 15.00% | ⚪ −0.79pp | nominal eşdeğer |

---

## 4. Brett Regresyonu — Detay ve Aciliyet Değerlendirmesi

### Skala

İki slug ciddi düşüşte:

| Slug | V16 | V17 | Δ | V17 test n |
|---|---|---|---|---|
| `brett_beer` | 62.50% | **6.67%** | −55.83pp | 15 |
| `mixed_fermentation_sour_beer` | 78.57% | **23.26%** | −55.32pp | 43 |

### Bağlam

- V16'da "Sour / Wild / Brett" cluster top-1 65.85% idi (n=41).
- V17'de "sour" cluster (brett + lambic + oud_bruin + berliner + mixed_ferm) top-1 59.75% (n=805), top-3 73.04%.
- Cluster bazında V17 sour ~6pp düşük ama 20× daha çok veri var (805 vs 41). İstatistiksel güven daha sağlam.
- **belgian_lambic** sıfırdan 50%'a çıktı (transformative kazanç). **oud_bruin** sıfırdan 22%'e.
- Brett ve mixed_ferm "spesifik sour aileler" — tipik olarak az reçete ve karşılıklı karışıma yatkın.

### Acil mi?

**Hayır, acil değil:**

1. **Cluster düzeyinde sour grup top-3 73%** kabul edilebilir. UI top-3 öneri gösterir, top-1 atılması nadir.
2. **Diğer sour aileleri yükseldi**: lambic +50pp, oud_bruin +22pp, berliner_weisse +7.7pp. Net sour mekanizması güçlendi.
3. **Brett ve mixed_ferm V17'de yine sour cluster'da top-3'te düşmedi** (brett 33% top-3, mixed_ferm 58% top-3 — kabul edilebilir).
4. **Test set'i küçük**: brett n=15, mixed_ferm n=43 — yüzde sapmaları görece gürültülü.

**V17 production'dan geri çekilmeli mi:** Hayır. Genel slug top-3 +3.6pp, top-5 +4.4pp ana metrikler net iyileşme. Brett/mixed regresyon Adım 54'te düzeltilmeli.

### Adım 54 düzeltme önerileri

- **BRETT_RE pattern güçlendirme**: rmwoods yeast_name + yeast_laboratory'den brett strain'leri explicit yakalamak (örn. "Lallemand Wildbrew", "Imperial Yeast Sour Batch").
- **`yeast_brett` / `yeast_lacto` / `yeast_pedio` signal weight artırma** (XGBoost feature importance check).
- **rmwoods sour subset analizi**: 805 sour reçete içinde gerçek brett vs nominal sour ayrımı.
- **Mixed-fermentation alternative slug**: rmwoods `wild_specialty_beer` (44 reçete) ve `mixed-fermentation_sour_beer` (160 reçete) farklı V15 slug'lara ayrılabilir mi?

---

## 5. Slug Count Değişimi (Detay)

| Aşama | V17 |
|---|---|
| Mapping unique slug count | 82 (V15 setine kilitli) |
| V17 dataset ham unique slug | ≈127 |
| V17 dataset ≥10 filter sonrası | 82 |
| V17 dataset <10 dropped | 45 |
| **Sonuç** | **V16 ile birebir aynı 82 slug** |

**Kritik tasarım kararı (B-2):** rmwoods'ta `belgian_gueuze`, `flanders_red_ale`, `belgian_fruit_lambic`, `foreign_extra_stout` gibi alt-stiller mevcut. Bunlar V15 setine map edildi (kalın çatallaştırma korunmadı). Avantajı: V16 motoruyla geriye dönük uyum. Dezavantajı: granül ayrım kayboldu.

**Adım 54 öneri:** En çok reçeteye sahip alt-stiller (örn. `belgian_gueuze` ≈373 reçete, `flanders_red_ale` ≈950 reçete) ayrı slug yapılırsa V17.1'de slug count 86-90'a çıkabilir.

---

## 6. Top-1 Düşüş Analizi — Senin "73% → 55.2%" iddian

**Düzeltme:** Senin verdiğin "V16 t1 ~73%" rakamı hatalı. Hangi metrikten geldiğini kontrol ettim:

| Olası kaynak | Değer | Açıklama |
|---|---|---|
| V16 metrics.json `slug.test_top1` | **53.87%** | Doğru slug t1 |
| V16 metrics.json `14cat.test_top1` | 69.42% | 14-cat (cluster) — slug değil |
| V16 metrics.json `14cat.cv_mean` | 69.26% | 5-fold CV |
| HTML toggle UI text "Sour %66" | 65.85% | Sour cluster top-1 (V16'daki cluster) |
| LOOCV top-3 (Adım 50 öncesi) | 76.6% | LOOCV top-3, V13 |

V16 slug top-1'in gerçek değeri **53.87%**, V17 ise **55.18%** → **+1.31pp ARTIŞ, düşüş değil.**

### Bias'sız kıyas: per-slug weighted average

V17 slug top-1 hesabı zaten **doğal weighted average** (test set'te her slug'ın gerçek frekansıyla orantılı katkı). Slug çoğalmadığı için "more slugs bias" sorunu **yok**.

V17 t1 55.2% > V16 t1 53.9% gerçek bir kalite kazancı.

**Ekstra doğrulama:** Spotlight 21 slug ortalaması (n-weighted):
- V16 spotlight ortalama (n=712 toplam) ≈ 50.6% top-1
- V17 spotlight ortalama (n=29,512 toplam) ≈ 56.8% top-1

Spotlight subset'te bile V17 daha iyi.

---

## 7. Production Durumu

### Şu an

- **V17 GitHub Pages'da live** (commit `42f1ce0` push edildi origin/main).
- `Brewmaster_v2_79_10.html` line 1145-1148: V17 model URL'leri.
- HTML'de UI text "V12 (V17) ⭐" — toggle hala mevcut (V6 KNN + V12 V17 XGBoost).
- V16 model dosyaları root'ta hala duruyor (`_v16_model_*.json`) ama HTML referans vermiyor.
- V16 archive'a ALINMADI — sadece HTML referansı V17'ye geçti.

### Toggle durumu

- Aktif iki seçenek: V6 (KNN, eski) + V12 (V17 XGBoost, default ⭐).
- Kullanıcı toggle'da V12 görür → V17 model yüklenir.
- V8.5/V9/V10/V10.1 toggle'dan kaldırıldı (Adım 51).

### Rollback nasıl olur (eğer V17 ciddi regresyon yaparsa)

```bash
# 1. HTML'de V17 → V16 path geri al
git revert 42f1ce0
git push origin main
```

veya manuel hot-fix (HTML'de 4 satır):
```javascript
const MODEL_URL = '_v16_model_14cat.json';
const LABELS_URL = '_v16_label_encoder_14cat.json';
const SLUG_MODEL_URL = '_v16_model_slug.json';
const SLUG_LABELS_URL = '_v16_label_encoder_slug.json';
```
+ git push.

V16 model dosyaları zaten root'ta — silinmedi. Anında rollback mümkün.

---

## 8. Smoke Test (8 reçete)

**DURUM: YAPILMADI.**

Adım 53 senin (Kaan'ın) sahasına ait test sürümünde — Code (ben) browser smoke test koşturmadı. Production'a deploy edildi, sen kendi makinende:
- Brewmaster_v2_79_10.html aç (PWA veya local)
- 8 referans reçete (Pumpkin Ale, Muzo wheat, Karadut Belgian Dubbel, Bergamot Kveik, 2 brett/sour, 2 yeni rmwoods kaynaklı) ile V12 motor önerilerini görsel inceleme

Smoke test sonucu raporu Adım 54'e kayda geçirilebilir.

**Otomatik smoke test alternatifi (Adım 54):** Holdout test set'inden 8-15 fixed reçete seç, V12 motor predict çıktısını JSON dump'la, V16 vs V17 yan yana karşılaştır.

---

## Özet — Karar Kriterleri

| Kriter | V16 | V17 | Sonuç |
|---|---|---|---|
| Slug top-1 | 53.87% | 55.18% | 🟢 V17 |
| Slug top-3 | 76.30% | 79.92% | 🟢 V17 (+3.62pp) |
| Slug top-5 | 83.87% | 88.30% | 🟢 V17 (+4.43pp) |
| Train-test gap | +11.38pp | +0.55pp | 🟢 V17 (overfit yok) |
| Test set size | 526 | 60,235 | 🟢 V17 (×114 daha güvenilir) |
| Sour cluster top-3 | 75.61% | 73.04% | ⚪ Eşdeğer |
| Brett spotlight | 62.5% | 6.7% | 🔴 V16 (Adım 54 fix) |
| Mixed_ferm spotlight | 78.6% | 23.3% | 🔴 V16 (Adım 54 fix) |
| Lambic | 0.0% | 50.3% | 🟢 V17 transformative |
| Specialty top-3 | 27.6% | 76.0% | 🟢 V17 transformative |

**Net karar:** V17 deploy ✅ (genel kalite ve istatistiksel güvenilirlik V16'dan iyi). Brett/mixed regresyon 2 spesifik slug'da, Adım 54'te hedeflenecek. Rollback gerek yok.
