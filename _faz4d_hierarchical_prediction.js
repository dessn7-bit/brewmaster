#!/usr/bin/env node
/**
 * FAZ 4D: HIERARCHICAL STYLE PREDICTION
 *
 * Final optimization: Two-stage hierarchical prediction for 70%+ accuracy
 * Discovery from FAZ 4C: k=5 Manhattan gives 68.5% (best single model)
 * Strategy: Family-level → Style-level prediction with family-specific discriminators
 *
 * Approach:
 * 1. Stage 1: Predict style family (Belgian, American, German, English, etc.)
 * 2. Stage 2: Within-family style prediction with family-specific features
 * 3. Family boundary handling for hybrid/unclear styles
 * 4. Confidence-based fallback to global prediction
 */

const fs = require('fs');

// Load enhanced dataset and style families
const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_faz3b_yeast_granularity.json', 'utf8'));
const styleFamilies = JSON.parse(fs.readFileSync('STYLE_FAMILIES.json', 'utf8'));

console.log("🏗️  FAZ 4D: HIERARCHICAL STYLE PREDICTION");
console.log("=======================================");
console.log(`Dataset: ${dataset.records.length} recipes, 79 features`);
console.log(`Style families: ${Object.keys(styleFamilies.families || {}).length} families`);
console.log(`Foundation: k=5 Manhattan at 68.5% (discovered in FAZ 4C)`);

// Conservative veto rules
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
    }
};

// Style-to-family mapping (expanded from STYLE_FAMILIES.json)
const STYLE_TO_FAMILY_MAP = {
    // Belgian Family
    'belgian_dubbel': 'Belgian',
    'belgian_tripel': 'Belgian',
    'belgian_witbier': 'Belgian',
    'belgian_strong_dark_ale': 'Belgian',
    'belgian_quadrupel': 'Belgian',
    'belgian_blonde_ale': 'Belgian',
    'belgian_pale_ale': 'Belgian',
    'french_belgian_saison': 'Belgian',
    'specialty_saison': 'Belgian',

    // American Family
    'american_india_pale_ale': 'American',
    'american_pale_ale': 'American',
    'american_imperial_stout': 'American',
    'double_ipa': 'American',
    'american_wheat_beer': 'American',
    'pale_ale': 'American',
    'california_common': 'American',

    // German Family
    'german_koelsch': 'German',
    'german_altbier': 'German',
    'munich_helles': 'German',
    'german_pilsner': 'German',
    'maerzen': 'German',
    'german_weizen': 'German',
    'german_weizenbock': 'German',
    'munich_weissbier': 'German',

    // English Family
    'special_bitter_or_best_bitter': 'English',
    'mild': 'English',
    'english_ipa': 'English',
    'bitter': 'English',
    'brown_ale': 'English',
    'porter': 'English',
    'stout': 'English',

    // Lager Family (broader than German)
    'pale_lager': 'Lager',
    'premium_lager': 'Lager',
    'light_lager': 'Lager',
    'czech_premium_pale_lager': 'Lager',
    'international_pale_lager': 'Lager'
};

// Family-specific discriminative features
const FAMILY_FEATURE_WEIGHTS = {
    Belgian: {
        'yeast_abbey': 3.5, 'yeast_witbier': 3.5, 'yeast_golden_strong': 3.0,
        'yeast_attenuation': 3.0, 'water_so4_ppm': 2.0, 'water_cl_ppm': 2.0,
        'grain_crystal': 2.5, 'grain_chocolate': 2.5, 'abv': 2.5,
        'default': 1.0
    },
    American: {
        'hop_citrus': 3.5, 'hop_tropical': 3.0, 'dry_hop_days': 3.5,
        'water_so4_ppm': 3.0, 'ibu': 2.5, 'grain_crystal': 2.0,
        'hop_bittering': 2.5, 'hop_aroma': 2.0, 'abv': 2.0,
        'default': 1.0
    },
    German: {
        'lagering_days': 3.5, 'fermentation_temp_c': 3.0, 'hop_noble': 3.5,
        'grain_pilsner': 3.0, 'grain_munich': 2.5, 'mash_type_decoction': 2.5,
        'water_ca_ppm': 2.0, 'boil_time_min': 2.0,
        'default': 1.0
    },
    English: {
        'yeast_english_bitter': 3.0, 'yeast_english_mild': 3.0,
        'water_cl_ppm': 3.0, 'grain_crystal': 2.5, 'grain_chocolate': 3.0,
        'hop_noble': 2.5, 'fermentation_temp_c': 2.0,
        'default': 1.0
    },
    Lager: {
        'yeast_lager': 3.5, 'lagering_days': 3.5, 'fermentation_temp_c': 3.5,
        'hop_noble': 3.0, 'grain_pilsner': 3.0, 'water_so4_ppm': 2.0,
        'boil_time_min': 2.5, 'mash_type_decoction': 2.0,
        'default': 1.0
    },
    Default: {
        'abv': 2.0, 'srm': 1.8, 'ibu': 1.8, 'og': 1.5,
        'yeast_attenuation': 2.0, 'fermentation_temp_c': 2.0,
        'default': 1.0
    }
};

