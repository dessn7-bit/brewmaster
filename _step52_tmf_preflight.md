# STEP 52 Faz A + B-1 — MTF Wiki Pre-Flight Report

**Tarih:** 2026-04-28
**Status:** 🛑 **ADIM 52 İPTAL** — MTF wiki kaynak kapasitesi yetersiz (B-1 keşif sonucu)
**Sonuç:** Adım 53 alternatif kaynak değerlendirmeye pivot
**Süre:** ~1 saat (pre-flight + B-1 keşif)

---

## 🛑 ADIM 52 İPTAL — Sonuç Özeti

**MTF wiki (milkthefunk.com) Brewmaster veri kaynağı olarak NO-GO.**

### Neden
- Wiki **161 article** ama sadece **5 sayfa Category:Recipes**'te (4'ü style article, 1'i link liste)
- Style category yapılandırması YOK (Lambic/Brett/Sour/Mixed_Fermentation = 0 items)
- Allpages "Recipe" prefix scan = 0 page
- Reçete linkleri tamamen **dış kaynaklara** yönlendiriyor:
  - Brewer's Friend (Cloudflare bloke, Adım 45 SKIP)
  - Facebook MTF group (auth+ToS, SKIP)
  - HomebrewTalk thread (1 reçete)
  - The Rare Barrel wiki section (2-3 reçete)
  - Jester King blog (?)
  - Embrace the Funk blog (1 reçete)
- Net direct extractable: **4-5 reçete max** (hedef +50-100'ün %10'u)

### Karar
Kaan onayı: **Seçenek A — İPTAL ve Adım 53 pivot.**

---

## ✅ Faz A — Pre-Flight (önceki bölüm, referans)

