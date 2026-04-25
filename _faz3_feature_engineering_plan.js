#!/usr/bin/env node
/**
 * FAZ 3: FEATURE ENGINEERING COMPREHENSIVE PLAN
 *
 * Goal: Add process features and yeast granularity to improve model discrimination
 * Current issue: Dark Belgian Dubbel → Belgian Witbier confusion due to feature gaps
 *
 * Root cause analysis:
 * - Dubbel: Belgian ale yeast + abbey malt + 18-22C fermentation + low attenuation
 * - Witbier: Wheat yeast + coriander/orange + 18-22C fermentation + high attenuation
 * - Motor sees yeast_belgian=1 for both, can't distinguish process differences
 */

const fs = require('fs');

console.log("🔬 FAZ 3: FEATURE ENGINEERING COMPREHENSIVE PLAN");
console.log("===============================================");

// Load current dataset to analyze existing features
const currentData = JSON.parse(fs.readFileSync('_ml_dataset_v6_batch_2ab_complete.json', 'utf8'));
console.log(`Current dataset: ${currentData.records.length} recipes`);

// Analyze existing feature structure
const sampleRecipe = currentData.records[0];
const existingFeatures = Object.keys(sampleRecipe.features || {});
console.log(`\nExisting features count: ${existingFeatures.length}`);

console.log("\n📊 CURRENT FEATURE GAPS (from diagnostic report):");
console.log("1. Process features missing:");
console.log("   - mash_temp_c: Decoction vs step mash (German vs American/English)");
console.log("   - fermentation_temp_c: Lager (7-12C) vs Ale (18-22C) vs Saison (24-28C)");
console.log("   - water chemistry: Ca/SO4 ratio, mineral profile");
console.log("   - yeast_attenuation: High (Saison 85%) vs Low (English 70%)");
console.log("   - boil_time_min: Lager (90+ min) vs Ale (60 min)");
console.log("   - dry_hop_days: Modern IPA vs traditional styles");

console.log("\n2. Yeast granularity insufficient:");
console.log("   - yeast_belgian = Dubbel + Tripel + Strong Dark + Witbier + Golden combined");
console.log("   - Need separate: yeast_abbey, yeast_witbier, yeast_golden_strong");

console.log("\n3. Style signature disambiguation needed:");
console.log("   - Dubbel vs Witbier: Same belgian yeast flag, no process distinction");
console.log("   - German vs American: Same ale process, no water/mash distinction");

// FAZ 3 implementation phases
const FAZ3_PHASES = [
    {
        phase: "3A",
        title: "Process Features Implementation",
        target_features: [
            "mash_temp_c",
            "fermentation_temp_c",
            "water_ca_ppm",
            "water_so4_ppm",
            "water_cl_ppm",
            "yeast_attenuation",
            "boil_time_min",
            "dry_hop_days",
            "mash_type_step",
            "mash_type_decoction",
            "lagering_days"
        ],
        strategy: "Add process feature columns to all 1100 recipes",
        impact: "Discrimination between same-yeast different-process styles"
    },
    {
        phase: "3B",
        title: "Yeast Granularity Split",
        target_features: [
            "yeast_abbey",      // Dubbel, Tripel, Dark Strong
            "yeast_witbier",    // Witbier, White IPA
            "yeast_golden_strong", // Golden Strong, Tripel variants
            "yeast_saison_3724", // Saison strain specific
            "yeast_saison_dupont", // Dupont strain specific
            "yeast_english_bitter", // ESB strain specific
            "yeast_english_mild"    // Mild strain specific
        ],
        strategy: "Replace yeast_belgian with granular strain categories",
        impact: "Belgian style family disambiguation"
    },
    {
        phase: "3C",
        title: "Style-Based Default Backfill",
        target: "All 1100 existing recipes",
        strategy: "Backfill new features with style-based defaults",
        impact: "Complete feature coverage without null values"
    }
];

console.log("\n📋 FAZ 3 IMPLEMENTATION PHASES:");
FAZ3_PHASES.forEach((phase, idx) => {
    console.log(`\n${idx + 1}. ${phase.phase}: ${phase.title}`);
    if (phase.target_features) {
        console.log(`   Features: [${phase.target_features.slice(0, 3).join(', ')}...] (${phase.target_features.length} total)`);
    }
    console.log(`   Strategy: ${phase.strategy}`);
    console.log(`   Impact: ${phase.impact}`);
});

// Style-based default value research
console.log("\n🧬 STYLE-BASED DEFAULT VALUE RESEARCH:");

