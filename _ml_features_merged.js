// v1 (199) + v2 Batch 2 (60) merged ML dataset
// Batch 2 Kaan spec formatinda → engine recipe converter ile engine-input'a
const fs = require('fs');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');
const HIER = JSON.parse(fs.readFileSync(__dirname + '/hierarchy_map.json', 'utf8'));

// _ml_features.js'i require etmiyoruz (top-level side effect'lerinden kaçınmak için)
// Gerekli YEAST_SIG/HOP_SIG/KATKI_SIG/extractFeatures bu dosyada duplicate (kontrollü)

// ═══ YEAST SIG ═══
const YEAST_SIG = {
  english:        /(wy1028|wy1098|wy1099|wy1187|wy1275|wy1318|wy1335|wy1469|wy1728|wy1768|wy1968|wlp002|wlp004|wlp005|wlp007|wlp013|wlp017|wlp022|wlp023|wlp025|wlp028|nottingham|windsor|whitbread|london\s*ale|british\s*ale|english\s*ale|edinburgh|scottish|irish\s*ale|tartan|s[\-]?04\b|m44\b|fuller|thornbridge|ringwood|pub|darkness|goldings|yorkshire|burton)/i,
  american:       /(us[\-]?05|wlp001|wlp008|wlp041|wlp051|wlp060|wlp090|wy1056|wy1272|wy1450|bry[\-]?97|chico|california\s*ale|west\s*coast\s*ale|american\s*ale|flagship|independence|capri|vermont\s*ale|juice|barbarian|conan|house\b.*?a01|oyl)/i,
  belgian:        /(wy1214|wy1388|wy1762|wy3522|wy3787|wy3944|wlp400|wlp500|wlp510|wlp515|wlp530|wlp540|wlp545|wlp550|wlp570|wlp585|trappist|abbey|chimay|westmalle|rochefort|duvel|orval|witbier|celis|b45\b|b48\b|b63\b|b90\b|t[\-]?58|m31\b|napoleon|triple\s*double|westvleteren|bernardus|achouffe|bockor|scourmont)/i,
  saison:         /(wy3724|saison|dupont|farmhouse|rustic|belle\s*saison|b47\b|b64\b|wlp565|wlp566|wlp568|wlp590|m29\b|m41\b)/i,
  wheat_german:   /(wy3056|wy3068|wy3638|wy3333|wlp300|wlp320|wlp351|wlp380|wb[\-]?06|weihenstephan|hefeweizen|bavarian\s*(wheat|hefe|weiss)|weiss\w*|hefe\w*|m20\b|m08\b|m15\b|\b3068\b|\b3638\b|\b3056\b|paulaner|schneider)/i,
  german_lager:   /(wlp830|wlp833|wlp838|wlp840|wlp920|wlp925|wy2000|wy2001|wy2007|wy2042|wy2124|wy2206|wy2247|wy2308|wy2352|34[\/\-]?70|w[\-]?34|saflager|munich\s*lager|bavarian\s*lager|augustiner|harvest\s*lager|\bl09\b|\bl10\b|\bl11\b|\bl13\b|\bl17\b|\bl30\b|\bl32\b|\bl40\b|triumvirate|kellermeister)/i,
  czech_lager:    /(wy2278|wlp800|wlp802|urkel|urquell|pilsner\s*urquell|czech\s*(lager|pilsen|pilsner)|bohemian\s*lager|budvar|cesky|lookr|\bl28\b|\bl29\b|h-strain)/i,
  american_lager: /(wlp840|wlp810|wy2007|wy2035|wy2112|saflager.*us|american\s*lager|mexican\s*lager|cervezeria|\bl01\b|\bl02\b)/i,
  kolsch:         /(wlp029|wy2565|k[oö]lsch|kolsch|koelsch|stefon|\bg01\b|\bg04\b)/i,
  altbier:        /(wlp036|wlp011|wy1007|wy1010|alt\s*ale|dusseldorf|alt.?bier|kaiser|dieter|\bg02\b|\bg03\b)/i,
  california_common: /(wlp810|wy2112|california\s*(lager|common|steam)|cal\s*common|steam\s*beer|anchor|cablecar|cable\s*car|\bl05\b)/i,
  brett:          /(brett|brettanomyces|wlp648|wlp650|wlp653|wy5112|wy5526)/i,
  lacto:          /(lacto|lactobacillus|plantarum|brevis|pediococcus|wy4335|wy4733)/i,
  sour_blend:     /(roeselare|melange|rodenbach|lambic|spontaneous|wild\s*capture|ecy02|ecy04|wlp655|wlp665|wlp670|wy3763|wy3278|sour\s*blend|mixed\s*culture|liefmans|petrus|cantillon|boon|3\s*fonteinen)/i,
  kveik:          /(kveik|voss|hornindal|hothead|omega\s*kveik|lutra)/i,
  wit:            /(wy3944|wlp400|wit\s*(ale|beer|yeast)|witbier|celis|forbidden\s*fruit|k.?97)/i,
};
const HOP_SIG = {
  american_c_hops: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el\s*dorado|summit|equinox|ekuanot|azacca|vic\s*secret|calypso|loral|strata|talus|cashmere|nugget)/i,
  english_hops:    /(ekg|east\s*kent|fuggles?|challenger|goldings|admiral|bramling|first\s*gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british\s*hop|willamette)/i,
  german_noble:    /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|mittelfr)/i,
  czech_saaz:      /(saaz|premiant|sladek|kazbek|zatec)/i,
  nz_hops:         /(nelson|motueka|riwaka|waimea|wakatu|pacific\s*(gem|jade)|rakau|sauvin)/i,
  australian_hops: /(galaxy|vic\s*secret|ella|enigma|topaz)/i,
  aged_hops:       /(aged\s*hop)/i,
  northern_brewer: /(northern\s*brewer|cluster|mount\s*hood)/i,
};
const KATKI_SIG = {
  lactose:     /laktoz|lactose|milk/i,
  fruit:       /meyve|fruit|mango|passion|seftali|peach|strawberry|cilek|raspberry|cherry|kiraz|apple|elma|pear|armut|uzum|grape|must|orange|portakal|lemon|limon|lime/i,
  spice_herb:  /koriander|coriander|ginger|zencefil|cinnamon|tarcin|nutmeg|clove|karanfil|herbs|rosemary|biberiye|mint|nane|lavender|lavanta|hibiscus|elderflower|jasmine|matcha|juniper|ardic/i,
  chocolate:   /chocolate|cacao|kakao|cocoa|cikolata/i,
  coffee:      /coffee|kahve|espresso|mocha/i,
  chile:       /chile|chili|jalape|habane|pepper|biber/i,
  smoke:       /smoke|smoked|rauch|isli/i,
  honey:       /^bal$|honey(?!\s*malt)/i,
  pumpkin:     /pumpkin|balkabak|squash/i,
  salt:        /tuz|kosher|salt/i,
  vanilla:     /vanilla|vanilya/i,
};
function sf(rx, s) { return rx.test(s) ? 1 : 0; }

