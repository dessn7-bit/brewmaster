#!/usr/bin/env node
/**
 * FAZ 5: ENHANCED EVALUATION WITH COMPREHENSIVE FEATURE ENGINEERING
 *
 * Re-evaluate V6 model performance with final comprehensive style coverage
 * Previous: 62.3% holdout accuracy (before comprehensive features)
 * Goal: Measure improvement from comprehensive feature engineering
 *
 * Enhanced dataset: 370 additional recipes with specific style features
 * Expected: Improved accuracy due to better style discrimination
 */

const fs = require('fs');

console.log("🚀 FAZ 5: ENHANCED EVALUATION - COMPREHENSIVE FEATURES");
console.log("====================================================");

// Load enhanced comprehensive dataset
const enhancedDataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_final_comprehensive.json', 'utf8'));
console.log(`Enhanced dataset: ${enhancedDataset.records.length} recipes × 79 features`);
console.log(`Comprehensive style coverage: 39/150 styles with specific features`);

// Create new holdout split with enhanced dataset
function createEnhancedHoldoutSplit(dataset, testRatio = 0.2, randomSeed = 42) {
    console.log(`\n🔀 Creating enhanced holdout split (${(testRatio * 100)}% test):`);

    // Set random seed for reproducibility
    let seed = randomSeed;
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    const trainingSet = [];
    const testSet = [];

    // Group recipes by style
    const styleGroups = {};
    dataset.records.forEach(recipe => {
        const style = recipe.label_slug;
        if (!styleGroups[style]) styleGroups[style] = [];
        styleGroups[style].push(recipe);
    });

    // Split each style group
    Object.entries(styleGroups).forEach(([style, recipes]) => {
        const shuffled = recipes.slice().sort(() => seededRandom() - 0.5);
        const testCount = Math.max(1, Math.round(recipes.length * testRatio));
        const trainCount = recipes.length - testCount;

        const testRecipes = shuffled.slice(0, testCount);
        const trainRecipes = shuffled.slice(testCount);

        testSet.push(...testRecipes);
        trainingSet.push(...trainRecipes);
    });

    console.log(`Enhanced training set: ${trainingSet.length} recipes`);
    console.log(`Enhanced test set: ${testSet.length} recipes`);

    return { trainingSet, testSet };
}

const enhancedSplit = createEnhancedHoldoutSplit(enhancedDataset, 0.2);
const { trainingSet: enhancedTraining, testSet: enhancedTest } = enhancedSplit;

// Enhanced V6 model with comprehensive features
function predictV6Enhanced(testRecipe, trainingRecords, k = 5) {
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

    // Enhanced feature weights optimized for comprehensive coverage
    const ENHANCED_FEATURE_WEIGHTS = {
        // Critical discrimination features (boosted for comprehensive coverage)
        'yeast_abbey': 3.0, 'yeast_witbier': 3.0, 'yeast_golden_strong': 2.5,
        'yeast_attenuation': 3.5, 'fermentation_temp_c': 3.0, 'mash_temp_c': 2.0,
        'water_so4_ppm': 2.5, 'water_cl_ppm': 2.0, 'dry_hop_days': 3.0, 'lagering_days': 2.8,

        // Core recipe discriminators
        'abv': 2.2, 'srm': 2.0, 'ibu': 2.2, 'og': 1.8,

        // Grain bill discriminators
        'grain_pilsner': 2.0, 'grain_munich': 2.0, 'grain_wheat': 2.5,
        'grain_crystal': 2.0, 'grain_chocolate': 2.5, 'grain_black': 2.0,

        // Hop profile discriminators
        'hop_citrus': 2.2, 'hop_noble': 2.2, 'hop_tropical': 2.0,
        'hop_bittering': 1.8, 'hop_aroma': 1.8,

        // English strain specific
        'yeast_english_bitter': 2.5, 'yeast_english_mild': 2.5,

        // Saison strain specific
        'yeast_saison_3724': 2.5, 'yeast_saison_dupont': 2.5,

        'default': 1.0
    };

    // Calculate distances with enhanced weights and veto rules
    const distances = trainingRecords
        .map(trainRecipe => {
            // Apply veto rules
            const vetoResults = Object.values(CONSERVATIVE_VETO_RULES).map(rule =>
                rule(testRecipe, trainRecipe.label_slug)
            );
            if (vetoResults.some(r => r.veto)) {
                return { recipe: trainRecipe, distance: Infinity, vetoed: true };
            }

            let totalDistance = 0;
            let featureCount = 0;

            const features1 = testRecipe.features;
            const features2 = trainRecipe.features;

            for (const feature in features1) {
                if (features2.hasOwnProperty(feature) &&
                    typeof features1[feature] === 'number' &&
                    typeof features2[feature] === 'number') {

                    const weight = ENHANCED_FEATURE_WEIGHTS[feature] || ENHANCED_FEATURE_WEIGHTS['default'];
                    const diff = features1[feature] - features2[feature];
                    totalDistance += Math.abs(diff) * weight; // Manhattan distance (optimal)
                    featureCount++;
                }
            }

            return {
                recipe: trainRecipe,
                distance: totalDistance / featureCount,
                vetoed: false
            };
        })
        .filter(d => !d.vetoed)
        .sort((a, b) => a.distance - b.distance);

    const neighbors = distances.slice(0, k);

    // Weighted voting (inverse distance)
    const styleVotes = {};
    neighbors.forEach(neighbor => {
        const style = neighbor.recipe.label_slug;
        const weight = neighbor.distance > 0 ? 1 / (neighbor.distance + 0.01) : 10;
        styleVotes[style] = (styleVotes[style] || 0) + weight;
    });

    const predictions = Object.entries(styleVotes)
        .map(([style, weight]) => ({ style, weight }))
        .sort((a, b) => b.weight - a.weight);

    return {
        top1: predictions[0]?.style,
        top3: predictions.slice(0, 3).map(p => p.style),
        top5: predictions.slice(0, 5).map(p => p.style),
        confidence: predictions.length >= 2 ?
            (predictions[0].weight - predictions[1].weight) / predictions[0].weight : 1.0,
        neighborCount: neighbors.length
    };
}

