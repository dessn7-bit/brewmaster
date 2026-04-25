#!/usr/bin/env node
/**
 * Yeast Strain Mapping Expansion - Convert broad categories to specific strains
 * From 16 generic yeast types to 25+ strain-specific features
 */
const fs = require('fs');

console.log("🍺 YEAST STRAIN MAPPING EXPANSION");
console.log("=================================");

// Specific yeast strain mappings
const STRAIN_MAPPINGS = {
    // Belgian expansion (from generic "yeast_belgian")
    abbey_yeast: {
        keywords: ['chimay', 'westmalle', 'abbey', 'dubbel', 'tripel', 'quadrupel', 'trappist'],
        inherit_from: ['yeast_belgian'],
        strength: 0.8
    },
    saison_yeast_3724: {
        keywords: ['saison', '3724', 'dupont', 'farmhouse', 'belle saison'],
        inherit_from: ['yeast_saison', 'yeast_belgian'],
        strength: 0.9
    },
    witbier_yeast: {
        keywords: ['witbier', 'hoegaarden', 'blue moon', 'white ale', 'wheat beer'],
        inherit_from: ['yeast_wit', 'yeast_belgian'],
        strength: 0.9
    },
    wild_belgian_blend: {
        keywords: ['lambic', 'gueuze', 'cantillon', 'drie fonteinen', 'wild ferment'],
        inherit_from: ['yeast_sour_blend', 'yeast_brett'],
        strength: 1.0
    },

    // American expansion (from generic "yeast_american")
    california_ale_chico: {
        keywords: ['sierra nevada', 'pale ale', 'ipa', 'chico', 'california ale', 'us-05'],
        inherit_from: ['yeast_american'],
        strength: 0.8
    },
    vermont_ale_conan: {
        keywords: ['neipa', 'vermont', 'heady topper', 'new england', 'conan', 'juice'],
        inherit_from: ['yeast_american'],
        strength: 0.9
    },
    london_ale_esb: {
        keywords: ['fullers', 'london esb', 'bitter', 'english pale', 'wyeast 1968'],
        inherit_from: ['yeast_english'],
        strength: 0.9
    },

    // German precision (from generic "yeast_german_lager")
    bavarian_weizen_3068: {
        keywords: ['hefeweizen', 'weissbier', 'bavarian', '3068', 'banana', 'clove'],
        inherit_from: ['yeast_wheat_german'],
        strength: 1.0
    },
    munich_lager_34_70: {
        keywords: ['munich', 'oktoberfest', 'marzen', 'lager', '34/70', 'german lager'],
        inherit_from: ['yeast_german_lager'],
        strength: 0.9
    },
    kolsch_yeast_2565: {
        keywords: ['kolsch', 'cologne', '2565', 'wlp029'],
        inherit_from: ['yeast_kolsch'],
        strength: 1.0
    },
    berliner_lacto: {
        keywords: ['berliner weisse', 'berliner', 'lacto', 'lactobacillus', 'sour'],
        inherit_from: ['yeast_lacto'],
        strength: 1.0
    },

    // Specialty and modern strains
    kveik_norwegian: {
        keywords: ['kveik', 'norwegian', 'farmhouse', 'voss', 'hornindal'],
        inherit_from: ['yeast_kveik'],
        strength: 1.0
    },
    brett_primary_100: {
        keywords: ['100% brett', 'all brett', 'brett primary', 'brettanomyces primary'],
        inherit_from: ['yeast_brett'],
        strength: 1.0
    },
    mixed_fermentation: {
        keywords: ['mixed ferment', 'lacto + brett', 'pedio', 'wild ferment'],
        inherit_from: ['yeast_sour_blend'],
        strength: 1.0
    }
};

// Additional derived strain features based on recipe characteristics
const CHARACTERISTIC_STRAINS = {
    // High attenuation strains
    high_attenuation_strain: {
        condition: (recipe) => {
            const features = recipe.features;
            if (!features.og || !features.fg) return false;
            const attenuation = ((features.og - features.fg) / (features.og - 1.0)) * 100;
            return attenuation > 80; // High attenuation threshold
        },
        strength: 0.7
    },

    // Low attenuation strains
    low_attenuation_strain: {
        condition: (recipe) => {
            const features = recipe.features;
            if (!features.og || !features.fg) return false;
            const attenuation = ((features.og - features.fg) / (features.og - 1.0)) * 100;
            return attenuation < 65; // Low attenuation threshold
        },
        strength: 0.7
    },

    // High alcohol tolerance
    alcohol_tolerant_strain: {
        condition: (recipe) => recipe.features.abv > 8.0,
        strength: 0.8
    },

    // Temperature tolerant (likely saison/kveik)
    temp_tolerant_strain: {
        condition: (recipe) => {
            // Infer from style - saisons and farmhouse typically ferment warm
            const style = recipe.label_slug;
            return /saison|farmhouse|kveik/.test(style);
        },
        strength: 0.8
    }
};

