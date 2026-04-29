# Adım 60a — Mapping Audit (38 Train-Dışı Slug)

**Tarih:** 2026-04-29  
**Veri:** `working/_v19_dataset.json` (V19 dataset, 38 slug n<10)  
**Sample dump:** `_step60a_mapping_audit_data.json`  
**KURAL 5:** Her alias merge için sample 3-7 reçete dump kontrol edildi.

---

## Özet

V19'da 38 slug train-dışı (≥10 filter):
- 12 slug n=1
- 8 slug n=2
- 6 slug n=3
- 12 slug n=4-9 (toplam 7 slug)

**38 slug'ın 36'sı alias merge edilebilir** (mevcut train edilebilir slug'lara). 1 standalone tutulmaya değer (brut_ipa, modern). 1 drop (gluten_free_beer, niş + alias mantıksız).

---

## KATEGORİ 1 — Alias Merge (36 slug)

### IPA ailesi (4 slug)

| Source slug | n | → Target slug | Sebep | Sample evidence |
|---|---|---|---|---|
| west_coast_india_pale_ale | 2 | american_india_pale_ale | BJCP 21A varyant | ✓ AIPA-tarz |
| session_india_pale_ale | 5 | american_india_pale_ale | düşük ABV AIPA varyantı | TMF "Micro-IPA", "Vienna Malt Session IPA", "2.3% ABV Session NEIPA" — OG 1.030-1.058, IBU 36-49 |
| juicy_or_hazy_double_india_pale_ale | 1 | double_ipa | NEIPA+DIPA combo | (1 reçete) |
| imperial_red_ale | 4 | american_amber_red_ale | TMF "India Red Ale", "Dank Amber IPA" — SRM 12-14, IBU 67-142, modern amber-IPA crossover. **Karar: amber slug'a; eğer IBU>80 isteniyorsa double_ipa alternatif** |

### Bitter ailesi (3 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| strong_bitter | 6 | extra_special_bitter | BJCP 11C ESB — sample'da OG 1.051-1.063, IBU 34-45, hepsi ESB range |
| scottish_heavy | 1 | scottish_export | BJCP 14B varyant |
| strong_ale | 7 | old_ale | mmum "Strong Ale" + braureka "British Strong Ale" — OG 1.056-1.092, BJCP 17B Old Ale uyumlu |

### Stout/Porter (4 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| foreign_extra_stout | 1 | export_stout | BJCP 16D, mevcut export_stout slug |
| tropical_stout | 2 | export_stout | BJCP 16D foreign extra stout varyantı |
| smoke_porter | 1 | smoked_beer | porter + smoke = smoked_beer cluster |
| coffee_beer | 4 | specialty_beer | TMF coffee stout (4 reçete) — katki_coffee feature zaten var, specialty_beer cluster |

### Belgian (3 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| other_belgian_ale | 6 | belgian_blonde_ale | braureka "Belgisches Spezial Ale" — OG 1.042-1.094, çoğu blonde-strong arası. **Alternatif:** OG ≥1.075 olanları belgian_strong_dark_ale'a, kalan blonde |
| belgian_session_ale | 4 | belgian_blonde_ale | TMF "Belgian Single", "Brett Belgian Pale" — OG 1.042-1.054, low alcohol, blonde mantıklı |
| strong_scotch_ale | 1 | scotch_ale_or_wee_heavy | tek reçete, BJCP 17C |

### Cream/Brown (2 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| cream_ale | 2 | american_cream_ale | Adım 54'te yapılmış olmalıydı, V19'da 2 yeni geldi (dedupe recovery'den) |
| english_brown_ale | 1 | brown_ale | BJCP 13B, mevcut brown_ale slug |

### Lager (8 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| american_light_lager | 3 | american_lager | braureka "Lite American Lager" — OG 1.039-1.044, Bud Light vs |
| international_pale_lager | 1 | american_lager | generic |
| dark_lager | 5 | german_schwarzbier | TMF "Czech Dark Lager" + braureka "Internationales dunkles Lagerbier" + twortwat "Dark Lager" — SRM 12-40, schwarzbier en yakın |
| czech_amber_lager | 2 | vienna_lager | BJCP 3A, vienna_lager amber-Continental yakın |
| franconian_rotbier | 3 | vienna_lager | mmum "Nürnberger Rotbier" — German amber, OG 1.053-1.055, SRM 11-12 |
| new_zealand_pilsner | 2 | german_pilsener | NZ hop dışında pilsner profili aynı |
| german_eisbock | 4 | german_doppelbock | recipator+braureka "Eisbock" — OG 1.066-1.107, doppelbock'un konsantre versiyonu (BJCP 9C) |
| german_leichtbier | 4 | american_lager | braureka "Deutsches Leichtbier" — OG 1.024-1.039, ABV 0.5-4.0, light lager eşdeğeri |

### Pale Ale (1 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| australian_pale_ale | 3 | american_pale_ale | mmum "Pale Ale" + braureka "Amerikanisches Pale Ale" + twortwat "Pacific Ale Clone" — modern APA hop varyantı |

### Sour/Wild (2 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| american_wild_ale | 7 | mixed_fermentation_sour_beer | TMF "Funky Pale", "Beatification Clone", "Sour Solera Barrel" — Brett+mixed ferm |
| american_fruited_sour_ale | 2 | mixed_fermentation_sour_beer | sour + fruit = mixed-ferm |

### Wheat (2 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| fruit_wheat_beer | 7 | fruit_beer | recipator "American Wheat" + fruit (raspberry, cherry) — fruit_beer cluster, katki_fruit feature mevcut |
| piwo_grodziskie | 1 | smoked_beer | Polish historical smoked wheat (Grodziskie BJCP X3) |

### Specialty (5 slug)

| Source | n | → Target | Sebep |
|---|---|---|---|
| chocolate_or_cocoa_beer | 1 | specialty_beer | base + chocolate, specialty cluster |
| pumpkin_spice_beer | 1 | specialty_beer | katki_pumpkin feature zaten var |
| pumpkin_squash_beer | 2 | specialty_beer | katki_pumpkin feature zaten var |
| specialty_honey_beer | 3 | specialty_beer | recipator "Honey Pale/Ale", honey adjunct specialty |
| specialty_historical | 4 | specialty_beer | TMF "Adambier", "Smoked Doppelsticke" — historical + smoke, specialty cluster |
| historical_beer | 1 | specialty_beer | generic historical |
| finnish_sahti | 2 | specialty_beer | BJCP 27 historical, niş |

---

## KATEGORİ 2 — Standalone Tut (Adım 61+ ek scrape)

| Slug | n | Sebep |
|---|---|---|
| **brut_ipa** | **3** | BJCP X4 modern style (2018+), gerçek discriminator var (low FG, dry character). Ek scrape ile train edilebilir slug yapılabilir (BYO/AHA brut_ipa search). Adım 61+'a not. |

**Net:** Sadece 1 slug standalone tutuluyor (brut_ipa). Diğer modern stiller (NZ pilsner, Czech amber) alias merge mantıklı çünkü ek scrape için kaynak bulmak zor + sample evidence aliase doğru gösteriyor.

---

## KATEGORİ 3 — Drop (1 slug)

| Slug | n | Sebep |
|---|---|---|
| **gluten_free_beer** | **1** | Beslenme-bazlı (sorghum, millet, rice malt) — geleneksel BJCP slug'larına alias edilemez (malt profili tamamen farklı). Tek reçete, model'e değer katmaz. Drop kabul. |

---

## KATEGORİ 4 — 14cat Mapping Ekle (0 slug, gerek yok)

Tüm 36 alias merge sonrası bu reçeteler **mevcut train edilebilir slug'lara taşınır**. Yeni 14cat mapping eklemeye gerek yok — taşındıkları slug'lar zaten cluster'a sahip.

brut_ipa standalone kalırsa: 14cat mapping ekle → `'brut_ipa': 'ipa'`. Ama n=3 ile train edilemez (≥10 filter).

---

## Toplam Etki Tahmini

### Önce (V19)
- 125 unique slug
- 87 train edilebilir (≥10)
- 38 slug train-dışı (toplam ~120 reçete)

### Sonra (Adım 60a alias merge sonrası)
- ~88 unique slug (38 - 36 alias - 1 drop = -36 brut için +1 standalone = 88)
- 87-88 train edilebilir (alias merge'den gelenler ana slug'lara katılır)
- ~120 reçete reidentified

### Slug count değişimleri (alias merge sonrası beklenen artış)

| Target slug | Mevcut V19 | Eklenen | Yeni toplam |
|---|---|---|---|
| american_india_pale_ale | 56,108 | +7 (WCIPA + session) | 56,115 |
| double_ipa | 14,581 | +1 (juicy_double) | 14,582 |
| american_amber_red_ale | 11,483 | +4 (imperial_red) | 11,487 |
| extra_special_bitter | 7,656 | +6 (strong_bitter) | 7,662 |
| scottish_export | 2,373 | +1 (scottish_heavy) | 2,374 |
| old_ale | 2,155 | +7 (strong_ale) | 2,162 |
| export_stout | 1,580 | +3 (foreign_extra + tropical) | 1,583 |
| smoked_beer | 1,255 | +2 (smoke_porter + grodziskie) | 1,257 |
| specialty_beer | 28,398 | +14 (chocolate, pumpkin×2, honey, historical×2, sahti, coffee×4) | 28,412 |
| belgian_blonde_ale | 5,713 | +10 (other_belgian + session_ale) | 5,723 |
| scotch_ale_or_wee_heavy | 2,781 | +1 (strong_scotch) | 2,782 |
| american_cream_ale | 4,482 | +2 (cream_ale) | 4,484 |
| brown_ale | 3,172 | +1 (english_brown) | 3,173 |
| american_lager | 5,270 | +8 (light + international + leicht) | 5,278 |
| german_schwarzbier | 1,233 | +5 (dark_lager) | 1,238 |
| vienna_lager | 1,722 | +5 (czech_amber + franconian) | 1,727 |
| german_pilsener | 5,467 | +2 (NZ pilsner) | 5,469 |
| german_doppelbock | 1,450 | +4 (eisbock) | 1,454 |
| american_pale_ale | 43,246 | +3 (australian) | 43,249 |
| mixed_fermentation_sour_beer | 268 | +9 (wild + fruited) | **277** ⭐ |
| fruit_beer | 3,655 | +7 (fruit_wheat) | 3,662 |

**Net artış:** ~120 reçete reidentified, çoğunluk büyük slug'lara katılır (marjinal etki). Ama küçük target slug'lara büyük etki var:
- mixed_fermentation_sour_beer: 268 → 277 (+%3) — V19 sour cluster için marjinal yardım
- export_stout: 1,580 → 1,583 — marjinal

---

## Karar Noktaları (Kaan Onayı için)

### 1. Imperial Red Ale (n=4) → IBU bazlı alt-karar gerek
Sample dump:
- "Nelson Nectar - India Amber Ale" OG 1.070, SRM 12, IBU yok
- "Dank Amber IPA - Rebrew" OG 1.073, SRM 14, IBU 116
- "Dank Amber IPA #3" OG 1.065, SRM 13, IBU 142
- "India Red Ale" OG 1.060, SRM 14, IBU 67

İki seçenek:
- **A**: Hepsi `american_amber_red_ale`'a taşı (basit)
- **B**: IBU>80 ise `double_ipa`, IBU≤80 ise `american_amber_red_ale` (4 reçete bunu zorlamak için fazla küçük)

**Önerim: A** (basit, n=4 küçük örneklem alt-karar için yetersiz).

### 2. Other Belgian Ale (n=6) → OG bazlı alt-karar gerek
Sample dump:
- "kopere ploert" OG 1.094, ABV 8.7
- "First Belgian" OG 1.080, ABV 9.3
- "Trappist Ale (Orval Klon)" OG 1.058, ABV 6.2 → orval (BJCP 24A blonde-strong)
- "Belgisches Ale" OG 1.054, ABV 5.6
- "TicoTicoBar choclate" OG 1.063, SRM 23 → dark
- "Gestopfter-Softy" OG 1.042, ABV 3.3

İki seçenek:
- **A**: Hepsi `belgian_blonde_ale`'a (basit)
- **B**: OG≥1.075 belgian_strong_dark_ale, OG 1.060-1.075 belgian_dubbel, OG<1.060 belgian_blonde_ale (3 farklı target)

**Önerim: B** (sample'da gerçek 3 farklı tip var).

### 3. Imperial Red & Other Belgian dışında 34 alias kararı kabul mü?
Önerilen 36 alias merge listesi yukarıda. Hangisinde itiraz var?

### 4. brut_ipa standalone tut (Adım 61+ ek scrape) — onay?

### 5. gluten_free_beer drop — onay?

---

## Sonraki Adım

Onay sonrası:
1. **`_step60a_apply_aliases.py`** — V19 dataset'i bir kopya alıp alias merge uygula → `working/_v19_aliased_dataset.json`
2. Slug count yeniden raporla (sanity)
3. Adım 60b'ye geç: V6 dataset revizyon + retrain

**Veri:** `_step60a_mapping_audit_data.json` (38 slug × tüm sample dump).
