// V6.2 multi-model ensemble inline — KNN + RF + rule (Faz 2: Tier 1+2 complete)
// Random Forest tek seferde tüm dataset'le eğitilir, model JSON olarak HTML'e gömülür.
const fs = require('fs');

// V6.2: Use Tier 1+2 expanded dataset (1071 recipes, normalized labels + tier1+2 expansion)
const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset_v6_2.json', 'utf8'));

// V6.0: Alias mapping for runtime normalization
const ALIAS_MAP = {
  'doppelbock': 'german_doppelbock',
  'schwarzbier': 'german_schwarzbier',
  'american_wild': 'american_wild_ale',
  'fruit_lambic': 'belgian_fruit_lambic',
  'biere_de_garde': 'french_biere_de_garde',
  'french_bi_re_de_garde': 'french_biere_de_garde',
  'belgian_speciale_belge': 'belgian_pale_ale',
  'american_barley_wine_ale': 'american_barleywine',
  'german_kolsch': 'german_koelsch',
  'italian_pilsener': 'italian_pilsner',
  'lambic': 'belgian_lambic',
  'wild_beer': 'american_wild_ale',
  'english_barleywine': 'british_barley_wine_ale'
};
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

// ═══ Feature vec normalize ═══
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

// ═══ Build RF on FULL dataset (deploy model) ═══
function gini(lbls) { if (!lbls.length) return 0; const c={}; for (const l of lbls) c[l]=(c[l]||0)+1; let g=1; const n=lbls.length; for (const v of Object.values(c)) g-=(v/n)**2; return g; }
function bestSplit(idxs, fc, feats, lbls, rfc) {
  let bg=Infinity, bf=-1, bt=0;
  const fi=[]; const pool=[...Array(fc).keys()];
  const take = Math.min(rfc, fc);
  for (let i=0;i<take;i++) { const k=Math.floor(Math.random()*pool.length); fi.push(pool.splice(k,1)[0]); }
  for (const f of fi) {
    const vs=new Set(); for (const i of idxs) vs.add(feats[i][f]);
    const sv=[...vs].sort((a,b)=>a-b);
    for (let ti=0;ti<sv.length-1;ti++) {
      const thr=(sv[ti]+sv[ti+1])/2;
      const L=[],R=[];
      for (const i of idxs) { if (feats[i][f]<=thr) L.push(lbls[i]); else R.push(lbls[i]); }
      if (!L.length||!R.length) continue;
      const wg=(L.length*gini(L)+R.length*gini(R))/idxs.length;
      if (wg<bg) { bg=wg; bf=f; bt=thr; }
    }
  }
  return { feat:bf, thr:bt, gini:bg };
}
function buildTree(idxs, feats, lbls, d, md, ms, rfc) {
  const nl=idxs.map(i=>lbls[i]);
  const cnt={}; for (const l of nl) cnt[l]=(cnt[l]||0)+1;
  if (d>=md||idxs.length<ms||Object.keys(cnt).length===1) return { l:true, c:cnt };
  const s=bestSplit(idxs, feats[0].length, feats, lbls, rfc);
  if (s.feat<0||s.gini>=gini(nl)) return { l:true, c:cnt };
  const L=[],R=[];
  for (const i of idxs) { if (feats[i][s.feat]<=s.thr) L.push(i); else R.push(i); }
  if (!L.length||!R.length) return { l:true, c:cnt };
  return { l:false, f:s.feat, t:s.thr,
    L:buildTree(L, feats, lbls, d+1, md, ms, rfc),
    R:buildTree(R, feats, lbls, d+1, md, ms, rfc) };
}
function buildForest(feats, lbls, nTrees, md, ms, rfc) {
  const trees=[];
  for (let t=0;t<nTrees;t++) {
    const b=[];
    for (let i=0;i<feats.length;i++) b.push(Math.floor(Math.random()*feats.length));
    trees.push(buildTree(b, feats, lbls, 0, md, ms, rfc));
  }
  return trees;
}

