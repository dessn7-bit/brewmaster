# Feature 2 — ABV/OG Out-of-Range Sub-Style Routing (DESIGN, kod yok)

**Tarih:** 2026-04-28
**Durum:** Bug 1 fix'inden BAĞIMSIZ. Sadece tasarım önerisi.

---

## Senaryo

Kaan'ın test reçetesi (Muzo): **OG 1.056, ABV 6.40%**
- V15 slug top-1: `south_german_hefeweizen` %34 (düşük confidence)
- BJCP 2021 Hefeweizen 10A range: ABV 4.3-5.6%, OG 1.044-1.052
- **ABV +0.8pp tavanın üstünde, OG +0.004 tavanın üstünde**

Sistem out-of-range warning veriyor (line `:14775-14778`'da `_inOG`/`_inABV` flag ⚠️) ama **alternatif sub-style önermiyor**. Kullanıcı manuel olarak Weizenbock veya Dunkelweizen'e bakmak zorunda.

---

## Sorulara Cevaplar

### 1. V15 slug listesinde weizenbock var mı? Map'te ne?

**EVET ✓** — Adım 51 cleaning sprint'te `south_german_weizenbock` (36 reçete, V14 weizenbock alias migrate edildi).

V15 wheat-family slug'ları (5):
| V15 slug | SLUG_TO_BJCP map'i |
|---|---|
| `american_wheat_ale` | American Wheat Beer |
| `berliner_weisse` | Berliner Weisse |
| `south_german_dunkel_weizen` | Dunkelweizen |
| `south_german_hefeweizen` | Weizen / Weissbier |
| `south_german_weizenbock` | **Weizenbock** ✓ |

V15 slug listesinde **Witbier / Hoppy Hefeweizen / American Hefeweizen ayrı slug değil** (BJCP'da var, V15 cleaning'de fragment olduğu için canonical 'belgian_witbier' veya 'south_german_hefeweizen' altında).

### 2. Ribbon top-2/top-3 zaten gösteriliyor mu?

**EVET ✓** — line `:14793-14802` `_barSource = _v5TopBjcp.map(...)` — top-3 reçete üstünde 3 button olarak görünüyor:
```
[1. Weizen / Weissbier %34] [2. <top-2> %X] [3. <top-3> %Y]
```

Ama:
- **Top-2/top-3 ile alakalı vurgu YOK**: confidence düşükse veya range out-of-range ise sistem "bu reçete için aslında top-2 daha uygun" demiyor.
- **Tek kart başlığı**: kart başlığı (Bug 1 fix sonrası) sadece top-1'i gösteriyor. Top-2/top-3 sadece ribbon'da.
- **Recipe Doctor sadece top-1 üzerinden çalışıyor** (`:14956` `__top3V6_engine[0].slug`). Top-2/top-3 advice'a girmiyor.

### 3. ABV/OG range checker var mı?

**EVET ✓** — line `:14775-14778`:
```js
const _inOG = !_stRef.og  || (_ogR>=_stRef.og[0]  && _ogR<=_stRef.og[1]);
const _inIBU= !_stRef.ibu || (_ibuR>=_stRef.ibu[0]&& _ibuR<=_stRef.ibu[1]);
const _inSRM= !_stRef.srm || (_srmR>=_stRef.srm[0]&& _srmR<=_stRef.srm[1]);
const _inABV= !_stRef.abv || (_abvR>=_stRef.abv[0]&& _abvR<=_stRef.abv[1]);
const _all  = _inOG && _inIBU && _inSRM && _inABV;
```

`_stRef = BJCP[_stKey]` — top-1'in BJCP range'leri.
`_all === false` ise UI'da ⚠️ icon + sol border `var(--sk)` (uyarı sarısı).

**Ama sadece TOP-1 için check yapılıyor.** Top-2/top-3 BJCP range'lerine bakılmıyor.

### 4. Tasarım önerisi (Kaan'ın belirttiği)

> V15 slug top-1 confidence < %50 VE reçete OG/ABV out-of-range → sistem "Bu reçete için alternatif stiller: [Weizenbock %X, Dunkelweizen %Y]" şeklinde 2nd/3rd ribbon'dan öneri öne çıkarsın

---

## Tasarım — 3 Aşamalı Sub-Style Routing

### Tetikleme koşulu

```
trigger = (top1_normalized < 50) AND (NOT _all)
        // top-1 confidence düşük + en az bir parametre out-of-range
```

Ek koşul (opsiyonel, daha tutucu):
```
trigger = (top1_normalized < 50) AND (count(out-of-range parametre) >= 2)
```

### Aşama 1 — Top-3'ün range fitness check'i

Mevcut `_inOG/_inABV` check **TOP-1 için**. Top-2 ve top-3 için aynı check yapılmalı:

```
for each ribbon[i] in [top-1, top-2, top-3]:
  bjcp_key = ribbon[i].bjcp
  ref = BJCP[bjcp_key]
  ribbon[i].fit_score = (in_OG ? 1 : 0) + (in_ABV ? 1 : 0) + (in_IBU ? 1 : 0) + (in_SRM ? 1 : 0)
  ribbon[i].fit_pct = ribbon[i].fit_score / 4 * 100
```

Top-1 fit %50, top-2 fit %100 → "top-2 daha uygun" diyebilir.

### Aşama 2 — Best fit alternatif öneri

```
best_fit = ribbon.argmax(fit_score)
if best_fit.idx > 0 AND best_fit.fit_score >= top1.fit_score + 1:
  // Top-2 veya top-3 belirgin daha iyi fit
  show_alternative(best_fit.bjcp, best_fit.normalized)
```

UI'da ribbon'un altında küçük öneri kutusu:
```
💡 Bu reçete OG/ABV açısından "Weizenbock" stiline daha uygun
   (range fit: top-1 Hefeweizen %50, top-2 Weizenbock %100)
   [Hedef stil olarak seç →]
```

### Aşama 3 — Recipe Doctor multi-style advice

Recipe Doctor şu an sadece top-1 BJCP key'in range'lerine göre advice veriyor (`:15030+`). Tasarım: trigger durumunda Doctor `_beklenenMaya(best_fit.bjcp)` çağırsın → maya önerisi de alternatif sub-style'a göre.

Örnek (Muzo Wheat ABV 6.4):
- Top-1 Hefeweizen out-of-range → Top-2 Weizenbock fit %100 trigger
- Doctor: "ABV 6.4% Hefeweizen tavanını geçiyor. Weizenbock 10C için ABV 6.5-9.5% range'inde — bu reçete sınırda Weizenbock. Maya: WY3068 Weihenstephan + uzun fermentasyon."

---

## Implementasyon Karmaşıklığı

| Adım | Karmaşıklık | Dosya:satır |
|---|---|---|
| 1. `fit_score` her ribbon için hesapla | ⭐ Düşük | `:14775-14778` mantığını döngü içine al |
| 2. Best-fit alternatif öneri kutusu | ⭐⭐ Orta | Ribbon altına yeni `<div>` (template literal) |
| 3. Recipe Doctor multi-style advice | ⭐⭐⭐ Yüksek | `_beklenenMaya` çağrısı best_fit'e göre + advice array genişlemesi |
| 4. Tetikleme threshold tuning | ⭐ Düşük | Sabit %50 confidence + 1+ out-of-range param |

**Tahmini süre:** ~2-3 saat (1+2 aşamaları), +1 saat (3. aşama).

---

## Sub-Style Routing Limit & Riskler

### Limit 1 — V15 slug listesinin granülaritesi

V15 cleaning sprint sonrası 77 slug. Wheat ailesi 5 slug, BJCP'da 20 wheat-family key. **V15 slug ≠ BJCP key 1-to-1 değil**. Örnek:
- V15 `south_german_hefeweizen` → BJCP "Weizen / Weissbier" (1 slug, 1 BJCP)
- BJCP "Hoppy Hefeweizen" / "American Hefeweizen" / "Kristallweizen" → V15 slug **YOK** (alternative routing yapılamaz)

**Çözüm:** Ya V15 slug listesini genişlet (Adım 56 + Adım 55.5), ya BJCP key'leri "kuzen" tablosunda grupla (`HEFEWEIZEN_FAMILY = ['Weizen / Weissbier', 'Hoppy Hefeweizen', 'American Hefeweizen', 'Kristallweizen', 'Leichtes Weizen']` — V15 top-1 Hefe ise out-of-range'de family içinden seç).

