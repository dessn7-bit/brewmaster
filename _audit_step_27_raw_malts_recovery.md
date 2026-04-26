# AUDIT STEP 27 — RAW MALTS RECOVERY

**Tarih:** 2026-04-26
**Mod:** Otonom
**Hedef:** V6 dataset 1100 reçetesi için raw malt listelerini geri kazanmak (V7 recompute için).
**Sonuç:** **18.1% kurtarıldı (199/1100). Recompute eşik (%70) altında — tam recompute yapılmadı.** 199 reçete V7 pilot dataset olarak çıkarıldı.

---

## İş A — Kaynak envanteri

V6 dataset (1100 reçete) ID prefix dağılımı:

| Prefix | Sayı | Kaynak (tahmin) |
|---|---:|---|
| `v1_*` | 199 | Brulosophy / BYO / AHA / MTF (ham reçete kaynağı) |
| `b2_*` | 817 | V2 batch dosyaları (`_ground_truth_v2_batch[1-8].json`) |
| `dubbel_boost_*` | 15 | `_dubbel_boost_recipes.json` |
| `stout_*` | 6 | `_create_stout_recipes.js` |
| `ipa_*` | 6 | `_create_ipa_recipes.js` |
| `blonde_*` | 5 | `_create_blonde_ale_recipes.js` |
| `porter_*` | 5 | `_create_porter_brown_recipes.js` |
| `brown_*` | 5 | `_create_porter_brown_recipes.js` |
| `mild_*` | 2 | `_create_mild_recipes.js` |
| **TOPLAM** | **1100** | |

Repo'da bulunan kaynak dosyaları:
- `_gt_recipes_raw.js` (155 KB) — 199 raw recipe (4 kaynak: brulosophy 59, byo 138, aha 1, milkthefunk 1)
- `_ground_truth_v2_batch1.json` (50) ... `_ground_truth_v2_batch8.json` (50) — toplam 910 reçete
- `_dubbel_boost_recipes.json` (15) — featurized only
- `_create_*.js` scripts (44 toplam) — featurized only

---

## İş B — Raw malts var mı? (kaynak bazında yokla)

### Kaynak 1: `_gt_recipes_raw.js`

**Sonuç: ✅ TAM RAW MALTS VAR.**

**Schema:** `{source, url, tier, style_label, expected_slug, data: {name, style, batch_size_gallons, OG, FG, ABV, IBU, SRM, malts, hops, yeast, fermentation_temp_F}}`

**Sample (raw kayıt):**

    {
      source: 'brulosophy',
      url: 'https://brulosophy.com/recipes/munich-helles/',
      tier: 2, style_label: 'Munich Helles', expected_slug: 'munich_helles',
      data: { name:'Munich Helles', style:'Munich Helles', OG:1.045, FG:1.009, ABV:4.73, IBU:19.6, SRM:3.3,
        malts:[{name:'Pilsen MD',weight_lb:8.5,pct:89.47},{name:'Munich I',weight_lb:1.0,pct:10.53}],
        hops:[{name:'Tettnang',amount_oz:1.41,alpha_acid:4.2,time_min:60,use:'Boil'}],
        yeast:{name:'Harvest L17', manufacturer:'Imperial Yeast'}, fermentation_temp_F:55 }
    }

