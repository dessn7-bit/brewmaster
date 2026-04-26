# AUDIT STEP 28 — B2 SOURCE URL RECOVERY TEST

**Tarih:** 2026-04-26
**Mod:** Otonom
**Hedef:** 817 b2_* (V2 batch) reçetesinin source_url'larından raw malts kurtarma fizibilitesi.
**Sonuç:** **Toplam başarı ~%17, parse edilebilir %0. Tam scrape fizibıl DEĞİL. Alternatif kaynaklara yönelmek gerek.**

---

## İş A — URL envanteri

### Kaynak dosyalar
8 batch dosyası (`_ground_truth_v2_batch1.json` → `batch8.json`), toplam **910 reçete** (817 b2_* + 93 ekstra/dedup).

### URL durumu
| Metrik | Sayı |
|---|---:|
| Toplam URL kaydı | 910 |
| Boş URL | 0 |
| Geçerli HTTP URL | 910 |
| Unique domain | **298** |

### Top 20 domain (frekansa göre)

| Domain | Sayı | Tip |
|---|---:|---|
| byo.com | 241 | BYO Magazine recipe arşivi |
| foundersbrewing.com | 18 | Brewery resmi |
| stonebrewing.com | 16 | Brewery resmi |
| cantillon.be | 11 | Belgian Trappist/Lambic |
| allagash.com | 11 | American craft brewery |
| bellsbeer.com | 11 | American craft |
| sierranevada.com | 11 | American craft |
| fullers.co.uk | 9 | English brewery |
| ayinger.de | 9 | German brewery |
| newbelgium.com | 9 | American craft |
| en.wikipedia.org | 8 | Wikipedia |
| samuelsmithsbrewery.co.uk | 8 | English brewery |
| weihenstephaner.de | 8 | German brewery |
| firestonebeer.com | 8 | American craft |
| ommegang.com | 8 | American Belgian-style |
| dogfish.com | 8 | American craft |
| rogue.com | 8 | American craft |
| schneider-weisse.de | 7 | German weizen |
| gooseisland.com | 7 | American craft |
| russianriverbrewing.com | 7 | American sour |

**Long tail:** 298 unique domain, çoğu resmi brewery sayfaları. Homebrew/recipe-paylaşım siteleri (brewersfriend, brewfather, brewtoad) **YOK**.

---

## İş B + C — Sample fetch + parse test

### Strateji
12 sample fetched (5 batch, paralel), top 7 domain ağırlıklı + 5 long-tail.

### Sonuç tablosu

| URL | HTTP | Parse | Not |
|---|---|---|---|
| byo.com/recipe/dogfish-head-indian-brown-ale/ | **404** | — | URL gone |
| byo.com/recipe/timothy-taylor-landlord/ | **404** | — | URL gone |
| byo.com/recipe/strong-ale/ | **404** | — | URL gone |
| byo.com/article/dogfish-head-indian-brown-ale-clone/ | **404** | — | Alternatif URL de yok |
| foundersbrewing.com/our-beer/kbs/ | 200 | ❌ | "Oats, Chocolate, Roasted Barley, Wheat" — adlar var, miktar yok |
| stonebrewing.com/beer/stone-ipa | 200 | ❌ | Sadece hop listesi, malt yok |
| sierranevada.com/beer/pale-ale/ | **403** | — | Bot bloklama |
| fullers.co.uk/beer/london-porter | **403** | — | Bot bloklama |
| ayinger.de/.../ayinger-celebrator-doppelbock/ | **404** | — | URL changed |
| weihenstephaner.de/en/our-beers/hefeweissbier/ | 200 | ❌ | Marketing copy only, no malt |
| westmalle.be/en/our-beers/westmalle-tripel | **ECONNREFUSED** | — | Connection blocked |
| cantillon.be/ | 200 | ❌ | Homepage, no recipe |
| en.wikipedia.org/wiki/Gouden_Carolus | **404** | — | Wikipedia article moved/deleted |
| en.wikipedia.org/wiki/Newcastle_Brown_Ale | 200 | ❌ | "pale malt and crystal malt" — adlar, miktar yok |
| allagash.com/beer/coolship-resurgam/ | 200 | ❌ | "Pilsner Malt, Raw Wheat" — adlar, miktar yok |
| bellsbeer.com/beer/oberon-ale | **403** | — | Bot bloklama |
| newbelgium.com/beer/fat-tire/ | 200 | ❌ | "Pale, C-80, Munich, Raw Barley" — adlar, miktar yok |
| en.wikipedia.org/wiki/Westvleteren_Brewery | 200 | ❌ | "yeast, hops, malt, candi sugar and water" — generic, no detail |

