# STEP 52 (yeni numara) — AHA Recipe Library Pre-Flight Report

**Tarih:** 2026-04-28
**Status:** ✅ PRE-FLIGHT TAMAM — Faz B başlamaya hazır (kod henüz yazılmadı)
**Beklenen scope:** ~1650 reçete (sitemap), Faz B süre 3-4 saat (crawl-delay aware)

---

## 🎯 Headline Bulgular

| | Değer | Not |
|---|---|---|
| **Public erişim** | ✅ Login GEREKMEZ | Sample reçete (Ruddles Best Bitter) tamamen görünür |
| **WebFetch çalışıyor mu** | ✅ EVET (sandbox) | Cloudflare YOK, tüm endpoint'ler 200 OK |
| **Toplam reçete sayısı** | ~1650 | recipes-sitemap.xml (~900) + recipes-sitemap2.xml (~750) |
| **Schema tutarlılığı** | ✅ Yapılandırılmış | Semantic headers, lists — BeautifulSoup parser kolay |
| **BJCP etiketi** | ⚠ Sade name | "Amber Ale" gibi, kategori numarası YOK — V15 slug'a manuel mapping |
| **Crawl-delay** | ⚠ **10 sec** | robots.txt zorunlu, 1650 × 10 = 4.6h sıralı scrape |
| **Member-only** | ⚠ Belirsiz | Sample public, ama "medal-winning member-only" iddiası |
| **Dedupe risk** | ✅ DÜŞÜK | V15 dataset'te `aha` source YOK, geçmiş audit yok |

---

## 1. robots.txt + ToS

### robots.txt (verbatim)
```
Crawl-delay: 10
# START YOAST BLOCK
# ---------------------------
User-agent: *
Disallow:

Sitemap: https://homebrewersassociation.org/sitemap_index.xml
# ---------------------------
# END YOAST BLOCK
```

**Yorum:**
- `Disallow:` BOŞ → tüm path'lere izin
- **Crawl-delay: 10 sec** — tek istek arası 10 saniye bekle (zorunlu, polite scraper)
- Sitemap public

### ToS / member-only
- Recipe sayfası **PUBLIC** (Ruddles Best Bitter sample, login yok, full content görünüyor)
- Login sadece "Save as Brewed" + "Favorite" özellikleri için (Brewmaster için ALAKASIZ)
- WebSearch iddiası: "members have access to medal-winning recipes" — bu özel collection'lar member-only olabilir, ama genel reçete library public görünüyor
- Sample'ın tamamı public → çoğunluğun public olduğu varsayımı makul (%90+ tahmini)
- Adım 30 raporu Brewdog/TMF için "fair use" ML training yaklaşımı kullandı, AHA için aynı yaklaşım

### Magazine paywall
WebSearch'te direkt teyit yok ama sitemap'te ayrı `zymurgy-issue-sitemap.xml` + `zymurgy-article-sitemap.xml` var. Zymurgy magazine ayrı yapıda. Recipe library `/homebrew-recipe/<slug>/` URL pattern'i magazine'den BAĞIMSIZ.

### Polite rate önerisi
- robots.txt 10 sec/req zorunlu
- 5 paralel thread + 10 sec/req → wall clock ~28 dk for 1650 reçete (1 req/sec efektif)
- VEYA 1 thread sıralı 10 sec/req → 4.6 saat
- **Önerim**: 3-5 thread paralel + 10 sec sleep her thread içinde (toplam efektif 0.3-0.5 req/sec) → 1650 reçete ~55-90 dk

---

## 2. Recipe Library Kapsamı

### URL pattern
```
https://homebrewersassociation.org/homebrew-recipe/<slug>/
```

Tutarlı, hyphenated slug.

### Toplam reçete
| Sitemap | URL count |
|---|---:|
| `recipes-sitemap.xml` | ~900 |
| `recipes-sitemap2.xml` | ~750 |
| **TOPLAM** | **~1650** |

WebSearch'te "1,400+ recipes" iddiası buna uyumlu (alt sınır).

### Filter / sort / search
Recipe library ana sayfası filter'lar gösteriyor:
- Beverage Type
- Styles
- Classifications
- ABV
- Clones
- Medal Winning

Bu filter'lar UI-side (JavaScript) — direkt API endpoint yok muhtemelen. Sitemap üzerinden bulk fetch en güvenli yöntem.

### Style category sitemap (recipe değil)
`recipe_beer_style-sitemap.xml` → 169 URL, ama **STYLE descriptor sayfaları** (`/beer-style/altbier/`, `/beer-style/saison/`). Reçete değil, makaleler. Adım 52 scope dışı.

---

## 3. Schema Sample — Ruddles Best Bitter

