# AUDIT STEP 35 — BREWFATHER COLLECTION

**Tarih:** 2026-04-26
**Mod:** Otonom + Kaan credentials provided (env-only, asla rapora/commit'e girmedi)
**Sonuç:** **BAŞARISIZ — temel veri yok.** Kaan'ın Brewfather hesabı boş (yalnızca 1 default sample reçete). Public recipe API'si yok. Adım 35 hedefi (500-2000 ek reçete) bu kanaldan karşılanamıyor.

---

## İş A — API keşif (BAŞARILI)

### Auth
- HTTP Basic Auth çalışıyor
- Header: `Authorization: Basic base64(USERNAME:APIKEY)`
- 200 OK döndü, content-type application/json

### Endpoint test sonuçları

| Endpoint | Status | Sonuç |
|---|---|---|
| `GET /v2/recipes` | 200 | **1 reçete** (default sample) |
| `GET /v2/recipes?limit=200` | 200 | 1 reçete (pagination yok, hepsi bu) |
| `GET /v2/batches?limit=50` | 200 | **0 batch** |
| `GET /v2/recipes/default-ae116...` | 200 | Detail OK (full schema) |
| `GET /v2/inventory/fermentables?limit=5` | 200 | **0 inventory** |
| `GET /v2/recipes/public` | **401** | Auth gerekli (public endpoint yok) |
| `GET /v2/public/recipes` | 401 | Aynı |
| `GET /v2/library` | 401 | Aynı |
| `GET /recipes/public` | 404 | Yok |
| `GET /api/public/recipes` | 404 | Yok |
| `web.brewfather.app/recipes` (HTML) | 200 | SPA — JS rendered, scrape için browser otomasyonu gerekli (Adım 32 raporu doğrulandı) |

### Recipe detail schema (referans)

Default sample reçetesinden çıkarılan zengin schema (60+ field):

    _id, _created, _ev, _timestamp, _type,
    name, type, style:{name},
    og, fg, abv, ibu, color, attenuation,
    batchSize, boilSize, boilTime, efficiency, mashEfficiency,
    fermentables:[{_id, name, amount, percentage, color, type, grainCategory, origin, supplier, attenuation, potential, potentialPercentage}],
    hops:[{name, amount, alpha, time, use, ...}],
    yeasts:[{name, type, attenuation, ...}],
    miscs:[...],
    mash:{...}, fermentation:{...}, water:{...},
    notes, brewedCount, public, rating,
    styleConformity, styleAbv, styleBuGu, styleColor, styleFg, styleIbu, styleOg, styleRbr,
    folderRefs, searchTags, tags

**Kaliteli schema** — V7 dataset için ideal. Kayda değer field'lar: `brewedCount` (kalite filtresi), `rating`, `styleConformity` (Brewfather kendi BJCP uyum skoru), `notes`.

---

## İş B — Reçete fetch (BAŞARISIZ — YETERSİZ VERİ)

| Metrik | Değer |
|---|---|
| Hesapta toplam reçete | **1** |
| Tipi | Default sample (`Sample Blonde Ale`) |
| Kaynak | Brewfather'ın yeni hesap için verdiği şablon |
| brewedCount | undefined |
| Kullanıcı yüklemesi | YOK |

**`_brewfather_raw_recipes.json`** dosyasında 1 reçete saklandı (transparency için, `author` ve `equipment` alanları gizlilik nedeniyle silindi).

---

## İş C-D-E-F — Atlandı (veri yok)

Aşağıdaki adımlar yapılmadı çünkü kalite filtresinden geçecek 0 reçete:

- **İş D — Kalite filtre:** 1 reçete `brewedCount` undefined → quality threshold (>=1) FAİL
- **İş C — V7 schema normalize:** Sadece 1 reçete'yi normalize etmek anlamsız
- **İş E — classifyMalt recompute:** Aynı sebep
- **İş F — V7 dataset birleştir:** 1 reçete dataset'e marjinal katkı 0 — birleştirilmedi
- `_brewfather_quality_recipes.json` ÜRETİLMEDİ
- `_ml_dataset_v7_with_brewfather.json` ÜRETİLMEDİ

---

## İş G — Brewfather feature notları (Adım 32 derinleştirme)

API discovery sırasında recipe detail schema'sından öğrenilen V8+ değerli feature'lar:

### Feature 1: `styleConformity` + per-axis style scores
Brewfather her reçete için stile uyum 0-1 skoru hesaplıyor + per-axis (`styleOg, styleFg, styleAbv, styleIbu, styleColor, styleBuGu, styleRbr`) detaylı match veriyor.

**Brewmaster'da:** Mevcut V6 motor BJCP aralık check'i yapıyor (✅⚠️ icon) ama agregat skor yok. Brewfather pattern'i: tek scalar conformity + breakdown.

**V8 değer:** Reçete editöründe "Stil uyum: %72" badge'i + tıklayınca breakdown.
**Zorluk:** Düşük (V6 zaten check yapıyor, sadece scalar agregat hesabı eklenir).

### Feature 2: `brewedCount` + `rating` (kullanıcı performans takibi)
Brewfather her reçete için kaç kez brewed + rating tutuyor. Bu kalite sinyali (Adım 35'te quality filter için kullanmak istemiştik).

**Brewmaster'da:** `S.durum: "yapimda"` var ama "kaç kez yapıldı" sayacı yok. Bir kullanıcı aynı reçeteyi 5 kez yapmış olabilir, bilgi kayboluyor.

**V8 değer:** Yapım sayacı + tasting rating + favorite flag → kullanıcının "favoriler"i öne çıkar.
**Zorluk:** Orta (S schema'ya yeni field, KR list UI'da rating yıldızları, sort).

### Feature 3: `searchTags` + `folderRefs` (organizasyon)
Brewfather: hierarchical folders + arbitrary tag arrays. Brewmaster'da: tek `klasor` field (string).

**V8 değer:** Multi-tag (örn. "weekend brew" + "kveik" + "competition entry") + folder hiyerarşi.
**Zorluk:** Orta (UI redesign, tag input + autocomplete).

---

## V7 dataset toplam durumu (Adım 33 + 34 sonrası, Brewfather katkısı YOK)

| Kaynak | Reçete | Durum |
|---|---:|---|
| Pilot (BYO/Brulosophy) | 199 | ✅ |
| Diydog (Brewdog) | 325 → 284 mapped | ✅ |
| TMF | 170 | ✅ |
| **Brewfather** | **1 (kullanılmadı)** | ❌ Hesap boş |
| **TOPLAM (V7 effective)** | **613** | (Adım 33'le aynı) |

Adım 35 sonrası **dataset değişmedi**. V7 motor metrikleri (Test top-1 %36.4) aynı kalıyor.

---

## Sıradaki adım — Kaan'ın kararı gerekli

Brewfather kanalı veri sağlamıyor. Üç seçenek:

### Opsiyon A — Kaan manuel reçete yükle
Brewfather'a 50-200 reçete (Türkçe topluluk + kendi reçetelerin + Bira Burada katalogundan) **manuel yükle** (web app + UI). 30 günlük Premium trial bu pencerede:
- BeerXML import → toplu yükleme (eğer Türkçe kaynaklar BeerXML'e dönüştürülmüşse)
- Manuel UI giriş

**Iş yükü:** 1-3 sprint Kaan'ın kendi zamanı (Brewmaster geliştirme dışı)
**Sonuç:** Bu reçeteler V7 dataset'e eklenebilir (kalite filtreli)

### Opsiyon B — Pivot to Tier 1 alternatif (Adım 28 raporundan)
- **GitHub BeerXML arşivleri** (diydog dışında, daha geniş arama) — başka 5-10 BeerXML repo bulunabilir
- **AHA NHC PDF arşivleri** — manuel parse, ~500 reçete tahmini, OCR + manuel
- **r/Homebrewing thread** scrape — Reddit API + NLP parse, ~500-2000 tahmini

**İş yükü:** 2-4 sprint
**Sonuç:** Belgian Trappist cluster için spesifik arama (örn. GitHub `topic:trappist beerxml`) yapılabilir

### Opsiyon C — Mevcut V7 (613 reçete) ile devam
Adım 34'teki 3 fix'i uygula (n<5 merge → 14 main category, regularization, dropout):
- top-1 %50+, top-3 %75+ tahmini
- Belgian cluster küçük kalır ama main_category bazlı tahmin OK
- V7 production-ready: marjinal başarı (V6 holdout %74'ün altında)

**İş yükü:** 1-2 sprint (mevcut Adım 34 follow-up)
**Sonuç:** Tatmin edici değil ama uygulanabilir

---

## YASAKLAR — uyumlu

✅ API key/username **HİÇ BIR YERDE** yazılmadı (script'te env-only, raporda redacted, commit'te yok)
✅ Rate limit aşılmadı (10 request total, 30/min limitinin çok altında)
✅ Kaan'ın 1 default reçetesi `_brewfather_raw_recipes.json`'a `source: brewfather_user` etiketsiz kaydedildi (zaten kullanılmadı, ama transparency için)

---

## Sonraki acil adım

**Adım 36:** İki seçenek arasından Kaan'ın seçimi gerekli — Opsiyon A (manuel veri yükleme), Opsiyon B (alternatif kaynak), veya Opsiyon C (mevcut V7 ile devam + iyileştirmeler).

**Brewfather credentials:** Kullanım sonrası ihtiyaç yok. Kaan API key'i Brewfather'da revoke edebilir (güvenlik).

**Discovery script:** `_v7_bf_discover.js` env-only credentials kullanıyor, commit'e güvenli (script içinde hard-coded değer yok).
