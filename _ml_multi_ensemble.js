// Multi-model ensemble — KNN + RF + rule weighted voting
// Hedef: top-3 %70+
const fs = require('fs');
const { findBestMatches } = require('./style_engine.js');

const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

// ═══ NORMALIZE ═══
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
const allVecs = records.map(r => normalize(r.features));
const allLabels = records.map(r => r.label_slug);

// ═══ KNN ═══
const KNN_WEIGHTS = featureKeys.map(k => {
  if (k.startsWith('yeast_')) return 2.0;
  if (k.startsWith('katki_')) return 5.0;
  if (k.startsWith('hop_'))   return 1.5;
  if (k.startsWith('pct_'))   return 1.2;
  if (['og','fg','abv','ibu','srm'].includes(k)) return 1.0;
  return 0.8;
});
function kDist(a, b) { let s=0; for (let i=0;i<a.length;i++) { const d=(a[i]-b[i])*KNN_WEIGHTS[i]; s+=d*d; } return Math.sqrt(s); }
function knnScores(queryVec, excludeIdx, k) {
  const dists = [];
  for (let i=0; i<allVecs.length; i++) {
    if (i === excludeIdx) continue;
    dists.push({ i, d: kDist(queryVec, allVecs[i]) });
  }
  dists.sort((a,b)=>a.d-b.d);
  const top = dists.slice(0, k);
  const sc = {}; let tw=0;
  for (const {i,d} of top) { const w=1/(d+0.1); sc[allLabels[i]] = (sc[allLabels[i]]||0) + w; tw+=w; }
  for (const s in sc) sc[s] /= tw;
  return sc;
}

// ═══ DECISION TREE (CART) ═══
function gini(labels) { if (!labels.length) return 0; const c={}; for (const l of labels) c[l]=(c[l]||0)+1; let g=1; const n=labels.length; for (const v of Object.values(c)) g-=(v/n)**2; return g; }
function bestSplit(idxs, fc, feats, lbls, rfc) {
  let bg=Infinity, bf=-1, bt=0;
  const fi=[];
  if (rfc && rfc < fc) { const pool=[...Array(fc).keys()]; for (let i=0;i<rfc;i++) { const k=Math.floor(Math.random()*pool.length); fi.push(pool.splice(k,1)[0]); } }
  else for (let i=0;i<fc;i++) fi.push(i);
  for (const f of fi) {
    const vs = new Set(); for (const i of idxs) vs.add(feats[i][f]);
    const sv = [...vs].sort((a,b)=>a-b);
    for (let ti=0;ti<sv.length-1;ti++) {
      const thr=(sv[ti]+sv[ti+1])/2;
      const L=[], R=[];
      for (const i of idxs) { if (feats[i][f]<=thr) L.push(lbls[i]); else R.push(lbls[i]); }
      if (!L.length||!R.length) continue;
      const wg = (L.length*gini(L)+R.length*gini(R))/idxs.length;
      if (wg<bg) { bg=wg; bf=f; bt=thr; }
    }
  }
  return { feat:bf, thr:bt, gini:bg };
}
function majority(lbls) { const c={}; for (const l of lbls) c[l]=(c[l]||0)+1; return c; }
function buildTree(idxs, feats, lbls, d, md, ms, rfc) {
  const nl = idxs.map(i=>lbls[i]);
  const cnt = majority(nl);
  if (d>=md || idxs.length<ms || Object.keys(cnt).length===1) return { leaf:true, counts:cnt };
  const s = bestSplit(idxs, feats[0].length, feats, lbls, rfc);
  if (s.feat<0 || s.gini>=gini(nl)) return { leaf:true, counts:cnt };
  const L=[], R=[];
  for (const i of idxs) { if (feats[i][s.feat]<=s.thr) L.push(i); else R.push(i); }
  if (!L.length||!R.length) return { leaf:true, counts:cnt };
  return { leaf:false, feat:s.feat, thr:s.thr,
    left: buildTree(L, feats, lbls, d+1, md, ms, rfc),
    right: buildTree(R, feats, lbls, d+1, md, ms, rfc) };
}
function predictTree(t, v) { if (t.leaf) return t.counts; return predictTree(v[t.feat]<=t.thr?t.left:t.right, v); }

