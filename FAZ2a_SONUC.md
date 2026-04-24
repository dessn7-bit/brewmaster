# Faz 2a Sonuç Raporu

**Tarih:** 2026-04-23
**Durum:** Faz 2a tamamlandı, Faz 2b+2c yarına bırakıldı

## Mevcut Durum

**Motor çalışıyor:** `style_engine.js` → `styleMatchScore(slug, recipe) → {score, normalized, breakdown, exclusions}` + `findBestMatches(recipe, topN)` + `matchSubstyles(recipe, parent)`

**Test sonuçları (55 reçete):**
- Top-1 doğruluk: **36/55 (%65)** — son iterasyon 30 → 34 → 36
- Top-3 doğruluk: **49/55 (%89)**
- 5 referans reçete (Muzo Hefeweizen, Dubbel, NEIPA, APA, German Pils): **5/5 top-1**

## Dosya Envanteri

| Dosya | Boyut | Açıklama |
|---|---|---|
| `STYLE_DEFINITIONS.json` | ~800 KB | 203 ana stil, thresholds + hardZero-in-zones + yeast family + weights |
| `SUBSTYLE_VARIANTS.json` | 18 KB | 58 alt-stil, parent + triggers |
| `BA_2026_styles.json/.txt` | 16 KB | BA 2026 parse çıktısı (168 stil) |
| `BJCP_2021_styles.json` | ~30 KB | BJCP 2021 parse çıktısı (118 stil) |
| `HYBRID_styles.json` | ~50 KB | Union hibrit (211 stil) |
| `BM_signatures.json` | ~50 KB | Brewmaster mevcut tablosu (243 stil) |
| `style_engine.js` | 5 KB | Ana motor fonksiyonları |
| `_patch_defs.js` | ~15 KB | 39 patch (mapping fix + tight specialty + ince ayar) |
| `_test_5recipes.js` | 3 KB | Referans testler |
| `_test_50recipes.js` | ~20 KB | 55 test reçete |

## Karışıklık Tablosu — Kalan 19 Fail

| Kategori | Sayı | Örnek | Ana Neden |
|---|---|---|---|
| Slug duplicate / BJCP alias | 1 | leipzig_gose ↔ gose | BA 2 ayrı Gose (Leipzig + Contemporary), reçete herhangi birine düşebilir |
| **İnce ABV overlap** | 5 | Tripel↔Strong Blonde, Dubbel↔Dark Strong↔Quad, Scottish Export↔Wee Heavy | BA aralıkları gerçekten overlap, Exclusion ABV sınırları yetmiyor |
| **Hop profili overlap** | 3 | Helles↔Pils, Czech↔Dortmunder, WCI↔American IPA | Aynı hop ailesi, ince aralık farkları |
| **Signature eksik spesifikleştirme** | 4 | American Wheat↔Rye Ale, Milk Stout↔Pumpkin, Session IPA↔APA, Blanche↔Gose | Anahtar ayırıcı marker (laktoz, baharat, buğday) signature ağırlığı yetersiz |
| **Specialty agresif** | 4 | Munich Dunkel↔Rye Beer, American Hefeweizen↔German Rye, Milk Stout↔Pumpkin | Her tight patch sonrası yeni agresif stil çıkıyor |
| **Malt signature çakışma** | 2 | Vienna↔Czech Amber, Belgian Strong Golden↔Tripel | Benzer malt profilleri |

## Önemli Kararlar ve Notlar

### Uygulanan 39 Patch (özet)
1-6: Hefeweizen pilsner, Kristal filtrasyon, APA Amerikan hop, Specialty spesiflik cezası, International Pale IBU, Italian Grape fruit zorunlu
7: Yanlış union'dan IBU bug'ları
8-11: Ulusal pale (AU/NZ/NEIPA/APA) için hop kimliği zorunlu
12: Motor `customCheck` desteği
13-15: German vs Czech vs Italian Pils ayrımı
16: APA signature fix (mapping Nordic Pale ile karıştırılmış)
17: American IPA ABV daralt
18: Dunkles Weissbier → Dunkel Weizen merge
19: Tight Specialty (Winter Seasonal, Amer Porter vs.)
20: Belgian Strong family ABV/OG exclusion
21: Lager alt-varyant ayrımları
22: Stout/Porter exclusion sınırları
23: IPA alt-ailesi
24-28: Gueuze blend, ESB/Wee Heavy İngiliz maya, Blanche Sour yeast
29-39: Tie-breakers, specialty saison trigger, Berliner no-spice vs.

### Gerçekten iyi çalışan kategoriler
- ✅ Weizen ailesi (Hefeweizen, Kristal, Leichtes, Bernsteinfarbenes, Weizenbock dahil) — 7/8
- ✅ Belçika ana (Dubbel, Tripel ile ince ayarlar, Blonde, Pale) — 4/5
- ✅ Klasik IPA (APA, American IPA, NEIPA) — 3/3
- ✅ Witbier — 2/3
- ✅ Saison klasik + Bière de Garde — 2/3

### Sorunlu kategoriler
- ⚠️ Lager alt-varyantları (Helles, Dortmunder, Vienna, Munich Dunkel, Schwarzbier) — 3/7
- ⚠️ Belgian Strong (Dark Strong, Quadrupel, Strong Golden) — ince ABV ayrımları
- ⚠️ Specialty (birçok kategori agresif)
- ⚠️ IPA alt-ailesi (Session IPA, WCI)

## Üç Seçenek Analizi (bu gece tartışılan)

**A) Daha fazla iterasyon** — 10-15 patch daha → ~%70-75 top-1. Whack-a-mole riski.

**B) Motor matematiksel iyileştirme** — "Aile içi tie-break" + "stil spesifiklik skoru". 3-4 saatlik iş, potansiyel %85+ top-1. Özellikle Tripel↔Strong Blonde, Dubbel↔Dark Strong↔Quad gibi aile içi çakışmaları doğal çözer.

**C) Faz 2c (HTML entegrasyonu)** — Motoru Brewmaster HTML'e göm, paralel `console.log`, Kaan gerçek reçetelerle dener. %89 top-3 zaten kullanılabilir. Kör noktalar kullanımda çıkar.

## Kaan'ın Kararı

**B + C yarın yapılacak. Bu gece durduk.**

## Sıradaki — Yarın

1. **İlk iş: Brewmaster kısayolu** (desktop shortcut) — Kaan'ın yarınki giriş noktası
2. **Faz 2b: B (aile içi tie-break)**
   - Stilleri "aile" ile etiketle (belgian_strong, weizen, lager_pale, ipa_modern vs.)
   - Aile içi overlap varsa ayrıştırıcı kritere extra ağırlık (örn. Dubbel vs Quad → ABV ×2)
   - Specialty stillerin toplam skorunu daha sıkı cap'le (örn. max 85)
3. **Faz 2c: HTML entegrasyonu**
   - `style_engine.js` → Brewmaster HTML'e gömme
   - Mevcut `calc()` fonksiyonundan reçete objesi çıkar → `findBestMatches()` çağır
   - Editor UI'da "Ana stil %skor + 2-3. alternatif" göster
   - Paralel: eski `sp()` sistemi korunur, konsola iki sonuç karşılaştırması
4. **Canlı test** — Kaan gerçek reçetelerle dener, kör noktaları tespit eder
5. **Faz 3: Motor geçişi** (paralel doğrulama bitince)
6. **Faz 4:** Türk/Orta Doğu özel stiller (boza, rakı, mahaleb vs.)
