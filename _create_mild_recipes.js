#!/usr/bin/env node
/**
 * FAZ 2A: MILD Expansion
 *
 * Add recipes to reach 10+ examples for 'mild' (currently 9)
 * British foundation style - low ABV, malty, session ales
 */

const fs = require('fs');

// Authentic mild ale recipes based on BJCP guidelines and traditional examples
const MILD_RECIPES = [
    {
        id: 'mild_001_dark',
        source: 'hobsons_mild_clone',
        name: 'Dark Mild (Traditional)',
        label_slug: 'mild',
        label_family: 'mild',
        label_ferm: 'ale',
        features: {
            og: 1.038,
            fg: 1.010,
            abv: 3.7,
            ibu: 20,
            srm: 22,
            // Malt bill - Dark mild
            pct_pilsner: 0,
            pct_base: 75,      // British pale malt
            pct_munich: 8,     // Munich for malty sweetness
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 12,   // Crystal 80L for color/sweetness
            pct_choc: 3,       // Chocolate malt for color
            pct_roast: 2,      // Light roasted barley
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 17,
            total_adjunct: 0,
            crystal_ratio: 12,
            // Yeast - English ale
            yeast_english: 1,
            yeast_american: 0,
            yeast_belgian: 0,
            yeast_saison: 0,
            yeast_wheat_german: 0,
            yeast_german_lager: 0,
            yeast_czech_lager: 0,
            yeast_american_lager: 0,
            yeast_kolsch: 0,
            yeast_altbier: 0,
            yeast_cal_common: 0,
            yeast_brett: 0,
            yeast_lacto: 0,
            yeast_sour_blend: 0,
            yeast_kveik: 0,
            yeast_wit: 0,
            // Hops - Low hop character
            hop_american_c: 0,
            hop_english: 1,    // Traditional English hops
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 0,
            hop_aged: 0,
            hop_northern_brewer: 0,
            // No additives
            katki_lactose: 0,
            katki_fruit: 0,
            katki_spice_herb: 0,
            katki_chocolate: 0,
            katki_coffee: 0,
            katki_chile: 0,
            katki_smoke: 0,
            katki_honey: 0,
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 0,       // Low hop character
            strong_abv: 0,     // Session strength
            dark_color: 1,     // Dark mild
            pale_color: 0
        }
    },

    {
        id: 'mild_002_light',
        source: 'harveys_knots_of_may_inspired',
        name: 'Light Mild (Golden)',
        label_slug: 'mild',
        label_family: 'mild',
        label_ferm: 'ale',
        features: {
            og: 1.035,
            fg: 1.008,
            abv: 3.5,
            ibu: 18,
            srm: 8,
            // Malt bill - Light mild
            pct_pilsner: 0,
            pct_base: 85,      // British pale malt base
            pct_munich: 8,     // Munich for malty character
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 7,    // Crystal 60L for sweetness
            pct_choc: 0,       // No dark malts
            pct_roast: 0,
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 0,
            total_adjunct: 0,
            crystal_ratio: 7,
            // Yeast - English ale
            yeast_english: 1,
            yeast_american: 0,
            yeast_belgian: 0,
            yeast_saison: 0,
            yeast_wheat_german: 0,
            yeast_german_lager: 0,
            yeast_czech_lager: 0,
            yeast_american_lager: 0,
            yeast_kolsch: 0,
            yeast_altbier: 0,
            yeast_cal_common: 0,
            yeast_brett: 0,
            yeast_lacto: 0,
            yeast_sour_blend: 0,
            yeast_kveik: 0,
            yeast_wit: 0,
            // Hops
            hop_american_c: 0,
            hop_english: 1,    // English hops
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 0,
            hop_aged: 0,
            hop_northern_brewer: 0,
            // No additives
            katki_lactose: 0,
            katki_fruit: 0,
            katki_spice_herb: 0,
            katki_chocolate: 0,
            katki_coffee: 0,
            katki_chile: 0,
            katki_smoke: 0,
            katki_honey: 0,
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 0,
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1      // Light mild
        }
    }
];

console.log("🍺 FAZ 2A: MILD RECIPE EXPANSION");
console.log("===============================");

// Load stout-expanded dataset
const currentData = JSON.parse(fs.readFileSync('_ml_dataset_v6_stout_expanded.json', 'utf8'));

console.log(`Current dataset: ${currentData.records.length} recipes`);

// Count current mild examples
const currentMilds = currentData.records.filter(r => r.label_slug === 'mild');
console.log(`Current 'mild' examples: ${currentMilds.length}`);

// Add new mild recipes
MILD_RECIPES.forEach((recipe, idx) => {
    currentData.records.push(recipe);
    console.log(`Added: ${recipe.name} (${recipe.source})`);
});

// Update metadata
currentData._meta.version = 'v6_normalized_stout_mild_expansion';
currentData._meta.mild_expansion_at = new Date().toISOString();
currentData._meta.mild_recipes_added = MILD_RECIPES.length;

console.log(`\nUpdated dataset: ${currentData.records.length} recipes`);
console.log(`New 'mild' total: ${currentMilds.length + MILD_RECIPES.length} examples`);

// Save expanded dataset
const expandedPath = '_ml_dataset_v6_mild_expanded.json';
fs.writeFileSync(expandedPath, JSON.stringify(currentData, null, 2));

console.log(`\n✅ Mild-expanded dataset saved: ${expandedPath}`);

// Create batch 2A summary so far
const batch2a_progress = {
    timestamp: new Date().toISOString(),
    batch: 'BATCH_2A_FOUNDATION_STYLES',
    completed: ['stout', 'mild'],
    remaining: ['ipa', 'blonde_ale', 'porter', 'brown_ale'],
    total_recipes_added_so_far: 8, // 6 stout + 2 mild
    style_counts_after_expansion: {
        stout: 11,
        mild: 11
    },
    under_10_count_reduction: '113 → 111 (2 styles fixed)',
    next_target: 'ipa (currently 4 examples)'
};

fs.writeFileSync('_batch_2a_progress.json', JSON.stringify(batch2a_progress, null, 2));

console.log("\n📊 BATCH 2A PROGRESS:");
console.log(`✅ Completed: ${batch2a_progress.completed.join(', ')}`);
console.log(`📋 Remaining: ${batch2a_progress.remaining.join(', ')}`);
console.log(`📈 Under-represented reduction: ${batch2a_progress.under_10_count_reduction}`);

console.log(`\n🎯 Next: IPA expansion (4 → 10+ examples)`);
console.log("⚠️ Note: 'ipa' has conflict with 'american_india_pale_ale' (59 examples)");
console.log("Strategy: Add non-American IPA variants (English, Belgian, etc.)");