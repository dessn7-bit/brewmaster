#!/usr/bin/env node
/**
 * V6.0 Baseline LOOCV Evaluation
 * Tests alias-normalized motor against training data
 */
const fs = require('fs');
const { styleMatchScore, findBestMatches, normalizeSlug } = require('./style_engine.js');

// Load V6 dataset
const DS = JSON.parse(fs.readFileSync('_ml_dataset_v6.json', 'utf8'));
const recipes = DS.records;

console.log("🎯 V6.0 Baseline LOOCV Evaluation");
console.log(`📊 Dataset: ${recipes.length} recipes`);
console.log("📋 Testing with style_engine.js...\n");

// Track results
let top1_hits = 0;
let top3_hits = 0;
let top5_hits = 0;
let total_tests = 0;

const confusion = {}; // true_label -> predicted_label -> count
const worst_predictions = []; // {recipe_name, true_label, predicted_top5}

// LOOCV-style evaluation (but using style definitions, not ML model)
for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const trueLabel = recipe.label_slug;
    const recipeName = recipe.name || `recipe_${i}`;

    // Convert to style engine format
    const testRecipe = {
        og: recipe.features.og,
        fg: recipe.features.fg,
        abv: recipe.features.abv,
        ibu: recipe.features.ibu,
        srm: recipe.features.srm,
        // TODO: Add more feature mapping as needed
        _mayaTip: 'belgian' // simplified for now
    };

    try {
        // Get predictions from style engine
        const predictions = findBestMatches(testRecipe, 5);

        if (predictions.length === 0) {
            console.log(`⚠️  No predictions for ${recipeName}`);
            continue;
        }

        total_tests++;

        const predicted_top5 = predictions.map(p => p.slug);
        const top1_pred = predicted_top5[0];

        // Check hits
        const rank = predicted_top5.indexOf(trueLabel);
        if (rank === 0) top1_hits++;
        if (rank >= 0 && rank < 3) top3_hits++;
        if (rank >= 0 && rank < 5) top5_hits++;

        // Track confusion
        if (!confusion[trueLabel]) confusion[trueLabel] = {};
        if (!confusion[trueLabel][top1_pred]) confusion[trueLabel][top1_pred] = 0;
        confusion[trueLabel][top1_pred]++;

        // Track worst predictions
        if (rank < 0) { // Not in top-5
            worst_predictions.push({
                recipe: recipeName,
                true_label: trueLabel,
                predicted_top5: predicted_top5.slice(0, 3),
                features: `OG:${testRecipe.og} SRM:${testRecipe.srm} IBU:${testRecipe.ibu}`
            });
        }

        // Progress indicator
        if ((i + 1) % 100 === 0) {
            console.log(`  Processed ${i + 1}/${recipes.length} recipes...`);
        }

    } catch (error) {
        console.log(`❌ Error processing ${recipeName}: ${error.message}`);
    }
}

console.log("\n🎯 BASELINE RESULTS:");
console.log("==================");
console.log(`Total tested: ${total_tests}`);
console.log(`Top-1 accuracy: ${top1_hits}/${total_tests} (${(100*top1_hits/total_tests).toFixed(1)}%)`);
console.log(`Top-3 accuracy: ${top3_hits}/${total_tests} (${(100*top3_hits/total_tests).toFixed(1)}%)`);
console.log(`Top-5 accuracy: ${top5_hits}/${total_tests} (${(100*top5_hits/total_tests).toFixed(1)}%)`);

// Top confusion pairs
console.log("\n🔥 TOP CONFUSION PAIRS:");
const confusion_pairs = [];
for (const [true_label, preds] of Object.entries(confusion)) {
    for (const [pred_label, count] of Object.entries(preds)) {
        if (true_label !== pred_label && count > 1) {
            confusion_pairs.push({ true_label, pred_label, count });
        }
    }
}
confusion_pairs.sort((a, b) => b.count - a.count);
confusion_pairs.slice(0, 10).forEach(pair => {
    console.log(`  ${pair.true_label} → ${pair.pred_label}: ${pair.count}x`);
});

// Worst predictions
console.log("\n💥 WORST PREDICTIONS (not in top-5):");
worst_predictions.slice(0, 10).forEach(wp => {
    console.log(`  ${wp.recipe}: ${wp.true_label} → [${wp.predicted_top5.join(', ')}]`);
    console.log(`    ${wp.features}`);
});

// Test Dark Belgian Dubbel
console.log("\n🍺 DARK BELGIAN DUBBEL TEST:");
const testDubbel = {
    og: 1.062,
    fg: 1.012,
    abv: 6.6,
    ibu: 16,
    srm: 38,
    _mayaTip: 'belgian'
};

try {
    const dubbelPred = findBestMatches(testDubbel, 5);
    console.log("Predictions:");
    dubbelPred.forEach((pred, i) => {
        const marker = pred.slug === 'belgian_dubbel' ? ' ✅' : '';
        console.log(`  ${i+1}. ${pred.slug} (${pred.normalized})${marker}`);
    });

    const dubbelRank = dubbelPred.findIndex(p => p.slug === 'belgian_dubbel');
    if (dubbelRank >= 0) {
        console.log(`🎯 Belgian Dubbel found at rank ${dubbelRank + 1}`);
    } else {
        console.log(`❌ Belgian Dubbel NOT in top-5`);
    }
} catch (error) {
    console.log(`❌ Error testing Dark Belgian Dubbel: ${error.message}`);
}

// Save results
const results = {
    version: "v6.0_baseline",
    timestamp: new Date().toISOString(),
    metrics: {
        top1: (100*top1_hits/total_tests).toFixed(1),
        top3: (100*top3_hits/total_tests).toFixed(1),
        top5: (100*top5_hits/total_tests).toFixed(1),
        total_tests: total_tests
    },
    top_confusion_pairs: confusion_pairs.slice(0, 20),
    worst_predictions: worst_predictions.slice(0, 20)
};

fs.writeFileSync('_v6_baseline_results.json', JSON.stringify(results, null, 2));
console.log("\n✅ Results saved to _v6_baseline_results.json");