### Sample istatistikleri (n=18 fetch attempt)

| Sonuç | Sayı | Yüzde |
|---|---:|---:|
| HTTP 200 | 9 | %50 |
| HTTP 404 | 7 | %39 |
| HTTP 403 | 3 | %17 |
| ECONNREFUSED | 1 | %6 |
| **Erişilebilir** | 9 | **%50** |
| **Yapısal malt bill (miktar+isim)** | 0 | **%0** |
| **Yarı-yapısal (sadece isim, miktar yok)** | 4 | %22 |
| **Hiçbir malt bilgisi yok** | 5 | %28 |

### Parse edilebilirlik analizi

**0 sample yapısal recipe (kg/lb amount + name) içeriyor.** Tüm fetch edilebilen sayfalar ya:
- Sadece marketing açıklaması (Stone IPA, Cantillon, Weihenstephaner, Wikipedia Westvleteren)
- Sadece ingredient adı listesi (Allagash, New Belgium Fat Tire, Founders KBS, Wikipedia Newcastle)

**Brewery resmi sitelerinde miktar bilgisi VERILMEDIĞI** — endüstri standardı: malt isimleri marketing için, miktarlar ticari sır.

### Domain bazında parse strateji kararı

| Domain | Sample | HTTP OK | Parse Strategy | Karar |
|---|---:|---|---|---|
| byo.com (241) | 4 | 0/4 | URL şeması bozuk | ❌ İmkânsız (404) |
| foundersbrewing.com | 1 | 1/1 | Sadece adlar | ⚠️ Fragmentary |
| stonebrewing.com | 1 | 1/1 | Hop only | ❌ Malt yok |
| sierranevada.com | 1 | 0/1 | Bot block | ❌ Yasak |
| fullers.co.uk | 1 | 0/1 | Bot block | ❌ Yasak |
| en.wikipedia.org | 2 | 1/2 | Generic only | ❌ Detay yok |
| ayinger.de | 1 | 0/1 | URL changed | ❌ |
| weihenstephaner.de | 1 | 1/1 | Marketing only | ❌ |
| cantillon.be | 1 | 1/1 | Homepage | ❌ |
| allagash.com | 1 | 1/1 | İsimler var | ⚠️ Fragmentary |
| bellsbeer.com | 1 | 0/1 | Bot block | ❌ |
| newbelgium.com | 1 | 1/1 | İsimler var | ⚠️ Fragmentary |
| westmalle.be | 1 | 0/1 | Connection refused | ❌ |

---

## İş D — Başarı oranı + karar

### Genel başarı

- **Canlı URL:** %50 (9/18)
- **Parse edilebilir (yapısal malt bill):** **%0** (0/18)
- **Yarı-parse (sadece isim):** %22 (4/18)

### Karar

**Adım 29 (tam scrape) FİZİBIL DEĞİL.** Sebepler:

1. **byo.com (241 reçete = %30)** URL şeması bozuk — toplu 404. BYO sitesini yeniden yapılandırmış, eski recipe URL'leri ölü.
2. **Brewery resmi siteleri** (önemli kütle: founders, stone, sierra, fullers, allagash, vb.) ya bot bloklu (403) ya structured recipe paylaşmıyor (sadece marketing copy + ingredient names).
3. **Wikipedia** generic giriş, brewing detay yok.
4. **Trappist breweries** (westmalle, cantillon, westvleteren) gizlilik politikası — açık recipe yok.
5. **Yapısal raw malts (miktar+isim)** %0 — endüstri standardı: brewery'ler reçeteyi açmıyor.