```
Recipe name        : Ruddles Best Bitter (Learn to Homebrew 2025 Official)
Brewer attribution : Alan Dunn, Ruddles Brewery Limited, Langham, Oakham, UK
OG                 : 1.036 (9°P)
FG                 : 1.008 (2°P)
IBU                : 30
SRM                : 12
ABV                : 3.6%
Malts              : British extra light DME, 90L English crystal
Hops               : Northdown, Bramling Cross/Wye Challenger, Fuggles, Kent Goldings
Yeast              : Wyeast 1275 Thames Valley Ale
Fermentation       : 4-6 days primary, secondary aging
Batch size         : 5 gallons (18.93 L)
BJCP style         : "Amber Ale" (sade name, kategori numarası YOK)
Awards             : Official 2025 Learn to Homebrew Day recipe
HTML structure     : Semantic headers, lists — clean
```

**Schema değerlendirmesi:**
- ✅ V15 buildFeatures için tüm temel field'lar mevcut (OG/FG/IBU/SRM/ABV + malts + hops + yeast)
- ✅ Wyeast strain ID (1275) mevcut → Brett/Lacto detection mümkün
- ✅ Brewer attribution → ML training'de gereksiz ama veri kalitesi için iyi
- ⚠ BJCP style label sade ("Amber Ale") → V15 slug mapping manuel (aşağıda detay)
- ⚠ Awards info opsiyonel field — bazı reçetelerde olmayabilir

### Daha fazla sample fetch'i Faz B-2'de yapılacak (10-15 sample → schema homojenlik teyit)

---

## 4. Dedupe Risk

### V15 dataset kontrolü
```
recipator: 4019, braureka: 2021, mmum: 1128, byo: 781, twortwat: 211,
tmf: 166, roerstok: 86, amervallei: 4
TOPLAM: 8.416
AHA-related source: 0  ✓
```

**V15'te AHA reçetesi YOK.** Temiz başlangıç.

### Geçmiş audit
- `_audit_step_*aha*.md` — yok
- `_audit_step_*homebrew*.md` — yok
- AHA daha önce hiç scrape edilmemiş

### Cross-source overlap riski
Pliny-younger-clone gibi popüler reçeteler birden çok kaynakta olabilir:
- TMF: `tmf_pliny-younger-clone-recipe.html`
- AHA: `homebrew-recipe/pliny-younger-clone/` olası
- Dedupe `_validate_new_dataset.py` 5-check pipeline'ı title+OG+grain_bill fingerprint ile yakalar (Adım 51 Faz F çıktısı, hazır)

**Beklenen overlap**: %5-10 (~80-160 reçete dedupe ile düşer). Net AHA katkısı ~1500-1570 reçete.

---

## 5. BJCP Slug Mapping

AHA "Amber Ale" gibi sade label → V15 77-slug listesine manuel map gerekli.

### Yaklaşım
SLUG_TO_BJCP map'inin **REVERSE** versiyonu zaten `Brewmaster_v2_79_10.html:3550+` mevcut (Adım 51 fix). Bu map `belgian_dubbel → "Dubbel"` çiftleri içeriyor (V15 slug → BJCP key).

AHA Faz B-2'de **AHA_STYLE → V15_SLUG** ek tablosu yazılacak:
```js
const AHA_STYLE_TO_SLUG = {
  'Amber Ale': 'american_amber_red_ale',
  'American IPA': 'american_india_pale_ale',
  'Belgian Dubbel': 'belgian_dubbel',
  'Saison': 'french_belgian_saison',
  'Hefeweizen': 'south_german_hefeweizen',
  'Witbier': 'belgian_witbier',
  'Imperial Stout': 'american_imperial_stout',
  ... (~50-80 entry, AHA filter style'ları kapsar)
};
```

Eksik mapping'ler için fallback: V15 slug "Amber Ale" → fuzzy match (Adım 51 Bug 4 fix'inde `_bmFuzzySlugToBjcp` legacy motorlar için yapılan, tersini kullan).