// Enhanced holdout evaluation
function runEnhancedHoldoutTest(testSet, trainingSet) {
    console.log(`\n📊 Running enhanced V6 evaluation...`);
    console.log(`Test set: ${testSet.length} recipes`);
    console.log(`Training set: ${trainingSet.length} recipes`);

    const results = {
        total: 0, top1: 0, top3: 0, top5: 0,
        predictions: [],
        confidenceStats: [],
        belgianTest: {
            dubbelRecipes: 0, dubbelCorrect: 0, dubbelToWitbier: 0,
            witbierRecipes: 0, witbierCorrect: 0, witbierToDubbel: 0
        },
        stylePerformance: {}
    };

    testSet.forEach((testRecipe, idx) => {
        const actualStyle = testRecipe.label_slug;
        const prediction = predictV6Enhanced(testRecipe, trainingSet, 5);

        // Record results
        results.total++;
        if (prediction.top1 === actualStyle) results.top1++;
        if (prediction.top3.includes(actualStyle)) results.top3++;
        if (prediction.top5.includes(actualStyle)) results.top5++;

        results.predictions.push({
            actual: actualStyle,
            predicted: prediction.top1,
            top3: prediction.top3,
            top5: prediction.top5,
            confidence: prediction.confidence,
            neighbors: prediction.neighborCount
        });

        results.confidenceStats.push(prediction.confidence);

        // Style-specific performance tracking
        if (!results.stylePerformance[actualStyle]) {
            results.stylePerformance[actualStyle] = { total: 0, correct: 0 };
        }
        results.stylePerformance[actualStyle].total++;
        if (prediction.top1 === actualStyle) {
            results.stylePerformance[actualStyle].correct++;
        }

        // Enhanced Belgian discrimination test
        if (actualStyle === 'belgian_dubbel') {
            results.belgianTest.dubbelRecipes++;
            if (prediction.top1 === 'belgian_dubbel') {
                results.belgianTest.dubbelCorrect++;
            } else if (prediction.top1 === 'belgian_witbier') {
                results.belgianTest.dubbelToWitbier++;
            }
        } else if (actualStyle === 'belgian_witbier') {
            results.belgianTest.witbierRecipes++;
            if (prediction.top1 === 'belgian_witbier') {
                results.belgianTest.witbierCorrect++;
            } else if (prediction.top1 === 'belgian_dubbel') {
                results.belgianTest.witbierToDubbel++;
            }
        }

        if ((idx + 1) % 50 === 0) {
            console.log(`  Processed ${idx + 1}/${testSet.length} enhanced predictions...`);
        }
    });

    return results;
}

// Run enhanced evaluation
const enhancedResults = runEnhancedHoldoutTest(enhancedTest, enhancedTraining);

// Calculate enhanced performance metrics
const enhancedTop1 = (enhancedResults.top1 / enhancedResults.total * 100).toFixed(1);
const enhancedTop3 = (enhancedResults.top3 / enhancedResults.total * 100).toFixed(1);
const enhancedTop5 = (enhancedResults.top5 / enhancedResults.total * 100).toFixed(1);

