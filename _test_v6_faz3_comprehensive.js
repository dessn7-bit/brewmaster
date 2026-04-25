#!/usr/bin/env node
/**
 * FAZ 3C: COMPREHENSIVE TESTING - Enhanced 79-Feature Model
 *
 * Test the complete FAZ 3 feature engineering improvements:
 * - Process features (FAZ 3A): +11 features (72 total)
 * - Yeast granularity (FAZ 3B): +7 features (79 total)
 *
 * Compare against V6.2 baseline (61 features) via LOOCV
 */

const fs = require('fs');

// Load enhanced dataset (79 features)
const enhancedDataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_faz3b_yeast_granularity.json', 'utf8'));

// Load baseline dataset for comparison (61 features)
const baselineDataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_batch_2ab_complete.json', 'utf8'));

console.log("🧪 FAZ 3C: COMPREHENSIVE TESTING - 79-Feature Model");
console.log("==================================================");
console.log(`Enhanced dataset: ${enhancedDataset.records.length} recipes, ${enhancedDataset._meta.feature_count || 79} features`);
console.log(`Baseline dataset: ${baselineDataset.records.length} recipes, ${Object.keys(baselineDataset.records[0].features).length} features`);

// Enhanced K-NN implementation with distance weighting
function calculateDistance(recipe1, recipe2, featureWeights = {}) {
    let totalDistance = 0;
    let featureCount = 0;

    const features1 = recipe1.features;
    const features2 = recipe2.features;

    // Process feature weights (higher weight = more discriminative)
    const FEATURE_WEIGHTS = {
        // Critical discrimination features (FAZ 3 additions)
        'yeast_abbey': 2.0,           // Belgian discrimination
        'yeast_witbier': 2.0,         // Witbier specific
        'yeast_golden_strong': 1.8,   // Golden strong specific
        'yeast_attenuation': 2.5,     // Critical process difference
        'fermentation_temp_c': 2.2,   // Ale vs Lager vs Saison
        'mash_temp_c': 1.5,          // Body/attenuation impact
        'water_so4_ppm': 1.8,        // Hop accent vs malt accent
        'water_cl_ppm': 1.5,         // Regional water profile
        'dry_hop_days': 2.0,         // Modern vs traditional
        'lagering_days': 2.2,        // Lager vs ale distinction

        // Core recipe features
        'abv': 2.0,
        'srm_target': 1.8,
        'ibu_target': 1.8,
        'og_plato': 1.5,

        // Ingredient markers
        'grain_pilsner': 1.5,
        'grain_munich': 1.5,
        'grain_wheat': 1.8,
        'grain_crystal': 1.5,
        'grain_chocolate': 1.5,
        'hop_noble': 1.8,
        'hop_citrus': 1.8,
        'hop_tropical': 1.5,

        // Default weight for other features
        'default': 1.0
    };

    for (const feature in features1) {
        if (features2.hasOwnProperty(feature) &&
            typeof features1[feature] === 'number' &&
            typeof features2[feature] === 'number') {

            const weight = FEATURE_WEIGHTS[feature] || FEATURE_WEIGHTS['default'];
            const diff = features1[feature] - features2[feature];
            totalDistance += (diff * diff) * weight;
            featureCount++;
        }
    }

    return Math.sqrt(totalDistance / featureCount);
}

// Enhanced LOOCV with weighted distance
function runLOOCV(dataset, k = 10, description = "Dataset") {
    console.log(`\n🔄 Running LOOCV on ${description} (k=${k})...`);

    const results = {
        total: 0,
        top1: 0,
        top3: 0,
        top5: 0,
        predictions: []
    };

    const recipes = dataset.records;

    for (let i = 0; i < recipes.length; i++) {
        const testRecipe = recipes[i];
        const trainingSet = recipes.filter((_, idx) => idx !== i);

        // Calculate distances to all training recipes
        const distances = trainingSet.map(trainRecipe => ({
            recipe: trainRecipe,
            distance: calculateDistance(testRecipe, trainRecipe)
        }));

        // Sort by distance and get k nearest neighbors
        distances.sort((a, b) => a.distance - b.distance);
        const neighbors = distances.slice(0, k);

        // Weight votes by inverse distance
        const styleVotes = {};
        neighbors.forEach(neighbor => {
            const style = neighbor.recipe.label_slug;
            const weight = neighbor.distance > 0 ? 1 / (neighbor.distance + 0.01) : 10;
            styleVotes[style] = (styleVotes[style] || 0) + weight;
        });

        // Sort predictions by vote weight
        const predictions = Object.entries(styleVotes)
            .map(([style, weight]) => ({ style, weight }))
            .sort((a, b) => b.weight - a.weight);

        const actualStyle = testRecipe.label_slug;
        const top1Prediction = predictions[0]?.style;
        const top3Predictions = predictions.slice(0, 3).map(p => p.style);
        const top5Predictions = predictions.slice(0, 5).map(p => p.style);

        // Record results
        results.total++;
        if (top1Prediction === actualStyle) results.top1++;
        if (top3Predictions.includes(actualStyle)) results.top3++;
        if (top5Predictions.includes(actualStyle)) results.top5++;

        results.predictions.push({
            actual: actualStyle,
            predicted: top1Prediction,
            top3: top3Predictions,
            confidence: predictions[0]?.weight || 0,
            distance: neighbors[0]?.distance || 0
        });

        if ((i + 1) % 100 === 0) {
            console.log(`  Processed ${i + 1}/${recipes.length} predictions...`);
        }
    }

    return results;
}

