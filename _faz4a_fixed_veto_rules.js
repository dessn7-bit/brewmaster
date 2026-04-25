#!/usr/bin/env node
/**
 * FAZ 4A: FIXED HARD VETO RULES IMPLEMENTATION
 *
 * Fix aggressive veto rules that eliminated all predictions
 * Issue: ABV/OG calculation was too strict, need realistic thresholds
 *
 * Strategy: Conservative veto rules that only eliminate truly impossible cases
 */

const fs = require('fs');

// Load enhanced dataset and style definitions
const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_faz3b_yeast_granularity.json', 'utf8'));
const styleDefinitions = JSON.parse(fs.readFileSync('STYLE_DEFINITIONS.json', 'utf8'));

console.log("🚫 FAZ 4A: FIXED HARD VETO RULES IMPLEMENTATION");
console.log("==============================================");
console.log(`Dataset: ${dataset.records.length} recipes, 79 features`);

// Analyze dataset ranges to set realistic thresholds
function analyzeDatasetRanges(dataset) {
    const features = ['abv', 'og_plato', 'srm_target', 'ibu_target', 'fermentation_temp_c'];
    const analysis = {};

    features.forEach(feature => {
        const values = dataset.records
            .map(r => r.features[feature])
            .filter(v => v !== undefined && v !== null && !isNaN(v));

        analysis[feature] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            count: values.length
        };
    });

    return analysis;
}

const datasetAnalysis = analyzeDatasetRanges(dataset);
console.log("\n📊 DATASET FEATURE RANGES:");
Object.entries(datasetAnalysis).forEach(([feature, stats]) => {
    console.log(`${feature}: ${stats.min.toFixed(1)} - ${stats.max.toFixed(1)} (avg: ${stats.avg.toFixed(1)}, n: ${stats.count})`);
});

// Fixed conservative veto rules
const CONSERVATIVE_VETO_RULES = {
    // 1. Conservative ABV limits (only extreme cases)
    extreme_abv_veto: function(recipe, candidateStyle) {
        const abv = recipe.features.abv || 0;

        // Only veto truly impossible ABV levels
        if (abv > 20) {
            return { veto: true, reason: `Extreme ABV ${abv}% (>20% impossible without distillation)` };
        }

        if (abv < 0 || isNaN(abv)) {
            return { veto: true, reason: `Invalid ABV ${abv}%` };
        }

        return { veto: false };
    },

    // 2. Color logic consistency (very conservative)
    color_grain_logic: function(recipe, candidateStyle) {
        const srm = recipe.features.srm_target || 0;
        const hasChocolate = recipe.features.grain_chocolate || 0;
        const hasBlack = recipe.features.grain_black || 0;
        const hasRoasted = recipe.features.grain_roasted_barley || 0;

        // Only veto extreme cases - very dark beer with zero dark grains
        if (srm > 60 && hasChocolate === 0 && hasBlack === 0 && hasRoasted === 0) {
            return { veto: true, reason: `Extremely dark beer (${srm} SRM) impossible without any dark grains` };
        }

        return { veto: false };
    },

    // 3. Yeast-style family contradictions (conservative)
    yeast_style_contradiction: function(recipe, candidateStyle) {
        const yeastLager = recipe.features.yeast_lager || 0;
        const yeastAbbey = recipe.features.yeast_abbey || 0;
        const yeastWitbier = recipe.features.yeast_witbier || 0;
        const lagering = recipe.features.lagering_days || 0;

        // Only veto clear contradictions
        const isDefiniteLager = candidateStyle.includes('pilsner') ||
                              candidateStyle.includes('helles') ||
                              candidateStyle.includes('maerzen') ||
                              (candidateStyle.includes('lager') && !candidateStyle.includes('schwarzbier'));

        const isDefiniteBelgian = candidateStyle.includes('dubbel') ||
                                candidateStyle.includes('tripel') ||
                                candidateStyle.includes('witbier') ||
                                candidateStyle.includes('quadrupel');

        // Veto: Definite lager style with Belgian yeast AND no lagering
        if (isDefiniteLager && (yeastAbbey || yeastWitbier) && lagering === 0) {
            return { veto: true, reason: `Lager style (${candidateStyle}) with Belgian yeast and no lagering` };
        }

        // Veto: Definite Belgian style with lager yeast AND long lagering
        if (isDefiniteBelgian && yeastLager && lagering > 30) {
            return { veto: true, reason: `Belgian style (${candidateStyle}) with lager yeast and extended lagering` };
        }

        return { veto: false };
    },

    // 4. Extreme temperature veto (only impossible temps)
    extreme_temperature_veto: function(recipe, candidateStyle) {
        const fermTemp = recipe.features.fermentation_temp_c || 20;

        // Only veto temperatures outside brewing possibility
        if (fermTemp < 1 || fermTemp > 40) {
            return { veto: true, reason: `Impossible fermentation temperature (${fermTemp}°C)` };
        }

        return { veto: false };
    },

    // 5. Extreme IBU without hops (conservative)
    extreme_ibu_veto: function(recipe, candidateStyle) {
        const ibu = recipe.features.ibu_target || 0;
        const hopTotal = (recipe.features.hop_bittering || 0) +
                        (recipe.features.hop_aroma || 0) +
                        (recipe.features.hop_flavor || 0);

        // Only veto truly extreme cases
        if (ibu > 150 && hopTotal < 0.1) {
            return { veto: true, reason: `Extreme IBU (${ibu}) impossible with minimal hops (${hopTotal})` };
        }

        if (ibu < 0 || isNaN(ibu)) {
            return { veto: true, reason: `Invalid IBU ${ibu}` };
        }

        return { veto: false };
    }
};