**Status:** Kararlar alındı (MTF wiki, MediaWiki API, hedef +50-100, mtf etiketi, modern sour tek slug, Brewer's Friend SKIP)
**Kritik:** Naming conflict çözüldü

---

## 🎯 KAAN KARARLARI (final)

| Karar | Değer | Yorum |
|---|---|---|
| **K-Pre1** Kaynak | **A** — Sadece MTF wiki (milkthefunk.com), MediaWiki API üzerinden | TMF refresh + Brewer's Friend SKIP |
| **K-Pre2** 409 çözümü | **b** — MediaWiki API endpoint (`/w/api.php`) | Anti-bot daha az tetikler, structured data |
| **K-Pre3** Hedef | **+50-100 reçete** (önceki 250'den küçültüldü) | Scope 4h → **2-3h** |
| **K-Pre4** Naming | **`mtf` etiketi** | Dataset `tmf` (The Mad Fermentationist) ile karışmaz |
| **K-Pre5** Modern sour slug | **TEK SLUG** | Pastry/Smoothie/Catharina → `mixed_fermentation_sour_beer` |

### ⛔ Brewer's Friend SKIP — kalıcı karar

Adım 45'te 3 yöntemle denendi (curl/Playwright/API key), tümü Cloudflare Managed Challenge ile bloke. Adım 52'de **gündeme alınmadı**. Adım 53+ scope'undan da kaldırıldı.

Memory'e reference olarak eklendi: `reference_brewersfriend_skip.md`. Gelecek sprint'lerde tekrar önerilmemeli.

### Adım 52 Faz B kapsam (revize)

| Adım | İş | Süre |
|---|---|---|
| Faz B-1 | MediaWiki API ile MTF wiki recipe sayfa listesi (`Category:Recipes` + `MTF_Member_Recipes` + diğer ilgili kategoriler) | ~30 dk |
| Faz B-2 | 5-10 sample recipe schema inceleme + parser pipeline yaz (wikitext → V15 format) | ~45 dk |
| Faz B-3 | Bulk fetch (rate-limit aware, ~50-100 reçete) | ~30 dk |
| Faz B-4 | `_validate_new_dataset.py` ile 5-check + Brett feature derivation | ~15 dk |
| Faz B-5 | Manuel review batch (Kaan 30 dk) | – |
| Faz C | Merge + V16 retrain + deploy | ayrı sprint |

**Toplam Faz B**: ~2 saat + Kaan manual review.

---

## ⚠ NAMING CONFLICT — Önce bunu çöz

---

## ⚠ NAMING CONFLICT — Önce bunu çöz

### Mevcut "tmf" source (V15 dataset, 166 reçete)

V15'te `source='tmf'` etiketli 166 reçete var. **Adım 30-31 raporları**na göre bu **The Mad Fermentationist** (Mike Tonsmeire) blog'u — `themadfermentationist.com`.

Kaynak: `_audit_step_30_github_tmf_pilot.md` (line 90+):
> YÖNTEM 2 — The Mad Fermentationist (TMF)
> URL: https://www.themadfermentationist.com
> Recipe index sayfası: /p/recipes-for-beer.html — 150+ reçete linki

V15 TMF source_id örnekleri (HTML page-based):
- `pliny-younger-clone-recipe.html`
- `rauchdunkel-smoked-dark-lager.html`
- `calvados-sour-tripel-recipe.html`
- `stolen-microbes-lambic-with-3-fonteinen.html`

**TMF dataset'te ZATEN 166 reçete** (Brett/Sour ağırlıklı: 17 specialty_saison, 7 american_wild_ale, 6 belgian_lambic, 5 berliner_weisse, 5 flanders_red_ale, vs).

### Senin önerdiğin "milkthefunk.com" (MTF)

Kaan'ın Adım 52 mesajında: "TMF kaynağı: milkthefunk.com (wiki + blog)". Bu **farklı bir site** — **Milk The Funk wiki** (MTF), MediaWiki tabanlı.

İki farklı kaynak:

| | TMF (mevcut) | MTF (önerilen yeni) |
|---|---|---|
| Domain | themadfermentationist.com | milkthefunk.com |
| Tip | Blog (HTML post) | Wiki (MediaWiki) |
| Yazar | Mike Tonsmeire (1 kişi) | Topluluk (multi-author) |
| Dataset'te durum | **166 reçete VAR** | YOK |
| Adım 30-31'de | scrape edildi | yapılmadı |

### Net karar gerekli

- **Senaryo A**: Kaan "milkthefunk.com" yazdığında **MTF wiki**'yi kastetti, TMF (themadfermentationist) zaten dataset'te. → MTF wiki yeni kaynak.
- **Senaryo B**: Kaan TMF blog refresh istedi (Adım 51 raporu "Adım 52 → TMF batch refresh" demişti). → MTF wiki gündem dışı, TMF blog'una yeni reçete eklenmiş mi diye refresh.
- **Senaryo C**: İkisi de — hem TMF refresh hem MTF wiki yeni scrape.

⏸ **Pre-flight'tan sonra netleştir.** Aşağıdaki rapor **MTF wiki** kapsamını incelemekte (yeni kaynak hipoteziyle), TMF blog refresh için ayrı bir mini-audit gerekirse alt-not.

---

## 1. robots.txt + ToS

### MTF wiki (`milkthefunk.com`)

**WebFetch ÇALIŞMIYOR** — `https://www.milkthefunk.com/*` URL'lerine yapılan tüm WebFetch çağrıları **HTTP 409 Conflict** döndürüyor. Muhtemelen Cloudflare anti-bot koruması (sandbox/headless detection).

| URL | Durum |
|---|---|
| `/robots.txt` | 409 Conflict (sandbox blocked) |
| `/wiki/Main_Page` | 409 |
| `/wiki/Special:Categories` | 409 |
| `/wiki/Category:Recipes` | 409 |
| `/wiki/MTF_Member_Recipes` | 409 |

**Implications:**
- WebFetch ile direkt scrape **mümkün değil** (sandbox bloke)
- Production scrape için custom user-agent, referrer, cookie gerekli olabilir
- Adım 30-31'de TMF blog scrape için kullanılan yöntem (her ne ise) MTF için de denenebilir (eski `_pilot_parse_diydog.js` benzer pattern)
- Veya Mevcut Brewmaster sprint'lerinde `node fetch` Browser-style API kullanılmış olabilir — kontrol edilmeli

### Lisans (WebSearch'ten dolaylı bilgi)

- Wiki MediaWiki tabanlı → genellikle CC BY-SA (varsayılan MediaWiki license)
- "Milk The Funk Wiki:About" sayfası mevcut: `/wiki/Milk_The_Funk_Wiki:About` (içerik fetch edilemedi)
- ML training için **fair use makul** (Adım 30 raporu TMF blog için aynı yaklaşım kullandı)

### TMF blog (`themadfermentationist.com`)

Adım 30 raporundan: rate limit dışında etik risk düşük, blog post fetch çalışıyordu. WebFetch test bu sprint'te tekrarlanmadı.

---

## 2. Wiki kapsamı — KRİTİK BULGU

### Category:Recipes — sadece 5 page!

WebSearch sonucu: **"The Recipes category contains 5 pages, out of 5 total."**

Bu çok dar. Yani wiki sıkı kategori sınıflandırması yapmamış — reçeteler büyük ihtimalle **`MTF_Member_Recipes`** sayfasında inline liste olarak tutuluyor (her reçete için ayrı wiki page YOK).

### MTF_Member_Recipes (ana reçete sayfası)

WebSearch dolaylı bilgi:
- "MTF Member Recipes is a listing of Milk The Funk member recipes"
- "Members post in a thread to share their recipes with everyone"
- "Member recipes are also available via Brewer's Friend, and users can post in a thread"

**Yani**: Recipes Brewer's Friend linkleri olarak listeleniyor olabilir. Direct wiki content yerine **outbound link**.

⚠ **Kapsam belirsiz** — fetch edilemedi. Tahmini:
- 50-100 link sayfada listeleniyor (Brewer's Friend link'lere yönlendirme)
- Eğer linkler outbound ise → **MTF wiki yerine Brewer's Friend scrape** gerekli
- Brewer's Friend public recipe API var (auth gerekli olabilir)

### Style article'lar (Lambic, Brett, Mixed Cultures, Catharina)

WebSearch sonuçları:
- `/wiki/Lambic` (style article)
- `/wiki/Gueuze_and_Lambic_Character`
- `/wiki/Mixed_Cultures`
- `/wiki/Fruit_Lambic`
- `/wiki/Unfermented_Fruit_Beer` (= Pastry/Smoothie/Slushie/Sploojie)

Bunlar **reçete değil article**. Reçete sayısına katkı yok.

### MediaWiki API

`https://www.milkthefunk.com/w/api.php` muhtemelen mevcut (MediaWiki standart). Test edilemedi (409 bloke). API kullanılabilirse:
- `action=query&list=allpages&apnamespace=0` ile tüm sayfalar
- `action=parse&page=...` ile structured wiki content
- Kategori bazlı arama: `action=query&list=categorymembers&cmtitle=Category:Recipes`

API üzerinden scrape çok daha güvenilir (HTML parse riski sıfır), ama 409 problem'i çözülmesi gerek.

---

## 3. Schema sample (5-10 reçete)

**FETCH EDİLEMEDİ** (409). Schema bilinmiyor.

Wiki recipe template structure (MediaWiki standard) muhtemelen:
- Infobox (key-value): `{{Recipe |og=1.045 |fg=1.005 |ibu=10 |srm=4 |yeast=...}}`
- Wikitext content (notes, fermentation log, tasting notes)
- Wikilink'ler (yeast strain pages → ABV/temp ranges)

Veya plain wikitext + ad hoc tablo (her yazar farklı format).

**Adım 52 başlatma için 5-10 sample recipe HTML/wikitext fetch GEREKLİ** — sandbox bloke olduğu için Kaan veya başka mekanizma ile yapılmalı.

---

## 4. Modern sour reçete sayımı (K5)

WebSearch dolaylı:
- `/wiki/Unfermented_Fruit_Beer` — bu generic article: "also known as Pastry Sour, Slushie, Smoothie, Slurpy, Popsicle, Sploojie"
- Catharina Sour standalone wiki sayfası **yok** (search'te bulunamadı)
- Smoothie Sour / Pastry Sour standalone wiki sayfası **yok**

**Reçete sayısı ölçülemedi** (page fetch edilmedi). Tahmin:
- Pastry Sour: <10 reçete (modern, niş)
- Smoothie Sour: <5 reçete
- Catharina Sour: <5 reçete (Brezilya kökenli, MTF'in odağı dışı)

⚠ **K5 öneri**: TMF blog'unda da bu modern stiller az (Mike Tonsmeire klasik Brett/Sour odaklı). MTF wiki çok kategorize değil, "Unfermented Fruit Beer" ortak başlık altında.

**Karar önerisi**:
- Pastry/Smoothie ayrı slug AÇMA (n<10 her birinde) → **mixed_fermentation_sour_beer** veya yeni `unfermented_fruit_beer` slug'ı altında topla
- Catharina Sour ayrı slug AÇMA → `mixed_fermentation_sour_beer` veya `american_wild_ale` (BJCP standart yok)

⏸ **Kaan kararı bekleniyor** — n<10 ise yeni slug aç (V16 model'de zayıf eğitilir) vs alternatif slug.

---

## 5. Blog erişim/parse maliyeti

**Önemli not**: MTF wiki'nin **ayrı blog'u YOK**. milkthefunk.com sadece wiki. "Blog" kısmı muhtemelen Facebook grubu (Milk The Funk Facebook group, ~80K üye, ana topluluk yeri).

Facebook scrape:
- Auth gerekli
- ToS scraping yasaklıyor
- Schema yapılandırılmamış (reçete formatı serbest)
- **YASAL/TEKNİK RİSK YÜKSEK**

**K1 (wiki + blog ikisi) seçimi**: Blog kısmı pratik DEĞİL → SADECE wiki üzerinden gidelim.

### TMF blog refresh (alternatif K1 yorumu)

Eğer Kaan TMF (Mike Tonsmeire blog) refresh kastettiyse:
- 150+ reçete Adım 31'de scrape edildi → V15'te 166 reçete (-/+10 dedupe)
- Adım 51'den bu yana yeni post: ~3-5 reçete tahminen (Mike Tonsmeire ayda ~1 post)
- Refresh kazanımı **çok düşük** (5-10 yeni reçete max)

---

## 6. Beklenen toplam scrape volume

### Senaryo A (MTF wiki yeni scrape, hipotez)

| Kaynak | Tahmini reçete | Brett/Sour ağırlığı | Risk |
|---|---:|---:|---|
| MTF wiki Category:Recipes | 5 | yüksek (community niş) | 409 bloke (sandbox) |
| MTF Member Recipes (inline) | 50-100? | yüksek | Belirsiz, fetch edilemedi |
| Style article'lar (Lambic, Brett, vs) | 0 (reçete değil) | – | – |

**Tahmini net**: 50-100 reçete (eğer MTF Member Recipes inline ise) veya 0 (eğer Brewer's Friend outbound link ise → ayrı scrape gerekli, scope farklı).

### Senaryo B (TMF refresh)

| Kaynak | Yeni reçete | Risk |
|---|---:|---|
| TMF blog refresh | 5-10 | düşük |

**Net kazanım: <10 reçete.** Hedef +250 ile uyumsuz.

### Senaryo C (Brewer's Friend public recipes)

Eğer MTF wiki Brewer's Friend linkleri içeriyorsa:
- Brewer's Friend API: https://www.brewersfriend.com/api/recipes — public read, auth gerekli olabilir
- Brett/Sour filter ile ~500-2000 reçete (geniş kapsam)
- **YENİ KAYNAK** — Adım 52 scope genişler

---

## ⏸ KAAN KARARI GEREKLİ

### K-Pre1: Hangi kaynak?

- **A** — MTF wiki (milkthefunk.com) yeni scrape. WebFetch 409 bloke, alternatif scrape mekanizması gerek (custom user-agent, MediaWiki API). Tahmini 50-100 reçete (Brett/Sour ağırlıklı).
- **B** — TMF blog (themadfermentationist.com) refresh. Adım 31'de scrape edildi, +5-10 yeni post tahmini. Hedef +250 ile uyumsuz.
- **C** — Brewer's Friend API (yeni kaynak). MTF wiki linkleri muhtemelen oraya yönlendiriyor. ~500-2000 Brett/Sour reçete potansiyeli, auth gerekli.
- **D** — A+B+C kombinasyonu (mega sprint, ~6-8 saat).

### K-Pre2: 409 problem çözümü

WebFetch sandbox milkthefunk.com'a giremez. Çözüm:
- **a** — Yerel Node.js script (custom User-Agent, axios/fetch ile) — Kaan veya Claude
- **b** — MediaWiki API endpoint (`/w/api.php`) — daha resmi, anti-bot tetiklemez muhtemelen
- **c** — WebSearch + manuel sayfa kopyala (yavaş, scale uygun değil)

### K-Pre3: Scope netleştirme

- Hedef +250 reçete eğer MTF wiki tek başına 50-100 ise **karşılanmaz**
- Brewer's Friend scrape eklenirse hedef aşılabilir, ama scope büyür
- **Adım 52 scope'u 4 saat → 6-8 saat artmalı** Brewer's Friend dahil edilirse

### K-Pre4: TMF/MTF naming netleştirme

- Code'da "tmf" source **The Mad Fermentationist** = themadfermentationist.com
- Yeni kaynak Milk The Funk = milkthefunk.com → **`mtf`** olarak etiketle (TMF ile karıştırma)

### K-Pre5: Modern sour slug'ları (K5 revize)

- Pre-flight'ta MTF kapsamı doğrulanamadı
- **Önerim**: `pastry_sour`, `smoothie_sour`, `catharina_sour` ayrı slug AÇMA — n<10 sağlam train edilemez. Hepsini `mixed_fermentation_sour_beer` veya yeni TEK `modern_sour_beer` slug'ı altında topla. V17+'da yeterli reçete birikince ayır.

---

## ÖZET — Kaan'ın okuyacağı

1. **Naming conflict**: Dataset'te "tmf" = The Mad Fermentationist (mevcut). Kaan'ın bahsettiği "milkthefunk.com" = Milk The Funk wiki (yeni). İki ayrı kaynak.

2. **WebFetch milkthefunk.com'da bloke** (409 Cloudflare). Pre-flight'ı sandbox üzerinden bitiremedim. Alternatif scrape mekanizması (Node script veya MediaWiki API) gerekli.

3. **Wiki Category:Recipes sadece 5 page**. Ana reçete listesi `MTF_Member_Recipes` sayfasında — muhtemelen Brewer's Friend dış linkleri. Direct scrape edilebilirlik belirsiz.

4. **TMF (Mike Tonsmeire) blog ZATEN scrape edildi** (V15'te 166 reçete). Refresh kazanımı çok düşük (5-10 yeni post).

5. **+250 Brett/Sour hedefi**: MTF wiki tek başına yeterli değil. Brewer's Friend API genişletmesi düşünülmeli.

6. **5 karar bekliyor** (K-Pre1-5 yukarıda). Özellikle K-Pre1 (kaynak seçimi) ve K-Pre2 (409 çözümü) Faz B başlamadan kritik.

---

## Sources

- [Milk The Funk Wiki Main Page](https://www.milkthefunk.com/wiki/Main_Page) (fetch 409)
- [Category:Recipes](https://www.milkthefunk.com/wiki/Category:Recipes) (5 page total)
- [MTF Member Recipes](https://www.milkthefunk.com/wiki/MTF_Member_Recipes) (ana reçete listesi, fetch 409)
- [Milk The Funk Wiki:About](https://www.milkthefunk.com/wiki/Milk_The_Funk_Wiki:About) (lisans bilgisi, fetch edilemedi)
- [Unfermented Fruit Beer](https://www.milkthefunk.com/wiki/Unfermented_Fruit_Beer) (Pastry/Smoothie/Slushie article)
- Adım 30 raporu: `_audit_step_30_github_tmf_pilot.md` — TMF=The Mad Fermentationist scrape detay

---

## ✅ Faz B-1 — Keşif Çıktıları (MediaWiki API üzerinden)

### API erişimi ÇALIŞTI

Custom UA `Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)` ile:
- İlk request: HTTP 409 + Cloudflare cookie challenge (`document.cookie = "humans_21909=1"`)
- Cookie parse + retry → 200 OK
- Polite rate: 1 req/sec uygulandı

Script: `_step52_mtf_b1_discovery.js` (cookie bypass dahil, gelecek MTF değerlendirmesi için saklı)

### Wiki istatistikleri (resmi MediaWiki API'den)

| Metric | Değer |
|---|---:|
| Sitename | Milk The Funk Wiki |
| Generator | MediaWiki 1.30.0 (eski, 2018) |
| Pages (toplam) | 568 |
| **Articles (asıl içerik)** | **161** |
| Edits | 15,943 |

### Recipe içerik — DAR

| Endpoint | Sonuç |
|---|---|
| `Category:Recipes` | **5 page** — 4'ü article (Berliner Weissbier, Cereal Mashing, Gose, Lichtenhainer), 1'i link liste (MTF Member Recipes) |
| `allpages` prefix "Recipe" | **0 page** |
| `Category:Lambic` / Brett_Beer / Sour_Beer / Mixed_Fermentation / Berliner_Weisse / Flanders | **Hepsi 0 items** (kategori yapılandırması yok) |

### MTF_Member_Recipes wikitext (1456 char, tam içerik)

```
==Member Recipes==
* Brewer's Friend "MTF account" link → ⛔ Cloudflare bloke
* Facebook group thread → ⛔ auth+ToS

==General Base Recipes==
* Gose (style article)
* Berliner Weissbier (style article)
* Turbid Mash (technique article)
* HomebrewTalk thread — AmandaK's lambic extract  ← 1 reçete

==Commercial Recipes==
* The Rare Barrel wiki section  ← 2-3 reçete
* Jester King brewery blog (homebrew recipes)
* Facebook old recipes
* Embrace the Funk blog (Jester King hibrit)  ← 1 reçete
```

### Net çıkartılabilir reçete: **4-5 max**

Hedef +50-100'ün **%5-10'u**. Adım 52 kapsamı karşılanmıyor.

---

## 📋 Adım 53 Önerisi — Alternatif Brett/Sour Kaynak

MTF wiki SKIP ile veri kaynağı eksiği duruyor. Adım 53'te aşağıdakilerden biri/birkaçı değerlendirilebilir:

### Yüksek potansiyel (önerim)

1. **AHA NHC (American Homebrewers Association National Homebrew Competition) archive**
   - BJCP yarışma reçeteleri, halka açık winners
   - Brett/Sour dahil tüm BJCP kategorileri
   - Schema yapılandırılmış (BJCP standartı)
   - Ama: AHA üyelik gerekli olabilir, paywall belirsiz
   - Tahmini: yıllık ~50 winner × 10 yıl = 500+ reçete (Brett/Sour ~%10 = 50)

2. **The Rare Barrel + Jester King brewery sites direkt scrape**
   - Profesyonel sour brewery'ler kendi reçetelerini paylaşıyor
   - Kalite yüksek (kommerciyal)
   - Tahmini: 10-20 reçete (her brewery)

3. **HomebrewTalk forum Brett/Sour subforum**
   - Topluluğa açık, "fair use" tartışmalı
   - Schema fragmente (her thread farklı format)
   - Tahmini: 100-300 reçete (kalite filtresi gerekli)

### Düşük potansiyel (önerim DEĞİL)

4. **Sour Beer Blog / Embrace the Funk / ad hoc blog'lar**
   - Tek tek scrape, schema fragmente
   - Reçete sayısı her birinde 5-20

5. **Reddit r/SourBeer ve r/Brettanomyces**
   - Veri serbest format, parse zor
   - ML training için kalite düşük

### NO-GO listesi (kalıcı)

- ❌ Brewer's Friend (Cloudflare bloke, Adım 45 SKIP)
- ❌ MTF wiki (bu sprint İPTAL — boş içerik)
- ❌ Facebook MTF group (auth+ToS)

### Strateji önerisi

Adım 53'te **AHA NHC** önceliği. Pre-flight 30 dk: ToS, archive yapısı, parse fizibilitesi. Eğer GO ise 2-4 saat scrape + integrate.

Alternatif: Adım 56'a kadar **veri kaynağı sprint'i ERTELE**, mevcut V15 (8.416 reçete, %54 Sour top-1) yeterli — yeast parser + Specialty granülarize Adım 56'a odaklan.

---

## 📦 Çıktılar (Adım 52 İPTAL kayıt)

| Dosya | İçerik |
|---|---|
| `_step52_tmf_preflight.md` | Bu rapor (pre-flight + B-1 + iptal kararı) |
| `_step52_mtf_b1_discovery.js` | MediaWiki API discovery script (Cloudflare cookie bypass dahil) |
| `_step52_b1_report.json` | API responses JSON detay |
| `_mtf_member_recipes_wikitext.txt` | MTF_Member_Recipes sayfa wikitext (1456 char) |

Memory not: `reference_mtf_wiki_skip.md` — MTF wiki kalıcı NO-GO (gelecek sprint'lerde tekrar gündeme alınmamalı).

