# STEP 48 FAZ 1 — Full Dataset Yeast Corruption Audit

**Tarih:** 2026-04-27
**Süre:** ~30 dk
**Sonuç:** **%22 dataset corrupt** (1,761/8,061). Sour'un ötesinde sistematik problem. **Tüm cluster'larda 15-46% corruption.**

DUR — Faz 2-5 onay bekliyor.

---

## 🎯 Üst Özet

| | |
|---|---|
| **Total corruption rate** | **21.85%** (1,761 / 8,061) |
| Tamamen 100% bozuk source | **diydog (243), pilot (183)** = **5.3% dataset kayıp** |
| Yarısı bozuk | **tmf 49%** (blog parse bugları) |
| Önemli ölçüde bozuk | **recipator 28%** (HTML parse bugları, 1,141 record) |
| BeerXML kaynaklar TEMİZ | **mmum %0.1, twortwat %2.8, braureka %4.3** |
| **En kötü cluster** | **Sour 46%, Stout 32%, Saison 31%, Belgian Strong 30%, British Strong 31%** |
| **En iyi cluster** | German Wheat 15%, Specialty 16%, German Lager 16% |

---

## 1. Source × Pattern Matrix

```
Source     empty  object  html  prose  name-only  clean  medium  TOTAL
amervallei     1     0      0      0       0        3      0       4
braureka      77     0      6      0       0     1934      4    2021
diydog       243     0      0      0       0        0      0     243  ⚠️ %100 BOŞ
mmum           1     0      0      0       0     1127      0    1128  ✅
pilot          0   183      0      0       0        0      0     183  ⚠️ %100 [object Object]
recipator    497     0     44    257       4     2878    339    4019  ⚠️ büyük zarar
roerstok      18     0      0      0       0       68      0      86
tmf            6     4     10      2       0       85     59     166
twortwat       6     0      0      0       0      205      0     211  ✅
```

### Source corruption rate

| Source | Total | Corrupt | Rate | Status |
|---|---:|---:|---:|---|
| **diydog** | 243 | 243 | **100%** | ⚠️ TÜMÜ EMPTY |
| **pilot** | 183 | 183 | **100%** | ⚠️ TÜMÜ `[object Object]` |
| **tmf** | 166 | 81 | **48.8%** | ⚠️ blog parse bugs |
| **recipator** | 4019 | 1141 | **28.4%** | ⚠️ HTML parse bugs |
| amervallei | 4 | 1 | 25.0% | small n |
| British Bitter cluster | — | — | 23.3% | |
| roerstok | 86 | 18 | 20.9% | parse partial |
| braureka | 2021 | 87 | **4.3%** | ✅ BeerXML clean |
| twortwat | 211 | 6 | **2.8%** | ✅ BeerXML clean |
| **mmum** | 1128 | 1 | **0.1%** | ✅ EN CLEAN |

---

## 2. Cluster × Corruption Rate (önemli — sadece Sour değil!)

| Cluster | Total | Corrupt | Rate |
|---|---:|---:|---:|
| **Sour / Wild / Brett** | 87 | 40 | **46.0%** ⚠️ |
| Stout / Porter | 871 | 277 | 31.8% |
| Saison / Farmhouse | 156 | 49 | 31.4% |
| British Strong / Old | 260 | 81 | 31.2% |
| Belgian Strong / Trappist | 274 | 82 | 29.9% |
| Belgian Pale / Witbier | 313 | 77 | 24.6% |
| British Bitter / Mild | 335 | 78 | 23.3% |
| Irish / Red Ale | 725 | 153 | 21.1% |
| Hybrid Ale-Lager | 557 | 113 | 20.3% |
| American Hoppy | 2273 | 454 | 20.0% |
| German Lager | 1412 | 229 | 16.2% |
| Specialty / Adjunct | 403 | 63 | 15.6% |
| German Wheat | 383 | 58 | 15.1% |

**Adım 47 sadece Sour'a bakmıştı.** Audit gösteriyor ki **her cluster'da %15+ corruption** var. Belgian Strong/Trappist (V11'in en güçlü cluster'ı) %30 bozuk — has_belgian_yeast feature aslında "tüm" bu cluster'ı görmüyor.

---