function extractFeatures(recipe) {
  const yeastStr = [recipe._yeast_raw, recipe.mayaId, recipe.maya2Id].filter(Boolean).join('|');
  const hopStr   = (recipe.hopIds   || []).join('|');
  const maltStr  = (recipe.maltIds  || []).join('|');
  const katkiStr = (recipe.katkiIds || []).join('|');
  const p = recipe.percents || {};
  return {
    og:  recipe._og  || 0, fg:  recipe._fg  || 0, abv: recipe._abv || 0,
    ibu: recipe._ibu || 0, srm: recipe._srm || 0,
    pct_pilsner:p.pilsnerPct||0, pct_base:p.baseMaltPct||0, pct_munich:p.munichPct||0,
    pct_vienna:p.viennaPct||0, pct_wheat:p.wheatPct||0, pct_oats:p.oatsPct||0,
    pct_crystal:p.crystalPct||0, pct_choc:p.chocPct||0, pct_roast:p.roastPct||0,
    pct_corn:p.cornPct||0, pct_rice:p.ricePct||0, pct_sugar:p.sugarPct||0,
    pct_aromatic_abbey:p.aromaticAbbeyMunichPct||0, pct_smoked:p.smokedPct||0,
    pct_rye:p.ryePct||0, pct_sixrow:p.sixRowPct||0,
    total_dark:(p.chocPct||0)+(p.roastPct||0),
    total_adjunct:(p.cornPct||0)+(p.ricePct||0)+(p.sugarPct||0),
    crystal_ratio:(p.crystalPct||0)/Math.max(1,(p.pilsnerPct||0)+(p.baseMaltPct||0)+(p.wheatPct||0)),
    yeast_english:sf(YEAST_SIG.english,yeastStr), yeast_american:sf(YEAST_SIG.american,yeastStr),
    yeast_belgian:sf(YEAST_SIG.belgian,yeastStr), yeast_saison:sf(YEAST_SIG.saison,yeastStr),
    yeast_wheat_german:sf(YEAST_SIG.wheat_german,yeastStr), yeast_german_lager:sf(YEAST_SIG.german_lager,yeastStr),
    yeast_czech_lager:sf(YEAST_SIG.czech_lager,yeastStr), yeast_american_lager:sf(YEAST_SIG.american_lager,yeastStr),
    yeast_kolsch:sf(YEAST_SIG.kolsch,yeastStr), yeast_altbier:sf(YEAST_SIG.altbier,yeastStr),
    yeast_cal_common:sf(YEAST_SIG.california_common,yeastStr), yeast_brett:sf(YEAST_SIG.brett,yeastStr),
    yeast_lacto:sf(YEAST_SIG.lacto,yeastStr), yeast_sour_blend:sf(YEAST_SIG.sour_blend,yeastStr),
    yeast_kveik:sf(YEAST_SIG.kveik,yeastStr), yeast_wit:sf(YEAST_SIG.wit,yeastStr),
    hop_american_c:sf(HOP_SIG.american_c_hops,hopStr), hop_english:sf(HOP_SIG.english_hops,hopStr),
    hop_german:sf(HOP_SIG.german_noble,hopStr), hop_czech_saaz:sf(HOP_SIG.czech_saaz,hopStr),
    hop_nz:sf(HOP_SIG.nz_hops,hopStr), hop_aged:sf(HOP_SIG.aged_hops,hopStr),
    hop_northern_brewer:sf(HOP_SIG.northern_brewer,hopStr),
    katki_lactose:sf(KATKI_SIG.lactose,katkiStr), katki_fruit:sf(KATKI_SIG.fruit,katkiStr),
    katki_spice_herb:sf(KATKI_SIG.spice_herb,katkiStr), katki_chocolate:sf(KATKI_SIG.chocolate,katkiStr),
    katki_coffee:sf(KATKI_SIG.coffee,katkiStr), katki_chile:sf(KATKI_SIG.chile,katkiStr),
    katki_smoke:sf(KATKI_SIG.smoke,katkiStr), katki_honey:sf(KATKI_SIG.honey,katkiStr),
    katki_pumpkin:sf(KATKI_SIG.pumpkin,katkiStr), katki_salt:sf(KATKI_SIG.salt,katkiStr),
    high_hop:(recipe._ibu||0)>50?1:0, strong_abv:(recipe._abv||0)>8?1:0,
    dark_color:(recipe._srm||0)>20?1:0, pale_color:(recipe._srm||0)<6?1:0,
  };
}