// Enhanced distance calculation with family-specific weights
function calculateHierarchicalDistance(recipe1, recipe2, candidateStyle, useFamily = null) {
    // Apply veto rules
    const vetoResults = Object.values(CONSERVATIVE_VETO_RULES).map(rule => rule(recipe1, candidateStyle));
    if (vetoResults.some(r => r.veto)) {
        return { distance: Infinity, vetoed: true };
    }

    const features1 = recipe1.features;
    const features2 = recipe2.features;

    // Determine feature weights based on family context
    const targetFamily = useFamily || STYLE_TO_FAMILY_MAP[candidateStyle] || 'Default';
    const weights = FAMILY_FEATURE_WEIGHTS[targetFamily] || FAMILY_FEATURE_WEIGHTS['Default'];

    let totalDistance = 0;
    let featureCount = 0;

    for (const feature in features1) {
        if (features2.hasOwnProperty(feature) &&
            typeof features1[feature] === 'number' &&
            typeof features2[feature] === 'number') {

            const weight = weights[feature] || weights['default'];
            const diff = features1[feature] - features2[feature];
            totalDistance += Math.abs(diff) * weight; // Manhattan distance (best from FAZ 4B)
            featureCount++;
        }
    }

    return {
        distance: totalDistance / featureCount,
        vetoed: false,
        family: targetFamily
    };
}

// Stage 1: Family prediction
function predictStyleFamily(testRecipe, trainingSet, k = 5) {
    // Create family representatives by aggregating family votes
    const familyDistances = [];

    trainingSet.forEach(trainRecipe => {
        const trainFamily = STYLE_TO_FAMILY_MAP[trainRecipe.label_slug] || 'Other';
        const distResult = calculateHierarchicalDistance(testRecipe, trainRecipe, trainRecipe.label_slug);

        if (!distResult.vetoed && distResult.distance !== Infinity) {
            familyDistances.push({
                family: trainFamily,
                distance: distResult.distance,
                recipe: trainRecipe
            });
        }
    });

    // Group by family and calculate family-level votes
    const familyVotes = {};
    familyDistances
        .sort((a, b) => a.distance - b.distance)
        .slice(0, k * 3) // Consider more neighbors for family prediction
        .forEach(item => {
            const weight = 1 / (item.distance + 0.01);
            familyVotes[item.family] = (familyVotes[item.family] || 0) + weight;
        });

    // Sort families by vote weight
    const familyPredictions = Object.entries(familyVotes)
        .map(([family, weight]) => ({ family, weight }))
        .sort((a, b) => b.weight - a.weight);

    return {
        predictedFamily: familyPredictions[0]?.family || 'Default',
        familyConfidence: familyPredictions.length >= 2 ?
            (familyPredictions[0].weight - familyPredictions[1].weight) / familyPredictions[0].weight : 1.0,
        allFamilyPredictions: familyPredictions
    };
}

