# AUDIT STEP 21 — pct_base DATASET ANALİZİ

**Tarih:** 2026-04-26
**Dataset:** `_ml_dataset_v6_final_comprehensive.json` (1100 reçete)
**UI Dubbel feature vector (Adım 18 + Faz 1 fix sonrası):** pct_pilsner=52, pct_base=69, pct_munich=17, pct_crystal=0, pct_sugar=5.2, og=1.065, srm=24, abv=6.93, ibu=14, yeast_abbey=1, yeast_belgian=0, mash_type_step=1, hop_german=1, katki_chocolate=1.

---

## 1. pct_base + pct_pilsner co-occurrence — gerçek davranış

| Metrik | Değer |
|---|---:|
| pct_pilsner > 0 | 1030/1100 (%93.6) |
| pct_base > 0 | 664/1100 (%60.4) |
| BOTH > 0 | 603/1100 (%54.8) |
| only pct_pilsner | 427 |
| only pct_base | 61 |
| NEITHER | 9 |
| **Pearson r(pct_pilsner, pct_base)** | **−0.1292** |

**Yorum:** Negatif (zayıf) korelasyon — eğer dataset'te pale_ale (her iki regex'i de tetikler) çok kullanılsaydı pozitif korelasyon beklenirdi. Negatif r, dataset'te iki feature'ın **birbirini İKAME ettiği** anlamına geliyor: bir reçete Pilsner-bazlıysa pct_base ≈ 0, Pale-bazlıysa pct_pilsner kısmen düşer (regex match çakışması var ama base ağırlıklı).

### Top 20 stil — pct_pilsner / pct_base ortalamaları

| Stil | n | pp ort | pb ort | both% |
|---|---:|---:|---:|---:|
| american_india_pale_ale | 59 | 67.7 | 76.5 | 90% |
| french_belgian_saison | 41 | 76.7 | 6.0 | 32% |
| pale_lager | 35 | 81.9 | 1.7 | 11% |
| pale_ale | 33 | 70.4 | 58.3 | 76% |
| american_imperial_stout | 29 | 52.9 | 66.8 | 100% |
| brown_ale | 27 | 33.2 | 70.4 | 59% |
| **belgian_dubbel** | **26** | **64.0** | **1.6** | **4%** |
| double_ipa | 20 | 63.8 | 79.1 | 95% |
| belgian_tripel | 18 | 75.4 | 3.5 | 0% |
| porter | 18 | 24.2 | 62.7 | 39% |
| american_wild_ale | 18 | 68.2 | 5.3 | 56% |
| german_altbier | 17 | 39.1 | 6.2 | 41% |
| juicy_or_hazy_india_pale_ale | 16 | 49.7 | 61.4 | 88% |
| german_koelsch | 16 | 85.6 | 5.1 | 13% |
| flanders_red_ale | 16 | 29.7 | 3.3 | 6% |
| belgian_blonde_ale | 16 | 77.6 | 4.1 | 13% |
| belgian_fruit_lambic | 16 | 63.2 | 0.0 | 0% |
| belgian_strong_dark_ale | 15 | 74.2 | 0.0 | 0% |
| belgian_witbier | 15 | 42.7 | 19.3 | 40% |
| munich_helles | 14 | 86.8 | 6.6 | 21% |

**Net iki cluster:**
- **Pilsner-base cluster (Belgian / German / Saison):** pp~64-87, pb~0-6, both% ≤32. Dataset bu reçetelerde "Pilsner malt" kullanıyor — pct_pilsner regex match, pct_base regex match etmiyor.
- **Pale-base cluster (American / English):** pp~33-70, pb~58-79, both% 76-100. Dataset bu reçetelerde "Pale Ale malt" kullanıyor — pale regex hem pilsner hem base'e düşüyor.

UI Dubbel'in pct_base=69 değeri onu **Pilsner-base cluster'ından (Belgian Trappist) Pale-base cluster'ına (American/English) sürüklüyor** — temel sorun.

---

## 2. Belgian aile detayı

