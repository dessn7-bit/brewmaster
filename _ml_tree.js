// JS-native Decision Tree + Random Forest
// 216 reçete × 61 feature → L3 slug classification
// No dependencies — pure JS implementation of CART
const fs = require('fs');
const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

// ═══════════════════ NORMALIZE ═══════════════════
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

// ═══════════════════ DECISION TREE (CART) ═══════════════════
// Gini impurity
function gini(labels) {
  if (labels.length === 0) return 0;
  const counts = {};
  for (const l of labels) counts[l] = (counts[l]||0) + 1;
  let g = 1;
  const n = labels.length;
  for (const c of Object.values(counts)) g -= (c/n)**2;
  return g;
}

// Best split for node
function bestSplit(indices, featureCount, features, labels, randomFeatureCount) {
  let bestGini = Infinity, bestFeat = -1, bestThr = 0;
  const featIndices = [];
  if (randomFeatureCount && randomFeatureCount < featureCount) {
    // Random subset (for RF)
    const pool = [...Array(featureCount).keys()];
    for (let i=0; i<randomFeatureCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      featIndices.push(pool.splice(idx, 1)[0]);
    }
  } else {
    for (let i=0; i<featureCount; i++) featIndices.push(i);
  }
  for (const f of featIndices) {
    // Candidate thresholds — unique values sorted
    const vals = new Set();
    for (const i of indices) vals.add(features[i][f]);
    const sortedVals = [...vals].sort((a,b)=>a-b);
    for (let ti=0; ti<sortedVals.length-1; ti++) {
      const thr = (sortedVals[ti] + sortedVals[ti+1]) / 2;
      const left = [], right = [];
      for (const i of indices) {
        if (features[i][f] <= thr) left.push(labels[i]); else right.push(labels[i]);
      }
      if (left.length === 0 || right.length === 0) continue;
      const weightedGini = (left.length*gini(left) + right.length*gini(right)) / indices.length;
      if (weightedGini < bestGini) {
        bestGini = weightedGini; bestFeat = f; bestThr = thr;
      }
    }
  }
  return { feat: bestFeat, thr: bestThr, gini: bestGini };
}

function majorityLabel(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l]||0) + 1;
  // Return {label1: count, label2: count} for probability estimation
  return counts;
}

function buildTree(indices, features, labels, depth, maxDepth, minSamples, randomFeatureCount) {
  const nodeLabels = indices.map(i => labels[i]);
  const counts = majorityLabel(nodeLabels);

  // Leaf kriterleri
  if (depth >= maxDepth || indices.length < minSamples || Object.keys(counts).length === 1) {
    return { leaf: true, counts, size: indices.length };
  }
  const split = bestSplit(indices, features[0].length, features, labels, randomFeatureCount);
  if (split.feat < 0 || split.gini >= gini(nodeLabels)) {
    return { leaf: true, counts, size: indices.length };
  }
  const left = [], right = [];
  for (const i of indices) {
    if (features[i][split.feat] <= split.thr) left.push(i); else right.push(i);
  }
  if (left.length === 0 || right.length === 0) {
    return { leaf: true, counts, size: indices.length };
  }
  return {
    leaf: false,
    feat: split.feat, thr: split.thr,
    left:  buildTree(left,  features, labels, depth+1, maxDepth, minSamples, randomFeatureCount),
    right: buildTree(right, features, labels, depth+1, maxDepth, minSamples, randomFeatureCount),
  };
}

function predictTree(tree, vec) {
  if (tree.leaf) return tree.counts;
  if (vec[tree.feat] <= tree.thr) return predictTree(tree.left, vec);
  return predictTree(tree.right, vec);
}

// ═══════════════════ RANDOM FOREST ═══════════════════
function bootstrapIndices(n) {
  const b = [];
  for (let i=0; i<n; i++) b.push(Math.floor(Math.random() * n));
  return b;
}

function buildForest(features, labels, trainIndices, nTrees, maxDepth, minSamples, randFeatures) {
  const trees = [];
  for (let t=0; t<nTrees; t++) {
    // Bootstrap sampling
    const bootIdx = bootstrapIndices(trainIndices.length).map(i => trainIndices[i]);
    const tree = buildTree(bootIdx, features, labels, 0, maxDepth, minSamples, randFeatures);
    trees.push(tree);
  }
  return trees;
}

function predictForest(forest, vec) {
  // Aggregate class probabilities across trees
  const total = {};
  for (const tree of forest) {
    const counts = predictTree(tree, vec);
    const sum = Object.values(counts).reduce((a,b)=>a+b, 0);
    for (const [lbl, c] of Object.entries(counts)) {
      total[lbl] = (total[lbl]||0) + c/sum;  // normalize per leaf, sum across trees
    }
  }
  return total;
}

// ═══════════════════ LOOCV ═══════════════════
function evalRF(nTrees, maxDepth, minSamples, randFeatures) {
  let t1=0, t3=0, t5=0;
  for (let i=0; i<records.length; i++) {
    const trainIdx = [];
    for (let j=0; j<records.length; j++) if (j !== i) trainIdx.push(j);
    const forest = buildForest(allVecs, allLabels, trainIdx, nTrees, maxDepth, minSamples, randFeatures);
    const scores = predictForest(forest, allVecs[i]);
    const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const top1 = ranked[0]?.[0], top3 = ranked.slice(0,3).map(x=>x[0]), top5 = ranked.slice(0,5).map(x=>x[0]);
    const expected = records[i].label_slug;
    if (top1 === expected) t1++;
    if (top3.includes(expected)) t3++;
    if (top5.includes(expected)) t5++;
  }
  return { t1: t1/records.length, t3: t3/records.length, t5: t5/records.length };
}

const pct = x => (x*100).toFixed(1)+'%';
console.log('═══════════════════════════════════════════════════════════════');
console.log('RANDOM FOREST — LOOCV (216 recete, 61 feature)');
console.log('═══════════════════════════════════════════════════════════════');

// Grid: n_trees, max_depth, random_features
const configs = [
  { n:30, d:10, m:2, rf:8,  label:'RF-30 d10 rf8'  },
  { n:50, d:10, m:2, rf:8,  label:'RF-50 d10 rf8'  },
  { n:50, d:12, m:2, rf:8,  label:'RF-50 d12 rf8'  },
  { n:50, d:15, m:2, rf:10, label:'RF-50 d15 rf10' },
  { n:80, d:12, m:2, rf:8,  label:'RF-80 d12 rf8'  },
  { n:80, d:15, m:2, rf:10, label:'RF-80 d15 rf10' },
];

for (const c of configs) {
  const start = Date.now();
  const r = evalRF(c.n, c.d, c.m, c.rf);
  const dur = ((Date.now()-start)/1000).toFixed(1);
  console.log(`  ${c.label}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}  (${dur}s)`);
}
