# AUDIT STEP 29 (REVIZE) — ÇİFT YÖNLÜ KAYNAK PİLOTU

**Tarih:** 2026-04-26
**Mod:** Otonom
**Hedef:** İki kanaldan raw recipes recovery fizibilitesi
**Sonuç:** **HER İKİ YÖNTEM DE ZAYIF.** Yöntem 1 (BYO Wayback) %5-14 snapshot oranı + değişken parse başarısı = ~17 reçete; Yöntem 2 (Brewer's Friend) **Cloudflare Turnstile ile tamamen bloklu**. Tier 2 alternatifler değerlendirilmeli.

---

## YÖNTEM 1 — BYO Wayback Machine Recovery

### İş 1A — URL envanteri
- 8 batch dosyasından çıkarılan toplam BYO URL: **241** (Adım 28 ile uyumlu)
- Sample 19 URL'i deterministik (her 13. URL) seçildi.

### İş 1B — Wayback CDX yokla

**Test 1 (300ms delay, 19 URL):**

| Sonuç | Sayı | Yüzde |
|---|---:|---:|
| OK (snapshot bulundu) | 1 | %5 |
| NO_SNAPSHOT | 5 | %26 |
| ERR/HTTP fail (timeout, rate limit) | 13 | %68 |

**Test 2 (5s delay, 7 URL):**

| Sonuç | Sayı | Yüzde |
|---|---:|---:|
| OK | 1 | %14 |
| NO_SNAPSHOT | 4 | %57 |
| TIMEOUT | 2 | %29 |

**Pattern:** 5s delay rate limit'i kısmen azaltıyor (%5→%14) ama NO_SNAPSHOT oranı yüksek — Wayback gerçekten BYO recipe sayfalarının çoğunu arşivlememiş. URL'ler 2024-2025 öncesi var olduğu için, BYO 2024 sonrası site yenileme öncesi snapshot çok az.

**Tahmini gerçek snapshot oranı (rate limit sonsuz pasifle):** %20-30 üst sınır.

### İş 1C — Snapshot parse testi

**Sample 1: `wheatwine` (başarılı parse — 20250826 snapshot):**

    13 lbs. (5.9 kg) German wheat malt
    2.75 lbs. (1.25 kg) German Pilsner malt
    0.75 lbs. (1.25 kg) Simpsons Golden Promise™ malt
    13 oz. (0.37 kg) honey malt
    1.4 lbs. (0.64 kg) white sugar
    14.4 AAU German Magnum hops (60 min.)
    8.25 AAU Citra® hops (5 min.)
    [+ 5 more weight matches]

11 weight match — **BAŞARILI YAPISAL PARSE**. Parse formatı: `<amount> <unit>(. ?(metric)?) <ingredient name><br/>`. Düz regex ile çıkarılabilir.

**Sample 2: `dunkelweizen` (zayıf parse — 20240813 snapshot):**

    21 g at 4% alpha acids  [hop info, NOT malt]

Sadece 1 weight match — **BAŞARISIZ PARSE**. Aynı BYO sitesi farklı recipe sayfasında farklı HTML pattern kullanmış. Recipe sayfaları **homojen değil** — bazıları "X lbs. (Y kg) malt" formatı, bazıları farklı (tablo, JSON-LD, image-only).

### İş 1D — BYO recovery fizibilite hesabı

| Faktör | Değer |
|---|---:|
| Toplam BYO URL | 241 |
| Snapshot bulunma oranı (orta tahmin) | %20 |
| → Snapshot bulunan | ~48 |
| Parse başarı oranı (örnek 2'den) | %50 |
| → Parse edilebilir | ~24 |
| **Etkin recovery** | **~17-30 reçete** |

**Karar:** 241 BYO URL'sinden **maksimum ~30 reçete** kurtarılabilir. V7 dataset için ek 30 reçete ihmal edilebilir miktar. **Yöntem 1 fizibıl ama düşük getiri.**

### Wayback ek not — rate limit
Wayback CDX API açık ama rate limit muhtemel (bizim 300ms delay'de 13 timeout, 5s delay'de hâlâ 2 timeout). Etik scraping için 10s+ delay → 241 URL × 10s = 40 dakika. Tek seferlik scrape mümkün ama etkin getiri 30 reçete için aşırı maliyet.

---

## YÖNTEM 2 — Brewer's Friend FİLTRELİ Pilot

### İş 2A — Site keşif

**robots.txt fetch:** HTTP 403 — Cloudflare Turnstile challenge HTML döndü.

**Listing page (`/homebrew-recipes/`) fetch:** HTTP 403 — aynı challenge.

**Challenge response HTML içeriği (kanıt):**

    <title>Just a moment...</title>
    <meta http-equiv="content-security-policy" content="...
      script-src 'nonce-...' 'unsafe-eval' https://challenges.cloudflare.com;
      ...">
    [Cloudflare Turnstile widget loader script]

**Anlam:** Brewer's Friend sayfaları **Cloudflare Bot Management ile korumalı**. Standart HTTP istemcisi (Node.js, curl, WebFetch) Turnstile JavaScript challenge'ı çözemez. Bypass için:
- Headless browser (Playwright/Puppeteer) — Turnstile sometimes solved automatically
- 3rd party CAPTCHA solver (paid)
- Resmi API (eğer varsa)
- Tarayıcı session cookie + manuel auth flow

### İş 2B — Kalite kriterleri tanımı

Tasarım hazır olsa da uygulanamadı (site bloklu). Tasarım korunsun:
- rating >= 4.0
- vote_count >= 5
- brewed_count >= 3
- BJCP feature aralık doğrulaması (OG/FG/IBU/SRM/ABV)
- pct sum 95-105
- malts array dolu

### İş 2C-2D-2E — Sample fetch + BJCP doğrulama + fizibilite

**Sample fetch yapılamadı** (403 challenge). Tüm Brewer's Friend pilotu **DURDU**.

### Karar

**Yöntem 2 başarısız.** Brewer's Friend public scrape için resmi API key veya headless browser otomasyonu (yeni bağımlılık + bakım yükü) gerekiyor. Bu adımın scope'u dışı.

---

## KARŞILAŞTIRMA + KARAR

| Kriter | BYO Wayback | BF Filtreli |
|---|---|---|
| Pilot sample # | 19 + 7 = 26 | 0 |
| Erişim engeli | Wayback rate limit + arşiv eksik | **Cloudflare Turnstile (tam blok)** |
| Snapshot/Page bulunma | %5-20 | %0 (challenge bypass yok) |
| Parse başarısı (bulunduğunda) | %50 | yapılamadı |
| Tahmini total recovery | ~17-30 reçete (241'den) | 0 (mevcut yöntemle) |
| Kalite | Yayınlanmış (BYO editör) | Topluluk + BJCP filtreli (potansiyel) |
| Etik/teknik risk | Düşük (Wayback public) | Yüksek (Cloudflare bypass) |

**Sonuç: HER İKİSİ DE ZAYIF.**

- **Yöntem 1:** Fizibıl ama getiri düşük (~30 reçete = V7 dataset hedefinin %2'si).
- **Yöntem 2:** Erişim duvarına çarpıyor — uygulanabilir değil.

---

## TIER 2 — ALTERNATİF KAYNAKLAR (Adım 30 hedefi)

Adım 28 raporundaki Tier 1+2 listesi güncel + yeni keşifler:

### Tier A — Yapısal raw recipes mevcut, aktif

| Kaynak | Tahmini # | Erişim Yöntemi | Format | Risk |
|---|---:|---|---|---|
| **GitHub BeerXML arşivleri** | 500-2000 | Doğrudan repo clone | XML structured | DÜŞÜK (public domain) |
| **Reddit r/Homebrewing reçete thread'leri** | 1000-5000 | Reddit API (free, OAuth) | Free-text + bazı BeerXML attached | ORTA (NLP parse) |
| **The Mad Fermentationist (Mike T) blog** | ~250 | RSS + blog scrape | Yapısal recipe çoğu post'ta | DÜŞÜK |
| **AHA NHC arşivi** | ~500 | PDF download (manuel) | PDF metin (OCR + manuel) | YÜKSEK (manuel zorunlu) |
| **MTF (Milk The Funk) wiki** | ~150 | Wiki API | Mixed | ORTA |

### Tier B — Manuel ya da scope dışı

- BJCP NHC kazananları (PDF, ~500/yıl) — yıllık kontes verileri.
- Türkiye yerel topluluk (BiraBurada, Beermutsfest) — manuel toplama.
- Brewfather/BeerSmith public exports — auth gerek.

### Önerilen Adım 30 odağı

**GitHub BeerXML arşivleri** — en hızlı + en yapısal:
- Public arşivler örn: `github.com/topics/beerxml`, `homebrew-recipes` repos
- BeerXML 1.0 standardı: `<RECIPE><MALTS><MALT><NAME>...<AMOUNT>...` — direkt parse edilebilir
- Repo clone → XML parse → JSON normalize → V7 candidate
- Tahmini 500-2000 reçete bulunabilir
- Sıfır rate limit / Cloudflare blok riski

İkincil: Reddit threads (eğer GitHub yetersiz çıkarsa).

---

## Sonraki acil adım

**Adım 30 — REVIZE TEKRAR:** GitHub BeerXML arşivlerini keşif + sample download + parse pilot.

İş bölümü:
1. GitHub search ("beerxml" topic, "homebrew-recipes" topic, "*.xml" file type)
2. Top 10 repo clone → BeerXML dosya sayım
3. 50 sample BeerXML dosyası parse → schema doğrula
4. Stil dağılımı + kalite gözden geçir
5. Karar: tam toplamaya geç veya başka kaynak araştır

**Mevcut iş için pilot dataset durumu:**
- `_pilot_byo_wayback_sample.json` — 1 başarılı parse (dunkelweizen, weak)
- `_pilot_brewers_friend_filtered_sample.json` — boş (BF bloklu)

**V7 dataset durumu (Adım 27 + 29 sonrası):**
- Pilot dataset: 199 reçete (`_ml_dataset_v7_partial_with_malts.json` Adım 27'den)
- BYO Wayback potansiyeli: +~30 reçete (etkili olmayan ek)
- Brewer's Friend potansiyeli: 0 (mevcut araç)
- **Toplam: 199 reçete — V7 train için yetersiz, en az 1500 hedef**

**Gap:** ~1300 reçete eksik. Adım 30 başarılı olursa GitHub'dan kapatılabilir.
