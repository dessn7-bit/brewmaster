# Adım 16 — Engine API + Taxonomy Diagnosis

**Tarih:** 2026-04-26
**Hedef dosya:** `Brewmaster_v2_79_10.html`
**Amaç:** Adım B2 (3 motor benchmark harness) için ön koşul — motor imzaları, çıktı yapıları, BJCP / slug taksonomisi ve mevcut normalize katmanı.
**Kural:** Read-only audit. Kod değişikliği yok, motor çağırma yok.

---

## 1. Motor Fonksiyonları

### 1a. V2c — `bm-engine-v2c` (satır 131-443)

**Engine entry point:**
- `function findBestMatches(recipe, topN = 5)` — satır **335**.
- `function styleMatchScore(slug, recipe, opts = {})` — satır 207 (tek-stil scorer; `findBestMatches` bunu döngüde çağırır).
- `function matchSubstyles(recipe, topParentSlug)` — satır 412 (Pastry Stout vb. alt-stil tetikleyici).

**Public API (satır 440):**
```js
window.BM_ENGINE = { styleMatchScore, findBestMatches, matchSubstyles, defs, subs };
```

**İmza ve argüman yapısı** — `findBestMatches(recipe, topN)`:
- `recipe`: Düz obje, beklenen alanlar (UI tarafı `__recipeV2` olarak satır 13270-13298'de inşa ediyor):
  ```
  _og, _fg, _ibu, _srm, _abv, _mayaTip,
  mayaId, maya2Id, hopIds[], maltIds[], katkiIds[],
  percents:{ pilsnerPct, wheatPct, oatsWheatPct, oatsPct, munichPct, viennaPct,
             crystalPct, chocPct, roastPct, cornPct, ricePct, sugarPct,
             aromaticMunichPct, aromaticAbbeyMunichPct, baseMaltPct },
  lactose:bool, filtered:bool, aged:bool, dhPer10L:number, blended:bool
  ```
- `topN`: integer, default `5`.

**Dönüş yapısı** (satır 354-364, 408): `Array<MatchObject>`, **ilk eleman = top-1**.
```js
[
  { slug: "belgian_dubbel",        // motor slug
    displayTR: "Belçika Dubbel",   // okunaklı TR/EN ad
    category: "ale_belgian",
    family: "belgian_strong",
    score: 1247,                   // ham skor
    max: 1850,                     // maximum mümkün skor
    normalized: 67,                // 0-100 yüzde
    breakdown: ["malt.munich.safe", ...],  // hit listesi
    _boostScore?, _boostNorm?, _boosted? // aile tie-break boost meta
  },
  ...
]
```

**İmza karakteristiği:** Slug-bazlı çıktı. Sıra korunmuş (sort + family tie-break). Top-N parametre ile slice. Format **V5/V6'dan farklı** — top1/top3/top5 alanları YOK, dizinin kendisi sıralı.

### 1b. V5 — `bm-engine-v5` (satır 527-790)

**Engine entry point:**
- `function classifyMulti(recipe, opts)` — satır **741** (ana giriş).
- Yardımcılar: `extractFeatures(recipe)` 595, `toVec(recipe)` 682, `knnScores(vec, k)` 705, `rfScores(vec)` 721, `ruleScores(recipe)` 733, `normSlug(s)` 541.

**Public API (satır 781-788):**
```js
window.BM_ENGINE_V5 = {
  classifyMulti, extractFeatures, toVec, knnScores, rfScores, ruleScores,
  RECS_COUNT: RECS.length,            // 1016
  FEATURE_COUNT: FKEYS.length,
  FOREST_TREES: __FOREST.length,      // 50
};
```

**İmza** — `classifyMulti(recipe, opts)`:
- `recipe`: Aynı V2c `__recipeV2` formatı kabul ediyor (içeride `extractFeatures(recipe)` çağırıyor — satır 748: `const vec = toVec(recipe);` — `extractFeatures`'i `recipe` ile çağırıyor demek değil; aslında `toVec` recipe'den feature çıkarıyor ama dahili pipeline V2c-uyumlu input istiyor).
- `opts`: `{ k?:5, w_knn?:0.4, w_rf?:0.6, w_rule?:0.0 }` — KNN/RF/Rule blend ağırlıkları (V5 production'da rule kapalı).

**Dönüş yapısı** (satır 773-778):
```js
{
  top5: [{slug, score, confidence, displayTR}, ...], // 5 eleman
  top3: [...],                                       // 3 eleman
  top1: {slug, score, confidence, displayTR} | null,
  _meta: { k, wKNN, wRF, wRule, knn_contrib, rf_contrib, rule_contrib }
}
```

**Slug normalizer (satır 541):** `function normSlug(s) { return __ALIASES[s] || s; }` — V5 dataset duplikat slug'larını canonical'a maplemek için (örn. `"doppelbock"` → `"german_doppelbock"`). Detay: §5.

**KRİTİK BULGU (UI default için Adım 2'de detay):** Satır 532'de "Kullanim: window.BM_ENGINE_V5.classifyMulti(recipe, opts)" yorumu var ama tüm dosyada `BM_ENGINE_V5\.` regex'i sadece tanım ve console.log satırlarını döndürüyor — **`calc()` veya başka herhangi bir runtime path V5'i çağırmıyor.** V5 yüklenip duruyor ama kullanılmıyor.

### 1c. V6 final — `bm-engine-v6-final` (satır 792-954)

**Engine entry point:**
- `function classifyMulti(input, opts)` — satır **926** (ana giriş, V5 API uyumlu wrapper).
- Çekirdek: `function predictV6Enhanced(testRecipe, TRAINING_RECS, k)` (referans satır 931'de) — multi-K weighted KNN + veto rules + feature weighting (NO Random Forest, satır 950).
- Output adapter: `function toV5Output(pred)` satır 898 — V5'in top1/top3/top5 sözleşmesine çevirir.

**Public API (satır 935-944):**
```js
window.BM_ENGINE_V6_FINAL = {
  classifyMulti: classifyMulti,
  predict: predictV6Enhanced,
  RECS_COUNT: TRAINING_RECS.length,    // 1100
  FEATURES_COUNT: 79,
  VERSION: 'V6_FINAL',
  METHOD: 'multi-K weighted KNN + veto + feature weighting',
  PERFORMANCE_5FOLD: { top1: 0.785, top3: 0.865, top5: 0.873, N: 1100, seed: 42 },
  PERFORMANCE_HOLDOUT: { top1: 0.738, top3: 0.808, top5: 0.815, train: 840, test: 260, seed: 42 }
};
```

**İmza** — `classifyMulti(input, opts)`:
- `input`: İki form kabul ediyor (satır 930):
  - `{features: {...79 feature...}}` — record-shaped
  - `{...79 feature direct}` — raw features object (içeride wrap'lanır)
- `opts`: `{ k?: 5 }` (sadece k anlamlı — V5'tekinin alt-kümesi).

**Dönüş yapısı** (satır 909-923, V5 ile bire-bir uyumlu):
```js
{
  top1: {slug, score, confidence, displayTR} | null,
  top3: [...],
  top5: [...],
  _meta: {
    version: 'V6_FINAL',
    method: 'multi-K weighted KNN + veto + feature weighting',
    k: 5, rf: false, recipes: 1100, features: 79,
    confidence: <number>, neighborCount: <number>
  }
}
```

**Eleman formatı** (satır 901-906):
- `slug`: V6 dataset slug (örn. `"belgian_dubbel"`)
- `score`: `weight / totalWeight` (0-1 aralığı)
- `confidence`: `Math.round(score*100)` (0-100 integer)
- `displayTR`: slug→başlık-case dönüşüm (`"belgian_dubbel"` → `"Belgian Dubbel"`). Yani **gerçek bir Türkçe isim değil**, slug'ın görünür hali.

### 1d. Wrapper / dispatcher

Tek merkezi dispatcher YOK. Üç motor `calc()` içinde **doğrudan** çağrılıyor (Adım 2). Her biri ayrı try/catch bloğunda — biri patlasa diğerleri çalışmaya devam ediyor.

---

## 2. UI Default Motor — `calc()` içinde hangi motor

`calc()` (Brewmaster ana hesap fonksiyonu, lokasyon `Brewmaster_v2_79_10.html` editör render path'inde) şu sırayla 3 motor çağırıyor:

### Sıra 1 — V2c (satır 13268-13308)
```js
if (window.BM_ENGINE && window.BM_ENGINE.findBestMatches) {
  __recipeV2 = { _og, _fg, _ibu, _srm, _abv, _mayaTip, ... }; // satır 13270
  const __top3V2 = window.BM_ENGINE.findBestMatches(__recipeV2, 5);   // satır 13299
  __top3V2_engine = __top3V2;
  ...
}
```
- V2c top-3 sadece **debug log + diagnostics** için (`window.__lastV2Result`, satır 13306).
- UI render'a doğrudan giriyor mu? `__top3V2_engine` global'i atanıyor ama UI render template'inde tüketici yok — `__top3V6_engine`'a yaslanıyor (Sıra 3 sonrası override).

### Sıra 2 — V5 → **YOK**
`BM_ENGINE_V5` `calc()` içinde çağrılmıyor. Tüm dosyada eşleşme:
```
532:  // Kullanim: window.BM_ENGINE_V5.classifyMulti(recipe, opts)   ← yorum
781:  window.BM_ENGINE_V5 = { ... }                                  ← tanım
789:  console.log('[BM_ENGINE_V5] yuklendi:' ...)                    ← yükleme logu
```
**Sonuç:** V5 motoru yüklü (script'te tanımlı) ama runtime call path'i KOPUK. UI tarafından tüketilmiyor. Adım B2 için harness V5'i `window.BM_ENGINE_V5.classifyMulti()` ile dışarıdan çağırabilir, ama mevcut UI sadece V2c+V6 kullanıyor.

### Sıra 3 — V6 final (satır 13348-13416, **ANA UI TÜKETİCİ**)
```js
if (window.BM_ENGINE_V6_FINAL && window.BM_ENGINE_V6_FINAL.classifyMulti && typeof __recipeV2 !== 'undefined') {
  var __v6Features = (function(r){ ... 79 feature mapping ... })(__recipeV2); // satır 13350
  var __v6Result = window.BM_ENGINE_V6_FINAL.classifyMulti(__v6Features, { k: 5 }); // satır 13406
  __top3V6_engine = __v6Result.top3.map(function(x){
    return { slug: x.slug, score: x.score, normalized: x.confidence, displayTR: x.displayTR };
  });
  __v6_meta = __v6Result._meta;
  window.__lastV6Result = __v6Result;
}
```
- `__top3V6_engine` UI render template'inde **birincil veri kaynağı** (satır 13827, 13924).
- Render satır 13837: `if (_v5TopBjcp && _v5TopBjcp.length) { stil_tah = _v5TopBjcp[0].bjcp; }` — V6 top-1 → fuzzy BJCP key map → `stil_tah`'a yazılıyor.
- `_v5TopBjcp` ismi V5 zamanından kalma — değişken adı yanıltıcı ama içeriği V6 sonucu.

### Manuel override (satır 13418-13420, **HER ŞEYİN ÜSTÜNDE**)
```js
if(S.stil && typeof BJCP!=='undefined' && BJCP[S.stil]){
  stil_tah=S.stil;
}
S.stilTah=stil_tah;
```
Kullanıcı dropdown'dan BJCP adı seçtiyse bütün motor çıktıları geçersiz, `S.stil` aynen `stil_tah`'a yazılıyor → `S.stilTah` da bu olur.

### Toggle / engineMode flag — **YOK**
Grep önerileri (`engineMode`, `useV6`, `_engine`, ayar paneli switch'i) eşleşme yok. Motor seçimi compile-time (kodda hangisi çağrılıyorsa o), runtime toggle bulunmuyor.

### Adım B2 için sonuç
| Motor | Yüklü mü? | UI'da çağrılıyor mu? | Çağrı satırı |
|-------|-----------|----------------------|--------------|
| V2c | ✅ | Evet (sadece debug + family bağlamı) | 13299 |
| V5 | ✅ | **Hayır** | (yok) |
| V6 final | ✅ | **Evet (ana motor)** | 13406 |

B2 harness'ı 3 motoru bağımsız çağırarak top-1/top-3 toplayabilir. V5'in dead-code olması B2 değerini azaltmaz — performans karşılaştırması için zaten kütüphane bazlı bir benchmark gerekiyor.

---

## 3. BJCP Objesi

**Tanım satırı:** 2560 — `const BJCP = {`. Bitiş: 2809 (`};`).

**Anahtar sayısı:** **248** (kanıt: `awk 'NR>=2561 && NR<=2808 && /^[[:space:]]*"/{c++} END{print c}'` → 248).

**İlk 10 anahtar (raw kopya, satır 2561-2570):**
```
"German Pils"
"Czech Premium Pale Lager"
"Czech Pale Lager"
"Czech Amber Lager"
"Czech Dark Lager"
"Helles / Münchner Hell"
"Festbier / Wiesn"
"Munich Märzen / Oktoberfest"
"Munich Dunkel"
"Schwarzbier"
```

**Anahtar formatı:** **İnsan okunabilir İngilizce/uluslararası adlar**, çoğu BJCP 2021 standardından. Slug DEĞİL, Türkçe DEĞİL.
- Ayraç olarak **`/`** kullanılıyor — örn. `"Helles / Münchner Hell"`, `"California Common / Steam Beer"`. Source kodda `\` escape görünür ama gerçek key string'inde `/` var.
- Bazı anahtarlar emoji benzeri özel karakter içerir: ä, ö, ü, é (Märzen, Kölsch, Düsseldorf vb.).

**Değer obje yapısı** (örnek satır 2561):
```js
"German Pils": { og:[1.050,1.058], fg:[1.008,1.015], ibu:[20,30], srm:[4,6], abv:[5.0,6.0] }
```
Her stil için **5 numerik aralık** (alt-üst tuple):
- `og` — original gravity range (örn. `[1.050, 1.058]`)
- `fg` — final gravity range
- `ibu` — bitterness range (integer)
- `srm` — color range (integer/float)
- `abv` — alcohol % range

Kategori, alt-stil, maya, tarih gibi metadata YOK — sadece numerik zarflar. UI tarafında BJCP objesi yalnızca "Bu reçete OG/FG/IBU/SRM/ABV aralıklarına uyuyor mu?" check'i için kullanılıyor.

**Dropdown bağlantısı** (Adım 15, satır 15011-15013): `S.stil` değeri = `Object.keys(BJCP)`'den biri (sıralı, alfabetik) veya `""` (Otomatik).

---

## 4. Motor Slug Taxonomy

### 4a. V2c slug taksonomisi — `__BM_DEFS` (satır 138)

- **Kaynak:** `<script id="bm-engine-v2c">` içinde inline `JSON.parse(\`...\`)`.
- **Slug sayısı: 202**
- **Schema:** `{slug, name, displayTR, bjcpCode, bjcpName, category, sources, aliases, og, fg, ibu, srm, abv, yeast, weights, signature, thresholds}`
- **İlk 20 slug (alfabetik üzerinden değil, dosyada görünüş sırası):**
  ```
  american_light_lager, american_lager, american_cream_ale, american_wheat_beer,
  czech_pale_lager, czech_amber_lager, czech_dark_lager, munich_helles,
  german_oktoberfest_festbier, german_heller_bock_maibock, german_leichtbier,
  german_koelsch, dortmunder_european_export, german_pilsener, german_maerzen,
  bamberg_maerzen_rauchbier, german_bock, vienna_lager, german_altbier, munich_dunkel
  ```
- **Format:** snake_case, lowercase ASCII, `_` ayraç. Türk karakter yok (`ä`→`ae`, `ö`→`oe`, `ü`→`ue` dönüşümü uygulanmış: `german_koelsch`, `german_maerzen`).

### 4b. V5 slug taksonomisi — `_ml_dataset.json`

- **Yapı:** `{ _meta, feature_stats, records[] }`. `records.length = 1016`.
- **Record schema:** `{ id, source, name, label_slug, label_family, label_ferm, features }`.
- **Unique slug sayısı: 191**
- **İlk 20 slug (alfabetik):**
  ```
  american_amber_red_ale, american_barley_wine_ale, american_barleywine,
  american_brown_ale, american_fruited_sour_ale, american_imperial_stout,
  american_india_pale_ale, american_lager, american_light_lager,
  american_pale_ale, american_porter, american_wheat_beer,
  american_wild_ale, australian_pale_ale, autumn_seasonal_beer,
  baltic_porter, bamberg_helles_rauchbier, bamberg_maerzen_rauchbier,
  belgian_blonde_ale, belgian_dubbel
  ```
- **Format:** snake_case, lowercase ASCII (V2c ile aynı format).

### 4c. V6 final slug taksonomisi — `_ml_dataset_v6_final_comprehensive.json`

- **Yapı:** `{ _meta, feature_stats, records[] }`. `records.length = 1100`.
- **Record schema:** `{ id, source, name, label_slug, label_family, label_ferm, features, process_features, strain_features }` (V5'in superseti — `process_features` + `strain_features` ek).
- **Feature sayısı: 79** (`og, fg, abv, ibu, srm, pct_pilsner, pct_base, ..., yeast_english_mild` — tam liste UI'daki `__v6Features` builder ile 1:1).
- **Unique slug sayısı: 150**
- **İlk 25 slug (alfabetik):**
  ```
  adambier, american_amber_red_ale, american_barleywine,
  american_fruited_sour_ale, american_imperial_stout, american_india_pale_ale,
  american_india_pale_lager, american_lager, american_light_lager,
  american_wheat_ale, american_wheat_wine_ale, american_wild_ale,
  australian_pale_ale, autumn_seasonal_beer, baltic_porter,
  bamberg_bock_rauchbier, bamberg_helles_rauchbier, bamberg_maerzen_rauchbier,
  belgian_blonde_ale, belgian_dubbel, belgian_fruit_lambic,
  belgian_lambic, belgian_quadrupel, belgian_session_ale, belgian_strong_dark_ale
  ```
- **Format:** snake_case, lowercase ASCII (V2c/V5 ile aynı).

### 4d. V5 ↔ V6 Format Farkı (KRİTİK)

**Format aynı** (snake_case lowercase) ama **slug seti farklı**:
- V5 unique: 191
- V6 unique: 150
- Sadece V5'te (50 slug, ilk 20): `california_common_beer, golden_or_blonde_ale, american_pale_ale, czech_pale_lager, scottish_export_ale, german_oktoberfest_festbier, czech_dark_lager, american_wheat_beer, south_german_weizenbock, sweet_stout_or_cream_stout, american_barley_wine_ale, american_porter, international_pale_lager, english_brown_ale, belgian_strong_blonde_ale, french_bi_re_de_garde, english_pale_ale, english_dark_mild_ale, american_brown_ale, belgian_gueuze`
- Sadece V6'da (9 slug, tam liste): `common_beer, pale_ale, pale_lager, dark_lager, porter, brown_ale, french_biere_de_garde, stout, ipa`

**Anlamı:** V6 birçok V5 slug'ını köke daraltmış — örn. `american_pale_ale` + `english_pale_ale` + `australian_pale_ale` → `pale_ale` (gerçi V6'da `australian_pale_ale` da hâlâ var, kısmen). V6 daha az ayrıştırıcı (lumping) yapıyor. Adım B2'de iki motor çıktısını aynı eksende kıyaslamak için ortak bir denominator gerekiyor.

**V2c (202 slug) vs V5 (191) vs V6 (150)** — üçü de aynı format, farklı kapsamı.

---

## 5. Mevcut Normalize Katmanı

### 5a. V5 internal slug aliasing — `__ALIASES` (satır 537)

V5 motorunun KENDİ İÇİNDEKİ canonical-slug map'i:
```js
const __ALIASES = JSON.parse(`{
  "doppelbock":              "german_doppelbock",
  "schwarzbier":             "german_schwarzbier",
  "american_wild":           "american_wild_ale",
  "fruit_lambic":            "belgian_fruit_lambic",
  "biere_de_garde":          "french_biere_de_garde",
  "french_bi_re_de_garde":   "french_biere_de_garde",
  "belgian_speciale_belge":  "belgian_pale_ale",
  "american_barley_wine_ale":"american_barleywine",
  "german_kolsch":           "german_koelsch",
  "italian_pilsener":        "italian_pilsner",
  "lambic":                  "belgian_lambic",
  "wild_beer":               "american_wild_ale",
  "english_barleywine":      "british_barley_wine_ale"
}`);
```
- **13 entry**, slug→slug map (ad değil).
- Kullanım: `function normSlug(s) { return __ALIASES[s] || s; }` (satır 541) — `classifyMulti` çıktısında collapse-aliases (satır 760-762: `for (const [s, v] of Object.entries(combined)) { const cs = normSlug(s); collapsed[cs] = (collapsed[cs] || 0) + v; }`).
- Public: `window.BM_STYLE_ALIASES = __ALIASES; window.bmNormalizeSlug = normSlug;` (satır 542-543).
- **Adım B2 için sınırlı yarar:** Sadece V5 dataset duplikatlarını collapse ediyor, BJCP_ad ↔ slug eşlemesi yapmıyor.

### 5b. V2c'de gömülü `bjcpName` alanı — `__BM_DEFS` (satır 138)

V2c slug objelerinin **111'inde (202'den)** `bjcpName` alanı var — bu, slug → BJCP_ad doğrudan eşlemesi sağlıyor. Örnekler:
```
american_cream_ale          -> bjcpName: "Cream Ale"
american_wheat_beer         -> bjcpName: "American Wheat Beer"
czech_pale_lager            -> bjcpName: "Czech Premium Pale Lager"
czech_amber_lager           -> bjcpName: "Czech Amber Lager"
czech_dark_lager            -> bjcpName: "Czech Dark Lager"
munich_helles               -> bjcpName: "Munich Helles"
german_oktoberfest_festbier -> bjcpName: "Festbier"
german_heller_bock_maibock  -> bjcpName: "Helles Bock"
```
- **Eksik 91 slug** (`bjcpName: null`) — bunların BJCP karşılığı yok veya henüz haritalanmamış. Örn: `american_light_lager`, `australian_pale_ale`, `english_pale_ale`, `old_ale`, `english_pale_mild_ale`, `robust_porter`, `british_imperial_stout` (ilk 7).

**Kullanım:** B2 harness için **`__BM_DEFS[slug].bjcpName` doğrudan slug → BJCP_ad eşlemesi sağlar** (V2c slug için). Tersi (BJCP_ad → slug) için bu objeyi reverse-lookup yapmak gerekir. **Ancak:** V5/V6 slug'ları V2c slug'ları ile birebir aynı değil (50 slug V5'te V2c'de yok, V6'da 9 yeni slug var). Yani `__BM_DEFS[slug].bjcpName` haritası sadece V2c slug evrenini kapsar.

### 5c. UI runtime fuzzy matcher — `_v5ToBjcpKey` / `_v5ToBjcpKeyTop` (satır 13808, 13906)

İki yerde tanımlı (Doktor kartı ve V5/V6 box card için), aynı algoritma:
```js
function _v5ToBjcpKey(slug, displayTR){
  if(!slug && !displayTR) return null;
  const target = ((displayTR||'')+' '+(slug||'').replace(/_/g,' ')).toLowerCase();
  const tokens = target.split(/\s+/).filter(t=>t.length>2);
  let best=null, bestScore=0;
  for(const key in _bjcp){
    const kl = key.toLowerCase();
    const kt = kl.replace(/[\/\(\),]/g,' ').split(/\s+/).filter(t=>t.length>2);
    let score = 0;
    for(const t of tokens){
      if(t==='ipa' && /\bipa\b/.test(kl)) score += 3;
      else if(kl.includes(t)) score += 2;
      else if(kt.some(k=>k.startsWith(t)||t.startsWith(k))) score += 1;
    }
    if(score>bestScore){ bestScore=score; best=key; }
  }
  return bestScore>=2 ? best : null;
}
```
- **Yön:** slug + displayTR → BJCP_ad (token-overlap skoru ≥2).
- **Threshold:** `bestScore >= 2`. Altında `null` döner.
- **Sınırlama:** `_bjcp` lokal const (UI render scope), dışarıdan çağrılamıyor — ancak algoritma kopyalanabilir.
- **Adım B2 için faydalı:** Hem V5 hem V6 slug'larını BJCP_ad'a yaklaşık çevirir. Ama fuzzy → bazı edge-case'leri yanlış eşleyebilir (örn. `golden_or_blonde_ale` → "Belgian Blonde Ale" mi "Blonde Ale / Cream Ale" mi karışabilir).

### 5d. Statik BJCP_ad ↔ slug full lookup — **YOK**

Grep özetleri:
| Pattern | Eşleşme |
|---------|---------|
| `slugFromName` | yok |
| `bjcpToSlug` | yok |
| `nameToSlug` | yok |
| `STYLE_MAP` | yok |
| `STYLE_ALIASES` | yok (sadece `BM_STYLE_ALIASES` window export — bu §5a ile aynı 13-entry V5 collapse map) |
| `normalizeStyle` | yok |
| Büyük inline lookup (`{"Dubbel":"belgian_dubbel"...}`) | yok |

**Sonuç:** B2 için BJCP_ad ↔ slug normalize katmanı **kısmen mevcut** (V2c slug için `bjcpName` field, fuzzy fallback için `_v5ToBjcpKey`), ama V5/V6 slug evrenini doğrudan eşleyen statik bir tablo **YOK** — bu B2 harness'ında ayrıca inşa edilmeli (önerilen yöntem: `__BM_DEFS[slug].bjcpName` priority + fuzzy fallback + manuel override sözlüğü ile augment).

---

## 6. V2c Çıktı Formatı — ekstra doğrulama

**İlk varsayım (yan rapordan):** "V2c → belgian_dubbel %64".

**Kaynak doğrulaması:**

`findBestMatches` (satır 335-409) `Array<{slug, displayTR, normalized, ...}>` döner. **Slug**, V2c dataset slug'ı (snake_case ASCII, örn. `belgian_dubbel`). **Normalize** = 0-100 integer.

Adım 13302-13305 console örneği:
```js
console.log('  Yeni top-5  :');
__top3V2.forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized+' score='+r.score+(r._boosted?' [boost:'+r._boosted+']':'')));
```
Yani console'da `1. belgian_dubbel (Belçika Dubbel) %64 score=1247` formatı.

**Format karşılaştırması:**

| Motor | top-1 erişim | slug alanı | Skor alanı | top-3 alanı |
|-------|-------------|------------|------------|-------------|
| V2c   | `result[0].slug` | `slug` | `normalized` (0-100 int) | `result.slice(0,3)` |
| V5    | `result.top1.slug` | `slug` | `confidence` (0-100 int) | `result.top3` (hazır) |
| V6    | `result.top1.slug` | `slug` | `confidence` (0-100 int) | `result.top3` (hazır) |

**B2 harness uyarlaması:** V2c çıktısını V5/V6 formatına çevirmek için:
```js
function normalizeV2cOutput(v2cArr) {
  return {
    top1: v2cArr[0] ? {slug: v2cArr[0].slug, score: v2cArr[0].normalized/100, confidence: v2cArr[0].normalized, displayTR: v2cArr[0].displayTR} : null,
    top3: v2cArr.slice(0,3).map(r => ({slug: r.slug, score: r.normalized/100, confidence: r.normalized, displayTR: r.displayTR})),
    top5: v2cArr.slice(0,5).map(...)
  };
}
```
Slug formatı V2c↔V5↔V6 üçü de **snake_case lowercase ASCII** — string compare yapılabilir, ama §4d'deki granülarite farkı (`american_pale_ale` vs `pale_ale`) hâlâ sorun.

---

## 7. Özet — Adım B2'ye Devir Notu

| Konu | Cevap | Kanıt |
|------|-------|-------|
| V2c çağrısı | `window.BM_ENGINE.findBestMatches(recipeObj, 5)` | satır 13299 |
| V2c input | `__recipeV2` formatı (Adım §1a) | satır 13270-13298 |
| V2c output | `Array<{slug, displayTR, normalized, ...}>` | satır 354-364 |
| V5 çağrısı | `window.BM_ENGINE_V5.classifyMulti(recipeObj, opts)` | satır 781 (ama UI'da kullanılmıyor) |
| V5 input | V2c ile aynı recipeObj — extractFeatures içeride yapıyor | satır 595, 682, 748 |
| V5 output | `{top1, top3, top5, _meta}` (slug+score+confidence+displayTR) | satır 773-778 |
| V6 çağrısı | `window.BM_ENGINE_V6_FINAL.classifyMulti(featuresObj, {k:5})` | satır 13406 |
| V6 input | 79-feature flat object (`__v6Features` builder) | satır 13350-13405 |
| V6 output | `{top1, top3, top5, _meta}` (V5 formatı, slug Title-case displayTR) | satır 909-923 |
| UI default | V6 final | satır 13406 birincil; 13837 stil_tah override |
| Manuel override | `S.stil` (BJCP_ad) tüm motor çıktılarını ezer | satır 13418-13420 |
| BJCP key sayısı | 248 | satır 2560-2809 |
| BJCP key formatı | İnsan-okunabilir İngilizce, `/` ayraç, ä/ö/ü/é içerebilir | satır 2566, 2582, 2603 vb. |
| BJCP value şeması | `{og, fg, ibu, srm, abv}` — sadece numerik aralıklar | satır 2561 |
| V2c slug sayısı | 202 (snake_case ASCII) | `__BM_DEFS` parse |
| V5 slug sayısı | 191 | `_ml_dataset.json` parse |
| V6 slug sayısı | 150 | `_ml_dataset_v6_final_comprehensive.json` parse |
| V5↔V6 ortak format? | Format aynı (snake_case), set farklı (V6 collapse) | §4d |
| BJCP_ad → V2c_slug haritası | Kısmen mevcut (`__BM_DEFS[slug].bjcpName`, 111/202) | satır 138 inline JSON |
| BJCP_ad → V5/V6_slug haritası | YOK | grep negative |
| Fuzzy matcher | `_v5ToBjcpKey(slug, displayTR)` slug→BJCP_ad, threshold≥2 | satır 13808, 13906 |
| V5 internal collapse | `__ALIASES` (13 entry, slug→slug) | satır 537, 541 |
| Engine toggle / mode flag | YOK | grep negative |

### B2 harness implementasyon ipuçları

1. **Üç motoru ayrı ayrı çağır.** UI'nin V5 dead-code olması B2'yi etkilemez — V5'i `window.BM_ENGINE_V5.classifyMulti(__recipeV2, {k:5})` ile çağırabilir, V2c-style recipe objesi pass edersin.

2. **V6 için 79-feature mapping gerekiyor.** Sadece recipe objesi vermek yetmez — UI'daki `__v6Features` builder (satır 13350-13405) script olarak harness'a kopyalanmalı VEYA HTML'i tarayıcıda load edip global state'i kullanmalı.

3. **Ground truth ↔ slug normalize stratejisi (3 katmanlı):**
   - **Layer 1 (precise):** Reverse `__BM_DEFS[slug].bjcpName` → 111 BJCP_ad mapping (V2c için kesin).
   - **Layer 2 (fuzzy):** `_v5ToBjcpKey(slug, displayTR)` — V5/V6 slug'larını BJCP_ad'a yaklaştır. UI scope'tan çıkıp standalone fonksiyon olarak harness'a kopyala.
   - **Layer 3 (manual):** Edge-case override sözlüğü (örn. `"Dubbel" → ["belgian_dubbel"]` çünkü fuzzy yanlış eşleşebilir).

4. **Karşılaştırma yönü:** Ground truth `S.stil` = BJCP_ad. Motor çıktıları slug. **Yön = slug → BJCP_ad** (engine output'u kullanıcı seçimine yaslamak). Layer 1+2+3 ile slug'ı BJCP_ad'a çevir, sonra eşitlik kontrol et.

5. **Top-3 isabet hesabı:** Her motorun top-3 slug'ını BJCP_ad'a çevir, ground truth bjcp_ad bunlardan herhangi birine eşitse hit.

6. **Granülarite asimetrisi:** V6'da `pale_ale` çıkarsa ve ground truth "American Pale Ale" ise — fuzzy matcher `pale_ale` → "American Pale Ale" çevirebilir mi? Token overlap "pale ale" 2 token = score 4, BJCP'de 6+ aday var (American Pale Ale, English Pale Ale, Belgian Pale Ale...). En yüksek skoru "American Pale Ale" alabilir veya tie. Bu tür yanlış-eşleşmeleri B2 raporunda flag'le.

7. **Confidence ekseni:** V2c `normalized` (0-100), V5/V6 `confidence` (0-100) — aynı eksende ama hesap yöntemleri farklı (V2c hit/max ratio, V5/V6 weighted vote share). B2'de confidence eşitle, raw skoru ekstra metric olarak göster.

### Açık riskler / belirsizlikler

- V5'in dead-code olması — V5 son güncellemesi V6'dan önce. V5 dataset (1016 reçete) V6 dataset'in (1100 reçete) altkümesi olabilir. B2 sonucunda V5 zayıfsa, bunun "motor zayıf" mı yoksa "veri eski" mi olduğu belirsiz kalır.
- 79-feature mapping (`__v6Features`) UI'a sıkı bağlı — `_pctOf`, `_hasKatki`, `V6_DEFAULTS` gibi yardımcılar kullanıyor. Standalone harness için bunları kopyalamak veya HTML-içi context'te koşturmak gerekiyor.
- Granülarite çakışması: V6 `pale_ale` döndürdüğünde fuzzy matcher 4-5 aday içinden seçim yapacak. Bu B2 sonucunu sistematik olarak çarpıtabilir.