### Limit 2 — Ribbon top-3 zaten yanlış olabilir

V15 slug top-3 düşük confidence (%34/%X/%Y) → top-2/top-3 belki Saison/Witbier (yanlış aile). Range fitness check yapılınca **yanlış family'den bir slug top score alabilir**. Örnek: Wheat reçete + ABV 6.4 → Witbier %34 (out-of-range) + Witbier-Belgian Strong Golden %25 → Belgian Strong Golden fit %100 (5-6 SRM/IBU random uyum) → kullanıcıya "Belgian Strong Golden öner" derken Wheat reçetesi tavsiyeden uzaklaşır.

**Çözüm:** Family-based filter — top-1'in BJCP family'sini belirleyip aynı family içindeki BJCP key'leri öncelikli skor.

### Limit 3 — User confusion

UI'da 3 farklı yer (kart başlığı + ribbon + alternatif kutusu) çelişkili görünebilir. "Top-1 Hefeweizen ama biz Weizenbock öneriyoruz" mantığını net açıklamak gerek. Tasarım küçük "💡" ikon + tooltip: "Bileşenleriniz top-1'in range'lerinin dışında, ama top-2 ile uyumlu."

---

## Önerilen Yaklaşım (Adım 52+ scope)

1. **Aşama 1 + 2 (range fitness + alternatif kutusu)** — ⭐ Hızlı kazanım, ~2 saat. Top-2/top-3 zaten ribbon'da, sadece fit-score hesabı ve "💡" UI ekleme.
2. **Aşama 3 (Doctor multi-style)** — Adım 56 ile birlikte, daha sistemik refactor.
3. **Family table** — Adım 55.5 generic slug enrichment ile birlikte yapılabilir (BJCP family group ekle, slug→family map).

---

## Sonuç

- V15 slug listesinde Weizenbock VAR (`south_german_weizenbock` → "Weizenbock"). Routing imkanı var.
- Ribbon top-2/top-3 zaten gösteriliyor ama vurgu yok.
- Range checker top-1 only — top-2/top-3 için kolay genişletilebilir.
- **Hızlı kazanım**: top-1 confidence <%50 + out-of-range trigger → ribbon'un altına "💡 Alternatif: <best_fit.bjcp> (range fit %100)" kutusu. Kullanıcı manuel olarak alternatif stile geçer.
- **Tutarlılık**: kart başlığı manuel seçim (`alt_stil`) durumunda V12 önerisi alt başlıkta gösteriliyor (Bug 1 fix). Bu pattern alternatif sub-style için de extend edilebilir.

**Karar:** Adım 51 scope'u kapatıldı (V15 slug + SLUG_TO_BJCP + Bug 1 fix + Validation pipeline). Bu feature **Adım 52+ ayrı sprint** olarak değerlendir. Tasarım hazır, implementation Kaan onayı sonrası.
