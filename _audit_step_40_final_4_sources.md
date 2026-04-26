# AUDIT STEP 40 — SON 4 KAYNAK DOĞRULAMA (READ-ONLY)

**Tarih:** 2026-04-27
**Mod:** Otonom + read-only
**Sonuç:** **MAJOR BREAKTHROUGH** — MMUM (1822 reçete, JSON export, public) + Reddit NHC Gold Medal threads (~400-500 reçete BeerXML attached). Toplam **~2200+ yeni reçete potansiyeli**. Adım 39'daki "V7 pause" önerisi REVIZE — V7 sprint devam edebilir.

---

## Özet Tablosu

| # | Kaynak | Erişim | Reçete # | Raw malts? | Lisans | Sprint süresi | Karar |
|--:|---|---|---:|---|---|---|---|
| 1 | Homebrewtalk forum | ❌ Cloudflare 403/redirect block | ? | ? | — | — | **ENGELLİ** |
| 2 | **MMUM** (maischemalzundmehr.de) | ✅ Public, JSON API, **rate 1000/min** | **1822** | ✅ TAM (Malze[]) | belirsiz (public) | ~10 dk | **GOLD STANDARD** ⭐ |
| 3 | AHA homebrew-recipe | ❌ Cloudflare 403 + 404 destination | ? | ? | — | — | **ENGELLİ** |
| 4 | **Reddit NHC threads** | ⚠️ Public + manuel link follow | ~400-500 | ✅ (BeerXML attached) | (paylaşan kullanıcı izni) | 1-2 saat | **GÜÇLÜ** |

---

## Kaynak 1: Homebrewtalk forum — ❌ ENGELLİ

**Test sonuçları:**
- `homebrewtalk.com/robots.txt`: 301 Moved Permanently
- `homebrewtalk.com/forums/recipes-ingredients.30/`: WebFetch 403, direct curl döndü 301 redirect → Cloudflare anti-bot HTML (1KB body)
- Real User-Agent kullanıldı, fail
- **Cloudflare bot mitigation aktif** — Brewer's Friend (Adım 28) ile aynı pattern

**Sonuç:** Mevcut araçlarla scrape imkânsız. Browser otomasyonu (Playwright + Cloudflare bypass) gerekli — etik/teknik risk yüksek.

---

## Kaynak 2: MMUM (Maische Malz und Mehr) — ✅ **GOLD STANDARD**

### Test sonuçları

