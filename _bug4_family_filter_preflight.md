# Bug 4 — Same-Family Filter Pre-Flight

**Tarih:** 2026-04-28
**Status:** PRE-FLIGHT — Kaan onayı bekleniyor (kod yazılmadı)

---

## Hedef

V15 slug top-3 ribbon'da **same-family filter** uygula. Top-1'in ailesi belirlenir, top-3 listesi family içinden seçilir. Cross-family slug'lar çıkarılır (ya da küçük etiketle ayrılır).

Muzo wheat reçetesi örneği:
- Ham V15 top-3: hefeweizen %34 / specialty_saison %31 / lambic %6
- **Filtered top-3** (same-family wheat): hefeweizen / weizenbock / american_wheat (saison + lambic eleniyor)

---

## Family Taxonomy Önerisi (V15 77 slug)

### Veri kaynağı

Her V15 slug'ın training dataset'indeki dominant `bjcp_main_category` 14-cat cluster'ı çekildi. Bunu Kaan'ın istediği daha granüler family taxonomy'sine map ediyorum.

### Önerilen 11 family

| Family ID | Açıklama | V15 slug listesi |
|---|---|---|
| **wheat** | Hefe/Weiss + Wit + Wheat varyasyonları | south_german_hefeweizen, south_german_dunkel_weizen, south_german_weizenbock, american_wheat_ale, belgian_witbier |
| **belgian_ale** | Belçika ale ailesi (Witbier hariç) | belgian_blonde_ale, belgian_dubbel, belgian_tripel, belgian_quadrupel, belgian_strong_dark_ale, belgian_strong_golden |
| **saison_farmhouse** | Saison + Bière de Garde + Grisette | french_belgian_saison, specialty_saison, french_biere_de_garde |
| **sour_wild** | Sour, Lambic, Brett, Mixed-fermentation | berliner_weisse, belgian_lambic, brett_beer, oud_bruin, mixed_fermentation_sour_beer |
| **ipa** | American/British/Black/Imperial/Hazy IPA + Strong Pale | american_india_pale_ale, british_india_pale_ale, juicy_or_hazy_india_pale_ale, double_ipa, black_ipa, american_pale_ale, american_strong_pale_ale, american_barleywine |
| **lager** | Helles, Pilsner, Märzen, Bock'lar, Vienna, Schwarzbier | pale_lager, american_lager, vienna_lager, munich_helles, munich_dunkel, dortmunder_european_export, pre_prohibition_lager, dunkles_bock, german_doppelbock, german_heller_bock_maibock, german_pilsener, german_oktoberfest_festbier, german_maerzen, german_schwarzbier, kellerbier, baltic_porter |
| **stout_porter** | Stout + Porter ailesi | irish_dry_stout, american_imperial_stout, oatmeal_stout, sweet_stout, stout, porter, brown_porter, robust_porter |
| **british_ale** | Bitter, ESB, Mild, Old Ale, Wee Heavy, Scottish | mild, ordinary_bitter, special_bitter_or_best_bitter, extra_special_bitter, scotch_ale_or_wee_heavy, scottish_export, old_ale, british_barley_wine_ale, english_pale_ale, brown_ale |
| **american_amber_brown** | American Amber/Red, Brown, Cream, Hybrid Ale | american_amber_red_ale, american_brown_ale, irish_red_ale, blonde_ale |
| **hybrid_ale_lager** | Kölsch, Altbier, California Common, Cream Ale | german_altbier, german_koelsch, common_beer, cream_ale |
| **specialty** | Smoked, Fruit, Spice, Herb, Experimental | experimental_beer, fruit_beer, herb_and_spice_beer, smoked_beer, specialty_beer, winter_seasonal_beer, bamberg_maerzen_rauchbier, german_rye_ale |

**Toplam:** 11 family × 77 slug. Eksik 0, fazla 0 (Python verify aşağıda).

---

## ⚠ Kararsız Slug'lar — Kaan Karar Verecek

### K1. `belgian_witbier` → wheat mi, belgian_ale mi?

- Wheat malt baskın (≥%50 wheat genelde)
- Ama Belgian yeast (Belgian Witbier yeast) — Belçika ale familyası
- Brewmaster cluster: "Belgian Pale / Witbier" (Belçika)

