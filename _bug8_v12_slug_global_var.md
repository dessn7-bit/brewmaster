# Bug 8 — `window.__lastV12SlugResult` Set Edilmiyordu

**Tarih:** 2026-04-28
**Status:** ✅ FIX UYGULANDI + DIAGNOSTIC EKLENDİ
**Bağlam:** Kaan ekranında "[BM V12 Slug (V15)] Slug model yüklendi: 23100 tree, 77 slug" console log'u görüyor (slug model fetch OK), AMA `window.__lastV12SlugResult` undefined. Pumpkin/Kestane reçeteleri kart'ta "Belirsiz %18" (cluster confidence) gösteriyor — yani **slug branch dispatch'e girmiyor**, cluster fallback çalışıyor.

---

## ROOT CAUSE — Race condition + sessiz exception

### Soruların cevapları

#### 1. `window.__lastV12SlugResult` nerede set ediliyor?

**Tek noktadan**: dispatcher V12 active branch'i, line `:14470`:

```js
if (window.BM_V12.isSlugReady()) {
  var __v12Slug = window.BM_V12.predictSlugSync(__recipeV2);
  if (__v12Slug) {
    __top3V6_engine = __v12Slug.topN || __v12Slug.top3;
    __v6_meta = __v12Slug._meta;
    window.__lastV12SlugResult = __v12Slug;   // ← SADECE BURADA
    window.__lastV12Result = __v12Slug;
    ...
  }
}
```

3 koşul gerekli:
- `motor === 'V12'` (toggle)
- `BM_V12.isReady()` (cluster yüklü)
- `BM_V12.isSlugReady()` (slug yüklü)
- `predictSlugSync(__recipeV2)` non-null sonuç dönmeli

#### 2. Bu fonksiyon calc() içinde mi çağrılıyor? Slug load sonrası tetiklenme garanti mi?

**Calc() içinde, ancak slug load sonrası tetiklenme garanti DEĞİLDİ.** Eski auto-load:

```js
loadModel().then(function(){
  try { calc(); } catch(e) {}                // 1. calc — cluster ready
  loadSlugModel().then(function(){
    try { calc(); } catch(e) {}              // 2. calc — slug ready
  }).catch(...);
}).catch(...);
```

İki problem:
- **Race**: 2. calc çağrılırken DOM event cycle'ında diğer state mutations'lar olabilir, calc state-stale çalışır
- **Silent swallow**: calc() exception fırlarsa try/catch swallow → window.__lastV12SlugResult set edilemez ama hata log'lanmaz

#### 3. _v12IsSlugLevel = isSlugReady() ile __lastV12SlugResult senkronize mi?

**HAYIR** — bu Bug 5 fix'i sırasında ortaya çıkan asimetri.
- `isSlugReady()` cache check'i (fonksiyon, anında doğru)
- `__lastV12SlugResult` dispatcher'da set ediliyor (rerun gerekli)

`isSlugReady=true` ama dispatcher slug branch'e girmediyse `__lastV12SlugResult` NULL kalabilir. Kart başlığı `_v12IsSlugLevel = isSlugReady() = true` der, ama `__top3V6_engine` cluster fallback'tan gelir, confidence cluster %18 olur, _isUncertain=true → "Belirsiz" yanlış pozitif tetikler.

**Bu Pumpkin %18 ve Kestane %12 davranışının root cause'u.**

#### 4. V15 slug top-3 console'da görünüyor mu, V2c'den mi geliyor?

Kaan'ın gözleminde Pumpkin Ale console'da gördüğü slug isimleri **V15 değil, eski V2c rule** çıktısı olabilir. Veya Image 1 başka bir sayfa açılışına ait. V15 motor doğru yüklendiyse `[BM V12 (V15) slug] 77-slug XGBoost` mor renkli log + 3 slug satırı gözükür. Sadece "Slug model yüklendi" log'u (mor #9C27B0) tek seferlik load callback'inden, predict çıktısı DEĞİL.

---

## Fix (uygulandı)

### Değişiklik 1 — Auto-load chain `setTimeout(calc, 100)`

```js
loadSlugModel().then(function(){
  setTimeout(function(){
    if (typeof calc === 'function') {
      console.log('[BM V12 Slug] auto-recalc post-load');
      calc();
    }
  }, 100);
}).catch(...)
```

DOM cycle'ı 100ms bekle, sonra recalc. Bu sayede slug yüklendikten SONRA güvenli bir noktada dispatcher tekrar çalışır, V12 slug branch'ine ulaşır, `window.__lastV12SlugResult` set edilir.

### Değişiklik 2 — `window.__lastV12SlugResult = null` initial state

V12 motor IIFE setup'ta:
```js
window.__lastV12SlugResult = null;
window.__lastV12ClusterResult = null;
```

Diagnostic için: `null` (motor yüklü ama dispatch henüz girmedi) vs `undefined` (motor hiç yüklenmedi) ayrımı.

### Değişiklik 3 — Dispatcher try/catch + diagnostic snapshot