// ═══ Batch 2 spec → engine recipe converter ═══
function batchSpecToEngineRecipe(r) {
  // Yeast tip/mayaId tahmini
  let _mayaTip='ale', mayaId='us05';
  const y = (r.yeast || '').toLowerCase();
  if (/spontaneous|cantillon|boon|lambic|roeselare|melange|rodenbach|blend|sour|wild|brett|lacto|pedio/.test(y)) { _mayaTip='sour'; mayaId='lacto_plantarum'; }
  else if (/lager|pilsner\s*urquell|h-strain|urquell|bohem|budvar|bavarian|harvest|l17|l13|34[\/\-]?70|w[\-]?34|wlp8\d\d|wlp9\d\d|wy2\d{3}|augustiner/.test(y)) { _mayaTip='lager'; mayaId='wy2124'; }
  else if (/weizen|weiss|hefe|weihenstephan|wy3068|wb[\-]?06|wlp300|wlp320|wlp351|paulaner|schneider/.test(y)) { _mayaTip='wheat'; mayaId='wb06'; }
  else if (/saison|dupont|wy3724|farmhouse|napoleon|belle\s*saison/.test(y)) { _mayaTip='saison'; mayaId='wy3724'; }
  else if (/wit|blanche|wy3944|wlp400/.test(y)) { _mayaTip='wit'; mayaId='wy3944'; }
  else if (/trappist|abbey|chimay|westmalle|rochefort|duvel|orval|westvleteren|bernardus|achouffe|scourmont|3787|3522|1762|1214|1388|wlp5\d\d|belgian/.test(y)) { _mayaTip='belcika'; mayaId='wy3787'; }
  else if (/kolsch|kölsch|wlp029|wy2565|stefon/.test(y)) { _mayaTip='ale'; mayaId='wlp029'; }
  else if (/altbier|dusseldorf|wlp036|wy1007|kaiser|dieter/.test(y)) { _mayaTip='ale'; mayaId='wy1007'; }

  // Malt percent
  const percents = {
    pilsnerPct:0, baseMaltPct:0, munichPct:0, viennaPct:0, wheatPct:0, oatsPct:0,
    crystalPct:0, chocPct:0, roastPct:0, cornPct:0, ricePct:0, sugarPct:0,
    aromaticAbbeyMunichPct:0, smokedPct:0, ryePct:0, sixRowPct:0,
  };
  const maltIds = [];
  if (Array.isArray(r.malt_profile)) {
    for (const m of r.malt_profile) {
      maltIds.push(m.name || '');
      const pct = m.pct || 0;
      const nm = (m.name||'').toLowerCase();
      if (/pilsner|pilsen|pils(?!ner)/.test(nm)) percents.pilsnerPct += pct;
      else if (/maris|golden\s*promise|pale\s*ale\s*malt|2[\-\s]?row|british\s*pale|thornbridge/.test(nm)) { percents.baseMaltPct += pct; percents.pilsnerPct += pct*0.8; }
      else if (/raw\s*wheat/.test(nm)) percents.wheatPct += pct;
      else if (/wheat|weizen|buğday|bugday/.test(nm)) percents.wheatPct += pct;
      else if (/oat|yulaf|flaked\s*oats/.test(nm)) percents.oatsPct += pct;
      else if (/munich/.test(nm)) percents.munichPct += pct;
      else if (/vienna/.test(nm)) percents.viennaPct += pct;
      else if (/crystal|caramel|cara\s*\d+/.test(nm)) percents.crystalPct += pct;
      else if (/chocolate|pale\s*choc/.test(nm)) percents.chocPct += pct;
      else if (/black\s*(malt|patent|barley)|roasted\s*barley|roast|brown\s*malt/.test(nm)) percents.roastPct += pct;
      else if (/flaked\s*corn|corn(?!\s*sugar)/.test(nm)) percents.cornPct += pct;
      else if (/rice/.test(nm)) percents.ricePct += pct;
      else if (/sugar|candi|invert|dextrose|molasses|syrup/.test(nm)) percents.sugarPct += pct;
      else if (/special\s*b|aromatic/.test(nm)) percents.aromaticAbbeyMunichPct += pct;
      else if (/smoked|rauch/.test(nm)) percents.smokedPct += pct;
      else if (/rye|çavdar/.test(nm)) percents.ryePct += pct;
      else if (/dextrin|carapils/.test(nm)) percents.baseMaltPct += pct*0.3; // minor
      else { percents.baseMaltPct += pct; percents.pilsnerPct += pct*0.8; } // default
    }
  }

  // Hop Ids
  const hopIds = [];
  if (Array.isArray(r.hop_profile)) {
    for (const h of r.hop_profile) {
      const n = (h.name||'').toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/^_+|_+$/g,'');
      if (n && !hopIds.includes(n)) hopIds.push(n);
    }
  }

  return {
    _og:r.og, _fg:r.fg, _abv:r.abv, _ibu:r.ibu, _srm:r.srm,
    _mayaTip, mayaId, maya2Id:'', _yeast_raw: r.yeast || '', _recipeName: r.beer_name,
    hopIds, maltIds, katkiIds: [],
    percents,
    lactose:false, filtered:false, aged:false, dhPer10L:0, blended:false,
  };
}

