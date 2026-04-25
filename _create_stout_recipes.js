#!/usr/bin/env node
/**
 * FAZ 2 - Batch 2A: Foundation Styles - STOUT Expansion
 *
 * Add 6 authentic stout recipes to reach 10+ examples
 * Focus on archetype coverage: Irish Dry, Imperial, Sweet, American
 */

const fs = require('fs');

// Authentic stout recipes based on commercial examples and BJCP guidelines
const STOUT_RECIPES = [
    {
        id: 'stout_001_guinness',
        source: 'guinness_extra_stout_clone',
        name: 'Guinness Extra Stout Clone',
        label_slug: 'stout',
        label_family: 'stout',
        label_ferm: 'ale',
        features: {
            og: 1.042,
            fg: 1.010,
            abv: 4.2,
            ibu: 45,
            srm: 40,
            // Malt bill
            pct_pilsner: 0,
            pct_base: 75,      // Pale malt base
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 0,
            pct_choc: 8,       // Chocolate malt
            pct_roast: 15,     // Roasted barley (signature)
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 2,      // Small amount for dryness
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived features
            total_dark: 23,
            total_adjunct: 2,
            crystal_ratio: 0,
            // Yeast
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
            hop_english: 1,    // EKG
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
            katki_honey: 0,
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 0,
            strong_abv: 0,
            dark_color: 1,
            pale_color: 0
        }
    },

    {
        id: 'stout_002_imperial',
        source: 'founders_breakfast_stout_inspired',
        name: 'Imperial Stout (Breakfast Style)',
        label_slug: 'stout',
        label_family: 'stout',
        label_ferm: 'ale',
        features: {
            og: 1.080,
            fg: 1.018,
            abv: 8.3,
            ibu: 60,
            srm: 45,
            // Malt bill - Imperial stout
            pct_pilsner: 0,
            pct_base: 65,
            pct_munich: 5,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 3,       // Smooth mouthfeel
            pct_crystal: 8,    // Crystal 60L
            pct_choc: 12,      // Chocolate malt
            pct_roast: 7,      // Roasted barley
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 27,
            total_adjunct: 3,
            crystal_ratio: 8,
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
            // Hops
            hop_american_c: 1, // American hops
            hop_english: 0,
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 0,
            hop_aged: 0,
            hop_northern_brewer: 0,
            // Additives
            katki_lactose: 0,
            katki_fruit: 0,
            katki_spice_herb: 0,
            katki_chocolate: 1, // Chocolate addition
            katki_coffee: 1,    // Coffee addition
            katki_chile: 0,
            katki_smoke: 0,
            katki_honey: 0,
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 0,
            strong_abv: 1,     // Imperial strength
            dark_color: 1,
            pale_color: 0
        }
    },

    {
        id: 'stout_003_milk',
        source: 'left_hand_milk_stout_clone',
        name: 'Milk Stout (Sweet Stout)',
        label_slug: 'stout',
        label_family: 'stout',
        label_ferm: 'ale',
        features: {
            og: 1.049,
            fg: 1.014,
            abv: 4.6,
            ibu: 25,
            srm: 35,
            // Malt bill - Sweet stout
            pct_pilsner: 0,
            pct_base: 70,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 5,      // Wheat for smoothness
            pct_oats: 5,       // Oats for creaminess
            pct_crystal: 12,   // Crystal 80L for sweetness
            pct_choc: 6,       // Chocolate malt
            pct_roast: 2,      // Light roasted barley
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 20,
            total_adjunct: 10,
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
            // Hops
            hop_american_c: 0,
            hop_english: 1,    // Mild English hops
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 0,
            hop_aged: 0,
            hop_northern_brewer: 0,
            // Additives
            katki_lactose: 1,  // KEY: Lactose for sweetness
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
            dark_color: 1,
            pale_color: 0
        }
    },

    {
        id: 'stout_004_american',
        source: 'sierra_nevada_stout_inspired',
        name: 'American Stout (Hoppy)',
        label_slug: 'stout',
        label_family: 'stout',
        label_ferm: 'ale',
        features: {
            og: 1.055,
            fg: 1.012,
            abv: 5.7,
            ibu: 55,
            srm: 42,
            // Malt bill - American stout
            pct_pilsner: 0,
            pct_base: 68,
            pct_munich: 5,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 10,   // Crystal 40L
            pct_choc: 10,      // Chocolate malt
            pct_roast: 7,      // Roasted barley
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 27,
            total_adjunct: 0,
            crystal_ratio: 10,
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
            // Hops
            hop_american_c: 1, // American C-hops
            hop_english: 0,
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
            katki_honey: 0,
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 1,       // High hop character
            strong_abv: 0,
            dark_color: 1,
            pale_color: 0
        }
    },

    {
        id: 'stout_005_oatmeal',
        source: 'samuel_smith_oatmeal_stout_clone',
        name: 'Oatmeal Stout (English)',
        label_slug: 'stout',
        label_family: 'stout',
        label_ferm: 'ale',
        features: {
            og: 1.048,
            fg: 1.012,
            abv: 4.8,
            ibu: 35,
            srm: 38,
            // Malt bill - Oatmeal stout
            pct_pilsner: 0,
            pct_base: 65,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 15,      // HIGH: Oats for signature smoothness
            pct_crystal: 10,   // Crystal 60L
            pct_choc: 8,       // Chocolate malt
            pct_roast: 2,      // Light roasted barley
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 20,
            total_adjunct: 15,
            crystal_ratio: 10,
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
            // Additives
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
            dark_color: 1,
            pale_color: 0
        }
    },

    {
        id: 'stout_006_export',
        source: 'coopers_extra_stout_inspired',
        name: 'Export Stout (Foreign Extra)',
        label_slug: 'stout',
        label_family: 'stout',
        label_ferm: 'ale',
        features: {
            og: 1.056,
            fg: 1.012,
            abv: 5.8,
            ibu: 50,
            srm: 44,
            // Malt bill - Export stout
            pct_pilsner: 0,
            pct_base: 72,
            pct_munich: 3,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 8,    // Crystal 80L
            pct_choc: 10,      // Chocolate malt
            pct_roast: 7,      // Roasted barley
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 25,
            total_adjunct: 0,
            crystal_ratio: 8,
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
            hop_english: 1,    // Traditional English hops
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
            katki_honey: 0,
            katki_pumpkin: 0,
            katki_salt: 0,
            // Style markers
            high_hop: 0,
            strong_abv: 0,
            dark_color: 1,
            pale_color: 0
        }
    }
];

