# Adım A+B — V6 inject HTML'i bozma kökeni

## Komutlar

```
git show 9c45d15:Brewmaster_v2_79_10.html | sed -n '14770,14820p'
sed -n '14770,14820p' Brewmaster_v2_79_10.BACKUP_PRE_V6_FINAL.html
git show 9c45d15:Brewmaster_v2_79_10.html > _v6_broken.html
node parse-each-script-block (vm.Script)
node _find_orphan_try.js (try{...} balanced brace walker)
sed -n '25500,25555p' Brewmaster_v2_79_10.BACKUP_PRE_V6_FINAL.html
```

## Bulgu sırası

### 1) HTML satır 14788 etrafı
- Bozuk V6 inject HTML satır 14770-14820: ana app render kodu (rEditor fonksiyonu, malt/hop seçimi)
- Backup HTML satır 14770-14820: BJCP stil sınırları statik veri object'i
- Satır numaraları **5MB V6 motoru eklenmesi nedeniyle kaymış** — Kaan'ın console hatasındaki "satır 14788" V6 inject sonrası HTML satırı, backup'taki aynı satıra denk değil.

### 2) Hangi script bloğu patlıyor?

```
bm-engine-v2c parse OK (468.8KB)
bm-engine-v5 parse OK (989.0KB)
bm-engine-v6-final parse OK (1612.6KB)
Script #4 starts ~line 956 (1.5MB ana app bloğu) — PARSE ERROR: "Missing catch or finally after try"
```

V6 motoru sorunsuz parse oluyor. Hata **ana Brewmaster app inline JS bloğunda** (satır 956-18522, 1.5MB) — V6 inject'in bu bloğa dokunduğu yerde.

### 3) Yetim try {} bloğu — line 12358 (V6 inject HTML'inde)

```
12355:   // ══ FAZ 4 — V3 Hiyerarşik motor paralel cagrisi ══
12356:   var __top3V3_engine = null;
12357:   var __v3_classification = null;
12358:   try {                                                ← YETİM
12359:   // ══ V4 Ensemble motor (KNN + rule) ══
12360:   // ══ V6 FINAL — multi-K weighted KNN + veto + feature weighting
...
```

V3 adapter'in `try {` satırı silinmemiş, ama içeriği (`if (window.BM_ENGINE_V3...) {...} catch(e)`) silinmiş. V4 adapter de tamamen silinmiş. Sonuç: `try {` açık kaldı, hemen `// ══ V4 Ensemble...` yorumu, sonra `// ══ V6 FINAL...` ve V6 motor adapter — JS parser try açık görüp catch arıyor, bulamıyor → **"Missing catch or finally after try"**.

### 4) Backup'taki orijinal yapı

V3 adapter (backup line 25500-25516):
```js
  // ══ FAZ 4 — V3 Hiyerarşik motor paralel cagrisi ══
  var __top3V3_engine = null;
  var __v3_classification = null;
  try {                                                          ← TRY satırı
    if (window.BM_ENGINE_V3 && window.BM_ENGINE_V3.classifyHierarchical && typeof __recipeV2 !== 'undefined') {
      ...
      window.__lastV3Result = __v3Result;
    }
  } catch(e) { console.warn('[BM V3] motor hatasi:', e && e.message); }
```

V4 adapter (backup line 25517-25537):
```js
  // ══ V4 Ensemble motor (KNN + rule) ══
  var __top3V4_engine = null;
  var __v4_meta = null;
  try {
    if (window.BM_ENGINE_V4 && ...) { ... }
  } catch(e) { console.warn('[BM V4] motor hatasi:', e && e.message); }
```

V7 adapter (backup line 25539-25554):
```js
  // ══ V7 Production Multi-model ensemble (83.0% top-1, 96.0% top-3) ══
  var __top3V7_engine = null;
  var __v7_meta = null;
  try {
    if (window.BM_ENGINE_V7 && ...) { ... }
  } catch(e) { console.warn('[BM V7] motor hatasi:', e && e.message); }
```

### 5) Bug'ın kaynağı — _inject_v6_final.js regex'leri

**v3 silme regex'im:**
```js
/\n?\s*if \(window\.BM_ENGINE_V3 && window\.BM_ENGINE_V3\.classifyHierarchical[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V3\][\s\S]*?\}\)?;?\n?/
```
`if (window.BM_ENGINE_V3...)`'tan başlıyor → `} catch(e) { console.warn('[BM V3]...)` ile bitiyor.

**Sorun:** Regex'in başlangıç noktası `if (window.BM_ENGINE_V3...)`. Bunun **önündeki**:
- `// ══ FAZ 4 — V3 ... ══` yorumu
- `var __top3V3_engine = null;`
- `var __v3_classification = null;`
- `try {`

Bu 4 satır **silinmiyor**. Yetim `try {` kalıyor.

**v4 silme regex'im:**
```js
/\n?\s*var __top3V4_engine = null;[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V4\][\s\S]*?\}\)?;?\n?/
```
Bu V4'ü tamamen siliyor (`var __top3V4_engine = null;`'dan `} catch(e)`'ye kadar). Doğru.

**Sonuç:** V3 silindikten sonra yetim `try {` → V4 silindikten sonra V4 yorumu kaldı (regex `var __top3V4_engine`'tan başlıyor, yorumu silmiyor) → V6 adapter eklendi → JS parser kafayı yedi.

### 6) Düzeltme planı (Adım C için öneri)

Regex'leri **yorum satırından** başlat ve **yorumu da içine al**:

```js
const v3adapter = /\n?\s*\/\/ ══ FAZ 4 — V3 Hiyerarşik[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V3\][\s\S]*?\}[ \t]*\)?;?\n?/;
const v4adapter = /\n?\s*\/\/ ══ V4 Ensemble[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V4\][\s\S]*?\}[ \t]*\)?;?\n?/;
const v7adapter = /\n?\s*\/\/ ══ V7 Production[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V7\][\s\S]*?\}[ \t]*\)?;?\n?/;
```

Bu şekilde her adapter'ın **yorumu + var bildirimleri + try { ... } catch ... blok hepsi** silinir.

Ek sigorta: silme sonrası HTML'i `vm.Script` ile parse-check yap. Eğer hata varsa rollback, devam etme.

## Durum: ⚠️ KÖKEN TESPİT EDİLDİ

V6 inject script'i V3 adapter'ın `try {` satırını yetim bıraktı. Backup'a dönüldü, production sağlıklı çalışıyor (V7 motoru hâlâ aktif, ama yine `__top3V5_engine` orphan ref nedeniyle stil_tah'a yansımıyor — dubbel hâlâ witbier diyor).

## Tek satır yorum

V6 inject regex'leri V3/V4/V7 adapter'larının `try { if(...) ... } catch(e)` bloklarını silerken **`try {` satırını V3'te yetim bıraktı** (regex `if (window.BM_ENGINE_V3...)`'tan başlıyordu, üst satırlardaki `var` ve `try {` çıkarılmadı), V4 silinince yetim `try` ile V6 adapter arası catch'siz kaldı, JS parser "Missing catch or finally" verdi; düzeltme: regex'leri yorum satırından başlat + post-inject vm.Script parse guard ekle.