// ═══ DATASET BUILD ═══
const records = [];

// v1 frozen
for (const raw of RAW_RECIPES) {
  const recipe = convertRawToEngineRecipe(raw);
  const features = extractFeatures(recipe);
  const hier = HIER.styles[raw.expected_slug] || { ferm_type:'?', family:'?' };
  records.push({
    id: 'v1_' + records.length.toString().padStart(3,'0'),
    source: raw.source,
    name: raw.data.name,
    label_slug: raw.expected_slug, label_family: hier.family, label_ferm: hier.ferm_type,
    features,
  });
}
const v1Count = records.length;

// Batch 2 — SADECE tam reçeteli olanları al
const b2 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch2.json', 'utf8'));
const fullRecipeB2 = b2.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
// Batch 3 — hepsi tam reçete (quality_rule gereği)
const b3 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch3.json', 'utf8'));
const fullRecipeB3 = b3.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
// Batch 4 — hepsi tam reçete
const b4 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch4.json', 'utf8'));
const fullRecipeB4 = b4.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
// Batch 5
const b5 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch5.json', 'utf8'));
const fullRecipeB5 = b5.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
// Batch 6
const b6 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch6.json', 'utf8'));
const fullRecipeB6 = b6.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
// Batch 7
const b7 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch7.json', 'utf8'));
const fullRecipeB7 = b7.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
// Batch 8
const b8 = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch8.json', 'utf8'));
const fullRecipeB8 = b8.recipes.filter(r => Array.isArray(r.malt_profile) && r.malt_profile.length > 0);
console.log('B2 tam:', fullRecipeB2.length, '| B3:', fullRecipeB3.length, '| B4:', fullRecipeB4.length, '| B5:', fullRecipeB5.length, '| B6:', fullRecipeB6.length, '| B7:', fullRecipeB7.length, '| B8:', fullRecipeB8.length);
const batchAll = [...fullRecipeB2, ...fullRecipeB3, ...fullRecipeB4, ...fullRecipeB5, ...fullRecipeB6, ...fullRecipeB7, ...fullRecipeB8];
for (const r of batchAll) {
  const recipe = batchSpecToEngineRecipe(r);
  const features = extractFeatures(recipe);
  const hier = HIER.styles[r.correct_style_slug] || { ferm_type:'?', family:'?' };
  records.push({
    id: 'b2_' + (records.length - v1Count).toString().padStart(3,'0'),
    source: r.source,
    name: r.beer_name,
    label_slug: r.correct_style_slug, label_family: hier.family, label_ferm: hier.ferm_type,
    features,
  });
}

