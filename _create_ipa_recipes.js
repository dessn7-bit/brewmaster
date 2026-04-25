#!/usr/bin/env node
/**
 * FAZ 2A: IPA Expansion
 *
 * Add 6 IPA recipes to reach 10+ examples for 'ipa' (currently 4)
 * Focus on NON-AMERICAN IPA variants to differentiate from 'american_india_pale_ale'
 * English, Belgian, Historical, Session variants
 */

const fs = require('fs');

// Non-American IPA recipes to differentiate from American IPA category
const IPA_RECIPES = [
    {
        id: 'ipa_001_english',
        source: 'fuller_ipa_clone',
        name: 'English IPA (Traditional)',
        label_slug: 'ipa',
        label_family: 'ipa',
        label_ferm: 'ale',
        features: {
            og: 1.050,
            fg: 1.012,
            abv: 5.0,
            ibu: 40,
            srm: 8,
            // Malt bill - English IPA
            pct_pilsner: 0,
            pct_base: 88,      // British pale malt
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 12,   // Crystal 40L for traditional character
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
            // Hops - Traditional English
            hop_american_c: 0,
            hop_english: 1,    // EKG, Fuggles traditional
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
            high_hop: 1,       // Hoppy but traditional
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1
        }
    },

    {
        id: 'ipa_002_session',
        source: 'founders_all_day_ipa_inspired',
        name: 'Session IPA (Low ABV)',
        label_slug: 'ipa',
        label_family: 'ipa',
        label_ferm: 'ale',
        features: {
            og: 1.040,
            fg: 1.008,
            abv: 4.2,
            ibu: 42,
            srm: 5,
            // Malt bill - Session IPA
            pct_pilsner: 60,   // Light base
            pct_base: 35,
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 5,      // Light wheat for mouthfeel
            pct_oats: 0,
            pct_crystal: 0,    // Minimal crystal for dryness
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
            // Yeast - American ale for attenuation
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
            // Hops - Modern but not American C-hop dominant
            hop_american_c: 0,
            hop_english: 0,
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 1,         // New Zealand hops for distinction
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
            high_hop: 1,
            strong_abv: 0,     // Session strength
            dark_color: 0,
            pale_color: 1
        }
    },

    {
        id: 'ipa_003_belgian',
        source: 'houblon_chouffe_inspired',
        name: 'Belgian IPA',
        label_slug: 'ipa',
        label_family: 'ipa',
        label_ferm: 'ale',
        features: {
            og: 1.058,
            fg: 1.010,
            abv: 6.3,
            ibu: 54,
            srm: 7,
            // Malt bill - Belgian IPA
            pct_pilsner: 75,   // European pilsner
            pct_base: 15,
            pct_munich: 5,
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
            yeast_belgian: 1,  // KEY: Belgian yeast character
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
            // Hops - American/New World in Belgian style
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
            high_hop: 1,
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1
        }
    },

    {
        id: 'ipa_004_black',
        source: 'stone_sublimely_self_righteous_inspired',
        name: 'Black IPA',
        label_slug: 'ipa',
        label_family: 'ipa',
        label_ferm: 'ale',
        features: {
            og: 1.065,
            fg: 1.012,
            abv: 7.0,
            ibu: 70,
            srm: 35,
            // Malt bill - Black IPA
            pct_pilsner: 0,
            pct_base: 75,
            pct_munich: 5,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 8,    // Crystal for balance
            pct_choc: 7,       // Chocolate malt for color
            pct_roast: 5,      // Careful roasted character
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 20,
            total_adjunct: 0,
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
            // Hops - American C-hops
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
            high_hop: 1,
            strong_abv: 1,     // Strong IPA
            dark_color: 1,     // BLACK IPA
            pale_color: 0
        }
    },

    {
        id: 'ipa_005_rye',
        source: 'founders_red_rye_ipa_inspired',
        name: 'Rye IPA',
        label_slug: 'ipa',
        label_family: 'ipa',
        label_ferm: 'ale',
        features: {
            og: 1.060,
            fg: 1.010,
            abv: 6.6,
            ibu: 65,
            srm: 12,
            // Malt bill - Rye IPA
            pct_pilsner: 0,
            pct_base: 65,
            pct_munich: 5,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 10,   // Crystal 40L
            pct_choc: 0,
            pct_roast: 0,
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 0,
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 20,       // KEY: High rye content
            pct_sixrow: 0,
            // Derived
            total_dark: 0,
            total_adjunct: 20, // Rye counted as adjunct
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
            // Hops - American C-hops
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
            high_hop: 1,
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1
        }
    },

    {
        id: 'ipa_006_historical',
        source: 'burton_ipa_1850s_reproduction',
        name: 'Historical Burton IPA',
        label_slug: 'ipa',
        label_family: 'ipa',
        label_ferm: 'ale',
        features: {
            og: 1.055,
            fg: 1.014,
            abv: 5.4,
            ibu: 55,
            srm: 10,
            // Malt bill - Historical IPA
            pct_pilsner: 0,
            pct_base: 85,      // British pale malt
            pct_munich: 0,
            pct_vienna: 0,
            pct_wheat: 0,
            pct_oats: 0,
            pct_crystal: 0,    // No crystal malts historically
            pct_choc: 0,
            pct_roast: 0,
            pct_corn: 0,
            pct_rice: 0,
            pct_sugar: 15,     // Historical: significant sugar addition
            pct_aromatic_abbey: 0,
            pct_smoked: 0,
            pct_rye: 0,
            pct_sixrow: 0,
            // Derived
            total_dark: 0,
            total_adjunct: 15,
            crystal_ratio: 0,
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
            // Hops - Historical English
            hop_american_c: 0,
            hop_english: 1,    // Historical: EKG or similar
            hop_german: 0,
            hop_czech_saaz: 0,
            hop_nz: 0,
            hop_aged: 1,       // Historically aged hops common
            hop_northern_brewer: 0,
            // No modern additives
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
            high_hop: 1,
            strong_abv: 0,
            dark_color: 0,
            pale_color: 1
        }
    }
];

