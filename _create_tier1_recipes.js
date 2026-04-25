#!/usr/bin/env node
/**
 * Batch 1: Tier 1 Core BJCP Stiller için reçete creation
 * English Brown Ale, American Porter, Oatmeal Stout
 */

// Training data schema template
const createRecipe = (id, source, name, labelSlug, features) => ({
  id: `tier1_${id}`,
  source: source,
  name: name,
  label_slug: labelSlug,
  label_family: features.family || 'unknown',
  label_ferm: features.ferm || 'ale',
  features: {
    og: features.og,
    fg: features.fg,
    abv: features.abv,
    ibu: features.ibu,
    srm: features.srm,
    pct_pilsner: features.pct_pilsner || 0,
    pct_base: features.pct_base || 0,
    pct_munich: features.pct_munich || 0,
    pct_vienna: features.pct_vienna || 0,
    pct_wheat: features.pct_wheat || 0,
    pct_oats: features.pct_oats || 0,
    pct_crystal: features.pct_crystal || 0,
    pct_choc: features.pct_choc || 0,
    pct_roast: features.pct_roast || 0,
    pct_corn: 0,
    pct_rice: 0,
    pct_sugar: features.pct_sugar || 0,
    pct_aromatic_abbey: 0,
    pct_smoked: 0,
    pct_rye: features.pct_rye || 0,
    pct_sixrow: 0,
    total_dark: features.total_dark || (features.pct_choc + features.pct_roast),
    total_adjunct: features.total_adjunct || features.pct_sugar,
    crystal_ratio: features.crystal_ratio || (features.pct_crystal / (features.pct_base + features.pct_pilsner + features.pct_munich + features.pct_vienna)),
    yeast_english: features.yeast_english || 0,
    yeast_american: features.yeast_american || 0,
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
    hop_american_c: features.hop_american_c || 0,
    hop_english: features.hop_english || 1,  // Default for British styles
    hop_german: features.hop_german || 0,
    hop_czech_saaz: 0,
    hop_nz: 0,
    hop_aged: 0,
    hop_northern_brewer: features.hop_northern_brewer || 0,
    katki_lactose: 0,
    katki_fruit: 0,
    katki_spice_herb: 0,
    katki_chocolate: features.katki_chocolate || 0,
    katki_coffee: features.katki_coffee || 0,
    katki_chile: 0,
    katki_smoke: 0,
    katki_honey: 0,
    katki_pumpkin: 0,
    katki_salt: 0,
    high_hop: features.ibu > 50 ? 1 : 0,
    strong_abv: features.abv > 7 ? 1 : 0,
    dark_color: features.srm > 20 ? 1 : 0,
    pale_color: features.srm < 10 ? 1 : 0
  }
});

