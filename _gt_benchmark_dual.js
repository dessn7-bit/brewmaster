// Dual benchmark: hem _ground_truth_v1.json hem _ground_truth_v2.json üzerinde
// L2 + L3 top-1 + L3 top-3 karsilastir.
const fs = require('fs');
const { classifyHierarchical, HIER } = require('./style_engine_v2.js');
const { findBestMatches } = require('./style_engine.js');

function runOn(setName, records) {
  let cnt = { l1:0, l2:0, l3_top1:0, l3_top3:0, flat_top1:0, flat_top3:0 };
  const T = records.length;
  for (const rec of records) {
    const r = rec.recipe;
    const exp = HIER.styles[rec.expected_slug] || { ferm_type:'?', family:'?' };
    const hR  = classifyHierarchical(r, { topN: 5 });
    const flat = findBestMatches(r, 5);
    if (hR.ferm_type === exp.ferm_type) cnt.l1++;
    if (hR.family === exp.family) cnt.l2++;
    if (hR.top3[0]?.slug === rec.expected_slug) cnt.l3_top1++;
    if (hR.top3.slice(0,3).some(x=>x.slug===rec.expected_slug)) cnt.l3_top3++;
    if (flat[0]?.slug === rec.expected_slug) cnt.flat_top1++;
    if (flat.slice(0,3).some(x=>x.slug===rec.expected_slug)) cnt.flat_top3++;
  }
  const pct = n => (n/T*100).toFixed(1);
  console.log('\n── ' + setName + ' (' + T + ') ──');
  console.log('  L1 (ferm):  ' + cnt.l1      + '/' + T + ' (%' + pct(cnt.l1) + ')');
  console.log('  L2 (fam):   ' + cnt.l2      + '/' + T + ' (%' + pct(cnt.l2) + ')');
  console.log('  L3 top-1:   ' + cnt.l3_top1 + '/' + T + ' (%' + pct(cnt.l3_top1) + ')');
  console.log('  L3 top-3:   ' + cnt.l3_top3 + '/' + T + ' (%' + pct(cnt.l3_top3) + ')');
  console.log('  Flat top-1: ' + cnt.flat_top1 + '/' + T + ' (%' + pct(cnt.flat_top1) + ')');
  console.log('  Flat top-3: ' + cnt.flat_top3 + '/' + T + ' (%' + pct(cnt.flat_top3) + ')');
  return cnt;
}

console.log('═══════════════════════════════════════════════════════════');
console.log('DUAL BENCHMARK — v1 (frozen) vs v2 (v3 converter cikti)');
console.log('═══════════════════════════════════════════════════════════');

const v1 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v1.json', 'utf8'));
const cv1 = runOn('v1 (frozen)', v1.records);

let cv2 = null;
if (fs.existsSync(__dirname + '/_ground_truth_v2.json')) {
  const v2 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2.json', 'utf8'));
  cv2 = runOn('v2 (v3 converter)', v2.records);
}

if (cv2) {
  console.log('\n── DELTA (v2 − v1) ──');
  console.log('  ΔL2:        ' + ((cv2.l2 - cv1.l2) >=0?'+':'') + (cv2.l2 - cv1.l2));
  console.log('  ΔL3 top-1:  ' + ((cv2.l3_top1 - cv1.l3_top1) >=0?'+':'') + (cv2.l3_top1 - cv1.l3_top1));
  console.log('  ΔL3 top-3:  ' + ((cv2.l3_top3 - cv1.l3_top3) >=0?'+':'') + (cv2.l3_top3 - cv1.l3_top3));
  console.log('  ΔFlat top-1:' + ((cv2.flat_top1 - cv1.flat_top1) >=0?'+':'') + (cv2.flat_top1 - cv1.flat_top1));
}