console.log("🍺 FAZ 2A: IPA RECIPE EXPANSION");
console.log("==============================");

// Load current dataset
const currentData = JSON.parse(fs.readFileSync('_ml_dataset_v6_mild_expanded.json', 'utf8'));

console.log(`Current dataset: ${currentData.records.length} recipes`);

// Count current IPA examples
const currentIPAs = currentData.records.filter(r => r.label_slug === 'ipa');
console.log(`Current 'ipa' examples: ${currentIPAs.length}`);
console.log("Note: This is separate from 'american_india_pale_ale' (59 examples)");

// Add new IPA recipes
IPA_RECIPES.forEach((recipe, idx) => {
    currentData.records.push(recipe);
    console.log(`Added: ${recipe.name} (${recipe.source})`);
});

// Update metadata
currentData._meta.version = 'v6_normalized_stout_mild_ipa_expansion';
currentData._meta.ipa_expansion_at = new Date().toISOString();
currentData._meta.ipa_recipes_added = IPA_RECIPES.length;

console.log(`\nUpdated dataset: ${currentData.records.length} recipes`);
console.log(`New 'ipa' total: ${currentIPAs.length + IPA_RECIPES.length} examples`);

// Save expanded dataset
const expandedPath = '_ml_dataset_v6_ipa_expanded.json';
fs.writeFileSync(expandedPath, JSON.stringify(currentData, null, 2));

console.log(`\n✅ IPA-expanded dataset saved: ${expandedPath}`);

// Update batch 2A progress
const batch2a_progress = {
    timestamp: new Date().toISOString(),
    batch: 'BATCH_2A_FOUNDATION_STYLES',
    completed: ['stout', 'mild', 'ipa'],
    remaining: ['blonde_ale', 'porter', 'brown_ale'],
    total_recipes_added_so_far: 14, // 6 stout + 2 mild + 6 ipa
    style_counts_after_expansion: {
        stout: 11,
        mild: 11,
        ipa: 10
    },
    under_10_count_reduction: '113 → 110 (3 styles fixed)',
    next_target: 'blonde_ale (currently 5 examples)',
    notes: {
        ipa_strategy: 'Added non-American IPA variants to differentiate from american_india_pale_ale',
        ipa_archetypes: ['English Traditional', 'Session', 'Belgian', 'Black', 'Rye', 'Historical Burton']
    }
};

fs.writeFileSync('_batch_2a_progress.json', JSON.stringify(batch2a_progress, null, 2));

console.log("\n📊 IPA ARCHETYPE COVERAGE:");
console.log("1. English Traditional (Fuller's style)");
console.log("2. Session IPA (Low ABV)");
console.log("3. Belgian IPA (Belgian yeast + hops)");
console.log("4. Black IPA (Dark + Hoppy)");
console.log("5. Rye IPA (20% rye spice)");
console.log("6. Historical Burton IPA (1850s reproduction)");

console.log("\n📊 BATCH 2A PROGRESS:");
console.log(`✅ Completed: ${batch2a_progress.completed.join(', ')}`);
console.log(`📋 Remaining: ${batch2a_progress.remaining.join(', ')}`);
console.log(`📈 Under-represented reduction: ${batch2a_progress.under_10_count_reduction}`);

console.log(`\n🎯 Next: blonde_ale expansion (5 → 10+ examples)`);