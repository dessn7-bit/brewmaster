#!/usr/bin/env node
/**
 * V6.2 Feature Analysis - Understand current feature utilization
 * Before adding new features, analyze what we have
 */
const fs = require('fs');

console.log("🔍 V6.2 FEATURE ANALYSIS");
console.log("========================");

try {
    // Load V6.2 dataset
    const datasetContent = fs.readFileSync('_ml_dataset_v6_2.json', 'utf8');
    const datasetObj = JSON.parse(datasetContent);
    const dataset = datasetObj.records;
    console.log(`\n📊 Dataset loaded: ${dataset.length} recipes`);

    if (datasetObj._meta) {
        console.log(`📊 Dataset version: ${datasetObj._meta.version}`);
        console.log(`📊 Created: ${datasetObj._meta.created_at}`);
    }

    // Extract feature names from first recipe
    const firstRecipe = dataset[0];
    const featureNames = Object.keys(firstRecipe.features || firstRecipe);
    console.log(`📊 First recipe structure: ${Object.keys(firstRecipe).join(', ')}`);

    console.log(`📊 Current features: ${featureNames.length}`);
    console.log("\n🔍 FEATURE CATEGORIES:");

    // Categorize features
    const categories = {
        basic: featureNames.filter(f => ['og', 'fg', 'abv', 'ibu', 'srm'].includes(f)),
        malt: featureNames.filter(f => f.startsWith('pct_') || f.includes('malt')),
        hop: featureNames.filter(f => f.includes('hop_')),
        yeast: featureNames.filter(f => f.includes('yeast_') || f.includes('maya')),
        process: featureNames.filter(f => f.includes('process') || f.includes('technique')),
        additives: featureNames.filter(f => f.includes('katki') || f.includes('adjunct')),
        derived: featureNames.filter(f => f.includes('total_') || f.includes('ratio_')),
        boolean: featureNames.filter(f => f.includes('_flag') || f.includes('_bool'))
    };

    Object.entries(categories).forEach(([cat, features]) => {
        console.log(`  ${cat.toUpperCase()}: ${features.length} features`);
        if (features.length <= 8) {
            features.forEach(f => console.log(`    - ${f}`));
        } else {
            features.slice(0, 5).forEach(f => console.log(`    - ${f}`));
            console.log(`    ... +${features.length - 5} more`);
        }
    });

    // Feature usage statistics
    console.log("\n📈 FEATURE USAGE ANALYSIS:");

    const featureStats = {};
    featureNames.forEach(feature => {
        const values = dataset.map(recipe => recipe.features[feature]).filter(v => v != null);
        const nonZero = values.filter(v => v !== 0).length;
        const uniqueValues = [...new Set(values)].length;

        featureStats[feature] = {
            coverage: (values.length / dataset.length * 100).toFixed(1),
            nonZero: (nonZero / dataset.length * 100).toFixed(1),
            unique: uniqueValues,
            mean: values.length > 0 ? (values.reduce((a,b) => a+b, 0) / values.length).toFixed(3) : 0,
            type: typeof values[0]
        };
    });

    // Low usage features (potential for removal)
    const lowUsage = Object.entries(featureStats)
        .filter(([_, stats]) => parseFloat(stats.nonZero) < 10)
        .sort((a, b) => parseFloat(a[1].nonZero) - parseFloat(b[1].nonZero));

    console.log(`\n⚠️  LOW USAGE FEATURES (< 10% non-zero):`);
    lowUsage.slice(0, 10).forEach(([feature, stats]) => {
        console.log(`  ${feature}: ${stats.nonZero}% non-zero, ${stats.unique} unique values`);
    });

    // High variance binary features (good discriminators)
    const binaryFeatures = Object.entries(featureStats)
        .filter(([_, stats]) => stats.unique <= 2)
        .filter(([_, stats]) => parseFloat(stats.nonZero) > 5 && parseFloat(stats.nonZero) < 95)
        .sort((a, b) => Math.abs(50 - parseFloat(b[1].nonZero)) - Math.abs(50 - parseFloat(a[1].nonZero)));

    console.log(`\n✅ GOOD BINARY DISCRIMINATORS (5-95% usage):`);
    binaryFeatures.slice(0, 10).forEach(([feature, stats]) => {
        console.log(`  ${feature}: ${stats.nonZero}% usage (${stats.unique} unique)`);
    });

    // Continuous feature analysis
    const continuousFeatures = Object.entries(featureStats)
        .filter(([_, stats]) => stats.type === 'number' && stats.unique > 10)
        .sort((a, b) => parseFloat(b[1].coverage) - parseFloat(a[1].coverage));

    console.log(`\n📊 CONTINUOUS FEATURES (>10 unique values):`);
    continuousFeatures.slice(0, 10).forEach(([feature, stats]) => {
        console.log(`  ${feature}: ${stats.coverage}% coverage, mean=${stats.mean}`);
    });

    // Yeast feature analysis (important for Faz 3)
    const yeastFeatures = featureNames.filter(f => f.includes('yeast_') || f.includes('maya'));
    console.log(`\n🍺 YEAST FEATURES ANALYSIS (Current: ${yeastFeatures.length}):`);

    const yeastUsage = {};
    yeastFeatures.forEach(feature => {
        const usage = parseFloat(featureStats[feature].nonZero);
        yeastUsage[feature] = usage;
    });

    Object.entries(yeastUsage)
        .sort((a, b) => b[1] - a[1])
        .forEach(([feature, usage]) => {
            console.log(`  ${feature}: ${usage}% usage`);
        });

    // Style distribution analysis
    console.log(`\n🎯 STYLE DISTRIBUTION:`);
    const styleCount = {};
    dataset.forEach(recipe => {
        const style = recipe.label_slug || recipe.slug || 'unknown';
        styleCount[style] = (styleCount[style] || 0) + 1;
    });

    const sortedStyles = Object.entries(styleCount)
        .sort((a, b) => b[1] - a[1]);

    console.log(`  Total unique styles: ${sortedStyles.length}`);
    console.log(`  Top 10 most common styles:`);
    sortedStyles.slice(0, 10).forEach(([style, count], i) => {
        console.log(`    ${i+1}. ${style}: ${count} recipes`);
    });

    console.log(`  Bottom 10 least common styles:`);
    sortedStyles.slice(-10).forEach(([style, count], i) => {
        console.log(`    ${style}: ${count} recipes`);
    });

    // Missing feature opportunities
    console.log(`\n💡 FAZ 3 EXPANSION OPPORTUNITIES:`);

    const processKeywords = ['step', 'decoction', 'cold', 'crash', 'lager', 'dry.hop', 'barrel'];
    const yeastStrains = ['3068', '3724', 'chico', 'conan', 'abbey', 'trappist'];
    const techniques = ['biab', 'sparge', 'no.sparge', 'whirlpool', 'acidify'];

    console.log(`  🔧 Process features needed: ${processKeywords.length} categories`);
    console.log(`  🍺 Yeast strains needed: ${yeastStrains.length} specific strains`);
    console.log(`  ⚗️  Technique features needed: ${techniques.length} techniques`);

    // Feature expansion target
    const currentFeatures = featureNames.length;
    const targetFeatures = currentFeatures + 12 + 13 + 8; // Process + Yeast + Techniques

    console.log(`\n🎯 EXPANSION TARGET:`);
    console.log(`  Current: ${currentFeatures} features`);
    console.log(`  Target: ${targetFeatures} features (+${targetFeatures - currentFeatures})`);
    console.log(`  Categories: +12 process, +13 yeast, +8 technique features`);

    // Save analysis for reference
    const analysis = {
        timestamp: new Date().toISOString(),
        dataset_size: dataset.length,
        current_features: currentFeatures,
        feature_stats: featureStats,
        low_usage_features: lowUsage.map(([f, s]) => ({ feature: f, nonZero: s.nonZero })),
        good_discriminators: binaryFeatures.slice(0, 15).map(([f, s]) => ({ feature: f, usage: s.nonZero })),
        yeast_analysis: yeastUsage,
        style_distribution: Object.fromEntries(sortedStyles.slice(0, 20)),
        expansion_plan: {
            target_features: targetFeatures,
            process_features: processKeywords,
            yeast_strains: yeastStrains,
            technique_features: techniques
        }
    };

    fs.writeFileSync('_v6_2_feature_analysis.json', JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Analysis saved: _v6_2_feature_analysis.json`);
    console.log(`\n✅ Ready for Faz 3 feature expansion!`);

} catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
}