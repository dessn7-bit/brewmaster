// V12 dataset rebuild — cleaned V12 base + V11's 7 FE features recomputed
// Same as V11 rebuild logic but on V12 base (cleaned, diydog/pilot dropped)
const fs = require('fs');

const v12 = JSON.parse(fs.readFileSync('_ml_dataset_v12_pre_retrain.json', 'utf8'));
console.log('V12 base (cleaned): ' + v12.recipes.length + ' recipes');

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
const stats = {};
for (const k of newFeatureNames) stats[k] = 0;

for (const r of v12.recipes) {
  const text = recipeText(r);
  const adjuncts = detectAdjuncts(text);
  const yeastBio = detectYeastBiology(r);
  Object.assign(r.features, adjuncts, yeastBio);
  for (const k of newFeatureNames) if (r.features[k]) stats[k]++;
}

console.log('\n=== Feature distribution (V12 cleaned, ' + v12.recipes.length + ') ===');
for (const k of newFeatureNames) {
  console.log('  ' + k.padEnd(28) + stats[k].toString().padStart(5) + ' (' + (100*stats[k]/v12.recipes.length).toFixed(2) + '%)');
}

// V12 = V11 features (76) — same feature_list, just cleaner data
// Make sure feature_list includes new features (V12 dataset already had them in features dict from before V11 dropped diydog/pilot, but feature_list might not be set)
const v11Labels = JSON.parse(fs.readFileSync('_v11_label_encoder_14cat.json', 'utf8'));
v12.meta.feature_list = v11Labels.feature_list; // 76 features
v12.meta.feature_count = 76;
v12.meta.regex_version = v12.meta.regex_version + '+v12train';
v12.meta.generated = new Date().toISOString();

// Re-stratified split on cleaned data
let seed=42;
function rnd(){seed=(seed*9301+49297)%233280; return seed/233280;}
function shuffle(arr){const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;}
const bySlug = {};
for (const r of v12.recipes) {
  if (!bySlug[r.bjcp_slug]) bySlug[r.bjcp_slug] = [];
  bySlug[r.bjcp_slug].push(r);
}
for (const slug of Object.keys(bySlug)) {
  const arr = shuffle(bySlug[slug]);
  const tCount = Math.max(1, Math.floor(arr.length*0.2));
  for (let i=0;i<arr.length;i++) arr[i].in_split = i<tCount ? 'test' : 'train';
}
v12.meta.train_n = v12.recipes.filter(r=>r.in_split==='train').length;
v12.meta.test_n = v12.recipes.filter(r=>r.in_split==='test').length;
console.log('\nTrain: ' + v12.meta.train_n + ' / Test: ' + v12.meta.test_n);

fs.writeFileSync('_ml_dataset_v12_pre_retrain.json', JSON.stringify(v12, null, 2));
console.log('Wrote _ml_dataset_v12_pre_retrain.json (' + (JSON.stringify(v12).length/1024/1024).toFixed(1) + ' MB)');
console.log('Sources:', JSON.stringify(v12.meta.sources));