// ═══ STATS ═══
const featureKeys = Object.keys(records[0].features);
const stats = {};
for (const k of featureKeys) {
  const vals = records.map(r => r.features[k]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
  const variance = vals.reduce((a,b)=>a+(b-mean)**2, 0) / vals.length;
  stats[k] = { min, max, mean: +mean.toFixed(3), std: +Math.sqrt(variance).toFixed(3) };
}

fs.writeFileSync(__dirname + '/_ml_dataset.json', JSON.stringify({
  _meta: {
    version: 'yol_b_v2',
    created_at: new Date().toISOString(),
    source: 'v1 frozen ' + v1Count + ' + batch2 ' + b2.recipes.length,
    count: records.length,
    feature_count: featureKeys.length,
    feature_keys: featureKeys,
  },
  feature_stats: stats,
  records,
}, null, 2));

console.log('✓ _ml_dataset.json yenilendi');
console.log('  Toplam recete:', records.length, '(v1: '+v1Count+' + batch2: '+b2.recipes.length+')');
console.log('  Feature sayisi:', featureKeys.length);
console.log('  Dosya boyutu:  ' + (fs.statSync('_ml_dataset.json').size/1024).toFixed(1) + ' KB');

const famDist = {};
records.forEach(r => { famDist[r.label_family] = (famDist[r.label_family]||0)+1; });
console.log('\nFamily dagilimi:');
Object.entries(famDist).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+v+' × '+k));
