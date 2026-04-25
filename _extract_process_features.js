#!/usr/bin/env node
/**
 * Process Feature Extractor - Mine brewing techniques from recipe text
 * Extract process knowledge features for V6.3 expansion
 */
const fs = require('fs');

console.log("🔧 PROCESS FEATURE EXTRACTOR");
console.log("============================");

// Process feature definitions
const PROCESS_PATTERNS = {
    // Mashing techniques
    mash_single_step: {
        patterns: ['single infusion', 'single step', 'single temp', 'one step mash', /\b152.?F\b/, /\b67.?C\b/],
        weight: 1.0
    },
    mash_step_mash: {
        patterns: ['step mash', 'multi step', 'protein rest', 'beta rest', 'saccharification rest', '122F', '145F', '158F'],
        weight: 1.0
    },
    mash_decoction: {
        patterns: ['decoction', 'traditional german', 'triple decoction', 'double decoction'],
        weight: 1.0
    },

    // Mash temperatures
    mash_temp_low: {
        patterns: [/\b148.?150.?F\b/, /\b64.?66.?C\b/, 'body emphasis', 'full body', 'low temp mash'],
        weight: 0.8
    },
    mash_temp_high: {
        patterns: [/\b155.?158.?F\b/, /\b68.?70.?C\b/, 'high attenuation', 'dry finish', 'high temp mash'],
        weight: 0.8
    },

    // Boil techniques
    boil_time_long: {
        patterns: ['90 min', '90min', 'ninety min', '120 min', '2 hour boil', 'long boil'],
        weight: 1.0
    },
    boil_time_short: {
        patterns: ['45 min', '30 min', 'short boil', 'hop retention boil', 'late hop'],
        weight: 1.0
    },
    boil_hop_stand: {
        patterns: ['hop stand', 'whirlpool', 'flame out', 'post boil', '180F', '82C', 'steep hops'],
        weight: 1.0
    },

    // Fermentation techniques
    fermentation_temp_low: {
        patterns: [/\b60.?64.?F\b/, /\b15.?18.?C\b/, 'cool ferment', 'lager temp', 'cold ferment'],
        weight: 0.9
    },
    fermentation_temp_high: {
        patterns: [/\b75.?80.?F\b/, /\b24.?27.?C\b/, 'warm ferment', 'saison temp', 'hot ferment'],
        weight: 0.9
    },
    cold_crash: {
        patterns: ['cold crash', 'crash cool', 'gelatin', 'clarity', 'cold condition'],
        weight: 1.0
    },
    lagering: {
        patterns: ['lager', 'lagering', 'condition cold', /\b6.?8 weeks\b/, 'secondary cold'],
        weight: 1.0
    },

    // Dry hopping
    dry_hop_primary: {
        patterns: ['dry hop primary', 'primary dry', 'fermentation dry hop'],
        weight: 1.0
    },
    dry_hop_secondary: {
        patterns: ['dry hop secondary', 'secondary dry', 'post ferment dry', 'conditioning dry hop'],
        weight: 1.0
    },
    dry_hop_amount_high: {
        patterns: ['4 oz', '6 oz', '8 oz', 'heavy dry hop', 'massive dry hop', 'double dry hop'],
        weight: 0.8
    }
};

// Sparge and technique patterns
const TECHNIQUE_PATTERNS = {
    sparge_fly: {
        patterns: ['fly sparge', 'continuous sparge', 'sparging'],
        weight: 1.0
    },
    sparge_batch: {
        patterns: ['batch sparge', 'drain and fill', 'step sparge'],
        weight: 1.0
    },
    sparge_none: {
        patterns: ['no sparge', 'BIAB', 'brew in a bag', 'full volume'],
        weight: 1.0
    },
    water_treatment: {
        patterns: ['water treatment', 'gypsum', 'calcium chloride', 'lactic acid', 'acidify'],
        weight: 1.0
    },
    barrel_aging: {
        patterns: ['barrel', 'oak', 'whiskey barrel', 'wine barrel', 'bourbon barrel'],
        weight: 1.0
    },
    fruit_addition: {
        patterns: ['cherry', 'raspberry', 'blackberry', 'fruit', 'peach', 'apricot'],
        weight: 1.0
    },
    specialty_technique: {
        patterns: ['brett', 'brettanomyces', 'wild', 'sour', 'lactobacillus', 'pediococcus'],
        weight: 1.0
    }
};

