#!/usr/bin/env node
/**
 * Debug rule system - Check if window.BM_ENGINE is available
 */
const fs = require('fs');
const vm = require('vm');

const darkBelgianDubbel = {
    og: 1.062,
    fg: 1.012,
    abv: 6.62,
    ibu: 16,
    srm: 38,
    mayaId: 'bb_abbaye',
    maya2Id: null,
    maltIds: ['pilsner', 'munich', 'crystal_60', 'chocolate'],
    hopIds: ['ekg'],
    katkiIds: []
};

console.log("🔍 RULE SYSTEM DEBUG");
console.log("===================");

try {
    // Read the V6.2 motor
    const motorCode = fs.readFileSync('_inline_v6_2_snippet.html', 'utf8');
    const jsMatch = motorCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!jsMatch) {
        throw new Error("Could not extract JavaScript from V6.2 motor");
    }

    let jsCode = jsMatch[1];

    // Read the main HTML to get BM_ENGINE
    const htmlCode = fs.readFileSync('Brewmaster_v2_79_10.html', 'utf8');

    // Extract BM_ENGINE script
    const engineMatch = htmlCode.match(/window\.BM_ENGINE = \{[^}]+\}/);
    if (!engineMatch) {
        throw new Error("Could not find window.BM_ENGINE definition");
    }

    // Extract the style engine code
    const engineStart = htmlCode.indexOf('// Brewmaster yeni skorlama motoru');
    const engineEnd = htmlCode.indexOf('window.BM_ENGINE = {');
    const engineCode = htmlCode.slice(engineStart, engineEnd + engineMatch[0].length);

    console.log(`✅ Style engine extracted: ${(engineCode.length/1024).toFixed(1)}KB`);
    console.log(`✅ V6.2 motor extracted: ${(jsCode.length/1024).toFixed(1)}KB`);

    // Create browser-like environment
    const context = {
        console: console,
        window: {},
        document: {},
    };

    vm.createContext(context);

    // First load style engine (BM_ENGINE)
    console.log("\n🔧 Loading style engine...");
    jsCode = jsCode.replace(/document\./g, '// document.');
    jsCode = jsCode.replace(/window\.location/g, '// window.location');

    // Remove DOM dependencies from engine code
    const cleanEngineCode = engineCode.replace(/document\./g, '// document.');

    try {
        vm.runInContext(cleanEngineCode, context);
        console.log("✅ Style engine loaded");

        if (context.window.BM_ENGINE) {
            console.log("✅ window.BM_ENGINE available");
            console.log("✅ findBestMatches:", typeof context.window.BM_ENGINE.findBestMatches);

            // Test findBestMatches directly
            const matches = context.window.BM_ENGINE.findBestMatches(darkBelgianDubbel, 5);
            console.log(`✅ Direct test: ${matches.length} matches found`);
            matches.forEach((m, i) => {
                console.log(`  ${i+1}. ${m.slug} - ${m.normalized}%`);
            });

        } else {
            console.log("❌ window.BM_ENGINE not available");
        }
    } catch (e) {
        console.log("❌ Style engine loading failed:", e.message);
    }

    // Now load V6.2 motor
    console.log("\n🔧 Loading V6.2 motor...");
    vm.runInContext(jsCode, context);

    if (context.window.BM_ENGINE_V5) {
        console.log("✅ V6.2 motor loaded");

        // Test ruleScores function directly
        console.log("\n🎯 Testing ruleScores function:");
        const ruleScores = context.window.BM_ENGINE_V5.ruleScores(darkBelgianDubbel);
        console.log("Rule scores:", Object.keys(ruleScores).length, "entries");

        Object.entries(ruleScores).slice(0, 5).forEach(([slug, score]) => {
            console.log(`  ${slug}: ${score}`);
        });

        // Test full classification
        console.log("\n🎯 Full classification test:");
        const result = context.window.BM_ENGINE_V5.classifyMulti(darkBelgianDubbel, {
            k: 5, w_knn: 0.4, w_rf: 0.6, w_rule: 0.1
        });

        console.log("Meta:", result._meta);
        console.log("Top-3:");
        result.top3.forEach((pred, i) => {
            console.log(`  ${i+1}. ${pred.slug} - ${pred.confidence}%`);
        });

    } else {
        console.log("❌ V6.2 motor failed to load");
    }

} catch (error) {
    console.error(`❌ DEBUG FAILED: ${error.message}`);
    console.log("Stack:", error.stack);
}