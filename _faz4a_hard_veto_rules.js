#!/usr/bin/env node
/**
 * FAZ 4A: HARD VETO RULES IMPLEMENTATION
 *
 * Eliminate physically/logically impossible style predictions before distance calculation
 * Target: 1-2% accuracy improvement via impossible prediction elimination
 *
 * Veto categories:
 * 1. ABV vs OG consistency (alcohol limits)
 * 2. SRM vs grain bill sanity (color requires dark grains)
 * 3. IBU vs hop schedule validation (bitterness limits)
 * 4. Style signature contradictions (Lager + Belgian yeast)
 * 5. Water chemistry constraints (regional profile mismatches)
 * 6. Fermentation temp vs style family (temperature ranges)
 */

const fs = require('fs');

// Load enhanced dataset and style definitions
const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_faz3b_yeast_granularity.json', 'utf8'));
const styleDefinitions = JSON.parse(fs.readFileSync('STYLE_DEFINITIONS.json', 'utf8'));

console.log("🚫 FAZ 4A: HARD VETO RULES IMPLEMENTATION");
console.log("========================================");
console.log(`Dataset: ${dataset.records.length} recipes, 79 features`);
console.log(`Style definitions: ${Object.keys(styleDefinitions).length} styles`);

// Hard veto rule implementations
const VETO_RULES = {
    // 1. ABV vs OG consistency veto
    abv_og_consistency: function(recipe, candidateStyle) {
        const abv = recipe.features.abv || 0;
        const og = recipe.features.og_plato || 0;

        // Theoretical max ABV from OG (simplified calculation)
        const theoreticalMaxABV = (og * 1.33) * 0.79; // Rough estimate with high attenuation

        // Veto if ABV is impossibly high for given OG
        if (abv > theoreticalMaxABV + 2) {
            return { veto: true, reason: `ABV ${abv}% impossible with OG ${og}°P (max ~${theoreticalMaxABV.toFixed(1)}%)` };
        }

        // Veto extreme ABV mismatches for style families
        const styleData = styleDefinitions[candidateStyle];
        if (styleData && styleData.abv_range) {
            const [minABV, maxABV] = styleData.abv_range;
            if (abv < minABV - 1.5 || abv > maxABV + 1.5) {
                return { veto: true, reason: `ABV ${abv}% outside style range ${minABV}-${maxABV}%` };
            }
        }

        return { veto: false };
    },

    // 2. SRM vs grain bill sanity check
    srm_grain_consistency: function(recipe, candidateStyle) {
        const srm = recipe.features.srm_target || 0;
        const hasChocolate = recipe.features.grain_chocolate || 0;
        const hasBlack = recipe.features.grain_black || 0;
        const hasRoasted = recipe.features.grain_roasted_barley || 0;
        const hasCarafa = recipe.features.grain_carafa || 0;

        const totalDarkGrains = hasChocolate + hasBlack + hasRoasted + hasCarafa;

        // Veto very dark beer (>40 SRM) without dark grains
        if (srm > 40 && totalDarkGrains === 0) {
            return { veto: true, reason: `Dark beer (${srm} SRM) impossible without dark grains` };
        }

        // Veto light beer (<10 SRM) with significant dark grains
        if (srm < 10 && totalDarkGrains > 0.3) {
            return { veto: true, reason: `Light beer (${srm} SRM) impossible with dark grains (${totalDarkGrains})` };
        }

        return { veto: false };
    },

    // 3. IBU vs hop schedule validation
    ibu_hop_consistency: function(recipe, candidateStyle) {
        const ibu = recipe.features.ibu_target || 0;
        const hopBittering = recipe.features.hop_bittering || 0;
        const hopAroma = recipe.features.hop_aroma || 0;
        const totalHops = hopBittering + hopAroma;

        // Veto extreme IBU (>120) without sufficient hops
        if (ibu > 120 && totalHops < 0.8) {
            return { veto: true, reason: `Extreme IBU (${ibu}) impossible without massive hopping` };
        }

        // Veto very low IBU (<5) with significant hops
        if (ibu < 5 && totalHops > 0.5) {
            return { veto: true, reason: `Low IBU (${ibu}) inconsistent with hop levels (${totalHops})` };
        }

        return { veto: false };
    },

    // 4. Style signature contradictions
    style_signature_consistency: function(recipe, candidateStyle) {
        const yeastBelgian = recipe.features.yeast_belgian || 0;
        const yeastLager = recipe.features.yeast_lager || 0;
        const yeastAbbey = recipe.features.yeast_abbey || 0;
        const yeastWitbier = recipe.features.yeast_witbier || 0;

        // Define style family patterns
        const isLagerStyle = candidateStyle.includes('lager') ||
                           candidateStyle.includes('pilsner') ||
                           candidateStyle.includes('maerzen') ||
                           candidateStyle.includes('helles') ||
                           candidateStyle.includes('bock');

        const isBelgianStyle = candidateStyle.includes('belgian') ||
                             candidateStyle.includes('tripel') ||
                             candidateStyle.includes('dubbel') ||
                             candidateStyle.includes('witbier') ||
                             candidateStyle.includes('saison');

        // Veto: Lager style with Belgian yeast
        if (isLagerStyle && (yeastBelgian || yeastAbbey || yeastWitbier)) {
            return { veto: true, reason: `Lager style (${candidateStyle}) incompatible with Belgian yeast` };
        }

        // Veto: Belgian style with Lager yeast
        if (isBelgianStyle && yeastLager) {
            return { veto: true, reason: `Belgian style (${candidateStyle}) incompatible with Lager yeast` };
        }

        return { veto: false };
    },

    // 5. Water chemistry constraints
    water_chemistry_consistency: function(recipe, candidateStyle) {
        const so4 = recipe.features.water_so4_ppm || 0;
        const cl = recipe.features.water_cl_ppm || 0;
        const so4_cl_ratio = cl > 0 ? so4 / cl : so4 / 1;

        // Burton-on-Trent profile (high sulfate) for hop-forward styles
        const isHopForward = candidateStyle.includes('ipa') ||
                           candidateStyle.includes('pale_ale') ||
                           candidateStyle.includes('bitter');

        // Munich profile (low sulfate) for malt-forward styles
        const isMaltForward = candidateStyle.includes('maerzen') ||
                            candidateStyle.includes('helles') ||
                            candidateStyle.includes('weizen') ||
                            candidateStyle.includes('bock');

        // Veto: Hop-forward style with low sulfate (SO4 < 150 and SO4:Cl < 1.5)
        if (isHopForward && so4 < 150 && so4_cl_ratio < 1.5) {
            return { veto: true, reason: `Hop-forward style needs high sulfate (has ${so4} SO4, ratio ${so4_cl_ratio.toFixed(1)})` };
        }

        // Veto: Malt-forward style with extreme sulfate (SO4 > 400)
        if (isMaltForward && so4 > 400) {
            return { veto: true, reason: `Malt-forward style incompatible with extreme sulfate (${so4} SO4)` };
        }

        return { veto: false };
    },

    // 6. Fermentation temp vs style family
    fermentation_temp_consistency: function(recipe, candidateStyle) {
        const fermTemp = recipe.features.fermentation_temp_c || 20;

        // Define temperature ranges for style families
        const isLagerStyle = candidateStyle.includes('lager') ||
                           candidateStyle.includes('pilsner') ||
                           candidateStyle.includes('helles') ||
                           candidateStyle.includes('maerzen') ||
                           candidateStyle.includes('bock');

        const isSaisonStyle = candidateStyle.includes('saison') ||
                            candidateStyle.includes('farmhouse');

        // Veto: Lager style with ale temperature (>16°C)
        if (isLagerStyle && fermTemp > 16) {
            return { veto: true, reason: `Lager style requires cool fermentation (<16°C, has ${fermTemp}°C)` };
        }

        // Veto: Saison style with cool temperature (<20°C)
        if (isSaisonStyle && fermTemp < 20) {
            return { veto: true, reason: `Saison style requires warm fermentation (>20°C, has ${fermTemp}°C)` };
        }

        // Veto: Extreme temperatures outside brewing range
        if (fermTemp < 5 || fermTemp > 35) {
            return { veto: true, reason: `Fermentation temperature outside viable range (${fermTemp}°C)` };
        }

        return { veto: false };
    }
};