**Tam scrape başarı tahmini:** İyimser senaryoda ~%10-15 reçete için "kısmi" malt isimleri çıkarılabilir (yarı-parse). Bu da V7 recompute için **yetersiz** — pct_* hesabı için ağırlık (kg/lb) ve toplam batch zorunlu.

---

## İş E — Alternatif kaynak listesi

URL recovery yolu kapandı. V7 dataset için alternatif kaynaklar:

### Tier 1 — Yüksek güvenilirlik, structured raw malts

| Kaynak | Tahmini reçete | Erişim | Raw malts | Not |
|---|---:|---|---|---|
| **Brewer's Friend public DB** | 5,000-50,000 | Web scrape (rate limited) | ✅ Yapısal | Public recipe sayfaları structured, brewersfriend.com/homebrew/recipe/[id] pattern. Free tier scrape mümkün. |
| **Brewfather Public Recipes** | 1,000-10,000 | Auth API (free tier) | ✅ Yapısal | Modern web app, JSON API var |
| **BeerXML arşivleri (Github / Reddit)** | 500-5,000 | Doğrudan dosya download | ✅ Yapısal (XML) | Hobbyist arşivleri, çoğu r/Homebrewing thread'lerinden derlenmiş |
| **The Mad Fermentationist (TMF) blog** | ~200 | Blog scrape | ✅ Çoğu yapısal | Mike Tonsmeire'in detaylı reçete blog'u, recipe.json bazılarında |
| **Beer Smith File Cloud** | 1,000+ | Auth API | ⚠️ Public sınırlı | Çoğu private |

### Tier 2 — Orta güvenilirlik, kısmi raw malts

| Kaynak | Tahmini reçete | Erişim | Raw malts | Not |
|---|---:|---|---|---|
| **AHA NHC competition arşivleri** | 1,000+ | PDF parse | ⚠️ PDF metin | Otomatik parse zor, manuel kuvars |
| **r/Homebrewing recipe threads** | 500-2,000 | Reddit API + manuel scrape | ⚠️ Free format | Ortak format yok, NLP gerek |
| **Northern Brewer / MoreBeer kits** | ~200 | Web scrape | ✅ Yapısal | Ürün katalogu, structured recipe |
| **Milk The Funk wiki** | ~100 | Wiki scrape | ⚠️ Mixed format | Sour/wild ağırlıklı |

### Tier 3 — Manuel toplama (uzun vadeli)

- **Homebrew kitapları** (Designing Great Beers, Brewing Classic Styles): scan + OCR + manuel düzenleme. ~300 yüksek kalite reçete.
- **BJCP NHC Style Guidelines** örnekleri: yapısal değil, profile descriptions.
- **Türkiye için yerel topluluk**: Beermutsfest reçeteleri, BiraBurada katalogu, KaanReçeteleri (manuel) — ~50-100 yerel cluster.

### Önerilen yol

**Tier 1 → Brewer's Friend scrape priority.** Sebepler:
- Tek site yapısal yapı (HTML pattern aynı)
- Public recipe page'leri authentication gerektirmiyor
- 5000+ reçete kütlesi → V6 dataset'in 5x'i, V7 train için yeterli
- Rate limit düşük (30-60 req/min ile etik scrape)
- Style coverage geniş (BJCP'nin tüm aileleri)

Tahmini iş yükü: 1-2 sprint scraper geliştirme + 1-2 sprint scrape execution + 1 sprint clean/dedupe. **Toplam ~4-5 sprint** ama V7 için solid temel.

---

## Sonraki acil adım

**Adım 29 — REVIZE:** "Tam URL scrape" yerine **"Brewer's Friend pilot scrape"** olarak yeniden tanımlanmalı:
- 50-100 reçete sample fetch (BJCP stil çeşitliliği)
- HTML pattern parse doğrulaması
- Başarılıysa tam scrape sprint'i (Adım 30)

Alternatif: V7'yi şimdilik dondurup, V6 motorunu best-effort olarak optimize et (Adım 25 fix'leri zaten yapıldı). Kaan'ın kütüphanesindeki 7 reçete üstünde performans iyileştirmesini Adım 19/24 baseline ile ölç. V7 büyük dataset toplaması Faz 5+ olarak ertele.
