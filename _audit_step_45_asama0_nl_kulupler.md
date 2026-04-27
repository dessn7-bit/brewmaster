# AUDIT STEP 45 AŞAMA 0 — NL KULÜP ARŞİVLERİ PRE-FLIGHT

**Tarih:** 2026-04-27
**Süre:** ~30 dk
**Sonuç:** **2/6 kulüp viable, 1 login-only, 1 unviable, 2 ölü.** Toplam ~106 net yeni reçete potansiyeli.

---

## Özet tablo

| # | Kulüp | URL | Canlı? | Reçete | Schema | Belgian/Sour katkı | GO/NO-GO |
|---|---|---|---|---:|---|---|---|
| 1 | **De Roerstok** | roerstok.nl | ✅ LIVE | **101** | Web-Op-Maat CMS = twortwat clone | Tripel/Dubbel/Quadrupel/Witbier/Saison var | **🟢 GO** |
| 2 | **De Amervallei** | amervallei.nl | ✅ LIVE | **5** | Web-Op-Maat CMS | Niş, az boost | 🟡 OPTIONAL (5 reçete bonus) |
| 3 | Triple-W | triple-w.org | ⚠️ login-only | 0 public | reçete page → /login redirect | (member-only) | ❌ NO-GO |
| 4 | Deltabrouwers | deltabrouwers.nl | ✅ LIVE WordPress | bilinmiyor | Yarışma kategorileri (Klasse A/B/C/D/E) | Yarışma reçeteleri ayrı sayfalarda dağınık | ❌ NO-GO (no central listing) |
| 5 | Hop Bier | members.ziggo.nl/drents.hopbier | ❌ DEAD | 0 | (ziggo.nl ISP-host kapanmış) | - | ❌ NO-GO + Wayback **YOK** |
| 6 | De Ware Brouwer | home.kpn.nl/brou0237 | ❌ DEAD | 0 | (kpn.nl ISP-host kapanmış) | - | ❌ NO-GO + Wayback **YOK** |

---

## 1. De Roerstok (✅ GO)

**URL:** https://www.roerstok.nl/
**Listing:** `/recepten?_=248` (200, 25 KB, **101 ID**)
**CMS:** Web-Op-Maat CMSv2.7 (twortwat ile **birebir aynı** — c1.creagraphy.nl)

### BeerXML endpoint (twortwat ile aynı pattern!)
```
https://www.roerstok.nl/recepten?id=N&xml=1
Method: GET
Response: application/xml
```

5 sample test:
| ID | HTTP | Size | İçerik |
|---:|---:|---:|---|
| 1 | 200 | 348 b | Empty stub (NAME boş, FERMENTABLES yok) |
| 10 | 200 | 348 b | Empty stub |
| 50 | 200 | 348 b | Empty stub |
| 100 | 200 | 348 b | Empty stub |
| 248 | 200 | **2,985 b** | **Real BeerXML** |

→ ID range muhtemelen **200-400 aralığında** sparse. 101 listing'den gelen ID'leri kullanmak gerekecek (twortwat gibi). Listing'i parse + bulk fetch.

### Tahmini sprint (Adım 45 part 2)
- 101 reçete × 1 sec rate = **2 dk fetch**
- Aynı parser (twortwat parse_full.js) **0 modifikasyon** gerek
- Aynı style mapping (NL → V8 14cat) reuse
- ~**~75-90 net yeni reçete** (twortwat dedupe ~10-20)

### Reuse stratejisi
twortwat pipeline'ını **parametrize et:**
1. Hostname değiştir: twortwat.nl → roerstok.nl
2. Listing URL: `/recepten` → `/recepten?_=248`
3. Geri kalan 1:1 aynı

---

## 2. De Amervallei (🟡 OPTIONAL)

**URL:** https://amervallei.nl/recepten (sadece 5 reçete: id=3,4,5 + olası başka)

### BeerXML endpoint
```
https://amervallei.nl/recepten?id=N&xml=1
Method: GET
Response: application/xml (UTF-8'de "iso-8859-1" deklarasyon ama içerik UTF-8 — minor)
```

### Sample id=5 ("Big Black IPA"):
- Type: All Grain
- 14 KB (rich BeerXML)
- Notes field doluyor (recipe context)

### Karar
5 reçete çok az. **Adım 45 part 2'de Roerstok ile birlikte ekstra olarak fetch edilebilir** (1 dk). Belirgin Sour/Belgian katkı yok (5 reçete'nin bjcp dağılımı bilinmiyor). Bedava bonus.

