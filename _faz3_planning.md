# FAZ 3 — FEATURE ENGINEERING PLAN

## CURRENT STATE (V6.2)
- **Dataset**: 1071 recipes × 61 features
- **Performance**: LOOCV ~76.6% top-3 (estimated)
- **Rule system**: Fixed and deployed (w_rule: 0.1)

## FAZ 3 TARGET (V6.3)
- **Feature expansion**: 61 → 85+ features  
- **Performance goal**: 80%+ top-1, 85%+ top-3
- **Focus areas**: Process knowledge, yeast granularity, fermentation

---

## FEATURE EXPANSION ROADMAP

### Phase 3A — Process Features (Brewing Knowledge)
**Features to add (~12 new)**:
```
mash_single_step: boolean        // Single infusion vs step mash
mash_temp_low: boolean           // < 65°C (body emphasis)  
mash_temp_high: boolean          // > 68°C (attenuation emphasis)
boil_time_long: boolean          // > 90min (DMS, protein)
boil_time_short: boolean         // < 60min (hop retention)
cold_crash: boolean              // Clarity technique
lagering_duration: number        // Days < 40°F
fermentation_temp_low: boolean   // < 18°C ale, < 8°C lager
fermentation_temp_high: boolean  // > 22°C ale, > 12°C lager  
dry_hop_timing: enum             // None/Primary/Secondary/Both
dry_hop_amount: number           // g/L total
sparge_technique: enum           // Batch/Fly/NoSparge/BIAB
```

### Phase 3B — Yeast Granularity (Strain-Specific)
**Current**: 12 yeast categories (ale, lager, belcika, weizen, etc.)  
**Target**: 25+ specific strains
```
// Belgian expansion  
abbey_yeast: boolean             // Chimay, Westmalle strains
trappist_yeast: boolean          // T-58, M31, M41
saison_yeast: boolean            // 3724, Belle Saison, M29
wild_belgian: boolean            // Brett, Pedio, Lacto

// Ale expansion
london_ale: boolean              // Fuller's, London ESB
california_ale: boolean          // Chico strain (Sierra Nevada)
vermont_ale: boolean             // Conan, NEIPA strains  
kolsch_yeast: boolean            // WLP029, Wyeast 2565

// German expansion
bavarian_weizen: boolean         // 3068, 3638 banana/clove
berliner_lactobacillus: boolean // Lacto for sours
german_lager: boolean            // 34/70, Augustiner

// Specialty
kveik_yeast: boolean             // Norwegian farmhouse
brett_primary: boolean           // 100% Brett fermentation
```

### Phase 3C — Advanced Recipe Features
**Complexity indicators (~8 new)**:
```
grain_bill_complexity: number    // Number of unique malts
hop_complexity: number           // Number of unique hop varieties  
adjunct_usage: boolean           // Corn, rice, wheat, oats
specialty_grain_pct: number      // Crystal, roasted, chocolate %
hop_schedule_complexity: number  // Boil + whirlpool + dry hop stages
water_treatment: boolean         // Acidification, mineral additions
barrel_aging: boolean            // Oak, whiskey, wine barrels
fruit_addition: boolean          // Fresh/extract fruit
```

---

## IMPLEMENTATION SEQUENCE

### Step 1: Analyze Current Feature Usage
- **Script**: `_analyze_feature_importance_v6_2.js`
- **Goal**: Identify underutilized features, correlations
- **Output**: Feature importance ranking, redundancy analysis

### Step 2: Create Process Feature Extractor  
- **Script**: `_extract_process_features.js`
- **Input**: Recipe descriptions, brewing notes
- **Logic**: Text mining for process keywords
- **Keywords**: "step mash", "cold crash", "lagering", "dry hop"

### Step 3: Expand Yeast Mapping
- **File**: `_yeast_strain_mapping.json`
- **Logic**: Map maya descriptions to specific strain features
- **Sources**: Wyeast/White Labs strain guides

### Step 4: Build V6.3 Dataset
- **Script**: `_build_v6_3_dataset.js`
- **Input**: V6.2 dataset + new feature extractors
- **Output**: `_ml_dataset_v6_3.json` (1071 × 85+ features)

### Step 5: Train & Evaluate V6.3
- **Script**: `_build_inline_v6_3.js`
- **Target**: 85+ features, optimized hyperparameters
- **Validation**: LOOCV + Dark Belgian Dubbel test case

---

## EXPECTED IMPACT

### Performance Gains
- **Process features**: +3-5% (brewing knowledge injection)
- **Yeast granularity**: +2-3% (strain-specific behavior)  
- **Advanced features**: +1-2% (complexity modeling)
- **Total expected**: +6-10% top-1 accuracy

### Style-Specific Improvements
- **Belgian styles**: Better abbey vs trappist vs saison distinction
- **German styles**: Weizen vs wheat ale, lager temperature profiles
- **American styles**: California ale vs Vermont ale (NEIPA)
- **Sour styles**: Lacto vs wild fermentation patterns

### Quality Thresholds
- **Minimum acceptable**: 78% top-1, 83% top-3
- **Target performance**: 80% top-1, 85% top-3  
- **Stretch goal**: 82% top-1, 87% top-3

---

## RISK MITIGATION

### Feature Engineering Risks
- **Overfitting**: Monitor validation vs training gap
- **Feature explosion**: Use feature selection techniques
- **Sparse features**: Ensure adequate representation across styles

### Data Quality Risks  
- **Text mining errors**: Manual validation of process extraction
- **Yeast mapping errors**: Cross-reference multiple strain databases
- **Recipe interpretation**: Conservative feature assignment

### Performance Risks
- **No improvement**: Fall back to V6.2, analyze feature importance
- **Regression**: A/B test against V6.2 baseline
- **Deployment issues**: Gradual rollout with fallback

---

## SUCCESS CRITERIA

### Technical Metrics
- ✅ **85+ features**: Meaningful feature expansion  
- ✅ **80%+ top-1**: Significant accuracy improvement
- ✅ **85%+ top-3**: Strong recommendation quality
- ✅ **Dark Belgian Dubbel**: Test case passes (belgian_dubbel top-3)

### Qualitative Indicators  
- ✅ **Better Belgian distinction**: Abbey vs Saison vs Tripel
- ✅ **Process accuracy**: Step mash styles vs single infusion
- ✅ **Yeast accuracy**: Specific strain behavior modeling
- ✅ **No major regressions**: V6.2 strengths preserved

**Timeline**: 2-3 hours autonomous work
**Deliverable**: V6.3 motor ready for testing