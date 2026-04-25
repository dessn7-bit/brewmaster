// FAZ 6A: V6 Integration Verification
// Checks if V6 motor is properly integrated into Brewmaster HTML

const fs = require('fs');
const path = require('path');

const FAZ6A_INTEGRATION_CHECK = {

    checkV6Integration() {
        console.log('🔍 FAZ 6A: V6 Integration Check Starting...');

        const htmlFile = 'Brewmaster_v2_79_10_with_V6.html';
        const htmlPath = path.join(__dirname, htmlFile);

        if (!fs.existsSync(htmlPath)) {
            console.error(`❌ FATAL: ${htmlFile} bulunamadı`);
            return false;
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        console.log('📄 HTML file loaded, size:', Math.round(htmlContent.length / 1024), 'KB');

        // Integration checks
        const checks = [
            {
                name: 'V6 Enhanced Motor Comment',
                pattern: /<!-- V6 Enhanced Motor Integration -->/,
                required: true
            },
            {
                name: 'V6_ENHANCED_MODEL Declaration',
                pattern: /const V6_ENHANCED_MODEL\s*=/,
                required: true
            },
            {
                name: 'V6_TRAINING_DATA Declaration',
                pattern: /const V6_TRAINING_DATA\s*=/,
                required: true
            },
            {
                name: 'runV6StylePrediction Function',
                pattern: /function runV6StylePrediction\(\)/,
                required: true
            },
            {
                name: 'V6 Motor UI Section',
                pattern: /V6 Enhanced Motor \(73\.8% Accuracy\)/,
                required: true
            },
            {
                name: 'V6 Radio Button',
                pattern: /V6 Enhanced \(Comprehensive Features\)/,
                required: true
            },
            {
                name: 'V6 Prediction Button',
                pattern: /Predict Style with V6 Motor/,
                required: true
            },
            {
                name: 'Window Global Exports',
                pattern: /window\.V6_ENHANCED_MODEL\s*=/,
                required: true
            },
            {
                name: 'Console Initialization Log',
                pattern: /Initializing V6 Enhanced Motor/,
                required: true
            }
        ];

        let passed = 0;
        let total = checks.length;

        console.log('\n🔍 Running integration checks...\n');

        for (let check of checks) {
            const found = check.pattern.test(htmlContent);
            const status = found ? '✅' : (check.required ? '❌' : '⚠️');
            const result = found ? 'PASS' : 'FAIL';

            console.log(`${status} ${check.name}: ${result}`);

            if (found) passed++;
        }

        console.log('\n📊 INTEGRATION CHECK SUMMARY');
        console.log('='.repeat(50));
        console.log(`Checks passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);

        if (passed === total) {
            console.log('🎉 INTEGRATION COMPLETE - V6 motor fully integrated!');
        } else {
            console.log('⚠️ Integration incomplete - some components missing');
        }

        // Additional content analysis
        this.analyzeV6Content(htmlContent);

        return passed === total;
    },

    analyzeV6Content(htmlContent) {
        console.log('\n🔬 V6 Content Analysis');
        console.log('-'.repeat(30));

        // Check training data size
        const trainingDataMatch = htmlContent.match(/V6_TRAINING_DATA\s*=\s*\[[\s\S]*?\];/);
        if (trainingDataMatch) {
            const trainingDataContent = trainingDataMatch[0];
            const recipeCount = (trainingDataContent.match(/"style":/g) || []).length;
            console.log('📊 Training data size:', recipeCount, 'recipes');

            if (recipeCount >= 800) {
                console.log('✅ Training data size: EXCELLENT (≥800)');
            } else if (recipeCount >= 500) {
                console.log('✅ Training data size: GOOD (≥500)');
            } else {
                console.log('⚠️ Training data size: LIMITED (<500)');
            }
        } else {
            console.log('❌ Training data structure not found');
        }

        // Check feature count
        const featureMatches = htmlContent.match(/features\.\w+/g);
        if (featureMatches) {
            const uniqueFeatures = [...new Set(featureMatches.map(f => f.replace('features.', '')))];
            console.log('🧠 Unique features detected:', uniqueFeatures.length);

            if (uniqueFeatures.length >= 70) {
                console.log('✅ Feature coverage: COMPREHENSIVE (≥70)');
            } else if (uniqueFeatures.length >= 50) {
                console.log('✅ Feature coverage: GOOD (≥50)');
            } else {
                console.log('⚠️ Feature coverage: LIMITED (<50)');
            }
        }

        // Check model weights
        const weightsMatch = htmlContent.match(/weights:\s*{[\s\S]*?}/);
        if (weightsMatch) {
            const weightsContent = weightsMatch[0];
            const weightCount = (weightsContent.match(/\w+:\s*[\d.]+/g) || []).length;
            console.log('⚖️ Feature weights defined:', weightCount);
        }

        // Check UI styling
        const uiStyleMatch = htmlContent.match(/style="[^"]*color:\s*#4169e1[^"]*"/);
        if (uiStyleMatch) {
            console.log('🎨 V6 UI styling: Blue theme detected');
        }

        // File size impact
        const totalSize = htmlContent.length;
        const beforeV6Match = htmlContent.match(/<!-- V6 Enhanced Motor Integration -->/);
        if (beforeV6Match) {
            const v6StartIndex = beforeV6Match.index;
            const v6Size = totalSize - v6StartIndex;
            console.log('📦 V6 integration size:', Math.round(v6Size / 1024), 'KB');
            console.log('📦 Total file size:', Math.round(totalSize / 1024), 'KB');
        }
    },

    generateBrowserTestInstructions() {
        console.log('\n📋 BROWSER TEST INSTRUCTIONS');
        console.log('='.repeat(50));
        console.log('1. Open Brewmaster_v2_79_10_with_V6.html in browser');
        console.log('2. Check console for: "V6 Enhanced Motor loaded successfully!"');
        console.log('3. Look for blue V6 section in UI');
        console.log('4. Test prediction with sample data:');
        console.log('   - ABV: 7.2%, SRM: 18, IBU: 25');
        console.log('   - Should predict Belgian Dubbel family');
        console.log('5. Check prediction speed (<100ms)');
        console.log('6. Verify no JavaScript errors in console');
        console.log('\n🔗 For automated testing, open: _faz6a_test_runner.html');
    }
};

// Run check if called directly
if (require.main === module) {
    const success = FAZ6A_INTEGRATION_CHECK.checkV6Integration();
    FAZ6A_INTEGRATION_CHECK.generateBrowserTestInstructions();

    process.exit(success ? 0 : 1);
}

module.exports = FAZ6A_INTEGRATION_CHECK;