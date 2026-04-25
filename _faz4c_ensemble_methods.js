#!/usr/bin/env node
/**
 * FAZ 4C: ENSEMBLE METHODS INTEGRATION
 *
 * Goal: Push 67.4% → 70%+ via ensemble combination
 * Foundation: Optimized hyperparameters (Manhattan distance, k=10)
 *
 * Ensemble strategies:
 * 1. Multi-k ensemble: Combine k=5,7,10,12,15 with weights
 * 2. Multi-metric ensemble: Manhattan + Euclidean + weighted Euclidean
 * 3. Feature subset specialization: Grain-focused + Hop-focused + Process-focused models
 * 4. Confidence-weighted voting: High-confidence predictions get more weight
 * 5. Style family specialist models: Belgian specialist + American specialist + German specialist
 */

const fs = require('fs');

// Load enhanced dataset
const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_faz3b_yeast_granularity.json', 'utf8'));

console.log("🎭 FAZ 4C: ENSEMBLE METHODS INTEGRATION");
console.log("=====================================");
console.log(`Dataset: ${dataset.records.length} recipes, 79 features`);
console.log(`Foundation: 67.4% top-1 (Manhattan distance, k=10)`);

// Conservative veto rules (from FAZ 4A)
const CONSERVATIVE_VETO_RULES = {
    extreme_abv_veto: (recipe, candidateStyle) => {
        const abv = recipe.features.abv || 0;
        return (abv > 20 || abv < 0 || isNaN(abv)) ? { veto: true } : { veto: false };
    },
    yeast_style_contradiction: (recipe, candidateStyle) => {
        const yeastLager = recipe.features.yeast_lager || 0;
        const yeastAbbey = recipe.features.yeast_abbey || 0;
        const yeastWitbier = recipe.features.yeast_witbier || 0;
        const lagering = recipe.features.lagering_days || 0;

        const isLager = candidateStyle.includes('pilsner') || candidateStyle.includes('helles') || candidateStyle.includes('maerzen');
        const isBelgian = candidateStyle.includes('dubbel') || candidateStyle.includes('tripel') || candidateStyle.includes('witbier');

        if (isLager && (yeastAbbey || yeastWitbier) && lagering === 0) return { veto: true };
        if (isBelgian && yeastLager && lagering > 30) return { veto: true };
        return { veto: false };
    },
    extreme_temperature_veto: (recipe, candidateStyle) => {
        const fermTemp = recipe.features.fermentation_temp_c || 20;
        return (fermTemp < 1 || fermTemp > 40) ? { veto: true } : { veto: false };
    }
};

// Feature subset definitions for specialist models
const FEATURE_SUBSETS = {
    grain_focused: [
        'grain_pilsner', 'grain_munich', 'grain_wheat', 'grain_crystal', 'grain_chocolate',
        'grain_black', 'grain_roasted_barley', 'grain_cara_pils', 'grain_victory',
        'grain_biscuit', 'grain_aromatic', 'abv', 'srm', 'og', 'mash_temp_c'
    ],
    hop_focused: [
        'hop_bittering', 'hop_aroma', 'hop_flavor', 'hop_noble', 'hop_citrus',
        'hop_tropical', 'hop_pine', 'hop_floral', 'ibu', 'dry_hop_days',
        'water_so4_ppm', 'water_cl_ppm'
    ],
    process_focused: [
        'yeast_abbey', 'yeast_witbier', 'yeast_golden_strong', 'yeast_attenuation',
        'fermentation_temp_c', 'mash_temp_c', 'water_ca_ppm', 'water_so4_ppm',
        'water_cl_ppm', 'boil_time_min', 'dry_hop_days', 'lagering_days',
        'mash_type_step', 'mash_type_decoction'
    ]
};

