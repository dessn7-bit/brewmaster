# Bug 3 — "Kural: ..." Alt Başlık Kaldırıldı

**Tarih:** 2026-04-28
**Status:** ✅ FIX UYGULANDI (push beklemede, Bug 4 ile birlikte)

---

## Sorun

Otomatik mod + V12 slug ≠ V2c rule durumunda alt başlıkta `· Kural: <V2c çıktısı>` gösteriliyordu. Muzo örneği:
- Kart: "Weizen / Weissbier" (V12 doğru ✓)
- Alt: "German Wheat · Kural: American Wild Ale" ❌ (V2c rule yanlış, kafa karıştırıcı)

Sebepler:
- V2c kural seti V6 (1100 reçete) zamanından — V15 (8416 reçete) ile uyumsuz
- ML doğru, kural yanlış (Muzo'da V15 hefeweizen ✓, V2c "American Wild Ale" ✗)
- UI tutarlılığı: kart + ribbon + Doctor V12 üzerinde tek kaynak, V2c **sızdırma**

---

## Fix (uygulandı, line `:14843+`)

Yeni davranış matrisi (Kaan onayı):

| Mod | Kart başlığı | Alt başlık |
|---|---|---|
| Otomatik + V12 var | **V12_BJCP** | `<stil_grup>` (cluster, sadece) |
| Otomatik + V12 yok | `stil_tah` (V2c rule) veya **"Belirsiz"** | `<stil_grup>` |
| Manuel + V12 ≠ alt_stil | `alt_stil` (kullanıcı seçimi) | `<stil_grup> · Sistem önerisi: V12_BJCP` |
| Manuel + V12 = alt_stil | `alt_stil` | `<stil_grup>` |

V2c motor **silinmedi** — line `:14104+` rule-based hesaplama devam ediyor, `console.log('  Eski kazanan:', stil_tah)` debug log'u korundu (line `:14187`). Sadece **UI'dan gizlendi**.

### Kod değişikliği (özet)

```js
// ÖNCE
if (_v12Title && stil_tah && stil_tah !== _v12Title) _subParts.push('Kural: '+stil_tah);

// SONRA
// (silindi — sadece stil_grup gösterilir)
```

Otomatik mod fallback chain: `V12_BJCP → stil_tah (V2c) → renk_adi → 'Belirsiz'`.

---

## Smoke test (beklenen)

| Reçete | Kart | Alt | Doğru? |
|---|---|---|:---:|
| Muzo wheat (V12 hefe) | Weizen / Weissbier | German Wheat | ✓ |
| Belgian Dubbel (V12 dubbel) | Dubbel | Belgian Strong / Trappist | ✓ |
| West Coast IPA (V12 ipa) | American IPA | American Hoppy | ✓ |
| Belirsiz reçete (V12 fail) | Belirsiz | (boş veya stil_grup) | ✓ |

V2c "Kural: ..." satırı **artık görünmüyor**. Console'da debug log'u devam ediyor (Kaan istediği davranış).

---

## Caller değişiklik özeti

`:14843+` template literal — sadece `_subParts.push('Kural: '+stil_tah)` satırı silindi. Diğer `window.bmSlugToBjcp` çağrıları korundu (10 caller hâlâ aynı kaynaktan okuyor).
