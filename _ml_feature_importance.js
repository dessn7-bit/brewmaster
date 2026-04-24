// Feature importance — tek feature ile KNN baseline, hangi feature en ayırt edici
// Bu bilgi Batch 3 veri toplama kararlarına yön verir
const fs = require('fs');
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
const allVecs = records.map(r => normalize(r.features));

// Single-feature KNN
function evalSingleFeature(featIdx, k) {
  let t1=0, t3=0;
  for (let i=0; i<records.length; i++) {
    const dists = [];
    for (let j=0; j<records.length; j++) {
      if (j === i) continue;
      const d = Math.abs(allVecs[i][featIdx] - allVecs[j][featIdx]);
      dists.push({ j, d });
    }
    dists.sort((a,b)=>a.d-b.d);
    const top = dists.slice(0, k);
    const scores = {};
    for (const {j,d} of top) {
      const w = 1/(d+0.1);
      scores[records[j].label_slug] = (scores[records[j].label_slug]||0)+w;
    }
    const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    if (ranked[0]?.[0] === records[i].label_slug) t1++;
    if (ranked.slice(0,3).some(x=>x[0]===records[i].label_slug)) t3++;
  }
  return { t1:t1/records.length, t3:t3/records.length };
}

console.log('═══ FEATURE IMPORTANCE (single-feature KNN, k=5) ═══');
console.log('Random baseline: t1 ≈ 0.5%, t3 ≈ 1.5%');
console.log('');
const results = [];
for (let i=0; i<featureKeys.length; i++) {
  const r = evalSingleFeature(i, 5);
  results.push({ feat: featureKeys[i], t1: r.t1, t3: r.t3 });
}
results.sort((a,b)=>b.t1-a.t1);
console.log('Top 20 most informative features:');
results.slice(0, 20).forEach(r => console.log(`  ${r.feat.padEnd(24)} t1=${(r.t1*100).toFixed(1).padStart(5)}%  t3=${(r.t3*100).toFixed(1).padStart(5)}%`));
console.log('');
console.log('Bottom 10 least informative:');
results.slice(-10).forEach(r => console.log(`  ${r.feat.padEnd(24)} t1=${(r.t1*100).toFixed(1).padStart(5)}%  t3=${(r.t3*100).toFixed(1).padStart(5)}%`));