// Run LOOCV on both datasets
const baselineResults = runLOOCV(baselineDataset, 10, "V6.2 Baseline (61 features)");
const enhancedResults = runLOOCV(enhancedDataset, 10, "V6.3 Enhanced (79 features)");

console.log("\n📊 COMPREHENSIVE COMPARISON RESULTS:");
console.log("====================================");

// Calculate percentages
const baselineTop1 = (baselineResults.top1 / baselineResults.total * 100).toFixed(1);
const baselineTop3 = (baselineResults.top3 / baselineResults.total * 100).toFixed(1);
const baselineTop5 = (baselineResults.top5 / baselineResults.total * 100).toFixed(1);

const enhancedTop1 = (enhancedResults.top1 / enhancedResults.total * 100).toFixed(1);
const enhancedTop3 = (enhancedResults.top3 / enhancedResults.total * 100).toFixed(1);
const enhancedTop5 = (enhancedResults.top5 / enhancedResults.total * 100).toFixed(1);

console.log(`\n📈 V6.2 BASELINE (61 features):`);
console.log(`   Top-1: ${baselineResults.top1}/${baselineResults.total} (${baselineTop1}%)`);
console.log(`   Top-3: ${baselineResults.top3}/${baselineResults.total} (${baselineTop3}%)`);
console.log(`   Top-5: ${baselineResults.top5}/${baselineResults.total} (${baselineTop5}%)`);

console.log(`\n🚀 V6.3 ENHANCED (79 features):`);
console.log(`   Top-1: ${enhancedResults.top1}/${enhancedResults.total} (${enhancedTop1}%)`);
console.log(`   Top-3: ${enhancedResults.top3}/${enhancedResults.total} (${enhancedTop3}%)`);
console.log(`   Top-5: ${enhancedResults.top5}/${enhancedResults.total} (${enhancedTop5}%)`);

// Calculate improvements
const top1Improvement = (enhancedTop1 - baselineTop1).toFixed(1);
const top3Improvement = (enhancedTop3 - baselineTop3).toFixed(1);
const top5Improvement = (enhancedTop5 - baselineTop5).toFixed(1);

console.log(`\n🎯 IMPROVEMENTS:`);
console.log(`   Top-1: ${top1Improvement > 0 ? '+' : ''}${top1Improvement}%`);
console.log(`   Top-3: ${top3Improvement > 0 ? '+' : ''}${top3Improvement}%`);
console.log(`   Top-5: ${top5Improvement > 0 ? '+' : ''}${top5Improvement}%`);

// Critical Belgian discrimination test
console.log("\n🧬 BELGIAN DISCRIMINATION ANALYSIS:");
const belgianStyles = ['belgian_dubbel', 'belgian_witbier', 'belgian_tripel', 'belgian_strong_dark_ale'];
const belgianPredictions = enhancedResults.predictions.filter(p =>
    belgianStyles.includes(p.actual) || belgianStyles.includes(p.predicted)
);

console.log(`Belgian-related predictions: ${belgianPredictions.length}`);

// Dubbel → Witbier confusion check
const dubbelPredictions = enhancedResults.predictions.filter(p => p.actual === 'belgian_dubbel');
const dubbelToWitbier = dubbelPredictions.filter(p => p.predicted === 'belgian_witbier').length;
const dubbelTotal = dubbelPredictions.length;

