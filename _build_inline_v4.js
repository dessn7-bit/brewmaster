// V4 Ensemble motor inline snippet üret — HTML'e enjekte edilecek
// Content: dataset + KNN + ensemble logic
const fs = require('fs');

const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));

// Compact form: records = [id, slug, family, ferm, featureVec]
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

const compactRecords = DS.records.map(r => {
  const fv = featureKeys.map(k => r.features[k]);
  return [r.id, r.label_slug, r.label_family, r.label_ferm, fv];
});

const datasetCompact = {
  fkeys: featureKeys,
  stats: stats,
  records: compactRecords,
};
const datasetStr = JSON.stringify(datasetCompact);

// Feature extraction kodu + YEAST_SIG/HOP_SIG/KATKI_SIG regex'ları
const featureCodeRaw = fs.readFileSync(__dirname + '/_ml_features.js', 'utf8');
// YEAST_SIG, HOP_SIG, KATKI_SIG, extractFeatures ve signatureFlag fonksiyonlarını çıkar
const FEATURE_CODE = featureCodeRaw
  .match(/\/\/ ═+ YEAST SIGNATURE[\s\S]+?\nfunction extractFeatures\(recipe\) \{[\s\S]+?\n  return f;\n\}/)[0];

const escape = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const inlineBlock = `<script id="bm-engine-v4">
// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER V4 — Ensemble motor (KNN + rule) inline
// Üretim: node _build_inline_v4.js
// Kullanim: window.BM_ENGINE_V4.classifyEnsemble(recipe, opts)
// ═══════════════════════════════════════════════════════════════════════════
(function(){
  const __BM_ML = JSON.parse(\`${escape(datasetStr)}\`);
  const FKEYS = __BM_ML.fkeys;
  const STATS = __BM_ML.stats;
  const RECS  = __BM_ML.records;

${FEATURE_CODE}

  // ═══ Feature vector from recipe → normalized array ═══
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

  // ═══ katki-heavy weights (production optimal) ═══
  const WEIGHTS = FKEYS.map(k => {
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

  // ═══ KNN scores (0-1 normalized, slug başı ağırlık) ═══
  function knnScores(queryVec, k) {
    const dists = [];
    for (let i=0; i<RECS.length; i++) {
      dists.push({ i, d: distance(queryVec, RECS[i][4]) });
    }
    dists.sort((a,b) => a.d - b.d);
    const top = dists.slice(0, k);
    const scores = {};
    let totalW = 0;
    for (const {i,d} of top) {
      const slug = RECS[i][1];
      const w = 1 / (d + 0.1);
      scores[slug] = (scores[slug] || 0) + w;
      totalW += w;
    }
    for (const s in scores) scores[s] /= totalW;
    return scores;
  }

  // ═══ Rule scores (window.BM_ENGINE'den) ═══
  function ruleScores(recipe) {
    if (!window.BM_ENGINE || !window.BM_ENGINE.findBestMatches) return {};
    const matches = window.BM_ENGINE.findBestMatches(recipe, 50);
    const scores = {};
    for (const m of matches) {
      if (m.normalized > 0) scores[m.slug] = m.normalized / 100;
    }
    return scores;
  }

  // ═══ Ensemble: alpha × rule + (1-alpha) × KNN ═══
  function classifyEnsemble(recipe, opts) {
    opts = opts || {};
    const alpha = opts.alpha != null ? opts.alpha : 0.2;  // production optimal on 216 merged
    const k = opts.k != null ? opts.k : 5;

    const v = toVec(recipe);
    const rScores = ruleScores(recipe);
    const kScores = knnScores(v, k);

    const allSlugs = new Set([...Object.keys(rScores), ...Object.keys(kScores)]);
    const combined = {};
    for (const s of allSlugs) {
      combined[s] = alpha * (rScores[s]||0) + (1-alpha) * (kScores[s]||0);
    }
    const ranked = Object.entries(combined)
      .sort((a,b)=>b[1]-a[1])
      .map(([slug, score]) => ({ slug, score, confidence: Math.round(score * 100) }));

    return {
      top5: ranked.slice(0, 5),
      top3: ranked.slice(0, 3),
      top1: ranked[0] || null,
      _meta: { alpha, k, rule_contrib_size: Object.keys(rScores).length, knn_contrib_size: Object.keys(kScores).length },
    };
  }

  window.BM_ENGINE_V4 = {
    classifyEnsemble,
    extractFeatures,
    toVec,
    knnScores,
    ruleScores,
    RECS_COUNT: RECS.length,
    FEATURE_COUNT: FKEYS.length,
  };
  console.log('[BM_ENGINE_V4] yuklendi:', RECS.length, 'training örneği,', FKEYS.length, 'feature');
})();
</script>`;

fs.writeFileSync(__dirname + '/_inline_v4_snippet.html', inlineBlock);
console.log('→ _inline_v4_snippet.html yazildi ('+(inlineBlock.length/1024).toFixed(1)+' KB)');