console.log('Training RF on full dataset (50 trees, d=15, rf=10)...');
const FOREST = buildForest(allVecs, allLabels, 50, 15, 2, 10);

// ═══ Compact tree encoding ═══
// Her node: leaf ise [0, counts_obj], branch ise [1, feat, thr, leftNode, rightNode]
function compactTree(t) {
  if (t.l) return [0, t.c];
  return [1, t.f, t.t, compactTree(t.L), compactTree(t.R)];
}
const compactForest = FOREST.map(compactTree);
const forestStr = JSON.stringify(compactForest);
console.log('  Forest JSON size:', (forestStr.length/1024).toFixed(1), 'KB');

// ═══ Compact dataset (KNN için) ═══
const compactRecords = records.map(r => {
  const fv = featureKeys.map(k => r.features[k]);
  return [r.id, r.label_slug, r.label_family, r.label_ferm, fv];
});
const mlData = { fkeys: featureKeys, stats, records: compactRecords };
const dataStr = JSON.stringify(mlData);

// ═══ Feature extraction kodu (V4'ten copy) ═══
const featureCodeRaw = fs.readFileSync(__dirname + '/_ml_features.js', 'utf8');
const FEATURE_CODE = featureCodeRaw
  .match(/\/\/ ═+ YEAST SIGNATURE[\s\S]+?\nfunction extractFeatures\(recipe\) \{[\s\S]+?\n  return f;\n\}/)[0];