// Enhanced K-NN with conservative veto rules
function calculateDistanceWithConservativeVeto(recipe1, recipe2, candidateStyle) {
    // Apply conservative veto rules
    const vetoResults = Object.entries(CONSERVATIVE_VETO_RULES).map(([ruleName, ruleFunc]) => {
        try {
            const result = ruleFunc(recipe1, candidateStyle);
            return { rule: ruleName, ...result };
        } catch (error) {
            return { rule: ruleName, veto: false, error: error.message };
        }
    });

    // Check if any veto rule triggers
    const vetoed = vetoResults.find(result => result.veto);
    if (vetoed) {
        return {
            distance: Infinity,
            vetoed: true,
            vetoReason: vetoed.reason,
            vetoRule: vetoed.rule
        };
    }

    // Standard distance calculation if not vetoed (from FAZ 3)
    let totalDistance = 0;
    let featureCount = 0;

    const features1 = recipe1.features;
    const features2 = recipe2.features;

    const FEATURE_WEIGHTS = {
        'yeast_abbey': 2.0, 'yeast_witbier': 2.0, 'yeast_golden_strong': 1.8,
        'yeast_attenuation': 2.5, 'fermentation_temp_c': 2.2, 'mash_temp_c': 1.5,
        'water_so4_ppm': 1.8, 'water_cl_ppm': 1.5, 'dry_hop_days': 2.0, 'lagering_days': 2.2,
        'abv': 2.0, 'srm_target': 1.8, 'ibu_target': 1.8, 'og_plato': 1.5,
        'grain_pilsner': 1.5, 'grain_munich': 1.5, 'grain_wheat': 1.8,
        'hop_noble': 1.8, 'hop_citrus': 1.8,
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

    return {
        distance: Math.sqrt(totalDistance / featureCount),
        vetoed: false
    };
}

// LOOCV with conservative veto rules
function runLOOCVWithConservativeVeto(dataset, k = 10) {
    console.log(`\n🔄 Running LOOCV with Conservative Veto Rules (k=${k})...`);

    const results = {
        total: 0,
        top1: 0,
        top3: 0,
        top5: 0,
        predictions: [],
        vetoStats: {
            totalVetos: 0,
            vetosByRule: {},
            samplesWithVetos: 0
        }
    };

    const recipes = dataset.records;

    for (let i = 0; i < recipes.length; i++) {
        const testRecipe = recipes[i];
        const trainingSet = recipes.filter((_, idx) => idx !== i);

        // Calculate distances with conservative veto rules
        const distances = [];
        let sampleVetoCount = 0;

        trainingSet.forEach(trainRecipe => {
            const distanceResult = calculateDistanceWithConservativeVeto(
                testRecipe,
                trainRecipe,
                trainRecipe.label_slug
            );

            if (distanceResult.vetoed) {
                results.vetoStats.totalVetos++;
                results.vetoStats.vetosByRule[distanceResult.vetoRule] =
                    (results.vetoStats.vetosByRule[distanceResult.vetoRule] || 0) + 1;
                sampleVetoCount++;
            } else {
                distances.push({
                    recipe: trainRecipe,
                    distance: distanceResult.distance
                });
            }
        });

        if (sampleVetoCount > 0) {
            results.vetoStats.samplesWithVetos++;
        }

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
            validNeighbors: neighbors.length,
            vetoedCandidates: sampleVetoCount
        });

        if ((i + 1) % 100 === 0) {
            console.log(`  Processed ${i + 1}/${recipes.length} predictions...`);
        }
    }

    return results;
}

// Test conservative veto rules
const vetoResults = runLOOCVWithConservativeVeto(dataset, 10);

// Baseline comparison (from FAZ 3)
const baselineResults = { top1: 708, top3: 886, top5: 917, total: 1100 };

console.log("\n📊 CONSERVATIVE VETO RULES COMPARISON:");
console.log("====================================");

const baselineTop1 = (baselineResults.top1 / baselineResults.total * 100).toFixed(1);
const baselineTop3 = (baselineResults.top3 / baselineResults.total * 100).toFixed(1);
const baselineTop5 = (baselineResults.top5 / baselineResults.total * 100).toFixed(1);

