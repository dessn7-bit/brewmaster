// V7 Inference Template — Browser-side XGBoost JSON tree evaluator
// Adım 34 — JSON model loader + predict function
// To be inlined into Brewmaster_v2_79_10.html in Adım 36
//
// Model files needed at runtime:
//   _v7_model.json         — XGBoost native JSON dump (8.6 MB)
//   _v7_label_encoder.json — { classes: [101], n_classes: 101, feature_list: [69] }
//
// Architecture:
//   1. Load model JSON (one-time, can be cached)
//   2. Build feature vector from S/recipe (Adım 36 builder)
//   3. Walk each tree → leaf score per class
//   4. Sum scores per class, softmax → probabilities
//   5. Top-3 indices → label_encoder reverse → bjcp_slug list
//
// Note: ONNX export failed in Adım 34 (onnxmltools 1.13 + xgboost 2.1 incompat).
// JSON inference is functional but slower than ONNX. Browser perf TBD.

const V7_MODEL_URL = './_v7_model.json';
const V7_LABEL_URL = './_v7_label_encoder.json';

let _v7Model = null;     // Parsed XGBoost JSON
let _v7Labels = null;    // {classes, n_classes, feature_list}

async function loadV7Model() {
  if (_v7Model && _v7Labels) return;
  const [modelRes, labelRes] = await Promise.all([
    fetch(V7_MODEL_URL).then(r => r.json()),
    fetch(V7_LABEL_URL).then(r => r.json())
  ]);
  _v7Model = modelRes;
  _v7Labels = labelRes;
  console.log('[V7] loaded model:', _v7Model.learner ? 'OK' : 'INVALID',
              '| classes:', _v7Labels.n_classes,
              '| features:', _v7Labels.feature_list.length);
}

// Walk a single XGBoost tree
// Tree node format (XGBoost JSON): { nodeid, depth, split, split_condition, yes, no, missing, ... }
// Leaf: { nodeid, leaf }
function evalTree(tree, x) {
  // tree is array of nodes indexed by nodeid OR a tree dict — depends on XGBoost JSON format
  // XGBoost 2.x dumps trees as: { nodes: [{...}], split_indices, split_conditions, default_left, ... }
  // For simplicity here we assume tree.nodes structure or fallback to nodeid map
  if (Array.isArray(tree)) {
    // legacy: array of nodes
    let nodeId = 0;
    while (true) {
      const node = tree[nodeId];
      if (!node) return 0;
      if (node.leaf !== undefined) return node.leaf;
      const v = x[node.split];
      const cond = node.split_condition;
      if (v === undefined || v === null || isNaN(v)) {
        nodeId = node.missing !== undefined ? node.missing : node.yes;
      } else {
        nodeId = v < cond ? node.yes : node.no;
      }
    }
  }
  // XGBoost 2.x model format — `trees` key contains array of {nodes, ...}
  const nodes = tree.nodes || tree.tree || [];
  const splitIndices = tree.split_indices || nodes.map(n => n.split_index || n.split || 0);
  const splitConds = tree.split_conditions || nodes.map(n => n.split_condition || 0);
  const lefts = tree.left_children || nodes.map(n => n.left_child !== undefined ? n.left_child : n.yes || -1);
  const rights = tree.right_children || nodes.map(n => n.right_child !== undefined ? n.right_child : n.no || -1);
  const defaultLeft = tree.default_left || nodes.map(n => n.default_left !== false);
  const baseWeights = tree.base_weights || nodes.map(n => n.base_weight !== undefined ? n.base_weight : (n.leaf_value || n.leaf || 0));

  let nodeId = 0;
  while (lefts[nodeId] !== -1 && rights[nodeId] !== -1) {
    const v = x[splitIndices[nodeId]];
    const cond = splitConds[nodeId];
    if (v === undefined || v === null || isNaN(v)) {
      nodeId = defaultLeft[nodeId] ? lefts[nodeId] : rights[nodeId];
    } else {
      nodeId = v < cond ? lefts[nodeId] : rights[nodeId];
    }
  }
  return baseWeights[nodeId] || 0;
}

// Predict: returns top-3 [{slug, conf}, ...]
// featureVector: array of 69 floats matching _v7_labels.feature_list order
function predictStyleV7(featureVector) {
  if (!_v7Model || !_v7Labels) {
    throw new Error('V7 model not loaded — call loadV7Model() first');
  }
  if (!Array.isArray(featureVector) || featureVector.length !== _v7Labels.feature_list.length) {
    throw new Error('featureVector must be length ' + _v7Labels.feature_list.length);
  }

  const nClasses = _v7Labels.n_classes;
  const trees = _v7Model.learner && _v7Model.learner.gradient_booster &&
                _v7Model.learner.gradient_booster.model &&
                _v7Model.learner.gradient_booster.model.trees;
  if (!trees) throw new Error('Could not find trees in model JSON');

  // Multi-class XGBoost: trees ordered as [tree_0_class_0, tree_0_class_1, ..., tree_0_class_C, tree_1_class_0, ...]
  const scores = new Array(nClasses).fill(0);
  for (let i = 0; i < trees.length; i++) {
    const cls = i % nClasses;
    scores[cls] += evalTree(trees[i], featureVector);
  }

  // Softmax
  const maxScore = Math.max(...scores);
  const expScores = scores.map(s => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const probs = expScores.map(e => e / sumExp);

  // Top-3 indices
  const indexed = probs.map((p, i) => ({ idx: i, p }));
  indexed.sort((a, b) => b.p - a.p);

  return indexed.slice(0, 3).map(x => ({
    slug: _v7Labels.classes[x.idx],
    conf: +(x.p * 100).toFixed(1)
  }));
}

// Browser usage:
//   await loadV7Model();
//   const featVec = buildV7FeatureVector(recipe);  // 69-dim array
//   const top3 = predictStyleV7(featVec);
//   // [{slug:"american_india_pale_ale", conf:42.3}, ...]

window.loadV7Model = loadV7Model;
window.predictStyleV7 = predictStyleV7;
