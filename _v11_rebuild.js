// V11 dataset rebuild — V10.1 üzerine 7 yeni feature ekle (69 → 76)
const fs = require('fs');

const v101 = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
console.log('V10.1 dataset: ' + v101.recipes.length + ' recipes, ' + v101.meta.feature_list.length + ' features');

// === New feature detectors ===

function recipeText(r) {
  const parts = [];
  if (r.name) parts.push(String(r.name));
  if (r.sorte_raw) parts.push(String(r.sorte_raw));
  if (r.raw) {
    if (r.raw.notes) parts.push(String(r.raw.notes));
    if (r.raw.author) parts.push(String(r.raw.author));
    if (r.raw.malts) parts.push(r.raw.malts.map(m => m.name || '').join(' '));
    if (r.raw.hops) parts.push(r.raw.hops.map(h => h.name || '').join(' '));
    if (r.raw.yeast) parts.push(String(r.raw.yeast));
  }
  return parts.join(' ').toLowerCase();
}

function detectAdjuncts(text) {
  return {
    has_coffee: /\b(coffee|espresso|cold[\s-]?brew|caffè)\b/i.test(text) ? 1 : 0,
    has_fruit: /\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|lime|lemon zest|orange peel|frambozen|himbeere|kirsche|aardbei|pomegranate)\b/i.test(text) ? 1 : 0,
    has_spice: /\b(coriander|cardamom|cinnamon|vanilla bean|black pepper|ginger|anise|nutmeg|clove|kruidnagel|kaneel|gember)\b/i.test(text) ? 1 : 0,
    has_chili: /\b(chipotle|jalape[ñn]o|habanero|ghost pepper|chili pepper|chili|ancho|poblano|chile)\b/i.test(text) ? 1 : 0,
    has_smoke: /\b(smoke|smoked|rauch|peat|gerookt|isli)\b(?!\s*malt|\s*malz|mout)/i.test(text) ? 1 : 0
  };
}

function detectYeastBiology(r) {
  let y = r.raw?.yeast || '';
  if (Array.isArray(y)) y = y.join(' ');
  const yLower = String(y).toLowerCase();
  const BELGIAN = ['wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388','wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565','wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590','safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison'];
  const CLEAN_US05 = ['wyeast 1056','wy1056','wlp001','wlp 001','safale us-05','safale us05','us-05','us05','bry-97','bry97','chico'];
  return {
    has_belgian_yeast: BELGIAN.some(id => yLower.includes(id)) ? 1 : 0,
    has_clean_us05_isolate: CLEAN_US05.some(id => yLower.includes(id)) ? 1 : 0
  };
}

const newFeatureNames = ['has_coffee', 'has_fruit', 'has_spice', 'has_chili', 'has_smoke', 'has_belgian_yeast', 'has_clean_us05_isolate'];

// Apply to all recipes
const stats = { has_coffee:0, has_fruit:0, has_spice:0, has_chili:0, has_smoke:0, has_belgian_yeast:0, has_clean_us05_isolate:0 };
for (const r of v101.recipes) {
  const text = recipeText(r);
  const adjuncts = detectAdjuncts(text);
  const yeastBio = detectYeastBiology(r);
  Object.assign(r.features, adjuncts, yeastBio);
  for (const k of newFeatureNames) if (r.features[k]) stats[k]++;
}

console.log('\n=== New feature distribution ===');
for (const k of newFeatureNames) {
  console.log('  ' + k.padEnd(28) + stats[k].toString().padStart(5) + ' (' + (100*stats[k]/v101.recipes.length).toFixed(2) + '%)');
}

// Sanity: make sure we didn't break anything
const sample = v101.recipes[0];
console.log('\nSample features (first recipe):');
console.log('  Total feature count:', Object.keys(sample.features).length);
console.log('  Last 7 (new):', newFeatureNames.map(k => k+'='+sample.features[k]));

// Update meta
const newFeatureList = [...v101.meta.feature_list, ...newFeatureNames];
v101.meta.feature_list = newFeatureList;
v101.meta.feature_count = newFeatureList.length;
v101.meta.regex_version = '26B+r+b+t+roer+blog+v11feat';
v101.meta.generated = new Date().toISOString();

fs.writeFileSync('_ml_dataset_v11_pre_retrain.json', JSON.stringify(v101, null, 2));
console.log('\nWrote _ml_dataset_v11_pre_retrain.json (' + (JSON.stringify(v101).length/1024/1024).toFixed(1) + ' MB)');
console.log('Feature count: ' + newFeatureList.length + ' (V10.1 had 69)');
