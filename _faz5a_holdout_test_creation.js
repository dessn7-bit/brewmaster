#!/usr/bin/env node
/**
 * FAZ 5A: HOLDOUT TEST SET CREATION
 *
 * Create independent validation dataset for unbiased V6 model performance assessment
 * Strategy: Stratified random split maintaining style distribution
 * Goal: Validate 68.5% LOOCV accuracy on truly unseen holdout data
 *
 * Split: 80% training (880 recipes) / 20% holdout test (220 recipes)
 * Requirement: Holdout accuracy ≥ 66% (within 2.5% of LOOCV result)
 */

const fs = require('fs');

// Load production-ready dataset
const productionDataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_production_ready.json', 'utf8'));

console.log("📊 FAZ 5A: HOLDOUT TEST SET CREATION");
console.log("==================================");
console.log(`Production dataset: ${productionDataset.records.length} recipes × 79 features`);

// Analyze style distribution for stratification
function analyzeStyleDistribution(dataset) {
    const styleCount = {};
    const styleCounts = [];

    dataset.records.forEach(recipe => {
        const style = recipe.label_slug;
        styleCount[style] = (styleCount[style] || 0) + 1;
    });

    // Sort by count descending
    const sortedStyles = Object.entries(styleCount)
        .map(([style, count]) => ({ style, count }))
        .sort((a, b) => b.count - a.count);

    console.log("\n📊 Style distribution analysis:");
    console.log(`Total unique styles: ${sortedStyles.length}`);

    // Show top styles
    console.log("\nTop 15 styles by recipe count:");
    sortedStyles.slice(0, 15).forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.style}: ${item.count} recipes`);
    });

    // Distribution statistics
    const counts = sortedStyles.map(s => s.count);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const medianCount = counts[Math.floor(counts.length / 2)];

    console.log(`\nDistribution stats:`);
    console.log(`  Average: ${avgCount.toFixed(1)} recipes per style`);
    console.log(`  Median: ${medianCount} recipes per style`);
    console.log(`  Min: ${Math.min(...counts)} recipes`);
    console.log(`  Max: ${Math.max(...counts)} recipes`);

    return { styleCount, sortedStyles, stats: { avg: avgCount, median: medianCount } };
}

const distributionAnalysis = analyzeStyleDistribution(productionDataset);

// Stratified random split
function createStratifiedSplit(dataset, testRatio = 0.2, randomSeed = 42) {
    console.log(`\n🔀 Creating stratified split (${(testRatio * 100)}% test):`);

    // Set random seed for reproducibility
    let seed = randomSeed;
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    const trainingSet = [];
    const testSet = [];
    const splitStats = {};

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
        const testCount = Math.max(1, Math.round(recipes.length * testRatio)); // At least 1 for test
        const trainCount = recipes.length - testCount;

        const testRecipes = shuffled.slice(0, testCount);
        const trainRecipes = shuffled.slice(testCount);

        testSet.push(...testRecipes);
        trainingSet.push(...trainRecipes);

        splitStats[style] = {
            total: recipes.length,
            train: trainCount,
            test: testCount,
            testRatio: testCount / recipes.length
        };
    });

    console.log(`Training set: ${trainingSet.length} recipes`);
    console.log(`Test set: ${testSet.length} recipes`);
    console.log(`Actual split: ${(testSet.length / (trainingSet.length + testSet.length) * 100).toFixed(1)}% test`);

    return { trainingSet, testSet, splitStats };
}

const splitResult = createStratifiedSplit(productionDataset, 0.2);
const { trainingSet, testSet, splitStats } = splitResult;

// Verify stratification quality
console.log(`\n🔍 Stratification quality check:`);
const originalStyles = Object.keys(distributionAnalysis.styleCount);
const testStyles = [...new Set(testSet.map(r => r.label_slug))];
const missingStyles = originalStyles.filter(style => !testStyles.includes(style));

console.log(`Original styles: ${originalStyles.length}`);
console.log(`Test set styles: ${testStyles.length}`);
console.log(`Missing from test: ${missingStyles.length}`);

if (missingStyles.length > 0) {
    console.log("Missing styles:", missingStyles.slice(0, 10).join(', ') + (missingStyles.length > 10 ? '...' : ''));
}

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
    }
};

// Optimal V6 model implementation (k=5 Manhattan K-NN)
function calculateOptimalDistance(recipe1, recipe2, candidateStyle) {
    // Apply conservative veto rules
    const vetoResults = Object.values(CONSERVATIVE_VETO_RULES).map(rule => rule(recipe1, candidateStyle));
    if (vetoResults.some(r => r.veto)) {
        return { distance: Infinity, vetoed: true };
    }

    const features1 = recipe1.features;
    const features2 = recipe2.features;

    // Enhanced feature weights (optimal from FAZ 4)
    const FEATURE_WEIGHTS = {
        'yeast_abbey': 2.5, 'yeast_witbier': 2.5, 'yeast_golden_strong': 2.0,
        'yeast_attenuation': 3.0, 'fermentation_temp_c': 2.5, 'mash_temp_c': 1.5,
        'water_so4_ppm': 2.0, 'water_cl_ppm': 1.5, 'dry_hop_days': 2.5, 'lagering_days': 2.2,
        'abv': 2.0, 'srm': 1.8, 'ibu': 2.0, 'og': 1.5,
        'grain_pilsner': 1.5, 'grain_munich': 1.5, 'grain_wheat': 2.0,
        'hop_citrus': 1.8, 'hop_noble': 1.8,
        'default': 1.0
    };

    let totalDistance = 0;
    let featureCount = 0;

    for (const feature in features1) {
        if (features2.hasOwnProperty(feature) &&
            typeof features1[feature] === 'number' &&
            typeof features2[feature] === 'number') {

            const weight = FEATURE_WEIGHTS[feature] || FEATURE_WEIGHTS['default'];
            const diff = features1[feature] - features2[feature];
            totalDistance += Math.abs(diff) * weight; // Manhattan distance
            featureCount++;
        }
    }

    return {
        distance: totalDistance / featureCount,
        vetoed: false
    };
}

// V6 K-NN prediction (k=5 Manhattan)
function predictV6Style(testRecipe, trainingSet, k = 5) {
    const distances = trainingSet
        .map(trainRecipe => {
            const distResult = calculateOptimalDistance(testRecipe, trainRecipe, trainRecipe.label_slug);
            return {
                recipe: trainRecipe,
                distance: distResult.distance,
                vetoed: distResult.vetoed
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

// Holdout test evaluation
function runHoldoutTest(testSet, trainingSet) {
    console.log(`\n📊 Running V6 holdout test evaluation...`);
    console.log(`Test set: ${testSet.length} recipes`);
    console.log(`Training set: ${trainingSet.length} recipes`);

    const results = {
        total: 0, top1: 0, top3: 0, top5: 0,
        predictions: [],
        confidenceStats: [],
        belgianTest: { dubbelRecipes: 0, dubbelCorrect: 0, dubbelToWitbier: 0 }
    };

    testSet.forEach((testRecipe, idx) => {
        const actualStyle = testRecipe.label_slug;
        const prediction = predictV6Style(testRecipe, trainingSet, 5);

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

        // Belgian discrimination test
        if (actualStyle === 'belgian_dubbel') {
            results.belgianTest.dubbelRecipes++;
            if (prediction.top1 === 'belgian_dubbel') {
                results.belgianTest.dubbelCorrect++;
            } else if (prediction.top1 === 'belgian_witbier') {
                results.belgianTest.dubbelToWitbier++;
            }
        }

        if ((idx + 1) % 50 === 0) {
            console.log(`  Processed ${idx + 1}/${testSet.length} test recipes...`);
        }
    });

    return results;
}

// Run holdout evaluation
const holdoutResults = runHoldoutTest(testSet, trainingSet);

// Calculate performance metrics
const holdoutTop1 = (holdoutResults.top1 / holdoutResults.total * 100).toFixed(1);
const holdoutTop3 = (holdoutResults.top3 / holdoutResults.total * 100).toFixed(1);
const holdoutTop5 = (holdoutResults.top5 / holdoutResults.total * 100).toFixed(1);

const avgConfidence = (holdoutResults.confidenceStats.reduce((a, b) => a + b, 0) / holdoutResults.confidenceStats.length).toFixed(3);

console.log("\n📊 HOLDOUT TEST RESULTS:");
console.log("========================");

console.log(`\n🎯 V6 MODEL HOLDOUT PERFORMANCE:`);
console.log(`   Top-1: ${holdoutResults.top1}/${holdoutResults.total} (${holdoutTop1}%)`);
console.log(`   Top-3: ${holdoutResults.top3}/${holdoutResults.total} (${holdoutTop3}%)`);
console.log(`   Top-5: ${holdoutResults.top5}/${holdoutResults.total} (${holdoutTop5}%)`);
console.log(`   Average confidence: ${avgConfidence}`);

// Compare with LOOCV baseline
const loocvTop1 = 68.5;
const loocvTop3 = 82.3;
const loocvTop5 = 84.6;

console.log(`\n📈 HOLDOUT vs LOOCV COMPARISON:`);
console.log(`   Top-1: ${holdoutTop1}% vs ${loocvTop1}% (${(parseFloat(holdoutTop1) - loocvTop1).toFixed(1)}%)`);
console.log(`   Top-3: ${holdoutTop3}% vs ${loocvTop3}% (${(parseFloat(holdoutTop3) - loocvTop3).toFixed(1)}%)`);
console.log(`   Top-5: ${holdoutTop5}% vs ${loocvTop5}% (${(parseFloat(holdoutTop5) - loocvTop5).toFixed(1)}%)`);

// Belgian discrimination validation
if (holdoutResults.belgianTest.dubbelRecipes > 0) {
    const belgianAccuracy = (holdoutResults.belgianTest.dubbelCorrect / holdoutResults.belgianTest.dubbelRecipes * 100).toFixed(1);
    console.log(`\n🧬 Belgian discrimination validation:`);
    console.log(`   Dubbel recipes in test: ${holdoutResults.belgianTest.dubbelRecipes}`);
    console.log(`   Dubbel correct: ${holdoutResults.belgianTest.dubbelCorrect} (${belgianAccuracy}%)`);
    console.log(`   Dubbel→Witbier confusion: ${holdoutResults.belgianTest.dubbelToWitbier}`);
    console.log(`   Status: ${holdoutResults.belgianTest.dubbelToWitbier === 0 ? '✅ NO CONFUSION' : '⚠️ SOME CONFUSION'}`);
}

// Success criteria evaluation
const targetAccuracy = 66.0;
const holdoutSuccess = parseFloat(holdoutTop1) >= targetAccuracy;

console.log(`\n✅ HOLDOUT TEST SUCCESS CRITERIA:`);
console.log(`   Target: ≥${targetAccuracy}% top-1 accuracy`);
console.log(`   Achieved: ${holdoutTop1}% top-1 accuracy`);
console.log(`   Status: ${holdoutSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
console.log(`   LOOCV variance: ${(parseFloat(holdoutTop1) - loocvTop1).toFixed(1)}% (expected: ±2.5%)`);

// Save datasets
const trainingDataset = {
    ...productionDataset,
    records: trainingSet,
    _meta: {
        ...productionDataset._meta,
        split_type: 'training',
        split_ratio: '80%',
        recipe_count: trainingSet.length,
        created_from: '_ml_dataset_v6_production_ready.json'
    }
};

const testDataset = {
    ...productionDataset,
    records: testSet,
    _meta: {
        ...productionDataset._meta,
        split_type: 'holdout_test',
        split_ratio: '20%',
        recipe_count: testSet.length,
        created_from: '_ml_dataset_v6_production_ready.json'
    }
};

fs.writeFileSync('_ml_dataset_v6_training_80pct.json', JSON.stringify(trainingDataset, null, 2));
fs.writeFileSync('_ml_dataset_v6_holdout_test_20pct.json', JSON.stringify(testDataset, null, 2));

// Save holdout results
const holdoutReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_5A_HOLDOUT_TEST_CREATION_COMPLETE',
    dataset_split: {
        total_recipes: productionDataset.records.length,
        training_recipes: trainingSet.length,
        test_recipes: testSet.length,
        split_ratio: `${trainingSet.length}/${testSet.length} (${(trainingSet.length/(trainingSet.length+testSet.length)*100).toFixed(1)}%/${(testSet.length/(trainingSet.length+testSet.length)*100).toFixed(1)}%)`
    },
    stratification: {
        original_styles: originalStyles.length,
        test_styles: testStyles.length,
        missing_styles: missingStyles.length,
        quality: missingStyles.length < originalStyles.length * 0.1 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    },
    holdout_performance: {
        top1_accuracy: parseFloat(holdoutTop1),
        top3_accuracy: parseFloat(holdoutTop3),
        top5_accuracy: parseFloat(holdoutTop5),
        average_confidence: parseFloat(avgConfidence)
    },
    loocv_comparison: {
        top1_variance: parseFloat((parseFloat(holdoutTop1) - loocvTop1).toFixed(1)),
        top3_variance: parseFloat((parseFloat(holdoutTop3) - loocvTop3).toFixed(1)),
        top5_variance: parseFloat((parseFloat(holdoutTop5) - loocvTop5).toFixed(1)),
        variance_status: Math.abs(parseFloat(holdoutTop1) - loocvTop1) <= 2.5 ? 'ACCEPTABLE' : 'HIGH_VARIANCE'
    },
    belgian_discrimination: {
        dubbel_recipes: holdoutResults.belgianTest.dubbelRecipes,
        dubbel_accuracy: holdoutResults.belgianTest.dubbelRecipes > 0 ?
            parseFloat((holdoutResults.belgianTest.dubbelCorrect / holdoutResults.belgianTest.dubbelRecipes * 100).toFixed(1)) : null,
        dubbel_witbier_confusion: holdoutResults.belgianTest.dubbelToWitbier,
        status: holdoutResults.belgianTest.dubbelToWitbier === 0 ? 'RESOLVED' : 'PARTIAL'
    },
    success_criteria: {
        target_accuracy: targetAccuracy,
        achieved_accuracy: parseFloat(holdoutTop1),
        success: holdoutSuccess,
        ready_for_production: holdoutSuccess && Math.abs(parseFloat(holdoutTop1) - loocvTop1) <= 2.5
    },
    next_phase: 'FAZ_5B_AB_TESTING_FRAMEWORK'
};

