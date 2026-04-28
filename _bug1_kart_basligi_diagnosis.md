# Bug 1 — Kart Başlığı V12 Slug'a Bağlı Değil (DIAGNOSIS + FIX)

**Tarih:** 2026-04-28
**Bağlam:** SLUG_TO_BJCP fix (commit `ef62802`) sonrası: ribbon ✓, Recipe Doctor ✓, AMA kart başlığı (8 numaralı yuvarlak yanı) hâlâ stale değer gösteriyor (Muzo wheat reçetesinde "American Wild Ale / Buğday Birası").

---

## ROOT CAUSE — render sırası bug'ı

### Pipeline (template literal evaluation order)

| Sıra | Dosya:satır | Ne yapıyor |
|---|---|---|
| (1) | `:14104+` | `stil_tah` rule-based hesaplanır (V2 engine, _stilSorted, hibrit override) |
| (2) | `:14843` | **Kart başlığı render** → `${stil_tah \|\| renk_adi}` ← **BU NOKTADA `stil_tah` HÂLÂ RULE-BASED** |
| (3) | `:14848-14857` | Ribbon block içinde `_v5TopBjcp` hesaplanır (V12 slug → BJCP fuzzy/table) |
| (4) | `:14860-14862` | `if (_v5TopBjcp && _v5TopBjcp.length) stil_tah = _v5TopBjcp[0].bjcp;` ← **stil_tah override BURADA** |
| (5) | `:14955-14957` | Recipe Doctor `stil_tah = window.bmSlugToBjcp(...)` ← yeniden override |
| (6) | `:15030+` | `_beklenenMaya(stil_tah)` ← override edilmiş değer ✓ |

**Kart başlığı (2) override (4)'ten ÖNCE render ediliyor**. JavaScript template literal evaluation soldan-sağa, yukarıdan-aşağı.

### Soruların cevabı

| # | Soru | Cevap |
|---|---|---|
| 1 | Kart başlığı hangi field/fonksiyon? | `:14843` template literal: `${alt_stil ? alt_stil + small(stil_tah) : stil_tah \|\| renk_adi}` |
| 2 | recipe.styleName / saved state mi? | **HAYIR**. `S.stil` (manuel seçim, line 14898/16042) ve `stil_tah` (rule-based hesaplanan, V2 engine line 14104). V12 motorundan değil. |
| 3 | bmSlugToBjcp caller listesinde var mı? | **HAYIR** (önceki commit `ef62802`'de). Ribbon (line ~14850) + Recipe Doctor (line ~14956) caller'ları vardı, kart başlığı YOK. Bu commit'te ekleniyor. |

---

## FIX (uygulandı)

`:14843` template literal'i tamamen yeniden yazıldı. Inline `window.bmSlugToBjcp(__top3V6_engine[0].slug, __top3V6_engine[0].displayTR)` çağrısı ile V12 slug top-1 → BJCP key direkt alınıyor.

### Fix mantığı

```js
let _v12Title = null;
if (__top3V6_engine && __top3V6_engine.length && window.bmSlugToBjcp) {
  _v12Title = window.bmSlugToBjcp(__top3V6_engine[0].slug, __top3V6_engine[0].displayTR);
}

if (alt_stil) {
  // Hedef Stil manuel seçim → kullanıcı seçimi öncelikli
  // Alt başlıkta: "Sistem önerisi: <V12_title>" (alt_stil ile farklıysa)
  return `${alt_stil}` + small('Sistem önerisi: '+_v12Title);
} else {
  // Hedef Stil "Otomatik (bileşenlerden)" → V12 önerisi öncelikli
  // Alt başlıkta: "Kural: <stil_tah>" (rule-based, V12'den farklıysa)
  return `${_v12Title || stil_tah || renk_adi}` + small('Kural: '+stil_tah);
}
```

### Davranış matrisi

| Senaryo | Kart başlığı | Alt başlık |
|---|---|---|
| Otomatik + V12 var + V12 ≠ rule | `<V12_BJCP>` | `Kural: <stil_tah>` |
| Otomatik + V12 var + V12 = rule | `<V12_BJCP>` | (boş) |
| Otomatik + V12 yok | `<stil_tah>` veya `<renk_adi>` | (boş) |
| Manuel + V12 ≠ alt_stil | `<alt_stil>` | `<stil_grup> · Sistem önerisi: <V12_BJCP>` |
| Manuel + V12 = alt_stil | `<alt_stil>` | `<stil_grup>` |
| Manuel + V12 yok | `<alt_stil>` | `<stil_grup> · <stil_tah>` |

---

## SMOKE TEST 3 reçete (Bug 1 sonrası beklenen)

| Reçete | Otomatik mod | V12 slug top-1 | Kart başlığı | Ribbon top-1 | Match ✓ |
|---|---|---|---|---|:---:|
| Belgian Dubbel (OG 1.065) | ✓ | `belgian_dubbel` | **Dubbel** | Dubbel | ✓ |
| Wheat (Muzo: OG 1.056, ABV 6.4%) | ✓ | `south_german_hefeweizen` | **Weizen / Weissbier** | Weizen / Weissbier | ✓ |
| West Coast IPA | ✓ | `american_india_pale_ale` | **American IPA** | American IPA | ✓ |

Manual mode (kullanıcı "Belgian Dubbel" seçmiş, V12 "American IPA" diyor):
| Senaryo | Kart başlığı | Alt başlık |
|---|---|---|
| Manuel "Belgian Dubbel" + V12 "American IPA" diyor | **Belgian Dubbel** | "Belgian / Trappist · Sistem önerisi: American IPA" |

---

## Caller listesi (`window.bmSlugToBjcp`) — fix sonrası

| Konum | Dosya:satır | Caller |
|---|---|---|
| Ribbon top-3 BJCP map | `:14850` | `_v5TopBjcp` (BJCP key) |
| Recipe Doctor stil_tah override | `:14956` | `_v5Key` (stil_tah) |
| **Kart başlığı (auto + manuel)** ⭐ YENİ | `:14843+` | `_v12Title` (kart title) |
| Helper fallback | `:3650+` | `_bmFuzzySlugToBjcp` (legacy motorlar için) |

**Toplam 10 caller** (Python verify: `window.bmSlugToBjcp` 10x).

---

## SONUÇ

Fix tek satırlık template literal değişikliği değil — V12 slug→BJCP çağrısı artık 3 yerde tutarlı:
1. Kart başlığı (üst sol, büyük yazı)
2. Ribbon (top-3 BJCP key)
3. Recipe Doctor (stil_tah, maya advice)

Hepsi **aynı** `window.bmSlugToBjcp(slug, displayTR)` üzerinden okuyor → tutarsızlık imkansız.
