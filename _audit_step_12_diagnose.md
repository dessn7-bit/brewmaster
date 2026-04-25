# Adım 12 — UI render teşhisi (Muzo Berliner Weisse %60)

## Komutlar

```
sed -n '13800,13880p' Brewmaster_v2_79_10.html  # UI render bloğu
sed -n '13335,13405p' Brewmaster_v2_79_10.html  # V6 adapter
```

## ADIM 1 — UI render kod akışı (line 13800-13880)

```js
// Line 13812: V6 motor sonucunu okuyor (rename sonrası)
const _v5TopBjcp = (typeof __top3V6_engine !== 'undefined'
                    && __top3V6_engine
                    && __top3V6_engine.length)
  ? __top3V6_engine.slice(0,3).map(r => ({
      bjcp: _v5ToBjcpKeyTop(r.slug, r.displayTR) || (r.displayTR || r.slug),
      displayTR: r.displayTR || r.slug,
      slug: r.slug,
      normalized: r.normalized
    }))
  : null;

// Line 13821: V6 dolu ise stil_tah override
if (_v5TopBjcp && _v5TopBjcp.length) {
  stil_tah = _v5TopBjcp[0].bjcp;
}

// Line 13846: Bar gösterimi V6 → fallback rule-based
var _barSource = _v5TopBjcp
  ? _v5TopBjcp.map(function(x){ return { nm: x.bjcp, pct: x.normalized, ... }; })
  : (_hibritSorted.length > 0 ? _hibritSorted : _stilSorted)
      .filter(function(x){return x[1]>-5;})
      .slice(0,3)
      .map(function(s,i){
        var mp=(_hibritSorted.length > 0 ? _hibritSorted : _stilSorted)[0][1]||1;
        return { nm: s[0], pct: Math.round(s[1]/mp*100), ... };
      });

// Line 13876: Rozet KOŞULA BAĞLI — sadece _v5TopBjcp doluysa görünür
(_v5TopBjcp ? '<span ... 🎯 BETA V5</span>' : '')
```

**Kritik bulgu:** "🎯 BETA V5" rozeti `_v5TopBjcp ? ... : ''` koşulu içinde. Yani:
- Rozet **görünüyorsa** → `_v5TopBjcp` dolu → veri V6'dan geliyor (sadece etiket eski)
- Rozet **yok** → `_v5TopBjcp` null → rule-based fallback gösteriliyor (`_hibritSorted` veya `_stilSorted`)

## ADIM 2 — V6 adapter (line 13335-13405)

```js
var __top3V6_engine = null;
var __v6_meta = null;
try {
  if (window.BM_ENGINE_V6_FINAL && window.BM_ENGINE_V6_FINAL.classifyMulti
      && typeof __recipeV2 !== 'undefined') {
    var __v6Features = (function(r){
      var f = {};
      f.og = r._og; f.fg = r._fg; f.abv = r._abv; f.ibu = r._ibu; f.srm = r._srm;
      // ... 79 feature mapping (percents, yeast tipleri, katki, vb.)
    })(__recipeV2);
    var __v6Result = window.BM_ENGINE_V6_FINAL.classifyMulti(__v6Features, { k: 5 });
    __top3V6_engine = __v6Result.top3.map(...);
    __v6_meta = __v6Result._meta;
    console.log('%c[BM V6 FINAL] ...');
    __top3V6_engine.forEach(...);  // top-3 console'a basılır
  }
} catch(e) { console.warn('[BM V6 FINAL] motor hatasi:', e && e.message); }
```

**Adapter davranışı:**
- `window.BM_ENGINE_V6_FINAL` yüklenmemiş veya `__recipeV2` undefined → adapter sessizce atlar, `__top3V6_engine` null kalır, console.log YOK
- V6 motoru çağrılır ve sonuç döner → `__top3V6_engine` array dolar, console.log var, adapter "[BM V6 FINAL] ..." yazar
- V6 motoru patlarsa → catch yakalar, `console.warn('[BM V6 FINAL] motor hatasi:')` yazar, `__top3V6_engine` null kalır

