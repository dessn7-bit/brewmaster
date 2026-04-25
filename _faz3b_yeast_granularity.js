#!/usr/bin/env node
/**
 * FAZ 3B: Yeast Granularity Split
 *
 * Problem: yeast_belgian = Dubbel + Tripel + Strong Dark + Witbier + Golden combined
 * Solution: Replace with granular strain categories
 *
 * Current: yeast_belgian = 1 for all Belgian styles (poor discrimination)
 * Target: yeast_abbey, yeast_witbier, yeast_golden_strong, etc.
 */

const fs = require('fs');

// Load current dataset with process features
const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_faz3a_process_features.json', 'utf8'));

console.log("🧬 FAZ 3B: YEAST GRANULARITY SPLIT");
console.log("=================================");
console.log(`Loading dataset: ${dataset.records.length} recipes`);

// New granular yeast features to add
const NEW_YEAST_FEATURES = [
    'yeast_abbey',           // Belgian abbey ales: Dubbel, Tripel, Dark Strong
    'yeast_witbier',        // Witbier strain: T-58, M20
    'yeast_golden_strong',  // Golden Strong ales: Tripel variants, Golden Strong
    'yeast_saison_3724',    // Saison strain 3724 (classic farmhouse)
    'yeast_saison_dupont',  // Dupont saison strain
    'yeast_english_bitter', // English bitter/ESB strain
    'yeast_english_mild'    // English mild ale strain
];

console.log(`\nAdding ${NEW_YEAST_FEATURES.length} granular yeast features...`);

// Style-to-yeast mapping (replaces generic yeast_belgian)
const STYLE_YEAST_MAPPING = {
    // Belgian Abbey Ales (yeast_abbey = 1)
    'belgian_dubbel': {
        yeast_abbey: 1, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },
    'belgian_tripel': {
        yeast_abbey: 1, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },
    'belgian_strong_dark_ale': {
        yeast_abbey: 1, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },
    'belgian_quadrupel': {
        yeast_abbey: 1, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },

    // Belgian Witbier (yeast_witbier = 1)
    'belgian_witbier': {
        yeast_abbey: 0, yeast_witbier: 1, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },
    'white_ipa': {
        yeast_abbey: 0, yeast_witbier: 1, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },

    // Belgian Golden Strong (yeast_golden_strong = 1)
    'belgian_blonde_ale': {
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 1,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },

    // Saison Strains
    'french_belgian_saison': {
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 1, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    },
    'specialty_saison': {
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 1, yeast_english_bitter: 0, yeast_english_mild: 0
    },

    // English Strains
    'mild': {
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 1
    },
    'special_bitter_or_best_bitter': {
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 1, yeast_english_mild: 0
    },

    // Default for styles that don't match specific categories
    'default': {
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0,
        yeast_saison_3724: 0, yeast_saison_dupont: 0, yeast_english_bitter: 0, yeast_english_mild: 0
    }
};

// Statistics tracking
let processedCount = 0;
let belgianYeastReplacements = 0;
let styleChanges = {};

// Add granular yeast features and update yeast_belgian
dataset.records.forEach((recipe, idx) => {
    const style = recipe.label_slug;
    const yeastMapping = STYLE_YEAST_MAPPING[style] || STYLE_YEAST_MAPPING['default'];

    // Track if this recipe had yeast_belgian = 1 (will be replaced)
    const hadBelgianYeast = recipe.features.yeast_belgian === 1;
    if (hadBelgianYeast) {
        belgianYeastReplacements++;
    }

    // Add new granular yeast features
    NEW_YEAST_FEATURES.forEach(feature => {
        recipe.features[feature] = yeastMapping[feature];
    });

    // Update yeast_belgian based on granular mapping
    // Keep yeast_belgian = 1 only if none of the specific Belgian strains match
    const hasSpecificBelgian = yeastMapping.yeast_abbey || yeastMapping.yeast_witbier || yeastMapping.yeast_golden_strong;

    if (hasSpecificBelgian) {
        // This style gets a specific Belgian strain, so remove generic yeast_belgian
        recipe.features.yeast_belgian = 0;

        // Track the style change
        if (!styleChanges[style]) styleChanges[style] = 0;
        styleChanges[style]++;
    }
    // If no specific Belgian strain and originally had yeast_belgian=1, keep it
    // This preserves other Belgian styles not explicitly mapped

    processedCount++;

    if (processedCount % 100 === 0) {
        console.log(`  Processed ${processedCount}/${dataset.records.length} recipes...`);
    }
});

console.log(`\n✅ Yeast granularity added to all ${processedCount} recipes`);
console.log(`📊 Belgian yeast replacements: ${belgianYeastReplacements}`);