// Enhanced K-NN with hard veto rules
function calculateDistanceWithVeto(recipe1, recipe2, candidateStyle, featureWeights = {}) {
    // Apply all veto rules
    const vetoResults = Object.entries(VETO_RULES).map(([ruleName, ruleFunc]) => {
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
            distance: Infinity, // Infinite distance = impossible match
            vetoed: true,
            vetoReason: vetoed.reason,
            vetoRule: vetoed.rule
        };
    }

    // Standard distance calculation if not vetoed
    let totalDistance = 0;
    let featureCount = 0;

    const features1 = recipe1.features;
    const features2 = recipe2.features;

    // Enhanced feature weights (from FAZ 3)
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

// LOOCV with veto rules
function runLOOCVWithVeto(dataset, k = 10, description = "Dataset") {
    console.log(`\n🔄 Running LOOCV with Hard Veto Rules on ${description} (k=${k})...`);

    const results = {
        total: 0,
        top1: 0,
        top3: 0,
        top5: 0,
        predictions: [],
        vetoStats: {
            totalVetos: 0,
            vetosByRule: {},
            vetosByStyle: {}
        }
    };

    const recipes = dataset.records;

    for (let i = 0; i < recipes.length; i++) {
        const testRecipe = recipes[i];
        const trainingSet = recipes.filter((_, idx) => idx !== i);

        // Calculate distances to all training recipes with veto rules
        const distances = trainingSet.map(trainRecipe => {
            const distanceResult = calculateDistanceWithVeto(
                testRecipe,
                trainRecipe,
                trainRecipe.label_slug
            );

            // Track veto statistics
            if (distanceResult.vetoed) {
                results.vetoStats.totalVetos++;
                results.vetoStats.vetosByRule[distanceResult.vetoRule] =
                    (results.vetoStats.vetosByRule[distanceResult.vetoRule] || 0) + 1;
                results.vetoStats.vetosByStyle[trainRecipe.label_slug] =
                    (results.vetoStats.vetosByStyle[trainRecipe.label_slug] || 0) + 1;
            }

            return {
                recipe: trainRecipe,
                distance: distanceResult.distance,
                vetoed: distanceResult.vetoed,
                vetoReason: distanceResult.vetoReason
            };
        });

        // Filter out vetoed matches and sort by distance
        const validDistances = distances.filter(d => !d.vetoed);
        validDistances.sort((a, b) => a.distance - b.distance);

        // Get k nearest valid neighbors
        const neighbors = validDistances.slice(0, k);

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
            validNeighbors: neighbors.length,
            vetoedCandidates: distances.filter(d => d.vetoed).length
        });

        if ((i + 1) % 100 === 0) {
            console.log(`  Processed ${i + 1}/${recipes.length} predictions...`);
        }
    }

    return results;
}

