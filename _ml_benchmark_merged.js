// Merged v1+batch2 (259) üzerinde KNN + ensemble LOOCV benchmark
const fs = require('fs');
const { findBestMatches } = require('./style_engine.js');

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

// katki-heavy weights (production optimal)
const WEIGHTS = featureKeys.map(k => {
  if (k.startsWith('yeast_')) return 2.0;
  if (k.startsWith('katki_')) return 5.0;
  if (k.startsWith('hop_'))   return 1.5;
  if (k.startsWith('pct_'))   return 1.2;
  if (['og','fg','abv','ibu','srm'].includes(k)) return 1.0;
  return 0.8;
});

function distance(a, b) {
  let s = 0;
  for (let i=0; i<a.length; i++) {
    const d = (a[i] - b[i]) * WEIGHTS[i];
    s += d*d;
  }
  return Math.sqrt(s);
}

function knnScores(queryVec, excludeIdx, k) {
  const dists = [];
  for (let i=0; i<normVecs.length; i++) {
    if (i === excludeIdx) continue;
    dists.push({ i, d: distance(queryVec, normVecs[i]) });
  }
  dists.sort((a,b) => a.d - b.d);
  const top = dists.slice(0, k);
  const scores = {};
  let totalW = 0;
  for (const {i,d} of top) {
    const slug = records[i].label_slug;
    const w = 1 / (d + 0.1);
    scores[slug] = (scores[slug] || 0) + w;
    totalW += w;
  }
  for (const s in scores) scores[s] /= totalW;
  return scores;
}

// Rule scores — recipe'yi engine-input olarak findBestMatches'e ver
// NOT: records[i].features scalar + flag; gerçek engine recipe'i yeniden build etmek lazım.
// Sade çözüm: features'dan geri-rekonstrüksyon → toy recipe ile findBestMatches yap.
function featuresToEngineRecipe(rec) {
  const f = rec.features;
  // Yeast tip/mayaId en iyi tahmin
  let _mayaTip='ale', mayaId='us05', _yeast_raw='';
  if (f.yeast_brett || f.yeast_lacto || f.yeast_sour_blend) { _mayaTip='sour'; mayaId='lacto_plantarum'; }
  else if (f.yeast_german_lager || f.yeast_czech_lager || f.yeast_american_lager) { _mayaTip='lager'; mayaId='wy2124'; }
  else if (f.yeast_wheat_german) { _mayaTip='wheat'; mayaId='wb06'; }
  else if (f.yeast_saison) { _mayaTip='saison'; mayaId='wy3724'; }
  else if (f.yeast_wit) { _mayaTip='wit'; mayaId='wy3944'; }
  else if (f.yeast_belgian) { _mayaTip='belcika'; mayaId='wy3787'; }
  else if (f.yeast_kolsch) { _mayaTip='ale'; mayaId='wlp029'; }
  else if (f.yeast_altbier) { _mayaTip='ale'; mayaId='wy1007'; }
  else if (f.yeast_kveik)   { _mayaTip='kveik'; mayaId='kveik'; }

  // maltIds minimal (hop/katki için engine eslesmesi için gerekli değil; rule scoring için percents yeterli)
  return {
    _og: f.og, _fg: f.fg, _abv: f.abv, _ibu: f.ibu, _srm: f.srm,
    _mayaTip, mayaId, maya2Id: '', _yeast_raw,
    hopIds: [], maltIds: [], katkiIds: [],
    percents: {
      pilsnerPct: f.pct_pilsner, baseMaltPct: f.pct_base, munichPct: f.pct_munich,
      viennaPct: f.pct_vienna, wheatPct: f.pct_wheat, oatsPct: f.pct_oats,
      crystalPct: f.pct_crystal, chocPct: f.pct_choc, roastPct: f.pct_roast,
      cornPct: f.pct_corn, ricePct: f.pct_rice, sugarPct: f.pct_sugar,
      aromaticAbbeyMunichPct: f.pct_aromatic_abbey, smokedPct: f.pct_smoked, ryePct: f.pct_rye,
    },
    lactose: f.katki_lactose===1,
    filtered: false, aged: false, dhPer10L: 0, blended: false,
  };
}

function ruleScores(rec) {
  const recipe = featuresToEngineRecipe(rec);
  const matches = findBestMatches(recipe, 50);
  const scores = {};
  for (const m of matches) if (m.normalized > 0) scores[m.slug] = m.normalized / 100;
  return scores;
}

