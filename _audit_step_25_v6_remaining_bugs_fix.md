# AUDIT STEP 25 — V6 KALAN BUG'LARI FIX (OTONOM)

**Tarih:** 2026-04-26
**Mod:** Otonom (Kaan'a soru sorulmadı; tüm kararlar belge altında)
**Önceki adımlar:** 20 (Faz 1: yeast/abbey + mash_type_step + hop/katki port), 22 (Faz 2: pct_base trappist conditional), 23 (Faz 3: pct_crystal regex genişletme).

---

## Düzeltilen bug'lar

### Bug 1: pct_crystal regex — **FIX YOK GEREKMİYOR (Adım 23 zaten çözmüş)**

**Test:** Mevcut regex `/crystal|caramel|cara[_-]?|kristal|caravienna|caramunich|carahell|caraamber|caraaroma|c\d+/i` (V2c builder satır 13283).

| Input | Match? | Beklenen |
|---|---|---|
| c40 | ✅ true | true (Crystal 40) |
| c80 | ✅ true | true |
| c120 | ✅ true | true |
| c150 | ✅ true | true |
| c60 | ✅ true | true |
| c200 | ✅ true | true |
| crystal | ✅ true | true |
| caramel_60 | ✅ true | true |
| caramunich_iii | ✅ true | true |
| caravienna | ✅ true | true |

**Yan etki (false positive) testi — hop/sugar/biscuit IDs:**

| Input | Match? | Beklenen |
|---|---|---|
| cascade | ❌ false | false |
| citra | ❌ false | false |
| corn | ❌ false | false |
| candy_drk | ❌ false | false |
| chateau_biscuit | ❌ false | false |
| centn | ❌ false | false |
| chinook | ❌ false | false |
| cluster | ❌ false | false |

**Sonuç:** Adım 23 fix'i tüm Dubbel Crystal maltlarını yakalıyor (c40, c120 — Dubbel'in iki Crystal kullanımı), false positive yok. **Bu adımda ek değişiklik yapılmadı.**

Adım 24 baseline'da Dubbel'in hâlâ yanlış cluster'a düşmesi pct_crystal değil, başka bug'lardan (Bug 2-6) kaynaklanıyor olmalı.

---

### Bug 2: pct_smoked V2c builder'a eklendi

**Eski (V2c builder percents objesi):** `smokedPct` alanı YOK → V6 builder `p.smokedPct||0` → daima 0.

**Yeni (V2c builder, satır 13291 sonrası):**

    smokedPct:   _pctOf(/smoke|rauch|isli|smoked/i),

**Test sonuçları:**

| Input | Match? |
|---|---|
| rauchmalt | ✅ true |
| smoked_malt | ✅ true |
| isli_malt | ✅ true |
| beechwood_smoked | ✅ true |
| cherrywood | ❌ false (cherry'wood' ≠ smoke) |
| pilsner | ❌ false |
| wheat | ❌ false |