/**
 * Extract process features from recipe text
 */
function extractProcessFeatures(recipeText) {
    const features = {};

    if (!recipeText || typeof recipeText !== 'string') {
        // Default all features to 0
        Object.keys(PROCESS_PATTERNS).forEach(key => features[key] = 0);
        Object.keys(TECHNIQUE_PATTERNS).forEach(key => features[key] = 0);
        return features;
    }

    const text = recipeText.toLowerCase();

    // Process patterns
    Object.entries(PROCESS_PATTERNS).forEach(([feature, config]) => {
        let score = 0;
        config.patterns.forEach(pattern => {
            if (typeof pattern === 'string') {
                if (text.includes(pattern.toLowerCase())) score += config.weight;
            } else if (pattern instanceof RegExp) {
                if (pattern.test(text)) score += config.weight;
            }
        });
        features[feature] = Math.min(1, score); // Cap at 1
    });

    // Technique patterns
    Object.entries(TECHNIQUE_PATTERNS).forEach(([feature, config]) => {
        let score = 0;
        config.patterns.forEach(pattern => {
            if (typeof pattern === 'string') {
                if (text.includes(pattern.toLowerCase())) score += config.weight;
            } else if (pattern instanceof RegExp) {
                if (pattern.test(text)) score += config.weight;
            }
        });
        features[feature] = Math.min(1, score); // Cap at 1
    });

    return features;
}

/**
 * Analyze recipe naming patterns for process hints
 */
