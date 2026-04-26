# AUDIT STEP 17A — INPUT BUILDERS

**Tarih:** 2026-04-26
**Hedef dosya:** `Brewmaster_v2_79_10.html`
**Working tree durumu:** TEMİZ DEĞİL (önceki seansların 2 modify + 11 untracked debug dosyası var; bu raporun commit'i bunları dokunmaz, sadece raporu stage eder).

---

## V2c

**Builder fonksiyonu:** YOK (named function olarak tanımlı değil).

**Lokasyon:** Inline obje literal, `function calc()` (satır 4488) içinde, satır **13270-13298** arasındaki `try` bloğu.

**Çağrı satırı (kanıt — satır 13299):**
```js
const __top3V2 = window.BM_ENGINE.findBestMatches(__recipeV2, 5);
```

**İmza:** Yok (anonim assignment). Builder kendisi:
```js
__recipeV2 = {
  _og:_og, _fg:_fg, _ibu:_ibu, _srm:_srm, _abv:_abv, _mayaTip:_mayaTip,
  mayaId: S.mayaId||'', maya2Id: S.maya2Id||'',
  hopIds:   (S.hoplar   ||[]).map(h=>h&&h.id).filter(Boolean),
  maltIds:  (S.maltlar  ||[]).map(m=>m&&m.id).filter(Boolean),
  katkiIds: (S.katkilar ||[]).map(k=>k&&k.id).filter(Boolean),
  percents: {
    pilsnerPct:  _pctOf(/pilsner|pils|bohem|bel_pils|.../i),
    wheatPct:    _pctOf(/wheat|bugday|weizen|.../i),
    oatsWheatPct:_pctOf(/wheat|bugday|weizen|oat|yulaf/i),
    oatsPct:     _pctOf(/oat|yulaf/i),
    munichPct:   _pctOf(/munich|muenchner|.../i),
    viennaPct:   _pctOf(/vienna|viyana|.../i),
    crystalPct:  _pctOf(/crystal|caramel|cara[_-]?|.../i),
    chocPct:     _pctOf(/choc|chocolate|cikolata|carafa|dehusked/i),
    roastPct:    _pctOf(/roast|kavrulmus|black|siyah|patent/i),
    cornPct:     _pctOf(/corn|misir|mais|flaked_corn/i),
    ricePct:     _pctOf(/rice|pirinc/i),
    sugarPct:    _pctOf(/sugar|seker|candi|candy|.../i),
    aromaticMunichPct: _pctOf(/aromatic|melanoid/i),
    aromaticAbbeyMunichPct: _pctOf(/aromatic|abbey|special_b/i),
    baseMaltPct: _pctOf(/pilsner|pils|pale|maris|munich|vienna|.../i),
  },
  lactose:   _hasKatki(/laktoz|lactose/i),
  filtered:  _hasFiltrasyon,
  aged:      (S.brewLog||[]).some(e=>e && e.tip==="aging"),
  dhPer10L:  0,
  blended:   false,
};
```

**Bağımlılıklar (bu obje'yi inşa edebilmek için):**
- **Global:** `S` (recipe state — `S.mayaId`, `S.maya2Id`, `S.hoplar`, `S.maltlar`, `S.katkilar`, `S.brewLog`).
- **calc() lokal değişkenleri:** `_og`, `_fg`, `_ibu`, `_srm`, `_abv` (calc öncesi hesaplanmış metrikler).
- **calc() lokal `_mayaTip`** (satır 9668: `const _mayaTip=mayaSu?mayaSu.tip:'ale';`).
- **calc() lokal helper'lar:**
  - `_pctOf` — satır 13133 (`(regex) => kg/_toplamMaltKg*100`)
  - `_hasKatki` — satır 13140 (`(regex) => S.katkilar.some(...)`)
  - `_hasMalt` — satır 13138 (kullanılmıyor builder'da ama yakın)
  - `_hasFiltrasyon` — satır 11701 (`S.brewLog.some(e=>e.tip==="filtrasyon")`)
  - `_toplamMaltKg` — satır 13128 (`S.maltlar.reduce(...)`)

**Saflık:** **DIRTY**. Argüman almıyor; doğrudan global `S`'i ve calc()'ın lokal scope değişkenlerini okuyor. Side effect yok (S mutate etmiyor, render tetiklemiyor, DOM'a dokunmuyor) — ama harness'a kopyalamak için tüm bağımlılık zincirini de taşımak gerekiyor.

---

## V5

**V2c builder ile AYNI input** — V5 için ayrı builder yok.

**Kanıt 1 — V5 motor `calc()` içinde çağrılmıyor:** Bu adımda yeniden grep:
```
135:// Kullanim: window.BM_ENGINE.findBestMatches(recipe, topN)
532:// Kullanim: window.BM_ENGINE_V5.classifyMulti(recipe, opts)   ← yorum satırı
735:    const matches = window.BM_ENGINE.findBestMatches(recipe, 50);  ← V5 motorun KENDİ İÇİNDEN V2c çağrısı (ruleScores)
13299:      const __top3V2 = window.BM_ENGINE.findBestMatches(__recipeV2, 5);
13406:      var __v6Result = window.BM_ENGINE_V6_FINAL.classifyMulti(__v6Features, { k: 5 });
```
`BM_ENGINE_V5.classifyMulti(` runtime çağrısı **YOK** — sadece satır 532'deki yorum. Yani `calc()` içinde V5 input builder de yok.

**Kanıt 2 — V5 motorun beklediği input formatı = V2c recipe formatı:**
- V5'in `classifyMulti(recipe, opts)` (satır 741) içeride `toVec(recipe)` (line 748) → `extractFeatures(recipe)` (satır 595) → 79-feature flat object'e çeviriyor (V2c-style recipe'den).
- V5'in `ruleScores(recipe)` (satır 733-739) aynı `recipe`'i V2c motora pass ediyor:
  ```js
  function ruleScores(recipe) {
    if (!window.BM_ENGINE || !window.BM_ENGINE.findBestMatches) return {};
    const matches = window.BM_ENGINE.findBestMatches(recipe, 50);
    ...
  }
  ```
  Demek ki V5'in `recipe` parametresi V2c'nin kabul ettiği şekilde — yani `__recipeV2` formatı.

**B2 sonucu:** Harness `__recipeV2`'yi inşa edip V5'e direkt verebilir: `BM_ENGINE_V5.classifyMulti(__recipeV2, {k:5})`. V5'e özel ek transform GEREKMİYOR.

**Saflık:** V2c builder ile birebir aynı (DIRTY) — kullandığı obje aynısı.

---

## V6

**Builder:** Inline IIFE, `function calc()` (satır 4488) içinde, satır **13350-13405**.

**Çağrı satırı (kanıt — satır 13406):**
```js
var __v6Result = window.BM_ENGINE_V6_FINAL.classifyMulti(__v6Features, { k: 5 });
```

**Builder imzası ve yapısı:**
```js
var __v6Features = (function(r){
  var f = {};
  f.og = r._og; f.fg = r._fg; f.abv = r._abv; f.ibu = r._ibu; f.srm = r._srm;
  var p = r.percents || {};
  f.pct_pilsner = p.pilsnerPct||0; f.pct_base = p.baseMaltPct||0;
  // ... 16 malt percent feature
  f.total_dark   = (p.crystalPct||0)+(p.chocPct||0)+(p.roastPct||0);
  f.total_adjunct= (p.cornPct||0)+(p.ricePct||0)+(p.sugarPct||0);
  f.crystal_ratio= ((p.crystalPct||0)/Math.max(1,(p.baseMaltPct||0)+(p.pilsnerPct||0)+(p.munichPct||0)));
  var mt = r._mayaTip||'ale', mid = r.mayaId||'';
  // 18 yeast binary flag (substring match: us05, wlp, wy11 vs.)
  // 7 hop signature flag (TÜMÜ 0 — placeholder!)
  // 10 katki flag (sadece katki_lactose r.lactose'dan, geri kalanı 0 — placeholder!)
  // 4 derived: high_hop, strong_abv, dark_color, pale_color
  // Process features (mash_temp_c, fermentation_temp_c, water_ca_ppm, ...) — TÜMÜ V6_DEFAULTS fallback
  f.mash_temp_c        = (r.mash_temp_c        > 0) ? r.mash_temp_c        : V6_DEFAULTS.mash_temp_c;
  f.fermentation_temp_c= (r.fermentation_temp_c> 0) ? r.fermentation_temp_c: V6_DEFAULTS.fermentation_temp_c;
  // ... 5 daha process default
  // Yeast specifik flag'ler (yeast_abbey, yeast_witbier, yeast_saison_3724, yeast_saison_dupont, yeast_english_bitter, yeast_english_mild)
  return f;
})(__recipeV2);
```

**İmza:** IIFE — `(function(r){...})(__recipeV2)`. Tek argüman `r` = V2c recipe objesi.

**Argüman olarak S alıyor mu?** Hayır. Sadece `r` (= `__recipeV2`) okuyor.

**Side effect:** YOK — S mutate yok, DOM yok, render yok.

**Dış bağımlılık:** Sadece `V6_DEFAULTS` const (satır 13338-13346). Onun da içeriği:
```js
var V6_DEFAULTS = {
  mash_temp_c: 66,
  fermentation_temp_c: 19,
  yeast_attenuation: 78,
  boil_time_min: 60,
  water_ca_ppm: 150,
  water_so4_ppm: 250,
  water_cl_ppm: 120
};
```

**Ne yapıyor (özet):** V2c-style recipe objesini 79-feature flat object'e map ediyor: 5 scalar (og/fg/abv/ibu/srm), 16 malt percentage, 3 derived malt (total_dark/total_adjunct/crystal_ratio), 18 yeast binary flag (substring match `mayaId` üzerinde), 7 hop signature flag (UI'da TÜMÜ 0 — placeholder), 10 katki flag (sadece `lactose` dolu, kalanı 0), 4 derived flag (high_hop/strong_abv/dark_color/pale_color), 7 process feature (`r.X || V6_DEFAULTS.X` — `__recipeV2`'de bu alanlar yok, hep default), 6 ek yeast specifik flag (abbey/witbier/saison_3724 vb.). **Üretim ortamında hop_* ve katki_* feature'larının 9'u/10'u sıfır — V6 motorun datasette gördüğü zenginliği UI verisi sağlamıyor.**

**Saflık:** **NEAR-SAF** — argümanını ve bir const'u kullanıyor, side effect yok. `V6_DEFAULTS` ile birlikte standalone fonksiyona dönüştürülebilir.

---

## _v5ToBjcpKey

**İki tanım, identik algoritma:**

| İsim | Satır | Kapsayan scope |
|------|------:|---------------|
| `_v5ToBjcpKeyTop` | 13808-13825 | UI render template literal IIFE (calc dışı, render template içi) |
| `_v5ToBjcpKey`    | 13906-13923 | Aynı UI render template başka bir IIFE içi |

**İmza:** `function _v5ToBjcpKey(slug, displayTR)` — string + string, iki argüman.

**Return:** `string | null` — `BJCP` map'inde en yüksek token-overlap skoru ≥2 olan key, yoksa `null`.

**Raw kod (satır 13906-13923, eşleşemediğinde `null` döner):**
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

**Eşleşemediğinde (kanıt satır 13924-13927):**
```js
const _v5Key = _v5ToBjcpKey(__top3V6_engine[0].slug, __top3V6_engine[0].displayTR);
if (_v5Key) stil_tah = _v5Key;
else stil_tah = __top3V6_engine[0].displayTR || __top3V6_engine[0].slug || stil_tah;
```
`null` dönerse caller fallback olarak `displayTR` veya `slug`'ı kullanıyor.

**`_v5ToBjcpKeyTop` için satır 13829'da fallback farklı:**
```js
bjcp: _v5ToBjcpKeyTop(r.slug, r.displayTR) || (r.displayTR || r.slug),
```
Aynı OR-fallback.

**Bağımlılık:** `_bjcp` const (UI scope'ta `const _bjcp=BJCP;` — satır 13806 ve 13904 lokal alias).

**Saflık:** **SAF** — sadece argümanlarını ve `BJCP` global'ini okuyor. Side effect yok.

---

## Harness için saflık tablosu

| Builder | SAF/DIRTY/BELİRSİZ | Gerekçe |
|---------|--------------------|---------|
| **V2c builder** (`__recipeV2`) | **DIRTY** | Argüman almıyor. Doğrudan global `S` okuyor (`S.mayaId`, `S.hoplar`, `S.maltlar`, `S.katkilar`, `S.brewLog`). calc() lokal değişkenlerine bağımlı: `_og`, `_fg`, `_ibu`, `_srm`, `_abv`, `_mayaTip`, `_pctOf`, `_hasKatki`, `_hasFiltrasyon`, `_toplamMaltKg`. Side effect yok ama izole edilemiyor. |
| **V5 builder** | **DIRTY (V2c ile aynı)** | Ayrı builder yok — V2c çıktısı (`__recipeV2`) V5'e direkt verilebilir. Bağımlılıklar V2c ile aynı. |
| **V6 builder** (`__v6Features` IIFE) | **NEAR-SAF** | Tek argüman `r` (= `__recipeV2`). Side effect yok. Tek dış bağımlılık `V6_DEFAULTS` const (7 entry). Standalone fonksiyona kolayca dönüştürülebilir; sadece `r` ve `V6_DEFAULTS`'ı geçirmek yeter. |
| **`_v5ToBjcpKey`** | **SAF** | İki argüman (`slug`, `displayTR`) + `BJCP` global. Side effect yok. Standalone kopyalama trivial. |

---

## Inline mi?

| Bileşen | Inline mi? | Kopyalama gerekli mi? | Hangi satır aralığı |
|---------|------------|------------------------|---------------------|
| V2c recipe builder | **EVET** (inline obje literal) | EVET | **13270-13298** (28 satır) + helper'lar: `_pctOf` 13133-13137, `_hasKatki` 13140, `_hasFiltrasyon` 11701, `_toplamMaltKg` 13128 + lokal kalkülasyonlar `_og/_fg/_ibu/_srm/_abv/_mayaTip` (calc() içinde dağılmış, harness için `S` ve maya tablosundan ayrı hesaplanmalı) |
| V5 builder | YOK (V2c output reuse) | HAYIR | — |
| V6 features builder | **EVET** (IIFE) | EVET | **13350-13405** (56 satır) + `V6_DEFAULTS` 13338-13346. IIFE'yi `function buildV6Features(r){ ... return f; }` olarak isimlendirip standalone'a çıkarmak mümkün. |
| `_v5ToBjcpKey` | EVET (UI scope inner function) | EVET | **13906-13923** (18 satır). `_bjcp` referansını `BJCP` ile değiştir. Kopyala-yapıştır yeter. |

---

## B2 harness için pratik öneri

1. **V2c builder için iki seçenek:**
   - **(a)** HTML'i tarayıcıda yükleyip `eval` ile `__recipeV2` üretimini calc() içinden çalıştır — global `S`'i her reçete için override edip `calc()` çağır, `window.__lastV2Result.recipeObj`'ten al (satır 13306'da export mevcut).
   - **(b)** Standalone bir `buildRecipeV2(recipe)` fonksiyonu inşa et — `_pctOf`, `_hasKatki`, `_hasFiltrasyon` mantığını çoğalt, recipe'i argüman olarak al. `_og/_fg/_ibu/_srm/_abv` için `recipe.ozet`'i kullan (Adım 15 raporundan: `tarifeKaydet` her kayda `ozet:{og,fg,abv,ibu,srm}` koyuyor — string toFixed olarak; numerik parse gerekir).

2. **V6 builder için:** IIFE'yi (satır 13350-13405) named function'a çevir, `V6_DEFAULTS`'ı parametrize et veya constants.js'e taşı. Tek bağımlılık.

3. **_v5ToBjcpKey için:** Direkt kopyala, `_bjcp` → `BJCP` global referansı.

4. **Engine çağrıları:**
   ```js
   const v2cTop3 = window.BM_ENGINE.findBestMatches(recipeObj, 5).slice(0,3);
   const v5Result = window.BM_ENGINE_V5.classifyMulti(recipeObj, {k:5});
   const v6Result = window.BM_ENGINE_V6_FINAL.classifyMulti(buildV6Features(recipeObj), {k:5});
   ```

5. **Ground truth karşılaştırma için fuzzy mapper:** Her motorun top-N slug'ını `_v5ToBjcpKey` ile BJCP_ad'a çevirip `S.stil` ile eşitle. Layer 1 (`__BM_DEFS[slug].bjcpName`) öncelik, başarısız olursa Layer 2 (fuzzy), o da boşsa hit yok.

---

**Adım 17A bitti — DUR. Adım 17B'ye geçilmedi.**
