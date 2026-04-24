// Yol B — Rule + KNN ensemble
// Her reçete için hem rule (styleMatchScore) hem KNN skorla, ağırlıklı birleştir
const fs = require('fs');
const { findBestMatches, styleMatchScore } = require('./style_engine.js');
const { classifyFermType, classifyFamily } = require('./style_engine_v2.js');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');

const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

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

// KNN: slug başı agregate skor (0-1 normalize)
function knnScores(queryVec, excludeIdx, k, weights, allowedFamilies) {
  const dists = [];
  for (let i=0; i<normVecs.length; i++) {
    if (i === excludeIdx) continue;
    if (allowedFamilies && !allowedFamilies.has(records[i].label_family)) continue;
    dists.push({ i, d: distance(queryVec, normVecs[i], weights) });
  }
  dists.sort((a,b) => a.d - b.d);
  const top = dists.slice(0, k);
  const scores = {};
  let totalW = 0;
  for (const {i,d} of top) {
    const w = 1 / (d + 0.1);
    scores[records[i].label_slug] = (scores[records[i].label_slug] || 0) + w;
    totalW += w;
  }
  // Normalize 0-1
  for (const s in scores) scores[s] /= totalW;
  return scores;
}

// Rule motor: styleMatchScore tüm stillerde, normalized skor (0-1)
function ruleScores(recipe) {
  const matches = findBestMatches(recipe, 50);
  const scores = {};
  let maxNorm = 0;
  for (const m of matches) { if (m.normalized > maxNorm) maxNorm = m.normalized; }
  if (maxNorm === 0) return scores;
  for (const m of matches) scores[m.slug] = m.normalized / 100;
  return scores;
}

// Ensemble: alpha * rule + (1-alpha) * knn
function ensemblePredict(recipe, queryVec, excludeIdx, opts) {
  const { alpha, k, weights, useFamilyGate, fallbackK } = opts;
  let allowedFamilies = null;
  if (useFamilyGate) {
    const l1 = classifyFermType(recipe);
    const l2 = classifyFamily(recipe, l1.ferm_type);
    const positive = (l2.ranks||[]).filter(r=>r.score>0);
    allowedFamilies = new Set(
      (positive.length ? positive.slice(0, fallbackK) : [{family:l2.family}]).map(r=>r.family)
    );
  }
  const rScores = ruleScores(recipe);
  const kScores = knnScores(queryVec, excludeIdx, k, weights, allowedFamilies);

  // Birleşim skoru
  const allSlugs = new Set([...Object.keys(rScores), ...Object.keys(kScores)]);
  const combined = {};
  for (const s of allSlugs) {
    combined[s] = alpha * (rScores[s]||0) + (1-alpha) * (kScores[s]||0);
  }
  const ranked = Object.entries(combined).sort((a,b)=>b[1]-a[1]);
  return {
    top1: ranked[0]?.[0] || null,
    top3: ranked.slice(0,3).map(x=>x[0]),
    top5: ranked.slice(0,5).map(x=>x[0]),
  };
}

function evalEnsemble(opts) {
  let t1=0, t3=0, t5=0;
  for (let i=0; i<records.length; i++) {
    const rec = records[i];
    const recipe = convertRawToEngineRecipe(RAW_RECIPES[i]);
    const p = ensemblePredict(recipe, normVecs[i], i, opts);
    if (p.top1 === rec.label_slug)       t1++;
    if (p.top3.includes(rec.label_slug)) t3++;
    if (p.top5.includes(rec.label_slug)) t5++;
  }
  const T = records.length;
  return { t1: t1/T, t3: t3/T, t5: t5/T };
}

// ═══════════════════ CALISTIR ═══════════════════
const pct = x => (x*100).toFixed(1)+'%';
const katkiHeavy = makeWeights({yeast:2.0, katki:5.0, hop:1.5, malt:1.2, scalar:1.0, derived:0.8});
const baseWeights = makeWeights({yeast:3.0, katki:2.5, hop:1.5, malt:1.2, scalar:1.0, derived:0.8});

console.log('═══════════════════════════════════════════════════════════════');
console.log('ENSEMBLE: alpha × rule + (1-alpha) × KNN');
console.log('═══════════════════════════════════════════════════════════════');

console.log('\n── No family gate, katki-heavy weights, k=5 ──');
for (const alpha of [0.0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0]) {
  const r = evalEnsemble({ alpha, k: 5, weights: katkiHeavy, useFamilyGate: false });
  console.log(`  alpha=${alpha}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── WITH family gate (fallbackK=3), katki-heavy, k=3 ──');
for (const alpha of [0.0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0]) {
  const r = evalEnsemble({ alpha, k: 3, weights: katkiHeavy, useFamilyGate: true, fallbackK: 3 });
  console.log(`  alpha=${alpha}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── k=5, family gate fk=4, katki-heavy ──');
for (const alpha of [0.0, 0.3, 0.4, 0.5, 0.6, 0.7]) {
  const r = evalEnsemble({ alpha, k: 5, weights: katkiHeavy, useFamilyGate: true, fallbackK: 4 });
  console.log(`  alpha=${alpha}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── k=5, NO gate, base weights ──');
for (const alpha of [0.0, 0.3, 0.4, 0.5, 0.6, 0.7]) {
  const r = evalEnsemble({ alpha, k: 5, weights: baseWeights, useFamilyGate: false });
  console.log(`  alpha=${alpha}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

// Final: best-of-all
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ÖZET — sonuca bakanlar:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Rule motor baseline:     t1=29.1%  t3=46.7%  (hier)');
console.log('  Rule flat baseline:      t1=32.7%  t3=50.8%');
console.log('  Pure KNN k=5:            t1=39.2%  t3=57.8%  t5=59.8%');
console.log('  Hybrid katki-heavy k=3:  t1=43.2%  t3=51.3%');