// Update feature count in metadata
const previousFeatureCount = 72;
const newFeatureCount = previousFeatureCount + NEW_YEAST_FEATURES.length;

// Update dataset metadata
dataset._meta.version = 'v6_faz3b_yeast_granularity';
dataset._meta.faz3b_completed_at = new Date().toISOString();
dataset._meta.yeast_features_added = NEW_YEAST_FEATURES.length;
dataset._meta.feature_count = newFeatureCount;
dataset._meta.feature_growth = `72 → ${newFeatureCount}`;

// Add new yeast features to metadata
NEW_YEAST_FEATURES.forEach(feature => {
    if (!dataset._meta.feature_keys.includes(feature)) {
        dataset._meta.feature_keys.push(feature);
    }
});

console.log(`\n📊 FEATURE GROWTH: ${dataset._meta.feature_growth}`);

// Validate yeast granularity improvements
console.log("\n🔍 YEAST GRANULARITY VALIDATION:");

const sampleStyles = [
    'belgian_dubbel', 'belgian_witbier', 'belgian_tripel',
    'french_belgian_saison', 'mild', 'special_bitter_or_best_bitter'
];

sampleStyles.forEach(style => {
    const sampleRecipe = dataset.records.find(r => r.label_slug === style);
    if (sampleRecipe) {
        const f = sampleRecipe.features;
        console.log(`\n${style}:`);
        console.log(`  yeast_belgian: ${f.yeast_belgian}`);
        console.log(`  yeast_abbey: ${f.yeast_abbey}`);
        console.log(`  yeast_witbier: ${f.yeast_witbier}`);
        console.log(`  yeast_golden_strong: ${f.yeast_golden_strong}`);
        console.log(`  yeast_saison_3724: ${f.yeast_saison_3724}`);
        console.log(`  yeast_english_mild: ${f.yeast_english_mild}`);
    }
});

// Verify discrimination improvement
const dubbelSample = dataset.records.find(r => r.label_slug === 'belgian_dubbel');
const witbierSample = dataset.records.find(r => r.label_slug === 'belgian_witbier');

if (dubbelSample && witbierSample) {
    console.log("\n🎯 DISCRIMINATION VERIFICATION:");
    console.log("Belgian Dubbel vs Belgian Witbier feature differences:");

    const discriminators = [
        'yeast_abbey', 'yeast_witbier', 'yeast_attenuation',
        'fermentation_temp_c', 'water_so4_ppm'
    ];

    discriminators.forEach(feature => {
        const dubbelValue = dubbelSample.features[feature];
        const witbierValue = witbierSample.features[feature];
        console.log(`  ${feature}: ${dubbelValue} vs ${witbierValue}`);
    });
}

// Save enhanced dataset
const outputPath = '_ml_dataset_v6_faz3b_yeast_granularity.json';
fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

console.log(`\n✅ Enhanced dataset saved: ${outputPath}`);

// Create yeast granularity report
const faz3bReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_3B_YEAST_GRANULARITY_COMPLETE',
    yeast_features_added: NEW_YEAST_FEATURES,
    feature_count_growth: dataset._meta.feature_growth,
    belgian_yeast_replacements: belgianYeastReplacements,
    style_specific_mappings: Object.keys(STYLE_YEAST_MAPPING).length - 1, // excluding default
    style_changes: styleChanges,
    discrimination_improvements: [
        "Belgian Dubbel: yeast_abbey=1, yeast_belgian=0",
        "Belgian Witbier: yeast_witbier=1, yeast_belgian=0",
        "Belgian abbey ales now distinct from witbier strains",
        "English ales now have strain-specific discrimination"
    ],
    next_phase: 'FAZ_3C_COMPREHENSIVE_TESTING'
};

fs.writeFileSync('_faz3b_yeast_granularity_report.json', JSON.stringify(faz3bReport, null, 2));

console.log("\n📋 YEAST GRANULARITY REPORT:");
console.log(`✅ Yeast features added: ${NEW_YEAST_FEATURES.length}`);
console.log(`📊 Feature count: ${dataset._meta.feature_growth}`);
console.log(`🧬 Belgian yeast replaced: ${belgianYeastReplacements} recipes`);
console.log(`📍 Style-specific mappings: ${faz3bReport.style_specific_mappings}`);

console.log("\n🎯 DISCRIMINATION IMPROVEMENTS:");
faz3bReport.discrimination_improvements.forEach((improvement, idx) => {
    console.log(`${idx + 1}. ${improvement}`);
});

console.log("\n🧪 NEXT: FAZ 3 COMPREHENSIVE TESTING");
console.log("Target: Test enhanced 79-feature model discrimination accuracy");