console.log("🍺 FAZ 2A: STOUT RECIPE EXPANSION");
console.log("================================");
console.log(`Adding ${STOUT_RECIPES.length} stout recipes for archetype coverage`);

// Load normalized dataset
const normalizedData = JSON.parse(fs.readFileSync('_ml_dataset_v6_normalized.json', 'utf8'));

console.log(`\nCurrent dataset: ${normalizedData.records.length} recipes`);

// Count current stout examples
const currentStouts = normalizedData.records.filter(r => r.label_slug === 'stout');
console.log(`Current 'stout' examples: ${currentStouts.length}`);

// Add new stout recipes
STOUT_RECIPES.forEach((recipe, idx) => {
    normalizedData.records.push(recipe);
    console.log(`Added: ${recipe.name} (${recipe.source})`);
});

// Update metadata
normalizedData._meta.version = 'v6_normalized_stout_expansion';
normalizedData._meta.stout_expansion_at = new Date().toISOString();
normalizedData._meta.stout_recipes_added = STOUT_RECIPES.length;

console.log(`\nUpdated dataset: ${normalizedData.records.length} recipes`);
console.log(`New 'stout' total: ${currentStouts.length + STOUT_RECIPES.length} examples`);

// Save expanded dataset
const expandedPath = '_ml_dataset_v6_stout_expanded.json';
fs.writeFileSync(expandedPath, JSON.stringify(normalizedData, null, 2));

console.log(`\n✅ Stout-expanded dataset saved: ${expandedPath}`);

// Create summary report
const report = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_2A_STOUT_EXPANSION',
    recipes_added: STOUT_RECIPES.length,
    stout_count_before: currentStouts.length,
    stout_count_after: currentStouts.length + STOUT_RECIPES.length,
    total_recipes_before: normalizedData.records.length - STOUT_RECIPES.length,
    total_recipes_after: normalizedData.records.length,
    archetype_coverage: [
        'Irish Dry Stout (Guinness style)',
        'Imperial Stout (American strong)',
        'Milk Stout (Sweet, lactose)',
        'American Stout (Hoppy)',
        'Oatmeal Stout (Smooth)',
        'Export Stout (Foreign Extra)'
    ]
};

fs.writeFileSync('_stout_expansion_report.json', JSON.stringify(report, null, 2));

console.log("\n📊 ARCHETYPE COVERAGE:");
report.archetype_coverage.forEach((archetype, idx) => {
    console.log(`${idx + 1}. ${archetype}`);
});

console.log(`\n📋 Next: Test stout classification accuracy with expanded dataset`);
console.log("🎯 Target: Verify 'stout' category no longer under-represented");