**Önerim: `wheat`** — kullanıcı wheat reçetesi yaptığında Witbier alternatif öne çıksın. Hefe + Witbier doğal alternatif.

**Alternatif:** `belgian_ale` — Belçika maya odaklı kullanıcı için.

### K2. `american_pale_ale` + `american_strong_pale_ale` → ipa mı, american_amber_brown mı?

- Hop-forward (Cascade/Centennial), American IPA-light
- ABV/SRM range American Amber'a yakın değil (Pale ≠ Amber)
- Brewmaster cluster: "American Hoppy" (IPA ile aynı cluster)

**Önerim: `ipa`** — IPA geniş hop family, Pale Ale → IPA kuzeni. American IPA reçetesinde Pale Ale alternatif mantıklı.

**Alternatif:** Yeni "american_pale" family (5 slug ile çok küçük olur).

### K3. `american_barleywine` → ipa mı, british_strong mi?

- ABV 8-12, hop-forward American maltlar
- BJCP'de "American Barleywine" (10A IPA), "English Barleywine" ayrı
- Brewmaster cluster: "American Hoppy"

**Önerim: `ipa`** — American Strong Ale family.

**Alternatif:** british_strong (English Barleywine ile birleştir) — ama V15'te `british_barley_wine_ale` ayrı slug.

### K4. `baltic_porter` → lager mı, stout_porter mı?

- Lager yeast (cold fermentation)
- Ama "Porter" name'i, dark malt bill
- BJCP "Baltic Porter" 9C — historical/special cluster
- Brewmaster cluster: "German Lager"

**Önerim: `lager`** — fermentasyon biyolojisi belirleyici, kullanıcı lager mayasıyla soğuk fermente ediyor. Porter cluster içinde Baltic Porter "uyumlu" ama family routing açısından lager doğru.

**Alternatif:** stout_porter (Porter visualy + dark malt benzerliği).

### K5. `bamberg_maerzen_rauchbier` → lager mı, specialty mı?

- Bamberg Märzen lager yeast + smoke (rauch) malt
- BJCP "Rauchbier / Bamberg Smoked"
- Brewmaster cluster: "German Lager"

**Önerim: `specialty`** — Rauchbier kullanıcısı specialty reçete yapıyor (smoked beer alternatif: Smoked Porter, Smoked Bock daha mantıklı). Lager family'sinde Märzen/Helles yer aldığı için Rauchbier oraya da konabilir, ama smoked karakter belirleyici.