const vetoTop1 = (vetoResults.top1 / vetoResults.total * 100).toFixed(1);
const vetoTop3 = (vetoResults.top3 / vetoResults.total * 100).toFixed(1);
const vetoTop5 = (vetoResults.top5 / vetoResults.total * 100).toFixed(1);

console.log(`\n📈 V6.3 BASELINE (no veto):`);
console.log(`   Top-1: ${baselineResults.top1}/${baselineResults.total} (${baselineTop1}%)`);
console.log(`   Top-3: ${baselineResults.top3}/${baselineResults.total} (${baselineTop3}%)`);
console.log(`   Top-5: ${baselineResults.top5}/${baselineResults.total} (${baselineTop5}%)`);

console.log(`\n🚫 V6.4 CONSERVATIVE VETO:`);
console.log(`   Top-1: ${vetoResults.top1}/${vetoResults.total} (${vetoTop1}%)`);
console.log(`   Top-3: ${vetoResults.top3}/${vetoResults.total} (${vetoTop3}%)`);
console.log(`   Top-5: ${vetoResults.top5}/${vetoResults.total} (${vetoTop5}%)`);

const top1Improvement = (parseFloat(vetoTop1) - parseFloat(baselineTop1)).toFixed(1);
const top3Improvement = (parseFloat(vetoTop3) - parseFloat(baselineTop3)).toFixed(1);
const top5Improvement = (parseFloat(vetoTop5) - parseFloat(baselineTop5)).toFixed(1);

console.log(`\n🎯 CONSERVATIVE VETO IMPROVEMENTS:`);
console.log(`   Top-1: ${top1Improvement >= 0 ? '+' : ''}${top1Improvement}%`);
console.log(`   Top-3: ${top3Improvement >= 0 ? '+' : ''}${top3Improvement}%`);
console.log(`   Top-5: ${top5Improvement >= 0 ? '+' : ''}${top5Improvement}%`);

// Veto analysis
console.log(`\n🚫 CONSERVATIVE VETO STATISTICS:`);
console.log(`Total veto applications: ${vetoResults.vetoStats.totalVetos}`);
console.log(`Samples affected: ${vetoResults.vetoStats.samplesWithVetos}/${vetoResults.total}`);
console.log(`Avg vetos per affected sample: ${(vetoResults.vetoStats.totalVetos / Math.max(vetoResults.vetoStats.samplesWithVetos, 1)).toFixed(1)}`);

if (Object.keys(vetoResults.vetoStats.vetosByRule).length > 0) {
    console.log(`\nVetos by rule:`);
    Object.entries(vetoResults.vetoStats.vetosByRule).forEach(([rule, count]) => {
        console.log(`  ${rule}: ${count} vetos`);
    });
}

// Save conservative veto results
const faz4aFixedReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_4A_CONSERVATIVE_VETO_RULES_COMPLETE',
    baseline_results: {
        top1_accuracy: parseFloat(baselineTop1),
        top3_accuracy: parseFloat(baselineTop3),
        top5_accuracy: parseFloat(baselineTop5)
    },
    conservative_veto_results: {
        top1_accuracy: parseFloat(vetoTop1),
        top3_accuracy: parseFloat(vetoTop3),
        top5_accuracy: parseFloat(vetoTop5),
        total_vetos: vetoResults.vetoStats.totalVetos,
        samples_affected: vetoResults.vetoStats.samplesWithVetos,
        vetos_by_rule: vetoResults.vetoStats.vetosByRule
    },
    improvements: {
        top1: parseFloat(top1Improvement),
        top3: parseFloat(top3Improvement),
        top5: parseFloat(top5Improvement)
    },
    veto_rules_implemented: Object.keys(CONSERVATIVE_VETO_RULES),
    dataset_analysis: datasetAnalysis,
    success_status: parseFloat(vetoTop1) >= parseFloat(baselineTop1) ? "SUCCESS" : "REGRESSION",
    next_phase: 'FAZ_4B_HYPERPARAMETER_OPTIMIZATION'
};

fs.writeFileSync('_faz4a_conservative_veto_results.json', JSON.stringify(faz4aFixedReport, null, 2));

console.log(`\n💾 Conservative veto results saved: _faz4a_conservative_veto_results.json`);

if (parseFloat(top1Improvement) >= 0) {
    console.log("\n✅ FAZ 4A SUCCESS: Conservative veto rules maintain/improve accuracy!");
    console.log(`🎯 Ready for FAZ 4B: Hyperparameter optimization (current: ${vetoTop1}%)`);
} else {
    console.log("\n⚠️  FAZ 4A REGRESSION: Veto rules reduced accuracy - need to debug");
    console.log("💭 Consider: Even more conservative rules or different veto strategy");
}

console.log(`\n🚀 FAZ 4A COMPLETED`);
console.log(`📊 Veto impact: ${vetoResults.vetoStats.totalVetos} impossible predictions eliminated`);
console.log(`🎯 Next target: Hyperparameter optimization for 70%+ accuracy`);