## 3. Pattern Aggregate (8,061 dataset)

| Pattern | n | % |
|---|---:|---:|
| **clean** | **6,300** | **78.15%** |
| empty | 849 | 10.53% |
| medium_freeform | 402 | 4.99% |
| prose_paragraph | 259 | 3.21% |
| object_string | 187 | 2.32% |
| html_residue | 60 | 0.74% |
| name_only | 4 | 0.05% |

---

## 4. Bug Kategorileri ve Kök Neden Analizi

### Bug 1: pilot `[object Object]` — 100% (183/183)
**Sebep:** Brewfather export → JSON parse'da yeast object → string conversion'ı `String([{...}])` veya `.toString()` ile yapılmış (`[object Object]` üretir). 
**Etki:** 183 reçete (tüm pilot dataset) yeast field unusable
**Fix path:** Brewfather token (`HGrEC0Rg7uN8vyerICT8Lo4gOJh1`) ile re-fetch + array.map(y=>y.name).join() doğru extract

### Bug 2: diydog 100% empty — (243/243)
**Sebep:** BrewDog DIYdog public BeerXML files'ında **yeast field aslında BOŞ** (BrewDog kasten strain ID vermiyor commercial sebepten)
**Fix path:** **YOK** — orijinal data zaten boş, parse bug değil
**Karar:** diydog yeast field için manuel reconstruction imkansız (uydurulmuş data ML'e zehir)

### Bug 3: recipator 28% (1,141 corrupt)
**Detay:**
- 497 empty (recipe Notes/Yeast cell HTML parse'ında miss-row)
- 257 prose paragraph (Yeast cell + Notes karışmış)
- 339 medium_freeform (parse partial)
- 44 html_residue (`&quot;` decode etmedi)
- 4 name_only (`Saflager` generic — strain ID belirtilmemiş)

**Fix path:** Recipator HTML parser (`_recipator_parse_normalize.js`) yeast cell extraction logic'ini düzelt:
- `<td>` cell boundary doğru tanımla
- HTML entity decode genişlet
- Notes vs Yeast karışmasını engelle

### Bug 4: tmf 49% (81 corrupt)
**Detay:** Blog post HTML'de "Yeast" section'ı extract ederken paragraph boundary tespit edememiş. İlk paragraf (yeast section) yeast field'a yapışıyor, ama paragraph 200+ char ise body content sızıyor.

**Fix path:** TMF blog parser (Adım 14 öncesi, eski) regex revize:
- "Yeast" başlığı → next `<p>` veya `<br>` boundary
- Sentence pattern detect, ilk strain ID'den sonra dur
- Strain ID lookup: regex match → kes

### Bug 5: braureka 4.3% (87 corrupt)
**Detay:** 77 empty (BeerXML'de yeast section eksik) + 6 html_residue + 4 medium

**Fix path:** Çoğu zaten kabul edilebilir (BeerXML upload kullanıcısı yeast yazmamış). Skip.

### Bug 6: roerstok 21% (18 empty)
**Detay:** Adım 45 Aşama 0 fetch'inde 18 reçete fetch hatası — yeast field empty. Re-fetch deneyebilir.

---

## 5. Dataset Toplam Etkisi (Eğer Faz 2-5 yapılırsa)

### Senaryo A: Tam fix mümkün (Brewfather pilot re-fetch + parser fix recipator/tmf)
- pilot 183 + recipator 1,141 + tmf 81 = **1,405 reçete kurtarılır**
- diydog 243 + braureka 87 = **330 reçete unsalvageable** (data zaten yok)
- **Yeni clean rate: 96.0%** (V10.1: 78%)
- Yeast feature coverage:
  - Brett: %0.17 → **%2-4** (Sour cluster temiz olunca strain'ler görünür)
  - Lacto: %0.10 → **%1-3**
  - Belgian: %4.6 → **%6-8**
  - Clean US05: %11.8 → **%14-17**

### Senaryo B: Kısmi fix (sadece pilot + recipator)
- 1,324 reçete kurtarılır
- TMF skip (blog parse zor, ROI marjinal)
- Clean rate: 92%
- Sour cluster spesifik kazanım az (TMF'in 31 Sour reçetesi atılır)

### Senaryo C: Kayıp kabul (sadece audit, fix yok)
- Mevcut V11 ile devam (V10.1 default)
- diydog ve pilot dataset'ten çıkar (-426 reçete = 7,635)
- Bu sadece "data quality acknowledgment", fix değil

---

## 6. Faz 2-5 Süre Tahmini Revizyonu

**Orijinal user tahmini:** 4-5 saat
**Audit sonrası gerçekçi tahmin:**

| Faz | Orijinal | Revize | Sebep |
|---|---:|---:|---|
| Faz 2 (kod fix) | 1.5-2 saat | **2.5-3 saat** | recipator parser daha karmaşık (1141 reçete) |
| Faz 3 (re-parse) | 30-45 dk | **1-1.5 saat** | 1,405 reçete + Brewfather rate limit |
| Faz 4 (V12 retrain) | 1 saat | 1 saat | aynı |
| Faz 5 (rapor) | 15 dk | 30 dk | daha detaylı |
| **TOPLAM** | **4-5 saat** | **5-6 saat** |

---

## 7. Kritik Karar Soruları (Kaan)

### Q1: diydog ve pilot için karar?
- **Opt A:** diydog (243) + pilot (183) = 426 reçete dataset'ten ÇIKAR (V12 base = 7,635)
- **Opt B:** pilot Brewfather re-fetch yap (183 kurtarılır), diydog çıkar (V12 base = 7,818)
- **Opt C:** İkisini de bırak (yeast feature 0 kalır ama scalar feature'lar çalışır — **mevcut durum**)

### Q2: recipator 1,141 corrupt fix öncelik?
Recipator dataset'in **%50+'si** (4,019 toplam içinde 1,141 — aslında %28). Fix kritik ama büyük iş.
- **Opt A:** Tam fix (1.5-2 saat dev iş)
- **Opt B:** Sadece prose+medium (en bozuk 596 reçete)
- **Opt C:** Skip recipator parse fix, sadece diğerlerine odaklan

### Q3: TMF blog parse fix değer mi?
TMF 166 reçete, 81 corrupt. Sour cluster'ında 12 reçete (önemli). Ama parse zor.
- **Opt A:** Fix (TMF Sour reçetelerini kurtar — Sour cluster için kritik)
- **Opt B:** Skip TMF, dataset'ten 81 corrupt çıkar (TMF total -81)

### Q4: V12 strategy?
- **Opt A:** Tam fix + brett/lacto feature ekle (V11+4 = 80 feature) → büyük V12 sprint (5-6 saat)
- **Opt B:** Sadece data temizle, V11 feature seti aynı kalsın (V12 = clean V11) → 3-4 saat
- **Opt C:** Skip Adım 48 fix, V10.1 production'da bırak, başka kaynaklara git → 0 saat

---

## 8. Önerilen Plan (Code'un yargısı)

**Plan: Hibrit B+B+A+A**

### Faz 2 (revize) — pilot fix + recipator selective + tmf skip
- Brewfather pilot re-fetch (30 dk) → 183 kurtarılır
- Recipator parser fix (1.5 saat) — yeast cell HTML extraction iyileştir → 596 (prose+medium) kurtarılır
- TMF skip — yeast prose 81 reçete dataset'te bırak (parser değişmez, sadece feature 0 kalır o reçeteler için)
- diydog dataset'ten ÇIKAR (243 reçete) — orijinal data zaten yok

**Yeni dataset boyutu:** 8,061 - 243 = **7,818 reçete**
**Clean rate:** 78% → **~93%**

### Faz 4 (revize) — V12 = clean data + brett feature
- Brett/Lacto coverage yeniden ölç (re-parse sonrası)
- Coverage %3+ ise → has_brett_strain, has_lacto_strain ekle (V12 = 78 feature)
- Coverage hâlâ <%3 ise → V12 = clean V11 (aynı 76 feature)

**Tahmini Faz 2-5 toplam: 4-5 saat**

---

## 9. Çıktılar

- `_step48_corruption_audit.md` — Bu rapor
- `_a48_corruption_audit.js` — full audit script
- `_a48_corruption_audit.json` — source × pattern matrix + cluster + samples

DUR — Kaan onayı bekliyor.
