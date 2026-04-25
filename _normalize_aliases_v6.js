#!/usr/bin/env node
/**
 * Faz 1: Training data alias normalizasyonu
 * V5 → V6 label space cleanup
 */
const fs = require('fs');

// Alias mapping table (eski → yeni)
const ALIAS_MAP = {
  'doppelbock': 'german_doppelbock',
  'schwarzbier': 'german_schwarzbier',
  'american_wild': 'american_wild_ale',
  'fruit_lambic': 'belgian_fruit_lambic',
  'biere_de_garde': 'french_biere_de_garde',
  'french_bi_re_de_garde': 'french_biere_de_garde',
  'belgian_speciale_belge': 'belgian_pale_ale',
  'american_barley_wine_ale': 'american_barleywine',
  'german_kolsch': 'german_koelsch',
  'italian_pilsener': 'italian_pilsner',
  'lambic': 'belgian_lambic',
  'wild_beer': 'american_wild_ale',  // Assuming same as american_wild_ale
  'english_barleywine': 'british_barley_wine_ale'
};

function main() {
    console.log("🔄 Faz 1: Alias normalizasyon başlıyor...");

    // Load dataset
    const dataset = JSON.parse(fs.readFileSync('_ml_dataset.json', 'utf8'));

    // Find data key
    let dataKey = null;
    for (const key in dataset) {
        if (Array.isArray(dataset[key]) && dataset[key].length > 0 && dataset[key][0].label_slug) {
            dataKey = key;
            break;
        }
    }

    if (!dataKey) {
        console.error("❌ ERROR: Dataset recipes not found");
        process.exit(1);
    }

    const recipes = dataset[dataKey];
    console.log(`📊 Total recipes: ${recipes.length}`);

    // Track changes
    const changes = {};
    let totalChanges = 0;

    // Normalize labels
    recipes.forEach((recipe, idx) => {
        const oldLabel = recipe.label_slug;
        if (ALIAS_MAP[oldLabel]) {
            const newLabel = ALIAS_MAP[oldLabel];
            recipe.label_slug = newLabel;

            // Track changes
            if (!changes[oldLabel]) changes[oldLabel] = { old: oldLabel, new: newLabel, count: 0 };
            changes[oldLabel].count++;
            totalChanges++;

            console.log(`  ${idx}: ${oldLabel} → ${newLabel}`);
        }
    });

    // Summary
    console.log("\n📈 NORMALIZASYON SONUÇLARI:");
    console.log(`Total değişiklik: ${totalChanges} reçete`);

    Object.values(changes).forEach(change => {
        console.log(`  ${change.old} → ${change.new}: ${change.count} reçete`);
    });

    // Update meta
    if (dataset._meta) {
        dataset._meta.version = 'v6.0_alias_normalized';
        dataset._meta.source += ' + alias_normalization';
    }

    // Write back
    const outputPath = '_ml_dataset_v6.json';
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

    console.log(`\n✅ Normalized dataset written: ${outputPath}`);

    // Generate class distribution report
    const slugCounts = {};
    recipes.forEach(recipe => {
        const slug = recipe.label_slug;
        slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    });

    const sorted = Object.entries(slugCounts).sort(([,a], [,b]) => b - a);

    console.log("\n📊 TOP 20 CLASS DISTRIBUTION (Post-normalization):");
    sorted.slice(0, 20).forEach(([slug, count]) => {
        console.log(`  ${slug}: ${count} reçete`);
    });

    // Find under-represented classes
    const underRepresented = sorted.filter(([slug, count]) => count < 10);
    console.log(`\n⚠️  Under-represented classes (<10 examples): ${underRepresented.length}/${sorted.length}`);

    return {
        totalRecipes: recipes.length,
        totalChanges: totalChanges,
        changedLabels: Object.keys(changes).length,
        underRepresentedCount: underRepresented.length,
        totalUniqueLabels: sorted.length
    };
}

if (require.main === module) {
    main();
}

module.exports = { main, ALIAS_MAP };