### belgian_dubbel (n=26)
| Feature | Ort |
|---|---:|
| pct_pilsner | 63.98 |
| **pct_base** | **1.60** |
| pct_munich | 16.86 |
| pct_crystal | 4.11 |
| pct_aromatic_abbey | 1.59 |
| pct_sugar | 10.93 |
| total_dark | 2.65 |
| yeast_belgian | 0.000 |
| yeast_abbey | 1.000 |
| og | 1.067 |
| srm | 17.69 |
| abv | 7.16 |

### belgian_tripel (n=18)
| Feature | Ort |
|---|---:|
| pct_pilsner | 75.43 |
| pct_base | 3.47 |
| pct_munich | 0.00 |
| pct_sugar | 11.23 |
| yeast_abbey | 1.000 |
| og | 1.078 |
| srm | 5.52 |
| abv | 8.96 |

### belgian_quadrupel (n=9)
| Feature | Ort |
|---|---:|
| pct_pilsner | 73.21 |
| **pct_base** | **0.00** |
| pct_munich | 10.56 |
| yeast_abbey | 1.000 |

### belgian_strong_dark_ale (n=15)
| Feature | Ort |
|---|---:|
| pct_pilsner | 74.19 |
| **pct_base** | **0.00** |
| pct_munich | 11.00 |
| yeast_abbey | 1.000 |

### belgian_session_ale (n=5) — **non-Trappist**
| Feature | Ort |
|---|---:|
| pct_pilsner | 83.00 |
| pct_base | 0.00 |
| yeast_belgian | 0.800 |
| yeast_abbey | 0.000 |

### french_belgian_saison (n=41)
| Feature | Ort |
|---|---:|
| pct_pilsner | 76.69 |
| pct_base | 5.99 |
| yeast_belgian | 0.341 |
| yeast_abbey | 0.000 |

### belgian_blonde_ale (n=16)
| Feature | Ort |
|---|---:|
| pct_pilsner | 77.64 |
| pct_base | 4.13 |
| yeast_abbey | 0.000 |

### Belgian Dubbel — 5 örnek reçete dump

(Dataset records'ta raw malt listesi tutulmuyor — sadece computed features. Aşağıdaki dump pct_*'lardan tersine mühendislik yapılmış.)

    #1 v1_068 — Belgian Dubbel BYO (BYO Magazine)
        pp=54.6 pb=0   pm=21.3 pcry=1.8 sugar=14.2  → SUM=91.9
        Yorum: %54.6 Pilsner + %21.3 Munich + %1.8 Crystal + %14.2 sugar. Klasik pilsner-base.
    
    #2 v1_091 — Corsendonk Monk's Brown clone (BYO)
        pp=0 pb=40.5 pm=0 pcry=47 sugar=0  → SUM=87.5
        Yorum: AYKIRI — pale base + ÇOK YÜKSEK crystal (47%!). Muhtemelen all-Caramunich tarzı atipik clone.
    
    #3 b2_103 — Leffe Brune
        pp=75 pb=0 pm=13 pcry=0 sugar=8  → SUM=96.0
        Yorum: Saf Pilsner-base, Munich + sugar. Trappist-tipik.
    
    #4 b2_107 — St. Bernardus Pater 6
        pp=78 pb=0 pm=9 pcry=0 sugar=9  → SUM=96.0
        Yorum: Aynı tip — Pilsner + Munich + sugar.
    
    #5 b2_247 — New Belgium Abbey
        pp=72 pb=0 pm=12 pcry=0 sugar=10  → SUM=94.0
        Yorum: Aynı pattern.

**26 Dubbel'in 24'ü (%92) pct_base=0**. Tek 2 outlier (v1_091, b2_765) atipik clone'lar. Cluster centroid'i AÇIKÇA pct_base=0 etrafında.

---

## 3. Scotch Ale & Strong Ale incelemesi — UI'nın yanlış cluster'ı

### scotch_ale_or_wee_heavy (n=8)
| Feature | Ort |
|---|---:|
| pct_pilsner | 60.44 |
| **pct_base** | **85.88** |
| pct_munich | 2.00 |
| pct_crystal | 6.25 |
| yeast_belgian | 0.00 |
| yeast_abbey | 0.00 |
| yeast_english | 1.00 |
| yeast_american | 1.00 |
| og | 1.08 |
| srm | 21.13 |
| abv | 8.30 |

