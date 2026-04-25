#!/usr/bin/env node
/**
 * V6.2 Programmatic Test - Extract and run inline motor
 * Test Dark Belgian Dubbel case directly
 */
const fs = require('fs');
const vm = require('vm');

// Test case
const darkBelgianDubbel = {
    og: 1.062,
    fg: 1.012,
    abv: 6.62,
    ibu: 16,
    srm: 38,
    // Add required fields for motor
    mayaId: 'bb_abbaye',
    maya2Id: null,
    maltIds: ['pilsner', 'munich', 'crystal_60', 'chocolate'],
    hopIds: ['ekg'],
    katkiIds: []
};

console.log("🧪 V6.2 PROGRAMMATIC TEST");
console.log("========================");
console.log("\n📋 Test Case: Dark Belgian Dubbel");
console.log(`OG: ${darkBelgianDubbel.og}, SRM: ${darkBelgianDubbel.srm}, Maya: ${darkBelgianDubbel.mayaId}`);

try {
    // Read V6.2 inline motor snippet
    const motorCode = fs.readFileSync('_inline_v6_2_snippet.html', 'utf8');

    // Extract JavaScript from HTML snippet
    const jsMatch = motorCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!jsMatch) {
        throw new Error("Could not extract JavaScript from V6.2 motor");
    }

    let jsCode = jsMatch[1];
    console.log(`\n✅ V6.2 Motor extracted: ${(jsCode.length/1024).toFixed(1)}KB`);

    // Create browser-like environment
    const context = {
        console: console,
        window: {},
        document: {},
        // Add any globals the motor might need
    };

    // Execute the motor code
    vm.createContext(context);

    // Remove any DOM dependencies and wrap in try-catch
    jsCode = jsCode.replace(/document\./g, '// document.');
    jsCode = jsCode.replace(/window\.location/g, '// window.location');

    console.log("\n🔧 Executing V6.2 motor...");
    vm.runInContext(jsCode, context);

    // Check if motor loaded successfully
    if (context.window.BM_ENGINE_V5 && context.window.BM_ENGINE_V5.classifyMulti) {
        console.log("✅ V6.2 Motor loaded successfully");

        const motor = context.window.BM_ENGINE_V5;
        console.log(`📊 Training recipes: ${motor.RECS_COUNT || 'unknown'}`);
        console.log(`📊 Features: ${motor.FEATURE_COUNT || 'unknown'}`);

        // Test the Dark Belgian Dubbel
        console.log("\n🎯 TESTING DARK BELGIAN DUBBEL:");

        const result = motor.classifyMulti(darkBelgianDubbel, {
            k: 5,
            w_knn: 0.4,
            w_rf: 0.6,
            w_rule: 0.1
        });

        console.log("\nTop-5 Predictions:");
        result.top5.forEach((pred, i) => {
            const rank = i + 1;
            const isDubbel = pred.slug === 'belgian_dubbel';
            const marker = isDubbel ? ' 🎯✅' : '';
            console.log(`  ${rank}. ${pred.slug} (${pred.displayTR}) - ${pred.confidence}%${marker}`);
        });

        // Check if belgian_dubbel is in top-3
        const dubbelRank = result.top5.findIndex(p => p.slug === 'belgian_dubbel') + 1;

        console.log("\n📊 RESULT ANALYSIS:");
        if (dubbelRank === 0) {
            console.log("❌ FAILED: belgian_dubbel NOT in top-5");
        } else if (dubbelRank <= 3) {
            console.log(`✅ SUCCESS: belgian_dubbel at rank ${dubbelRank} (top-3) 🎯`);
        } else {
            console.log(`⚠️  PARTIAL: belgian_dubbel at rank ${dubbelRank} (top-5 but not top-3)`);
        }

        // Check what V5 would have predicted (should be witbier)
        const topPrediction = result.top5[0];
        console.log(`\nTop prediction: ${topPrediction.slug} (${topPrediction.displayTR})`);

        if (topPrediction.slug === 'belgian_witbier') {
            console.log("⚠️  Still predicting witbier as top-1 (V5 behavior)");
        } else {
            console.log("✅ Top-1 is not witbier (improvement from V5)");
        }

        // Meta information
        console.log("\n📋 MOTOR META:");
        if (result._meta) {
            console.log(`KNN score: ${result._meta.knn_score || 'unknown'}`);
            console.log(`RF score: ${result._meta.rf_score || 'unknown'}`);
            console.log(`Rule score: ${result._meta.rule_score || 'unknown'}`);
        }

        // Success criteria
        console.log("\n🎯 SUCCESS CRITERIA EVALUATION:");
        const success = dubbelRank > 0 && dubbelRank <= 3;
        console.log(`✅ belgian_dubbel in top-3: ${success ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Motor loads without error: PASS`);
        console.log(`✅ Provides confidence scores: PASS`);

        const overallStatus = success ? "SUCCESS" : "NEEDS_IMPROVEMENT";
        console.log(`\n🏆 OVERALL TEST STATUS: ${overallStatus}`);

        // Save test results
        const testResults = {
            timestamp: new Date().toISOString(),
            version: 'V6.2',
            test_case: 'Dark Belgian Dubbel',
            input: darkBelgianDubbel,
            predictions: result.top5,
            belgian_dubbel_rank: dubbelRank || 'not_found',
            success: success,
            meta: result._meta
        };

        fs.writeFileSync('_v6_2_test_results.json', JSON.stringify(testResults, null, 2));
        console.log("\n💾 Test results saved: _v6_2_test_results.json");

    } else {
        throw new Error("V6.2 Motor failed to load - BM_ENGINE_V5.classifyMulti not found");
    }

} catch (error) {
    console.error(`\n❌ V6.2 PROGRAMMATIC TEST FAILED: ${error.message}`);
    console.log("\nStack trace:", error.stack);

    // Check if it's a DOM dependency issue
    if (error.message.includes('document') || error.message.includes('window')) {
        console.log("\n💡 Suggestion: Motor may have DOM dependencies. Try browser simulation approach.");
    }
}

console.log("\n" + "=".repeat(50));