const STYLE_DEFAULTS_PREVIEW = {
    "belgian_dubbel": {
        mash_temp_c: 67,         // Single infusion
        fermentation_temp_c: 20, // Abbey yeast optimal
        water_ca_ppm: 150,       // Belgian water profile
        water_so4_ppm: 280,      // Higher sulfate
        water_cl_ppm: 180,       // Balanced chloride
        yeast_attenuation: 75,   // Medium attenuation
        boil_time_min: 60,       // Standard ale boil
        dry_hop_days: 0,         // No dry hopping
        yeast_abbey: 1,          // NEW: Abbey strain
        yeast_witbier: 0,        // NEW: Not witbier yeast
        yeast_golden_strong: 0   // NEW: Not golden strong yeast
    },
    "belgian_witbier": {
        mash_temp_c: 65,         // Lower for lighter body
        fermentation_temp_c: 19, // Witbier yeast optimal
        water_ca_ppm: 100,       // Soft water profile
        water_so4_ppm: 150,      // Lower sulfate
        water_cl_ppm: 100,       // Lower chloride
        yeast_attenuation: 82,   // High attenuation (KEY difference!)
        boil_time_min: 60,       // Standard
        dry_hop_days: 0,         // No dry hopping
        yeast_abbey: 0,          // NEW: Not abbey yeast
        yeast_witbier: 1,        // NEW: Witbier strain
        yeast_golden_strong: 0   // NEW: Not golden strong
    },
    "american_india_pale_ale": {
        mash_temp_c: 66,         // Medium body
        fermentation_temp_c: 19, // American ale yeast
        water_ca_ppm: 300,       // High calcium (Burton-on-Trent style)
        water_so4_ppm: 400,      // High sulfate for hop bite
        water_cl_ppm: 100,       // Low chloride
        yeast_attenuation: 80,   // High attenuation
        boil_time_min: 60,       // Standard
        dry_hop_days: 4,         // Modern dry hopping
        yeast_abbey: 0,
        yeast_witbier: 0,
        yeast_golden_strong: 0
    },
    "german_koelsch": {
        mash_temp_c: 64,         // Light body
        fermentation_temp_c: 16, // Cool ale fermentation
        water_ca_ppm: 80,        // Soft Cologne water
        water_so4_ppm: 60,       // Very low sulfate
        water_cl_ppm: 80,        // Low chloride
        yeast_attenuation: 85,   // High attenuation
        boil_time_min: 90,       // Longer boil
        dry_hop_days: 0,         // No dry hopping
        yeast_abbey: 0,
        yeast_witbier: 0,
        yeast_golden_strong: 0
    }
};

console.log("\nSample style defaults (Belgian Dubbel vs Witbier discrimination):");
Object.entries(STYLE_DEFAULTS_PREVIEW).forEach(([style, defaults]) => {
    if (style.includes('belgian')) {
        console.log(`\n${style}:`);
        console.log(`  fermentation_temp_c: ${defaults.fermentation_temp_c}C`);
        console.log(`  yeast_attenuation: ${defaults.yeast_attenuation}%`);
        console.log(`  yeast_abbey: ${defaults.yeast_abbey}, yeast_witbier: ${defaults.yeast_witbier}`);
        console.log(`  water_so4_ppm: ${defaults.water_so4_ppm} (sulfate profile)`);
    }
});

console.log("\n🎯 KEY DISCRIMINATION IMPROVEMENTS:");
console.log("✅ Dubbel vs Witbier: yeast_abbey vs yeast_witbier + attenuation difference");
console.log("✅ German vs American: water chemistry + fermentation temp differences");
console.log("✅ Traditional vs Modern: dry_hop_days, boil_time variations");
console.log("✅ Lager vs Ale: fermentation_temp_c + lagering_days");

// Expected impact
const EXPECTED_IMPACT = {
    feature_count: `${existingFeatures.length} → ${existingFeatures.length + 15} (+15 process features)`,
    discrimination: [
        "Belgian family: Dubbel vs Witbier vs Golden Strong",
        "German family: Kölsch vs Altbier vs Lager distinction",
        "American family: Traditional vs Modern IPA variants",
        "Process family: Decoction vs step mash, water chemistry regions"
    ],
    expected_accuracy: "+3-5% top-1 improvement (diagnostic suggests process features critical)",
    model_complexity: "Manageable - 61 → 76 features still within range"
};

console.log("\n📈 EXPECTED IMPACT:");
console.log(`Feature growth: ${EXPECTED_IMPACT.feature_count}`);
console.log(`Expected accuracy: ${EXPECTED_IMPACT.expected_accuracy}`);
console.log("Discrimination improvements:");
EXPECTED_IMPACT.discrimination.forEach((improvement, idx) => {
    console.log(`  ${idx + 1}. ${improvement}`);
});

// Save comprehensive plan
const faz3Plan = {
    timestamp: new Date().toISOString(),
    phase: "FAZ_3_FEATURE_ENGINEERING_PLAN",
    current_dataset: "_ml_dataset_v6_batch_2ab_complete.json",
    current_recipe_count: currentData.records.length,
    current_feature_count: existingFeatures.length,
    phases: FAZ3_PHASES,
    style_defaults_preview: STYLE_DEFAULTS_PREVIEW,
    expected_impact: EXPECTED_IMPACT,
    next_step: "Start with Phase 3A: Process Features Implementation"
};

fs.writeFileSync('_faz3_comprehensive_plan.json', JSON.stringify(faz3Plan, null, 2));

console.log("\n💾 Comprehensive plan saved: _faz3_comprehensive_plan.json");
console.log("\n🚀 READY TO START FAZ 3A: Process Features Implementation");
console.log("⚠️  This will add ~15 new feature columns to all 1100 recipes");
console.log("📊 Expected feature engineering time: 2-3 hours for complete implementation");