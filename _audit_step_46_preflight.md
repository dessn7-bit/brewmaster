# AUDIT STEP 46 PRE-FLIGHT — 5 Source Cluster-Balanced Expansion

**Tarih:** 2026-04-27
**Süre:** ~45 dk
**Sonuç:** **2 GO, 2 ORTA, 1 NO-GO.** Kaggle hesap auth gerek (Kaan), diğerleri otonom çalışır.

---

## Özet tablo

| # | Kaynak | Durum | Reçete (raw) | Schema | GO/NO-GO | Engel/Notu |
|---|---|---|---:|---|---|---|
| 1 | **Kaggle jtrofe/beer-recipes** | ✅ ALIVE | **75,000** | CSV (BF export) | 🟡 GO (auth) | Kaan'ın `kaggle.json` API token gerek |
| 2 | Brewing Classic Styles ZIP (Jamil) | ❌ DEAD | 0 | - | ❌ NO-GO | 404, link relocated/removed |
| 3 | **Mad Fermentationist** | ✅ ALIVE | **823 post** (~250 recipe) | Free-form blog, regex parse | 🟡 ORTA | NLP regex riski, sample doğrula |
| 4 | AHA Public Archive | ✅ ALIVE | ~50-100 public | Algolia search + memberclicks oauth | 🟡 SINIRLI | Çoğu reçete üye girişi ister |
| 5 | **Brulosophy** | ✅ ALIVE | ~150-200 | WP post + structured | 🟢 GO | Açık, robots OK, schema readable |

---

## 1. Kaggle jtrofe/beer-recipes — 🟡 GO (auth gerek)

**URL:** https://www.kaggle.com/datasets/jtrofe/beer-recipes
**Status:** Sayfa **200 OK** (alive) — başlık "Brewer's Friend Beer Recipes | Kaggle"
**Description:** "75,000 homebrewed beers with over 176 different styles" — **Adım 39'da yanlış 404 denmiş, dataset hâlâ canlı.**

### Download yolu
- Kaggle CLI gerek: `pip install kaggle` + `~/.kaggle/kaggle.json` token
- Manuel browser download: kaggle.com'da "Download" butonu (Kaan login)
- Direct API URL'ler 403/404: `kaggle-data-sets/jtrofe/beer-recipes/recipeData.csv` → 403 (auth)

### Schema (description + sample preview)
- CSV format
- **Brewer's Friend export** — yani aslında bizim peşinde olduğumuz `/v1/recipes` JSON'un static export'u
- Kolonlar (BF schema): `id, title, brewmethod, styleid, batchsize, og, fg, abv, ibu, srm, fermentables, hops, yeasts, mashprofile, ...`
- BJCP style numbering BF'in eski (2008-2018) sistemi — V8 hierarchy'e map gerekecek
- Public + private flag — **CSV'de `public` field var olabilir** (filtreleme için kritik)

### Tahmini
- 75,000 raw → cluster-targeted filter (BJCP 21 IPA SKIP) → ~25-35K candidate
- bad_og/bad_fg/extract filter → ~15-20K
- Dedupe V10.1 ile (BF source ile çakışma olası) → **net 8-12K yeni reçete tahmini**

### Action item Kaan
1. https://www.kaggle.com → login (free hesap)
2. Settings → API → "Create new API token" → `kaggle.json` indir
3. Bana yapıştır (key+username), `.env`'de saklarım
4. Veya: tarayıcıdan dataset zip'i indir → bana yolla (~50-100 MB)

---

## 2. Brewing Classic Styles ZIP — ❌ NO-GO

**URL:** https://winning-homebrew.com/wp-content/uploads/2021/03/jamilsrecipeindexexcel2007.zip
**Test:** 301 → 301 → **404** (link circular redirect, eventual 404)

WordPress upload yolu eski path'e (`/home/sites/...`) yönlendiriyor, gerçek dosya silinmiş. Site canlı ama bu zip kaldırılmış.

**Alternatif:** Jamil Zainasheff "Brewing Classic Styles" kitabı (2007) — fiziki/Kindle satılıyor (~$25 USD), ama dijital reçete listesi public download yok.