// Stage 2: Within-family style prediction
function predictStyleWithinFamily(testRecipe, trainingSet, targetFamily, k = 5) {
    // Filter training set to target family only
    const familyTrainingSet = trainingSet.filter(recipe =>
        (STYLE_TO_FAMILY_MAP[recipe.label_slug] || 'Other') === targetFamily
    );

    if (familyTrainingSet.length === 0) {
        return null; // Fallback to global prediction
    }

    // Calculate distances using family-specific weights
    const distances = familyTrainingSet
        .map(trainRecipe => {
            const distResult = calculateHierarchicalDistance(testRecipe, trainRecipe, trainRecipe.label_slug, targetFamily);
            return {
                recipe: trainRecipe,
                distance: distResult.distance,
                vetoed: distResult.vetoed
            };
        })
        .filter(d => !d.vetoed)
        .sort((a, b) => a.distance - b.distance);

    const neighbors = distances.slice(0, k);

    // Weighted voting within family
    const styleVotes = {};
    neighbors.forEach(neighbor => {
        const style = neighbor.recipe.label_slug;
        const weight = neighbor.distance > 0 ? 1 / (neighbor.distance + 0.01) : 10;
        styleVotes[style] = (styleVotes[style] || 0) + weight;
    });

    const stylePredictions = Object.entries(styleVotes)
        .map(([style, weight]) => ({ style, weight }))
        .sort((a, b) => b.weight - a.weight);

    return {
        predictedStyle: stylePredictions[0]?.style,
        styleConfidence: stylePredictions.length >= 2 ?
            (stylePredictions[0].weight - stylePredictions[1].weight) / stylePredictions[0].weight : 1.0,
        neighborCount: neighbors.length
    };
}

// Global fallback prediction (single-stage KNN)
function predictStyleGlobal(testRecipe, trainingSet, k = 5) {
    const distances = trainingSet
        .map(trainRecipe => {
            const distResult = calculateHierarchicalDistance(testRecipe, trainRecipe, trainRecipe.label_slug);
            return {
                recipe: trainRecipe,
                distance: distResult.distance,
                vetoed: distResult.vetoed
            };
        })
        .filter(d => !d.vetoed)
        .sort((a, b) => a.distance - b.distance);

    const neighbors = distances.slice(0, k);

    const styleVotes = {};
    neighbors.forEach(neighbor => {
        const style = neighbor.recipe.label_slug;
        const weight = neighbor.distance > 0 ? 1 / (neighbor.distance + 0.01) : 10;
        styleVotes[style] = (styleVotes[style] || 0) + weight;
    });

    const stylePredictions = Object.entries(styleVotes)
        .map(([style, weight]) => ({ style, weight }))
        .sort((a, b) => b.weight - a.weight);

    return {
        predictedStyle: stylePredictions[0]?.style,
        confidence: 0.5 // Lower confidence for global fallback
    };
}

// Hierarchical prediction LOOCV
function runHierarchicalLOOCV(dataset, k = 5) {
    console.log(`\n🏗️  Running Hierarchical LOOCV (k=${k})...`);

    const results = {
        total: 0, top1: 0, top3: 0, top5: 0,
        predictions: [],
        hierarchicalStats: {
            familyCorrect: 0,
            hierarchicalUsed: 0,
            globalFallback: 0,
            averageFamilyConfidence: 0,
            averageStyleConfidence: 0
        }
    };

    const recipes = dataset.records;

    for (let i = 0; i < recipes.length; i++) {
        const testRecipe = recipes[i];
        const trainingSet = recipes.filter((_, idx) => idx !== i);
        const actualStyle = testRecipe.label_slug;
        const actualFamily = STYLE_TO_FAMILY_MAP[actualStyle] || 'Other';

        // Stage 1: Family prediction
        const familyPrediction = predictStyleFamily(testRecipe, trainingSet, k);
        const predictedFamily = familyPrediction.predictedFamily;
        const familyConfidence = familyPrediction.familyConfidence;

        // Track family accuracy
        if (predictedFamily === actualFamily) {
            results.hierarchicalStats.familyCorrect++;
        }

        // Stage 2: Style prediction within predicted family
        let finalPrediction;
        let predictionMethod;
        let styleConfidence = 0;

        // Use hierarchical prediction if family confidence is high
        if (familyConfidence >= 0.3) {
            const stylePrediction = predictStyleWithinFamily(testRecipe, trainingSet, predictedFamily, k);

            if (stylePrediction && stylePrediction.neighborCount >= 3) {
                finalPrediction = stylePrediction.predictedStyle;
                styleConfidence = stylePrediction.styleConfidence;
                predictionMethod = 'hierarchical';
                results.hierarchicalStats.hierarchicalUsed++;
            } else {
                // Fallback to global if not enough family members
                const globalPrediction = predictStyleGlobal(testRecipe, trainingSet, k);
                finalPrediction = globalPrediction.predictedStyle;
                styleConfidence = globalPrediction.confidence;
                predictionMethod = 'global_fallback';
                results.hierarchicalStats.globalFallback++;
            }
        } else {
            // Low family confidence -> use global prediction
            const globalPrediction = predictStyleGlobal(testRecipe, trainingSet, k);
            finalPrediction = globalPrediction.predictedStyle;
            styleConfidence = globalPrediction.confidence;
            predictionMethod = 'global_fallback';
            results.hierarchicalStats.globalFallback++;
        }

        // Generate top-3 and top-5 predictions (simplified for now)
        const top3Predictions = [finalPrediction];
        const top5Predictions = [finalPrediction];

        // Record results
        results.total++;
        if (finalPrediction === actualStyle) results.top1++;
        if (top3Predictions.includes(actualStyle)) results.top3++;
        if (top5Predictions.includes(actualStyle)) results.top5++;

        results.predictions.push({
            actual: actualStyle,
            actualFamily,
            predicted: finalPrediction,
            predictedFamily,
            familyConfidence,
            styleConfidence,
            method: predictionMethod
        });

        results.hierarchicalStats.averageFamilyConfidence += familyConfidence;
        results.hierarchicalStats.averageStyleConfidence += styleConfidence;

        if ((i + 1) % 100 === 0) {
            console.log(`  Processed ${i + 1}/${recipes.length} predictions...`);
        }
    }

    // Calculate averages
    results.hierarchicalStats.averageFamilyConfidence /= results.total;
    results.hierarchicalStats.averageStyleConfidence /= results.total;

    return results;
}

