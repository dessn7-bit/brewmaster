#!/usr/bin/env node
/**
 * Append Tier 1 recipes to V6 dataset
 * Batch processing with class distribution tracking
 */
const fs = require('fs');
const { tier1Recipes } = require('./_create_tier1_recipes.js');

function main() {
    console.log("📈 Faz 2 Batch 1: Tier 1 reçete append işlemi");

    // Load V6 dataset
    const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6.json', 'utf8'));

    // Find data key
    let dataKey = 'records'; // V6 uses 'records'
    if (!dataset[dataKey] || !Array.isArray(dataset[dataKey])) {
        console.error("❌ ERROR: Dataset records not found");
        process.exit(1);
    }

    const recipes = dataset[dataKey];
    const originalCount = recipes.length;
    console.log(`📊 Original dataset: ${originalCount} recipes`);

    // Track before state
    const beforeCounts = {};
    recipes.forEach(recipe => {
        const slug = recipe.label_slug;
        beforeCounts[slug] = (beforeCounts[slug] || 0) + 1;
    });

    // Append Tier 1 recipes
    tier1Recipes.forEach(recipe => {
        recipes.push(recipe);
    });

    const newCount = recipes.length;
    console.log(`📊 After append: ${newCount} recipes (+${newCount - originalCount})`);

    // Track after state
    const afterCounts = {};
    recipes.forEach(recipe => {
        const slug = recipe.label_slug;
        afterCounts[slug] = (afterCounts[slug] || 0) + 1;
    });

    // Show improvements
    console.log("\n📈 CLASS IMPROVEMENTS:");
    const improvements = ['english_brown_ale', 'american_porter', 'oatmeal_stout'];
    improvements.forEach(style => {
        const before = beforeCounts[style] || 0;
        const after = afterCounts[style] || 0;
        const change = after - before;
        console.log(`  ${style}: ${before} → ${after} (+${change})`);
    });

    // Update metadata
    if (dataset._meta) {
        dataset._meta.count = newCount;
        dataset._meta.version = 'v6.1_tier1_expansion';
        dataset._meta.source += ' + tier1_batch_14';
    }

    // Write V6.1 dataset
    const outputPath = '_ml_dataset_v6_1.json';
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

    console.log(`\n✅ V6.1 dataset written: ${outputPath}`);

    // Check remaining under-represented classes
    const underRep = Object.entries(afterCounts).filter(([slug, count]) => count < 10).length;
    console.log(`\n⚠️  Remaining under-represented (<10): ${underRep} styles`);

    return {
        originalCount,
        newCount,
        addedCount: newCount - originalCount,
        improvements: improvements.map(style => ({
            style,
            before: beforeCounts[style] || 0,
            after: afterCounts[style] || 0,
            change: (afterCounts[style] || 0) - (beforeCounts[style] || 0)
        })),
        underRepresentedRemaining: underRep
    };
}

if (require.main === module) {
    main();
}

module.exports = { main };