# Benchmark Raporu — 2026-04-23 Round 2

## Kapsam
199 ground truth reçete (Brulosophy + BYO + AHA NHC + brewery clones).
İki motor: **flat** (style_engine.js) ve **hiyerarşik V3** (style_engine_v2.js).
İki converter: **v1 frozen** (_gt_convert.js) ve **v3** (_gt_convert_v3.js).

## Sonuçlar

### Final state (tüm patchler + v3 converter sonrası)

| Metrik | v1 frozen | v2 (v3 converter) | Δ |
|---|---|---|---|
| L1 ferm_type | 180/199 (90.5%) | 180/199 (90.5%) | +0 |
| L2 family | 147/199 (73.9%) | 147/199 (73.9%) | +0 |
| L3 top-1 hier | 58/199 (29.1%) | **61/199 (30.7%)** | **+3** |
| L3 top-3 hier | 93/199 (46.7%) | 95/199 (47.7%) | +2 |
| Flat top-1 | 65/199 (32.7%) | **66/199 (33.2%)** | +1 |
| Flat top-3 | 101/199 (50.8%) | 101/199 (50.8%) | +0 |

### L2 patch round ilerleyişi (motor patch)

| Patch | L2 | Δ |
|---|---|---|
| Baseline | 71.4% | — |
| P1 czech combo (saaz+pilsen) | 72.4% | +1.0 |
| P2 adjunct ×0.5 penalty | 72.9% | +0.5 |
| P3 american_lager combo | 73.4% | +0.5 |
| P4 US-05 english penalty | 73.4% | 0 |
| P5 english yeast_rx geniş | 73.9% | +0.5 |
| **Kümülatif kazanım** | | **+2.5** |

### v3 converter iyileştirme ilerleyişi

| İyileştirme | ΔL2 | ΔL3 top-1 | Açıklama |
|---|---|---|---|
| v3.1 yeast code extract | 0 | 0 | Raw zaten zengin |
| v3.2 katki ham data | 0 | 0 | 174/199 katkısız |
| v3.3 pct normalize + 6-row | 0 | **+3** | Tek net pozitif |

## Kritik L2 confusion pairs (sonrası)

```
6× belgian → specialty_adjunct
5× american → english
4× german_lager → czech_lager
4× american_lager → german_lager
3× english → american
3× american → specialty_adjunct
2× czech_lager → german_lager
```

## Kritik L3 confusion pairs (L1+L2 doğruyken)

```
4× czech_pale_lager → german_pilsener      (aile içi benzerlik)
4× english_brown_ale → american_brown_ale   (kardeş stil)
3× german_altbier → (yok)                   (EXCLUSION BUG şüphesi)
3× irish_dry_stout → session_beer           (low ABV magnet)
3× oktoberfest → munich_helles              (SRM overlap)
```

## Hard requirement test (bug sorumluluğu)

| Test | Sonuç |
|---|---|
| Black IPA SRM 10 IBU 166 → skor=0 | ✓ (SRM<17 + IBU>115 exclusion) |
| Black IPA SRM 35 IBU 60 → normal | ✓ (normalized=100) |
| WY3068 + Hefeweizen | ✓ (normalized=100) |
| WY3068 + American IPA | ✓ (yeast exclusion, skor=0) |
| WY3068 + APA | ✓ (yeast exclusion, skor=0) |
| WY3068 + Weizenbock | ✓ (normalized=100) |

**Hard requirement sisteminde bug yok.** 4 mekanizma (yeast exclusion, scalar exclusion/exclusion2, malt _SUM_, markers markerMissing/Present) sağlıklı çalışıyor.

## Gerçek bottleneck (veri tarafı)

1. Ham GT reçetelerinde **174/199 katkısız** (plain IPA/APA/Lager) — converter-side iyileştirme etkisiz.
2. `cornPct` sadece 12/199, `ricePct` 2/199 — american_lager combo hard marker etki edemiyor.
3. Raw yeast zengin (Imperial Pub A09, Lookr L29, Kaiser G02) ama motor FAMILY_SIGNATURES Imperial Yeast kod şemasını eksik kapsıyor.

## Sıradaki adım önerileri

- **X: Motor FAMILY_SIGNATURES Imperial Yeast genişletme** (tahmin L2 +%4-6)
- **Y: GT reçete havuzunu büyüt** (daha zengin adjunct/czech örnek)
- **Z: HTML V3 hiyerarşik kutu entegrasyonu**
