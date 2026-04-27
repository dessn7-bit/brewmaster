# AUDIT STEP 45 PLAN C — BREWER'S FRIEND FREE API KEY TEST

**Tarih:** 2026-04-27
**Süre:** ~10 dk (sondaj)
**Sonuç:** **🟡 KARMA** — Hesap açma blokeli (Cloudflare), ama API doc kritik bilgi verdi. Plan B sınırlı çalışabilir, **Kaan'ın testi şart**.

---

## 1. Hesap açma — ben yapamadım (Cloudflare bloku + email confirm)

| Endpoint | Status |
|---|---|
| `/signup` | 301 redirect (Cloudflare arkasında) |
| `/register` | 403 Cloudflare challenge |
| `/account/signup` | 403 |
| `/users/sign_up` | 403 |
| `/pricing` | 403 |

**Tüm signup yolları 403 Cloudflare challenge.** Bypass yok (Plan D başarısız olduğu gibi). Email confirm akışı da AI tool'larıyla yapılamaz.

**→ Kaan tarayıcıdan üye olmalı:**
1. https://www.brewersfriend.com → Sign Up (free)
2. Email + password (free tier yeterli)
3. Profile → Integrations / API Keys → Generate API Key
4. Kopyala, bana yolla

---

## 2. KRİTİK BULGU — API Doc okundu (api.brewersfriend.com Cloudflare-free!)

**docs.brewersfriend.com erişilebilir** (Cloudflare yok). Playwright ile render edip net info aldım:

### `/v1/recipes` endpoint = **"Search All My Recipes"**

> "This endpoint allows you to get **your** recipes."

**Öneml gerçek:** Listing endpoint'i SADECE kendi recipes'ı döner. **320K reçete bulk download bu endpoint ile MÜMKÜN DEĞİL.**

### `/v1/recipes/:recipe_id` endpoint = **"Get One Recipe"**

> "This endpoint allows you to get one recipe, you can also get one recipe in BeerXML."

**Public/private** açıklaması doc'ta YOK. Yani:
- Sadece kendi recipes ID'leriyle çalışır mı? (Plan B çöp)
- Veya başkasının public ID'leriyle de çalışır mı? (Plan B viable, ama ID listesi nereden?)

### `/v1/recipes/:recipe_id.xml` endpoint = **"Get Recipe Beer XML"**

```
GET https://api.brewersfriend.com/v1/recipes/:recipe_id.xml
Headers: X-API-KEY: <key>
Status:
  200 — Recipe successfully retrieved
  405 — Could not find a recipe matching this query
```

Aynı belirsizlik — public access olup olmadığı doc'ta yazmıyor.

### Response schema (Search All — own recipes)
```json
{
  "message": "success",
  "count": "552",
  "recipes": [
    {
      "id": "578357",
      "title": "Juicy Bitcoin",
      "brewmethod": "allgrain",
      "styleid": "50",
      "batchsize": "31",
      "boilsize": "36",
      "boilgravity": "1.057",
      "efficiency": "80",
      "og": "1.066", "fg": "1.012", "abv": "7.12",
      "ibutinseth": "47.12",
      "srmmorey": "3.83",
      "waterprofile": "Balanced Profile",
      "ca2": "0", "mg2": "0", "so4": "0",
      "notes": "...",
      "public": "0",       ← visibility flag
      "searchable": "0"
    }
  ]
}
```

→ Schema rich, `public` field var (data model public/private destekliyor). Ama API behavior `public=1` recipes'a access verir mi belirsiz.

---

## 3. Endpoint sondaj (key olmadan)

| Endpoint | Status | Body |
|---|---:|---|
| `/v1/recipes` | 401 | `{"message":"unauthorized","detail":"missing api key"}` |
| `/v1/recipes/465277` | 401 | aynı |
| `/v1/recipes/465277.json` | 401 | aynı |
| `/v1/recipes/465277.xml` | **502** | "error code: 502" (server hatası, format ne?) |
| `/v1/recipes/465277/beerxml` | 404 | route yok |
| `/v1/style`, `/v1/styles` | 404 | route yok |
| `/v2/recipes/465277` | 404 | v2 yok |

**FAKE key testi:**
```
GET /v1/recipes
X-API-Key: 0000000000000000FAKE_TEST_KEY
→ 401 {"message":"unauthorized","detail":"invalid api key"}
```

→ Sistem fake key'i reddediyor (gerçek key olsaydı endpoint düzgün çalışırdı). 502 .xml'de — muhtemelen authenticated context'te düzgün cevap verir.

---

## 4. Sitemap problemi — Plan B'nin diğer engeli

`/v1/recipes/{id}.xml` public reçeteleri verirse bile, **320K recipe ID listesi nereden**?