/**
 * Extract yeast strain features from recipe
 */
function extractYeastStrainFeatures(recipe) {
    const strainFeatures = {};
    const recipeText = [recipe.name, recipe.label_slug].join(' ').toLowerCase();
    const currentFeatures = recipe.features;

    // Initialize all strain features to 0
    Object.keys(STRAIN_MAPPINGS).forEach(strain => strainFeatures[strain] = 0);
    Object.keys(CHARACTERISTIC_STRAINS).forEach(strain => strainFeatures[strain] = 0);

    // Map keyword-based strains
    Object.entries(STRAIN_MAPPINGS).forEach(([strain, config]) => {
        let score = 0;

        // Check keyword matches
        config.keywords.forEach(keyword => {
            if (recipeText.includes(keyword.toLowerCase())) {
                score += config.strength;
            }
        });

        // Check inheritance from existing yeast features
        if (score === 0 && config.inherit_from) {
            config.inherit_from.forEach(parentFeature => {
                if (currentFeatures[parentFeature] && currentFeatures[parentFeature] > 0) {
                    // Inherit with reduced strength if no keyword match
                    score += config.strength * 0.5;
                }
            });
        }

        strainFeatures[strain] = Math.min(1, score);
    });

    // Map characteristic-based strains
    Object.entries(CHARACTERISTIC_STRAINS).forEach(([strain, config]) => {
        if (config.condition(recipe)) {
            strainFeatures[strain] = config.strength;
        }
    });

    return strainFeatures;
}

/**
 * Analyze existing yeast usage patterns
 */
function analyzeYeastPatterns(recipes) {
    console.log("\n📊 EXISTING YEAST PATTERN ANALYSIS:");

    const yeastFeatures = Object.keys(recipes[0].features).filter(f => f.includes('yeast_'));
    const yeastUsage = {};

    yeastFeatures.forEach(feature => {
        yeastUsage[feature] = recipes.filter(r => r.features[feature] > 0).length;
    });

    Object.entries(yeastUsage)
        .sort((a, b) => b[1] - a[1])
        .forEach(([feature, count]) => {
            console.log(`  ${feature}: ${count} recipes (${(count/recipes.length*100).toFixed(1)}%)`);
        });

    return yeastUsage;
}

/**
 * Sample strain mappings for verification
 */
function sampleStrainMappings(recipes, strainStats) {
    console.log("\n🔍 SAMPLE STRAIN MAPPINGS:");

    // Find recipes with interesting strain mappings
    const interestingSamples = recipes.filter(recipe => {
        const activeStrains = Object.entries(recipe.strain_features || {})
            .filter(([_, value]) => value > 0).length;
        return activeStrains > 0;
    }).slice(0, 8);

    interestingSamples.forEach(recipe => {
        console.log(`\n"${recipe.name}" (${recipe.label_slug})`);

        // Show original yeast features
        const originalYeast = Object.entries(recipe.features)
            .filter(([key, value]) => key.includes('yeast_') && value > 0)
            .map(([key]) => key);
        console.log(`  Original: ${originalYeast.join(', ') || 'none'}`);

        // Show mapped strain features
        const mappedStrains = Object.entries(recipe.strain_features || {})
            .filter(([_, value]) => value > 0)
            .map(([strain, value]) => `${strain} (${value.toFixed(1)})`);
        console.log(`  Mapped: ${mappedStrains.join(', ') || 'none'}`);
    });
}