**Muzo reçete (OG 1.065, IBU 4, SRM 47, Belçika maya) için V6 feature builder'in ürettiği object:**
- `og: 1.065`, `fg: ?`, `abv: ?`, `ibu: 4`, `srm: 47`
- `yeast_belgian: 1` (mayaTip='belcika')
- `yeast_abbey: 1` (line 13388: `(mt==='belcika') ? 1 : 0`)
- `dark_color: 1` (srm 47 > 15)
- `pale_color: 0` (srm 47 < 6 değil)
- `high_hop: 0` (ibu 4 < 40)
- `katki_lactose: ?` (recipe.lactose flag'ine bağlı)
- yeast_witbier: 0, yeast_lacto: 0, yeast_sour_blend: 0 (Berliner Weisse imza maya yok)
- pct_*: UI form'daki maltlardan
- mash_temp_c, fermentation_temp_c, water_so4_ppm: 0 (UI'da girdi yok)

## ADIM 3 — Direkt cevap (kodla okuma)

### Soru 1: UI'da görünen "Berliner Weisse %60" hangi motordan geliyor?

**KESİN CEVAP, ROZETİN VARLIĞINA BAĞLI:**

| Rozet "🎯 BETA V5" görünüyor mu? | Berliner Weisse %60 kaynağı |
|---|---|
| EVET (görünüyor) | V6 motor (etiket yanıltıcı) |
| HAYIR (yok) | Rule-based fallback (`_hibritSorted` veya `_stilSorted`) |

UI render kodu (line 13876) rozeti `_v5TopBjcp ? ... : ''` koşulu altında çıkartıyor. Bu kontrol mekanizması **deterministik**.

### Soru 2: Eğer V6: hangi feature default 0 yüzünden Berliner çıkıyor?

V6 dataset'inde Berliner Weisse reçeteleri imzası (eğitim verisi):
- og düşük (~1.028-1.032)
- srm düşük (~2-3)
- ibu düşük (~3-8)
- yeast_lacto=1 veya yeast_sour_blend=1 veya yeast_wit=1
- katki_fruit veya katki_lactose nadir

Muzo'nun feature'larıyla karşılaştırma:
- og 1.065 vs Berliner 1.028-1.032 → **çok uzak** (Manhattan distance ENHANCED_FEATURE_WEIGHTS['og']=1.8 ile yüksek mesafe)
- srm 47 vs Berliner 2-3 → **çok uzak** (weight 2.0)
- ibu 4 vs Berliner 3-8 → **YAKIN** (eşleşiyor, bu tek hizalanma noktası)
- yeast_belgian=1, yeast_abbey=1 → Berliner imzası DEĞİL
- yeast_lacto=0 → Berliner imzası YOK

**Muzo'nun V6 motoru tarafından Berliner Weisse olarak tahmin edilmesi pek olası DEĞİL.** Sadece `ibu` yakın, diğer 4 ana feature uzak. V6 Muzo için büyük olasılıkla `belgian_dubbel`, `belgian_dark_strong_ale` veya `abbey_ale` der.

Bu **kuvvetli ipucu:** "Berliner Weisse %60" V6 motorunun çıktısı **DEĞİL**, **rule-based fallback**.

### Soru 3: Eğer V5: V6 UI'a niye bağlı değil?

Olası nedenler (kodla okuma):
1. **`__top3V6_engine` null kalmış** — V6 adapter patlamış (try/catch sessiz) veya `BM_ENGINE_V6_FINAL` yüklenmemiş
2. **`__top3V6_engine.length === 0`** — V6 sonucu boş array (top3 yok)
3. **V6 adapter `__recipeV2` undefined olduğu için skip etmiş** — adapter çalıştığı `rEditorGenel` çağrısında `__recipeV2` outer scope'tan gelmedi

V6 adapter'in atlama koşulu: `window.BM_ENGINE_V6_FINAL && classifyMulti && typeof __recipeV2 !== 'undefined'` — üçü birden true değilse adapter skip eder, `__top3V6_engine` null kalır, UI rule-based'e düşer.

## NET TEŞHIS (kodla okuma)

**Muzo reçetesi (OG 1.065, IBU 4, SRM 47, Belçika maya) için V6 motoru "Berliner Weisse" demesi feature uzaklığı analiziyle ÇOK DÜŞÜK İHTİMAL.** Yani UI'da görünen "Berliner Weisse %60" büyük ihtimalle **rule-based fallback** çıktısı.

Bunu Kaan **rozeti gözleyerek** kesinleştirebilir:
- Rozet "🎯 BETA V5" GÖRÜNÜR ise → V6 doluyor, sürpriz Berliner tahmini → adapter feature mapping kontrolü gerek
- Rozet GÖRÜNMEZ ise → V6 sonucu UI'a ulaşmıyor → adapter neden sessiz patlıyor / atlıyor araştırılmalı

## Adım B'ye geçmeden gereken bilgi

Kaan'ın F12 console'unda Muzo reçetesi açıkken:
1. `[BM V6 FINAL] multi-K weighted KNN ...` log'u VAR mı? → Adapter çalıştı mı?
2. `[BM V6 FINAL] motor hatasi: ...` warn'u VAR mı? → Adapter patladı mı?
3. UI rozeti "🎯 BETA V5" GÖRÜNÜR mü? → V6 sonucu UI'a yansıyor mu?

Bu 3 cevap olmadan Adım B'de hangi yere müdahale edileceği belirsiz. **Ya etiket düzeltme + adapter feature mapping** (V6 dolu, yanlış tahmin) **ya da scope/timing fix** (V6 ulaşmıyor).

## Durum: ⚠️ KISMEN TEŞHIS

Kod analizi UI render'in `__top3V6_engine`'a doğru bağlandığını ve adapter sıralamasının doğru olduğunu gösteriyor (V6 adapter line 13335 → UI render line 13700+ aynı `rEditorGenel` scope'unda). Eksik olan tek şey: V6 adapter'in browser'da gerçekte çalışıp çalışmadığı (console.log varlığı + rozet varlığı).

## Tek satır yorum

UI render `__top3V6_engine`'a doğru bağlı, V6 adapter aynı scope'ta önce çalışıyor; "Berliner Weisse %60" Muzo reçetesi için V6'nın gerçek çıktısı olamaz (feature uzaklığı çok yüksek), rozetin Kaan tarafında görünür/görünmez doğrulaması adapter null/dolu durumunu kesinleştirecek.