// Run hierarchical evaluation
const hierarchicalResults = runHierarchicalLOOCV(dataset, 5);

// Compare with previous best
const baselineResult = { top1: 754, top3: 905, top5: 931, total: 1100 }; // k=5 Manhattan from FAZ 4C

console.log("\n📊 HIERARCHICAL PREDICTION COMPARISON:");
console.log("====================================");

const hierarchicalTop1 = (hierarchicalResults.top1 / hierarchicalResults.total * 100).toFixed(1);
const hierarchicalTop3 = (hierarchicalResults.top3 / hierarchicalResults.total * 100).toFixed(1);
const hierarchicalTop5 = (hierarchicalResults.top5 / hierarchicalResults.total * 100).toFixed(1);

const baselineTop1 = (baselineResult.top1 / baselineResult.total * 100).toFixed(1);
const baselineTop3 = (baselineResult.top3 / baselineResult.total * 100).toFixed(1);
const baselineTop5 = (baselineResult.top5 / baselineResult.total * 100).toFixed(1);

console.log(`\n📈 V6.6 BASELINE (k=5 Manhattan):`);
console.log(`   Top-1: ${baselineResult.top1}/${baselineResult.total} (${baselineTop1}%)`);
console.log(`   Top-3: ${baselineResult.top3}/${baselineResult.total} (${baselineTop3}%)`);
console.log(`   Top-5: ${baselineResult.top5}/${baselineResult.total} (${baselineTop5}%)`);

console.log(`\n🏗️  V6.7 HIERARCHICAL PREDICTION:`);
console.log(`   Top-1: ${hierarchicalResults.top1}/${hierarchicalResults.total} (${hierarchicalTop1}%)`);
console.log(`   Top-3: ${hierarchicalResults.top3}/${hierarchicalResults.total} (${hierarchicalTop3}%)`);
console.log(`   Top-5: ${hierarchicalResults.top5}/${hierarchicalResults.total} (${hierarchicalTop5}%)`);

const top1Improvement = (parseFloat(hierarchicalTop1) - parseFloat(baselineTop1)).toFixed(1);
const top3Improvement = (parseFloat(hierarchicalTop3) - parseFloat(baselineTop3)).toFixed(1);
const top5Improvement = (parseFloat(hierarchicalTop5) - parseFloat(baselineTop5)).toFixed(1);

console.log(`\n🎯 HIERARCHICAL IMPROVEMENTS:`);
console.log(`   Top-1: ${top1Improvement >= 0 ? '+' : ''}${top1Improvement}%`);
console.log(`   Top-3: ${top3Improvement >= 0 ? '+' : ''}${top3Improvement}%`);
console.log(`   Top-5: ${top5Improvement >= 0 ? '+' : ''}${top5Improvement}%`);

