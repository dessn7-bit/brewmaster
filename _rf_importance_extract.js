// Random Forest Feature Importance Extractor
// V5 motordan RF model varsa feature importance cikarma

const fs = require('fs');
const vm = require('vm');

console.log('═══ RF FEATURE IMPORTANCE ANALYSIS ═══\n');

// Load inline V5 motor
const html = fs.readFileSync(__dirname + '/Brewmaster_v2_79_10.html', 'utf8');
const m = html.match(/<script id="bm-engine-v5">([\s\S]*?)<\/script>/);
if (!m) { console.error('V5 inline bulunamadi'); process.exit(1); }
const code = m[1];

const sandbox = { window: {}, console };
sandbox.window.BM_ENGINE_V5 = null;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { timeout: 10000 });
const ENG = sandbox.window.BM_ENGINE_V5;

// Feature keys from dataset
const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const featureKeys = DS._meta.feature_keys;

console.log('Feature keys count:', featureKeys.length);
console.log('RF model available:', !!ENG.rf_model);

// Try to extract feature importance if RF model structure allows
if (ENG.rf_model && ENG.rf_model.trees) {
  console.log('RF trees found:', ENG.rf_model.trees.length);

  // Approximate feature importance by counting feature usage across trees
  const featureUsage = {};
  featureKeys.forEach(key => featureUsage[key] = 0);

  // This is a simplified heuristic - actual RF importance would need tree traversal
  ENG.rf_model.trees.forEach(tree => {
    if (tree.feature !== undefined && featureKeys[tree.feature]) {
      featureUsage[featureKeys[tree.feature]]++;
    }
    // Recursively check child nodes if available
    function countFeatureUsage(node) {
      if (!node) return;
      if (node.feature !== undefined && featureKeys[node.feature]) {
        featureUsage[featureKeys[node.feature]]++;
      }
      if (node.left) countFeatureUsage(node.left);
      if (node.right) countFeatureUsage(node.right);
    }
    countFeatureUsage(tree);
  });

  const sortedFeatures = Object.entries(featureUsage)
    .sort((a,b) => b[1] - a[1])
    .filter(([key, count]) => count > 0);

  console.log('\nTop 20 most used features in RF trees:');
  sortedFeatures.slice(0, 20).forEach(([feature, count], idx) => {
    console.log(`  ${idx+1}. ${feature}: ${count} uses`);
  });

  console.log('\nBottom 20 least used features:');
  sortedFeatures.slice(-20).forEach(([feature, count], idx) => {
    console.log(`  ${feature}: ${count} uses`);
  });

  // Check yeast features specifically
  const yeastFeatures = sortedFeatures.filter(([key, count]) => key.startsWith('yeast_'));
  console.log('\nYeast feature usage:');
  yeastFeatures.forEach(([feature, count]) => {
    console.log(`  ${feature}: ${count} uses`);
  });

} else {
  console.log('RF model structure not accessible for feature importance extraction');
  console.log('Available ENG properties:', Object.keys(ENG));

  // Try alternative approach - look for any importance arrays
  if (ENG.feature_importance) {
    console.log('Found feature_importance array:', ENG.feature_importance.length);
    const importanceWithNames = ENG.feature_importance.map((imp, idx) => ({
      feature: featureKeys[idx] || `feature_${idx}`,
      importance: imp
    })).sort((a,b) => b.importance - a.importance);

    console.log('\nTop 20 features by importance:');
    importanceWithNames.slice(0, 20).forEach((item, idx) => {
      console.log(`  ${idx+1}. ${item.feature}: ${item.importance.toFixed(4)}`);
    });

    console.log('\nBottom 20 features by importance:');
    importanceWithNames.slice(-20).forEach(item => {
      console.log(`  ${item.feature}: ${item.importance.toFixed(4)}`);
    });

  } else {
    console.log('No feature importance data found in model');
    console.log('Manual analysis: Based on brewing knowledge, expected important features:');
    console.log('  - SRM (color) for style distinction');
    console.log('  - IBU (bitterness) for hoppy vs malty styles');
    console.log('  - Yeast type (ale vs lager vs specialty)');
    console.log('  - ABV (strength categories)');
    console.log('  - Malt percentages (base vs specialty)');
    console.log('  - Hop characteristics (C-hops vs noble)');
    console.log('  - Additives (fruit, spice, etc.)');
  }
}

console.log('\n━━━ RF Feature importance analizi tamamlandı ━━━');