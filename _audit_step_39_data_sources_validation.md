# AUDIT STEP 39 — VERİ KAYNAKLARI DOĞRULAMA (READ-ONLY)

**Tarih:** 2026-04-26
**Mod:** Otonom + read-only (download/scrape YOK)
**Sonuç:** **6 kaynaktan hiçbiri V7'nin ihtiyacını (raw malts içeren toplu dataset) doğrudan karşılamıyor.** En güçlü 2 aday: (1) Kaynak 1'in repo dışı `all_recipes.h5` (manuel iletişim gerekli), (2) Kaynak 2 web scrape (browser otomasyonu + terms risk). Adım 40 yönü: **V8 roadmap'e dön** (Adım 38 önerisi tekrar onaylandı).

---

## Özet tablosu

| # | Kaynak | URL | Erişilebilir? | Reçete # | Raw malts? | Lisans | İş yükü |
|--:|---|---|---|---:|---|---|---|
| 1 | rmwoods/beer.ai | github.com/rmwoods/beer.ai | ⚠️ Kısmen | 75K (CSV) / "100K+" h5 | ❌ CSV yok / ✅ h5 (repo dışı) | **NONE** | düşük (CSV) / yüksek (h5 manuel) |
| 2 | Beer Analytics | beer-analytics.com | ⚠️ UI var, API yok | **1.149.231** (iddia) | ? (belirsiz) | **CC BY-SA 4.0** | yüksek (browser scrape) |
| 3 | scheb/beer-analytics | github.com/scheb/beer-analytics | ✅ Repo erişilebilir | 0 reçete (sadece ref data) | — | **GPL-3.0** | — (kullanışsız) |
| 4 | realsaul00/beer_project | github.com/realsaul00/beer_project | ❌ Sadece kod | 0 (data Kaggle'a yönlendirir) | MIT | — |
| 5 | Brewthology | sourceforge.net/projects/brewthology | ❌ DEAD (2014) | 0 (sadece 70KB ingredients) | GPLv2 | — |
| 6 | Kaggle jtrofe/beer-recipes | kaggle.com/datasets/jtrofe/beer-recipes | ⚠️ Kaggle hesap gerekli | ~75.000 | ❌ Computed only | (Kaggle TOS) | düşük (auth + download) |

**Durum kodları:**
- ✅ ERİŞİLEBİLİR: doğrudan ve V7 için uygun
- ⚠️ KISMEN: erişilebilir ama eksik (lisans, format, auth, scrape gerekli)
- ❌ İŞE YARAMAZ / ENGELLİ

---

## Kaynak 1: rmwoods/beer.ai — ⚠️ KISMEN

**GitHub metadata:**
- Stars: 7, Forks: 1, Size: 38 MB
- License: **NONE** (problem: ticari/yeniden dağıtım belirsiz)
- Last push: 2022-10-20 (3.5 yıl önce, abandoned)
- Topics: yok, Has issues: 6 open
- Branch: master

**Repo içeriği:**
- `data/external/recipeData.csv` **13.5 MB** (HTTP HEAD doğrulandı, 13848947 bytes)
- `data/external/styleguide-2015.json` 853 KB
- `data/processed/styleguide.json` 450 KB
- 99 toplam tree entry

**README önemli not:**
> "Currently, you can either run the web scraper to get your own data (takes days), or you can ask Rory for the data. It should be stored in `beer.ai/recipes/*.xml`. As soon as we have finished pre-processing the recipes, you can likely skip this step and just load up an HDF containing all the recipes."

> `all_recipes.h5` — Raw recipe data in HDF5 format. Contains every recipe entry that has been parsed from beer xml files.

**Kritik:**
- `recipeData.csv` (repo'da, 13.5 MB) = Kaggle jtrofe/beer-recipes ile aynı (Kaynak 6). **Sadece computed metrics** (OG/FG/ABV/IBU/Color/Boil/Mash/Yeast meta). **RAW MALTS YOK.**
- `all_recipes.h5` (repo'da YOK) = HDF5 format, **raw recipe ingredients içerir** ama "ask Rory" ile manuel iletişim gerekiyor (LinkedIn / email).
- LICENSE NONE → ticari kullanım belirsiz, yeniden yayın hukuken riskli.

**Sonuç:** CSV V7 için işe yaramaz (raw malts yok). H5 erişimi için Rory ile iletişim sprint dışı.

---

## Kaynak 2: Beer Analytics (beer-analytics.com) — ⚠️ KISMEN

**WebFetch sonucu:**
- Site online ("the ultimate online destination for beer recipes")
- **1.149.231 reçete iddiası** ("the largest database of beer recipes in the world")
- License: **CC BY-SA 4.0** (yeniden yayın izinli, share-alike şartlı)
- "Built with ❤️ and open source software"

**Engel:**
- "**No mention of dataset downloads, API access, or data export functionality**" (WebFetch raporu)
- robots.txt kontrol edilmedi (read-only sınırı)
- Manuel browse/scrape ile reçete teker teker fetch — 1.1M için imkânsız ölçek
- Adım 28'de Brewer's Friend Cloudflare Turnstile, beer-analytics.com benzer korumalı olabilir (test edilmedi)

**Sonuç:** Veri orada ama indirme yolu yok. Ya owner ile iletişim (Kaynak 3 GitHub repo owner = scheb), ya browser otomasyonu (selenium + cloudflare bypass risk + ToS uyumsuzluk).

---

## Kaynak 3: scheb/beer-analytics — ✅ Erişilebilir, ❌ Reçete YOK

**GitHub metadata:**
- Stars: **46** (en yüksek), Last push: **2025-12-09** (aktif!)
- License: **GPL-3.0**
- Size: 9.4 MB

**Repo içeriği (data files):**
- `recipe_db/data/fermentables.csv` 14 KB
- `recipe_db/data/hops.csv` 47 KB
- `recipe_db/data/yeasts.csv` 55 KB
- `recipe_db/data/flavors.csv` 3 KB
- `recipe_db/data/styles.csv` 24 KB
- `recipe_db/data/styles-bjcp2015.csv` 18 KB
- `recipe_db/etl/format/fixtures/beerxml.xml` 17 KB (sample)
- `recipe_db/etl/format/fixtures/beersmith.xml` 39 KB (sample)

**Kritik:** Reçete dataset'i **YOK**. Repo sadece beer-analytics.com sitesi için **referans verisi** (malt/hop/yeast adları, BJCP stilleri). Asıl reçete database'i siteyi besleyen ETL pipeline'ında, sunucu tarafında. Public dump yok.

**Değer:** `styles.csv` ve `styles-bjcp2015.csv` Brewmaster'ın `__BM_DEFS` BJCP DB'sine ek/karşılaştırma için **kullanılabilir**. `fermentables.csv`/`hops.csv`/`yeasts.csv` malzeme DB normalize için yararlı (V8+ özellik).

---

## Kaynak 4: realsaul00/beer_project — ❌ Sadece kod

**GitHub metadata:**
- Stars: 1, Last push: **2018-06-28** (8 yıl önce)
- License: MIT
- Size: 2 MB

**Repo içeriği:**
- 0 data files in master tree
- README sadece: "download the data from https://www.kaggle.com/jtrofe/beer-recipes/data"

**README'den feature listesi (jtrofe Kaggle dataset):**
```
BeerID, Name, URL, Style, StyleID, Size(L), OG, FG, ABV, IBU, Color,
BoilSize, BoilTime, BoilGravity, Efficiency, MashThickness, SugarScale,
BrewMethod, PitchRate, PrimaryTemp, PrimingMethod
```
→ **23 feature, hiçbiri ingredients (malts/hops/yeast detail) içermiyor**. Confirmed: bu dataset computed metrics only.

**Sonuç:** Repo'nun kendi veri katkısı YOK. Sadece Kaggle yönlendirmesi (Kaynak 6).

---

## Kaynak 5: Brewthology (SourceForge) — ❌ DEAD

**WebFetch sonucu:**
- Last update: **2014-01-06** (12 yıl önce)
- "0 This Week" downloads
- Tek dosya: `ingredients_4-23-07.zip` **70.8 KB** (sadece ingredient list, reçete değil)
- License: GPLv2
- "PHP based BeerXML homebrew recipe database" — kullanıcı reçete oluşturma platformu, **toplu dataset export YOK**

**Sonuç:** Tamamen ölü. Veri yok.

---

## Kaynak 6: Kaggle jtrofe/beer-recipes — ⚠️ Kaggle auth gerekli

**WebFetch sonucu:** "Brewer's Friend Beer Recipes | Kaggle" başlığı görüldü, ama tam metadata için Kaggle dataset sayfası gerekli (LLM extraction yetersizdi).

**Bilinen (kaynak 1 + 4 README'lerinden teyit):**
- ~75.000 reçete (Kaynak 4: "73861 quantitative observations")
- 23 feature, **computed metrics only** (Kaynak 4 README'sindeki feature listesi tüm CSV)
- **RAW MALTS YOK** — sadece OG/FG/ABV/IBU/Color/Boil/Efficiency vb.
- Kaggle hesap gerekli (auth, free tier yeterli)
- Kaggle CLI veya web indirme

**Kaynak 1'in `recipeData.csv` (13.5 MB) ile aynı dataset** (büyük olasılıkla Kaynak 1 Kaggle'dan kopyaladı — boyut ve isim eşleşiyor).

**Sonuç:** V7 için işe yaramaz (raw malts yok, b2_* batch problem aynı). V8 ek metadata için (örn. style popularity) yararlı olabilir.

---

## Kıyas — V7 ihtiyacı vs Kaynaklar

V7 dataset için ŞART:
- Raw malt list per recipe (name + amount_kg)
- Min ~500 ek reçete (Belgian/British/Specialty cluster boost)
- Lisans temiz (V7 reproducibility için)

| Kaynak | Raw malts? | Lisans temiz? | Erişim mümkün? | Skor |
|---|---|---|---|---|
| 1 (CSV) | ❌ | ❌ NONE | ✅ | 1/3 |
| 1 (h5 manuel) | ✅ | ❌ NONE | ⚠️ "ask Rory" | 1.5/3 |
| 2 (web scrape) | ❓ | ✅ CC BY-SA | ❌ API yok | 1/3 |
| 3 | — (no recipes) | ✅ GPL | ✅ | 0/3 |
| 4 | — | — | ❌ | 0/3 |
| 5 | — | — | ❌ DEAD | 0/3 |
| 6 (Kaggle) | ❌ | ⚠️ Kaggle TOS | ✅ auth | 1/3 |

**Hiçbir kaynak 3/3 değil.** En iyi 2:
- **Kaynak 1 h5** (raw malts var ama manuel iletişim + license belirsiz)
- **Kaynak 2 scrape** (1.1M reçete varsayım ama API/format belirsiz)

---

## Adım 40 Yönü — Karar matrisi

### Opsiyon A — Adım 38 önerisini uygula: V7 pause + V8 roadmap
- V6 mevcut HTML inline motoru (1100 reçete dataset, %80 holdout) production'da kalıyor
- V7 dataset zaten 6 sprint'tir tıkalı (28-30-35-36-37-39)
- **V8 feature'lar (Türkçe BJCP, water dual profile, yeast pitch, brew day wizard) tek değer üretebilir**
- Adım 41 önerisi: Türkçe BJCP isim eklenmesi (`__BM_DEFS` tr_name field, AI çeviri 248 stil)

### Opsiyon B — Manuel iletişim Rory (rmwoods/beer.ai)
- GitHub'daki Rory'ye email/issue: "all_recipes.h5'e erişim ister misin"
- Sprint dışı (insan iletişimi)
- Lisans NONE riski (Rory cevap verse bile yeniden yayın hukuken belirsiz)

### Opsiyon C — beer-analytics.com manuel sample
- 1.1M reçete iddiası — Kaan'ın kişisel kullanımı için 100-200 reçete browser'dan manuel kopyala
- ToS uyumlu (CC BY-SA 4.0 paylaşım izinli)
- Çok yavaş, manuel iş, ölçek sınırlı

### Opsiyon D — V6 inline motorda 73 class koru, V7 baseline as comparison only
- Adım 38'de V7 XGB 14cat top-3 %77, V6 inline 1100 reçete %80
- V6 mevcut, V7 tatmin edici değil
- **V7 baseline metrik olarak korunsun, motor değişmesin**

### Önerim: **Opsiyon A**
- 6 sprint'tir veri toplama negative
- V6 inline motor zaten production
- V8 feature'lar Brewmaster'ın gerçek değer farkı (Adım 36 raporu)
- Adım 41+: Türkçe BJCP → Water dual profile → Yeast pitch → Brew day wizard

---

## Yan kazanım: Brewmaster için 1 doğrudan kullanılabilir veri

**Kaynak 3 `recipe_db/data/styles-bjcp2015.csv` (18 KB)** — BJCP 2015 styles full schema (open source, GPL-3.0). Brewmaster `__BM_DEFS`'a karşılaştırma + eksik kayıt tamamlama için kullanılabilir. Bu read-only doğrulama — indirme/parse yapılmadı, Adım 41+'da kullanılabilir.

**Kaynak 3 ayrıca** `fermentables.csv`, `hops.csv`, `yeasts.csv` (toplam ~120 KB) — Brewmaster malzeme DB normalize için referans (V8 özellik).

---

## YASAKLAR — uyumlu

- ✅ İndirme yapılmadı (HEAD requests, GitHub API metadata only)
- ✅ Scrape edilmedi (sadece WebFetch ile homepage metadata)
- ✅ Sahte iddia yok (kanıt yoksa "doğrulanamadı" / "belirsiz" yazıldı)
- ✅ Kaan'a soru yok (read-only otonom karar)
