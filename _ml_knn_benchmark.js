// Yol B Aşama 2 — KNN baseline (Leave-One-Out Cross-Validation)
// 199 reçete, 61 feature. Her reçete için kalan 198'den KNN tahmini.
// L1 (ferm_type), L2 (family), L3 (slug) accuracy raporu.
const fs = require('fs');
const { findBestMatches } = require('./style_engine.js');
const { classifyHierarchical } = require('./style_engine_v2.js');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');

const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

// ═══════════════════ FEATURE NORMALIZATION ═══════════════════
// Z-score: (x - mean) / (std+eps). Binary feature'lar zaten 0/1 — aynen geçirilir.
function normalize(f) {
  const v = [];
  for (const k of featureKeys) {
    const s = stats[k];
    if (s.std < 0.001) { v.push(0); continue; }
    // Binary flag'lerde min=0, max=1 — zaten iyi
    if (s.min === 0 && s.max === 1) { v.push(f[k]); continue; }
    v.push((f[k] - s.mean) / s.std);
  }
  return v;
}

const normVecs = records.map(r => normalize(r.features));

// ═══════════════════ DISTANCE — L2 Euclidean ═══════════════════
// Optional: weighted (yeast flags > hop flags > scalar)
const FEATURE_WEIGHTS = featureKeys.map(k => {
  if (k.startsWith('yeast_')) return 3.0;    // yeast dominant
  if (k.startsWith('katki_')) return 2.5;    // katki strong signal
  if (k.startsWith('hop_'))   return 1.5;
  if (k.startsWith('pct_'))   return 1.2;    // malt
  if (['og','fg','abv','ibu','srm'].includes(k)) return 1.0;
  return 0.8; // derived flags
});

function distance(a, b) {
  let s = 0;
  for (let i=0; i<a.length; i++) {
    const d = (a[i] - b[i]) * FEATURE_WEIGHTS[i];
    s += d*d;
  }
  return Math.sqrt(s);
}

// ═══════════════════ KNN PREDICTION ═══════════════════
function knnPredict(queryVec, excludeIdx, k, labelKey) {
  const dists = [];
  for (let i=0; i<normVecs.length; i++) {
    if (i === excludeIdx) continue;
    dists.push({ i, d: distance(queryVec, normVecs[i]) });
  }
  dists.sort((a,b) => a.d - b.d);
  const top = dists.slice(0, k);
  // Weighted vote: w_i = 1/(d+eps)
  const votes = {};
  for (const {i,d} of top) {
    const lbl = records[i][labelKey];
    const w = 1 / (d + 0.1);
    votes[lbl] = (votes[lbl] || 0) + w;
  }
  const ranked = Object.entries(votes).sort((a,b)=>b[1]-a[1]);
  return {
    top1: ranked[0]?.[0],
    top3: ranked.slice(0,3).map(x=>x[0]),
    top5: ranked.slice(0,5).map(x=>x[0]),
    neighbors: top,
  };
}

// ═══════════════════ LOO CROSS-VALIDATION ═══════════════════
function evalKNN(k) {
  let l1=0, l2=0, l3t1=0, l3t3=0, l3t5=0;
  for (let i=0; i<records.length; i++) {
    const rec = records[i];
    const v = normVecs[i];
    const p1 = knnPredict(v, i, k, 'label_ferm');
    const p2 = knnPredict(v, i, k, 'label_family');
    const p3 = knnPredict(v, i, k, 'label_slug');
    if (p1.top1 === rec.label_ferm)            l1++;
    if (p2.top1 === rec.label_family)          l2++;
    if (p3.top1 === rec.label_slug)            l3t1++;
    if (p3.top3.includes(rec.label_slug))      l3t3++;
    if (p3.top5.includes(rec.label_slug))      l3t5++;
  }
  const T = records.length;
  return {
    k, T,
    l1:    l1   / T,
    l2:    l2   / T,
    l3t1:  l3t1 / T,
    l3t3:  l3t3 / T,
    l3t5:  l3t5 / T,
  };
}

// ═══════════════════ MEVCUT MOTOR (v1 engine-input) ═══════════════════
// Rule-based motor için aynı 199 reçetede L3 top-1/top-3 al.
function evalRuleEngine() {
  let hierTop1=0, hierTop3=0, flatTop1=0, flatTop3=0;
  for (const raw of RAW_RECIPES) {
    const rec = convertRawToEngineRecipe(raw);
    const h = classifyHierarchical(rec, {topN:5});
    const f = findBestMatches(rec, 5);
    if (h.top3[0]?.slug === raw.expected_slug) hierTop1++;
    if (h.top3.slice(0,3).some(x=>x.slug===raw.expected_slug)) hierTop3++;
    if (f[0]?.slug === raw.expected_slug) flatTop1++;
    if (f.slice(0,3).some(x=>x.slug===raw.expected_slug)) flatTop3++;
  }
  const T = RAW_RECIPES.length;
  return { hierTop1:hierTop1/T, hierTop3:hierTop3/T, flatTop1:flatTop1/T, flatTop3:flatTop3/T };
}

// ═══════════════════ CALISTIR ═══════════════════
const pct = x => (x*100).toFixed(1)+'%';

console.log('═══════════════════════════════════════════════════════════════');
console.log('KNN BASELINE — Leave-One-Out Cross-Validation (199 recete)');
console.log('═══════════════════════════════════════════════════════════════');

for (const k of [1, 3, 5, 7, 11]) {
  const r = evalKNN(k);
  console.log(`\nk=${k}:`);
  console.log(`  L1 (ferm_type):     ${pct(r.l1)}`);
  console.log(`  L2 (family):        ${pct(r.l2)}`);
  console.log(`  L3 top-1 (slug):    ${pct(r.l3t1)}`);
  console.log(`  L3 top-3 (slug):    ${pct(r.l3t3)}`);
  console.log(`  L3 top-5 (slug):    ${pct(r.l3t5)}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('RULE-BASED MOTOR (mevcut, karsilastirma)');
console.log('═══════════════════════════════════════════════════════════════');
const re = evalRuleEngine();
console.log(`  Hier top-1:         ${pct(re.hierTop1)}`);
console.log(`  Hier top-3:         ${pct(re.hierTop3)}`);
console.log(`  Flat top-1:         ${pct(re.flatTop1)}`);
console.log(`  Flat top-3:         ${pct(re.flatTop3)}`);