fs.writeFileSync('_holdout_test_results.json', JSON.stringify(holdoutReport, null, 2));

console.log(`\n💾 Datasets saved:`);
console.log(`   Training: _ml_dataset_v6_training_80pct.json (${trainingSet.length} recipes)`);
console.log(`   Test: _ml_dataset_v6_holdout_test_20pct.json (${testSet.length} recipes)`);
console.log(`   Results: _holdout_test_results.json`);

console.log(`\n📋 FAZ 5A COMPLETION SUMMARY:`);
if (holdoutSuccess) {
    console.log("✅ HOLDOUT TEST SUCCESS - V6 model validated on unseen data");
    console.log(`🎯 Performance: ${holdoutTop1}% top-1 (target: ≥${targetAccuracy}%)`);
    console.log("🚀 Ready for FAZ 5B: A/B Testing Framework");
} else {
    console.log("⚠️  HOLDOUT TEST BELOW TARGET - Model needs investigation");
    console.log(`📊 Performance: ${holdoutTop1}% top-1 (target: ≥${targetAccuracy}%)`);
    console.log("🔍 Recommend: Analysis of low-performing styles, potential overfitting");
}

console.log(`\n🏁 FAZ 5A COMPLETED - Independent validation ${holdoutSuccess ? 'successful' : 'needs attention'}`);
console.log(`📈 Holdout variance: ${(parseFloat(holdoutTop1) - loocvTop1).toFixed(1)}% from LOOCV baseline`);