**Skip.** 70-80 reçete kayıp ama ML için ufak.

---

## 3. Mad Fermentationist — 🟡 ORTA (NLP riski)

**URL:** https://www.themadfermentationist.com/
**robots.txt:** OK (sadece /search disallow)
**Sitemap:** https://www.themadfermentationist.com/sitemap.xml

### Sayım
- /p/recipes.html landing page **404** (URL kaldırılmış)
- Sitemap: **2 page, toplam 830 post URL**
- Year breakdown:
  - 2007: 69, 2008: 84, 2009: 99, 2010: 132, **2011-2017: ~500** (en aktif dönem)
  - 2018-2024: 53 (azalmış)

### Schema (sample fetch: 2018/12 fermented-acorn-sour-brown.html)
Post HTML free-form blog. Regex extract'lanabilir alanlar:
```
SRM: 18.0
IBU: 2.0
OG: 1.046
FG: 1.010
ABV: 4.7%
```

Recipe-level metadata sample post'tan çıkarılabildi. Ama:
- Recipe **header consistency belirsiz** (eski post'larda farklı olabilir)
- Grain bill / hop schedule **free-form text** ("Mash 6lb British pale at 152F for 60 min...")
- 830 post → ne kadarı reçete vs blog post (ratio bilinmez)

### Tahmini
- 830 post × ~%30-40 reçete bilgisi içerir = **250-330 candidate**
- Regex parse → **150-220 başarılı parse** (bazı eski format farklılığı kaçar)
- Sour cluster için ⭐⭐ KRİTİK kaynak (Tonsmeire uzman)

### Risk
- Free-form text NLP regex stable mı belirsiz
- Sample 5-10 recipe parse → manuel doğrula gerek (Aşama 2'de)
- Pattern başarısız olursa kaynak skip

### Action: Aşama 2'de smoke test 10 sample, pct_other / parse fail ratio ölç

---

## 4. AHA Public Archive — 🟡 SINIRLI

**URL:** https://homebrewersassociation.org/
**robots.txt:** Crawl-delay 10, allow her şey, sitemap_index var

### Bulgular
- `/category/homebrew/recipes/` → **404** (yeni URL pattern var)
- `/homebrew-recipes/` → 200 ama **Algolia search-based** (algoliasearch@4.24.0 detected)
- `/top-50-commercial-clone-beer-recipes/` → 200 ama listing sayfa, individual recipe member-locked
- **Çoğu link `homebrewer.memberclicks.net/oauth/v1/authorize`** → ÜYE GİRİŞİ ZORUNLU

### Algolia keys
Page'de Algolia config (appId/apiKey) **gömülü değil** — server-side render veya inline script'lerden gelmiş. Public'ten Algolia API erişim direkt mümkün değil.

### post-sitemap.xml
- 939 URL (post-sitemap.xml)
- Recipe-related URL'ler **how-to-brew article'ları**, individual recipe değil
- Örnekler: `/how-to-brew/5-must-try-saison-recipes-brew-home/` → article, içinde 5 reçete embedded olabilir

### Realistic
- Public erişilebilir reçete sayısı **~20-50 tahmini** (article içine gömülü, manuel parse zor)
- Member-only kaynaklar (Recipe of the Week vb.) **kapalı**
- AHA = ⚠️ Az kazanım, yüksek dev iş

**Karar:** **SKIP** önerisi. ROI düşük. Aşama 2'de zaman varsa cherry-pick yapılabilir ama önceliklendirmiyorum.

---

## 5. Brulosophy — 🟢 GO

**URL:** https://brulosophy.com/recipes/
**robots.txt:** OK (sadece WP cache disallow)
**Sitemap:** https://brulosophy.com/sitemap_index.xml (post-sitemap.xml + post-sitemap2.xml)

### Sayım
- Recipes landing page (285 KB) — listing card'lar
- Initial regex: 11 unique slug bulundu
- Tam liste için sitemap parse + listing pagination gerek
- **Tahmin: 100-200 recipe** (Brülosophy 10 yıl post arşivi)

### Sample post: `/recipes/whatre-we-here-for/`
- **200 OK, 290 KB**
- Title: "What're We Here For? Cal Common - Brülosophy"
- WordPress post structure
- Recipe schema:
  - "Style:" header, "Stats" table (OG/FG/IBU/SRM/ABV)
  - "Grains and Sugars" section (table format)
  - "Hops" section (table)
  - "Yeast:" section
  - "Mash:" + "Fermentation:" sections

### Schema güvenilirliği
Sample post'ta structured tables var (parse readable). NLP regex değil, table parsing — **Mad Fermentationist'ten çok daha güvenli.**

### Tahmini
- 100-200 post → **80-150 başarılı parse**
- Brülosophy "exBEERiment" focus — split-batch comparisons. Bazıları bira değil cider/mead/seltzer (filter gerek)
- Sour cluster çok az (Brulosophy IPA-heavy), Specialty/Adjunct kuvvetli

---

## Aşama 2 önerisi (Kaan onayı sonrası)

### Sıralı strateji (en yüksek ROI'dan düşüğe)

**1. Kaggle (75K, en büyük)** — Kaan'ın kaggle.json gerek:
- Sen `kaggle.json` token'ını yolla → ben indiririm
- Stratified filter (BJCP 26-23-17-25B-24-29-13-11), American Hoppy SKIP, Stout cap 1500
- Tahmini ~10-15K net yeni reçete (V10.1'den +%125-185)
- Süre: 30 dk download + 30 dk parse + 30 dk dedupe = ~1.5 saat

**2. Brulosophy (~150) — otonom GO:**
- Sitemap parse + bulk fetch
- Schema güvenli (table-based)
- ~30 dk (fetch + parse)

**3. Mad Fermentationist (~250) — otonom + smoke test:**
- 10 sample regex doğrula → pattern stable mı
- Stable ise full bulk fetch (~20 dk)
- Sour cluster için kritik

**4. AHA — SKIP** (member-locked, ROI düşük)

**5. Jamil ZIP — SKIP** (404)

### Toplam tahmin

| Kaynak | Net yeni | Süre |
|---|---:|---:|
| Kaggle | 10,000-15,000 | ~1.5 saat |
| Brulosophy | 80-150 | 30 dk |
| Mad Fermentationist | 150-220 | 30-40 dk |
| **TOPLAM** | **10,000-15,500** | **~3 saat** |

V11 dataset hedef: V10.1 (8061) + ~12,000 = **~20,000 reçete**

Cluster cap sonrası net (American Hoppy already kapped): ~14,000-16,000.

Beklenen V11 metrikler (kullanıcının tahminiyle uyumlu):
- Top-1: %69 → %72-75
- Top-3: %89 → %91-93
- Belgian Quadrupel test n: 3 → 15-20 (production-ready)
- Belgian Strong/Trappist top-1: %69 → %75-80

---

## Karar — Kaan onayı bekliyor

### 🟢 RECOMMENDED: Plan A
- **Kaggle (önce)** + Brulosophy + Mad Fermentationist
- ~3 saat sprint
- Gerek: Kaan'ın `kaggle.json` token'ı

### 🟡 ALTERNATIF: Plan B (Kaggle olmadan)
- Sadece Brulosophy + Mad Fermentationist
- ~1 saat sprint
- ~250-370 net yeni reçete (sınırlı kazanım)
- V11 dataset 8061 → ~8400 (+%4)

### 🔴 SKIP: Pas
- V10.1 zaten 8061 reçete, %89 top-3, Belgian Quadrupel ilk doğru
- Adım 47 (feature engineering: brett yeast lookup, Specialty sub-categorize) ML kazancı daha yüksek olabilir

---

## Çıktılar

- `_audit_step_46_preflight.md` — Bu rapor
- `_brulo_recipes_listing.html`, `_brulo_sample.html`
- `_madferm_sm{1,2}.xml`, `_madferm_post_urls.json` (823 URL)
- `_aha_*.html` samples
- `_brulo_post_sm.xml`, `_brulo_post_sm2.xml`

DUR. Onayını bekliyorum.
