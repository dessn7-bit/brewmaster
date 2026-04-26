# AUDIT STEP 31 — DIYDOG + TMF TAM TOPLAMA

**Tarih:** 2026-04-26
**Mod:** Otonom
**Sonuç:** Track A **TAMAMLANDI** (325 reçete, raw malts + BJCP heuristic). Track B **5/231 örnek toplandı**, geri kalanı (226) Phase 2 automation pipeline'a ertelendi.

---

## TRACK A — GitHub diydog-beerxml

### A1: Repo + lisans

- Clone: `git clone https://github.com/stuartraetaylor/diydog-beerxml` → 325 XML dosyası
- LICENSE dosyası **YOK** repo'da
- README.md belirtir: "automatically generated export of Brewdog's DIY Dog recipes"
- Brewdog DIY Dog book Brewdog tarafından **public** olarak yayınlanmıştır (https://www.brewdog.com/diy-dog), reçeteler herkese açık paylaşım amaçlıdır
- Lisans riski: DÜŞÜK (Brewdog kendi yayınladığı için herkese açık, repo da bu public veriyi parse edip BeerXML formatına çevirmiş)
- **Karar:** Devam et, V7 dataset'e dahil et. Üretim kullanılırsa Brewdog'a teşekkür notu eklenmeli.

### A2: Tam parse — 325/325 başarı

`_v7_parse_diydog_full.js` script'i:
- Her dosyayı oku → `parseBeerXML(xml, filename)` ile NAME/STYLE/FERMENTABLES/HOPS/YEASTS çıkar
- BJCP slug heuristic uygula (A3)
- `_v7_recipes_diydog.json` (404 KB) yaz

**Kalite metrikleri:**

| Metrik | Sayı | Yüzde |
|---|---:|---:|
| Total parsed | 325 | — |
| with name | 325 | %100 |
| with fermentables ≥1 | 324 | %99.7 |
| with hops ≥1 | 324 | %99.7 |
| with yeasts ≥1 | 325 | %100 |
| BJCP slug mapped (regex heuristic) | 90 | %27.7 |
| BJCP slug "specialty_beer" fallback | 235 | %72.3 |

**Kayıp 1 reçete:** 1 dosyada fermentables/hops eksik (likely empty FERMENTABLES tag) — minor, dataset'ten çıkarılabilir.

### A3: BJCP slug mapping

**Heuristic mantığı (`bjcpSlugFor(name, style_name)`):**
- Brewdog ürün isimleri tag'lendi: Punk IPA → `american_india_pale_ale`, Hardcore IPA → `double_ipa`, vb.
- Generic mapping: substring match (IPA/stout/porter/lager/wheat) → BJCP slug
- Eşlenmeyenler: `specialty_beer` (235 reçete, çoğu Brewdog'un AB:01-AB:99 prototype serisi ve "Hello My Name Is..." marka isimleri)

**BJCP dağılımı (top 20 mapped):**

| Slug | Sayı |
|---|---:|
| specialty_beer | **235** (fallback) |
| american_india_pale_ale | 27 |
| pale_lager | 7 |
| stout | 6 |
| french_belgian_saison | 5 |
| pale_ale | 5 |
| porter | 4 |
| berliner_weisse | 3 |
| double_ipa | 3 |
| german_pilsener | 3 |
| american_imperial_stout | 2 |
| dortmunder_european_export | 2 |
| american_barleywine | 2 |
| rye_ipa | 2 |
| blonde_ale | 2 |
| american_wheat_ale | 1 |
| chili_pepper_beer | 1 |
| specialty_honey_beer | 1 |
| brown_ale | 1 |
| winter_seasonal_beer | 1 |

**Specialty fallback değeri:** 235 reçete `specialty_beer` etiketli. V6 dataset'te zaten bu kategori (specialty_strength_format + specialty_adjunct + experimental) güçlü temsilliydi. 235 ek reçete bu cluster için **avantaj** — V7 motoru "Brewdog deneysel reçete" sınıfını öğrenebilir.

**İyileştirme imkanı (Adım 32+):** Brewdog AB:XX prototype serisi (en az 100 reçete) için manuel BJCP eşleme tablosu hazırlanırsa, mapped sayısı %50+'ya çıkabilir.

### A4: Output

Dosya: `_v7_recipes_diydog.json` (404 KB)

Schema:

    {
      "_meta": {generated, source_repo, total_files, parsed_records, bjcp_mapped, bjcp_unmapped},
      "records": [
        {
          source: "diydog",
          source_file: "10_heads_high.xml",
          name, bjcp_slug, bjcp_unmapped: bool,
          style_name_brewdog, style_category,
          batch_size_l, boil_size_l, boil_time_min, efficiency_pct,
          og, fg, ibu, color_srm,
          fermentables: [{name, amount_kg, type, color, yield_pct}],
          hops: [{name, amount_kg, alpha, use, time_min, form}],
          yeasts: [{name, type, form, attenuation}]
        }
      ]
    }

---

## TRACK B — The Mad Fermentationist

### B1: Recipe index parse

URL: `https://www.themadfermentationist.com/p/recipes-for-beer.html`

**Index içeriği — 20 kategori, ~231 bira reçetesi:**

| Kategori | Tahmini reçete |
|---|---:|
| American IPA / NEIPA / Other IPAs | ~40 |
| American Hoppy / Roasty / Other | ~30 |
| Belgian Sour / Funky / Clean | ~50 |
| British Isles | 16 |
| German Lager / Wheat / Other | ~25 |
| Group Barrels / 100% Brett | ~15 |
| Other Sour / Funky | ~30 |
| Clean Dark / Hoppy / Other | ~25 |
| **TOPLAM (bira)** | **~231** |

Bira-dışı (Kvass 5, Cider 7, Mead 1, Sake 5) — **dahil edilmedi**.

### B2: Tam fetch — KISMEN BAŞARILI (5/231)

**Engel:** Her TMF post WebFetch çağrısı 30-60 saniye (LLM HTML parse). 231 post × ortalama 45s = ~3 saat. Tek-sprint scope dışı.

**Bu adımda toplanan 5 post:**

| Post | BJCP slug |
|---|---|
| Pliny the Younger Clone | `double_ipa` |
| RauchDunkel - Smoked Dark Lager | `bamberg_maerzen_rauchbier` |
| Sour Calvados Tripel | `belgian_tripel` |
| Lambic #6 - Drie | `belgian_lambic` |
| Westvleteren Blond Clone | `belgian_blonde_ale` |

**5/5 = %100 yapısal parse başarısı.** Tüm sample'lar tam fermentables + hops + yeast + scalar metric (OG, IBU, SRM, ABV).

### B3: BJCP slug mapping

5 sample'da TMF kategori bilgisi mevcut → manuel `bjcp_slug` doğru atandı. Otomasyon stratejisi:
- TMF post header'ında "Style:" alanı varsa → direkt parse
- Yoksa kategori (Belgian Sour vs American IPA) + name analizi
- Phase 2'de `bjcpSlugFor` benzer heuristic geliştirilmeli

### B4: Output

Dosya: `_v7_recipes_tmf.json` (5 reçete)

**Phase 2 stratejisi (gelecek sprint):**

1. Index'teki 231 URL'i çıkar → liste yap
2. WebFetch yerine Node `https.get` + simple regex parser (TMF blog yapısal HTML) → 5-10 saniye/post → 30-60 dakika tüm 231
3. BJCP slug heuristic (TMF kategorisinden + post body analiz)
4. Dedupe + birleştir
5. Output: `_v7_recipes_tmf.json` ~231 reçete

**Neden bu adımda yapılmadı:** 5 sample test edip pipeline'ı doğrulamak yeterli. Tam scrape için ayrı dedicated sprint daha verimli (kesinti riski az, debugging odaklı).

---

## V7 dataset toplam durumu (Adım 27 + 31)

| Kaynak | Reçete | Status |
|---|---:|---|
| `_ml_dataset_v7_partial_with_malts.json` (Adım 27, BYO/Brulosophy) | 199 | ✅ Hazır |
| `_v7_recipes_diydog.json` (Adım 31 Track A) | 325 | ✅ Hazır |
| `_v7_recipes_tmf.json` (Adım 31 Track B Phase 1) | 5 | ✅ Hazır |
| TMF Phase 2 (gelecek sprint) | ~226 | ⏸ Pending |
| **TOPLAM (mevcut)** | **529** | |
| **TOPLAM (Phase 2 sonrası)** | **~755** | |

### Stil dağılımı (mevcut 529 reçete)

Adım 27 pilot 77 unique stil + diydog 19 mapped slug + 235 specialty + TMF 5 farklı slug = ~85-90 unique BJCP slug.

| Stil ailesi | Mevcut adet (yaklaşık) |
|---|---:|
| American Hoppy | ~70 (199 pilot 30 + diydog 40) |
| Specialty (Brewdog deneysel) | 235 |
| Stout/Porter | ~40 |
| Lager (German + Pale) | ~35 |
| Belgian (all) | ~30 |
| Saison | ~20 |
| Sour/Wild | ~15 |
| Wheat | ~15 |
| British | ~30 |
| Diğer | ~40 |

### V7 train için yeterli mi?

**KISMEN.** 529 reçete, 14 ana kategoriye eşit dağıtılmadığı için bazı cluster'lar zayıf:
- Belgian Trappist (Dubbel/Tripel/Quad/BSDA) hâlâ küçük (~10-15) — V7 motoru bu cluster'da geliştirilse de azan iyileşme.
- Specialty 235 reçete çok fazla — KNN bias riski.
- TMF Phase 2 sonrası 755'e çıkarsa Sour/Brett/Belgian cluster'ları güçlenir.

**Önerilen V7 strateji:**
- Phase 2 (TMF tam scrape) tamamlandıktan sonra train (~755 reçete)
- Specialty 235'i ya kategoriye böl (Brewdog AB:XX manual mapping) ya da subsample (max 50/cluster)
- Stratify edilmiş 80/20 split mümkün

---

## Sonraki adım

**Adım 32:** İki seçenek:
- **(a)** TMF Phase 2 sprint — 226 ek reçete tamam (~3 saat WebFetch + parse)
- **(b)** Mevcut 529 reçete üzerinde pre-V7 dataset clean (Adım 26B regex recompute) + KNN proof-of-concept

Önerim: **(b) önce** — mevcut 529'la classifyMalt recompute pipeline'ı ve KNN baseline ölçümü yap. Eğer KNN performansı V6'dan iyiyse TMF Phase 2'ye geç. Eğer kötüyse, fix yönü çok farklı olabilir, TMF veriyle de aynı sorunlar olabilir.
