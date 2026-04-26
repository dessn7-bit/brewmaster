# AUDIT STEP 32C — BREWFATHER FEATURE ANALİZİ

**Tarih:** 2026-04-26
**Hedef:** Brewfather public dökümantasyonundan feature inventory + Brewmaster için öğrenme notları
**Yöntem:** docs.brewfather.app + web.brewfather.app WebFetch (auth-free), API key kullanılmadı

---

## A. Brewfather Feature Inventory

### A1. Recipe Designer

| Feature | Brewfather | Brewmaster |
|---|---|---|
| Ingredient search (malt/hop/yeast) | ✅ Hem inventory hem built-in DB | ✅ MALTLAR/HOPLAR/MAYALAR sabit dizileri |
| Custom ingredient ekleme | ✅ Dialog'tan direkt | ⚠️ Sadece editör (kayıt değil) |
| Real-time gravity/color/ABV calc | ✅ Live update | ✅ calc() her render'da |
| Recipe scaling | ✅ Batch size + ingredient + OG/IBU target | ✅ batchOlcek() fonksiyonu (orantılı) |
| Versioning | ✅ Premium | ❌ |
| Folders / tagging | ✅ | ✅ klasor field + filtreleme |
| BJCP style match (visual range bar) | ✅ Green when in range, checkmark all-conform | ✅ Editör başlığında BJCP "✅⚠️" göstergesi (Adım 16 tespiti) |
| Recipe export (BeerXML) | ✅ Premium | ✅ beerXmlExport() function |
| Recipe import (BeerXML) | ✅ Premium | ❌ |
| Style matcher / style finder | ⚠️ Visible style ranges | ✅ V6 motor — ML tahmin (Brewfather'da YOK) |

**Brewmaster fark:** ML-based style prediction (V6) Brewfather'da YOK. Brewmaster'ın **özgün diferansiyatörü**.

### A2. Water Chemistry

| Feature | Brewfather | Brewmaster |
|---|---|---|
| 6 mineral input (Ca/Mg/Na/Cl/SO4/HCO3) + pH | ✅ | ✅ |
| Source vs target water profiles | ✅ Dual profile + dilution calc | ⚠️ Sadece target |
| SO4:Cl ratio derived metric | ✅ Otomatik | ✅ (Su sekmesinde gösterim) |
| Hardness / alkalinity | ✅ | ✅ Kolbach/RA hesabı |
| Mash pH estimation | ✅ | ✅ pH_est = 5.72 + 0.04 × RA |
| Pre-configured city profiles (Burton, Pilsen, Dublin) | ✅ | ✅ SU_KAYNAK listesi (Burton, Pilsen, vs.) |
| Style → water profile suggestion | ✅ Style-aligned guidance | ✅ stildenSuProfili() function |

**Yakın paritede.** Brewmaster su tarafı zaten sağlam.

### A3. Batch Tracking

| Feature | Brewfather | Brewmaster |
|---|---|---|
| Brew status workflow (Planned→Brewing→Fermenting→Conditioning→Done) | ✅ Otomatik prompt'lar | ✅ S.durum: aktif/yapimda/arsiv (3 state) |
| "Brew Day!" badge / overdue indicator | ✅ | ❌ |
| Fermentation visual progress bar | ✅ % completion | ❌ |
| Gravity reading log | ✅ Stats grid | ✅ brewLog field (manuel) |
| Tilt/iSpindel integration | ✅ Direkt cihaz feed | ❌ |
| Multiple device support (RAPT, Float, Plaato, BrewPiLess) | ✅ | ❌ |
| CSV/JSON export of fermentation data | ✅ | ⚠️ Tüm reçete export var (BeerXML) |

**Brewmaster eksik:** Otomatik device telemetry. V8+ roadmap için Tilt entegrasyonu (BLE veya REST API) düşünülebilir.

### A4. Inventory Management

| Feature | Brewfather | Brewmaster |
|---|---|---|
| Stok takibi | ✅ Premium | ✅ STOK / bm_stok_v1 (Adım 15 tespiti) |
| Maliyet izleme | ✅ Premium | ❌ |
| Reçete → stok düşme | ✅ | ✅ stoktenDus() fonksiyonu (yapımda durumunda) |
| Alarm (düşük stok) | ✅ | ⚠️ Sadece görsel uyarı |

**Yakın pariteyle Brewmaster ücretsiz** sunuyor (Brewfather Premium tier'ında).

### A5. Tools & Calculators

| Tool | Brewfather | Brewmaster |
|---|---|---|
| Strike water temp | ✅ | ⚠️ Mash sekmesinde manuel |
| Mash pH estimation | ✅ | ✅ |
| Yeast pitch rate calc | ✅ | ❌ (manual) |
| Yeast starter calc | ✅ | ❌ |
| Hop-stand bitterness | ✅ | ❌ |
| FG estimation | ✅ | ✅ Tinseth + attenuation |
| Color adjuster | ✅ | ❌ |
| Carbonation/priming | ✅ | ✅ prim() function (Adım 15 BOS field) |

**Brewmaster eksik (kolayca eklenebilir):** Yeast pitch rate calc, hop-stand bitterness, color adjuster.

### A6. Profiles

| Profile | Brewfather | Brewmaster |
|---|---|---|
| Equipment profile | ✅ | ⚠️ S.verim manuel |
| Mash schedule (multi-step) | ✅ | ✅ S.mashAdimlar field |
| Fermentation steps profile | ✅ | ⚠️ Sadece primTemp |
| Water profile | ✅ Save+reuse | ✅ S.suHedef + suMineralleri |

### A7. Public Recipe Database

| Feature | Brewfather | Brewmaster |
|---|---|---|
| Public recipe library (browse) | ✅ Free users | ❌ |
| Recipe sharing/forking | ✅ Premium publish | ❌ |
| Built-in style guidelines DB | ✅ Free | ✅ STYLE_DEFINITIONS.json (203 stil) |

**Brewmaster eksik kritik:** Public recipe paylaşımı. V8+ için Brewmaster recipe-share platform düşünülebilir (Türkiye topluluğu için yerel cluster).

### A8. API & Integrations

| Endpoint/Integration | Brewfather | Brewmaster |
|---|---|---|
| REST API (recipes, batches, inventory) | ✅ Premium, /v2/* (auth zorunlu) | ❌ |
| Public unauthenticated endpoint | ❌ Yok (DOĞRULANDI) | — |
| BeerXML import/export | ✅ | ✅ Sadece export |
| Webhook | ❌ | ❌ |

### A9. UI/UX Patterns

| Pattern | Brewfather | Brewmaster |
|---|---|---|
| Mobile-first design | ✅ Responsive web app | ✅ PWA, mobile-first |
| Brew day tracker mode | ✅ Step-by-step | ⚠️ brewLog manuel kayıt |
| Color-coded status badges | ✅ | ⚠️ Bazı yerlerde |
| Dark mode | ✅ | ❌ |
| Notification/alarm | ✅ | ✅ alarmKaydet (Adım 15) |

### A10. Public Recipe DB Erişim Testi

**API:** Tüm `/v2/*` endpoint'leri auth gerekli. Public endpoint **YOK** (docs.brewfather.app/api.md doğrulandı).

**Web app (`web.brewfather.app/recipes`):** SPA, JavaScript-rendered. WebFetch'le statik HTML görünmüyor. Public recipe browse gerçekte **var ama scrape için browser otomasyonu gerekiyor** (Playwright/Puppeteer). Bu adımda atlandı.

**Sonuç:** Brewfather public recipe DB'si **manuel browse mümkün** (tarayıcıda) ama programatik scrape Cloudflare/JS challenge nedeniyle zor. V7 dataset için fizibıl değil.

---

## B. Brewmaster için Öğrenilecekler (V8+ roadmap)

### B1. Yüksek değer + Düşük zorluk

1. **Source vs target water dual profile + dilution calc**
   - Mevcut: Sadece target profile.
   - Ekleme: Kullanıcı musluk suyu ölçümü → otomatik dilution oranı hesabı (RO + tap karışımı).
   - Zorluk: Düşük (su matematiği basit, UI ekleme küçük).

2. **Yeast pitch rate calculator**
   - Mevcut: Yok (kullanıcı manuel hesaplıyor).
   - Ekleme: OG + batch_size + maya cell density + viability → cell count hedef vs. attıın.
   - Zorluk: Düşük (formül net, MAYALAR.atu zaten var).

3. **Brew day tracker mode (step-by-step)**
   - Mevcut: brewLog manual.
   - Ekleme: "Bugün brew day" notification + adım-adım wizard (mash 60dk timer → boil → fermentor transfer).
   - Zorluk: Orta (UI iş yükü).

4. **Hop-stand / Whirlpool bitterness calc**
   - Mevcut: Yok.
   - Ekleme: Tinseth modify ile whirlpool süresi-sıcaklık IBU hesabı.
   - Zorluk: Düşük.

### B2. Orta değer + Orta zorluk

5. **Public recipe sharing platform (Türkiye topluluğu)**
   - Mevcut: Yok. Brewmaster reçeteleri sadece local LocalStorage + Firebase sync.
   - Ekleme: Public recipe board, kullanıcı reçetesini paylaşırsa diğerleri görsün, fork etsin.
   - Değer: Türkiye'ye özel cluster — BiraBurada/ev üreticisi reçeteleri toplu hâlde.
   - Zorluk: Orta (backend gerekli, Firebase Realtime DB üzerine kurulabilir).

6. **Cost tracking (Premium parity)**
   - Mevcut: Yok.
   - Ekleme: STOK kalemlerine birim fiyat → reçete maliyeti otomatik.
   - Zorluk: Düşük (alan ekleme).

7. **Color adjuster tool**
   - Mevcut: Yok.
   - Ekleme: Hedef SRM girince → crystal/chocolate/roast oran önerisi.
   - Zorluk: Orta (ters Morey formülü).

### B3. Yüksek değer + Yüksek zorluk

8. **Tilt/iSpindel telemetry integration**
   - Mevcut: Yok.
   - Ekleme: BLE Bluetooth Web API ile Tilt cihazından gravity okuma.
   - Değer: Otomatik FG tracking (Brewmaster'ın eksik halka).
   - Zorluk: Yüksek (Bluetooth Web API + cihaz protokolü).

9. **Versioning (recipe history)**
   - Mevcut: Sadece son hâl saklanır.
   - Ekleme: Her kayıtta diff snapshot, undo/restore.
   - Zorluk: Yüksek (storage 2-3x büyür).

10. **ML model tuning UI**
    - Mevcut: V6 motor harness manuel olarak harness scriptiyle test ediliyor.
    - Ekleme: Kullanıcının "yanlış tahmin" feedback'i → model retraining (V7 hedef).
    - Zorluk: Yüksek (V7 motor + retraining pipeline gerekli).

---

## C. Brewmaster'ın Brewfather'a Üstünlükleri

1. **ML-based style prediction (V6)** — Brewfather sadece statik BJCP range gösterir, ML tahmin yok.
2. **Türkçe lokalizasyon** — Brewfather İngilizce-only.
3. **Yerli maya/malt katalogu** (BiraBurada ürünleri) — Brewfather generic.
4. **Tek-sayfa offline-first PWA** — Brewfather web-first, offline modu sınırlı.
5. **Free tier'da inventory management** — Brewfather Premium'a paywall.
6. **Firebase sync ücretsiz** — kullanıcı kendi Firebase projesini kullanır, Brewfather Premium fiyatı yok.

---

## D. Sonuç — V8+ roadmap önceliği (önerilen)

1. ⭐⭐⭐ Yeast pitch rate + starter calc (düşük zorluk, yüksek talep)
2. ⭐⭐⭐ Source/target water dual profile + dilution
3. ⭐⭐ Brew day tracker mode + step-by-step wizard
4. ⭐⭐ Public recipe sharing (Türkiye topluluğu — Brewmaster'ın "moat")
5. ⭐⭐ Hop stand/whirlpool IBU calc
6. ⭐ Color adjuster
7. ⭐ Cost tracking
8. (Uzun vade) Tilt BLE entegrasyonu

**Kritik üstünlük korunsun:** ML-based style matching (V6/V7) Brewfather'ın YAPAMADIĞI şey. Bu Brewmaster'ın diferansiyatörü, V7 sprint'i devam etmeli.
