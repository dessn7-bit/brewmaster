#!/usr/bin/env node

/**
 * BREWMASTER V6 - Alias Normalization Script
 *
 * FAZ 1: Onaylanan alias mapping'ini training data'ya uygula
 * Confusion matrix'in ~30%'unu oluşturan alias karmaşasını temizle
 */

const fs = require('fs');

// Load training data
const dataPath = '_ml_dataset_v6_3_complete.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`\n=== BREWMASTER V6 ALIAS NORMALIZATION ===`);
console.log(`Loaded dataset: ${data.records.length} recipes`);

// ONAYLANAN ALIAS MAPPING
const ALIAS_MAPPING = {
    // Geographic prefix consolidation
    'american_pale_ale': 'pale_ale',
    'belgian_pale_ale': 'pale_ale',
    'english_pale_ale': 'pale_ale',

    'american_brown_ale': 'brown_ale',
    'english_brown_ale': 'brown_ale',

    'american_porter': 'porter',
    'english_porter': 'porter',

    'american_stout': 'stout',
    'irish_stout': 'stout',

    'czech_pale_lager': 'pale_lager',
    'international_pale_lager': 'pale_lager',

    'czech_dark_lager': 'dark_lager',
    'european_dark_lager': 'dark_lager',

    'california_common_beer': 'common_beer',
    'kentucky_common_beer': 'common_beer',

    'english_ipa': 'ipa',
    'belgian_ipa': 'ipa',

    // Compound/redundant term removal
    'sweet_stout_or_cream_stout': 'sweet_stout',
    'belgian_strong_blonde_ale': 'belgian_blonde_ale',
    'belgian_gueuze': 'gueuze',
    'belgian_fruit_beer': 'fruit_beer',
    'south_german_weizenbock': 'weizenbock',
    'german_oktoberfest_festbier': 'festbier',
    'specialty_smoked_beer': 'smoked_beer',
    'style_smoked_beer': 'smoked_beer',
    'golden_or_blonde_ale': 'blonde_ale',
    'kellerbier_or_zwickelbier': 'kellerbier',
    'other_strong_ale_or_lager': 'strong_ale',
    'american_rye_beer': 'rye_beer',
    'american_cream_ale': 'cream_ale',
    'scottish_heavy_ale': 'scottish_heavy',
    'scottish_export_ale': 'scottish_export',
    'english_dark_mild_ale': 'mild',
    'english_pale_mild_ale': 'mild',
    'california_common': 'common_beer',
    'flanders_oud_bruin': 'oud_bruin',

    // Character variants (MEDIUM confidence)
    'american_wheat_beer': 'american_wheat_ale'
};

// Apply normalization
let changedCount = 0;
const changeLog = {};

data.records.forEach((recipe, idx) => {
    const originalSlug = recipe.label_slug;

    if (ALIAS_MAPPING[originalSlug]) {
        const newSlug = ALIAS_MAPPING[originalSlug];
        recipe.label_slug = newSlug;

        // Log change
        if (!changeLog[originalSlug]) {
            changeLog[originalSlug] = { newSlug, count: 0 };
        }
        changeLog[originalSlug].count++;
        changedCount++;

        console.log(`  Recipe ${idx}: ${originalSlug} → ${newSlug}`);
    }
});

console.log(`\n=== NORMALIZATION SUMMARY ===`);
console.log(`Total recipes changed: ${changedCount}`);
console.log(`Unique aliases normalized: ${Object.keys(changeLog).length}`);

console.log(`\nCHANGE BREAKDOWN:`);
Object.entries(changeLog)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([oldSlug, info]) => {
        console.log(`  ${oldSlug} → ${info.newSlug} (${info.count} recipes)`);
    });

// Update metadata
data._meta.version = 'v6_normalized';
data._meta.normalized_at = new Date().toISOString();
data._meta.changes_count = changedCount;
data._meta.alias_mapping = Object.keys(changeLog).length;

// Count new distribution
const newDistribution = {};
data.records.forEach(recipe => {
    const slug = recipe.label_slug;
    newDistribution[slug] = (newDistribution[slug] || 0) + 1;
});

const sortedDist = Object.entries(newDistribution)
    .sort((a, b) => b[1] - a[1]);

console.log(`\nNEW STYLE DISTRIBUTION (TOP 20):`);
sortedDist.slice(0, 20).forEach(([slug, count]) => {
    console.log(`  ${slug}: ${count} recipes`);
});

console.log(`\nUNIQUE STYLES: ${sortedDist.length} (was 179)`);

// Save normalized dataset
const normalizedPath = '_ml_dataset_v6_normalized.json';
fs.writeFileSync(normalizedPath, JSON.stringify(data, null, 2));

console.log(`\nNormalized dataset saved: ${normalizedPath}`);

// Save change log
fs.writeFileSync('_alias_normalization_log_v6.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    recipes_changed: changedCount,
    aliases_normalized: Object.keys(changeLog).length,
    mapping: ALIAS_MAPPING,
    change_log: changeLog,
    new_distribution: newDistribution
}, null, 2));

console.log(`Change log saved: _alias_normalization_log_v6.json`);
console.log(`\nNext: Run baseline LOOCV on normalized data to measure improvement.`);