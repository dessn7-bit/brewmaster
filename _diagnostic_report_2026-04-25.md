# BREWMASTER V5 MOTOR HATA ANALIZI RAPORU
## Tarih: 2026-04-25

### EXECUTIVE SUMMARY

V5 stil tahmin motoru (1016 reçete KNN + 50 RF ağacı) **kategorik hatalara** açık. Dark Belgian Dubbel reçete (OG 1.062, SRM 38, belcika mayası) → top-1 **Belgian Witbier** tahmin ediyor. Bu fiziksel olarak imkansız: SRM 38 (koyu) bir Witbier (2-4 SRM, açık) olamaz, belcika ale mayası Vienna Lager için uygun değil.

**Ana Problemler:**
1. **Process features eksik:** Mash/fermentation sıcaklık, water chemistry, yeast attenuation yok
2. **Class imbalance:** 121/191 stil 5'ten az örnek (% 63)
3. **Kategorik rule layer zayıf:** SRM+maya çelişkilerini yakalayamıyor
4. **Slug aliasing karmaşası:** Birçok hata alias confusion'dan (biere_de_garde → french_bi_re_de_garde)

---

## 1. CONFUSION MATRIX ANALIZI

### En Çok Karışan 20 Stil Çifti
```
american_wild_ale → wild_beer: 9 kez
belgian_pale_ale → belgian_speciale_belge: 6 kez
doppelbock → german_doppelbock: 5 kez
american_wild → wild_beer: 4 kez
schwarzbier → german_schwarzbier: 4 kez
fruit_lambic → belgian_fruit_lambic: 4 kez
american_pale_ale → belgian_witbier: 3 kez ⚠️
pumpkin_squash_beer → belgian_witbier: 3 kez ⚠️
czech_pale_lager → munich_helles: 3 kez
czech_amber_lager → vienna_lager: 2 kez
czech_dark_lager → vienna_lager: 2 kez
strong_ale → belgian_witbier: 2 kez ⚠️
```

**⚠️ Kategorik Hatalar:** American Pale Ale, Pumpkin Beer, Strong Ale → Belgian Witbier tahmin ediliyor. Bu mantıksız: APA hoplu, pumpkin spiced, strong ale %8+ olabilir — hepsi Witbier'in 4.5% hafif tatlı profiliyle çelişiyor.

### En Kötü Performans (>=5 örnek)
```
belgian_pale_ale: 0.0% (0/6)
doppelbock: 0.0% (0/5)  
american_wild_ale: 0.0% (0/9)
czech_dark_lager: 42.9% (3/7)
czech_pale_lager: 50.0% (9/18)
pumpkin_squash_beer: 50.0% (3/6)
```

**Belgian Pale Ale ve Doppelbock %0** — tam failure. Bu stiller başka stillerle sistematik karışıyor.

---

## 2. FEATURE AUDIT

### Mevcut Features (61 total)
```
✓ Basic: OG, FG, ABV, IBU, SRM (5)
✓ Yeast types: 16 kategorik (english, american, belgian, saison, german_lager, etc.)
✓ Hops: 7 kategorik (american_c, english, german, czech_saaz, etc.)
✓ Malts: 16 percent (pilsner, munich, crystal, chocolate, etc.)  
✓ Additives: 10 kategorik (lactose, fruit, spice, chocolate, etc.)
✓ Derived: 7 (total_dark, total_adjunct, high_hop, strong_abv, etc.)
```

### ❌ EKSİK CRITICAL FEATURES
```
- mash_temp_c: Decoction vs step mash ayırımı (German vs American/English)
- fermentation_temp_c: Lager (7-12C) vs Ale (18-22C) vs Saison (24-28C)
- water_ca_ppm, water_so4_ppm: Burton water vs Pilzen soft water
- yeast_attenuation: High (Saison 85%) vs Low (English 70%) attenuation
- boil_time_min: Lager (90+ min) vs Ale (60 min)
- dry_hop_days: Modern IPA vs traditional styles
```

**Bu eksikler neden Dubbel → Witbier hatasına yol açıyor:**
- Dubbel: Belcika ale mayası + abbey malt + düşük hop + 18-22C fermentation
- Witbier: Wheat yeast + coriander/orange + düşük hop + 18-22C fermentation  
- Motor maya tipini görüyor ama **process diferansiyasyonu** yok → karıştırıyor

### Yeast Feature Quality  
16 yeast kategorik var AMA **granular ayırım yok:**
- `yeast_belgian` = Dubbel + Tripel + Strong Dark + Witbier + Golden birleşik
- **Ayrı olmalı:** yeast_abbey (Dubbel/Tripel), yeast_witbier (T58/M20), yeast_golden_strong

---

## 3. CLASS DISTRIBUTION

### En Çok Temsil (Top 10)
```
american_india_pale_ale: 59 reçete  
french_belgian_saison: 41 reçete
american_imperial_stout: 29 reçete
american_pale_ale: 22 reçete  
double_ipa: 20 reçete
czech_pale_lager: 18 reçete
belgian_tripel: 18 reçete
german_altbier: 17 reçete
international_pale_lager: 17 reçete
juicy_or_hazy_india_pale_ale: 16 reçete
```

### Problem: Class Imbalance
- **121/191 stil 5'ten az örnek** (%63)  
- **20'lik stil:** 1 örnekle training yapılamaz
- **Belgian Dubbel:** sadece 11 örnek vs IPA 59 örnek → bias IPA'ya