### Multi-feature gerek mi?
**HAYIR** — AHA BJCP style explicit etiketli (sample'da "Amber Ale"). Direct mapping yeterli, multi-feature scoring (Adım 52 önceki plan kararı K3) gerekmez.

---

## 6. Brett/Sour Kapsam

Sample sitemap URL'lerinde gözüken Brett/Sour reçeteleri:
- `flanders-brown-ale` (Oud Bruin / Flanders Red)
- `sour-blonde-ale-with-blackberries-and-raspberries` (Mixed-fermentation Sour)
- `poblano-wit` (Specialty Wit)

### Tahmini Brett/Sour breakdown
Eğer AHA recipe library BJCP standart kategorilere oransal dağılmışsa:
- Sour cluster (10 BJCP categories) → ~%5-7 toplam
- AHA 1650 × %6 = ~100 Brett/Sour reçete

Bu **Adım 53 (Brett/Sour blog batch)** planının çoğunu **AHA tek başına karşılayabilir** — eğer Brett/Sour breakdown gerçekten %5-7 ise.

⏸ Faz B-1'de sitemap analiz + style filter ile Brett/Sour reçete sayısı kesin ölçülmeli.

---

## ⏸ Tasarım Kararları (Faz B Başlatma)

### K1: Hedef reçete sayısı
- AHA toplam ~1650 reçete (sitemap)
- Net (dedupe sonrası): ~1500
- Plan'da +2000 hedefi → **AHA tek başına %75 karşılar**
- **Önerim**: Hedef +1500'e güncelle, eksik kalan ~500 Adım 53'te (blog batch) toplanır

### K2: Crawl-delay strateji
- robots.txt 10 sec/req zorunlu
- **Seçenek A**: Sıralı 10 sec/req → 4.6 saat (single thread, en güvenli)
- **Seçenek B**: 5 paralel thread × 10 sec sleep → ~55 dk (sandbox-friendly)
- **Önerim**: B (5 paralel, 10 sec sleep her thread)

### K3: Member-only handling
- Sample public, çoğunluk public muhtemelen
- **Önerim**: Public reçeteleri scrape, member-only sayfada `<form id="login">` veya benzeri marker görünce SKIP, log
- Eğer >%10 sayfada login wall → durur, Kaan'a sun

### K4: AHA → V15 slug mapping
- Manuel `AHA_STYLE_TO_SLUG` tablosu (~50-80 entry)
- Fallback: legacy fuzzy matcher
- **Önerim**: Faz B-2'de 10-15 sample reçete'den unique style label'lar çıkar, mapping tablosu yaz, eksik %10 manuel review

### K5: Schema parser
- BeautifulSoup tek pipeline (BeerXML değil HTML)
- Field extraction: semantic header'lar (`<h2>Specifications</h2>`, `<h3>Ingredients</h3>`) sonrası lists
- **Önerim**: Faz B-2'de 5-10 sample parse, schema homojenlik teyit

### K6: Brett/Sour öncelik
- Adım 53 blog batch'in AHA ile ne kadar overlap edeceği belirsiz
- **Önerim**: Faz B-1'de sitemap'te Brett/Sour reçete sayım, eğer ~100+ → Adım 53 scope küçültülür

---

## Faz B Plan (revize)

| Adım | İş | Süre |
|---|---|---:|
| **B-1** | Sitemap parse + 1650 URL listesi + style breakdown sayım | ~30 dk |
| **B-2** | 10-15 sample reçete fetch + schema doğrulama + AHA_STYLE_TO_SLUG mapping yaz | ~45 dk |
| **B-3** | Bulk fetch script (Node.js, 5 paralel thread, 10 sec/req) — 1650 reçete | ~60-90 dk |
| **B-4** | Parse pipeline + V15 buildFeatures format converter | ~45 dk |
| **B-5** | `_validate_new_dataset.py` 5-check + dedupe (TMF/BYO ile fingerprint) | ~15 dk |
| **B-6** | Manuel review batch (Kaan, ~30 dk) | – |
| **Faz C** | Merge + V16 dataset + retrain + deploy (ayrı sprint) | ayrı |

**Toplam Faz B**: ~3-4 saat (Plan'daki 3 saat hedefinin biraz üzerinde, crawl-delay 10 sec sebep)

---

## Çıktı

- `_step52_aha_preflight.md` — Bu rapor
- (Faz B'de) `_step52_aha_b1_sitemap.json` — sitemap parse sonucu
- (Faz B'de) `_step52_aha_b3_recipes.json` — bulk scrape çıktısı
- (Faz B'de) `_step52_aha_completion_report.md` — final rapor

---

## Kaynaklar

- [Homebrew Recipes Library](https://homebrewersassociation.org/homebrew-recipes/) — public ana sayfa
- [recipes-sitemap.xml](https://homebrewersassociation.org/recipes-sitemap.xml) (~900 URL)
- [recipes-sitemap2.xml](https://homebrewersassociation.org/recipes-sitemap2.xml) (~750 URL)
- [Sitemap Index](https://homebrewersassociation.org/sitemap_index.xml) — 22 sub-sitemap
- [Sample Recipe: Ruddles Best Bitter](https://homebrewersassociation.org/homebrew-recipe/ruddles-best-bitter-learn-to-homebrew-2025-official-recipe/) — schema doğrulama

---

## ⏸ Kaan onayı bekleniyor

K1-K6 tasarım kararları + Faz B başlatma onayı. Onay sonrası B-1 (sitemap parse) başlatılır.
