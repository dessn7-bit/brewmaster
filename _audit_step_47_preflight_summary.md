# AUDIT STEP 47 PRE-FLIGHT — Feature Engineering Coverage

**Tarih:** 2026-04-27
**Süre:** ~30 dk (gerçek dataset üzerinde 50+ sample değil 8061 reçete tam audit)
**Sonuç:** **🟡 KISMİ GO** — 12 önerilen feature → **7 viable** (5 SKIP), V11 deploy ÖNCESİ revize

---

## 🎯 ÖZET

| Feature grubu | Önerilen | GO | SKIP | Sebep |
|---|---:|---:|---:|---|
| Adjunct keywords | 6 | **5** | 1 (has_cocoa) | Cocoa regex Stout 55% FP, fix denemesi yetersiz (<10 record) |
| Yeast biology | 6 | **2** | 4 (brett/lacto/pedio/sour_blend) | V10.1 dataset'te coverage <%0.2 (target %3-5) |
| **TOPLAM** | **12** | **7** | **5** | 69 → **76 feature** (planlanan 81 yerine) |

V11 retrain still GO ama **revize edilmiş feature set** ile.

---

## 1. Yeast Strain Coverage — 4/6 SKIP (Sour data garbage)

### Coverage results (8061 reçete üzerinden)

| Pattern | Hedef coverage | Gerçek | Status |
|---|---:|---:|---|
| **brett** | %5+ | **%0.17** (14/8061) | ❌ SKIP |
| **lacto** | %3+ | **%0.10** (8/8061) | ❌ SKIP |
| **pedio** | n/a | **%0.02** (2/8061) | ❌ SKIP |
| **sour_blend** | n/a | **%0.11** (9/8061) | ❌ SKIP |
| **belgian** | %5+ | **%4.63** (373/8061) | 🟡 BORDERLINE → KEEP |
| **clean_us05** | n/a | **%11.79** (950/8061) | ✅ GO |

### Kök neden: Sour cluster yeast data ÇÖP