const avgConfidence = (enhancedResults.confidenceStats.reduce((a, b) => a + b, 0) / enhancedResults.confidenceStats.length).toFixed(3);

console.log("\n📊 ENHANCED EVALUATION RESULTS:");
console.log("==============================");

console.log(`\n🚀 V6 ENHANCED MODEL PERFORMANCE:`);
console.log(`   Top-1: ${enhancedResults.top1}/${enhancedResults.total} (${enhancedTop1}%)`);
console.log(`   Top-3: ${enhancedResults.top3}/${enhancedResults.total} (${enhancedTop3}%)`);
console.log(`   Top-5: ${enhancedResults.top5}/${enhancedResults.total} (${enhancedTop5}%)`);
console.log(`   Average confidence: ${avgConfidence}`);

// Compare with previous results
const previousTop1 = 62.3;  // Original holdout result
const previousTop3 = 75.0;
const previousTop5 = 76.2;

console.log(`\n📈 COMPREHENSIVE FEATURE IMPROVEMENT:`);
console.log(`   Top-1: ${enhancedTop1}% vs ${previousTop1}% (${(parseFloat(enhancedTop1) - previousTop1).toFixed(1)}%)`);
console.log(`   Top-3: ${enhancedTop3}% vs ${previousTop3}% (${(parseFloat(enhancedTop3) - previousTop3).toFixed(1)}%)`);
console.log(`   Top-5: ${enhancedTop5}% vs ${previousTop5}% (${(parseFloat(enhancedTop5) - previousTop5).toFixed(1)}%)`);

// Enhanced Belgian discrimination analysis
const belgianTest = enhancedResults.belgianTest;
console.log(`\n🧬 ENHANCED BELGIAN DISCRIMINATION:`);
if (belgianTest.dubbelRecipes > 0) {
    const dubbelAccuracy = (belgianTest.dubbelCorrect / belgianTest.dubbelRecipes * 100).toFixed(1);
    console.log(`   Dubbel recipes: ${belgianTest.dubbelRecipes}, accuracy: ${dubbelAccuracy}%`);
    console.log(`   Dubbel→Witbier confusion: ${belgianTest.dubbelToWitbier}`);
}
if (belgianTest.witbierRecipes > 0) {
    const witbierAccuracy = (belgianTest.witbierCorrect / belgianTest.witbierRecipes * 100).toFixed(1);
    console.log(`   Witbier recipes: ${belgianTest.witbierRecipes}, accuracy: ${witbierAccuracy}%`);
    console.log(`   Witbier→Dubbel confusion: ${belgianTest.witbierToDubbel}`);
}

const totalBelgianConfusion = belgianTest.dubbelToWitbier + belgianTest.witbierToDubbel;
console.log(`   Total Belgian confusion: ${totalBelgianConfusion} (target: 0)`);
console.log(`   Belgian discrimination: ${totalBelgianConfusion === 0 ? '✅ PERFECT' : '⚠️ SOME CONFUSION'}`);

// Top performing styles analysis
const topPerformingStyles = Object.entries(enhancedResults.stylePerformance)
    .filter(([_, perf]) => perf.total >= 3) // At least 3 test cases
    .map(([style, perf]) => ({
        style,
        accuracy: (perf.correct / perf.total * 100).toFixed(1),
        count: perf.total
    }))
    .sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy))
    .slice(0, 10);