function ensemblePredict(rec, queryVec, excludeIdx, alpha, k) {
  const rS = ruleScores(rec);
  const nS = knnScores(queryVec, excludeIdx, k);
  const allSlugs = new Set([...Object.keys(rS), ...Object.keys(nS)]);
  const combined = {};
  for (const s of allSlugs) combined[s] = alpha * (rS[s]||0) + (1-alpha) * (nS[s]||0);
  const ranked = Object.entries(combined).sort((a,b)=>b[1]-a[1]);
  return {
    top1: ranked[0]?.[0] || null,
    top3: ranked.slice(0,3).map(x=>x[0]),
    top5: ranked.slice(0,5).map(x=>x[0]),
  };
}

function evalPureKNN(k) {
  let t1=0,t3=0,t5=0;
  for (let i=0; i<records.length; i++) {
    const sc = knnScores(normVecs[i], i, k);
    const ranked = Object.entries(sc).sort((a,b)=>b[1]-a[1]);
    const top1 = ranked[0]?.[0], top3 = ranked.slice(0,3).map(x=>x[0]), top5 = ranked.slice(0,5).map(x=>x[0]);
    if (top1 === records[i].label_slug) t1++;
    if (top3.includes(records[i].label_slug)) t3++;
    if (top5.includes(records[i].label_slug)) t5++;
  }
  const T = records.length;
  return { t1:t1/T, t3:t3/T, t5:t5/T };
}

function evalEnsemble(alpha, k) {
  let t1=0,t3=0,t5=0;
  for (let i=0; i<records.length; i++) {
    const p = ensemblePredict(records[i], normVecs[i], i, alpha, k);
    if (p.top1 === records[i].label_slug) t1++;
    if (p.top3.includes(records[i].label_slug)) t3++;
    if (p.top5.includes(records[i].label_slug)) t5++;
  }
  const T = records.length;
  return { t1:t1/T, t3:t3/T, t5:t5/T };
}

const pct = x => (x*100).toFixed(1)+'%';
console.log('═══════════════════════════════════════════════════════════════');
console.log('MERGED BENCHMARK — v1 (199) + batch2 (60) = ' + records.length + ' recete');
console.log('═══════════════════════════════════════════════════════════════');

console.log('\n── Pure KNN ──');
for (const k of [3, 5, 7]) {
  const r = evalPureKNN(k);
  console.log(`  k=${k}: t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── Ensemble (rule × α + KNN × (1-α)) ──');
for (const alpha of [0.0, 0.2, 0.3, 0.4, 0.5]) {
  const r = evalEnsemble(alpha, 5);
  console.log(`  α=${alpha} k=5:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}

console.log('\n── v1-only karşılaştırma (199 reçete subset) ──');
// Sadece v1 reçetelerinde accuracy
let l3t1=0, l3t3=0, l3t5=0, v1Tot=0;
for (let i=0; i<records.length; i++) {
  if (!records[i].id.startsWith('v1_')) continue;
  v1Tot++;
  const p = ensemblePredict(records[i], normVecs[i], i, 0.3, 5);
  if (p.top1 === records[i].label_slug) l3t1++;
  if (p.top3.includes(records[i].label_slug)) l3t3++;
  if (p.top5.includes(records[i].label_slug)) l3t5++;
}
console.log(`  Ensemble α=0.3 k=5 (v1-only '+v1Tot+'):  t1=${pct(l3t1/v1Tot)}  t3=${pct(l3t3/v1Tot)}  t5=${pct(l3t5/v1Tot)}`);

// Batch 2 accuracy
let b2t1=0, b2t3=0, b2t5=0, b2Tot=0;
for (let i=0; i<records.length; i++) {
  if (!records[i].id.startsWith('b2_')) continue;
  b2Tot++;
  const p = ensemblePredict(records[i], normVecs[i], i, 0.3, 5);
  if (p.top1 === records[i].label_slug) b2t1++;
  if (p.top3.includes(records[i].label_slug)) b2t3++;
  if (p.top5.includes(records[i].label_slug)) b2t5++;
}
console.log(`  Ensemble α=0.3 k=5 (batch2-only '+b2Tot+'): t1=${pct(b2t1/b2Tot)}  t3=${pct(b2t3/b2Tot)}  t5=${pct(b2t5/b2Tot)}`);