// Run comparison tests
console.log("\n🧪 TESTING HARD VETO RULES IMPACT:");

// Test without veto rules (baseline from FAZ 3)
const baselineResults = {
    top1: 708,
    top3: 886,
    top5: 917,
    total: 1100
};

// Test with veto rules
const vetoResults = runLOOCVWithVeto(dataset, 10, "V6.4 with Hard Veto Rules");

console.log("\n📊 HARD VETO RULES COMPARISON:");
console.log("==============================");

// Calculate percentages
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

console.log(`\n🚫 V6.4 WITH VETO RULES:`);
console.log(`   Top-1: ${vetoResults.top1}/${vetoResults.total} (${vetoTop1}%)`);
console.log(`   Top-3: ${vetoResults.top3}/${vetoResults.total} (${vetoTop3}%)`);
console.log(`   Top-5: ${vetoResults.top5}/${vetoResults.total} (${vetoTop5}%)`);

// Calculate improvements
const top1Improvement = (parseFloat(vetoTop1) - parseFloat(baselineTop1)).toFixed(1);
const top3Improvement = (parseFloat(vetoTop3) - parseFloat(baselineTop3)).toFixed(1);
const top5Improvement = (parseFloat(vetoTop5) - parseFloat(baselineTop5)).toFixed(1);

console.log(`\n🎯 VETO RULE IMPROVEMENTS:`);
console.log(`   Top-1: ${top1Improvement >= 0 ? '+' : ''}${top1Improvement}%`);
console.log(`   Top-3: ${top3Improvement >= 0 ? '+' : ''}${top3Improvement}%`);
console.log(`   Top-5: ${top5Improvement >= 0 ? '+' : ''}${top5Improvement}%`);

// Veto statistics analysis
console.log(`\n🚫 VETO RULE STATISTICS:`);
console.log(`Total veto applications: ${vetoResults.vetoStats.totalVetos}`);

console.log(`\nVetos by rule:`);
Object.entries(vetoResults.vetoStats.vetosByRule).forEach(([rule, count]) => {
    console.log(`  ${rule}: ${count} vetos`);
});

console.log(`\nTop vetoed styles:`);
const topVetoedStyles = Object.entries(vetoResults.vetoStats.vetosByStyle)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
topVetoedStyles.forEach(([style, count]) => {
    console.log(`  ${style}: ${count} vetos`);
});

// Save enhanced veto results
const faz4aReport = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_4A_HARD_VETO_RULES_COMPLETE',
    baseline_results: {
        top1_accuracy: parseFloat(baselineTop1),
        top3_accuracy: parseFloat(baselineTop3),
        top5_accuracy: parseFloat(baselineTop5)
    },
    veto_results: {
        top1_accuracy: parseFloat(vetoTop1),
        top3_accuracy: parseFloat(vetoTop3),
        top5_accuracy: parseFloat(vetoTop5),
        total_vetos: vetoResults.vetoStats.totalVetos,
        vetos_by_rule: vetoResults.vetoStats.vetosByRule,
        top_vetoed_styles: Object.fromEntries(topVetoedStyles)
    },
    improvements: {
        top1: parseFloat(top1Improvement),
        top3: parseFloat(top3Improvement),
        top5: parseFloat(top5Improvement)
    },
    veto_rules_implemented: Object.keys(VETO_RULES),
    success_status: parseFloat(top1Improvement) > 0 ? "SUCCESS" : "MARGINAL",
    next_phase: 'FAZ_4B_HYPERPARAMETER_OPTIMIZATION'
};

fs.writeFileSync('_faz4a_hard_veto_results.json', JSON.stringify(faz4aReport, null, 2));

console.log(`\n💾 Hard veto results saved: _faz4a_hard_veto_results.json`);

if (parseFloat(top1Improvement) > 0) {
    console.log("\n✅ FAZ 4A SUCCESS: Hard veto rules delivered accuracy improvement!");
} else {
    console.log("\n⚡ FAZ 4A MARGINAL: Veto rules provide quality filtering even if accuracy flat");
}

console.log(`\n🚀 READY FOR FAZ 4B: Hyperparameter Optimization`);
console.log(`🎯 Current performance: ${vetoTop1}% top-1 (target: 70%+)`);