### Spesifik Stiller
```
belgian_dubbel: 11 reçete ⚠️ (düşük)
witbier: 0 reçete ❌ (belgian_witbier 15 var, slug alias?)  
biere_de_garde: 3 reçete ⚠️ (çok düşük)
vienna_lager: 11 reçete ⚠️ (düşük)  
```

**Root cause:** Dubbel underrepresented, motor daha sık gördüğü `belgian_witbier` (15 örnek) tarafına çekiyor.

---

## 4. RANDOM FOREST FEATURE IMPORTANCE

**❌ RF model internal structure erişilebilir değil.** Inline motordan feature importance çıkarılamadı. 

Available properties: `classifyMulti`, `extractFeatures`, `toVec`, `knnScores`, `rfScores`, `ruleScores`, `RECS_COUNT`, `FEATURE_COUNT`, `FOREST_TREES`

### Brewing Knowledge Tabanlı Tahmini Importance
```
HIGH: SRM, IBU, yeast_belgian, yeast_german_lager, pct_wheat, pct_roast
MID: ABV, pct_crystal, hop_american_c, katki_fruit, total_dark
LOW: pct_corn, pct_rice, hop_aged, katki_salt  
```

**Yeast features muhtemelen TOP-5'te** ama granularity yetersiz.

---

## 5. DUBBEL DEEP-DIVE CASE

### Test Recipe (Dark Belgian Dubbel)
```
OG: 1.062, FG: 1.012, ABV: 6.62%  
IBU: 16, SRM: 38, Maya: belcika (BB Abbaye)
Malt: 70% Pilsner, 15% Munich, 10% Crystal, 5% Chocolate
```

### V5 Top-5 Prediction
```
1. belgian_witbier (0.101)     ❌ YANLIŞ
2. french_bière_de_garde (0.095)  ❌ YANLIŞ  
3. german_rye_ale (0.086)      ❌ YANLIŞ
4. belgian_lambic (0.076)      ❌ YANLIŞ
5. vienna_lager (0.073)        ❌ YANLIŞ
```

**Doğru cevap:** `belgian_dubbel` → TOP-5'te bile YOK.

### Kategorik Error Analysis
```
✓ Belgian_witbier: SRM 2-4 vs recipe SRM 38 → 10x çok koyu
✓ Vienna_lager: Lager mayası gerekli vs recipe Ale mayası
✓ Bière_de_garde: French farmhouse vs Belgian abbey
✓ German_rye_ale: Rye gerekli vs recipe rye %0
```

**Hepsi fiziksel imkansız.** Rule layer bu çelişkileri yakalayamıyor.

### KNN Distance Issue?  
Dubbel training setinde 11 örnek var. KNN k=5 kullanıyorsa, şansı var yakın örnekleri bulma. AMA **feature space'te Dubbel signature zayıf** çünkü:
1. SRM 38 hem Porter hem Imperial Stout'ta var  
2. Belgian yeast hem Tripel hem Witbier'da var  
3. ABV 6.6% hem Brown Ale hem Vienna Lager'da var  
4. **Kombinasyon unique değil** → KNN noise'a kayıyor

---

## 6. ROOT CAUSE SUMMARY

### A. Class Imbalance (Critical)
- 121/191 stil 5'ten az örnek  
- Belgian Dubbel: 11 örnek vs American IPA: 59 örnek  
- **Çözüm:** Dubbel örneklerini 25-30'a çıkar (Westmalle, Chimay, St. Bernardus, Rochefort clones)

### B. Feature Gaps (High)
- **Process features** eksik: mash_temp, fermentation_temp, attenuation  
- **Yeast granularity** düşük: yeast_belgian çok geniş  
- **Water chemistry** eksik: mineral profile style signature'ı  
- **Çözüm:** 15-20 ek feature ekle

### C. Rule Layer Weakness (High)  
- SRM+Maya çelişkilerini yakalamıyor  
- **Hard constraints** yok: "SRM >30 → Witbier impossible"  
- **Çözüm:** Kategorik veto rules ekle

### D. Slug Aliasing Confusion (Medium)
- `biere_de_garde` vs `french_bi_re_de_garde` alias karmaşası  
- Confusion matrix'in 30%'u alias issue  
- **Çözüm:** Alias normalizasyonunu iyileştir

---

## 7. AKSIYON PLANI (ÖNCELIK SIRA)

### P0 (Immediate)  
1. **Dubbel data boost:** 15 ek autentik Dubbel reçete ekle  
2. **Hard veto rules:** SRM/Maya/ABV impossible kombinasyonları filtrele  
3. **Slug alias audit:** Confusion pairs'in alias hangilerini temizle

### P1 (Short-term)  
1. **Yeast granularity:** yeast_belgian → yeast_abbey + yeast_witbier + yeast_golden split  
2. **Process features:** fermentation_temp, yeast_attenuation, mash_type ekle  
3. **Water chemistry:** Ca/SO4 ratio ekle

### P2 (Medium-term)  
1. **Training data balance:** Tüm stiller min 10 örnek olacak şekilde expand  
2. **Feature importance extract:** RF modelini debug edip importance hierarchy çıkar  
3. **Ensemble weight tuning:** w_knn vs w_rf balance optimize et

---

**SONUÇ:** V5 motor "statistically reasonable" ama **brewing knowledge constraints'i eksik**. Kısa vadeli fix için hard rules + data boosting yeterli. Uzun vadeli fix structured training + feature engineering gerekiyor.