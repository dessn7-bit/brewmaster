// Yol B — Hibrit: rule L1/L2 + KNN L3 + feature weight grid search
// Per-family KNN: query familyına göre kısıtlı komşular
const fs = require('fs');
const { findBestMatches } = require('./style_engine.js');
const { classifyHierarchical, classifyFermType, classifyFamily } = require('./style_engine_v2.js');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');

const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

// ═══════════════════ FEATURE NORMALIZATION ═══════════════════
function normalize(f) {
  const v = [];
  for (const k of featureKeys) {
    const s = stats[k];
    if (s.std < 0.001) { v.push(0); continue; }
    if (s.min === 0 && s.max === 1) { v.push(f[k]); continue; }
    v.push((f[k] - s.mean) / s.std);
  }
  return v;
}
const normVecs = records.map(r => normalize(r.features));

// ═══════════════════ WEIGHT PROFILES (grid search) ═══════════════════
function makeWeights(profile) {
  return featureKeys.map(k => {
    if (k.startsWith('yeast_')) return profile.yeast;
    if (k.startsWith('katki_')) return profile.katki;
    if (k.startsWith('hop_'))   return profile.hop;
    if (k.startsWith('pct_'))   return profile.malt;
    if (['og','fg','abv','ibu','srm'].includes(k)) return profile.scalar;
    return profile.derived;
  });
}

function distance(a, b, w) {
  let s = 0;
  for (let i=0; i<a.length; i++) {
    const d = (a[i] - b[i]) * w[i];
    s += d*d;
  }
  return Math.sqrt(s);
}

// ═══════════════════ HYBRID PREDICT ═══════════════════
// 1. rule ile L1 ferm_type
// 2. rule ile L2 family (top-K aile)
// 3. top-K aile içindeki komşularla KNN (weighted by rule family score × 1/distance)
function hybridPredict(queryVec, queryRecipe, excludeIdx, k, weights, opts={}) {
  const useFamilyGate = opts.useFamilyGate !== false;
  const fallbackK = opts.fallbackK || 3;

  // Aile filtresi
  let allowedFamilies = null;
  let familyScores = null;
  if (useFamilyGate && queryRecipe) {
    const l1 = classifyFermType(queryRecipe);
    const l2 = classifyFamily(queryRecipe, l1.ferm_type);
    // Top-K pozitif skorlu aile (veya hepsi 0 ise default family)
    const positive = (l2.ranks||[]).filter(r => r.score > 0);
    if (positive.length > 0) {
      allowedFamilies = new Set(positive.slice(0, fallbackK).map(r=>r.family));
      familyScores = {};
      positive.slice(0, fallbackK).forEach(r => familyScores[r.family] = r.score);
    } else {
      allowedFamilies = new Set([l2.family]);
      familyScores = {[l2.family]: 1};
    }
  }

  // Komşuları topla (aile filtresi)
  const dists = [];
  for (let i=0; i<normVecs.length; i++) {
    if (i === excludeIdx) continue;
    const lbl_family = records[i].label_family;
    if (allowedFamilies && !allowedFamilies.has(lbl_family)) continue;
    dists.push({ i, d: distance(queryVec, normVecs[i], weights) });
  }
  dists.sort((a,b) => a.d - b.d);
  const top = dists.slice(0, k);

  // Weighted vote
  const votes = {};
  for (const {i, d} of top) {
    const r = records[i];
    const famScore = familyScores ? (familyScores[r.label_family] || 1) : 1;
    const w = (famScore / 100) * (1 / (d + 0.1));  // family score (0-200) × inverse distance
    votes[r.label_slug] = (votes[r.label_slug] || 0) + w;
  }
  const ranked = Object.entries(votes).sort((a,b)=>b[1]-a[1]);
  return {
    top1: ranked[0]?.[0] || null,
    top3: ranked.slice(0,3).map(x=>x[0]),
    top5: ranked.slice(0,5).map(x=>x[0]),
  };
}

// ═══════════════════ LOOCV ═══════════════════
function evalHybrid(k, weights, opts) {
  // RAW_RECIPES ile records paralel (aynı sırada, 199)
  let l3t1=0, l3t3=0, l3t5=0;
  for (let i=0; i<records.length; i++) {
    const rec = records[i];
    const v = normVecs[i];
    // Query için convertRawToEngineRecipe tekrar yapmak yerine RAW_RECIPES[i] kullan
    const queryRecipe = convertRawToEngineRecipe(RAW_RECIPES[i]);
    const p = hybridPredict(v, queryRecipe, i, k, weights, opts);
    if (p.top1 === rec.label_slug)         l3t1++;
    if (p.top3.includes(rec.label_slug))   l3t3++;
    if (p.top5.includes(rec.label_slug))   l3t5++;
  }
  const T = records.length;
  return { k, t1: l3t1/T, t3: l3t3/T, t5: l3t5/T };
}