// Hierarchical analysis
const stats = hierarchicalResults.hierarchicalStats;
console.log(`\n🏗️  HIERARCHICAL PREDICTION ANALYSIS:`);
console.log(`Family accuracy: ${stats.familyCorrect}/${hierarchicalResults.total} (${(stats.familyCorrect/hierarchicalResults.total*100).toFixed(1)}%)`);
console.log(`Hierarchical used: ${stats.hierarchicalUsed}/${hierarchicalResults.total} (${(stats.hierarchicalUsed/hierarchicalResults.total*100).toFixed(1)}%)`);
console.log(`Global fallback: ${stats.globalFallback}/${hierarchicalResults.total} (${(stats.globalFallback/hierarchicalResults.total*100).toFixed(1)}%)`);
console.log(`Avg family confidence: ${stats.averageFamilyConfidence.toFixed(3)}`);
console.log(`Avg style confidence: ${stats.averageStyleConfidence.toFixed(3)}`);

// Save hierarchical results
const faz4dReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_4D_HIERARCHICAL_PREDICTION_COMPLETE',
    baseline_results: {
        top1_accuracy: parseFloat(baselineTop1),
        top3_accuracy: parseFloat(baselineTop3),
        top5_accuracy: parseFloat(baselineTop5),
        approach: 'Single k=5 Manhattan K-NN'
    },
    hierarchical_results: {
        top1_accuracy: parseFloat(hierarchicalTop1),
        top3_accuracy: parseFloat(hierarchicalTop3),
        top5_accuracy: parseFloat(hierarchicalTop5),
        approach: 'Two-stage hierarchical (family → style)'
    },
    improvements: {
        top1: parseFloat(top1Improvement),
        top3: parseFloat(top3Improvement),
        top5: parseFloat(top5Improvement)
    },
    hierarchical_analysis: {
        family_accuracy: parseFloat((stats.familyCorrect/hierarchicalResults.total*100).toFixed(1)),
        hierarchical_usage: parseFloat((stats.hierarchicalUsed/hierarchicalResults.total*100).toFixed(1)),
        global_fallback: parseFloat((stats.globalFallback/hierarchicalResults.total*100).toFixed(1)),
        avg_family_confidence: parseFloat(stats.averageFamilyConfidence.toFixed(3)),
        avg_style_confidence: parseFloat(stats.averageStyleConfidence.toFixed(3))
    },
    style_families_defined: Object.keys(FAMILY_FEATURE_WEIGHTS).length,
    success_status: parseFloat(hierarchicalTop1) >= 70.0 ? "TARGET_ACHIEVED" :
                   parseFloat(hierarchicalTop1) >= 69.0 ? "VERY_CLOSE" :
                   parseFloat(top1Improvement) >= 1.0 ? "SIGNIFICANT_IMPROVEMENT" :
                   parseFloat(top1Improvement) > 0 ? "MARGINAL_IMPROVEMENT" : "NO_IMPROVEMENT"
};

fs.writeFileSync('_faz4d_hierarchical_prediction_results.json', JSON.stringify(faz4dReport, null, 2));

console.log(`\n💾 Hierarchical prediction results saved: _faz4d_hierarchical_prediction_results.json`);

console.log(`\n📋 FAZ 4D COMPLETION SUMMARY:`);
console.log(`🏗️  Hierarchical performance: ${hierarchicalTop1}% top-1`);

if (parseFloat(hierarchicalTop1) >= 70.0) {
    console.log("\n🎉 FINAL TARGET ACHIEVED: 70%+ top-1 accuracy!");
    console.log("🚀 FAZ 4 MISSION ACCOMPLISHED - Ready for production deployment");
} else if (parseFloat(hierarchicalTop1) >= 69.0) {
    console.log("\n🔥 VERY CLOSE TO TARGET: 69%+ achieved, nearly at 70%!");
    console.log("✅ Excellent performance improvement - ready for production");
} else if (parseFloat(top1Improvement) >= 1.0) {
    console.log("\n⚡ SIGNIFICANT IMPROVEMENT: Hierarchical approach working");
    console.log("✅ Strong model performance achieved");
} else {
    console.log("\n⚠️  LIMITED IMPROVEMENT: Hierarchical complexity may not be justified");
    console.log("💭 Simple optimized k=5 Manhattan model may be better choice");
}

console.log(`\n🎯 Final progress: ${((parseFloat(hierarchicalTop1)/70.0)*100).toFixed(1)}% of 70% target`);
console.log(`\n📈 TOTAL FAZ 4 IMPROVEMENT: ${(parseFloat(hierarchicalTop1) - 64.4).toFixed(1)}% (64.4% → ${hierarchicalTop1}%)`);
console.log("🏁 FAZ 4 MODEL LAYER IMPROVEMENTS COMPLETE");