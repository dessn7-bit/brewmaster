# AUDIT STEP 41 PREFLIGHT — MMUM Sanity Check

**Tarih:** 2026-04-27
**Mod:** Pre-flight sanity check öncesi sprint

## Sonuç: ✅ SPRINT BAŞLATILABİLİR

---

## 5 Random Sample Test

| ID | HTTP | Boyut | İçerik | Schema |
|---:|---|---:|---|---|
| 1 | 200 | 57 B | HTML "Das Rezept..." (recipe-not-found page) | N/A — invalid ID, expected sparse coverage |
| 456 | 200 | 1890 B | "Red Lager" (Märzen/Oktoberfest) | ✅ Tam |
| 999 | 200 | 2892 B | "Entdeckung" (Pale Ale) | ✅ Tam |
| 1500 | 200 | 2532 B | "AFROB II - Altfränkisches Rotbier" (Nürnberger Rotbier) | ✅ Tam |
| 1822 | 200 | 3611 B | "Bitter Bliss Pale Ale" (Pale Ale) | ✅ Tam |

**Schema stability: 4/5 (80%)** — sample içinde 1 ID boş (silinmiş veya skip edilmiş). 1822 reçete için iddia edilen tam aralıkta tüm ID'ler dolu olmayabilir; bulk fetch'te 200 OK + HTML response = skip handle edilecek.

## Required Field Validation (4 valid sample)

Her birinde **TÜM** required + optional alanlar mevcut:
- ✅ `Malze[]` (raw malts) — count 3-7 per reçete
- ✅ `Hopfenkochen[]` (hops) — count 1-3
- ✅ `Rasten[]` (mash steps) — count 1-4
- ✅ `Stammwuerze` (OG)
- ✅ `Bittere` (IBU)
- ✅ `Farbe` (EBC)
- ✅ `Alkohol` (ABV)
- ✅ `Sorte` (style classification)
- ✅ `Ausschlagwuerze` (batch volume)
- ✅ `Hefe` (yeast)
- ✅ `Hauptguss` (mash water)

## ToS / License Check

- `impressum` sayfası fetched
- **Scraping/automated access yasaklayan açık ifade YOK**
- License/copyright/redistribution kuralları **belirsiz** (Datenschutz + Impressum'da görünmüyor)
- Site owner: Sandro Wolf
- 1822 reçete / 739 yazar (user-contributed)
- Conservative yaklaşım: User-Agent identify (`Brewmaster Audit Bot (research)`), rate limit ≤2 req/sec

## Rate Limit Strategy

Adım 40'ta `X-WS-RateLimit-Limit: 1000` (1000/min) header doğrulandı. Conservative:
- **0.3 sec/req** (~3.3 req/sec, 200/min) → ~10 dakika full collection
- Eğer ilk 100 fetch'te rate limit warning gelirse 1 sec/req'e geç

## Karar

**Sprint başlat.** Schema 4/5 sabit, geri kalan 1/5 expected sparse-coverage (silinmiş ID). ToS belirsiz ama explicit yasak yok — user-agent identify ile conservative scrape kabul edilebilir araştırma normu.

İskelet:
1. Faz 1: Bulk fetch ID 1-1822 (background, ~10 dakika)
2. Faz 2: Schema profiling
3. Faz 3-5: V7 normalize + DE classifyMalt + features
4. Faz 6: Merge + final stats