### winter_seasonal_beer (n=7) — UI'da Dubbel'in top-1
| Feature | Ort |
|---|---:|
| pct_pilsner | 58.69 |
| **pct_base** | **64.43** |
| pct_munich | 13.29 |
| pct_crystal | 8.29 |
| og | 1.07 |
| srm | 23.86 |
| abv | 6.83 |
| yeast_abbey | 0.00 |

### old_ale (n=4)
| Feature | Ort |
|---|---:|
| pct_pilsner | 64.60 |
| pct_base | 80.75 |
| og | 1.08 |
| srm | 20.75 |

### american_barleywine (n=13)
| Feature | Ort |
|---|---:|
| pct_pilsner | 66.17 |
| pct_base | 82.39 |
| pct_crystal | 9.01 |
| og | 1.11 |
| srm | 22.38 |

**Bu 4 cluster'ın hepsi pct_base ≈ 64-86 zenginliği.** UI Dubbel'in pct_base=69 ile bu cluster'lara çekilmesi şaşırtıcı değil — pct_base mass'ı baskın faktör.

### UI Dubbel vector — TOP-10 nearest dataset records (Manhattan, 18 key)

| rank | dist | slug | id — name |
|---:|---:|---|---|
| 1 | 43.5 | specialty_beer | b2_286 — Rogue Voodoo Doughnut Bacon Maple Ale |
| 2 | 48.1 | pumpkin_squash_beer | v1_138 — Wolaver Pumpkin Ale |
| 3 | 50.7 | winter_seasonal_beer | b2_782 — Alaskan Winter Ale |
| 4 | 50.9 | pumpkin_spice_beer | b2_206 — Shipyard Pumpkinhead |
| 5 | 51.5 | pumpkin_spice_beer | b2_141 — Dogfish Head Punkin Ale |
| 6 | 54.2 | chocolate_or_cocoa_beer | b2_417 — Boulevard Chocolate Ale |
| 7 | 59.3 | pumpkin_spice_beer | b2_063 — Avery Rumpkin |
| 8 | 61.5 | smoked_beer | b2_347 — Rogue Smoke Ale |
| 9 | 62.5 | fruit_wheat_beer | b2_191 — Sam Adams Cherry Wheat |
| 10 | 62.8 | mild | b2_619 — Moorhouse Black Cat |

**Hiçbir Belgian Dubbel TOP-10'da YOK!** Tüm komşular Pumpkin/Winter/Specialty/Chocolate/Smoked — pct_base=70 ortak özellikleri.

**En yakın Belgian Dubbel: rank 251, distance 109.4** (`v1_068` — Belgian Dubbel BYO, pp=54.6, pb=0).

UI Dubbel ile gerçek Dubbel arasındaki distance ne kadar büyük: **109.4**. Top-1 (Rogue Voodoo Doughnut, distance 43.5) ile arada **2.5x fark**. Bu mass farkı KNN'i tamamen yanlış cluster'a yönlendiriyor.

---

## 4. pct_base = 1.6 — ne demek?

**Cevap (B):** Dataset Dubbel'lerinde pale_ale değil pilsner kullanılıyor, pct_base hep 0. Dataset'in regex'i UI ile aynı (sonuç §1'de doğrulandı: regex davranışı tutarlı), AMA Trappist reçeteler tarihi olarak Pilsner malt kullandığı için pct_base hiç tetiklenmiyor.

**Kanıt:** §2'deki 5 Dubbel dump'ında 4'ü pp>54, pb=0; tek istisna (v1_091) atipik all-Crystal clone.

**pct_base > 50 stil dağılımı (496/1100 reçete):**

| Stil | Sayı |
|---|---:|
| american_india_pale_ale | 54 |
| american_imperial_stout | 29 |
| brown_ale | 27 |
| pale_ale | 23 |
| double_ipa | 19 |
| porter | 17 |
| juicy_or_hazy_india_pale_ale | 15 |
| sweet_stout | 13 |
| american_barleywine | 13 |
| oatmeal_stout | 12 |
| mild | 11 |
| stout | 11 |
| american_amber_red_ale | 10 |
| black_ipa | 10 |
| session_india_pale_ale | 10 |

**Belgian/Trappist stilleri YOK** bu listede. pct_base>50 = "pale_ale tabanlı reçete" sinyali; American/English ailesinin sınıflandırılması için kritik özellik.

---