// TIER 1 RECIPES
const tier1Recipes = [

  // === ENGLISH BROWN ALE (8 → 12, +4) ===

  // Newcastle Brown Ale clone (from AHA)
  createRecipe('001', 'newcastle_clone', 'Newcastle Brown Ale Clone', 'english_brown_ale', {
    og: 1.048, fg: 1.012, abv: 4.7, ibu: 24, srm: 19,
    family: 'brown_ale', ferm: 'ale',
    pct_base: 70,      // Pale ale malt base
    pct_crystal: 20,   // Crystal 60L (nutty flavor)
    pct_choc: 3,       // Chocolate malt
    pct_roast: 2,      // Black malt (small amount)
    pct_sugar: 5,      // Invert sugar
    total_dark: 5,
    total_adjunct: 5,
    crystal_ratio: 0.29,
    yeast_english: 1,
    hop_english: 1     // East Kent Goldings
  }),

  // Samuel Smith Nut Brown Ale clone
  createRecipe('002', 'sam_smith_clone', 'Samuel Smith Nut Brown Ale Clone', 'english_brown_ale', {
    og: 1.048, fg: 1.012, abv: 5.0, ibu: 35, srm: 19,
    family: 'brown_ale', ferm: 'ale',
    pct_base: 75,      // Maris Otter
    pct_crystal: 18,   // Crystal malt
    pct_choc: 4,       // Chocolate malt
    pct_roast: 3,      // Roast barley (Yorkshire Squares)
    total_dark: 7,
    total_adjunct: 0,
    crystal_ratio: 0.24,
    yeast_english: 1,
    hop_english: 1     // EKG + Fuggles
  }),

  // Traditional English Brown Ale
  createRecipe('003', 'traditional_english', 'Traditional English Brown Ale', 'english_brown_ale', {
    og: 1.045, fg: 1.011, abv: 4.5, ibu: 20, srm: 17,
    family: 'brown_ale', ferm: 'ale',
    pct_base: 80,      // Maris Otter
    pct_crystal: 15,   // Crystal 60L
    pct_choc: 3,       // Chocolate
    pct_roast: 2,      // Black malt
    total_dark: 5,
    total_adjunct: 0,
    crystal_ratio: 0.19,
    yeast_english: 1,
    hop_english: 1
  }),

  // Modern English Brown Ale
  createRecipe('004', 'modern_english', 'Modern English Brown Ale', 'english_brown_ale', {
    og: 1.050, fg: 1.013, abv: 4.9, ibu: 28, srm: 22,
    family: 'brown_ale', ferm: 'ale',
    pct_base: 72,      // Pale ale malt
    pct_crystal: 22,   // Higher crystal for modern sweetness
    pct_choc: 4,       // Chocolate malt
    pct_roast: 2,      // Roasted barley
    total_dark: 6,
    total_adjunct: 0,
    crystal_ratio: 0.31,
    yeast_english: 1,
    hop_english: 1
  }),

  // === AMERICAN PORTER (7 → 12, +5) ===

  // Deschutes Black Butte Porter clone
  createRecipe('005', 'black_butte_clone', 'Deschutes Black Butte Porter Clone', 'american_porter', {
    og: 1.056, fg: 1.014, abv: 5.5, ibu: 30, srm: 35,
    family: 'porter', ferm: 'ale',
    pct_base: 60,      // 2-row pale
    pct_crystal: 15,   // Crystal 60L
    pct_choc: 12,      // Chocolate malt (signature)
    pct_roast: 8,      // Roasted barley
    pct_wheat: 3,      // Wheat for head retention
    pct_sugar: 2,      // Corn sugar
    total_dark: 20,
    total_adjunct: 2,
    crystal_ratio: 0.25,
    yeast_american: 1,
    hop_american_c: 1  // Cascade/Centennial
  }),

  // Great Lakes Edmund Fitzgerald Porter clone
  createRecipe('006', 'edmund_fitz_clone', 'Great Lakes Edmund Fitzgerald Porter Clone', 'american_porter', {
    og: 1.058, fg: 1.015, abv: 5.8, ibu: 35, srm: 40,
    family: 'porter', ferm: 'ale',
    pct_base: 65,      // 2-row pale ale
    pct_crystal: 12,   // Crystal 60L
    pct_choc: 10,      // Chocolate malt
    pct_roast: 13,     // Roasted barley (coffee notes)
    total_dark: 23,
    total_adjunct: 0,
    crystal_ratio: 0.18,
    yeast_american: 1,
    hop_northern_brewer: 1,  // Northern Brewer
    hop_english: 1           // + EKG
  }),

  // Classic American Porter
  createRecipe('007', 'classic_american', 'Classic American Porter', 'american_porter', {
    og: 1.055, fg: 1.013, abv: 5.5, ibu: 32, srm: 30,
    family: 'porter', ferm: 'ale',
    pct_base: 68,      // American 2-row
    pct_crystal: 15,   // Crystal 40L + 60L blend
    pct_choc: 10,      // Chocolate malt
    pct_roast: 5,      // Black patent
    pct_wheat: 2,      // Wheat malt
    total_dark: 15,
    total_adjunct: 0,
    crystal_ratio: 0.22,
    yeast_american: 1,
    hop_american_c: 1  // Willamette/Cascade
  }),

  // Robust American Porter
  createRecipe('008', 'robust_american', 'Robust American Porter', 'american_porter', {
    og: 1.060, fg: 1.016, abv: 5.8, ibu: 38, srm: 38,
    family: 'porter', ferm: 'ale',
    pct_base: 62,      // American 2-row
    pct_crystal: 18,   // Crystal 60L
    pct_choc: 12,      // Chocolate malt
    pct_roast: 6,      // Black malt
    pct_wheat: 2,      // Wheat malt
    total_dark: 18,
    total_adjunct: 0,
    crystal_ratio: 0.29,
    yeast_american: 1,
    hop_american_c: 1
  }),

  // Bell's Porter inspired
  createRecipe('009', 'bells_inspired', 'Bell\'s Style Porter', 'american_porter', {
    og: 1.057, fg: 1.014, abv: 5.6, ibu: 34, srm: 33,
    family: 'porter', ferm: 'ale',
    pct_base: 64,      // 2-row pale
    pct_crystal: 16,   // Crystal 60L
    pct_choc: 11,      // Chocolate malt
    pct_roast: 7,      // Roasted barley
    pct_wheat: 2,      // Wheat malt
    total_dark: 18,
    total_adjunct: 0,
    crystal_ratio: 0.25,
    yeast_american: 1,
    hop_american_c: 1
  }),

  // === OATMEAL STOUT (7 → 12, +5) ===

  // Samuel Smith Oatmeal Stout clone
  createRecipe('010', 'sam_smith_oatmeal', 'Samuel Smith Oatmeal Stout Clone', 'oatmeal_stout', {
    og: 1.048, fg: 1.012, abv: 4.7, ibu: 16, srm: 22,
    family: 'stout', ferm: 'ale',
    pct_base: 70,      // Maris Otter
    pct_crystal: 8,    // Extra Dark Crystal 120L
    pct_choc: 8,       // Chocolate malt
    pct_roast: 4,      // Roasted barley
    pct_oats: 10,      // Flaked oats (5-10% typical)
    total_dark: 12,
    total_adjunct: 10,
    crystal_ratio: 0.11,
    yeast_english: 1,
    hop_english: 1     // East Kent Goldings
  }),

  // Founders Breakfast Stout inspired (smaller)
  createRecipe('011', 'breakfast_inspired', 'Breakfast Stout Inspired', 'oatmeal_stout', {
    og: 1.065, fg: 1.018, abv: 6.2, ibu: 25, srm: 40,
    family: 'stout', ferm: 'ale',
    pct_base: 55,      // American 2-row
    pct_crystal: 10,   // Crystal 120L
    pct_choc: 15,      // Chocolate malt
    pct_roast: 10,     // Roasted barley
    pct_oats: 10,      // Flaked oats
    total_dark: 25,
    total_adjunct: 10,
    crystal_ratio: 0.18,
    yeast_american: 1,
    hop_american_c: 1,
    katki_coffee: 1    // Coffee character
  }),

  // Traditional Oatmeal Stout
  createRecipe('012', 'traditional_oatmeal', 'Traditional Oatmeal Stout', 'oatmeal_stout', {
    og: 1.050, fg: 1.014, abv: 4.7, ibu: 20, srm: 25,
    family: 'stout', ferm: 'ale',
    pct_base: 72,      // Pale ale malt
    pct_crystal: 6,    // Crystal 60L
    pct_choc: 10,      // Chocolate malt
    pct_roast: 6,      // Roasted barley
    pct_oats: 6,       // Flaked oats (minimum for texture)
    total_dark: 16,
    total_adjunct: 6,
    crystal_ratio: 0.08,
    yeast_english: 1,
    hop_english: 1
  }),

  // Smooth Oatmeal Stout
  createRecipe('013', 'smooth_oatmeal', 'Smooth Oatmeal Stout', 'oatmeal_stout', {
    og: 1.052, fg: 1.015, abv: 4.9, ibu: 22, srm: 28,
    family: 'stout', ferm: 'ale',
    pct_base: 68,      // Maris Otter
    pct_crystal: 8,    // Crystal 80L
    pct_choc: 12,      // Chocolate malt
    pct_roast: 4,      // Roasted barley
    pct_oats: 8,       // Flaked oats
    total_dark: 16,
    total_adjunct: 8,
    crystal_ratio: 0.12,
    yeast_english: 1,
    hop_english: 1
  }),

  // Rich Oatmeal Stout
  createRecipe('014', 'rich_oatmeal', 'Rich Oatmeal Stout', 'oatmeal_stout', {
    og: 1.055, fg: 1.016, abv: 5.1, ibu: 24, srm: 32,
    family: 'stout', ferm: 'ale',
    pct_base: 65,      // Pale ale malt
    pct_crystal: 10,   // Crystal 120L
    pct_choc: 13,      // Chocolate malt
    pct_roast: 7,      // Roasted barley
    pct_oats: 5,       // Flaked oats
    total_dark: 20,
    total_adjunct: 5,
    crystal_ratio: 0.15,
    yeast_english: 1,
    hop_english: 1
  })

];

module.exports = { tier1Recipes, createRecipe };

if (require.main === module) {
  console.log(`🍺 Tier 1 recipes created: ${tier1Recipes.length}`);
  console.log("\nBreakdown:");
  const breakdown = {};
  tier1Recipes.forEach(recipe => {
    const style = recipe.label_slug;
    breakdown[style] = (breakdown[style] || 0) + 1;
  });

  Object.entries(breakdown).forEach(([style, count]) => {
    console.log(`  ${style}: ${count} reçete`);
  });
}