**Etki:** Rauchbier, Smoked Porter, Grodziskie reçeteleri artık doğru pct_smoked sinyali üretiyor. Dubbel için doğrudan etki yok (Dubbel'de smoked malt yok) ama **regression yok**.

---

### Bug 3: pct_rye V2c builder'a eklendi

**Eski:** `ryePct` alanı YOK → daima 0.

**Yeni (V2c builder, smokedPct'in altında):**

    ryePct:      _pctOf(/rye|cavdar/i),

**Test sonuçları:**

| Input | Match? |
|---|---|
| rye | ✅ true |
| rye_malt | ✅ true |
| flaked_rye | ✅ true |
| cavdar | ✅ true |
| cavdar_malt | ✅ true |
| pale_ale | ❌ false |
| barleyrye | ✅ true (kabul — `barleyrye` bileşik isim, içinde rye var, makul) |

**Etki:** Rye IPA, Rye Pale Ale, Roggenbier reçeteleri için doğru sinyal. Dubbel'de seed reçetesinde 0.17 kg rye var (toplam ~3.85 kg) → pct_rye ≈ 4.4%. Önceden 0'dı → şimdi gerçek değer. Dataset Belgian Dubbel'de pct_rye yok ama V6 motoru için yine de daha sağlam input.

---

### Bug 4: Process feature'lar — **6/7 EKLENDİ, 1 deviation**

V2c builder'a eklenen 6 alan:

| Alan | Kaynak | Not |
|---|---|---|
| `mash_temp_c` | `S.mashSc \|\| 0` | direkt S alanı |
| `fermentation_temp_c` | `MAYALAR.find(...).ideal` | **Deviation:** User önerisi `S.primTemp` idi ama primTemp = priming/conditioning sıcaklığı (fermentation değil). Doğru proxy: maya'nın `ideal` field'i (fermentation ideal temp). Try/catch + fallback 0. |
| `yeast_attenuation` | `MAYALAR.find(...).atu`'nun ortalaması | atu = `[min, max]` array, `(atu[0]+atu[1])/2` |
| `boil_time_min` | `S.kaynatmaSure \|\| 0` | direkt |
| `water_ca_ppm` | `ppm.Ca` (rEditorGenel scope'taki const) | `typeof ppm !== 'undefined'` guard'lı |
| `water_so4_ppm` | `ppm.SO4` | aynı guard |
| `water_cl_ppm` | `ppm.Cl` | aynı guard |

**Mantık:** V6 builder zaten `(r.X > 0) ? r.X : V6_DEFAULTS.X` patternine sahip. V2c builder gerçek değer set edince (örn. mash_temp_c=67), V6 builder default 66'ya düşmek yerine gerçek değeri kullanır → per-recipe sinyal restore edilir.

**Deviation gerekçesi (fermentation_temp_c):** User talimatında `S.primTemp` denilmişti ama BOS şemasında `primTemp:18` priming/şişeleme sıcaklığı için. Maya'nın ideal fermentation temp'i (`m.ideal`) gerçek fermentation sinyaline daha yakın. Bu kararı raporun "yapılamayan" yerine "deviation" olarak işaretliyorum çünkü daha iyi alternatif bulduğum durumlarda ileri gitmem istendi.

**Su feature'ları status:** Atlanmadı, eklendi. `ppm` global'i rEditorGenel scope'unda satır 9723'te `const ppm = suProfiliHesapla(...)` ile zaten hesaplı. V2c builder satır 13270 aynı scope'ta → `ppm` accessible. Defensive `typeof ppm !== 'undefined'` guard riski sıfırladı.

---

### Bug 5: dry_hop_days V2c builder'da gerçek hesap

**Eski:** `dhPer10L: 0` (hardcoded).

**Yeni:** IIFE ile S.hoplar'ı tarayıp dry hop gram toplamını hesapla, hacme bölüp 10L'ye normalize et:

    dhPer10L:  (function(){
      var _dhG = (S.hoplar||[]).filter(function(h){return h && (h.tur==='dryhop' || (h.dryDays||0)>0);}).reduce(function(s,h){return s+(h.g||0);},0);
      var _hcm = S.hacim||10;
      return (_dhG / Math.max(1, _hcm)) * 10;
    })(),

**Mantık:**
- Filter: `tur === 'dryhop'` (hop tür alanı) VEYA `dryDays > 0` (dry hop gün sayısı dolu).
- Reduce: gram toplamı.
- Normalize: `(toplam_g / hacim_L) * 10` = "g/10L".

V6 builder'da `f.dry_hop_days = (r.dhPer10L>0) ? 5 : 0;` mantığı korunuyor — sıfır değilse 5 gün dry hop, yoksa 0.

**Etki:** NEIPA, Hazy IPA, modern American IPA reçeteleri için doğru dry hop sinyali. Dubbel'de dry hop yok → 0, değişiklik yok. Dataset'te dry_hop_days `0-6` aralığı, 128/1100 reçete >0.

---

### Bug 6: Saison için yeast_belgian eklendi

**Eski (V6 builder):**

    f.yeast_belgian = (mt==='belcika' && !_v6_isAbbeyYeast(mid)) ? 1 : 0;

**Yeni:**

    f.yeast_belgian = ((mt==='belcika' || mt==='saison') && !_v6_isAbbeyYeast(mid)) ? 1 : 0;

**Mantık:**
- Dataset analizi (Adım 18): yeast_belgian=1 etiketli 56 reçeteden **14'ü french_belgian_saison**. UI builder eskiden `mt='saison'` → yeast_belgian=0 yapıyordu, mismatch.
- Saison mayaları yeast_abbey değil (Adım 20A heuristic'i sadece Trappist substring + bb_belc whitelist), `_v6_isAbbeyYeast(mid)` Saison maya için false döner. Mutual exclusion korunuyor.
- Yan etki: Saison reçeteleri artık hem `yeast_saison=1` hem `yeast_belgian=1` taşır. Dataset'te bu kombinasyon var (14 reçete), yeni bir mismatch yaratmıyor.

**Etki:** Saison reçetelerinin yeast_belgian sinyali açıldı → french_belgian_saison cluster'ına daha yakın. Dubbel için doğrudan etki yok (Dubbel mt='belcika' + yeast_abbey=1).

---

## Yapılamayan / atlanan

- **Bug 7 — Hop ID kısaltma sorunu (`centn` → `centennial` regex'e uymuyor):** Adım 18'de işaretliydi, Faz 4'e ertelendi. Bu adımda atlandı. Çözüm planı: `hopStr`'i `id + ' ' + ad` ile inşa et (HOPLAR.find lookup) → tam isim regex match ederse recall artar. Ayrı sprint.
- **Hiç bir bug yapılamadı dememe sebebi yok** — 6 bug planlananın 5'i tam, 1'i not gerektiriyor (Bug 4 fermentation_temp_c deviation).

## Deviation kayıtları

- **Bug 4 fermentation_temp_c → maya.ideal (S.primTemp değil):** User talimatı `S.primTemp` idi ama bu primTemp/şişeleme sıcaklığı, fermentation değil. Maya.ideal fermentation idealine daha yakın bir proxy. Karar otonom verildi, raporda belgelendi.

---

## Dosya değişiklikleri özeti

- **Tek dosya:** `Brewmaster_v2_79_10.html`
- **Net diff:** +32 / −2 satır
- **Toplam fix:** 5 aktif (Bug 2, 3, 4, 5, 6) + 1 doğrulama (Bug 1, mevcut Adım 23 çözümü yeterli)
- **str_replace adedi:** 2 (V2c builder büyük blok + V6 builder yeast_belgian)

---

## Kütüphanedeki 7 reçete için beklenen iyileşmeler

(Adım 19 baseline harness'ı tekrar koşturulduğunda görülecek tahminler.)

### Dark Belgian Dubbel (seed)
- Yeni feature'lar: pct_rye 4.4 (önceden 0), mash_temp_c 66 (S.mashSc=67 default ama dataset 67 ortalama), yeast_attenuation 82 (bb_abbaye atu [80,84] ortalama, dataset Dubbel 75 — 7 birim sapma), water_ca_ppm gerçek değer (Dubbel reçetesinde Cl/SO4 mineral additions mevcut), boil_time_min 60.
- Beklenen etki: Trappist cluster'ına BİRAZ daha yakınlaşma. yeast_attenuation 82 vs dataset 75 sapması küçük negatif. **Top-3'e Belgian Dubbel girme olasılığı orta-yüksek.**

### IPA / NEIPA / Hazy IPA tarzı reçeteler
- dry_hop_days artık doğru hesaplanıyor → NEIPA cluster'ına yaklaşır.
- yeast_attenuation gerçek değer (US-05 atu ortalaması ~78 = default'la aynı, küçük etki).

### Saison (varsa kütüphanede)
- yeast_belgian=1 artık (yeast_saison=1'le birlikte). french_belgian_saison cluster'ına yaklaşır.

### Rye IPA / Rye Pale Ale (varsa)
- pct_rye gerçek değer → Rye stillere yaklaşır.

### Smoked / Rauchbier (varsa)
- pct_smoked gerçek değer → Rauchbier cluster'ına yaklaşır.

### Genel
- Process feature'lar (mash_temp_c, fermentation_temp_c, yeast_attenuation, boil_time_min, water_*) artık per-recipe — discriminative güç restore edildi. Tüm reçeteler için ortalama Manhattan distance 5-15 birim azalır.

---

## Sonraki adım

**Adım 26:** Adım 19 baseline harness'ı (`_baseline_step_19_v6.js`) tekrar koşturulmalı. Adım 24'teki sonuçlarla kıyaslanır:
- Dubbel score 0.6 → ne olacak?
- Top-1 ve top-3 kompozisyonu nasıl değişti?
- Belgian Dubbel cluster'ına giren reçete sayısı (varsa) artıyor mu?

Eğer Dubbel hâlâ Belgian Dubbel olarak top-3'te değilse → Faz 4 (hop id kısaltma) + ML granülarite incelenmesi.