// Distance calculation with veto rules and feature subsets
function calculateEnsembleDistance(recipe1, recipe2, candidateStyle, params) {
    // Apply veto rules
    const vetoResults = Object.values(CONSERVATIVE_VETO_RULES).map(rule => rule(recipe1, candidateStyle));
    if (vetoResults.some(r => r.veto)) {
        return { distance: Infinity, vetoed: true };
    }

    const features1 = recipe1.features;
    const features2 = recipe2.features;
    const featureSubset = params.featureSubset || null;
    const distanceMetric = params.distanceMetric || 'manhattan';

    // Enhanced feature weights
    const FEATURE_WEIGHTS = {
        'yeast_abbey': 2.5, 'yeast_witbier': 2.5, 'yeast_attenuation': 3.0,
        'fermentation_temp_c': 2.5, 'water_so4_ppm': 2.0, 'dry_hop_days': 2.5,
        'abv': 2.0, 'srm': 1.8, 'ibu': 2.0, 'grain_wheat': 2.0,
        'hop_citrus': 1.8, 'hop_noble': 1.8, 'lagering_days': 2.2,
        'default': 1.0
    };

    let totalDistance = 0;
    let featureCount = 0;

    // Filter features by subset if specified
    const featuresToUse = featureSubset ?
        Object.keys(features1).filter(f => featureSubset.includes(f) || f.startsWith(featureSubset[0].split('_')[0])) :
        Object.keys(features1);

    for (const feature of featuresToUse) {
        if (features2.hasOwnProperty(feature) &&
            typeof features1[feature] === 'number' &&
            typeof features2[feature] === 'number') {

            const weight = FEATURE_WEIGHTS[feature] || FEATURE_WEIGHTS['default'];
            const diff = features1[feature] - features2[feature];

            if (distanceMetric === 'manhattan') {
                totalDistance += Math.abs(diff) * weight;
            } else if (distanceMetric === 'euclidean') {
                totalDistance += (diff * diff) * weight;
            }

            featureCount++;
        }
    }

    const distance = distanceMetric === 'euclidean' ?
        Math.sqrt(totalDistance / featureCount) :
        totalDistance / featureCount;

    return { distance, vetoed: false };
}

// Single model prediction
function runSingleModel(dataset, params, description) {
    const results = { total: 0, top1: 0, top3: 0, predictions: [], modelConfidences: [] };
    const recipes = dataset.records;
    const k = params.k || 10;

    for (let i = 0; i < recipes.length; i++) {
        const testRecipe = recipes[i];
        const trainingSet = recipes.filter((_, idx) => idx !== i);

        const distances = trainingSet
            .map(trainRecipe => {
                const distResult = calculateEnsembleDistance(testRecipe, trainRecipe, trainRecipe.label_slug, params);
                return { recipe: trainRecipe, distance: distResult.distance, vetoed: distResult.vetoed };
            })
            .filter(d => !d.vetoed)
            .sort((a, b) => a.distance - b.distance);

        const neighbors = distances.slice(0, k);

        // Weighted voting
        const styleVotes = {};
        neighbors.forEach(neighbor => {
            const style = neighbor.recipe.label_slug;
            const weight = neighbor.distance > 0 ? 1 / (neighbor.distance + 0.01) : 10;
            styleVotes[style] = (styleVotes[style] || 0) + weight;
        });

        const predictions = Object.entries(styleVotes)
            .map(([style, weight]) => ({ style, weight }))
            .sort((a, b) => b.weight - a.weight);

        const actualStyle = testRecipe.label_slug;
        const top1Prediction = predictions[0]?.style;
        const top3Predictions = predictions.slice(0, 3).map(p => p.style);

        // Calculate confidence based on vote margin
        const confidence = predictions.length >= 2 ?
            (predictions[0].weight - predictions[1].weight) / predictions[0].weight : 1.0;

        results.total++;
        if (top1Prediction === actualStyle) results.top1++;
        if (top3Predictions.includes(actualStyle)) results.top3++;

        results.predictions.push({ actual: actualStyle, predicted: top1Prediction, confidence });
        results.modelConfidences.push(confidence);
    }

    return results;
}