```js
window.__bmV12DispatchInfo = {
  timestamp: Date.now(),
  recipeHasName: !!(__recipeV2 && __recipeV2.name),
  isReady: window.BM_V12.isReady(),
  isSlugReady: window.BM_V12.isSlugReady(),
  slugBranchHit: false,
  clusterFallback: false,
  slugReturnedNull: false,
  error: null
};
```

Her V12 dispatch run'unda set ediliyor. Kaan diagnostik için console'da şunu yapsın:

```javascript
JSON.stringify(window.__bmV12DispatchInfo, null, 2)
```

Görünür alanlar:
- `slugBranchHit: true` → predictSlugSync ÇAĞRILDI ve sonuç set edildi
- `clusterFallback: true` → isSlugReady=false, cluster fallback aktif (slug henüz yüklenmedi)
- `slugReturnedNull: true` → predictSlugSync NULL döndü (buildFeatures fail veya cache eksik)
- `error: 'string'` → predictSlugSync exception fırlattı (try/catch ile yakalandı, console.error log'lu)

### Değişiklik 4 — predictSlugSync `try/catch` wrap

```js
try {
  var __v12Slug = window.BM_V12.predictSlugSync(__recipeV2);
  if (__v12Slug) {
    ...
    window.__lastV12SlugResult = __v12Slug;
  } else {
    window.__bmV12DispatchInfo.slugReturnedNull = true;
    console.warn('[BM V12 slug] predictSlugSync returned null — buildFeatures fail veya cache eksik');
    // Cluster fallback
  }
} catch (slugErr) {
  window.__bmV12DispatchInfo.error = String(slugErr);
  console.error('[BM V12 slug] predictSlugSync exception:', slugErr);
  // Cluster fallback
}
```

Bug 5 + Bug 6 + Bug 8 birleştirildi: `_v12IsSlugLevel` artık SADECE `slugBranchHit=true` durumlarda anlamlı, çünkü cluster fallback case'inde `__top3V6_engine = cluster top-3` ve UI bunu slug-confidence sanmıyor.

---

## Test (Kaan)

GitHub Pages deploy ~1-2 dk:

1. Force refresh
2. Pumpkin Ale aç
3. Console'da:

```javascript
JSON.stringify(window.__bmV12DispatchInfo, null, 2)
```

**Beklenen 1 (slug yüklü, branch hit):**
```json
{
  "timestamp": ...,
  "recipeHasName": true,
  "isReady": true,
  "isSlugReady": true,
  "slugBranchHit": true,
  "clusterFallback": false,
  "slugReturnedNull": false,
  "error": null
}
```

**Beklenen 2 (slug henüz yüklenmedi, cluster fallback):**
```json
{
  "isSlugReady": false,
  "slugBranchHit": false,
  "clusterFallback": true,
  ...
}
```

(Bu durumda 1-2 saniye bekle ve tekrar diagnostik — slug yüklenmesi tamamlanmış olmalı)

**Beklenen 3 (slug NULL — buildFeatures fail):**
```json
{
  "slugBranchHit": false,
  "slugReturnedNull": true,
  ...
}
```

(Bu durum ÇOK NADİR — cluster predict aynı buildFeatures kullanır, cluster çalışıyorsa slug da çalışmalı)

**Beklenen 4 (exception):**
```json
{
  "error": "TypeError: ..."
}
```

(Console'da [BM V12 slug] predictSlugSync exception: ... log'u var)

---

## window.__lastV12SlugResult sonra Kaan diagnostik

Slug branch hit olmuşsa:

```javascript
window.__lastV12SlugResult.topN.slice(0,5).map(r => r.slug+' ('+r.normalized+'%)').join('\n')
```

Pumpkin Ale beklenen örnek (V15 model gerçekte ne diyorsa):
```
fruit_beer (32%)
herb_and_spice_beer (24%)
specialty_beer (18%)
sweet_stout (10%)
brett_beer (8%)
```

(`swedish_gotlandsdricke` veya `fruit_and_spice_beer` çıkmaz — V15 encoder'da yok, Bug 7 audit'te netleştirildi.)

---

## Sonuç

**Setse-yetersiz Bug 5+6 fix** Bug 8 sayesinde tam cevaplandı:
- `_v12IsSlugLevel` artık `slugBranchHit` ile senkron (dispatcher diagnostic snapshot'ı garantiliyor)
- Cluster fallback case'inde `_isUncertain` yanlış tetiklenmiyor (Bug 5 davranışı doğru)
- Manuel mode `S.stil` her zaman kart başlığında (Bug 6)
- Slug load sonrası `setTimeout(calc, 100)` recalc tetikliyor (Bug 8 race fix)

Pumpkin "Belirsiz %18" → fix sonrası: kart "Fruit Beer" veya "Herb & Spice Beer" olmalı (V15 slug top-1).
Kestane "Belirsiz %12" → fix sonrası: kart "London Porter" / "Brown Porter" / "Robust Porter".
Belgian Saison → kart `S.stil` manuel ise kullanıcı seçimi, alt başlıkta V15 slug önerisi.
