# STEP 53 Faz A — rmwoods/beer.ai Pre-Flight Raporu

**Tarih:** 2026-04-28
**Status:** PRE-FLIGHT TAMAM — Kaan tasarım kararları bekleniyor
**Lisans:** NON-COMMERCIAL ONLY (Rory Woods email 2026-04-28 18:31)
**Path:** `C:\Users\Kaan\Desktop\rmwoods\` (extract edildi, 1.07 GB)

---

## 🎯 KRİTİK BULGU — Beklenenden 2.4x büyük

**Adım 50 Issue draft tahmini:** 171.699 reçete
**Gerçek `all_recipes.h5/core/table`:** **403.157 reçete** ⭐⭐⭐

171K sayısı `recipe_vecs.h5/vecs` shape'inden — vector subset (Rory'nin curated). Tam dataset 2.4x daha büyük.

| Dosya | Boyut | İçerik |
|---|---:|---|
| `all_recipes.h5` | 370 MB | 2 PyTables group: core (403,157 reçete) + ingredients (2,172,744 row) |
| `recipe_vecs.h5` | 23 MB | 171,699 reçete × 793-dim float64 vector (curated subset) |
| `brewersfriend_recipes.zip` | 119 MB | Ham scrape (XML beerXML?) |
| `brewtoad_recipes.zip` | 511 MB | Ham scrape (Brewtoad kapanmış 2018 arşiv) |
| `fermmap.pickle` | 92 KB | 2793 entry — fermentable name normalize |
| `hopmap.pickle` | 41 KB | 1537 entry — hop name normalize |
| `yeastmap.pickle` | 43 KB | 1192 entry — yeast strain normalize |
| `miscmap.pickle` | 44 KB | 1455 entry — adjunct/spice normalize |

---

## 1. Geçmiş Audit — Adım 50 Faz 3A

`_step50_rmwoods_issue_draft.md`:
- Repo: github.com/rmwoods/beer.ai
- Tahmini: 171K reçete (gerçek 403K — vec subset değil core!)
- Beklenen schema: `all_recipes.h5` + `recipe_vecs.h5` + `vocab.pickle` + `*map.pickle`
- Faz 3B planı (Adım 50'de yazılı, hâlâ geçerli):
  1. HDF5 indir + h5py schema inspect (yapıldı ✓)
  2. 14-cluster mapping (BJCP styleid + yeast keyword → cluster)
  3. cleanYeastString v2 audit
  4. V15/V16 dataset ile dedup (recipe name + OG/FG hash)
  5. ML dataset merge → 9552 + 403K = ~410K (V17)

---

## 2. Dosya Yerleşimi — Önerim

| Seçenek | Açıklama | Kararı |
|---|---|---|
| **A** | `external/_rmwoods_dataset/` — repo subdir, .gitignore | ✅ Önerim |
| B | Masaüstünde kalsın, path referansı al | scriptler her seferinde mutlak path |
| C | Brewmaster repo'ya `archive/_rmwoods/` | non-commercial license riski |

**A** seçili → `git mv "C:/Users/Kaan/Desktop/rmwoods" "C:/Users/Kaan/brewmaster/external/_rmwoods_dataset/"` + `.gitignore`'a `external/_rmwoods_dataset/` ekle. **Repo'ya ASLA commit edilmez.**

---

## 3. all_recipes.h5 / core/table Schema (recipe-level, 403K)

```
Columns (18):
  index             int  (PK)
  batch_size        float (L)
  boil_size         float (L)
  boil_time         float (min)
  brewer            str   (e.g. "velkyal", "wain thor", "viff brewing")
  efficiency        float (0-1)
  name              str   (recipe name, lowercase: "dark island oir leann")
  origin            str   (source — see below)
  recipe_file       str   (path: "recipes/brewtoad/dark-island-oir-leann.xml")
  src_abv           float (NaN sample'larda — Brewmaster ABV hesaplayacak)
  src_color         float (NaN — Morey hesaplama)
  src_fg            float (NaN)
  src_ibu           float (NaN)
  src_og            float (NaN)
  style_category    str   (BJCP code: "6b", "10b", "20a")
  style_guide       str   ("bjcp" — hepsi BJCP standart)
  style_name        str   (lowercase: "blonde ale", "american amber ale", "fruit beer")
  style_version     float (1.0)
```

### Source breakdown (origin column, full 403K pass):
- **brewtoad: 330,790** (%82) — 2018 kapanan site, archive
- **brewersfriend: 72,367** (%18) — public scrape (Brewer's Friend Cloudflare bloke ama Rory 2018-2020'de scrape etmiş)

### Style guide: %100 BJCP
Tüm 403K reçete BJCP standart kategoride etiketlenmiş — direct slug mapping mümkün.

### ⚠ src_* fields NaN
İlk 5 sample'da src_abv/og/fg/ibu/srm hepsi NaN. Tam pass'te NaN oranı bilinmiyor (V17 retrain'de OG/FG kritik — ingredients/table'dan hesaplanması gerekebilir).

---

## 4. all_recipes.h5 / ingredients/table Schema (ingredient-level, 2.17M row)

Recipe başına ortalama ~5.4 ingredient (2,172,744 / 403,157).

Schema (uzun-format, her satır bir ingredient):
```
ferm_amount, ferm_color, ferm_display_amount, ferm_name, ferm_origin, 
ferm_potential, ferm_type, ferm_yield,
hop_alpha, hop_amount, hop_display_amount, hop_form, hop_name, hop_origin, hop_time, hop_use,
misc_amount, misc_amount_is_weight, misc_name, misc_time, misc_use,
yeast_amount, yeast_attenuation, yeast_flocculation, yeast_form, yeast_laboratory, 
yeast_name, yeast_product_id, yeast_type
```

**ALTIN BİLGİ** — Brewmaster'ın V15 buildFeatures için tüm gereken alan **structured**:
- Fermentable: amount, color (Lovibond), name, type, yield
- Hop: alpha%, amount, time (boil min), use (boil/dry-hop/whirlpool/first wort)
- Misc/spice: amount, name, time, use
- Yeast: name, attenuation, flocculation, form, laboratory (Wyeast/WLP/Lallemand), product_id, type

V15 81-feature için **eksiksiz**. Brewmaster V15 manual feature engineering'inden daha temiz.

---

## 5. recipe_vecs.h5 / vecs Schema (171K subset)

```
table dtype:
  index           float64
  values_block_0  float64[793]
total rows: 171,699 (subset of 403K core)
```

**793-dim vector**:
- Pre-computed embedding (Rory'nin makaleleri/repo'da TF-IDF + ingredient frequency vectorization olduğu söyleniyor)
- 171K reçete (curated/cleaned subset, vec computation için filtrelenmiş)
- Brewmaster V15 81-feature ile **UYUMSUZ** (farklı feature space)

### Brewmaster V17 için kullanılabilir mi?

**HAYIR — direkt V17 retrain'de kullanma**:
- V12 motor JS predict 81-feature bekler, 793-dim ile uyumsuz HTML re-embed gerek
- Vector format ML training için farklı paradigma (XGBoost değil cosine similarity / kNN)
- 171K subset (= 232K reçete kayıp 403K'dan)

**AMA** vector yine de değerli:
- **Cosine similarity duplicate detection** (V17 dedup için 793-dim daha güçlü)
- **Cluster analysis** (research)
- **Future feature engineering ilhamı** (Adım 56+)

**Karar önerim**: Vector dosyasını sakla, ana V17 retrain için CORE TABLE (403K) + ingredients table'ı kullan, V15 buildFeatures format'a parse et.

---

## 6. Pickle Maps — ALTIN İÇERİK ⭐⭐⭐

| Map | Entry | Örnek normalize |
|---|---:|---|
| **fermmap** | **2793** | "2 row brewers malt" / "briess 2-row brewer's malt" / "breiss 2 row brewers malt" → "2-row brewers malt" |
| **hopmap** | **1537** | "casacade" / "casacde" / "scade" / "casdcade" → "cascade" |
| **yeastmap** | **1192** | "safeale us-05" / "1safale us-05" / "safale s-05" → "safale us-05" |
| **miscmap** | **1455** | "irish mosh" / "super irish moss" / "irish poteen" → "irish moss" |

**Brewmaster'ın V15 cleaning yaptığı manual normalization burada built-in** — variant kapsama Brewmaster'dan **çok daha geniş**. Yazım hataları, boşluk varyasyonları, üretici prefix'leri (briess/breiss/safale/safeale).

### V17 retrain için kullanım önerisi

| Strateji | Açıklama | Risk |
|---|---|---|
| **A** | Brewmaster'ın `cleanYeastString v2` ÜZERİNE Rory map'leri PARALEL kullan | İki katmanlı clean, double protection |
| B | Brewmaster manual mapping → REPLACE Rory map'leriyle | Mevcut V15/V16 retrain bozulur |
| C | Sadece V17 retrain'de Rory map kullan, V15/V16 mevcut kalsın | ✅ **Önerim** — V17 ayrı dataset/model, V12 V16 production'da kalır |

**Önerim C**: V17 retrain için Rory map'leri tek başına yeterli (BJCP style + Rory ingredient normalization). Brewmaster V15 manual cleaning V16 production'a bağlı, V17 ayrı pipeline.

---

## 7. Dedupe Stratejisi

### V16 dataset overlap check
- V16 source breakdown'unda `brewersfriend` ve `brewtoad` source **YOK** (V16: recipator/braureka/aha/mmum/byo/twortwat/tmf/roerstok/amervallei)
- Cross-source duplicate **DÜŞÜK** beklenir

### Olası overlap riskleri
- BYO scrape Adım 50'de Brewdog clones içerdi → AHA + Brewer's Friend benzer reçeteler
- AHA "MTF Member Recipes" sayfası Brewer's Friend hesaba link veriyordu (Adım 51)
- **Tahmini overlap**: <%1 (4-40 reçete max V16 ile)

### Önerilen dedupe strateji (V17 Faz B)

1. **Title fingerprint**: `slug(name) + round(og,3) + grain_signature` → V16 8416 reçete ile match
2. **Vector cosine** (recipe_vecs.h5 subset için): 0.95+ similarity → potential dup
3. **rmwoods içi dedupe**: 403K içinde aynı recipe_file path veya brewer+name match (Rory zaten yapmış olabilir)

**Dedupe agresifliği**: konservatif (önce eksak match, sonra fuzzy). %1 overlap tahmini → ~4 reçete drop, marjinal.

---

## 8. License & Citation

### Rory Woods email (2026-04-28 18:31)
- **NON-COMMERCIAL ONLY**
- Dataset paylaşım Dropbox link

### Source etiket önerisi

| Seçenek | Açıklama | Önerim |
|---|---|---|
| A | Tek etiket "rmwoods" tüm 403K | Basit, kayıp: brewersfriend/brewtoad ayrımı |
| B | Tek etiket "beer_ai_archive" | Aynı |
| **C** | İki etiket "rmwoods_brewtoad" + "rmwoods_brewersfriend" | ✅ **Önerim** — cross-source analytics + V16 dedupe daha hassas |
| D | Origin field'ı dataset'e direkt geçir ("brewtoad" + "brewersfriend") | Mevcut V16 source breakdown ile uyumsuz |

**Önerim C**: V17 dataset'te `source` field 2 yeni değer alır:
- `rmwoods_brewtoad` (330,790)
- `rmwoods_brewersfriend` (72,367)

Citation commit mesajına:
```
Source: rmwoods/beer.ai (Rory Woods, github.com/rmwoods/beer.ai)
License: non-commercial use, redistributed via Dropbox 2026-04-28
Citation: Brewmaster ML training, attribution preserved in raw.brewer field
```

---

## 9. Veri Yaşı & Modern Stil Eksikliği

### Brewtoad: kapanmış 2018, archive arşiv
### Brewersfriend: 2018-2020 scrape (rmwoods toplama tarihi)

**Modern stiller (2020+) eksik**:
- Pastry Sour
- Smoothie Sour
- Catharina Sour
- Hazy Lager / Cold IPA
- Italian Pilsner
- Helles Naturtrüb

Bu stiller V15/V16'da zaten yok (Adım 51 K-Pre5 geçici toplama). **Adım 56 scope** — Brewmaster Adım 56 (yeast parser + Specialty granularize)'de modern stiller standalone slug ile ele alınır.

V17 retrain rmwoods ile **klasik BJCP stillerini güçlendirir**, modern niche stiller V18+ scope.

---

## 10. V17 Retrain Risk Değerlendirmesi (REVİZE — Boyut hesabı düzeltildi)

### Önceki "1.4 GB JSON" iddiası YANLIŞTI

`linear with n_recipes` varsayımı yanlış. XGBoost JSON boyutu = `num_class × n_estimators × per_tree_size`. Per-tree size **`max_depth=4` ile bounded** (max 31 leaf, ortalama 16.8 nodes), recipe count'a marjinal bağımlı.

### Doğru boyut hesabı

V16 referans:
- 9552 reçete, 82 slug class, 300 round, max_depth=4
- 24,600 tree × 1.293 KB/tree (avg 16.8 nodes × 80 byte/node) = **31.8 MB** ✓

V17 senaryolar (recipe count etkisi MİNİMAL):

| Senaryo | num_class | n_est | trees | total JSON |
|---|---:|---:|---:|---:|
| V16 (9552 recipe) | 82 | 300 | 24,600 | **31.8 MB** ✓ baseline |
| V17 412K full | ~100 (V16 +20%) | 300 | 30,000 | **~39 MB** |
| V17 100K subsample | ~85 | 300 | 25,500 | ~33 MB |
| V17 50K subsample | ~80 | 300 | 24,000 | ~31 MB |
| Cluster (14-cat) | 14 | 200 | 2,800 | **~3 MB** (V16 ile aynı) |

**TÜM senaryolar V16 boyutuna yakın (~30-40 MB).** Browser embed problem **YOK**.

### Compute & RAM tahmini (gerçek bottleneck)

| Metric | V16 | V17 412K full | V17 100K |
|---|---:|---:|---:|
| Recipe count | 9.552 | 412.709 | ~100K |
| Train CPU (n*log(n)) | 3 dk | ~3 saat | ~30 dk |
| Train RAM (DMatrix) | ~6 MB | ~270 MB | ~70 MB |
| Slug JSON | 31.8 MB | ~39 MB | ~33 MB |
| Cluster JSON | 3 MB | ~3 MB | ~3 MB |
| Browser load (JSON parse) | ~3 sn | ~4 sn | ~4 sn |

### Önerim: K3 = A (FULL 412K retrain)

Boyut bahanesi yokken full data sinyali kullanmak en doğru:
- ✅ Boyut: V16 ile eşdeğer (~40 MB)
- ✅ Browser embed: sorun yok
- ✅ RAM: 270 MB DMatrix manageable
- ⏰ Train: ~3 saat (overnight veya Kaan uyurken)
- 🎯 Brett/Sour temsil: ~25K reçete (V16 164'ten 152x)

### Önceki "C subsample" gerekçesi geçersiz

Subsample sebep: boyut endişesi. Boyut endişesi yanlıştı → **subsample gereksiz**.

| Strateji | Açıklama | Karar |
|---|---|---|
| **A** | V17 FULL 412K retrain (~3 saat) | ✅ **K3 onayı (Kaan)** |
| B | 100K stratified | gereksiz subsample |
| C | 50K subsample | gereksiz subsample |
| D | Train + deploy YOK | Plan dışı |

---

## 11. Adım 53/54/55 Plan Revize Önerileri

### Adım 53 (orijinal: Brett/Sour blog batch 8 site, ~4-5 saat)

**rmwoods Brett/Sour kapsama analizi**:
- 403K BJCP-etiketli reçete içinde Sour cluster (Berliner/Lambic/Flanders/Brett/Mixed/Wild/Gose) tahmini ~%5-7 → 20K-28K Sour reçete
- V16 Sour cluster 164 reçete, rmwoods +20K → 100x büyüme
- **Brett/Sour boşluğu KAPANIR ⭐**

**Eski Adım 53 (blog batch) → SKIP**. Adım 53 = rmwoods entegrasyon olsun, eski plan rafa kaldırılır.

### Adım 54 (orijinal: DIY Dog ~2 saat, IBU validation kazanımı)

**Adım 30 raporundan**: Brewdog DIY Dog 325 BeerXML reçete, public domain. IBU 100% dolu, OG genelde NaN, schema clean.

**rmwoods'da brewdog etiketli reçete sayısı belirsiz** — eğer var ise overlap. Eğer yok, DIY Dog hâlâ değerli (IBU validation set).

**Önerim**: Adım 54 olduğu gibi kalsın (rmwoods Adım 53 entegre edildikten sonra değerlendirilir, opsiyonel).

### Adım 55 (orijinal: Feature engineering yeast strain)

**rmwoods yeastmap.pickle 1192 entry** → Brewmaster yeast strain normalization'ını **büyük ölçüde sağlar** (V15 manual mapping'imiz daha küçük).

**rmwoods ingredients/table yeast columns**: yeast_name, yeast_attenuation, yeast_flocculation, yeast_form, yeast_laboratory, yeast_product_id, yeast_type — **structured**, V15 81-feature'a direkt map edilebilir.

**Önerim**: Adım 55 SCOPE küçülür. yeastmap.pickle V17 retrain'de kullanılırsa manual feature engineering azalır. Bug 7 audit'in "yeast parser zayıf" şikayeti rmwoods integration ile büyük ölçüde çözülür.

---

## ⏸ KAAN TASARIM KARARLARI BEKLENİYOR

### K1: Source etiket
- A "rmwoods" tek etiket
- B "beer_ai_archive"
- **C "rmwoods_brewtoad" + "rmwoods_brewersfriend"** ← önerim

### K2: Vector kullanımı
- **A vec dosyası sakla, V17 retrain'de KULLANMA** (CORE TABLE 403K + ingredients) ← önerim
- B vec dosyası dedup için cosine similarity (793-dim)
- C vec ile alternatif kNN model (research, deploy değil)

### K3: V17 retrain stratejisi
- A Full 412K retrain (~3 saat, slug model 1.4 GB embed problem)
- B Cluster only (14-cat, ~30 dk, slug skip)
- **C Stratified subsample ~100K** (~30 dk, cluster + slug normal embed) ← önerim
- D Train + deploy YOK (research)

### K4: Pickle map kullanımı
- A V15/V16 manual mapping replace (mevcut bozulur)
- B Parallel double-clean (V15 + Rory)
- **C Sadece V17 retrain'de Rory map kullan, V15/V16 mevcut kalsın** ← önerim

### K5: Dedupe agresifliği
- A Eksak title+OG match (konservatif, ~4 dup tahmini)
- **B + Cosine similarity vec dosyası ile (orta)** ← önerim
- C + grain_bill_signature fingerprint (agresif)

### K6: src_* NaN handling
- A NaN reçeteleri DROP (kayıp ~50%+ olabilir)
- **B NaN için ingredients/table'dan OG hesapla (Tinseth/Morey-style)** ← önerim
- C Both: try ingredients calc, hesaplanamayanı drop

### K7: Adım 54 / Adım 55 yeniden değerlendirme
- **Adım 53 = rmwoods entegrasyon** (eski blog batch SKIP, plan değiştirildi)
- **Adım 54 = DIY Dog kalsın** (IBU validation, opsiyonel)
- **Adım 55 = SCOPE küçük** (yeast feature engineering rmwoods ile büyük ölçüde sağlandı)

### K8: V17 model deploy
- **A V17 deploy** (V12 motor V17'ye geçer, V16 V12 (V16) toggle'de kalır mı?)
- **B V17 train ama deploy YOK** (V16 V12 production canary, V17 ayrı dosya araştırma için)
- C V17 deploy + V16 archive (V16 model dosyaları archive/'a)

---

## ÖZET — Kaan'ın okuyacağı

🎯 **rmwoods ÇOK BÜYÜK**: 403,157 reçete (Adım 50 tahmini 171K idi, gerçek 2.4x). Brewtoad 330K + Brewer's Friend 72K. 100% BJCP standart etiketli. structured ingredient table 2.17M row.

⭐ **Pickle map'ler ALTIN**: fermmap 2793 + hopmap 1537 + yeastmap 1192 + miscmap 1455 — Brewmaster manual mapping'ten çok daha geniş ingredient normalization.

⚠ **V17 boyut problemi**: Full 412K + slug model = 1.4 GB JSON, browser embed imkansız. **Stratified subsample ~100K** ile compute manageable + boyut V16 benzeri kalır.

🔧 **Faz 3B planı revize**:
- Adım 53 = rmwoods entegrasyon (eski Brett/Sour blog batch SKIP, rmwoods kapsar)
- Adım 54 = DIY Dog opsiyonel
- Adım 55 = scope küçük (yeast normalize rmwoods'tan)

🚀 **Beklenen kazanım**: Brett/Sour 164 → 20K+ reçete (100x), 14-cat cluster top-1 +10pp+ tahmini

⏸ **8 tasarım kararı bekliyor**: source etiket, vector kullanımı, V17 retrain strateji, pickle map, dedupe, NaN handling, plan revize, deploy karar

📅 **Süre**: V17 retrain stratified subsample ~30 dk + entegrasyon ~3 saat + deploy ~30 dk = **~4 saat toplam**
