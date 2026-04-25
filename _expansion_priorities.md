# FAZ 2 — TRAINING DATA EXPANSION PRIORITIES

## TIER 1 — HIGH PRIORITY (Core BJCP Styles)
**Hedef:** Yaygın, well-defined, commercial examples bol

| Style | Mevcut | Hedef | Eklenecek | Kaynak |
|---|---|---|---|---|
| english_brown_ale | 8 | 12 | +4 | Samuel Smith, Newcastle, Manns |
| american_porter | 7 | 12 | +5 | Deschutes, Bell's, Great Lakes |
| oatmeal_stout | 7 | 12 | +5 | Samuel Smith, Founders |
| baltic_porter | 8 | 12 | +4 | Sinebrychoff, Okocim |
| irish_dry_stout | 8 | 12 | +4 | Guinness, Murphy's, Beamish |
| brown_porter | 4 | 10 | +6 | Fuller's London, Anchor |
| english_pale_ale | 3 | 10 | +7 | Bass, Boddingtons |
| west_coast_india_pale_ale | 7 | 10 | +3 | Stone IPA, Russian River |

**Tier 1 toplam:** ~40 reçete

## TIER 2 — MEDIUM PRIORITY (Popular Craft)
**Hedef:** Modern craft beer trendleri

| Style | Mevcut | Hedef | Eklenecek |
|---|---|---|---|
| session_india_pale_ale | 5 | 10 | +5 |
| black_ipa | 3 | 10 | +7 |
| white_ipa | 1 | 8 | +7 |
| brut_ipa | 1 | 8 | +7 |
| rye_ipa | 4 | 8 | +4 |

**Tier 2 toplam:** ~30 reçete

## TIER 3 — LOW PRIORITY (Niche/Regional)
**Hedef:** Specialty/experimental stiller (sonraki fazlarda)

- specialty_* kategorileri
- historical_beer
- swedish_gotlandsdricke
- kentucky_common_beer

---

## BATCH STRATEGY

**Batch 1:** Tier 1 core stiller (~40 reçete)  
**Batch 2:** Tier 2 craft stiller (~30 reçete)  
**Batch 3:** Tier 3 niche stiller (opsiyonel)

Her batch sonrası LOOCV ölç + regresyon kontrol