// ═══════════════════ GRID SEARCH ═══════════════════
const pct = x => (x*100).toFixed(1)+'%';

console.log('═══════════════════════════════════════════════════════════════');
console.log('HYBRID KNN — Per-family gate + weight grid search');
console.log('═══════════════════════════════════════════════════════════════');

// Baseline: pure KNN hiç aile filtresi olmadan
console.log('\n── Pure KNN (aile gate YOK, baseline) ──');
const baseWeights = makeWeights({yeast:3.0, katki:2.5, hop:1.5, malt:1.2, scalar:1.0, derived:0.8});
for (const k of [3,5,7]) {
  const r = evalHybrid(k, baseWeights, { useFamilyGate: false });
  console.log(`  k=${k}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

// Per-family gate
console.log('\n── Hybrid (rule L1/L2 gate + KNN L3, fallbackK=3) ──');
for (const k of [3,5,7]) {
  const r = evalHybrid(k, baseWeights, { useFamilyGate: true, fallbackK: 3 });
  console.log(`  k=${k}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── Hybrid fallbackK=2 (sıkı aile gate) ──');
for (const k of [3,5,7]) {
  const r = evalHybrid(k, baseWeights, { useFamilyGate: true, fallbackK: 2 });
  console.log(`  k=${k}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── Hybrid fallbackK=1 (tek aile, en sıkı) ──');
for (const k of [3,5,7]) {
  const r = evalHybrid(k, baseWeights, { useFamilyGate: true, fallbackK: 1 });
  console.log(`  k=${k}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

// ═══════════════════ WEIGHT GRID SEARCH (k=3, fallbackK=3) ═══════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('WEIGHT GRID SEARCH (k=3, fallbackK=3) — en iyi kombinasyon bul');
console.log('═══════════════════════════════════════════════════════════════');

const profiles = [
  // y, k, h, m, s, d
  {name:'base',         yeast:3.0, katki:2.5, hop:1.5, malt:1.2, scalar:1.0, derived:0.8},
  {name:'yeast-heavy',  yeast:5.0, katki:3.0, hop:1.0, malt:0.8, scalar:0.8, derived:0.5},
  {name:'katki-heavy',  yeast:2.0, katki:5.0, hop:1.5, malt:1.2, scalar:1.0, derived:0.8},
  {name:'hop-heavy',    yeast:2.0, katki:2.0, hop:3.0, malt:1.0, scalar:1.0, derived:0.8},
  {name:'malt-heavy',   yeast:2.0, katki:2.0, hop:1.0, malt:3.0, scalar:1.0, derived:0.8},
  {name:'scalar-heavy', yeast:1.5, katki:1.5, hop:1.0, malt:1.0, scalar:3.0, derived:0.8},
  {name:'balanced',     yeast:2.0, katki:2.0, hop:2.0, malt:2.0, scalar:2.0, derived:1.0},
  {name:'y+k',          yeast:4.0, katki:4.0, hop:1.0, malt:1.0, scalar:1.0, derived:0.5},
  {name:'y+k+malt',     yeast:3.5, katki:3.5, hop:1.2, malt:2.5, scalar:1.0, derived:0.5},
  {name:'y+hop',        yeast:3.5, katki:1.5, hop:3.0, malt:1.0, scalar:1.0, derived:0.5},
];

const results = [];
for (const p of profiles) {
  const w = makeWeights(p);
  const r = evalHybrid(3, w, { useFamilyGate: true, fallbackK: 3 });
  results.push({ name: p.name, ...r });
}
results.sort((a,b)=>(b.t1-a.t1) || (b.t3-a.t3));
console.log('\n  Name          t1      t3      t5');
for (const r of results) {
  console.log('  '+r.name.padEnd(14)+pct(r.t1).padStart(6)+'  '+pct(r.t3).padStart(6)+'  '+pct(r.t5).padStart(6));
}

// En iyi profil ile k ve fallbackK grid
const winner = results[0];
const winProf = profiles.find(p=>p.name===winner.name);
console.log('\n── En iyi weight profili: ' + winner.name + ' ──');
console.log('  grid search — (k, fallbackK) kombinasyonlari:');
const winWeights = makeWeights(winProf);
for (const k of [3,5,7]) {
  for (const fk of [1,2,3,4]) {
    const r = evalHybrid(k, winWeights, { useFamilyGate: true, fallbackK: fk });
    console.log(`  k=${k} fk=${fk}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
  }
}