// Ensemble prediction combining multiple models
function runEnsemblePrediction(dataset) {
    console.log("\n🎭 RUNNING ENSEMBLE MODELS:");

    // Define ensemble components
    const ensembleModels = [
        // Multi-k ensemble
        { name: "K5_Manhattan", params: { k: 5, distanceMetric: 'manhattan' }, weight: 0.8 },
        { name: "K7_Manhattan", params: { k: 7, distanceMetric: 'manhattan' }, weight: 1.0 },
        { name: "K10_Manhattan", params: { k: 10, distanceMetric: 'manhattan' }, weight: 1.2 }, // Best from FAZ 4B
        { name: "K12_Manhattan", params: { k: 12, distanceMetric: 'manhattan' }, weight: 1.0 },
        { name: "K15_Manhattan", params: { k: 15, distanceMetric: 'manhattan' }, weight: 0.8 },

        // Multi-metric ensemble
        { name: "K10_Euclidean", params: { k: 10, distanceMetric: 'euclidean' }, weight: 0.6 },

        // Feature subset specialists
        { name: "Grain_Specialist", params: { k: 10, distanceMetric: 'manhattan', featureSubset: FEATURE_SUBSETS.grain_focused }, weight: 0.9 },
        { name: "Hop_Specialist", params: { k: 10, distanceMetric: 'manhattan', featureSubset: FEATURE_SUBSETS.hop_focused }, weight: 0.9 },
        { name: "Process_Specialist", params: { k: 10, distanceMetric: 'manhattan', featureSubset: FEATURE_SUBSETS.process_focused }, weight: 1.1 }
    ];

    // Run individual models
    const modelResults = [];
    for (const model of ensembleModels) {
        console.log(`  Running ${model.name}...`);
        const result = runSingleModel(dataset, model.params, model.name);
        const accuracy = (result.top1 / result.total * 100).toFixed(1);
        console.log(`    ${model.name}: ${result.top1}/${result.total} (${accuracy}%)`);

        modelResults.push({ ...model, result });
    }

    // Ensemble combination
    console.log("\n🔀 COMBINING ENSEMBLE PREDICTIONS:");

    const ensembleResults = { total: 0, top1: 0, top3: 0, top5: 0, predictions: [] };
    const numRecipes = dataset.records.length;

    for (let i = 0; i < numRecipes; i++) {
        const actualStyle = dataset.records[i].label_slug;

        // Collect predictions from all models for this recipe
        const allStyleVotes = {};

        modelResults.forEach(model => {
            const prediction = model.result.predictions[i];
            if (prediction && prediction.predicted) {
                const confidence = prediction.confidence || 0.5;
                const modelWeight = model.weight * Math.max(confidence, 0.3); // Confidence boost

                allStyleVotes[prediction.predicted] =
                    (allStyleVotes[prediction.predicted] || 0) + modelWeight;
            }
        });

        // Sort ensemble predictions
        const ensemblePredictions = Object.entries(allStyleVotes)
            .map(([style, weight]) => ({ style, weight }))
            .sort((a, b) => b.weight - a.weight);

        const top1Prediction = ensemblePredictions[0]?.style;
        const top3Predictions = ensemblePredictions.slice(0, 3).map(p => p.style);
        const top5Predictions = ensemblePredictions.slice(0, 5).map(p => p.style);

        ensembleResults.total++;
        if (top1Prediction === actualStyle) ensembleResults.top1++;
        if (top3Predictions.includes(actualStyle)) ensembleResults.top3++;
        if (top5Predictions.includes(actualStyle)) ensembleResults.top5++;

        ensembleResults.predictions.push({
            actual: actualStyle,
            predicted: top1Prediction,
            top3: top3Predictions,
            ensembleWeight: ensemblePredictions[0]?.weight || 0
        });
    }

    return { ensembleResults, modelResults };
}

// Run ensemble evaluation
const ensembleEvaluation = runEnsemblePrediction(dataset);
const ensembleResults = ensembleEvaluation.ensembleResults;

// Comparison with previous best (FAZ 4B optimized)
const baselineResult = { top1: 741, top3: 905, top5: 931, total: 1100 }; // FAZ 4B results

console.log("\n📊 ENSEMBLE METHODS COMPARISON:");
console.log("==============================");

const ensembleTop1 = (ensembleResults.top1 / ensembleResults.total * 100).toFixed(1);
const ensembleTop3 = (ensembleResults.top3 / ensembleResults.total * 100).toFixed(1);
const ensembleTop5 = (ensembleResults.top5 / ensembleResults.total * 100).toFixed(1);

const baselineTop1 = (baselineResult.top1 / baselineResult.total * 100).toFixed(1);
const baselineTop3 = (baselineResult.top3 / baselineResult.total * 100).toFixed(1);
const baselineTop5 = (baselineResult.top5 / baselineResult.total * 100).toFixed(1);

console.log(`\n📈 V6.5 BASELINE (optimized hyperparams):`);
console.log(`   Top-1: ${baselineResult.top1}/${baselineResult.total} (${baselineTop1}%)`);
console.log(`   Top-3: ${baselineResult.top3}/${baselineResult.total} (${baselineTop3}%)`);
console.log(`   Top-5: ${baselineResult.top5}/${baselineResult.total} (${baselineTop5}%)`);

console.log(`\n🎭 V6.6 ENSEMBLE METHODS:`);
console.log(`   Top-1: ${ensembleResults.top1}/${ensembleResults.total} (${ensembleTop1}%)`);
console.log(`   Top-3: ${ensembleResults.top3}/${ensembleResults.total} (${ensembleTop3}%)`);
console.log(`   Top-5: ${ensembleResults.top5}/${ensembleResults.total} (${ensembleTop5}%)`);

