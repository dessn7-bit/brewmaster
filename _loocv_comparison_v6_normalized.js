#!/usr/bin/env node
/**
 * BREWMASTER FAZ 1 - Alias Normalization Impact Assessment
 *
 * V5 baseline vs V6 normalized data performance comparison
 * Quick LOOCV sample to measure alias consolidation benefit
 */

const fs = require('fs');
const vm = require('vm');

console.log("🎯 FAZ 1: ALIAS NORMALIZATION IMPACT ASSESSMENT");
console.log("==============================================");

// Load original and normalized datasets
const originalData = JSON.parse(fs.readFileSync('_ml_dataset_v6_3_complete.json', 'utf8'));
const normalizedData = JSON.parse(fs.readFileSync('_ml_dataset_v6_normalized.json', 'utf8'));

console.log(`📊 Original dataset: ${originalData.records.length} recipes, ${uniqueStyleCount(originalData.records)} styles`);
console.log(`📊 Normalized dataset: ${normalizedData.records.length} recipes, ${uniqueStyleCount(normalizedData.records)} styles`);

function uniqueStyleCount(recipes) {
    const styles = new Set(recipes.map(r => r.label_slug));
    return styles.size;
}

// Sample representative recipes for quick comparison
const SAMPLE_SIZE = 50;  // Enough for trend detection
const sampleStep = Math.floor(originalData.records.length / SAMPLE_SIZE);

console.log(`\n🔬 Testing ${SAMPLE_SIZE} representative samples...`);

// Load inline ML motor from HTML (simplified - we'll use feature extraction)
function extractFeatures(recipe) {
    // Basic feature extraction that mirrors inline motor
    const features = {
        og: recipe.features.og,
        fg: recipe.features.fg,
        abv: recipe.features.abv,
        ibu: recipe.features.ibu,
        srm: recipe.features.srm,
        // Key discriminating features
        yeast_belgian: recipe.features.yeast_belgian || 0,
        yeast_american: recipe.features.yeast_american || 0,
        yeast_german_lager: recipe.features.yeast_german_lager || 0,
        pct_wheat: recipe.features.pct_wheat || 0,
        pct_crystal: recipe.features.pct_crystal || 0,
        pct_roast: recipe.features.pct_roast || 0,
        total_dark: recipe.features.total_dark || 0
    };
    return features;
}

// Simple KNN-based style matching (simplified version of inline motor)
function findClosestStyles(testFeatures, trainingRecipes, k = 5) {
    const distances = [];

    trainingRecipes.forEach(trainRec => {
        if (trainRec.id === testFeatures.id) return; // Skip self in LOOCV

        const trainFeatures = extractFeatures(trainRec);
        let distance = 0;

        // Euclidean distance on normalized features
        const featKeys = Object.keys(testFeatures);
        featKeys.forEach(key => {
            if (key !== 'id' && typeof testFeatures[key] === 'number') {
                const diff = (testFeatures[key] || 0) - (trainFeatures[key] || 0);
                distance += diff * diff;
            }
        });

        distance = Math.sqrt(distance);
        distances.push({ style: trainRec.label_slug, distance });
    });

    // Return k nearest neighbors' styles
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, k).map(d => d.style);
}

// Run comparison test
function runComparisonTest(dataset, name) {
    console.log(`\n📋 Testing ${name}...`);

    let top1_hits = 0;
    let top3_hits = 0;
    let top5_hits = 0;
    let totalTests = 0;

    const confusionPairs = {};

    for (let i = 0; i < dataset.records.length; i += sampleStep) {
        if (totalTests >= SAMPLE_SIZE) break;

        const testRecipe = dataset.records[i];
        const trueStyle = testRecipe.label_slug;
        const testFeatures = { ...extractFeatures(testRecipe), id: testRecipe.id };

        // Get predictions
        const predictions = findClosestStyles(testFeatures, dataset.records, 5);

        // Check accuracy
        const top1_correct = predictions[0] === trueStyle;
        const top3_correct = predictions.slice(0, 3).includes(trueStyle);
        const top5_correct = predictions.slice(0, 5).includes(trueStyle);

        if (top1_correct) top1_hits++;
        if (top3_correct) top3_hits++;
        if (top5_correct) top5_hits++;

        // Track confusion for top-1 misses
        if (!top1_correct && predictions[0]) {
            const confusionKey = `${trueStyle} → ${predictions[0]}`;
            confusionPairs[confusionKey] = (confusionPairs[confusionKey] || 0) + 1;
        }

        totalTests++;
    }

    const results = {
        top1: (top1_hits / totalTests * 100).toFixed(1),
        top3: (top3_hits / totalTests * 100).toFixed(1),
        top5: (top5_hits / totalTests * 100).toFixed(1),
        total_tests: totalTests,
        confusion_pairs: Object.entries(confusionPairs)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
    };

    console.log(`  Top-1: ${results.top1}% (${top1_hits}/${totalTests})`);
    console.log(`  Top-3: ${results.top3}% (${top3_hits}/${totalTests})`);
    console.log(`  Top-5: ${results.top5}% (${top5_hits}/${totalTests})`);

    return results;
}

