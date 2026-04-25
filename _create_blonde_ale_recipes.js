#!/usr/bin/env node
/**
 * FAZ 2A: BLONDE ALE Expansion
 *
 * Add 5 blonde ale recipes to reach 10+ examples (currently 5)
 * American foundation style - light, approachable, gateway beers
 */

const fs = require('fs');

// Blonde ale recipes covering different regional/style interpretations
const BLONDE_ALE_RECIPES = [
    {
        id: 'blonde_001_american',
        source: 'sam_adams_summer_ale_inspired',
        name: 'American Blonde Ale',
        label_slug: 'blonde_ale',
        label_family: 'blonde_ale',
        label_ferm: 'ale',
        features: {
            og: 1.045,
            fg: 1.008,
            abv: 4.9,
            ibu: 18,
            srm: 4,
            // Malt bill - Clean American blonde
            pct_pilsner: 70,   // Light pilsner base
            pct_base: 25,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 5,      // Light wheat for smoothness
            pct_oats: 0,
            pct_crystal: 0,    // Minimal crystal to stay light
            pct_choc: 0,
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
            total_adjunct: 5,
            crystal_ratio: 0,
            // Yeast - American ale
            yeast_english: 0,
            yeast_american: 1,
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
            // Hops - Light American
            hop_american_c: 1, // Light American hops
            hop_english: 0,
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
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1      // Light color
        }
    },

    {
        id: 'blonde_002_honey',
        source: 'redstone_honey_blonde_inspired',
        name: 'Honey Blonde Ale',
        label_slug: 'blonde_ale',
        label_family: 'blonde_ale',
        label_ferm: 'ale',
        features: {
            og: 1.048,
            fg: 1.010,
            abv: 5.0,
            ibu: 15,
            srm: 5,
            // Malt bill - Honey blonde
            pct_pilsner: 65,
            pct_base: 30,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 5,
            pct_oats: 0,
            pct_crystal: 0,
            pct_choc: 0,
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
            total_adjunct: 5,
            crystal_ratio: 0,
            // Yeast - American ale
            yeast_english: 0,
            yeast_american: 1,
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
            // Hops - Very light
            hop_american_c: 0,
            hop_english: 1,    // Mild English hops
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 0,
            hop_aged: 0,
            hop_northern_brewer: 0,
            // Additives
            katki_lactose: 0,
            katki_fruit: 0,
            katki_spice_herb: 0,
            katki_chocolate: 0,
            katki_coffee: 0,
            katki_chile: 0,
            katki_smoke: 0,
            katki_honey: 1,    // KEY: Honey addition
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 0,
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1
        }
    },

    {
        id: 'blonde_003_kolsch_style',
        source: 'gaffel_kolsch_inspired',
        name: 'Kölsch-Style Blonde',
        label_slug: 'blonde_ale',
        label_family: 'blonde_ale',
        label_ferm: 'ale',
        features: {
            og: 1.044,
            fg: 1.008,
            abv: 4.8,
            ibu: 22,
            srm: 3,
            // Malt bill - Kölsch-style
            pct_pilsner: 90,   // High pilsner content
            pct_base: 10,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 0,
            pct_choc: 0,
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
            crystal_ratio: 0,
            // Yeast - Kölsch-style
            yeast_english: 0,
            yeast_american: 0,
            yeast_belgian: 0,
            yeast_saison: 0,
            yeast_wheat_german: 0,
            yeast_german_lager: 0,
            yeast_czech_lager: 0,
            yeast_american_lager: 0,
            yeast_kolsch: 1,   // Kölsch yeast
            yeast_altbier: 0,
            yeast_cal_common: 0,
            yeast_brett: 0,
            yeast_lacto: 0,
            yeast_sour_blend: 0,
            yeast_kveik: 0,
            yeast_wit: 0,
            // Hops - German noble
            hop_american_c: 0,
            hop_english: 0,
            hop_german: 1,     // German noble hops
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
            pale_color: 1
        }
    },

    {
        id: 'blonde_004_wheat',
        source: 'boulevard_unfiltered_wheat_inspired',
        name: 'Wheat Blonde Ale',
        label_slug: 'blonde_ale',
        label_family: 'blonde_ale',
        label_ferm: 'ale',
        features: {
            og: 1.046,
            fg: 1.010,
            abv: 4.7,
            ibu: 16,
            srm: 6,
            // Malt bill - High wheat blonde
            pct_pilsner: 50,
            pct_base: 25,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 25,     // HIGH: Wheat content
            pct_oats: 0,
            pct_crystal: 0,
            pct_choc: 0,
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
            total_adjunct: 25,
            crystal_ratio: 0,
            // Yeast - American wheat
            yeast_english: 0,
            yeast_american: 1, // American wheat yeast character
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
            // Hops - Light American
            hop_american_c: 1,
            hop_english: 0,
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
            pale_color: 1
        }
    },

    {
        id: 'blonde_005_belgian_style',
        source: 'stella_artois_inspired',
        name: 'Belgian-Style Blonde',
        label_slug: 'blonde_ale',
        label_family: 'blonde_ale',
        label_ferm: 'ale',
        features: {
            og: 1.050,
            fg: 1.010,
            abv: 5.3,
            ibu: 25,
            srm: 5,
            // Malt bill - Belgian style
            pct_pilsner: 80,   // European pilsner
            pct_base: 15,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 0,
            pct_choc: 0,
            pct_roast: 0,
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 5,      // Belgian candi sugar
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 0,
            total_adjunct: 5,
            crystal_ratio: 0,
            // Yeast - Belgian ale
            yeast_english: 0,
            yeast_american: 0,
            yeast_belgian: 1,  // Belgian character
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
            // Hops - European noble
            hop_american_c: 0,
            hop_english: 0,
            hop_german: 1,     // German/Czech noble hops
            hop_czech_saaz: 1,
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
            pale_color: 1
        }
    }
];

