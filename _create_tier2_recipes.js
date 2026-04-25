#!/usr/bin/env node
/**
 * Batch 2: Tier 2 Craft Stiller için reçete creation
 * Session IPA, Black IPA, White IPA, Brut IPA
 */

const { createRecipe } = require('./_create_tier1_recipes.js');

// TIER 2 CRAFT RECIPES
const tier2Recipes = [

  // === SESSION IPA (5 → 10, +5) ===

  // Founders All Day IPA clone
  createRecipe('015', 'founders_all_day', 'Founders All Day IPA Clone', 'session_india_pale_ale', {
    og: 1.042, fg: 1.008, abv: 4.7, ibu: 42, srm: 5,
    family: 'ipa', ferm: 'ale',
    pct_base: 80,      // Maris Otter base
    pct_vienna: 8,     // Vienna for body
    pct_munich: 5,     // Munich for melanoidins
    pct_crystal: 7,    // Crystal 20 light caramel
    total_dark: 0,
    total_adjunct: 0,
    crystal_ratio: 0.09,
    yeast_american: 1,
    hop_american_c: 1, // Cascade, Centennial, Citra
    katki_fruit: 1     // Citrus hop character
  }),

  // Sierra Nevada Nooner clone
  createRecipe('016', 'sierra_nooner', 'Sierra Nevada Nooner Session IPA Clone', 'session_india_pale_ale', {
    og: 1.043, fg: 1.009, abv: 4.8, ibu: 45, srm: 6,
    family: 'ipa', ferm: 'ale',
    pct_base: 85,      // 2-row pale
    pct_crystal: 10,   // Crystal 40L
    pct_wheat: 5,      // Wheat for head retention
    total_dark: 0,
    total_adjunct: 0,
    crystal_ratio: 0.12,
    yeast_american: 1,
    hop_american_c: 1  // Magnum, Cascade, Citra
  }),

  // Classic Session IPA
  createRecipe('017', 'classic_session', 'Classic Session IPA', 'session_india_pale_ale', {
    og: 1.040, fg: 1.006, abv: 4.5, ibu: 50, srm: 4,
    family: 'ipa', ferm: 'ale',
    pct_base: 88,      // American 2-row
    pct_crystal: 8,    // Crystal 20L
    pct_wheat: 4,      // Wheat malt
    total_dark: 0,
    total_adjunct: 0,
    crystal_ratio: 0.09,
    yeast_american: 1,
    hop_american_c: 1,
    high_hop: 1        // High hop flavor
  }),

  // Hop Burst Session IPA
  createRecipe('018', 'hop_burst_session', 'Hop Burst Session IPA', 'session_india_pale_ale', {
    og: 1.041, fg: 1.007, abv: 4.6, ibu: 38, srm: 5,
    family: 'ipa', ferm: 'ale',
    pct_base: 82,      // Maris Otter
    pct_vienna: 6,     // Vienna
    pct_crystal: 12,   // Crystal 40L
    total_dark: 0,
    total_adjunct: 0,
    crystal_ratio: 0.15,
    yeast_american: 1,
    hop_american_c: 1  // Late hop additions
  }),

  // Modern Session IPA
  createRecipe('019', 'modern_session', 'Modern Session IPA', 'session_india_pale_ale', {
    og: 1.044, fg: 1.010, abv: 4.5, ibu: 40, srm: 6,
    family: 'ipa', ferm: 'ale',
    pct_base: 75,      // American 2-row
    pct_wheat: 15,     // High wheat (hazy influence)
    pct_crystal: 10,   // Crystal 60L
    total_dark: 0,
    total_adjunct: 0,
    crystal_ratio: 0.13,
    yeast_american: 1,
    hop_american_c: 1,
    katki_fruit: 1     // Tropical hop character
  }),

  // === BLACK IPA / CASCADIAN DARK ALE (3 → 10, +7) ===

  // Stone Sublimely Self-Righteous inspired
  createRecipe('020', 'stone_sublimely', 'Stone Sublimely Self-Righteous Style', 'black_ipa', {
    og: 1.080, fg: 1.015, abv: 8.7, ibu: 90, srm: 45,
    family: 'ipa', ferm: 'ale',
    pct_base: 84,      // American 2-row
    pct_crystal: 5.5,  // Crystal 60L
    pct_choc: 5.5,     // Carafa III (debittered)
    pct_roast: 5,      // Black malt
    total_dark: 10.5,
    total_adjunct: 0,
    crystal_ratio: 0.065,
    yeast_american: 1,
    hop_american_c: 1, // Chinook, Simcoe, Amarillo
    strong_abv: 1,
    dark_color: 1,
    high_hop: 1
  }),

  // Deschutes Hop in the Dark inspired
  createRecipe('021', 'deschutes_hop_dark', 'Deschutes Hop in the Dark Style', 'black_ipa', {
    og: 1.065, fg: 1.012, abv: 6.8, ibu: 65, srm: 35,
    family: 'ipa', ferm: 'ale',
    pct_base: 70,      // 2-row pale
    pct_munich: 8,     // Munich malt
    pct_crystal: 8,    // Crystal 60L
    pct_oats: 4,       // Oats for mouthfeel
    pct_choc: 6,       // Carafa II
    pct_roast: 4,      // Chocolate malt
    total_dark: 10,
    total_adjunct: 4,
    crystal_ratio: 0.11,
    yeast_american: 1,
    hop_american_c: 1, // Cascade, Amarillo, Citra, Centennial
    dark_color: 1,
    high_hop: 1
  }),

  // Classic Cascadian Dark Ale
  createRecipe('022', 'classic_cascadian', 'Classic Cascadian Dark Ale', 'black_ipa', {
    og: 1.060, fg: 1.010, abv: 6.5, ibu: 70, srm: 40,
    family: 'ipa', ferm: 'ale',
    pct_base: 75,      // American 2-row
    pct_crystal: 12,   // Crystal 60L
    pct_choc: 8,       // Carafa II (debittered)
    pct_roast: 5,      // Roasted barley
    total_dark: 13,
    total_adjunct: 0,
    crystal_ratio: 0.16,
    yeast_american: 1,
    hop_american_c: 1, // Pacific Northwest hops
    dark_color: 1,
    high_hop: 1
  }),

  // Smooth Black IPA
  createRecipe('023', 'smooth_black', 'Smooth Black IPA', 'black_ipa', {
    og: 1.058, fg: 1.011, abv: 6.2, ibu: 60, srm: 32,
    family: 'ipa', ferm: 'ale',
    pct_base: 78,      // Maris Otter
    pct_crystal: 10,   // Crystal 40L
    pct_choc: 7,       // Carafa II special
    pct_roast: 3,      // Black patent
    pct_wheat: 2,      // Wheat for smoothness
    total_dark: 10,
    total_adjunct: 2,
    crystal_ratio: 0.13,
    yeast_american: 1,
    hop_american_c: 1,
    dark_color: 1,
    high_hop: 1
  }),

  // Robust Black IPA
  createRecipe('024', 'robust_black', 'Robust Black IPA', 'black_ipa', {
    og: 1.062, fg: 1.013, abv: 6.4, ibu: 75, srm: 42,
    family: 'ipa', ferm: 'ale',
    pct_base: 72,      // American 2-row
    pct_crystal: 12,   // Crystal 80L
    pct_choc: 10,      // Carafa III
    pct_roast: 6,      // Roasted barley
    total_dark: 16,
    total_adjunct: 0,
    crystal_ratio: 0.17,
    yeast_american: 1,
    hop_american_c: 1,
    dark_color: 1,
    high_hop: 1
  }),

  // Modern Black IPA
  createRecipe('025', 'modern_black', 'Modern Black IPA', 'black_ipa', {
    og: 1.059, fg: 1.009, abv: 6.5, ibu: 68, srm: 38,
    family: 'ipa', ferm: 'ale',
    pct_base: 74,      // American 2-row
    pct_crystal: 8,    // Crystal 60L
    pct_choc: 8,       // Carafa II
    pct_roast: 5,      // Chocolate malt
    pct_wheat: 3,      // Wheat malt
    pct_oats: 2,       // Oats
    total_dark: 13,
    total_adjunct: 5,
    crystal_ratio: 0.11,
    yeast_american: 1,
    hop_american_c: 1,
    dark_color: 1,
    high_hop: 1
  }),

  // West Coast Black IPA
  createRecipe('026', 'west_coast_black', 'West Coast Black IPA', 'black_ipa', {
    og: 1.064, fg: 1.010, abv: 7.0, ibu: 80, srm: 44,
    family: 'ipa', ferm: 'ale',
    pct_base: 76,      // American 2-row
    pct_crystal: 9,    // Crystal 60L
    pct_choc: 9,       // Carafa III
    pct_roast: 6,      // Black malt
    total_dark: 15,
    total_adjunct: 0,
    crystal_ratio: 0.12,
    yeast_american: 1,
    hop_american_c: 1,
    dark_color: 1,
    high_hop: 1,
    strong_abv: 1      // Getting close to 7%
  }),

  // === WHITE IPA (1 → 8, +7) ===

  // Deschutes/Boulevard collaboration style
  createRecipe('027', 'deschutes_boulevard', 'Deschutes-Boulevard White IPA Style', 'white_ipa', {
    og: 1.056, fg: 1.010, abv: 6.0, ibu: 45, srm: 4,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 50,   // Pilsner base
    pct_wheat: 40,     // High wheat content
    pct_oats: 5,       // Oats for texture
    pct_sugar: 5,      // Candi sugar
    total_dark: 0,
    total_adjunct: 10,
    crystal_ratio: 0,
    yeast_belgian: 1,  // Belgian wit yeast
    hop_american_c: 1, // American IPA hops
    katki_spice_herb: 1, // Coriander
    katki_fruit: 1,    // Orange peel
    pale_color: 1
  }),

  // Allagash White IPA inspired
  createRecipe('028', 'allagash_white_ipa', 'Allagash White IPA Style', 'white_ipa', {
    og: 1.052, fg: 1.008, abv: 5.8, ibu: 40, srm: 3,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 55,   // Pilsner malt
    pct_wheat: 35,     // Flaked wheat
    pct_oats: 5,       // Flaked oats
    pct_sugar: 5,      // Corn sugar
    total_dark: 0,
    total_adjunct: 10,
    crystal_ratio: 0,
    yeast_wit: 1,      // Wit yeast
    hop_american_c: 1, // Cascade, Citra
    katki_spice_herb: 1, // Traditional wit spices
    pale_color: 1
  }),

  // Modern White IPA
  createRecipe('029', 'modern_white', 'Modern White IPA', 'white_ipa', {
    og: 1.054, fg: 1.009, abv: 5.9, ibu: 50, srm: 4,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 48,   // Pilsner base
    pct_wheat: 42,     // High wheat
    pct_oats: 8,       // Oats for haze
    pct_sugar: 2,      // Light sugar
    total_dark: 0,
    total_adjunct: 10,
    crystal_ratio: 0,
    yeast_belgian: 1,  // Belgian character
    hop_american_c: 1, // Tropical hops
    katki_spice_herb: 1, // Coriander
    katki_fruit: 1,    // Orange character
    pale_color: 1,
    high_hop: 1
  }),

  // Traditional White IPA
  createRecipe('030', 'traditional_white', 'Traditional White IPA', 'white_ipa', {
    og: 1.050, fg: 1.008, abv: 5.5, ibu: 38, srm: 3,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 60,   // Pilsner base
    pct_wheat: 30,     // Wheat malt
    pct_oats: 8,       // Oats
    pct_sugar: 2,      // Minimal sugar
    total_dark: 0,
    total_adjunct: 10,
    crystal_ratio: 0,
    yeast_wit: 1,      // Belgian wit yeast
    hop_american_c: 1, // American hops
    katki_spice_herb: 1, // Traditional spices
    pale_color: 1
  }),

  // Citrus White IPA
  createRecipe('031', 'citrus_white', 'Citrus White IPA', 'white_ipa', {
    og: 1.055, fg: 1.010, abv: 5.9, ibu: 42, srm: 4,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 52,   // Pilsner base
    pct_wheat: 38,     // Wheat content
    pct_oats: 6,       // Oats
    pct_sugar: 4,      // Candi sugar
    total_dark: 0,
    total_adjunct: 10,
    crystal_ratio: 0,
    yeast_belgian: 1,
    hop_american_c: 1,
    katki_fruit: 1,    // Heavy citrus character
    pale_color: 1
  }),

  // Hazy White IPA
  createRecipe('032', 'hazy_white', 'Hazy White IPA', 'white_ipa', {
    og: 1.057, fg: 1.012, abv: 5.9, ibu: 35, srm: 5,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 45,   // Pilsner base
    pct_wheat: 40,     // High wheat for haze
    pct_oats: 12,      // High oats for mouthfeel
    pct_sugar: 3,      // Light sugar
    total_dark: 0,
    total_adjunct: 15,
    crystal_ratio: 0,
    yeast_belgian: 1,
    hop_american_c: 1, // Late hopping
    katki_spice_herb: 1,
    pale_color: 1
  }),

  // Belgian White IPA
  createRecipe('033', 'belgian_white_ipa', 'Belgian White IPA', 'white_ipa', {
    og: 1.058, fg: 1.011, abv: 6.2, ibu: 44, srm: 4,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 54,   // Belgian Pilsner
    pct_wheat: 35,     // Wheat malt
    pct_oats: 6,       // Oats
    pct_sugar: 5,      // Belgian candi sugar
    total_dark: 0,
    total_adjunct: 11,
    crystal_ratio: 0,
    yeast_belgian: 1,  // Strong Belgian character
    hop_european: 1,   // European noble hops + American
    hop_american_c: 1,
    katki_spice_herb: 1,
    katki_fruit: 1,
    pale_color: 1
  }),

  // === BRUT IPA (1 → 8, +7) ===

  // Kim Sturdavant Original Style (Social Kitchen)
  createRecipe('034', 'social_kitchen_brut', 'Social Kitchen Brut IPA Style', 'brut_ipa', {
    og: 1.046, fg: 0.999, abv: 6.2, ibu: 45, srm: 2,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 85,   // Pilsner base (light color)
    pct_rice: 10,      // Flaked rice (adjunct)
    pct_corn: 5,       // Corn (adjunct)
    total_dark: 0,
    total_adjunct: 15,
    crystal_ratio: 0,
    yeast_american: 1, // Clean fermentation
    hop_american_c: 1, // Tropical, resinous hops
    katki_fruit: 1,    // Big tropical character
    pale_color: 1
    // NOTE: Amyloglucosidase enzyme needed (not in features)
  }),

  // Stone Brut IPA inspired
  createRecipe('035', 'stone_brut', 'Stone Brut IPA Style', 'brut_ipa', {
    og: 1.048, fg: 1.001, abv: 6.2, ibu: 50, srm: 3,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 80,   // Pilsner malt
    pct_rice: 15,      // High rice content
    pct_corn: 5,       // Flaked corn
    total_dark: 0,
    total_adjunct: 20,
    crystal_ratio: 0,
    yeast_american: 1,
    hop_american_c: 1, // Citra, Mosaic, Simcoe
    katki_fruit: 1,
    pale_color: 1,
    high_hop: 1
  }),

  // Modern Brut IPA
  createRecipe('036', 'modern_brut', 'Modern Brut IPA', 'brut_ipa', {
    og: 1.050, fg: 1.002, abv: 6.3, ibu: 40, srm: 2,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 82,   // Light Pilsner
    pct_rice: 12,      // Flaked rice
    pct_corn: 6,       // Flaked corn
    total_dark: 0,
    total_adjunct: 18,
    crystal_ratio: 0,
    yeast_american: 1,
    hop_american_c: 1, // Modern hop varieties
    katki_fruit: 1,    // Intense fruit character
    pale_color: 1
  }),

  // Champagne Brut IPA
  createRecipe('037', 'champagne_brut', 'Champagne Brut IPA', 'brut_ipa', {
    og: 1.044, fg: 0.998, abv: 6.0, ibu: 35, srm: 2,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 88,   // Very light
    pct_rice: 8,       // Rice adjunct
    pct_corn: 4,       // Light corn
    total_dark: 0,
    total_adjunct: 12,
    crystal_ratio: 0,
    yeast_american: 1, // Very clean
    hop_american_c: 1, // Subtle hop character
    pale_color: 1
  }),

  // Tropical Brut IPA
  createRecipe('038', 'tropical_brut', 'Tropical Brut IPA', 'brut_ipa', {
    og: 1.052, fg: 1.003, abv: 6.4, ibu: 42, srm: 3,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 78,   // Pilsner base
    pct_rice: 16,      // High rice
    pct_corn: 6,       // Corn adjunct
    total_dark: 0,
    total_adjunct: 22,
    crystal_ratio: 0,
    yeast_american: 1,
    hop_american_c: 1, // Tropical hop focus
    katki_fruit: 1,    // Enhanced fruit character
    pale_color: 1
  }),

  // Classic Brut IPA
  createRecipe('039', 'classic_brut', 'Classic Brut IPA', 'brut_ipa', {
    og: 1.047, fg: 1.000, abv: 6.2, ibu: 38, srm: 2,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 84,   // Clean Pilsner
    pct_rice: 11,      // Rice adjunct
    pct_corn: 5,       // Corn adjunct
    total_dark: 0,
    total_adjunct: 16,
    crystal_ratio: 0,
    yeast_american: 1,
    hop_american_c: 1, // Balanced hop character
    pale_color: 1
  }),

  // West Coast Brut IPA
  createRecipe('040', 'west_coast_brut', 'West Coast Brut IPA', 'brut_ipa', {
    og: 1.049, fg: 1.001, abv: 6.3, ibu: 48, srm: 3,
    family: 'ipa', ferm: 'ale',
    pct_pilsner: 81,   // Pilsner malt
    pct_rice: 13,      // Rice for dryness
    pct_corn: 6,       // Corn adjunct
    total_dark: 0,
    total_adjunct: 19,
    crystal_ratio: 0,
    yeast_american: 1, // Clean American yeast
    hop_american_c: 1, // West Coast hop profile
    katki_fruit: 1,    // Citrus/pine character
    pale_color: 1
  })

];

module.exports = { tier2Recipes };

if (require.main === module) {
  console.log(`🍺 Tier 2 recipes created: ${tier2Recipes.length}`);
  console.log("\nBreakdown:");
  const breakdown = {};
  tier2Recipes.forEach(recipe => {
    const style = recipe.label_slug;
    breakdown[style] = (breakdown[style] || 0) + 1;
  });

  Object.entries(breakdown).forEach(([style, count]) => {
    console.log(`  ${style}: ${count} reçete`);
  });

  console.log("\nTotal expected improvement:");
  const improvements = {
    'session_india_pale_ale': { current: 5, target: 10, needed: 5 },
    'black_ipa': { current: 3, target: 10, needed: 7 },
    'white_ipa': { current: 1, target: 8, needed: 7 },
    'brut_ipa': { current: 1, target: 8, needed: 7 }
  };

  Object.entries(improvements).forEach(([style, data]) => {
    const created = breakdown[style] || 0;
    console.log(`  ${style}: ${data.current} → ${data.current + created} (+${created})`);
  });
}