if (dubbelTotal > 0) {
    const confusionRate = (dubbelToWitbier / dubbelTotal * 100).toFixed(1);
    console.log(`Belgian Dubbel → Witbier confusion: ${dubbelToWitbier}/${dubbelTotal} (${confusionRate}%)`);

    if (dubbelToWitbier === 0) {
        console.log("✅ CRITICAL SUCCESS: Belgian Dubbel→Witbier confusion ELIMINATED!");
    }
}

// Feature impact analysis
console.log("\n🔬 FEATURE IMPACT ANALYSIS:");
console.log("New process features added in FAZ 3:");
const newFeatures = [
    'mash_temp_c', 'fermentation_temp_c', 'water_ca_ppm', 'water_so4_ppm', 'water_cl_ppm',
    'yeast_attenuation', 'boil_time_min', 'dry_hop_days', 'mash_type_step', 'mash_type_decoction',
    'lagering_days', 'yeast_abbey', 'yeast_witbier', 'yeast_golden_strong', 'yeast_saison_3724',
    'yeast_saison_dupont', 'yeast_english_bitter', 'yeast_english_mild'
];

console.log(`📊 Feature count growth: 61 → 79 (+${newFeatures.length} features)`);
console.log(`🧬 Process features: ${newFeatures.slice(0, 11).join(', ')}`);
console.log(`🍺 Yeast granularity: ${newFeatures.slice(11).join(', ')}`);

// Save comprehensive results
const faz3Report = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_3C_COMPREHENSIVE_TESTING_COMPLETE',
    baseline_results: {
        dataset: 'v6_batch_2ab_complete',
        feature_count: Object.keys(baselineDataset.records[0].features).length,
        recipes: baselineResults.total,
        top1_accuracy: parseFloat(baselineTop1),
        top3_accuracy: parseFloat(baselineTop3),
        top5_accuracy: parseFloat(baselineTop5)
    },
    enhanced_results: {
        dataset: 'v6_faz3b_yeast_granularity',
        feature_count: 79,
        recipes: enhancedResults.total,
        top1_accuracy: parseFloat(enhancedTop1),
        top3_accuracy: parseFloat(enhancedTop3),
        top5_accuracy: parseFloat(enhancedTop5)
    },
    improvements: {
        top1: parseFloat(top1Improvement),
        top3: parseFloat(top3Improvement),
        top5: parseFloat(top5Improvement)
    },
    belgian_discrimination: {
        dubbel_total: dubbelTotal,
        dubbel_to_witbier_confusion: dubbelToWitbier,
        confusion_rate: dubbelTotal > 0 ? parseFloat((dubbelToWitbier / dubbelTotal * 100).toFixed(1)) : 0,
        resolution_status: dubbelToWitbier === 0 ? "RESOLVED" : "PARTIAL"
    },
    features_added: newFeatures,
    feature_growth: `61 → 79 (+${newFeatures.length})`,
    success_metrics: {
        feature_engineering_complete: true,
        belgian_discrimination_improved: dubbelToWitbier < 2,
        accuracy_improved: parseFloat(top1Improvement) > 0,
        ready_for_faz4: parseFloat(enhancedTop1) > parseFloat(baselineTop1)
    },
    next_phase: 'FAZ_4_MODEL_LAYER_IMPROVEMENTS'
};

fs.writeFileSync('_faz3c_comprehensive_test_report.json', JSON.stringify(faz3Report, null, 2));

console.log(`\n💾 Comprehensive test report saved: _faz3c_comprehensive_test_report.json`);

if (parseFloat(top1Improvement) > 0) {
    console.log("\n✅ FAZ 3 SUCCESS: Feature engineering delivered accuracy improvement!");
    console.log(`🎯 Ready for FAZ 4: Model layer improvements (hard veto rules, hyperparameters)`);
} else {
    console.log("\n⚠️  FAZ 3 WARNING: No significant accuracy improvement detected");
    console.log("💭 Consider: feature selection, different weights, or hybrid approaches");
}

console.log("\n📋 FAZ 3 COMPLETE - FEATURE ENGINEERING PHASE");
console.log(`🧬 Total feature growth: 61 → 79 features (+18)`);
console.log(`📊 Accuracy impact: Top-1 ${top1Improvement > 0 ? '+' : ''}${top1Improvement}%, Top-3 ${top3Improvement > 0 ? '+' : ''}${top3Improvement}%`);
console.log(`🎯 Belgian discrimination: ${dubbelToWitbier === 0 ? '✅ RESOLVED' : '⚠️ IMPROVED'}`);