// V5 motor browser sim — extracts inline V5 from HTML, tests on full normalized dataset
// NOT: test-on-train (leakage) — amac inline motorun dataset'le tutarli olup olmadigi.
// Honest LOOCV icin _cv_alias_compare.js kullan.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/Brewmaster_v2_79_10.html', 'utf8');
const m = html.match(/<script id="bm-engine-v5">([\s\S]*?)<\/script>/);
if (!m) { console.error('V5 inline bulunamadi'); process.exit(1); }
const code = m[1];

// Sandbox window (with minimal BM_ENGINE shim so rule path is a no-op)
const sandbox = { window: {}, console };
sandbox.window.BM_ENGINE_V5 = null;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { timeout: 5000 });
const ENG = sandbox.window.BM_ENGINE_V5;
if (!ENG || typeof ENG.classifyMulti !== 'function') { console.error('V5 export yok'); process.exit(1); }

// Load normalized dataset — same source as inline
const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset_normalized.json', 'utf8'));
const records = DS.records;

// Feature → recipe shape (mirror _ml_multi_ensemble.js featuresToRecipe)
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

console.log('═══ V5 Inline Motor — 1016 record self-test (with slug aliases) ═══\n');
let t1=0, t3=0, t5=0;
const miss = [];
const start = Date.now();
for (const rec of records) {
  const recipe = featuresToRecipe(rec);
  const res = ENG.classifyMulti(recipe, { k:5, w_knn:0.4, w_rf:0.6, w_rule:0.0 });
  const top = (res.top5 || []).map(x => x.slug);
  const exp = rec.label_slug;
  if (top[0]===exp) t1++;
  if (top.slice(0,3).includes(exp)) t3++;
  if (top.slice(0,5).includes(exp)) t5++;
  if (top[0] !== exp) miss.push({ id: rec.id, exp, got: top[0], top3: top.slice(0,3) });
}
const dur = ((Date.now()-start)/1000).toFixed(1);
const N = records.length;
const p = x=>(x*100).toFixed(1)+'%';
console.log(`Sonuc: top-1 ${t1}/${N} (${p(t1/N)}), top-3 ${t3}/${N} (${p(t3/N)}), top-5 ${t5}/${N} (${p(t5/N)}) — ${dur}s`);
console.log('\nNOT: bu leakage-li self-test. Gercek LOOCV icin _cv_alias_compare.js');
console.log('Ilk 10 yanlis top-1:');
miss.slice(0,10).forEach(m => console.log(`  ${m.id}: exp=${m.exp}  got=${m.got}  top3=${m.top3.join(',')}`));
