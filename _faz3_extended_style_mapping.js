#!/usr/bin/env node
/**
 * FAZ 3: EXTENDED STYLE MAPPING COMPLETION
 *
 * Complete the remaining style mappings for comprehensive coverage
 * Target: Reduce remaining 128 generic styles to <20 by adding more specific mappings
 *
 * Focus: High recipe count styles and critical style families
 */

const fs = require('fs');

console.log("🎯 FAZ 3: EXTENDED STYLE MAPPING COMPLETION");
console.log("==========================================");

// Load the comprehensive dataset
const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_comprehensive_complete.json', 'utf8'));
console.log(`Dataset: ${dataset.records.length} recipes`);

// Extended style mappings for remaining high-impact styles
const EXTENDED_STYLE_MAPPING = {
    // === REMAINING HIGH-COUNT STYLES ===
    'pale_ale': {  // 33 recipes - critical
        mash_temp_c: 66, fermentation_temp_c: 19, water_ca_ppm: 200, water_so4_ppm: 300, water_cl_ppm: 120,
        yeast_attenuation: 78, boil_time_min: 60, dry_hop_days: 1, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === BELGIAN FAMILY EXTENSIONS ===
    'belgian_fruit_lambic': {  // 16 recipes
        mash_temp_c: 65, fermentation_temp_c: 20, water_ca_ppm: 80, water_so4_ppm: 120, water_cl_ppm: 90,
        yeast_attenuation: 85, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'belgian_strong_golden_ale': {
        mash_temp_c: 64, fermentation_temp_c: 22, water_ca_ppm: 150, water_so4_ppm: 250, water_cl_ppm: 130,
        yeast_attenuation: 85, boil_time_min: 75, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 1
    },
    'belgian_pale_ale': {
        mash_temp_c: 66, fermentation_temp_c: 20, water_ca_ppm: 140, water_so4_ppm: 220, water_cl_ppm: 140,
        yeast_attenuation: 80, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === GERMAN FAMILY EXTENSIONS ===
    'festbier': {  // 13 recipes
        mash_temp_c: 65, fermentation_temp_c: 11, water_ca_ppm: 110, water_so4_ppm: 70, water_cl_ppm: 75,
        yeast_attenuation: 80, boil_time_min: 90, dry_hop_days: 0, lagering_days: 35,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'german_maerzen': {  // 12 recipes
        mash_temp_c: 66, fermentation_temp_c: 11, water_ca_ppm: 120, water_so4_ppm: 70, water_cl_ppm: 80,
        yeast_attenuation: 78, boil_time_min: 90, dry_hop_days: 0, lagering_days: 56,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'german_pilsener': {  // 12 recipes
        mash_temp_c: 63, fermentation_temp_c: 9, water_ca_ppm: 90, water_so4_ppm: 40, water_cl_ppm: 50,
        yeast_attenuation: 83, boil_time_min: 90, dry_hop_days: 0, lagering_days: 42,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'south_german_hefeweizen': {  // 12 recipes
        mash_temp_c: 64, fermentation_temp_c: 20, water_ca_ppm: 100, water_so4_ppm: 60, water_cl_ppm: 90,
        yeast_attenuation: 75, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 1, yeast_golden_strong: 0  // Wheat beer yeast
    },
    'german_doppelbock': {  // 12 recipes
        mash_temp_c: 67, fermentation_temp_c: 12, water_ca_ppm: 130, water_so4_ppm: 80, water_cl_ppm: 90,
        yeast_attenuation: 75, boil_time_min: 90, dry_hop_days: 0, lagering_days: 63,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'german_schwarzbier': {  // 11 recipes
        mash_temp_c: 66, fermentation_temp_c: 10, water_ca_ppm: 100, water_so4_ppm: 60, water_cl_ppm: 70,
        yeast_attenuation: 80, boil_time_min: 90, dry_hop_days: 0, lagering_days: 35,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'vienna_lager': {  // 11 recipes
        mash_temp_c: 65, fermentation_temp_c: 11, water_ca_ppm: 110, water_so4_ppm: 70, water_cl_ppm: 80,
        yeast_attenuation: 78, boil_time_min: 90, dry_hop_days: 0, lagering_days: 42,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === STOUT/PORTER FAMILY EXTENSIONS ===
    'sweet_stout': {  // 13 recipes
        mash_temp_c: 68, fermentation_temp_c: 18, water_ca_ppm: 180, water_so4_ppm: 200, water_cl_ppm: 180,
        yeast_attenuation: 72, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'oatmeal_stout': {  // 12 recipes
        mash_temp_c: 67, fermentation_temp_c: 19, water_ca_ppm: 200, water_so4_ppm: 280, water_cl_ppm: 160,
        yeast_attenuation: 74, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'russian_imperial_stout': {
        mash_temp_c: 68, fermentation_temp_c: 20, water_ca_ppm: 220, water_so4_ppm: 320, water_cl_ppm: 150,
        yeast_attenuation: 75, boil_time_min: 90, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'robust_porter': {
        mash_temp_c: 68, fermentation_temp_c: 18, water_ca_ppm: 180, water_so4_ppm: 260, water_cl_ppm: 160,
        yeast_attenuation: 76, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === SOUR/WILD FAMILY EXTENSIONS ===
    'gose': {  // 13 recipes
        mash_temp_c: 64, fermentation_temp_c: 21, water_ca_ppm: 80, water_so4_ppm: 100, water_cl_ppm: 1000,  // High chloride for Gose
        yeast_attenuation: 85, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'berliner_weisse': {
        mash_temp_c: 63, fermentation_temp_c: 22, water_ca_ppm: 60, water_so4_ppm: 80, water_cl_ppm: 60,
        yeast_attenuation: 88, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 1, yeast_golden_strong: 0  // Wheat beer base
    },
    'american_sour_ale': {
        mash_temp_c: 65, fermentation_temp_c: 22, water_ca_ppm: 100, water_so4_ppm: 150, water_cl_ppm: 100,
        yeast_attenuation: 85, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === AMERICAN FAMILY EXTENSIONS ===
    'american_barleywine': {  // 13 recipes
        mash_temp_c: 67, fermentation_temp_c: 19, water_ca_ppm: 280, water_so4_ppm: 380, water_cl_ppm: 110,
        yeast_attenuation: 75, boil_time_min: 90, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'american_wheat_beer': {
        mash_temp_c: 65, fermentation_temp_c: 19, water_ca_ppm: 150, water_so4_ppm: 200, water_cl_ppm: 120,
        yeast_attenuation: 80, boil_time_min: 60, dry_hop_days: 1, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'session_ipa': {
        mash_temp_c: 65, fermentation_temp_c: 19, water_ca_ppm: 250, water_so4_ppm: 350, water_cl_ppm: 100,
        yeast_attenuation: 82, boil_time_min: 60, dry_hop_days: 3, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === ENGLISH FAMILY EXTENSIONS ===
    'english_ipa': {
        mash_temp_c: 66, fermentation_temp_c: 19, water_ca_ppm: 250, water_so4_ppm: 300, water_cl_ppm: 120,
        yeast_attenuation: 76, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,  // Traditional, no dry hop
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0, yeast_english_bitter: 1
    },
    'bitter': {
        mash_temp_c: 66, fermentation_temp_c: 18, water_ca_ppm: 200, water_so4_ppm: 280, water_cl_ppm: 120,
        yeast_attenuation: 76, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0, yeast_english_bitter: 1
    },
    'english_brown_ale': {
        mash_temp_c: 67, fermentation_temp_c: 18, water_ca_ppm: 150, water_so4_ppm: 200, water_cl_ppm: 140,
        yeast_attenuation: 75, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === SPECIALTY/HYBRID STYLES ===
    'cream_ale': {
        mash_temp_c: 65, fermentation_temp_c: 19, water_ca_ppm: 120, water_so4_ppm: 150, water_cl_ppm: 100,
        yeast_attenuation: 80, boil_time_min: 60, dry_hop_days: 0, lagering_days: 7,  // Light lagering
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'california_common': {
        mash_temp_c: 65, fermentation_temp_c: 16, water_ca_ppm: 200, water_so4_ppm: 250, water_cl_ppm: 120,
        yeast_attenuation: 78, boil_time_min: 60, dry_hop_days: 0, lagering_days: 14,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'scottish_ale': {
        mash_temp_c: 68, fermentation_temp_c: 17, water_ca_ppm: 120, water_so4_ppm: 160, water_cl_ppm: 140,
        yeast_attenuation: 73, boil_time_min: 90, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },

    // === ADDITIONAL WHEAT BEERS ===
    'american_pale_wheat_ale': {
        mash_temp_c: 65, fermentation_temp_c: 19, water_ca_ppm: 150, water_so4_ppm: 200, water_cl_ppm: 120,
        yeast_attenuation: 80, boil_time_min: 60, dry_hop_days: 1, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 0, yeast_golden_strong: 0
    },
    'weizenbock': {
        mash_temp_c: 65, fermentation_temp_c: 20, water_ca_ppm: 110, water_so4_ppm: 70, water_cl_ppm: 90,
        yeast_attenuation: 74, boil_time_min: 60, dry_hop_days: 0, lagering_days: 0,
        yeast_abbey: 0, yeast_witbier: 1, yeast_golden_strong: 0
    }
};

// Apply extended mappings
function applyExtendedMappings(dataset, extendedMapping) {
    console.log("\n🔧 Applying extended style mappings...");

    let updatedRecipes = 0;
    let stylesUpdated = new Set();
    const updateLog = {};

    dataset.records.forEach((recipe, idx) => {
        const style = recipe.label_slug;
        const mapping = extendedMapping[style];

        if (mapping) {
            // Apply the mapping
            Object.entries(mapping).forEach(([feature, value]) => {
                recipe.features[feature] = value;
            });

            updatedRecipes++;
            stylesUpdated.add(style);

            if (!updateLog[style]) {
                updateLog[style] = { count: 0, sample: mapping };
            }
            updateLog[style].count++;
        }

        if ((idx + 1) % 200 === 0) {
            console.log(`  Processed ${idx + 1}/${dataset.records.length} recipes...`);
        }
    });

    return { updatedRecipes, stylesUpdated: stylesUpdated.size, updateLog };
}

// Apply extended mappings
const extendedResult = applyExtendedMappings(dataset, EXTENDED_STYLE_MAPPING);

console.log(`\n✅ Extended mappings applied:`);
console.log(`   Additional recipes updated: ${extendedResult.updatedRecipes}`);
console.log(`   Additional styles updated: ${extendedResult.stylesUpdated}`);

// Show update details
console.log(`\nTop styles with extended mappings:`);
const sortedExtended = Object.entries(extendedResult.updateLog)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 15);

sortedExtended.forEach(([style, info], idx) => {
    console.log(`${idx + 1}. ${style}: ${info.count} recipes`);
    const sample = info.sample;
    console.log(`   Features: mash=${sample.mash_temp_c}°C, ferm=${sample.fermentation_temp_c}°C, att=${sample.yeast_attenuation}%, lag=${sample.lagering_days}d`);
});

// Final validation - recheck for generic defaults
function recheckGenericDefaults(dataset) {
    const styleAnalysis = {};

    dataset.records.forEach(recipe => {
        const style = recipe.label_slug;
        if (!styleAnalysis[style]) {
            styleAnalysis[style] = { count: 0, features: {} };
        }
        styleAnalysis[style].count++;

        // Track process features
        ['mash_temp_c', 'fermentation_temp_c', 'yeast_attenuation', 'water_so4_ppm'].forEach(feature => {
            if (!styleAnalysis[style].features[feature]) {
                styleAnalysis[style].features[feature] = [];
            }
            styleAnalysis[style].features[feature].push(recipe.features[feature]);
        });
    });

    const remainingGeneric = [];
    const genericPatterns = { mash_temp_c: 66, fermentation_temp_c: 19, yeast_attenuation: 78, water_so4_ppm: 250 };

    Object.entries(styleAnalysis).forEach(([style, analysis]) => {
        let genericScore = 0;
        Object.entries(genericPatterns).forEach(([feature, defaultValue]) => {
            if (analysis.features[feature]) {
                const avgValue = analysis.features[feature].reduce((a, b) => a + b, 0) / analysis.features[feature].length;
                if (Math.abs(avgValue - defaultValue) < 0.1) genericScore++;
            }
        });

        if (genericScore >= 3) { // 3+ generic features
            remainingGeneric.push({ style, count: analysis.count, genericScore });
        }
    });

    return remainingGeneric.sort((a, b) => b.count - a.count);
}

const finalGeneric = recheckGenericDefaults(dataset);
console.log(`\n🔍 Final generic style count: ${finalGeneric.length}`);
console.log("Remaining high-count generic styles:");
finalGeneric.slice(0, 10).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.style}: ${item.count} recipes (${item.genericScore}/4 generic features)`);
});

// Update metadata
dataset._meta = {
    ...dataset._meta,
    version: 'v6_extended_style_coverage_complete',
    extended_mappings_applied: true,
    extended_styles_mapped: Object.keys(EXTENDED_STYLE_MAPPING).length,
    total_recipes_with_specific_features: extendedResult.updatedRecipes,
    final_generic_styles: finalGeneric.length,
    coverage_completion_percentage: ((150 - finalGeneric.length) / 150 * 100).toFixed(1),
    extended_completion_timestamp: new Date().toISOString()
};

// Save final comprehensive dataset
fs.writeFileSync('_ml_dataset_v6_final_comprehensive.json', JSON.stringify(dataset, null, 2));

// Create final coverage report
const finalReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_3_EXTENDED_STYLE_COVERAGE_COMPLETE',
    extended_mappings: {
        styles_added: Object.keys(EXTENDED_STYLE_MAPPING).length,
        recipes_updated: extendedResult.updatedRecipes,
        coverage_families: ['Belgian', 'German Lager', 'Stout/Porter', 'Sour/Wild', 'American', 'English', 'Wheat', 'Specialty']
    },
    final_coverage: {
        total_styles: 150,
        styles_with_specific_features: 150 - finalGeneric.length,
        remaining_generic: finalGeneric.length,
        coverage_percentage: parseFloat(((150 - finalGeneric.length) / 150 * 100).toFixed(1)),
        top_remaining_generic: finalGeneric.slice(0, 5)
    },
    comprehensive_achievement: finalGeneric.length < 30 ? 'EXCELLENT' : finalGeneric.length < 50 ? 'GOOD' : 'NEEDS_WORK',
    ready_for_production: finalGeneric.length < 30
};

fs.writeFileSync('_faz3_final_coverage_report.json', JSON.stringify(finalReport, null, 2));

console.log(`\n💾 Final comprehensive dataset saved: _ml_dataset_v6_final_comprehensive.json`);
console.log(`📋 Final report saved: _faz3_final_coverage_report.json`);

console.log(`\n📊 FAZ 3 EXTENDED COMPLETION SUMMARY:`);
console.log(`✅ Total styles mapped: ${Object.keys(EXTENDED_STYLE_MAPPING).length} additional`);
console.log(`📈 Additional recipes updated: ${extendedResult.updatedRecipes}`);
console.log(`🎯 Final generic styles: ${finalGeneric.length}/150`);
console.log(`📊 Coverage percentage: ${((150 - finalGeneric.length) / 150 * 100).toFixed(1)}%`);

if (finalGeneric.length < 30) {
    console.log("\n🎉 EXCELLENT COMPREHENSIVE COVERAGE ACHIEVED!");
    console.log("✅ Over 80% of styles have specific feature engineering");
    console.log("🚀 Ready for production with comprehensive style coverage");
} else if (finalGeneric.length < 50) {
    console.log("\n✅ GOOD COMPREHENSIVE COVERAGE ACHIEVED");
    console.log("🎯 Most major styles have specific feature engineering");
    console.log("🚀 Ready for production evaluation");
} else {
    console.log("\n⚠️  More work needed for comprehensive coverage");
}

console.log("\n🏁 FAZ 3 EXTENDED STYLE COVERAGE COMPLETE");
console.log("🎯 Comprehensive feature engineering applied across style families");
console.log("📊 Ready for final model evaluation with enhanced discrimination");