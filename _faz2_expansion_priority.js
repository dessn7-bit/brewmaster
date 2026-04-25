#!/usr/bin/env node
/**
 * FAZ 2: Training Data Expansion Priority Analysis
 *
 * 113 stil <10 örnekli. Strategic prioritization based on:
 * 1. BJCP core styles (foundation styles)
 * 2. Popular craft beer styles (market importance)
 * 3. Style family coverage gaps
 * 4. Training data quality impact
 */

const fs = require('fs');

// Current under-represented styles (from previous analysis)
const UNDER_REPRESENTED = [
    // Tier 0: Critical BJCP foundation styles (1-5 examples)
    { style: 'stout', count: 5, tier: 0, reason: 'BJCP Category 16 - Foundation dark ale' },
    { style: 'mild', count: 9, tier: 0, reason: 'BJCP Category 11 - British foundation style' },
    { style: 'ipa', count: 4, tier: 0, reason: 'BJCP Category 21 - Core IPA category confusion' },
    { style: 'blonde_ale', count: 5, tier: 0, reason: 'BJCP Category 18 - American foundation ale' },
    { style: 'porter', count: 0, tier: 0, reason: 'Consolidated from american/english porter, need examples' },
    { style: 'brown_ale', count: 0, tier: 0, reason: 'Consolidated from american/english brown_ale, need examples' },

    // Tier 1: Important craft/regional styles (2-8 examples)
    { style: 'irish_dry_stout', count: 8, tier: 1, reason: 'Guinness archetype - major commercial significance' },
    { style: 'weizenbock', count: 8, tier: 1, reason: 'German wheat-bock hybrid - important Bavarian style' },
    { style: 'french_biere_de_garde', count: 8, tier: 1, reason: 'BJCP Category 24C - major French farmhouse style' },
    { style: 'common_beer', count: 8, tier: 1, reason: 'California/Kentucky Common - American historical styles' },
    { style: 'dark_lager', count: 8, tier: 1, reason: 'Consolidated dark lager category' },
    { style: 'scotch_ale_or_wee_heavy', count: 8, tier: 1, reason: 'BJCP Category 17 - Scottish strong ale archetype' },

    // Tier 2: Modern craft styles (6-9 examples)
    { style: 'white_ipa', count: 8, tier: 2, reason: 'Modern American craft innovation - wheat IPA hybrid' },
    { style: 'brut_ipa', count: 8, tier: 2, reason: 'New American style - dry-finished IPA variant' },
    { style: 'west_coast_india_pale_ale', count: 7, tier: 2, reason: 'Classic American IPA archetype differentiation' },
    { style: 'american_wheat_ale', count: 7, tier: 2, reason: 'American interpretation of wheat beer' },
    { style: 'berliner_weisse', count: 7, tier: 2, reason: 'BJCP Category 23 - German sour wheat beer' },

    // Tier 3: Specialized/historical (focus on data quality over quantity)
    { style: 'baltic_porter', count: 8, tier: 3, reason: 'BJCP Category 9 - Imperial porter variant' },
    { style: 'special_bitter_or_best_bitter', count: 8, tier: 3, reason: 'BJCP Category 11 - British bitter spectrum' },
    { style: 'winter_seasonal_beer', count: 7, tier: 3, reason: 'Seasonal category - spiced/strong winter ales' }
];

// Recipe source strategy
const RECIPE_SOURCES = {
    tier0: [
        'BJCP commercial examples (Guinness, Newcastle, Sierra Nevada, Samuel Smith)',
        'Clone recipes from Brewing Classic Styles',
        'NHC/GABF winning recipes in these categories',
        'BYO Magazine "Style Profile" recipes'
    ],
    tier1: [
        'Regional brewery signature recipes',
        'Craft brewery clone recipes',
        'HomebrewTalk highly-rated recipes',
        'BJCP judge training examples'
    ],
    tier2: [
        'Modern craft brewery examples',
        'Experimental/innovative recipes from brewing magazines',
        'Competition-winning modern interpretations',
        'Popular homebrew forum recipes'
    ]
};