const escape = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const inlineBlock = `<script id="bm-engine-v5">
// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER V5 — Multi-model ensemble (KNN + RF + rule)
// Pre-trained 50-tree Random Forest + 216-rec KNN
// Uretim: node _build_inline_v5.js
// Kullanim: window.BM_ENGINE_V5.classifyMulti(recipe, opts)
// ═══════════════════════════════════════════════════════════════════════════
(function(){
  const __ML = JSON.parse(\`${escape(dataStr)}\`);
  const __FOREST = JSON.parse(\`${escape(forestStr)}\`);
  const __ALIASES = JSON.parse(\`${escape(JSON.stringify(ALIAS_MAP))}\`);
  const FKEYS = __ML.fkeys;
  const STATS = __ML.stats;
  const RECS  = __ML.records;
  function normSlug(s) { return __ALIASES[s] || s; }
  window.BM_STYLE_ALIASES = __ALIASES;
  window.bmNormalizeSlug = normSlug;

${FEATURE_CODE}

  function toVec(recipe) {
    const f = extractFeatures(recipe);
    const v = [];
    for (const k of FKEYS) {
      const s = STATS[k];
      if (s.std < 0.001) { v.push(0); continue; }
      if (s.min === 0 && s.max === 1) { v.push(f[k]); continue; }
      v.push((f[k] - s.mean) / s.std);
    }
    return v;
  }

  const KWEIGHTS = FKEYS.map(k => {
    if (k.startsWith('yeast_')) return 2.0;
    if (k.startsWith('katki_')) return 5.0;
    if (k.startsWith('hop_'))   return 1.5;
    if (k.startsWith('pct_'))   return 1.2;
    if (['og','fg','abv','ibu','srm'].includes(k)) return 1.0;  // scalar=2.5 overfitting yarattı, 1.0 stabil
    return 0.8;
  });

  function kDist(a,b) { let s=0; for (let i=0;i<a.length;i++) { const d=(a[i]-b[i])*KWEIGHTS[i]; s+=d*d; } return Math.sqrt(s); }

  function knnScores(vec, k) {
    const dists = [];
    for (let i=0; i<RECS.length; i++) dists.push({ i, d: kDist(vec, RECS[i][4]) });
    dists.sort((a,b)=>a.d-b.d);
    const top = dists.slice(0, k);
    const sc = {}; let tw=0;
    for (const {i,d} of top) { const w = 1/(d+0.1); sc[RECS[i][1]] = (sc[RECS[i][1]]||0)+w; tw+=w; }
    for (const s in sc) sc[s] /= tw;
    return sc;
  }

  function predictTreeC(node, vec) {
    if (node[0] === 0) return node[1]; // leaf counts
    return vec[node[1]] <= node[2] ? predictTreeC(node[3], vec) : predictTreeC(node[4], vec);
  }

  function rfScores(vec) {
    const total = {};
    for (const tree of __FOREST) {
      const c = predictTreeC(tree, vec);
      const sum = Object.values(c).reduce((a,b)=>a+b, 0);
      for (const [l,v] of Object.entries(c)) total[l] = (total[l]||0) + v/sum;
    }
    const tsum = Object.values(total).reduce((a,b)=>a+b, 0);
    if (tsum > 0) for (const s in total) total[s] /= tsum;
    return total;
  }

  function ruleScores(recipe) {
    if (!window.BM_ENGINE || !window.BM_ENGINE.findBestMatches) return {};
    const matches = window.BM_ENGINE.findBestMatches(recipe, 50);
    const sc = {};
    for (const m of matches) if (m.normalized > 0) sc[m.slug] = m.normalized / 100;
    return sc;
  }

  function classifyMulti(recipe, opts) {
    opts = opts || {};
    const k = opts.k != null ? opts.k : 5;
    const wKNN = opts.w_knn != null ? opts.w_knn : 0.4;   // benchmark optimal
    const wRF  = opts.w_rf  != null ? opts.w_rf  : 0.6;   // benchmark optimal
    const wRule= opts.w_rule!= null ? opts.w_rule: 0.0;   // rule reconstruction zayıf LOOCV'de — production'da aç denemesi için opts ile

    const vec = toVec(recipe);
    const kS = knnScores(vec, k);
    const fS = rfScores(vec);
    const rS = wRule > 0 ? ruleScores(recipe) : {};

    const allSlugs = new Set([...Object.keys(kS), ...Object.keys(fS), ...Object.keys(rS)]);
    const combined = {};
    for (const s of allSlugs) {
      combined[s] = wKNN*(kS[s]||0) + wRF*(fS[s]||0) + wRule*(rS[s]||0);
    }
    // Collapse aliases in output (defense-in-depth — dataset is already canonical)
    const collapsed = {};
    for (const [s, v] of Object.entries(combined)) {
      const cs = normSlug(s);
      collapsed[cs] = (collapsed[cs] || 0) + v;
    }
    const ranked = Object.entries(collapsed)
      .sort((a,b)=>b[1]-a[1])
      .map(([slug, score]) => ({
        slug, score,
        confidence: Math.round(score * 100),
        displayTR: (window.BM_ENGINE && window.BM_ENGINE.defs && window.BM_ENGINE.defs[slug])
          ? window.BM_ENGINE.defs[slug].displayTR : slug
      }));

    return {
      top5: ranked.slice(0, 5),
      top3: ranked.slice(0, 3),
      top1: ranked[0] || null,
      _meta: { k, wKNN, wRF, wRule, knn_contrib:Object.keys(kS).length, rf_contrib:Object.keys(fS).length, rule_contrib:Object.keys(rS).length },
    };
  }

  window.BM_ENGINE_V5 = {
    classifyMulti,
    extractFeatures,
    toVec, knnScores, rfScores, ruleScores,
    RECS_COUNT: RECS.length,
    FEATURE_COUNT: FKEYS.length,
    FOREST_TREES: __FOREST.length,
  };
  console.log('[BM_ENGINE_V5] yuklendi:', RECS.length, 'KNN örneği,', __FOREST.length, 'RF ağacı,', FKEYS.length, 'feature');
})();
</script>`;

fs.writeFileSync(__dirname + '/_inline_v6_2_snippet.html', inlineBlock);
console.log('→ _inline_v6_2_snippet.html yazildi ('+(inlineBlock.length/1024).toFixed(1)+' KB)');
