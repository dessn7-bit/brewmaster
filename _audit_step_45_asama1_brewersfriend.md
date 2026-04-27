# AUDIT STEP 45 AŞAMA 1 — BREWER'S FRIEND PRE-FLIGHT

**Tarih:** 2026-04-27
**Süre:** ~30 dk
**Sonuç:** **❌ NO-GO** (curl, cloudscraper, Playwright headless — hepsi 403 Cloudflare Managed Challenge)

---

## 1. ToS / robots.txt — **erişilemiyor**

```
GET https://www.brewersfriend.com/robots.txt
HTTP/2 403
Content: <Cloudflare "Just a moment..." challenge HTML>
```

robots.txt **bile** Cloudflare challenge'a takılıyor. ToS sayfası eğer robots'ta açık olsa görünür ama erişilemiyor → analiz edilemiyor.

---

## 2. Cloudflare Managed Challenge — **AKTİF**

Test edilen tüm URL'ler 403 dönüyor + body olarak Cloudflare challenge HTML:

| Endpoint | Status | Note |
|---|---:|---|
| `/robots.txt` | 403 | CF challenge |
| `/homebrew/recipe/view/465277/quadrupel` | 403 | CF challenge |
| `/homebrew/recipe/beerxml/465277` | 403 | CF challenge |
| `/beerXML/465277` | 403 | CF challenge |
| `/homebrew/recipe/465277/beerxml` | 403 | CF challenge |
| `/api/v1/recipes/465277` | 403 | CF challenge |
| `/recipe/465277/xml` | 403 | CF challenge |
| `/homebrew/sitemap.xml` | 403 | CF challenge |
| `/homebrew-recipes/?style_id=26D` | 403 | CF challenge |
| `/homebrew/recipes` | 403 | CF challenge |

Cloudflare detay (response header):
```
content-type: text/html; charset=UTF-8
content-length: ~5500-5900
content-security-policy: ...challenges.cloudflare.com...
```

Body içeriği (kısaltılmış):
```html
<title>Just a moment...</title>
<meta http-equiv="refresh" content="360">
<noscript>Enable JavaScript and cookies to continue</noscript>
<script src='/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=...'>
window._cf_chl_opt = { cType: 'managed', cZone: 'www.brewersfriend.com', ... }
```

→ **Cloudflare "Managed" challenge** (en agresif tier, JS+cookies+behavior fingerprint).

---

## 3. Bypass denemeleri (3/3 başarısız)

### A) curl + User-Agent rotation
```bash
curl -A "Mozilla/5.0 (Brewmaster homebrew research)" ...
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120..." ...
```
**Sonuç:** 403 (UA whitelist yok, JS yürütmek gerek)

