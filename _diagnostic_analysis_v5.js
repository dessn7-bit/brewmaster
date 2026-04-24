// V5 Motor Diagnostic Analysis — 2026-04-25
// Confusion matrix, feature audit, class distribution, RF importance, specific case analysis

const fs = require('fs');
const vm = require('vm');

console.log('═══ V5 MOTOR DIAGNOSTIC ANALYSIS ═══\n');

// 1. Load inline V5 motor from HTML
const html = fs.readFileSync(__dirname + '/Brewmaster_v2_79_10.html', 'utf8');
const m = html.match(/<script id="bm-engine-v5">([\s\S]*?)<\/script>/);
if (!m) { console.error('V5 inline bulunamadi'); process.exit(1); }
const code = m[1];

const sandbox = { window: {}, console };
sandbox.window.BM_ENGINE_V5 = null;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { timeout: 10000 });
const ENG = sandbox.window.BM_ENGINE_V5;
if (!ENG || typeof ENG.classifyMulti !== 'function') { console.error('V5 export yok'); process.exit(1); }

// 2. Load dataset
const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
console.log(`Dataset: ${records.length} records, ${DS._meta.feature_count} features\n`);

// 3. Feature audit
console.log('═══ FEATURE AUDIT ═══');
const featureKeys = DS._meta.feature_keys;
console.log('Toplam feature:', featureKeys.length);

const yeastFeatures = featureKeys.filter(k => k.startsWith('yeast_'));
const hopFeatures = featureKeys.filter(k => k.startsWith('hop_'));
const maltsFeatures = featureKeys.filter(k => k.startsWith('pct_'));
const katkiFeatures = featureKeys.filter(k => k.startsWith('katki_'));

console.log('Maya tipi features:', yeastFeatures.length, '→', yeastFeatures.join(', '));
console.log('Şerbetçiotu features:', hopFeatures.length, '→', hopFeatures.join(', '));
console.log('Malt % features:', maltsFeatures.length, '→', maltsFeatures.slice(0,10).join(', '), '...');
console.log('Katkı features:', katkiFeatures.length, '→', katkiFeatures.join(', '));

// Check for missing critical features
const criticalMissing = [];
if (!featureKeys.includes('mash_temp_c')) criticalMissing.push('mash_temp_c');
if (!featureKeys.includes('fermentation_temp_c')) criticalMissing.push('fermentation_temp_c');
if (!featureKeys.includes('water_ca_ppm')) criticalMissing.push('water_ca_ppm');
if (!featureKeys.includes('water_so4_ppm')) criticalMissing.push('water_so4_ppm');
if (!featureKeys.includes('yeast_attenuation')) criticalMissing.push('yeast_attenuation');
if (!featureKeys.includes('boil_time_min')) criticalMissing.push('boil_time_min');
if (!featureKeys.includes('dry_hop_days')) criticalMissing.push('dry_hop_days');

if (criticalMissing.length > 0) {
  console.log('EKSIK FEATURES:', criticalMissing.join(', '));
} else {
  console.log('Kritik process features: ✓ mevcut (veya başka isimde)');
}
console.log('');

// 4. Class distribution
console.log('═══ CLASS DISTRIBUTION ═══');
const classCounts = {};
records.forEach(r => {
  const slug = r.label_slug;
  classCounts[slug] = (classCounts[slug] || 0) + 1;
});

const sortedClasses = Object.entries(classCounts).sort((a,b) => b[1] - a[1]);
console.log('En çok temsil edilen 20 stil:');
sortedClasses.slice(0, 20).forEach(([slug, count]) => {
  console.log(`  ${slug}: ${count} reçete`);
});

console.log('\nEn az temsil edilen 20 stil:');
sortedClasses.slice(-20).forEach(([slug, count]) => {
  console.log(`  ${slug}: ${count} reçete`);
});

const underRepresented = sortedClasses.filter(([slug, count]) => count < 5);
console.log(`\n5'ten az reçeteli stiller: ${underRepresented.length} / ${sortedClasses.length}`);
underRepresented.forEach(([slug, count]) => {
  console.log(`  ${slug}: ${count} reçete`);
});

// Specific style analysis
const dubbel = classCounts['belgian_dubbel'] || 0;
const witbier = classCounts['witbier'] || 0;
const biereDeGarde = classCounts['biere_de_garde'] || 0;
const viennaLager = classCounts['vienna_lager'] || 0;
console.log(`\nSpesifik stiller - belgian_dubbel: ${dubbel}, witbier: ${witbier}, biere_de_garde: ${biereDeGarde}, vienna_lager: ${viennaLager}\n`);

// 5. featuresToRecipe helper (from browser_sim_v5.js)
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

// 6. LOOCV Confusion Matrix (simplified — actual vs predicted top-1)
console.log('═══ CONFUSION MATRIX ANALYSIS (LOOCV simulation) ═══');
console.log('NOT: Bu tam LOOCV degil, inline motor ile self-test. Yaklasik confusion.');