## 5. pct_pilsner ve pct_base toplam dağılımı

| Persentil | pct_pilsner | pct_base | pp+pb sum | tüm 15 pct sum |
|---|---:|---:|---:|---:|
| p25 | 49.6 | 0.0 | 65.0 | 100.0 |
| p50 | 62.0 | 9.0 | 86.4 | **102.4** |
| p75 | 72.0 | 74.0 | 129.6 | 156.0 |
| p90 | 83.2 | 85.0 | 151.9 | 167.2 |
| p95 | 90.0 | 88.0 | 158.4 | 170.4 |
| p99 | 100.0 | 96.7 | 174.1 | 178.2 |

**Validasyon:** Adım 18'in "Sum > 100.5: 597/1100" sayısı **doğrulandı**. (Yeni hesap 597/1100 — birebir uyuşuyor.)

**Ek:** pp+pb >100 = 433/1100. pp+pb >130 = 262/1100. Yani dataset'in dörtte biri pale_ale kullanan reçete (her iki regex tetikli, +130 sum normal).

---

## 6. Karar — fix yöntemi değerlendirme

### Hipotetik fix simülasyonu — sadece pct_base=0

UI Dubbel vector'ünden pct_base=69'u sıfırlasak (diğer her şey sabit), Manhattan distance ile dataset top-10 nasıl değişir?

**Sonuç (kanıt):**
- En yakın 10 komşunun **rank 7'sinde Belgian Dubbel** (v1_068, distance 40.4)
- En yakın Dubbel rank: **251 → 7** (35× iyileşme)
- En yakın Dubbel distance: 109.4 → 40.4 (60% azalma)

KNN tahmini için bu DRAMATIC iyileşme — top-K=5 ise muhtemelen Belgian Dubbel artık top-3'e girer (mexican_amber_lager 4 kez tepede ama Dubbel 7'de — k=5 için olasılıkla cluster vote'u Dubbel'i de yakalar).

### Üç seçenek değerlendirmesi

#### Seçenek (a) — UI builder pct_base regex'inden `pale` çıkar

**Lokasyon:** V2c builder satır 13291: `baseMaltPct: _pctOf(/pilsner|pils|pale|maris|munich|vienna|best_heidel|golden|wheat/i)`.

**Değişiklik:** `pale` token'ı çıkarılır → pale_ale içeren her reçete pct_base=0 alır.

**Etki:**
- ✅ UI Dubbel pct_base 69→0 (Dubbel cluster'ına yaklaşır).
- ❌ UI'da American IPA / English Pale Ale gibi pale-base reçeteler için pct_base tüm değerini kaybeder. Dataset American IPA pct_base ortalaması 76.5 — UI'da 0. Bu reçeteler de yanlış cluster'a kayar (örn. pilsner-only cluster'a — Saison/Helles/Pilsner).
- **Özet: Belgian'ı kurtarır, American'ı bozar. Net trade-off.**

#### Seçenek (b) — V6 builder'da `f.pct_base = 0` daima

**Lokasyon:** V6 builder satır 13354: `f.pct_base = p.baseMaltPct||0;` → `f.pct_base = 0;`.

**Etki:** Aynı (a) — universal sıfırlama, American style sınıflandırma bozulur.

#### Seçenek (c) — Conditional: yeast_abbey=1 ise pct_base=0 (önerilen)

**Lokasyon:** V6 builder satır 13354 sonrası, yeast_abbey hesabından sonra:

    var _isAbbey = _v6_isAbbeyYeast(mid);  // zaten Faz 1'de tanımlandı
    f.pct_base = _isAbbey ? 0 : (p.baseMaltPct||0);
    // Veya daha agresif: pct_base'i pct_pilsner'a transfer et
    if (_isAbbey && (p.baseMaltPct||0) > 0) {
      f.pct_pilsner = (p.pilsnerPct||0) + (p.baseMaltPct||0);
      f.pct_base = 0;
    }