try {
    // Load dataset with process features
    const datasetObj = JSON.parse(fs.readFileSync('_ml_dataset_v6_3_process.json', 'utf8'));
    const recipes = datasetObj.records;
    console.log(`\n📊 Processing ${recipes.length} recipes for yeast strain mapping`);

    // Analyze existing yeast patterns
    analyzeYeastPatterns(recipes);

    // Extract strain features for each recipe
    console.log("\n🍺 Extracting yeast strain features...");
    let strainStats = {};

    // Initialize stats
    Object.keys(STRAIN_MAPPINGS).forEach(key => strainStats[key] = 0);
    Object.keys(CHARACTERISTIC_STRAINS).forEach(key => strainStats[key] = 0);

    recipes.forEach((recipe, index) => {
        // Extract strain features
        const strainFeatures = extractYeastStrainFeatures(recipe);

        // Add to recipe
        recipe.strain_features = strainFeatures;

        // Update stats
        Object.entries(strainFeatures).forEach(([strain, value]) => {
            if (value > 0) strainStats[strain]++;
        });

        if ((index + 1) % 200 === 0) {
            console.log(`  Processed ${index + 1}/${recipes.length} recipes...`);
        }
    });

    console.log("\n📊 YEAST STRAIN MAPPING RESULTS:");

    // Sort strains by usage
    const sortedStrains = Object.entries(strainStats)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, count]) => count > 0);

    console.log(`\nSuccessfully mapped strains (${sortedStrains.length}):`);
    sortedStrains.forEach(([strain, count]) => {
        const percentage = (count / recipes.length * 100).toFixed(1);
        console.log(`  ${strain}: ${count} recipes (${percentage}%)`);
    });

    // Strains with zero usage
    const zeroStrains = Object.entries(strainStats)
        .filter(([_, count]) => count === 0)
        .map(([strain]) => strain);

    if (zeroStrains.length > 0) {
        console.log(`\n⚠️  Zero usage strains (${zeroStrains.length}): ${zeroStrains.join(', ')}`);
    }

    // Sample mappings
    sampleStrainMappings(recipes, strainStats);

    // Calculate feature expansion
    const originalFeatureCount = Object.keys(recipes[0].features).length;
    const processFeatureCount = Object.keys(recipes[0].process_features).length;
    const strainFeatureCount = Object.keys(strainStats).length;
    const newTotalCount = originalFeatureCount + processFeatureCount + strainFeatureCount;

    console.log(`\n🎯 FEATURE EXPANSION SUMMARY:`);
    console.log(`  Original features: ${originalFeatureCount}`);
    console.log(`  Process features: ${processFeatureCount}`);
    console.log(`  Strain features added: ${strainFeatureCount}`);
    console.log(`  New total: ${newTotalCount} features`);
    console.log(`  Progress toward V6.3 target (94): ${((newTotalCount/94)*100).toFixed(1)}%`);

    if (newTotalCount >= 94) {
        console.log(`  🎯 TARGET ACHIEVED! Ready for V6.3 build.`);
    } else {
        console.log(`  📊 Need ${94 - newTotalCount} more features for V6.3 target.`);
    }

    // Save enhanced dataset with strain features
    const enhancedDataset = {
        ...datasetObj,
        _meta: {
            ...datasetObj._meta,
            version: "v6.3_with_strain_features",
            modified_at: new Date().toISOString(),
            strain_features_count: strainFeatureCount,
            total_features: newTotalCount
        },
        records: recipes
    };

    fs.writeFileSync('_ml_dataset_v6_3_complete.json', JSON.stringify(enhancedDataset, null, 2));
    console.log(`\n💾 Complete V6.3 dataset saved: _ml_dataset_v6_3_complete.json`);

    // Save strain mapping report
    const report = {
        timestamp: new Date().toISOString(),
        recipes_processed: recipes.length,
        strain_features_added: strainFeatureCount,
        successful_mappings: sortedStrains.length,
        zero_usage_strains: zeroStrains,
        strain_usage_stats: strainStats,
        feature_breakdown: {
            original: originalFeatureCount,
            process: processFeatureCount,
            strain: strainFeatureCount,
            total: newTotalCount
        }
    };

    fs.writeFileSync('_strain_mapping_report.json', JSON.stringify(report, null, 2));
    console.log(`💾 Report saved: _strain_mapping_report.json`);

    console.log(`\n✅ Yeast strain mapping complete!`);

    if (newTotalCount >= 94) {
        console.log(`🚀 Ready to build V6.3 motor with ${newTotalCount} features!`);
    } else {
        console.log(`📊 Consider adding more derived features to reach 94+ target.`);
    }

} catch (error) {
    console.error(`❌ Yeast strain mapping failed: ${error.message}`);
    console.log("Stack:", error.stack);
}