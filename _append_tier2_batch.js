#!/usr/bin/env node
/**
 * Append Tier 2 craft recipes to V6.1 dataset
 * Modern craft beer styles expansion
 */
const fs = require('fs');
const { tier2Recipes } = require('./_create_tier2_recipes.js');

function main() {
    console.log("📈 Faz 2 Batch 2: Tier 2 craft stiller append işlemi");

    // Load V6.1 dataset
    const dataset = JSON.parse(fs.readFileSync('_ml_dataset_v6_1.json', 'utf8'));

    const recipes = dataset.records;
    const originalCount = recipes.length;
    console.log(`📊 Original V6.1 dataset: ${originalCount} recipes`);

    // Track before state
    const beforeCounts = {};
    recipes.forEach(recipe => {
        const slug = recipe.label_slug;
        beforeCounts[slug] = (beforeCounts[slug] || 0) + 1;
    });

    // Append Tier 2 recipes
    tier2Recipes.forEach(recipe => {
        recipes.push(recipe);
    });

    const newCount = recipes.length;
    console.log(`📊 After Tier 2 append: ${newCount} recipes (+${newCount - originalCount})`);

    // Track after state
    const afterCounts = {};
    recipes.forEach(recipe => {
        const slug = recipe.label_slug;
        afterCounts[slug] = (afterCounts[slug] || 0) + 1;
    });

    // Show improvements
    console.log("\n📈 TIER 2 CRAFT IMPROVEMENTS:");
    const improvements = ['session_india_pale_ale', 'black_ipa', 'white_ipa', 'brut_ipa'];
    improvements.forEach(style => {
        const before = beforeCounts[style] || 0;
        const after = afterCounts[style] || 0;
        const change = after - before;
        const target = style === 'session_india_pale_ale' ? 10 :
                      style === 'black_ipa' ? 10 :
                      8; // white_ipa, brut_ipa target 8
        const status = after >= target ? '✅' : '⚠️';
        console.log(`  ${style}: ${before} → ${after} (+${change}) ${status} Target: ${target}`);
    });

    // Update metadata
    if (dataset._meta) {
        dataset._meta.count = newCount;
        dataset._meta.version = 'v6.2_tier2_craft_expansion';
        dataset._meta.source += ' + tier2_craft_26';
    }

    // Write V6.2 dataset
    const outputPath = '_ml_dataset_v6_2.json';
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

    console.log(`\n✅ V6.2 dataset written: ${outputPath}`);

    // Total progress summary
    console.log("\n📊 FAZA 2 TOTAL PROGRESS SUMMARY:");
    console.log(`V6.0 → V6.2: 1031 → ${newCount} recipes (+${newCount - 1031})`);

    // Under-represented classes check
    const underRep = Object.entries(afterCounts).filter(([slug, count]) => count < 10).length;
    console.log(`Under-represented classes (<10): ${underRep} styles`);

    const tier1And2Styles = [
        'english_brown_ale', 'american_porter', 'oatmeal_stout',
        'session_india_pale_ale', 'black_ipa', 'white_ipa', 'brut_ipa'
    ];

    console.log("\n🎯 TIER 1+2 FINAL STATUS:");
    tier1And2Styles.forEach(style => {
        const count = afterCounts[style] || 0;
        const target = ['white_ipa', 'brut_ipa'].includes(style) ? 8 :
                      style === 'session_india_pale_ale' || style === 'black_ipa' ? 10 : 12;
        const status = count >= target ? '✅' : '❌';
        console.log(`  ${style}: ${count} recipes ${status} (target: ${target})`);
    });

    return {
        originalCount,
        newCount,
        addedCount: newCount - originalCount,
        totalV6Progress: newCount - 1031,
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