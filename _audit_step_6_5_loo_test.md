# Adım 6.5 — V6 leave-one-out test (CHECKPOINT devamı)

## Komutlar

```
node _loo_test_v6.js
```

Script: 5 test reçetesi için training set 1100 → 1099 (id eşleşen reçete çıkarıldı), `predictV6Enhanced(testRecipe, trainingRecs, 5)` çağrıldı.

## Ham çıktı

```
═══ V6 LEAVE-ONE-OUT TEST (5 reçete) ═══

--- Test 1: Dark Belgian Dubbel v1 (id=dubbel_boost_009) ---
Beklenen: belgian_dubbel (belgian)
Training set boyutu: 1099 (1 çıkarıldı)
Top-1: belgian_dubbel ✓
Top-3:
  1. belgian_dubbel %100.0 ✓
En yakın 5 komşu:
  1. High Gravity Dubbel → belgian_dubbel (dist=0.160)
  2. Rochefort 6 Clone → belgian_dubbel (dist=0.186)
  3. Dark Sugar Dubbel → belgian_dubbel (dist=0.238)
  4. Specialty Grain Dubbel → belgian_dubbel (dist=0.252)
  5. Classic Belgian Dubbel → belgian_dubbel (dist=0.290)
Süre: 7ms

--- Test 2: Hill Farmstead Anna (id=b2_764) ---
Top-1: french_belgian_saison ✓
Top-3: 1. french_belgian_saison %100.0 ✓
En yakın 5 komşu: hepsi french_belgian_saison (Allagash, Prairie Standard, Voss Kveik, Hill Farmstead Arthur, Goose Island Sofie)
Süre: 7ms

--- Test 3: Dogfish Head Punkin Ale (id=b2_141) ---
Top-1: american_amber_red_ale ❌
Top-3:
  1. american_amber_red_ale %36.0
  2. pumpkin_spice_beer %27.2 ✓
  3. winter_seasonal_beer %20.3
En yakın 5 komşu:
  1. Southern Tier Pumking → pumpkin_spice_beer (dist=0.387)
  2. Alaskan Winter Ale → winter_seasonal_beer (dist=0.521)
  3. Bell's Amber → american_amber_red_ale (dist=0.590)
  4. Bell's Amber Ale → american_amber_red_ale (dist=0.590)
  5. Redhook ESB → extra_special_bitter (dist=0.645)
Süre: 5ms

--- Test 4: Left Hand Milk Stout (id=b2_135) ---
Top-1: sweet_stout ✓
Top-3: 1. sweet_stout %100.0 ✓
En yakın 5 komşu: hepsi sweet_stout (Left Hand Nitro Milk Stout, Terrapin Moo-Hoo, Young's Double Chocolate, Harviestoun Old Engine Oil, Mackeson XXX)
Süre: 6ms

--- Test 5: Tröegs Hopback Amber (id=b2_531) ---
Top-1: american_amber_red_ale ✓
Top-3:
  1. american_amber_red_ale %55.6 ✓
  2. common_beer %44.4
En yakın 5 komşu:
  1. Speakeasy Big Daddy → common_beer (dist=0.409)
  2. BrewDog 5AM Saint → american_amber_red_ale (dist=0.516)
  3. Anchor Steam → common_beer (dist=0.562)
  4. Ballast Point Calico → american_amber_red_ale (dist=0.600)
  5. Anderson Valley Boont Amber → american_amber_red_ale (dist=0.603)
Süre: 4ms

═══ ÖZET ═══
Top-1: 4/5
Top-3: 5/5
```

## Sonuç tablosu

| # | Reçete | Beklenen | LOO Top-1 | ✓ | Smoke (leakage) | LOO Top-3 |
|---|---|---|---|---|---|---|
| 1 | **Dark Belgian Dubbel v1** | belgian_dubbel | **belgian_dubbel %100** | ✓ | %100 | ✓ |
| 2 | Hill Farmstead Anna | french_belgian_saison | french_belgian_saison %100 | ✓ | %100 | ✓ |
| 3 | Dogfish Head Punkin Ale | pumpkin_spice_beer | american_amber_red_ale %36 | ❌ | %71 | ✓ (top-2 %27.2) |
| 4 | Left Hand Milk Stout | sweet_stout | sweet_stout %100 | ✓ | %100 | ✓ |
| 5 | Tröegs Hopback Amber | american_amber_red_ale | american_amber_red_ale %55.6 | ✓ | %77 | ✓ |

## Kritik bulgu — Belgian discrimination

**Dark Belgian Dubbel v1** için leave-one-out (1099 reçete üzerinde):
- Top-1: belgian_dubbel %100
- En yakın 5 komşunun **hepsi belgian_dubbel** (mesafe 0.160-0.290 arası, çok düşük)
- V5'in iddia edilen "belgian_witbier" yanlışı V6'da **YOK**
- V6'nın Belgian iyileşmesi training leakage'tan değil, gerçek gelişme

## Dogfish Head Punkin Ale yanlışı (Test 3)

Top-1 yanlış (american_amber_red_ale), beklenen pumpkin_spice_beer top-2 oldu (%27.2). Komşu analizi:
- En yakın komşu **doğru** (Southern Tier Pumking → pumpkin_spice_beer, dist=0.387)
- Sonraki 4 komşu (Alaskan Winter, Bell's Amber x2, Redhook ESB) farklı kategorilerden
- KNN k=5 voting'te 1 doğru komşu vs 4 yanlış → top-1 kaybediyor
- Specialty (pumpkin_spice_beer) kategorisi sadece az sayıda training örneği olduğu için ayırt edici özellikler zayıf — bu V6'nın da çözemediği yapısal sorun.

## Süre

LOO testleri 4-7 ms / reçete (1099 reçete), smoke testlerden hızlı (motor inline'da olmadığı için JSON.parse maliyeti yok).

## Durum: ⚠️ KISMEN — Top-1 4/5, Top-3 5/5

Belgian discrimination kanıtlandı, ama specialty/pumpkin tek örnek üzerinde top-1 hatası var. Top-3 hâlâ 5/5.

## Tek satır yorum

Leave-one-out 5 reçete: top-1 4/5, top-3 5/5; Dark Belgian Dubbel v1 leakage-free olarak hâlâ belgian_dubbel %100 — V5'in "witbier" iddiası V6'da düzeldi, gerçek gelişme; Punkin Ale top-1 yanlış (top-2 doğru), specialty kategorisinin yapısal limit sorunu.

---

=== KAAN ONAYI BEKLENİYOR (DEVAMI) ===

5 reçete leave-one-out top-1:
1. Dark Belgian Dubbel: **belgian_dubbel ✓**  (V5: belgian_witbier ❌)
2. Hill Farmstead Anna: **french_belgian_saison ✓**
3. Dogfish Head Punkin: **american_amber_red_ale ❌**  (beklenen pumpkin_spice_beer, top-2 %27.2)
4. Left Hand Milk Stout: **sweet_stout ✓**
5. Tröegs Hopback Amber: **american_amber_red_ale ✓**

Top-1 4/5, Top-3 5/5. Adım 7'ye geçmek için Kaan onayı gerekli. DURUYORUM.