// ═══ RANDOM FOREST ═══
function buildForest(feats, lbls, train, nTrees, md, ms, rfc) {
  const trees = [];
  for (let t=0;t<nTrees;t++) {
    const b = [];
    for (let i=0;i<train.length;i++) b.push(train[Math.floor(Math.random()*train.length)]);
    trees.push(buildTree(b, feats, lbls, 0, md, ms, rfc));
  }
  return trees;
}
function rfScores(forest, vec) {
  const total = {};
  for (const tree of forest) {
    const c = predictTree(tree, vec);
    const sum = Object.values(c).reduce((a,b)=>a+b, 0);
    for (const [l,v] of Object.entries(c)) total[l] = (total[l]||0) + v/sum;
  }
  // Normalize
  const maxV = Math.max(...Object.values(total));
  if (maxV > 0) for (const s in total) total[s] /= maxV * forest.length;
  // Actually normalize to sum=1
  const sum = Object.values(total).reduce((a,b)=>a+b, 0);
  if (sum > 0) for (const s in total) total[s] /= sum;
  return total;
}

// ═══ RULE SCORES ═══
function featuresToRecipe(rec) {
  const f = rec.features;
  let _mayaTip='ale', mayaId='us05';
  if (f.yeast_brett || f.yeast_lacto || f.yeast_sour_blend) { _mayaTip='sour'; mayaId='lacto_plantarum'; }
  else if (f.yeast_german_lager || f.yeast_czech_lager || f.yeast_american_lager) { _mayaTip='lager'; mayaId='wy2124'; }
  else if (f.yeast_wheat_german) { _mayaTip='wheat'; mayaId='wb06'; }
  else if (f.yeast_saison) { _mayaTip='saison'; mayaId='wy3724'; }
  else if (f.yeast_wit) { _mayaTip='wit'; mayaId='wy3944'; }
  else if (f.yeast_belgian) { _mayaTip='belcika'; mayaId='wy3787'; }
  else if (f.yeast_kolsch) { _mayaTip='ale'; mayaId='wlp029'; }
  else if (f.yeast_altbier) { _mayaTip='ale'; mayaId='wy1007'; }
  return {
    _og:f.og, _fg:f.fg, _abv:f.abv, _ibu:f.ibu, _srm:f.srm,
    _mayaTip, mayaId, maya2Id:'', _yeast_raw:'',
    hopIds:[], maltIds:[], katkiIds:[],
    percents:{
      pilsnerPct:f.pct_pilsner, baseMaltPct:f.pct_base, munichPct:f.pct_munich,
      viennaPct:f.pct_vienna, wheatPct:f.pct_wheat, oatsPct:f.pct_oats,
      crystalPct:f.pct_crystal, chocPct:f.pct_choc, roastPct:f.pct_roast,
      cornPct:f.pct_corn, ricePct:f.pct_rice, sugarPct:f.pct_sugar,
      aromaticAbbeyMunichPct:f.pct_aromatic_abbey, smokedPct:f.pct_smoked, ryePct:f.pct_rye,
    },
    lactose:f.katki_lactose===1, filtered:false, aged:false, dhPer10L:0, blended:false,
  };
}
function ruleScores(rec) {
  const recipe = featuresToRecipe(rec);
  const matches = findBestMatches(recipe, 50);
  const sc = {}; for (const m of matches) if (m.normalized > 0) sc[m.slug] = m.normalized / 100;
  return sc;
}