// Test both versions
const originalResults = runComparisonTest(originalData, "ORIGINAL V5 (179 styles)");
const normalizedResults = runComparisonTest(normalizedData, "NORMALIZED V6 (150 styles)");

// Calculate improvement
console.log("\n📈 IMPROVEMENT ANALYSIS:");
console.log(`Top-1: ${originalResults.top1}% → ${normalizedResults.top1}% (Δ${(parseFloat(normalizedResults.top1) - parseFloat(originalResults.top1)).toFixed(1)}%)`);
console.log(`Top-3: ${originalResults.top3}% → ${normalizedResults.top3}% (Δ${(parseFloat(normalizedResults.top3) - parseFloat(originalResults.top3)).toFixed(1)}%)`);
console.log(`Top-5: ${originalResults.top5}% → ${normalizedResults.top5}% (Δ${(parseFloat(normalizedResults.top5) - parseFloat(originalResults.top5)).toFixed(1)}%)`);

console.log("\n🔍 TOP CONFUSION PAIRS (Original):");
originalResults.confusion_pairs.forEach(([pair, count]) => {
    console.log(`  ${pair} (${count}x)`);
});

console.log("\n🔍 TOP CONFUSION PAIRS (Normalized):");
normalizedResults.confusion_pairs.forEach(([pair, count]) => {
    console.log(`  ${pair} (${count}x)`);
});

// Test the Dark Belgian Dubbel case specifically
console.log("\n🎯 DUBBEL TEST CASE VERIFICATION:");

// Find Belgian Dubbel recipes in normalized data
const dubbelRecipes = normalizedData.records.filter(r => r.label_slug === 'belgian_dubbel');
console.log(`Belgian Dubbel recipes in normalized dataset: ${dubbelRecipes.length}`);

if (dubbelRecipes.length > 0) {
    console.log("Sample Dubbel recipe:", {
        id: dubbelRecipes[0].id,
        name: dubbelRecipes[0].name || dubbelRecipes[0].source,
        og: dubbelRecipes[0].features.og,
        srm: dubbelRecipes[0].features.srm,
        yeast_belgian: dubbelRecipes[0].features.yeast_belgian
    });
}

// Save results
const report = {
    timestamp: new Date().toISOString(),
    phase: "FAZ_1_ALIAS_NORMALIZATION",
    original_results: originalResults,
    normalized_results: normalizedResults,
    improvement: {
        top1_delta: parseFloat(normalizedResults.top1) - parseFloat(originalResults.top1),
        top3_delta: parseFloat(normalizedResults.top3) - parseFloat(originalResults.top3),
        top5_delta: parseFloat(normalizedResults.top5) - parseFloat(originalResults.top5)
    },
    style_reduction: `${uniqueStyleCount(originalData.records)} → ${uniqueStyleCount(normalizedData.records)}`,
    recipes_changed: normalizedData._meta.changes_count || 209
};

fs.writeFileSync('_faz1_baseline_comparison.json', JSON.stringify(report, null, 2));

console.log(`\n✅ FAZ 1 baseline comparison saved: _faz1_baseline_comparison.json`);
console.log(`📊 Style consolidation: ${report.style_reduction}, ${report.recipes_changed} recipes normalized`);

if (report.improvement.top1_delta >= 0) {
    console.log(`🎉 POSITIVE IMPACT: +${report.improvement.top1_delta.toFixed(1)}% top-1 improvement`);
} else {
    console.log(`⚠️ REGRESSION DETECTED: ${report.improvement.top1_delta.toFixed(1)}% top-1 decline`);
}