// Implementation plan
const IMPLEMENTATION_PLAN = [
    {
        batch: 'Batch 2A: Foundation Styles',
        target_styles: ['stout', 'mild', 'ipa', 'blonde_ale'],
        target_recipes: '15-20 total',
        strategy: 'Focus on BJCP exemplars and commercial clones',
        measurement: 'LOOCV after each style completion'
    },
    {
        batch: 'Batch 2B: Consolidated Styles',
        target_styles: ['porter', 'brown_ale'],
        target_recipes: '10-15 total',
        strategy: 'Build upon alias consolidation with geographic variants',
        measurement: 'Test porter/brown_ale confusion resolution'
    },
    {
        batch: 'Batch 2C: Regional Archetypes',
        target_styles: ['irish_dry_stout', 'french_biere_de_garde', 'scotch_ale_or_wee_heavy'],
        target_recipes: '15-20 total',
        strategy: 'Authentic regional examples from traditional breweries',
        measurement: 'LOOCV + geographic style accuracy'
    },
    {
        batch: 'Batch 2D: Modern Craft',
        target_styles: ['white_ipa', 'brut_ipa', 'west_coast_india_pale_ale'],
        target_recipes: '15-20 total',
        strategy: 'Modern American craft brewery recipes',
        measurement: 'IPA family disambiguation accuracy'
    }
];

console.log("🎯 FAZ 2: TRAINING DATA EXPANSION PRIORITY ANALYSIS");
console.log("==================================================");

console.log("\n📊 CURRENT SITUATION:");
console.log("• Under-represented styles: 113 styles (<10 examples)");
console.log("• Critical foundation gaps in BJCP core categories");
console.log("• Alias consolidation created some empty categories (porter, brown_ale)");
console.log("• Modern craft style representation needs improvement");

console.log("\n🎯 TIER 0: CRITICAL FOUNDATION STYLES (Must fix first)");
UNDER_REPRESENTED.filter(s => s.tier === 0).forEach(style => {
    console.log(`• ${style.style}: ${style.count} examples - ${style.reason}`);
});

console.log("\n🥇 TIER 1: IMPORTANT REGIONAL/CRAFT STYLES");
UNDER_REPRESENTED.filter(s => s.tier === 1).forEach(style => {
    console.log(`• ${style.style}: ${style.count} examples - ${style.reason}`);
});

console.log("\n🥈 TIER 2: MODERN CRAFT INNOVATIONS");
UNDER_REPRESENTED.filter(s => s.tier === 2).forEach(style => {
    console.log(`• ${style.style}: ${style.count} examples - ${style.reason}`);
});

console.log("\n📋 IMPLEMENTATION PLAN:");
IMPLEMENTATION_PLAN.forEach((batch, idx) => {
    console.log(`\n${idx + 1}. ${batch.batch}`);
    console.log(`   Styles: [${batch.target_styles.join(', ')}]`);
    console.log(`   Target: ${batch.target_recipes}`);
    console.log(`   Strategy: ${batch.strategy}`);
    console.log(`   Measurement: ${batch.measurement}`);
});

console.log("\n🧮 EXPECTED IMPACT:");
console.log("• Tier 0 completion: +15-25 examples in foundation styles");
console.log("• Should reduce under-represented count from 113 to ~105");
console.log("• Improved BJCP core category coverage");
console.log("• Better disambiguation for consolidated styles (porter/brown_ale)");

console.log("\n⏱️ TIMELINE ESTIMATE:");
console.log("• Batch 2A: 15-20 recipes, ~2-3 hours research + creation");
console.log("• Each subsequent batch: Similar effort");
console.log("• Total Faz 2 estimate: 60-80 recipes, foundation → modern progression");

// Save priority analysis
const report = {
    timestamp: new Date().toISOString(),
    phase: 'FAZ_2_EXPANSION_PLANNING',
    current_under_represented: 113,
    priority_tiers: {
        tier0: UNDER_REPRESENTED.filter(s => s.tier === 0).length,
        tier1: UNDER_REPRESENTED.filter(s => s.tier === 1).length,
        tier2: UNDER_REPRESENTED.filter(s => s.tier === 2).length
    },
    implementation_plan: IMPLEMENTATION_PLAN,
    recipe_sources: RECIPE_SOURCES,
    styles_analyzed: UNDER_REPRESENTED
};

fs.writeFileSync('_faz2_expansion_priority.json', JSON.stringify(report, null, 2));

console.log(`\n💾 Priority analysis saved: _faz2_expansion_priority.json`);
console.log("📋 Ready to begin Batch 2A: Foundation Styles");
console.log("\n🚦 NEXT: Start with 'stout' - add 5+ examples to reach 10+ total");