// ═══ MULTI-MODEL ENSEMBLE ═══
function mergeScores(scoresArr, weights) {
  const total = {};
  for (let i=0;i<scoresArr.length;i++) {
    const sc = scoresArr[i], w = weights[i];
    for (const [s,v] of Object.entries(sc)) total[s] = (total[s]||0) + v*w;
  }
  return total;
}

// ═══ LOOCV — RF preload (tek forest, test için hepsine uygular) ═══
// NOT: LOOCV ideal RF her test için ayrı ama maliyetli. Pragmatik: 5-fold CV tipi yaklaşım.
// Burada her test için RF'yi 216-1 reçete üzerinden yeniden eğiteceğiz (doğru LOOCV).
// Random Forest için cost = n_test × n_trees × tree_build. 216 × 50 × 50ms ≈ 540sec. Uygun.

function evalMultiModel(opts) {
  const { k, n_trees, max_depth, min_samples, rand_features, w_knn, w_rf, w_rule } = opts;
  let t1=0, t3=0, t5=0;
  const breakdown = { knn_only:0, rf_only:0, rule_only:0, all_agree:0 };
  for (let i=0; i<records.length; i++) {
    const trainIdx = [];
    for (let j=0; j<records.length; j++) if (j !== i) trainIdx.push(j);

    const knnS = knnScores(allVecs[i], i, k);
    const forest = buildForest(allVecs, allLabels, trainIdx, n_trees, max_depth, min_samples, rand_features);
    const rfS = rfScores(forest, allVecs[i]);
    const ruleS = w_rule > 0 ? ruleScores(records[i]) : {};

    // Merge
    const total = mergeScores([knnS, rfS, ruleS], [w_knn, w_rf, w_rule]);
    const ranked = Object.entries(total).sort((a,b)=>b[1]-a[1]);
    const top1 = ranked[0]?.[0], top3 = ranked.slice(0,3).map(x=>x[0]), top5 = ranked.slice(0,5).map(x=>x[0]);
    const exp = records[i].label_slug;
    if (top1 === exp) t1++;
    if (top3.includes(exp)) t3++;
    if (top5.includes(exp)) t5++;
  }
  return { t1:t1/records.length, t3:t3/records.length, t5:t5/records.length };
}

// ═══════════════════ RUN ═══════════════════
const pct = x => (x*100).toFixed(1)+'%';
console.log('═══════════════════════════════════════════════════════════════');
console.log('MULTI-MODEL ENSEMBLE — KNN + RF + rule (216 reçete LOOCV)');
console.log('═══════════════════════════════════════════════════════════════');

const configs = [
  { label:'KNN only (k=5)',       k:5, n_trees:0, max_depth:0, min_samples:2, rand_features:10, w_knn:1.0, w_rf:0.0, w_rule:0.0 },
  { label:'RF only (50 d15)',     k:0, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.0, w_rf:1.0, w_rule:0.0 },
  { label:'KNN+RF (0.5/0.5)',     k:5, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.5, w_rf:0.5, w_rule:0.0 },
  { label:'KNN+RF (0.4/0.6)',     k:5, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.4, w_rf:0.6, w_rule:0.0 },
  { label:'KNN+RF (0.6/0.4)',     k:5, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.6, w_rf:0.4, w_rule:0.0 },
  { label:'KNN+RF+rule (.4/.4/.2)',k:5, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.4, w_rf:0.4, w_rule:0.2 },
  { label:'KNN+RF+rule (.3/.5/.2)',k:5, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.3, w_rf:0.5, w_rule:0.2 },
  { label:'KNN+RF+rule (.35/.45/.2)',k:5, n_trees:50, max_depth:15, min_samples:2, rand_features:10, w_knn:0.35, w_rf:0.45, w_rule:0.2 },
];

for (const c of configs) {
  const start = Date.now();
  const r = evalMultiModel(c);
  const dur = ((Date.now()-start)/1000).toFixed(1);
  console.log(`  ${c.label.padEnd(30)}: t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}  (${dur}s)`);
}