console.log("🍺 FAZ 2A: BLONDE ALE RECIPE EXPANSION");
console.log("=====================================");

// Load current dataset
const currentData = JSON.parse(fs.readFileSync('_ml_dataset_v6_ipa_expanded.json', 'utf8'));

console.log(`Current dataset: ${currentData.records.length} recipes`);

// Count current blonde ale examples
const currentBlondes = currentData.records.filter(r => r.label_slug === 'blonde_ale');
console.log(`Current 'blonde_ale' examples: ${currentBlondes.length}`);

// Add new blonde ale recipes
BLONDE_ALE_RECIPES.forEach((recipe, idx) => {
    currentData.records.push(recipe);
    console.log(`Added: ${recipe.name} (${recipe.source})`);
});

// Update metadata
currentData._meta.version = 'v6_normalized_foundation_4_expanded';
currentData._meta.blonde_expansion_at = new Date().toISOString();
currentData._meta.blonde_recipes_added = BLONDE_ALE_RECIPES.length;

console.log(`\nUpdated dataset: ${currentData.records.length} recipes`);
console.log(`New 'blonde_ale' total: ${currentBlondes.length + BLONDE_ALE_RECIPES.length} examples`);

// Save expanded dataset
const expandedPath = '_ml_dataset_v6_foundation_4_expanded.json';
fs.writeFileSync(expandedPath, JSON.stringify(currentData, null, 2));

console.log(`\n✅ Foundation-4-expanded dataset saved: ${expandedPath}`);

// Update batch 2A progress - 4/6 foundation styles complete
const batch2a_progress = {
    timestamp: new Date().toISOString(),
    batch: 'BATCH_2A_FOUNDATION_STYLES',
    completed: ['stout', 'mild', 'ipa', 'blonde_ale'],
    remaining: ['porter', 'brown_ale'],
    total_recipes_added_so_far: 19, // 6+2+6+5
    style_counts_after_expansion: {
        stout: 11,
        mild: 11,
        ipa: 10,
        blonde_ale: 10
    },
    under_10_count_reduction: '113 → 109 (4 styles fixed)',
    next_targets: 'porter (0 examples - consolidated) & brown_ale (0 examples - consolidated)',
    notes: {
        foundation_progress: '4/6 complete (67%)',
        consolidated_styles_remaining: 'porter and brown_ale need rebuilding from alias consolidation'
    }
};

fs.writeFileSync('_batch_2a_progress.json', JSON.stringify(batch2a_progress, null, 2));

console.log("\n📊 BLONDE ALE ARCHETYPE COVERAGE:");
console.log("1. American Blonde (Sam Adams style)");
console.log("2. Honey Blonde (Redstone style)");
console.log("3. Kölsch-Style Blonde (German technique)");
console.log("4. Wheat Blonde (High wheat content)");
console.log("5. Belgian-Style Blonde (Stella Artois style)");

console.log("\n📊 BATCH 2A PROGRESS:");
console.log(`✅ Completed: ${batch2a_progress.completed.join(', ')} (4/6)`);
console.log(`📋 Remaining: ${batch2a_progress.remaining.join(', ')} (2/6)`);
console.log(`📈 Under-represented reduction: ${batch2a_progress.under_10_count_reduction}`);
console.log(`📊 Total recipes added: ${batch2a_progress.total_recipes_added_so_far}`);

console.log(`\n🎯 Next Phase: BATCH 2B - Consolidated Styles`);
console.log("porter (0 examples) & brown_ale (0 examples)");
console.log("These were emptied by alias consolidation, need rebuilding");