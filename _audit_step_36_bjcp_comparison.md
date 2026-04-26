# AUDIT STEP 36 TRACK A — BREWFATHER STYLE DB / BJCP COMPARISON

**Tarih:** 2026-04-26
**Mod:** Otonom
**Sonuç:** **TRACK A BAŞARISIZ — Brewfather'da public style catalog API yok, Türkçe içerik yok.** Adım 36 prompt'unun temel varsayımı ("Brewfather Türkçe arayüzde 'Bira Babası' olarak çevrilmiş") yanlış. Brewmaster BJCP DB güncellemesi bu kanaldan yapılamıyor.

---

## Adım 36 prompt varsayımının doğrulaması

**İddia:** "Brewfather Türkçe arayüzde 'Bira Babası' olarak çevrilmiş — aynı uygulama"

**Kontrol sonucu:** **YANLIŞ.**

- docs.brewfather.app araştırması: Brewfather sadece **Metric ve US/Imperial birim** desteği gösteriyor, dil seçeneği veya Türkçe yerelleştirme **YOK**.
- Recipe schema'sı (Adım 35'te incelendi): `style.name = "Blonde Ale"` gibi sadece İngilizce isimler.
- "Bira Babası" muhtemelen Türkiye home-brewing topluluğunda farklı bir blog/site (birababasi.com → ECONNREFUSED, Adım 36 ilk denemede). WebSearch da bu isimde aktif site bulamadı.

---

## Track A1 — Style endpoint keşif (BAŞARISIZ)

7 farklı endpoint denendi, hepsi 404:

| Endpoint | Status |
|---|---|
| `/v2/styles` | 404 |
| `/v2/styles?limit=200` | 404 |
| `/v2/style` | 404 |
| `/v2/inventory/styles` | 404 |
| `/v1/styles` | 404 |
| `/v2/style-guide` | 404 |
| `/v2/recipe-styles` | 404 |
| `/v2/styles/default-57` (direct ID) | 404 |
| `/v2/style/default-57` | 404 |
| `/styles/default-57` | 404 |

**Brewfather docs sorgusu:** "If you need a complete BJCP style catalog, the docs do not show an API endpoint for that."

---

## Track A2 — Embedded style schema (TEK reçete)

Default sample reçetenin `style` object'i ZENGIN BJCP verisi içeriyor:

```json
{
  "_id": "default-57",
  "name": "Blonde Ale",
  "category": "Pale American Ale",
  "categoryNumber": "18",
  "styleLetter": "A",
  "styleGuide": "BJCP 2015",
  "type": "Pale Ale",
  "ogMin": 1.038, "ogMax": 1.054,
  "fgMin": 1.008, "fgMax": 1.013,
  "abvMin": 3.8, "abvMax": 5.5,
  "ibuMin": 15, "ibuMax": 28,
  "colorMin": 3, "colorMax": 6,
  "lovibondMin": 3, "lovibondMax": 6,
  "buGuMin": 0.33, "buGuMax": 0.61,
  "rbrMin": 0.33, "rbrMax": 0.61,
  "carbonationStyle": "18A",
  "carbMin": null, "carbMax": null
}
```

**Bu schema mükemmel** — 248 BJCP stili için bu data toplanabilse Brewmaster `__BM_DEFS`'a port edilebilirdi. Ama:

- API'de style listesi endpoint yok
- Style data sadece recipe içinden çıkarılabiliyor (`recipe.style`)
- Kaan'ın hesabında 1 reçete var → 1 stil (Blonde Ale)
- 248 stilin tamamı için 248 recipe gerekir, manuel oluşturma sprint dışı

**Brewfather web app içinde** stil rehberi UI'sı var (free tier'da erişilebilir Adım 32 raporu), ama **scrape için browser otomasyonu** gerekli (SPA, JS-rendered, Cloudflare).

---

## Sonuç — Brewmaster BJCP DB güncellemesi

**Bu adımdan ek BJCP veri ÇIKMADI.** Brewmaster'ın mevcut `__BM_DEFS` (248 BJCP key, İngilizce isimler) değişmedi.

### Türkçe isim eklenmesi için alternatifler

Brewfather'dan veri çekemediğimiz için, Türkçe BJCP içerik için:

1. **BJCP resmi Türkçe çeviri:** Türkiye'deki BJCP gönüllüleri Türkçe tercüme yapmış (BJCP article: birasever.com 2019). Resmi tam çeviri yok ama tadım sınavı materyali var. Manuel toplama gerekir.

2. **BJCP 2021 İngilizce → Türkçe çevirisi:** AI çeviri (Claude API) ile 248 stil ad + kısa açıklama otomatik çevrilebilir. ~2-3 saat iş.

3. **Kaan manuel girer:** Önemli 50 stil için Türkçe ad + ana kategori (Belgian Strong → Belçika Sert, German Lager → Alman Lager) elle eklenebilir.

4. **Türkiye home-brewing toplulukları kaynak:** BiraBurada, evbira.com gibi siteler — içeriği inceleyip izinle veya rejected — ek araştırma sprint'i gerekir.

**Önerim Adım 37 için:** Seçenek 2 (AI çeviri) en hızlı + risksiz. Brewmaster `__BM_DEFS` İngilizce keys + her key'e `tr_name`, `tr_main_category` field'ları eklenir. UI'da BJCP göstergesi Türkçe görünür.

### Eksik veya hatalı kayıt tespit edemedik

Karşılaştırmak için Brewfather'dan veri çekemediğimiz için Brewmaster `__BM_DEFS`'ın doğruluğu/eksikliği bu adımda **doğrulanamadı**. Adım 18 audit'inde `__BM_DEFS` zengin (248 key, OG/FG/IBU/SRM/ABV ranges) ama Türkçe ad eksikliği zaten bilinen.

---

## Bağımsız doğrulama — `__BM_DEFS` kayıt sayısı

Brewmaster mevcut BJCP DB:

| Metrik | Değer |
|---|---:|
| Total BJCP keys | 248 |
| English names only | 248 (Adım 18 raporu) |
| Türkçe names | 0 |
| Vital stats (OG/FG/IBU/SRM/ABV ranges) | 248 (komple) |
| BJCP 2021 vs 2015 ayrımı | Karışık (etiketsiz) |
| Ana kategori field | YOK (sadece flat liste) |

**Brewmaster zaten 248 stil veriyle iyi durumda.** Eksik olan sadece Türkçe ad + main category etiketleme. Adım 37'de bu hızlıca kapatılabilir (AI translation).