**199/199 reçetede `data.malts[]` array dolu.** İçerik: `{name, weight_lb, pct}` üçlüsü — pct alanı zaten hesaplı (recompute'a hazır), name alanı (örn. "Pilsen MD", "Caramel 60L", "Munich I") classifyMalt regex'inde işlenebilir.

### Kaynak 2: `_ground_truth_v2_batch1-8.json`

**Sonuç: ❌ RAW MALTS YOK.**

**Schema:** `{recipe_id, source, source_url, beer_name, brewery, correct_style_slug, correct_style_label, og, fg, ibu, srm, abv, malt_profile, hop_profile, yeast, notes}`

**Sample:**

    {
      "beer_name": "Westmalle Tripel",
      "correct_style_slug": "belgian_tripel",
      "malt_profile": null,
      "hop_profile": null,
      "yeast": null
    }

**910/910 kayıtta `malt_profile: null`.** Sadece scalar feature (og/fg/abv/ibu/srm) + beer_name + style_slug. Raw bileşen yok. Re-toplama gerekiyor.

### Kaynak 3: `_dubbel_boost_recipes.json` + `_create_*.js`

**Sonuç: ❌ RAW MALTS YOK (sadece pct_* hesabı featurized).**

**Schema:** Doğrudan computed features (`pct_pilsner`, `pct_munich`, `pct_sugar`, vb.) inline yazılmış. Recipe author manuel feature giriyor, ham malt listesi belgelenmiyor.

44 specialty/boost reçete bu kategoride.

---

## İş C — Karar matrisi

| Kaynak | Reçete # | Raw malts | Recovery yöntemi |
|---|---:|---|---|
| `_gt_recipes_raw.js` (v1_*) | 199 | ✅ Var (data.malts[]) | (A) Direkt çek |
| V2 batches (b2_*) | 817 | ❌ Yok (malt_profile=null) | **(D) İmkânsız** — yeniden topla (URL'lerden) veya manuel kuvars |
| Dubbel boost + create scripts | 84 | ❌ Yok (featurized inline) | **(D) İmkânsız** — kaynak yok, manuel reverse-engineer veya yeni reçete yaz |

**Recovery oranı: 199/1100 = 18.1%**. Görev şartı (%70+) **karşılanmadı** → tam recompute yapılmadı.

---

## İş D — Recompute (yapılmadı, sebep §C)

70%+ eşik karşılanmadığı için tam recompute yapılmadı. **Bunun yerine 199 reçete için pilot dataset üretildi** (V7 sıfırdan kuruluş için temel):

**Dosya:** `_ml_dataset_v7_partial_with_malts.json`

**İçerik:** 199 reçete, her birinde:
- V6 metadata (id, label_slug, label_family, label_ferm)
- `raw` block: og, fg, abv, ibu, srm, malts[] (name+weight_lb+pct), hops[], yeast, fermentation_temp_F
- `v6_features` block: V6 dataset'in mevcut hesapladığı 79 feature (kıyas için)

**Stil dağılımı (pilot — 77 unique stil):**

| Top stiller (n) | Sayı |
|---|---:|
| american_india_pale_ale | 14 |
| french_belgian_saison | 10 |
| pale_lager | 9 |
| pale_ale | 7 |
| south_german_hefeweizen | 7 |
| festbier | 6 |
| pumpkin_squash_beer | 6 |
| west_coast_india_pale_ale | 5 |
| american_imperial_stout | 5 |
| american_barleywine | 5 |
| brown_ale | 5 |
| belgian_tripel | 4 |
| double_ipa | 4 |
| sweet_stout | 4 |
| german_pilsener | 4 |
| porter | 4 |

**Pilot stil coverage:**
- 77 unique stil (V6'nın 150'sinin %51'i)
- n>=5: **11 stil** (V7 train için zayıf)
- n>=10: **2 stil** (sadece american_india_pale_ale ve french_belgian_saison)
- n>=20: 0 stil

**Belgian Dubbel — pilot'ta YOK** (yalnızca belgian_tripel n=4 var). V7 Dubbel düzeltmesi için doğrudan kullanılamaz, ek veri gerek.

**Recompute neden çalıştırılmadı (sadece pilot çıkarıldı):**
- 199 reçete ile classifyMalt recompute yapılabilir ama ML training için yetersiz coverage.
- Tek kullanım hipotezi: V7 motoru için "küçük ama temiz" pilot dataset olarak proof-of-concept.
- Karar: pilot dataset **çıkarıldı ama recompute SCRIPT'i bu adımda yazılmadı**. Adım 28+'da yapılır (eğer bu pilot yeterli görünürse).

---

## İş E — V7 önündeki net engel raporu

### Kullanılabilir reçete sayısı (recovery sonrası)

| Kategori | Sayı |
|---|---:|
| Raw malts ile (recompute hazır) | **199** |
| Sadece scalar feature (raw yok) | 901 |
| **Toplam V6 dataset** | 1100 |

### Mevcut pilot dataset (199 reçete) V7 train için yeterli mi?

**HAYIR.** Sebepler:
- 77 unique stil → 150'lik V6 stil hedefinin yarısı bile yok.
- n>=10 sadece 2 stil → KNN/RF için stratify edilmiş train/test split anlamsız.
- Belgian Trappist ailesi (Dubbel/BSDA/Quad) çok zayıf temsilli (Tripel n=4, Dubbel 0, BSDA 0, Quad 0).
- Kaan'ın test reçetesi (Belgian Dubbel) için pilot'ta REFERANS YOK.

### V7'ye gerçek hazırlık için yapılması gereken

| Adım | İş | Tahmini süre |
|---|---|---|
| **27a** | Kalan 901 reçetenin URL'lerinden raw malts re-fetch (b2_* clones için brewery sayfalarından, V2 batch URL'lerinden) | 2-3 sprint (otomatik scraper + manuel doğrulama) |
| 27b | Yeni 500-1000 reçete ekle (Türkiye/Avrupa/specialty cluster'lar için) | 2 sprint |
| 27c | Tam dataset → classifyMalt recompute → `_ml_dataset_v7_clean.json` | 1 sprint |
| 27d | XGBoost / RF / KNN ensemble train + tune | 1-2 sprint |
| 27e | V7 motor inject HTML + canary | 1 sprint |
| **TOPLAM** | | **7-9 sprint** |

### Bu adımda elde edilen değer

✅ Pilot dataset `_ml_dataset_v7_partial_with_malts.json` üretildi (199 reçete, raw malts dahil).
✅ Raw malts schema doğrulandı (`malts: [{name, weight_lb, pct}, ...]`).
✅ V7 için kaynak yapı netleşti — V2 batches'tan raw alınamıyor, re-fetch gerekiyor.
✅ Dubbel/Trappist için pilot'ta veri yok — v7 fix'inde bu cluster için ekstra veri toplama önceliği belirgin.

❌ Tam recompute yapılmadı (eşik altı).
❌ V6 motor performansını V7'ye taşımak için yeterli veri yok — ek toplama zorunlu.

---

## Sonraki acil adım

**Adım 28:** İki seçenek:

**(a) Pilot ile devam:** 199 reçete üzerinde classifyMalt recompute + V7 mini-motor (KNN-only, no RF) train. Production hedef değil, "yeni regex doğru mu" hipotez doğrulama. ~1 sprint.

**(b) Veri toplama sprint'i başlat:** B2_* clone reçeteleri için `source_url` field'larını parse, web scraper yaz, raw malts'ı yeniden çek. ~2-3 sprint, sonunda tam dataset.

Önerim: **(b)** — Pilot çok küçük, V7 hedef performansının ölçülmesi için yetersiz. Doğrudan tam veri toplama → tam recompute → V7 train rotası daha verimli.