- `www.brewersfriend.com/homebrew/sitemap.xml` → 403 Cloudflare (Plan D'de doğrulandı)
- API'de "list public recipes" endpoint'i **YOK** (sadece "my recipes")
- Ürün search filter (`/homebrew-recipes/?style_id=26D`) → 403 Cloudflare
- Stratejik geri çekilme: ID brute force (1..1,000,000 enumerate) — etik dışı + rate-limit risk

**Eğer Plan B'nin ID listesi yoksa:**
- Bilinen 1-2 reçete ID'si üzerinden test (Quadrupel 465277, Westvleteren 793490)
- Bu sadece "API çalışıyor mu" kanıtlar, **bulk fetch yapamayız**

---

## 5. Test sonuçları (yapılamayan testler — Kaan'a iş)

### Test A — Kendi recipes (sanity check)
```bash
curl -H "X-API-Key: <KAAN_KEY>" https://api.brewersfriend.com/v1/recipes
```
**Beklenen:** 200 + boş array (`"count": "0"`, yeni hesap)

### Test B — Public recipe access (KRİTİK SORU)
```bash
curl -H "X-API-Key: <KAAN_KEY>" https://api.brewersfriend.com/v1/recipes/465277
curl -H "X-API-Key: <KAAN_KEY>" https://api.brewersfriend.com/v1/recipes/465277.xml
```
**Olası sonuçlar:**
| Sonuç | Plan B durumu |
|---|---|
| **200 + Quadrupel BeerXML** | ✅ Plan B viable (ama ID listesi sitemap problemi hâlâ var) |
| **401 / 403** | ❌ Free tier kendi recipes-only, Plan B çöp |
| **404** | Recipe not public OR endpoint farklı format |
| **405** | Doc'taki "not found" code |

### Test C — 3 ID test
```bash
for id in 465277 793490 617270; do
  curl -H "X-API-Key: <KAAN_KEY>" "https://api.brewersfriend.com/v1/recipes/$id.xml"
done
```

### Rate limit — Doc'ta yazmıyor
Free tier'da hourly/daily limit doc'ta açık değil. Test sırasında 429 Too Many Requests gözlemlenirse o zaman bilinir.

---

## 6. KARAR (Kaan'a aktarılacak)

### 🟢 GO eğer Test B 200 dönerse

Plan B kısmen viable:
- Public recipe ID'lerine API ile erişim
- Ama ID listesi yok (sitemap CF arkasında)
- Sadece bilinen ID'lerle (forum/Reddit'ten) çalışabilir
- ~1000-5000 reçete (manuel ID toplama + API fetch) — sınırlı kazanım

### 🔴 NO-GO eğer Test B 401/403/404 dönerse

Plan B çöp. Free tier sadece kendi recipes. Pro $30/yıl alma kararı:
- Pro tier "all recipes API" verirse → 320K full access (büyük kazanım)
- Pro tier de "my recipes only" ise → para harcanmış olur

### 🟡 BELIRSIZ eğer 405 dönerse

Doc'ta 405 = "not found" → recipe public değil veya format yanlış. Farklı public ID dene.

---

## 7. Önerilen sıralı plan

**1. Kaan free hesap aç (5 dk):**
- https://www.brewersfriend.com/ → Sign Up
- Email + password (kullan-at email yeterli)
- Profile → API Keys → Generate
- Bana key'i yapıştır (key .env'de saklanır, repo'ya commit edilmez)

**2. Ben Test A/B/C yapacağım (5 dk):**
- 3 farklı public recipe ID test
- Sonuca göre Plan B GO/NO-GO

**3. Eğer GO + sınırlı (sadece bilinen ID'ler):**
- Forum/Reddit'ten popüler clone reçete listesi topla
- ~500-1000 ID'lik ID kümesi
- Bulk fetch (~30 dk @ 1 sec rate)
- V11 retrain

**4. Eğer NO-GO:**
- Plan A (Kaan local scraper)
- Plan E (Compubeer/Kaggle)
- Adım 46 (Specialty sub-categorize, ML feature engineering)

---

## 8. Çıktılar

- `_audit_step_45_planC_apikey_test.md` — Bu rapor
- `_bf_docs_render.js` — Playwright doc renderer
- `_bf_docs_recipes.txt` — Recipes endpoint full doc text (3 KB)
- `_bf_docs_api.txt` — API root doc text
- `_bf_docs_recipe.txt` — Recipe Beer XML endpoint doc text

---

## 9. Hatırlatma — API key güvenlik

Kaan key'i yapıştırırsa:
- **Repo'ya commit etmem.** `.env` dosyasında saklanır.
- `.gitignore`'a `.env` zaten ekli (kontrol et).
- Test sonrası key'i revoke etmek isterse profile'dan silebilir.
