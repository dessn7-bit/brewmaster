// 199 GT reçete hiyerarşik motor benchmark
// Seviye 1 (ferm_type) / Seviye 2 (family) / Seviye 3 (top-1/top-3) doğruluk
// V2c flat motor ile karşılaştırma.
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');
const { classifyHierarchical, HIER } = require('./style_engine_v2.js');
const { findBestMatches } = require('./style_engine.js');

function getExpectedHierarchy(slug) {
  const h = HIER.styles[slug];
  if (!h) return { ferm_type: '?', family: '?' };
  return { ferm_type: h.ferm_type, family: h.family };
}

const results = [];
let cnt = { l1:0, l2:0, l3_top1:0, l3_top3:0, flat_top1:0, flat_top3:0 };
const confFerm = {};   // ferm_type confusion
const confFam  = {};   // family confusion
const confL3   = {};   // style-level (sadece L1+L2 dogru iken)

for (const raw of RAW_RECIPES) {
  const recipe   = convertRawToEngineRecipe(raw);
  const expected = getExpectedHierarchy(raw.expected_slug);
  const hR = classifyHierarchical(recipe, { topN: 5 });
  const flat = findBestMatches(recipe, 5);

  const l1ok = hR.ferm_type === expected.ferm_type;
  const l2ok = hR.family === expected.family;
  const top1 = hR.top3[0]?.slug === raw.expected_slug;
  const top3 = hR.top3.slice(0,3).some(x => x.slug === raw.expected_slug);
  const flat1 = flat[0]?.slug === raw.expected_slug;
  const flat3 = flat.slice(0,3).some(x => x.slug === raw.expected_slug);

  if (l1ok)  cnt.l1++;
  if (l2ok)  cnt.l2++;
  if (top1)  cnt.l3_top1++;
  if (top3)  cnt.l3_top3++;
  if (flat1) cnt.flat_top1++;
  if (flat3) cnt.flat_top3++;

  if (!l1ok) {
    const k = expected.ferm_type + ' → ' + hR.ferm_type;
    confFerm[k] = (confFerm[k]||0) + 1;
  }
  if (l1ok && !l2ok) {
    const k = expected.family + ' → ' + hR.family;
    confFam[k] = (confFam[k]||0) + 1;
  }
  if (l1ok && l2ok && !top1) {
    const k = raw.expected_slug + ' → ' + (hR.top3[0]?.slug || '(yok)');
    confL3[k] = (confL3[k]||0) + 1;
  }

  results.push({
    name: raw.data.name, src: raw.source, tier: raw.tier,
    expected_slug: raw.expected_slug, exp_ferm: expected.ferm_type, exp_fam: expected.family,
    got_ferm: hR.ferm_type, got_fam: hR.family, got_top1: hR.top3[0]?.slug || '-',
    got_top1_norm: hR.top3[0]?.normalized || 0,
    flat_top1: flat[0]?.slug || '-',
    l1ok, l2ok, top1, top3, flat1, flat3,
    l2score: hR.levels?.['2']?.chosen_score,
  });
}

// ═══ RAPOR ═══
const T = RAW_RECIPES.length;
const pct = (n) => (n/T*100).toFixed(1) + '%';

console.log('\n' + '═'.repeat(90));
console.log('HIYERARSIK MOTOR BENCHMARK — ' + T + ' GT recete');
console.log('═'.repeat(90));
console.log('Seviye 1 (ferm_type):    ' + cnt.l1 + '/' + T + ' (' + pct(cnt.l1) + ')');
console.log('Seviye 2 (family):       ' + cnt.l2 + '/' + T + ' (' + pct(cnt.l2) + ')');
console.log('Seviye 3 top-1 (hier):   ' + cnt.l3_top1 + '/' + T + ' (' + pct(cnt.l3_top1) + ')');
console.log('Seviye 3 top-3 (hier):   ' + cnt.l3_top3 + '/' + T + ' (' + pct(cnt.l3_top3) + ')');
console.log('─'.repeat(90));
console.log('FLAT motor top-1:        ' + cnt.flat_top1 + '/' + T + ' (' + pct(cnt.flat_top1) + ')');
console.log('FLAT motor top-3:        ' + cnt.flat_top3 + '/' + T + ' (' + pct(cnt.flat_top3) + ')');
console.log('');
console.log('Fark hier vs flat (top-1): ' + (cnt.l3_top1 - cnt.flat_top1) + ' (hier ' + (cnt.l3_top1>cnt.flat_top1?'iyi':(cnt.l3_top1<cnt.flat_top1?'kotu':'esit')) + ')');
console.log('Fark hier vs flat (top-3): ' + (cnt.l3_top3 - cnt.flat_top3));

// Seviye 1 confusion
console.log('\n── Seviye 1 (ferm_type) confusion ─────────');
const sF1 = Object.entries(confFerm).sort((a,b)=>b[1]-a[1]);
if (sF1.length === 0) console.log('  (yok — %100 dogru)');
else sF1.forEach(([k,n])=>console.log('  '+n+'× '+k));

// Seviye 2 confusion (L1 dogru, L2 yanlis)
console.log('\n── Seviye 2 (family) confusion [L1 dogru iken] ─────────');
const sF2 = Object.entries(confFam).sort((a,b)=>b[1]-a[1]);
if (sF2.length === 0) console.log('  (yok)');
else sF2.slice(0,20).forEach(([k,n])=>console.log('  '+n+'× '+k));

// Seviye 3 confusion (L1+L2 dogru, stil yanlis)
console.log('\n── Seviye 3 (style) confusion [L1+L2 dogru iken, top-1 yanlis] ─────────');
const sF3 = Object.entries(confL3).sort((a,b)=>b[1]-a[1]);
if (sF3.length === 0) console.log('  (yok)');
else sF3.slice(0,20).forEach(([k,n])=>console.log('  '+n+'× '+k));

// Her ferm_type dagilimi
console.log('\n── Ferm_type dagilim ─────────');
const typeCnt = {};
results.forEach(r => { typeCnt[r.got_ferm] = (typeCnt[r.got_ferm]||0) + 1; });
Object.entries(typeCnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k+': '+v));

console.log('\n── Expected ferm_type dagilim ─────────');
const expCnt = {};
results.forEach(r => { expCnt[r.exp_ferm] = (expCnt[r.exp_ferm]||0) + 1; });
Object.entries(expCnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k+': '+v));

// Detay — hem L1 hem L2 yanlislar listesi
const l1l2miss = results.filter(r => !r.l1ok || !r.l2ok);
if (l1l2miss.length > 0) {
  console.log('\n── L1/L2 miss detay (ilk 25) ─────────');
  l1l2miss.slice(0,25).forEach(r=>{
    console.log('  · '+r.name.slice(0,40).padEnd(40) + ' EXP: '+r.exp_ferm+'/'+r.exp_fam+' GOT: '+r.got_ferm+'/'+r.got_fam);
  });
}

// Export results
if (process.argv.includes('--json')) {
  require('fs').writeFileSync(__dirname + '/_gt_benchmark_v2.json', JSON.stringify({ cnt, results, confFerm, confFam, confL3 }, null, 2));
  console.log('\n_gt_benchmark_v2.json yazildi');
}