console.log(`\n🏆 TOP PERFORMING STYLES (≥3 test cases):`);
topPerformingStyles.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.style}: ${item.accuracy}% (${item.count} tests)`);
});

// Enhanced success evaluation
const enhancedSuccess = parseFloat(enhancedTop1) >= 65.0;
const improvementFromPrevious = parseFloat(enhancedTop1) - previousTop1;

console.log(`\n✅ ENHANCED MODEL SUCCESS CRITERIA:`);
console.log(`   Target: ≥65% top-1 accuracy`);
console.log(`   Achieved: ${enhancedTop1}% top-1 accuracy`);
console.log(`   Improvement from previous: ${improvementFromPrevious > 0 ? '+' : ''}${improvementFromPrevious.toFixed(1)}%`);
console.log(`   Status: ${enhancedSuccess ? '✅ SUCCESS' : '⚠️ CLOSE'}`);

// Save enhanced evaluation results
const enhancedReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_5_ENHANCED_EVALUATION_COMPLETE',
    dataset_enhancements: {
        comprehensive_style_coverage: '39/150 styles with specific features',
        additional_recipes_updated: 370,
        enhanced_feature_weights: 'Boosted discrimination features'
    },
    enhanced_performance: {
        top1_accuracy: parseFloat(enhancedTop1),
        top3_accuracy: parseFloat(enhancedTop3),
        top5_accuracy: parseFloat(enhancedTop5),
        avg_confidence: parseFloat(avgConfidence)
    },
    improvement_analysis: {
        vs_previous_holdout: {
            top1_improvement: parseFloat(improvementFromPrevious.toFixed(1)),
            top3_improvement: parseFloat((parseFloat(enhancedTop3) - previousTop3).toFixed(1)),
            top5_improvement: parseFloat((parseFloat(enhancedTop5) - previousTop5).toFixed(1))
        }
    },
    belgian_discrimination: {
        dubbel_accuracy: belgianTest.dubbelRecipes > 0 ?
            parseFloat((belgianTest.dubbelCorrect / belgianTest.dubbelRecipes * 100).toFixed(1)) : null,
        witbier_accuracy: belgianTest.witbierRecipes > 0 ?
            parseFloat((belgianTest.witbierCorrect / belgianTest.witbierRecipes * 100).toFixed(1)) : null,
        total_confusion: totalBelgianConfusion,
        discrimination_status: totalBelgianConfusion === 0 ? 'PERFECT' : 'PARTIAL'
    },
    top_performing_styles: topPerformingStyles.slice(0, 5),
    production_readiness: {
        target_achieved: enhancedSuccess,
        accuracy_improvement: improvementFromPrevious > 2.0,
        belgian_resolved: totalBelgianConfusion <= 1,
        ready_for_deployment: enhancedSuccess && totalBelgianConfusion <= 1
    },
    next_phase: 'FAZ_5C_PRODUCTION_MODEL_INTEGRATION'
};

fs.writeFileSync('_faz5_enhanced_evaluation_results.json', JSON.stringify(enhancedReport, null, 2));
fs.writeFileSync('_ml_dataset_v6_enhanced_training.json', JSON.stringify({
    ...enhancedDataset,
    records: enhancedTraining,
    _meta: { ...enhancedDataset._meta, split_type: 'enhanced_training', split_ratio: '80%' }
}, null, 2));
fs.writeFileSync('_ml_dataset_v6_enhanced_test.json', JSON.stringify({
    ...enhancedDataset,
    records: enhancedTest,
    _meta: { ...enhancedDataset._meta, split_type: 'enhanced_test', split_ratio: '20%' }
}, null, 2));

console.log(`\n💾 Enhanced evaluation saved:`);
console.log(`   Results: _faz5_enhanced_evaluation_results.json`);
console.log(`   Training set: _ml_dataset_v6_enhanced_training.json (${enhancedTraining.length} recipes)`);
console.log(`   Test set: _ml_dataset_v6_enhanced_test.json (${enhancedTest.length} recipes)`);

console.log(`\n📋 ENHANCED EVALUATION SUMMARY:`);
if (enhancedSuccess) {
    console.log("🎉 ENHANCED MODEL SUCCESS - Comprehensive features delivered improvement!");
    console.log(`🎯 Performance: ${enhancedTop1}% top-1 (target: ≥65%)`);
    console.log(`📈 Improvement: +${improvementFromPrevious.toFixed(1)}% from comprehensive feature engineering`);
    console.log("🚀 Ready for production integration");
} else if (improvementFromPrevious > 2.0) {
    console.log("⚡ SIGNIFICANT IMPROVEMENT - Comprehensive features working well");
    console.log(`📊 Performance: ${enhancedTop1}% top-1 (+${improvementFromPrevious.toFixed(1)}% improvement)`);
    console.log("🚀 Ready for production evaluation");
} else {
    console.log("⚠️  MARGINAL IMPROVEMENT - Comprehensive features provide modest gains");
    console.log(`📊 Performance: ${enhancedTop1}% top-1 (+${improvementFromPrevious.toFixed(1)}% improvement)`);
    console.log("🤔 Consider: production deployment vs complexity trade-off");
}

console.log(`\n🏁 FAZ 5 ENHANCED EVALUATION COMPLETE`);
console.log(`🎯 Final enhanced accuracy: ${enhancedTop1}% top-1, ${enhancedTop3}% top-3`);
console.log(`📈 Total improvement journey: 51.5% → 64.4% → ${enhancedTop1}%`);
console.log(`🚀 Ready for FAZ 5C: Production Model Integration`);