const top1Improvement = (parseFloat(ensembleTop1) - parseFloat(baselineTop1)).toFixed(1);
const top3Improvement = (parseFloat(ensembleTop3) - parseFloat(baselineTop3)).toFixed(1);
const top5Improvement = (parseFloat(ensembleTop5) - parseFloat(baselineTop5)).toFixed(1);

console.log(`\n🎯 ENSEMBLE IMPROVEMENTS:`);
console.log(`   Top-1: ${top1Improvement >= 0 ? '+' : ''}${top1Improvement}%`);
console.log(`   Top-3: ${top3Improvement >= 0 ? '+' : ''}${top3Improvement}%`);
console.log(`   Top-5: ${top5Improvement >= 0 ? '+' : ''}${top5Improvement}%`);

// Individual model performance analysis
console.log(`\n🔍 INDIVIDUAL MODEL PERFORMANCE:`);
ensembleEvaluation.modelResults.forEach(model => {
    const accuracy = (model.result.top1 / model.result.total * 100).toFixed(1);
    console.log(`   ${model.name}: ${accuracy}% (weight: ${model.weight})`);
});

// Save ensemble results
const faz4cReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_4C_ENSEMBLE_METHODS_COMPLETE',
    baseline_results: {
        top1_accuracy: parseFloat(baselineTop1),
        top3_accuracy: parseFloat(baselineTop3),
        top5_accuracy: parseFloat(baselineTop5),
        approach: 'Single optimized K-NN (Manhattan, k=10)'
    },
    ensemble_results: {
        top1_accuracy: parseFloat(ensembleTop1),
        top3_accuracy: parseFloat(ensembleTop3),
        top5_accuracy: parseFloat(ensembleTop5),
        approach: 'Multi-model ensemble with confidence weighting'
    },
    improvements: {
        top1: parseFloat(top1Improvement),
        top3: parseFloat(top3Improvement),
        top5: parseFloat(top5Improvement)
    },
    ensemble_components: ensembleEvaluation.modelResults.map(m => ({
        name: m.name,
        accuracy: parseFloat((m.result.top1 / m.result.total * 100).toFixed(1)),
        weight: m.weight,
        params: m.params
    })),
    success_status: parseFloat(ensembleTop1) >= 70.0 ? "TARGET_EXCEEDED" :
                   parseFloat(ensembleTop1) >= 68.0 ? "STRONG_PERFORMANCE" :
                   parseFloat(top1Improvement) >= 1.0 ? "SIGNIFICANT_IMPROVEMENT" :
                   parseFloat(top1Improvement) > 0 ? "MARGINAL_IMPROVEMENT" : "NO_IMPROVEMENT",
    next_phase: 'FAZ_4D_HIERARCHICAL_PREDICTION'
};

fs.writeFileSync('_faz4c_ensemble_methods_results.json', JSON.stringify(faz4cReport, null, 2));

console.log(`\n💾 Ensemble methods results saved: _faz4c_ensemble_methods_results.json`);

console.log(`\n📋 FAZ 4C COMPLETION SUMMARY:`);
console.log(`🎭 Ensemble performance: ${ensembleTop1}% top-1`);

if (parseFloat(ensembleTop1) >= 70.0) {
    console.log("\n🎉 STRETCH TARGET ACHIEVED: 70%+ top-1 accuracy!");
    console.log("🚀 FAZ 4 MISSION ACCOMPLISHED - Ready for production deployment");
} else if (parseFloat(ensembleTop1) >= 68.0) {
    console.log("\n✅ STRONG PERFORMANCE: Significant improvement over baseline");
    console.log("🚀 Ready for FAZ 4D: Hierarchical prediction (final optimization)");
} else if (parseFloat(top1Improvement) >= 1.0) {
    console.log("\n⚡ SIGNIFICANT IMPROVEMENT: Ensemble methods working");
    console.log("🚀 Continue to FAZ 4D for final gains");
} else {
    console.log("\n⚠️  MARGINAL/NO IMPROVEMENT: Ensemble complexity may not be justified");
    console.log("💭 Consider: Simpler optimized model vs complex ensemble trade-off");
}

console.log(`\n🎯 Progress toward 70% target: ${((parseFloat(ensembleTop1)/70.0)*100).toFixed(1)}% complete`);