const confusionPairs = {};
const predictions = [];

for (let i = 0; i < records.length; i++) {
  if (i % 200 === 0) console.log(`Progress: ${i}/${records.length}`);

  const testRec = records[i];
  const recipe = featuresToRecipe(testRec);
  const res = ENG.classifyMulti(recipe, { k:5, w_knn:0.4, w_rf:0.6, w_rule:0.0 });
  const predicted = (res.top5 && res.top5.length > 0) ? res.top5[0].slug : 'unknown';
  const actual = testRec.label_slug;

  predictions.push({ actual, predicted, top3: (res.top5 || []).slice(0,3).map(x => x.slug) });

  if (predicted !== actual) {
    const pair = `${actual} → ${predicted}`;
    confusionPairs[pair] = (confusionPairs[pair] || 0) + 1;
  }
}

const sortedConfusion = Object.entries(confusionPairs).sort((a,b) => b[1] - a[1]);
console.log('\nEn çok karışan 20 çift:');
sortedConfusion.slice(0, 20).forEach(([pair, count]) => {
  console.log(`  ${pair}: ${count} kez`);
});

// Style-level performance
const stylePerf = {};
predictions.forEach(p => {
  if (!stylePerf[p.actual]) {
    stylePerf[p.actual] = { tp: 0, total: 0 };
  }
  stylePerf[p.actual].total++;
  if (p.predicted === p.actual) {
    stylePerf[p.actual].tp++;
  }
});

const worstStyles = Object.entries(stylePerf)
  .map(([style, perf]) => ({ style, precision: perf.tp / perf.total, total: perf.total }))
  .filter(x => x.total >= 5) // at least 5 samples
  .sort((a,b) => a.precision - b.precision);

console.log('\nEn kötü performans gösteren 10 stil (>=5 örnek):');
worstStyles.slice(0, 10).forEach(s => {
  console.log(`  ${s.style}: ${(s.precision*100).toFixed(1)}% (${stylePerf[s.style].tp}/${s.total})`);
});

console.log('');

// 7. Specific Dubbel Analysis
console.log('═══ DUBBEL DEEP-DIVE ═══');
const dubbelRecipe = {
  _og: 1.062, _fg: 1.012, _abv: 6.62, _ibu: 16, _srm: 38,
  _mayaTip: 'belcika', mayaId: 'bb_abbaye', maya2Id: '', _yeast_raw: 'BB Abbaye Manastır belcika',
  hopIds: [], maltIds: [], katkiIds: [],
  percents: {
    pilsnerPct: 70, baseMaltPct: 0, munichPct: 15, viennaPct: 0, wheatPct: 0, oatsPct: 0,
    crystalPct: 10, chocPct: 5, roastPct: 0, cornPct: 0, ricePct: 0, sugarPct: 0,
    aromaticAbbeyMunichPct: 0, smokedPct: 0, ryePct: 0
  },
  lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false
};

console.log('Test reçete (Dark Belgian Dubbel):');
console.log(`  OG: ${dubbelRecipe._og}, FG: ${dubbelRecipe._fg}, ABV: ${dubbelRecipe._abv}%`);
console.log(`  IBU: ${dubbelRecipe._ibu}, SRM: ${dubbelRecipe._srm}, Maya: ${dubbelRecipe._mayaTip}`);

const dubbelRes = ENG.classifyMulti(dubbelRecipe, { k:5, w_knn:0.4, w_rf:0.6, w_rule:0.0 });
console.log('V5 Prediction:');
if (dubbelRes.top5) {
  dubbelRes.top5.forEach((item, idx) => {
    console.log(`  ${idx+1}. ${item.slug} (${item.score.toFixed(3)})`);
  });
} else {
  console.log('  Prediction failed');
}

console.log('\nAnaliz tamamlandı. Sonuçlar raporda derlenecek.');

// Export results for report
const results = {
  timestamp: new Date().toISOString(),
  dataset: { count: records.length, features: featureKeys.length },
  features: {
    yeast: yeastFeatures,
    hops: hopFeatures,
    malts: maltsFeatures.slice(0, 10), // truncate for readability
    additives: katkiFeatures,
    missing: criticalMissing
  },
  classDistribution: {
    top20: sortedClasses.slice(0, 20),
    bottom20: sortedClasses.slice(-20),
    underRepresented: underRepresented.length,
    specific: { dubbel, witbier, biereDeGarde, viennaLager }
  },
  confusionMatrix: {
    top20Pairs: sortedConfusion.slice(0, 20),
    worstStyles: worstStyles.slice(0, 10)
  },
  dubbelCase: {
    recipe: dubbelRecipe,
    prediction: dubbelRes.top5 || []
  }
};

fs.writeFileSync(__dirname + '/_diagnostic_results.json', JSON.stringify(results, null, 2));
console.log('\nSonuçlar _diagnostic_results.json dosyasına kaydedildi.');