**Etki:**
- ✅ UI Dubbel (yeast_abbey=1) → pct_base 69→0, pct_pilsner ya 52'de kalır ya 121'e çıkar (transfer mode).
- ✅ American IPA (yeast_abbey=0) → pct_base dokunulmaz, dataset uyumu korunur.
- ✅ Tüm 26 Belgian Dubbel'in 24'ü pct_base=0; conditional fix bu pattern ile birebir hizalanır.
- ⚠️ Belgian Tripel (pct_base=3.5 ort, n=18) → tüm yeast_abbey=1 olanlar pct_base=0 alır. Tripel ortalaması 3.5'tan 0'a iner — küçük drift, k=5 KNN için önemsiz.
- ⚠️ Belgian Strong Dark Ale (pct_base=0 zaten) → değişmez.
- ⚠️ Belgian Quadrupel (pct_base=0 zaten) → değişmez.
- **Saison cluster (yeast_abbey=0) etkilenmez** — french_belgian_saison pct_base=6 ort ile canlılığını korur.

**Risk:** Trappist cluster'da 2 outlier (`v1_091` Corsendonk pp=0 pb=40.5; `b2_765` Lost Abbey pp=72.8 pb=1) UI'dan farklı. Conditional fix UI tarafında "Trappist mayası → pct_base=0" varsayımı yapıyor; outlier reçete patternleri için sapma var ama cluster centroid'inde 24/26 reçete pct_base=0 olduğu için KNN yine Dubbel cluster'ını yakalar.

### Yaklaşık etki hesabı (Manhattan distance)

UI Dubbel'den nearest Dubbel'e olan 109.4 birim distance'ın breakdown'u (en büyük katkıcılar):
- `pct_base` : |69 − 0| = **69** (en büyük tek katkı)
- `srm`: |24 − 17.69| = 6.31
- `pct_pilsner`: |52 − 64| = 12
- `pct_munich`: |17 − 16.86| = 0.14
- ibu, abv, og, vs.: 5-10 birim toplam

**Seçenek (c) uygulandığında pct_base katkısı 69 → 0**. Distance 109.4 → ~40 (kanıt: §3 simülasyonu 40.4 verdi). **35× rank iyileşmesi (251 → 7)**.

Eğer ayrıca pct_base'i pct_pilsner'a transfer edilirse (pct_pilsner 52 → 121):
- |121 − 64| = 57 → yeni distance ~88, daha kötü.
- **Tavsiye: SADECE pct_base=0, pct_pilsner'a transfer ETME.** Çünkü dataset Dubbel pct_pilsner ortalaması 64 — UI'da 52 zaten yakın.

---

## SONUÇ

**Önerilen fix: Seçenek (c)** — V6 builder'da conditional `pct_base = 0` (yeast_abbey=1 olduğunda).

**Beklenen etki (sadece pct_base fix, diğer Faz 1 fix'leri zaten uygulanmış):**
- En yakın Dubbel rank: 251 → 7 (35× iyileşme).
- Distance: 109.4 → 40.4.
- KNN k=5 weighted vote'da Belgian Dubbel cluster'ı top-3'e girme olasılığı **çok yüksek**.
- American IPA/English Pale Ale sınıflandırması **bozulmaz** (yeast_abbey=0 olduğu için pct_base dokunulmaz).
- Belgian Tripel/Quadrupel/BSDA sınıflandırması korunur (zaten pct_base ≈ 0, küçük drift).

**Saison için ek fix (opsiyonel, aynı stratejiyle):** yeast_belgian=1 (=non-Trappist Belgian) için pct_base'i kısmen düşür — ama Saison ortalaması 5.99 (yarıdan fazlası 0), conditional gerekmeyebilir. Faz 3'e ertele.

**Önerilen kod parça (B aşamasında uygulanacak — bu adımda DEĞİL):**

    // V6 builder satır 13354 (mevcut: f.pct_base = p.baseMaltPct||0;)
    // değişecek:
    var _isAbbey = _v6_isAbbeyYeast(mid);
    f.pct_pilsner = p.pilsnerPct||0;
    f.pct_base = _isAbbey ? 0 : (p.baseMaltPct||0);

Ek not: `_v6_isAbbeyYeast(mid)` Faz 1 fix'inde zaten tanımlandı. Bu fix sadece bir koşullu satır değişikliği — minimum kod, maksimum etki.

**Risk seviyesi:** Düşük. yeast_abbey=1 olan 68 dataset reçetesinin %96'sı (65/68) zaten pct_base=0 — UI'daki conditional sıfırlama dataset davranışıyla hizalı.