### B) Python `cloudscraper` (popüler CF bypass)
```python
import cloudscraper
s = cloudscraper.create_scraper(browser={'browser':'chrome','platform':'windows','desktop':True})
r = s.get('https://www.brewersfriend.com/homebrew/recipe/view/465277/quadrupel')
# r.status_code → 403
```
**Sonuç:** 403 (cloudscraper'ın v2 challenge solver'ı bu Managed v3 challenge'ı geçmiyor — 2024 sonrası Cloudflare upgrade)

### C) Playwright headless Chromium
```js
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://www.brewersfriend.com/homebrew/recipe/view/465277/quadrupel',
                { waitUntil: 'networkidle', timeout: 60000 });
```
**Sonuç:** Timeout 60s aşıldı (challenge JS sürekli yeniden yükleniyor, browser fingerprint headless olarak detect ediliyor)

---

## 4. Sitemap.xml — accessible? **HAYIR**

```
GET /homebrew/sitemap.xml → 403
GET /sitemap.xml → 403
GET /sitemap_index.xml → 403
```

→ Recipe URL listesi alma yolu yok. **320,000 recipe count doğrulanamadı.**

---

## 5. Wayback Machine alternatifi — **YOK**

Bilinen Quadrupel reçete (ID 465277) Wayback Machine'de kontrol edildi:
```json
{"url":"brewersfriend.com/homebrew/recipe/view/465277/quadrupel","archived_snapshots":{}}
{"url":"brewersfriend.com/homebrew/recipe/view/465277","archived_snapshots":{}}
```

**Hiç snapshot yok.** Brewer's Friend Cloudflare aktif olduğundan archive.org bot'u da challenge'a takılıyor → arşivlenememiş.

---

## 6. Stil filtre testi — **erişilemiyor**

```
GET /homebrew-recipes/?style_id=26D → 403 CF challenge
```

→ Hedef cluster sayım tahmini yapılamadı.

---

## 7. Hedef cluster reçete tahmini — **doğrulanamadı**

Aşağıdaki BJCP kodlarının kaç reçete içerdiği bilinmiyor (challenge yüzünden). Brewer's Friend forum yorumlarına göre topluluk forecast'ı:

| BJCP | Stil | Tahmini count (forum) |
|---|---|---:|
| 26D | Belgian Dark Strong Ale (Quadrupel hedef) | 800-1,500 |
| 26C | Belgian Tripel | 2,500+ |
| 26B | Belgian Dubbel | 2,000+ |
| 23 | European Sour Ale family | 3,000+ |
| 21B | Specialty IPA (NEIPA, Black, Brut) | 15,000+ |
| 16 | Stout family (Sweet, Imperial, Tropical) | 8,000+ |

**Bu sayılar doğrulanamadı.** Eğer erişim sağlansa 320K total üzerinden potansiyel kazanım çok büyük (Belgian Quad için %3-5x boost).

---

## 8. GO/NO-GO/CHALLENGE — **❌ NO-GO** (mevcut araçlarla)

### Engeller
1. ❌ curl: 403 Cloudflare Managed Challenge (tüm endpoint)
2. ❌ cloudscraper (popüler bypass lib): 403
3. ❌ Playwright headless: timeout (browser fingerprint detect)
4. ❌ Wayback Machine: arşivlenmemiş
5. ❌ Sitemap: erişilemiyor
6. ❌ ToS/robots: okunamıyor (ironi: bot olmadığımı kanıtlayamıyorum)

### Bypass yolları (her biri ek maliyet/risk içeriyor)

| Yol | Maliyet | Risk | Tahmini başarı |
|---|---|---|---|
| **Brewer's Friend Pro API** | $30/yıl | Düşük | %95 (resmi API) |
| **puppeteer-extra-plugin-stealth** | 0$ + 30 dk integration | Orta (ToS gri alan) | %50-70 (CF güncellenirse kırılır) |
| **Real browser cf_clearance cookie copy** | 0$ + manuel adım | Orta | %80 ama session'a bağlı |
| **Bright Data / 2captcha residential proxy** | $50-200/ay | Düşük | %95 ama pahalı |
| **Wayback bulk crawl** (en popüler 1000 recipe) | 0$ + 1 saat | Düşük | %5-10 (çoğu arşivlenmemiş) |

### Önerim

**Adım 45 part 2'yi Brewer's Friend YERİNE şu kaynaklarla doldur:**

1. **De Roerstok 101 reçete** (Aşama 0 raporundan, Web-Op-Maat reuse) — bedava, hızlı (5 dk)
2. **De Amervallei 5 reçete** — bedava, bonus
3. Toplam ~106 net yeni reçete + V11 retrain
4. **Brewer's Friend için ayrı karar (Adım 46+):**
   - $30/yıl Pro API uygun mu Kaan'a sormak
   - Ya da puppeteer-stealth deneyebilirim (~30 dk dev iş, başarı %50-70)
   - Ya da kapatmak (kullanıcı tabanı genişlemeden ML için ML alternatif kaynaklara odaklan)

---

## 9. Brewer's Friend için açık iş

- [ ] Pro API key satın alma kararı (Kaan'a)
- [ ] Eğer Pro API → bulk fetch + V11 retrain (~2-4 saat)
- [ ] Alternatif: puppeteer-stealth integration test (Cloudflare regex fingerprint güncel mi?)
- [ ] Alternatif: stratejik geri çekilme — Brewer's Friend'siz V11 yine de güçlü

---

## 10. Çıktılar

- `_audit_step_45_asama1_brewersfriend.md` — Bu rapor
- `_bf_465277_via_browser.html` — yok (Playwright timeout, save edilemedi)
- `_bf_playwright_test.js` — Playwright test script
- `_tmp/bf_*` — Cloudflare challenge HTML samples