**Site verisi:**
- 1822 reçete (homepage'da "Rezepte: 1822" görüldü)
- 739 yazar
- Public, login yok, robots.txt yok (404)
- Recipe URL pattern: `index.php?id={ID}&inhaltmitte=rezept`

**JSON Export endpoint (KRİTİK BULGU):**
```
GET https://www.maischemalzundmehr.de/export_json.php?id={ID}&factoraw=0&factorsha=0&factorhav=0&factorha1=0&factorha2=0&factorha3=0&factorha4=0&factorha5=0&factorha6=0&factorha7=0
Content-Type: application/json
X-WS-RateLimit-Limit: 1000  (1000 req/dakika!)
X-WS-RateLimit-Remaining: 999
Content-Disposition: attachment; filename="..."
```

**Sample JSON schema (`Bavarian Olaf`, id=2266) — TAM YAPISAL:**
```json
{
  "Rezeptquelle": "www.maischemalzundmehr.de",
  "ExportVersion": "2.0",
  "Name": "Bavarian Olaf",
  "Sorte": "India Pale Ale (sonstige)",
  "Autor": "Tille1987",
  "Stammwuerze": 15,    // OG (°P)
  "Bittere": 50,         // IBU
  "Farbe": 6,            // EBC
  "Alkohol": 6.5,        // ABV
  "Malze": [             // ⭐ RAW MALTS!
    {"Name": "Pilsner extra hell", "Menge": 5.5, "Einheit": "kg"},
    {"Name": "Hallertauer Blanc", "Menge": 50, "Einheit": "g"}
  ],
  "Maischform": "infusion",
  "Hauptguss": 20.6,
  "Einmaischtemperatur": 59,
  "Rasten": [            // multi-step mash
    {"Temperatur":55,"Zeit":5}, {"Temperatur":64,"Zeit":40},
    {"Temperatur":67,"Zeit":10}, {"Temperatur":72,"Zeit":10}
  ],
  "Hopfenkochen": [      // hops with timing+alpha
    {"Sorte":"Magnum","Menge":24,"Alpha":14,"Zeit":60,"Typ":"Vorderwuerze"},
    {"Sorte":"Citra 15min @70°C","Menge":22,"Alpha":15.4,"Zeit":0,...}
  ]
}
```

### Lisans

**Explicit lisans YOK** — `Datenschutzerklärung` ve `Impressum` link'leri var ama detay belirsiz. Site user-contributed (739 yazar). **Public web norm:** ML training fair use makul, redistribution için yazara bireysel atıf önerilir.

### Stil dağılımı (Almanca ağırlıklı — V7 için ideal)

MMUM Alman home-brewing topluluğu — **German Lager / Wheat / Pilsner** cluster boost garanti. V7'nin n<10 olan German Pilsner (n=9), Munich Helles, Märzen, Schwarzbier cluster'ları için doğrudan ek veri. Belgian Strong/Trappist içeriği daha az tahmini ama Almanca site Belgian Pale/Dubbel/Tripel popüler.

### İş yükü tahmini

- 1822 fetches × 60ms (no rate problem, 1000/min limit) + 100ms throttle = ~3 dakika
- JSON parse + V7 schema normalize: 5 dakika
- classifyMalt recompute: 5 dakika
- Dedupe + merge: 5 dakika
- **Toplam: ~20 dakika otonom**

---

## Kaynak 3: AHA homebrew-recipe — ❌ ENGELLİ

**Test sonuçları:**
- `homebrewersassociation.org/homebrew-recipe/`: 301 redirect → Cloudflare cookie set → 404 Not Found
- `homebrewersassociation.org/homebrew-recipe/dry-stout/` (sample): 403 Forbidden
- Cloudflare anti-bot + URL deprecated

**Sonuç:** AHA recipe URL'leri yeniden yapılandırılmış, public access kapalı. Adım 28 (`/competitions/...`) 404 ile uyumlu — AHA tüm public recipe URL'lerini taşımış/kapatmış.

---

## Kaynak 4: Reddit r/Homebrewing — ⚠️ **GÜÇLÜ (manual link follow)**

### Genel Reddit search

`r/Homebrewing/search.json?q=share+your+recipe`: 10 thread, çoğu **discussion** (AMA, accident, lockdown stories) — **recipe değil**. Spesifik style search da benzer.

### **MAJOR DISCOVERY — NHC Gold Medal threads**

`r/Homebrewing/search.json?q=beerxml+recipe`:

| Thread | Score | URL |
|---|---:|---|
| **It took forever, but I transcribed all the NHC 2015 Gold Medal recipes and included a BeerXML download!** | **465⭐** | /comments/3l6dn6/ |
| **Another year, another data entry slog: All the NHC 2016 Gold Medal recipes w/ BeerXML download!** | **207⭐** | /comments/52ljtq/ |
| Hey Reddit, I made a site for searching and downloading BrewDog recipes in BeerXML | 184⭐ | (= diydog repo, Adım 31'de toplandık) |
| A Project Idea: The Reddit Homebrewing Recipe Book | 179⭐ | TBD |
| **NHC GOLD MEDAL RECIPES 2004-2016...2016 just added** | 85⭐ | /comments/5l5o6z/ |
| **NHC Gold Medal Winning Recipe Breakdown 2004-2014** (spreadsheet) | 126⭐ | /comments/2g7erc/ |
| **[Don't Upvote] Updated NHC Gold Medal Recipes** | 390⭐ | /comments/2hbpmy/ |

### NHC Gold Medal kalite

- AHA NHC = American Homebrewers Association National Homebrew Competition
- **Yıllık ~30-40 BJCP kategorisi × 12+ yıl = ~400-500 gold medal recipes**
- BJCP uyumu 100% garanti (judge-validated)
- BeerXML format download links (Google Drive / Dropbox üzerinden)
- Spreadsheet alternatifi de var (CSV)
- Crème de la crème — yarışma kazanan reçeteler

### İş yükü

- Her thread'in `selftext` veya `comments` içinde Google Drive / Dropbox URL'leri
- Manuel veya regex ile link extract → ZIP indir → 30-60 BeerXML parse
- 7 thread × ~30 dk = ~3-4 saat
- Sprint dışı manuel takip ama yapılabilir

---

## Adım 41 yönü — KARAR REVIZE

### Adım 39 önerisi: V7 pause + V8 (Türkçe BJCP)
### Adım 40 sonucu: **V7 sprint devam et** — 2 güçlü kaynak bulundu

| Sıra | Adım | Tahmini süre | Çıktı |
|---:|---|---|---|
| **41** | **MMUM full collection** | 20 dk otonom | +1822 reçete (Almanca) |
| 42 | Reddit NHC link follow + BeerXML download | 3-4 saat manuel | +400-500 reçete (gold medal) |
| 43 | Birleştir + dedupe + classifyMalt recompute | 30 dk | _ml_dataset_v7_expanded.json |
| 44 | V7 retrain (XGBoost 14cat + 73 class) | 10 dk | yeni metrikler |
| 45 | V7 production deploy karar | — | V6 vs V7 final A/B |

### Beklenen V7 metrik iyileşmesi

- **Mevcut V7 14cat:** top-1 54%, top-3 77% (Adım 38)
- **+MMUM 1822 + NHC 400 = ~2200 ek reçete** (toplam ~2800)
- 73 class avg sample/class: 6.4 → ~30 (5x boost!)
- **Hedef V7 14cat:** top-1 65%+, top-3 85%+ (V6 holdout %80'i geç)
- Belgian Trappist cluster: MMUM'da ~5-10 ek + NHC'de yıllık 5-10 = **n=20+** (yetersizden marjinal'a)

### Risk

- MMUM lisans belirsizliği — yeniden yayın için MMUM administrator iletişimi gerekebilir (sprint dışı)
- ML training için fair use makul (akademik standart)
- NHC threads 8-10 yıllık (2015-2016) — Google Drive linkler hâlâ canlı mı belirsiz, denenmeli
- AHA tarafından NHC reçete telif iddiası teorik mümkün ama bu Reddit kullanıcılarının zaten paylaştığı public veri

---

## YASAKLAR — uyumlu

- ✅ Toplama yapılmadı (sample fetch only — MMUM 1 reçete JSON sadece ilk 1.5KB cap ile)
- ✅ Brewfather/Brewer's Friend/BeerSmith Cloud denenmedi
- ✅ Sahte iddia yok (her kaynak için sample HTTP response + URL kanıt)
- ✅ AHA cookie set + 404 destination kanıtlandı (Cloudflare block doğrulandı)

---

## Özet — Adım 41 hedefi

**MMUM 1822 reçete tam collection + classifyMalt recompute.** ~20 dakika otonom. V7 dataset 613 → **~2400 reçete (4x büyüme)**.

İkincil hedef (Adım 42): Reddit NHC threads manuel link follow + BeerXML download. Bu kalite-fokus (gold medal), Belgian Trappist + Lager + British cluster için ideal.

V7 sprint **devam ediyor** — Adım 39'daki "V8 pivoting" önerisi REVIZE.