74 Sour/Wild/Brett reçetenin yeast field'ları:
- **7 kayıt: "[object object]"** (parser bug — array stringify hatası)
- **Çoğu paragraflık prose** (blog post body içeriği yeast field'a sızmış):
  - "for primary fermentation. a previous flemish red had done well..."
  - "to ferment a beer; more specifically bm45 (a red wine strain..."
  - "and bacteria need. a sparge that causes the grain bed..."
- **Sadece 4 gerçek strain ID** ("wyeast 5278 belgian lambic blend" 2x, "lallemand sourvisiae" 2x)

→ Sour cluster (74 reçete) içinde brett/lacto strain ID feature'ı **fiziksel olarak imkansız**. Underlying data quality sorunu.

### Belgian yeast (373 hits) — distribution güzel ⭐

| Cluster | Hits | % cluster |
|---|---:|---:|
| Belgian Strong / Trappist | 147 | 56% |
| Belgian Pale / Witbier | 108 | 44% |
| Saison / Farmhouse | 68 | 47% |
| American Hoppy | 23 | 1% (FP düşük) |
| Specialty / Adjunct | 10 | 2% |

→ Belgian yeast → Belgian cluster mapping güçlü, FP düşük. **GO.**

### Clean US05 (950 hits) — strong baseline marker ✅

| Cluster | Hits |
|---|---:|
| American Hoppy | 581 (61%) |
| Irish / Red Ale | 121 |
| Stout / Porter | 59 |
| Specialty / Adjunct | 51 |
| German Lager | 44 |

→ "Clean American" yeast = American Hoppy cluster sinyali. **GO.**

---

## 2. Adjunct Keywords — 5/6 GO (has_cocoa BROKEN)

### Coverage results

| Pattern | Total | % | Specialty hits | False positive risk | Status |
|---|---:|---:|---:|---|---|
| has_coffee | 51 | 0.63% | 5 (Specialty 1.2%) | Stout 37 (4.2% — Coffee Stout), kabul edilebilir | ✅ KEEP |
| has_fruit | 92 | 1.14% | 18 (Specialty 4.5%) | American Hoppy 29 (NEIPA "Mango" names 1.3%), düşük | ✅ KEEP |
| has_spice | 46 | 0.57% | 9 (Specialty 2.2%) | Stout 10 (mostly "AB:11" Imperial Stout), düşük | ✅ KEEP |
| **has_cocoa** | **1106** | **13.72%** | 59 (14.6%) | **Stout 479 (55%)** — REGEX BROKEN | ❌ SKIP |
| has_chili | 13 | 0.16% | 7 (Specialty 1.7%) | Çok düşük FP | ✅ KEEP |
| has_smoke | 78 | 0.97% | 17 (Specialty 4.2%) | German Lager 14 (Rauchbier — doğru sinyal), Stout 21 | ✅ KEEP |

### has_cocoa neden SKIP

Original regex: `chocolate(?!\s*malt|\s*malz|mout|nmout)`

Stout cluster'ında 479/871 (%55) tetiklendi çünkü:
- "Chocolate Stout", "Chocolate Porter" reçete isimleri "chocolate" kelimesi içeriyor
- "chocolate" + lookahead "malt" ayrımı başarısız (recipe **isminde** chocolate var, malt liste'sinde de "chocolate malt" var, regex iki katmanı ayıramıyor)

Stricter regex denemeleri:
- `(cocoa\s*(nibs|powder)|cacao\s*nibs|chocolate\s+nibs)` → **6 record** (anlamlı n yok)
- `(cocoa\b|cacao|nibs)` (chocolate'sız) → **11 record**

→ Coverage çok düşüştü, feature'ın faydalı olması için yeterli n yok. **SKIP.**

### Specialty cluster genel coverage

403 Specialty reçetenin **98'i (%24.3)** en az 1 adjunct keyword içeriyor. Hedef %30+ idi → **borderline**.

Bu şu anlama gelir:
- 305 Specialty reçete keyword **YOK** — feature engineering bu reçeteleri **discriminate edemez**
- 98 Specialty reçete keyword VAR → V11 model'in iyileşme alanı (~%24)

**Realistic Specialty Top-1 artış tahmini:** %9 → **%15-20** (ön planlanan %25-35'ten daha düşük)

---

## 3. Final feature plan (76 feature, V10.1'den +7)

```js
// Adjunct keywords (5 feature, has_cocoa DROPPED)
function detectAdjuncts(recipe) {
  const text = ((recipe.name||'') + ' ' + (recipe.sorte_raw||'') + ' ' +
                (recipe.raw?.notes||'') + ' ' +
                ((recipe.raw?.malts||[]).map(m=>m.name).join(' ')) + ' ' +
                ((recipe.raw?.hops||[]).map(h=>h.name).join(' '))).toLowerCase();
  return {
    has_coffee: /\b(coffee|espresso|cold[\s-]?brew|caffè)\b/i.test(text) ? 1 : 0,
    has_fruit: /\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|lime|lemon zest|orange peel|frambozen|himbeere|kirsche|aardbei|pomegranate)\b/i.test(text) ? 1 : 0,
    has_spice: /\b(coriander|cardamom|cinnamon|vanilla bean|black pepper|ginger|anise|nutmeg|clove|kruidnagel|kaneel|gember)\b/i.test(text) ? 1 : 0,
    has_chili: /\b(chipotle|jalape[ñn]o|habanero|ghost pepper|chili pepper|chili|ancho|poblano|chile)\b/i.test(text) ? 1 : 0,
    has_smoke: /\b(smoke|smoked|rauch|peat|gerookt|isli)\b(?!\s*malt|\s*malz|mout)/i.test(text) ? 1 : 0
  };
}

// Yeast biology (2 feature, brett/lacto/pedio/sour_blend DROPPED — coverage <%0.2)
function detectYeastBiology(recipe) {
  let y = recipe.raw?.yeast || '';
  if (Array.isArray(y)) y = y.join(' ');
  const yLower = String(y).toLowerCase();
  const BELGIAN = ['wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388','wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565','wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590','safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison'];
  const CLEAN_US05 = ['wyeast 1056','wy1056','wlp001','wlp 001','safale us-05','safale us05','us-05','us05','bry-97','bry97','chico'];
  return {
    has_belgian_yeast: BELGIAN.some(id => yLower.includes(id)) ? 1 : 0,
    has_clean_us05_isolate: CLEAN_US05.some(id => yLower.includes(id)) ? 1 : 0
  };
}
```

**Toplam 7 yeni feature:** has_coffee, has_fruit, has_spice, has_chili, has_smoke, has_belgian_yeast, has_clean_us05_isolate

V10.1 (69) → **V11 (76 feature)**

---

## 4. Revize edilmiş beklenti

| Cluster | V10.1 Top-1 | Original beklenti | **Revize beklenti (76 feature)** |
|---|---:|---:|---:|
| Specialty/Adjunct | %9 | %25-35 | **%15-22** (24% reçete keyword içerir, %75 boş) |
| Sour/Wild/Brett | %23 | %35-45 | **%23-26** (brett/lacto skip, sadece Belgian feature dolaylı yardım) |
| Belgian Strong/Trappist | %69 | %72 | %71-74 (has_belgian_yeast strong signal) |
| **Top-1 ortalama** | %69 | %72-74 | **%70-72** (modest gain) |

**Realist:** Original sprint hedeflerinin %30-50'si tutar. Sour iyileşmez (data quality issue, FE çözmez).

---

## 5. KARAR — Aşama 2 GO mu?

### 🟢 GO (önerilen)

7 viable feature ekleme + V11 retrain. Beklenen modest gain (Top-1 +%1-3pp ortalama, Specialty +%6-13pp).

**Riskler:**
- Specialty hedefin altı (yapısal: %75 reçete keyword içermiyor)
- Sour iyileşmez (bu sprint çözmez, data quality issue)
- Top-1 ortalama tahmin edilenin altında

**Karar gerekçesi GO için:**
- 7 feature sağlam coverage'a sahip (has_clean_us05 %12, has_belgian %5, has_cocoa hariç adjunctlar %0.6-1.1 ama Specialty içinde %1-5)
- V11 retrain zaten ~7 dk
- En kötüyse V11 deploy etmem (V10.1 default kalır)

### 🔴 SKIP

- 7 feature beklenen %25-35 artışı vermeyebilir (gerçek %15-20)
- Sprint zamanı feature engineering yerine başka yere (BF API, NHC scrape)
- V10.1 zaten %89 top-3, marjinal kazanım

---

## 6. Sonraki Adım Kaan kararı

**Plan A (önerilen):** 7 feature ile Aşama 2 başlat (~1 saat). V11 deploy edilir veya V10.1 default kalır.

**Plan B (skip):** Adım 47 iptal. Feature engineering bu sprintte etkisiz, Adım 48'de farklı stratejiler dene (data quality fix Sour yeast field, BF API, vb.).

---

## 7. Çıktılar

- `_audit_step_47_preflight_summary.md` — Bu rapor
- `_a47_yeast_coverage.js` — yeast pattern coverage script
- `_a47_yeast_freq.json` — full yeast frequency table
- `_a47_adjunct_coverage.js` — adjunct keyword coverage script
- `_a47_adjunct_freq.json` — adjunct frequency table per cluster
- `_a47_cocoa_strict_test.js` — has_cocoa fix denemesi (yetersiz)

DUR — Kaan onayı bekliyor.
