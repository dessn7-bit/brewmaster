# BREWMASTER V6 MOTOR METRICS LOG

## Faz 1 — DATA FOUNDATION (Alias Normalization)
**Tarih:** 2026-04-25  
**Hedef:** Slug alias karmaşasını çöz, measurement baseline'ını sağlamlaştır

### Training Data Changes
- **Total recipes:** 1031 (unchanged)
- **Alias normalization:** 48 reçete label değişti
- **Normalized pairs:** 12 alias çifti → kanonik forma
- **Under-represented classes:** 148/179 (%82.7)

### Major Class Changes (Post-normalization)
```
american_wild_ale: 9 → 18 reçete (+100%) 
german_koelsch: 14 → 16 reçete (+14%)
belgian_fruit_lambic: 12 → 16 reçete (+33%)  
american_barleywine: 3 → 13 reçete (+333%)
german_doppelbock: 7 → 12 reçete (+71%)
german_schwarzbier: 7 → 11 reçete (+57%)
french_biere_de_garde: 5 → 8 reçete (+60%)
belgian_pale_ale: 6 → 8 reçete (+33%)
```

### Engine Changes  
- ✅ ALIAS_MAP added to style_engine.js
- ✅ normalizeSlug() input/output normalization
- ✅ V6 motor rebuild (1031 recipes, normalized labels)

---

## BASELINE MEASUREMENT NEEDED

**Next:** Run LOOCV on V6.0 baseline  
- V5 reference: Top-1 ~60.6% (from diagnostic report)  
- V6.0 expected: +5-8 puan (alias confusion reduction)

**Test Recipe (Dark Belgian Dubbel):**
- OG 1.062, SRM 38, Belgian maya  
- V5 prediction: belgian_witbier (wrong)  
- V6.0 target: belgian_dubbel in top-3