**Alternatif:** lager (Brewmaster cluster'ı takip et).

### K6. `german_rye_ale` → wheat mi, specialty mi?

- Rye tahıl (wheat değil ama wheat-benzeri tahıl)
- Roggenbier BJCP "Specialty Beer / Historical"
- Brewmaster cluster: "German Wheat"

**Önerim: `specialty`** — Rye specialty cluster'ı, Roggenbier strict wheat değil. wheat family çok dar olursa rye kayıyor.

**Alternatif:** wheat (Brewmaster cluster'ı takip et — German Wheat).

### K7. `common_beer` (California Common) + `cream_ale` → hybrid mı, american_amber_brown mı?

- California Common: lager yeast + ale temp (hybrid)
- Cream Ale: ale yeast + lager karakter (hybrid)
- BJCP'de "California Common", "Cream Ale" ayrı
- Brewmaster cluster: "Hybrid Ale-Lager"

**Önerim: `hybrid_ale_lager`** — German Kölsch/Altbier ile aynı family, kullanıcı temiz/light beer yapıyor.

### K8. `english_pale_ale` → british_ale içinde "Best Bitter" SLUG_TO_BJCP map'inde

- SLUG_TO_BJCP: `english_pale_ale` → "Best Bitter"
- British Bitter / Mild family
- V15 dataset: split (American Hoppy:23 + British Bitter / Mild:16) — kararsız

**Önerim: `british_ale`** — Best Bitter map'i ile uyumlu, British family.

### K9. `pre_prohibition_lager` → lager mı, hybrid mı?

- Historical American lager (corn/rice adjunct)
- Brewmaster cluster: "Hybrid Ale-Lager"

**Önerim: `lager`** — fermentation biyolojisi lager.

---

## Filter Algoritması

```
1. V15 top-1 → SLUG_TO_FAMILY[slug] = family_id
2. Top-3 listesi:
   a. Same-family slug'ları filter
   b. Olasılık sırasına göre top-3 al
   c. Eksik slot varsa ham listeden tamamla, "💡 Çapraz aile" etiketi
3. Family içinde 1 slug bile yoksa: ham top-3 göster (model belirsiz)
4. Manuel mod (alt_stil) değişmez — kullanıcı seçimi family'sinde filter
```

### Edge case'ler

| Senaryo | Davranış |
|---|---|
| Top-1 family X, ham top-3'te X family slug yok | Ham top-3 göster (filter nötr) |
| Top-1 family X, ham top-3'te X family 1 slug | 1 slug + 2 cross-family ("çapraz öneri" rozet) |
| Top-1 family X, ham top-3'te X family 3+ slug | Filter çalışır, X family top-3 |
| Top-1 confidence <%20 | Filter ZAYIF — Adım 52'de threshold review |

---

## Smoke Test Plan (Bug 4 fix sonrası beklenen)

| # | Reçete | Ham V15 top-3 | Top-1 family | Filtered ribbon | Filter ÇALIŞIYOR? |
|---|---|---|---|---|:---:|
| 1 | Muzo wheat | hefeweizen / specialty_saison / lambic | wheat | Weizen / Weizenbock / American Wheat | ✓ değişti |
| 2 | Belgian Dubbel | dubbel / biere_de_garde / munich_dunkel | belgian_ale | Dubbel / Tripel / Belgian Strong Dark | ✓ değişti |
| 3 | West Coast IPA | american_ipa / american_pale_ale / american_imperial_ipa | ipa | American IPA / American Pale Ale / Imperial IPA | NÖTR (zaten same-family) |
| 4 | Berliner Weisse | berliner_weisse / lambic / gueuze | sour_wild | Berliner Weisse / Lambic / Gueuze | NÖTR (zaten same-family) |

Test 1 + 2: Filter aktif gözükür (cross-family slug'lar değişti).
Test 3 + 4: Filter nötr (ham top-3 same-family).

---

## Implementation Plan (onay sonrası ~45-60 dk)

1. **HTML'e SLUG_TO_FAMILY dict ekle** (line `:3550` BJCP definition sonrası, SLUG_TO_BJCP yanı) — ~10 dk
2. **window.bmSlugFamily(slug)** helper — ~5 dk
3. **Ribbon filter logic** (line `:14848` `_v5TopBjcp` setpoint) — ham top-3'ü family'ye göre yeniden sırala, eksik slot için cross-family fallback + rozet — ~25 dk
4. **CSS rozet** (küçük "🔀 çapraz" etiket) — ~5 dk
5. **Smoke test verify** — 4 reçete simülasyon — ~10 dk

---

## ⏸ KAAN ONAY GEREKLİ

**Karar matrisi:**

| K# | Kararsız slug | Önerim | Alternatif | Onay? |
|---|---|---|---|---|
| K1 | belgian_witbier | wheat | belgian_ale | ☐ |
| K2 | american_pale_ale, american_strong_pale_ale | ipa | yeni american_pale | ☐ |
| K3 | american_barleywine | ipa | british_strong | ☐ |
| K4 | baltic_porter | lager | stout_porter | ☐ |
| K5 | bamberg_maerzen_rauchbier | specialty | lager | ☐ |
| K6 | german_rye_ale | specialty | wheat | ☐ |
| K7 | common_beer, cream_ale | hybrid_ale_lager | american_amber_brown | ☐ |
| K8 | english_pale_ale | british_ale | – (sade) | ☐ |
| K9 | pre_prohibition_lager | lager | hybrid_ale_lager | ☐ |

**Genel onay:**
- 11 family taxonomy uygun mu? Daha az/çok aile gerekli mi?
- Cross-family fallback rozet ("🔀 çapraz öneri") UI'da gösterilsin mi?
- Filter nötr (top-1 family'de slug yok) durumunda ham top-3 mü, "🔀 belirsiz" mi gösterilsin?

Onay sonrası implementation ~45-60 dk + smoke test verify.