function analyzeRecipeNames(recipes) {
    console.log("\n🔍 RECIPE NAME PATTERN ANALYSIS:");

    const namePatterns = {
        clone: recipes.filter(r => /clone|style|tribute/i.test(r.name)).length,
        commercial: recipes.filter(r => /dogfish|stone|sierra|sam adams|guinness|chimay/i.test(r.name)).length,
        technique: recipes.filter(r => /decoction|step|BIAB|no sparge|barrel/i.test(r.name)).length,
        adjective: recipes.filter(r => /imperial|double|triple|session|dry|sweet/i.test(r.name)).length,
        ingredient: recipes.filter(r => /oak|cherry|chocolate|coffee|honey/i.test(r.name)).length
    };

    Object.entries(namePatterns).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count} recipes (${(count/recipes.length*100).toFixed(1)}%)`);
    });

    return namePatterns;
}

try {
    // Load V6.2 dataset
    const datasetObj = JSON.parse(fs.readFileSync('_ml_dataset_v6_2.json', 'utf8'));
    const recipes = datasetObj.records;
    console.log(`\n📊 Processing ${recipes.length} recipes for process features`);

    // Analyze recipe names for pattern insights
    analyzeRecipeNames(recipes);

    // Extract process features for each recipe
    console.log("\n🔧 Extracting process features...");
    let processFeatureStats = {};

    // Initialize stats
    Object.keys(PROCESS_PATTERNS).forEach(key => processFeatureStats[key] = 0);
    Object.keys(TECHNIQUE_PATTERNS).forEach(key => processFeatureStats[key] = 0);

    recipes.forEach((recipe, index) => {
        // Combine name and any description fields for text mining
        const recipeText = [recipe.name, recipe.description, recipe.notes].filter(Boolean).join(' ');

        // Extract process features
        const processFeatures = extractProcessFeatures(recipeText);

        // Update recipe with new features
        recipe.process_features = processFeatures;

        // Update stats
        Object.entries(processFeatures).forEach(([feature, value]) => {
            if (value > 0) processFeatureStats[feature]++;
        });

        if ((index + 1) % 200 === 0) {
            console.log(`  Processed ${index + 1}/${recipes.length} recipes...`);
        }
    });

    console.log("\n📊 PROCESS FEATURE EXTRACTION RESULTS:");

    // Sort features by usage
    const sortedFeatures = Object.entries(processFeatureStats)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, count]) => count > 0);

    sortedFeatures.forEach(([feature, count]) => {
        const percentage = (count / recipes.length * 100).toFixed(1);
        console.log(`  ${feature}: ${count} recipes (${percentage}%)`);
    });

    // Features with zero usage (need better patterns)
    const zeroFeatures = Object.entries(processFeatureStats)
        .filter(([_, count]) => count === 0)
        .map(([feature]) => feature);

    if (zeroFeatures.length > 0) {
        console.log(`\n⚠️  Zero usage features (${zeroFeatures.length}): ${zeroFeatures.join(', ')}`);
    }

    // Sample extractions for verification
    console.log("\n🔍 SAMPLE EXTRACTIONS:");
    const samplesWithFeatures = recipes.filter(r =>
        Object.values(r.process_features).some(v => v > 0)
    ).slice(0, 5);

    samplesWithFeatures.forEach(recipe => {
        console.log(`\n"${recipe.name}" (${recipe.label_slug})`);
        const activeFeatures = Object.entries(recipe.process_features)
            .filter(([_, value]) => value > 0)
            .map(([feature]) => feature);
        console.log(`  Process features: ${activeFeatures.join(', ')}`);
    });

    // Calculate new total feature count
    const originalFeatureCount = Object.keys(recipes[0].features).length;
    const processFeatureCount = Object.keys(processFeatureStats).length;
    const newTotalCount = originalFeatureCount + processFeatureCount;

    console.log(`\n🎯 FEATURE EXPANSION SUMMARY:`);
    console.log(`  Original features: ${originalFeatureCount}`);
    console.log(`  Process features added: ${processFeatureCount}`);
    console.log(`  New total: ${newTotalCount} features`);
    console.log(`  Progress toward V6.3 target (94): ${((newTotalCount/94)*100).toFixed(1)}%`);

    // Save enhanced dataset with process features
    const enhancedDataset = {
        ...datasetObj,
        _meta: {
            ...datasetObj._meta,
            version: "v6.3_process_features_added",
            modified_at: new Date().toISOString(),
            process_features_count: processFeatureCount,
            total_features: newTotalCount
        },
        records: recipes
    };

    fs.writeFileSync('_ml_dataset_v6_3_process.json', JSON.stringify(enhancedDataset, null, 2));
    console.log(`\n💾 Enhanced dataset saved: _ml_dataset_v6_3_process.json`);

    // Save process feature extraction report
    const report = {
        timestamp: new Date().toISOString(),
        recipes_processed: recipes.length,
        process_features_added: processFeatureCount,
        feature_usage_stats: processFeatureStats,
        zero_usage_features: zeroFeatures,
        successful_extractions: sortedFeatures.length,
        sample_extractions: samplesWithFeatures.map(r => ({
            name: r.name,
            slug: r.label_slug,
            active_features: Object.entries(r.process_features)
                .filter(([_, v]) => v > 0)
                .map(([k]) => k)
        }))
    };

    fs.writeFileSync('_process_feature_extraction_report.json', JSON.stringify(report, null, 2));
    console.log(`💾 Report saved: _process_feature_extraction_report.json`);

    console.log(`\n✅ Process feature extraction complete!`);
    console.log(`Next: Yeast strain mapping expansion (Step 3)`);

} catch (error) {
    console.error(`❌ Process feature extraction failed: ${error.message}`);
    console.log("Stack:", error.stack);
}