---

## 3. Triple-W (❌ NO-GO)

**URL:** https://www.triple-w.org/

`/recepten` endpoint **login redirect** veriyor:
```
HTTP 200 url=https://www.triple-w.org/login?next=https%3A%2F%2Fwww.triple-w.org%2Frecepten
```

**Reçeteler member-only.** Robots/ToS açısından scrape edilebilir mi belirsiz, ama auth gerektiriyor → external scrape uygulanamaz.

**Sample 2 fetch yapılmadı** — listing zaten erişilemez, gereksiz request.

---

## 4. De Deltabrouwers (❌ NO-GO)

**URL:** https://www.deltabrouwers.nl/ (LIVE, WordPress)

`/recindex.htm` 404 (eski static URL artık yok). Site WordPress'e migrate edilmiş.

Mevcut yapı: `?page_id=N` queries:
- page_id=201: "Klasse B"
- page_id=203: "Klasse C"
- page_id=205: "Klasse D"
- page_id=207: "Klasse E"

Bunlar **yarışma kategorileri** — her yıl belirli bir Klasse için yarışan reçeteler. Tek bir merkezi reçete listesi yok. Yıl bazlı sayfalar var (page_id=1256:"2016", 1821:"2017", 1933:"2018"). Bunların içeriğini scrape etmek mümkün ama:
- Schema bilinmez (her yarışma sayfası farklı format)
- Reçete içerikleri (grain bill, hop schedule) var mı net değil
- Reuse path yok (twortwat gibi standart endpoint yok)

**Etkili çıktı oranı düşük → NO-GO.**

---

## 5. Hop Bier — Hans Aikema (❌ DEAD + no Wayback)

**URL:** https://members.ziggo.nl/drents.hopbier/receptenpagina.htm
**Status:** HTTP 000 (DNS / connection failed)

ziggo.nl 2020'de ISP-hosting kapattı (members.ziggo.nl subdomain dead).

### Wayback Machine
```json
{"url": "members.ziggo.nl/drents.hopbier/receptenpagina.htm", "archived_snapshots": {}}
```

**Hiç snapshot yok.** Site arşivlenmemiş → **kurtarılamaz**.

---

## 6. De Ware Brouwer (❌ DEAD + no Wayback)

**URL:** https://home.kpn.nl/brou0237/recepten.html
**Status:** HTTP 000 (DNS / connection failed)

kpn.nl da ~2018-2020'de personal hosting kaldırdı.

### Wayback Machine
```json
{"url": "home.kpn.nl/brou0237/recepten.html", "archived_snapshots": {}}
```

**Hiç snapshot yok.** Kurtarılamaz.

---

## Sonuç ve öneriler

### Aşama 0 NL kulüp pre-flight: 🟢 De Roerstok GO + 🟡 Amervallei OPTIONAL bonus

**Önerilen Adım 45 part 2 plan:**
1. **De Roerstok 101 reçete** + **Amervallei 5 reçete** = ~106 reçete
2. twortwat parse pipeline reuse (CMS aynı, schema aynı, parser değişmez)
3. Bulk fetch ~3 dk @ 1 sec rate
4. V11 dataset = V10 + Roerstok/Amervallei → ~8090 reçete (+%1.3)
5. Marjinal ML kazanım, ama Belgian Strong cluster boost (Trappist Tripel/Quadrupel/Witbier varsa)

**Beklenen kazanım:** Az (~%1-2 dataset growth), ama düşük maliyet (15 dk pipeline).

### Diğer kulüpler

- **Triple-W**: Forum/email aracılığı ile member access istenebilir — Adım 47+
- **Deltabrouwers**: Yarışma sayfa-by-sayfa scrape (manuel) — düşük ROI
- **Hop Bier + De Ware Brouwer**: KAYBEDİLDİ. Wayback yok, geri dönüşü yok.

---

## Çıktılar
- `_audit_step_45_asama0_nl_kulupler.md` — Bu rapor
- `_tmp/roerstok_*` — sample HTML
- `_tmp/amervallei_*` — sample HTML + recepten + BeerXML test
- `_tmp/triplew_*` — login redirect proof
- `_tmp/delta_*` — WordPress page sweep
- Wayback JSON yanıtları (boş `{}`) snapshot'ları kaydedildi
