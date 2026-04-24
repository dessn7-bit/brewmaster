// Merged benchmark: v1 (frozen 199) + v2 batch1 (BJCP 50) = 249 recete
// V2 batch1 Kaan spec formatinda; engine recipe'ye convert etmek icin basit bir converter kullaniyoruz.
const fs = require('fs');
const { findBestMatches } = require('./style_engine.js');
const { classifyHierarchical, HIER } = require('./style_engine_v2.js');

// Kaan spec → engine recipe (basit converter v2 batch icin)
// NOT: malt/hop/yeast null iken sadece OG/FG/IBU/SRM/ABV temelli skor. Motor yeast exclusion koymadiysa skor verir.
function specToEngineRecipe(r) {
  // Yeast tip tahmini
  let _mayaTip = 'ale';
  let mayaId = 'us05';
  let _yeast_raw = r.yeast || '';
  const y = (r.yeast || '').toLowerCase();
  if (/spontaneous|brett|lacto|pedio|mixed|roeselare|wild|cantillon|boon|lambic/.test(y)) { _mayaTip='sour'; mayaId='lacto_plantarum'; }
  else if (/lager|pilsner\s*urquell|h-strain|urquell|bohem|budvar|bavarian|harvest|l17|l13|34[\/\-]?70|w[\-]?34|wlp8\d\d|wlp9\d\d|wy2\d{3}/.test(y)) { _mayaTip='lager'; mayaId='wy2124'; }
  else if (/weizen|weiss|hefe|weihenstephan|wy3068|wb[\-]?06|wlp300|wlp320|wlp351/.test(y)) { _mayaTip='wheat'; mayaId='wb06'; }
  else if (/saison|dupont|wy3724|farmhouse/.test(y)) { _mayaTip='saison'; mayaId='wy3724'; }
  else if (/wit|blanche|wy3944|wlp400/.test(y)) { _mayaTip='wit'; mayaId='wy3944'; }
  else if (/trappist|abbey|chimay|westmalle|rochefort|duvel|orval|3787|3522|1762|1214|1388|wlp5\d\d|belgian/.test(y)) { _mayaTip='belcika'; mayaId='wy3787'; }
  else if (/kolsch|kölsch|altbier|wlp029|wy2565|wlp036|wy1007/.test(y)) { _mayaTip='ale'; mayaId='wlp029'; }

  const maltIds = Array.isArray(r.malt_profile) ? r.malt_profile.map(m=>m.name).filter(Boolean) : [];
  const hopIds  = Array.isArray(r.hop_profile) ? r.hop_profile.map(h=>(h.name||'').toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/^_+|_+$/g,'')).filter(Boolean) : [];

  return {
    _og: r.og, _fg: r.fg, _ibu: r.ibu, _srm: r.srm, _abv: r.abv,
    _mayaTip, mayaId, maya2Id:'', _yeast_raw, _recipeName: r.beer_name,
    hopIds, maltIds, katkiIds:[],
    percents: {}, // batch1 malt_profile genelde null → percents bos
    lactose:false, filtered:false, aged:false, dhPer10L:0, blended:false,
  };
}

// v1: engine recipe = convertRawToEngineRecipe(_gt_recipes_raw.js) (malt percents tam)
// v2: spec-only → basit converter (malt percents yok)
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');
const v2 = JSON.parse(fs.readFileSync('_ground_truth_v2_batch1.json','utf8'));

const v1records = RAW_RECIPES.map(raw => ({
  expected_slug: raw.expected_slug, name: raw.data.name,
  recipe: convertRawToEngineRecipe(raw), source: raw.source,
}));
const v2records = v2.recipes.map(r => ({
  expected_slug: r.correct_style_slug, name: r.beer_name,
  recipe: specToEngineRecipe(r), source: 'bjcp_v2',
}));
const merged = [...v1records, ...v2records];

function run(label, records) {
  let cnt = { l1:0, l2:0, l3_top1:0, l3_top3:0, flat_top1:0, flat_top3:0 };
  const missed = [];
  for (const rec of records) {
    const r = rec.recipe;
    const exp = HIER.styles[rec.expected_slug] || { ferm_type:'?', family:'?' };
    const hR = classifyHierarchical(r, { topN:5 });
    const flat = findBestMatches(r, 5);
    if (hR.ferm_type === exp.ferm_type) cnt.l1++;
    if (hR.family === exp.family) cnt.l2++;
    if (hR.top3[0]?.slug === rec.expected_slug) cnt.l3_top1++; else missed.push({exp:rec.expected_slug, got:hR.top3[0]?.slug||'-', name:rec.name});
    if (hR.top3.slice(0,3).some(x=>x.slug===rec.expected_slug)) cnt.l3_top3++;
    if (flat[0]?.slug === rec.expected_slug) cnt.flat_top1++;
    if (flat.slice(0,3).some(x=>x.slug===rec.expected_slug)) cnt.flat_top3++;
  }
  const T = records.length;
  const pct = n => (n/T*100).toFixed(1);
  console.log('\n── ' + label + ' (' + T + ') ──');
  console.log('  L1:          ' + cnt.l1 + '/' + T + ' (%' + pct(cnt.l1) + ')');
  console.log('  L2:          ' + cnt.l2 + '/' + T + ' (%' + pct(cnt.l2) + ')');
  console.log('  L3 top-1:    ' + cnt.l3_top1 + '/' + T + ' (%' + pct(cnt.l3_top1) + ')');
  console.log('  L3 top-3:    ' + cnt.l3_top3 + '/' + T + ' (%' + pct(cnt.l3_top3) + ')');
  console.log('  Flat top-1:  ' + cnt.flat_top1 + '/' + T + ' (%' + pct(cnt.flat_top1) + ')');
  console.log('  Flat top-3:  ' + cnt.flat_top3 + '/' + T + ' (%' + pct(cnt.flat_top3) + ')');
  return { cnt, T, missed };
}

console.log('═══ MERGED BENCHMARK — v1 + v2_batch1 ═══');
const resV1  = run('v1 frozen', v1records);
const resV2  = run('v2 batch1', v2records);
const resAll = run('birleşik',  merged);

// v2 batch1 fail detay
console.log('\n── v2 batch1 top-1 miss detay ──');
resV2.missed.forEach(m => console.log('  · '+m.name.padEnd(40)+' exp='+m.exp+' got='+m.got));
