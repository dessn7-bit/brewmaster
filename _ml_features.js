// Yol B Aşama 1 — Feature extraction pipeline
// 249 reçete (v1 frozen 199 + v2 batch1 50) → ~50 feature vector
// Output: _ml_dataset.json (training data, hiyerarşik labeled)
const fs = require('fs');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');
const HIER = JSON.parse(fs.readFileSync(__dirname + '/hierarchy_map.json', 'utf8'));

// ═══════════════════ YEAST SIGNATURE CHECKS ═══════════════════
// Her aile için hard marker regex (mevcut motor FAMILY_SIGNATURES temelli, feature binary flag)
const YEAST_SIG = {
  english:        /(wy1028|wy1098|wy1099|wy1187|wy1275|wy1318|wy1335|wy1469|wy1728|wy1768|wy1968|wlp002|wlp004|wlp005|wlp007|wlp013|wlp017|wlp022|wlp023|wlp025|wlp028|nottingham|windsor|whitbread|london\s*ale|british\s*ale|english\s*ale|edinburgh|scottish|irish\s*ale|tartan|s[\-]?04\b|m44\b|fuller|thornbridge|ringwood|pub|darkness)/i,
  american:       /(us[\-]?05|wlp001|wlp008|wlp041|wlp051|wlp060|wlp090|wy1056|wy1272|wy1450|bry[\-]?97|chico|california\s*ale|west\s*coast\s*ale|american\s*ale|flagship|independence|capri|vermont\s*ale|juice|barbarian|conan|house\b.*?a01|oyl)/i,
  belgian:        /(wy1214|wy1388|wy1762|wy3522|wy3787|wy3944|wlp400|wlp500|wlp510|wlp515|wlp530|wlp540|wlp545|wlp550|wlp570|wlp585|trappist|abbey|chimay|westmalle|rochefort|duvel|orval|witbier|celis|b45\b|b48\b|b63\b|b90\b|t[\-]?58|m31\b|napoleon|triple\s*double)/i,
  saison:         /(wy3724|saison|dupont|farmhouse|rustic|belle\s*saison|b47\b|b64\b|wlp565|wlp566|wlp568|wlp590|m29\b|m41\b)/i,
  wheat_german:   /(wy3056|wy3068|wy3638|wy3333|wlp300|wlp320|wlp351|wlp380|wb[\-]?06|weihenstephan|hefeweizen|bavarian\s*(wheat|hefe|weiss)|weiss\w*|hefe\w*|m20\b|m08\b|m15\b|\b3068\b|\b3638\b|\b3056\b)/i,
  german_lager:   /(wlp830|wlp833|wlp838|wlp840|wlp920|wlp925|wy2000|wy2001|wy2007|wy2042|wy2124|wy2206|wy2247|wy2308|wy2352|34[\/\-]?70|w[\-]?34|saflager|munich\s*lager|bavarian\s*lager|augustiner|harvest\s*lager|\bl09\b|\bl10\b|\bl11\b|\bl13\b|\bl17\b|\bl30\b|\bl32\b|\bl40\b|triumvirate|kellermeister)/i,
  czech_lager:    /(wy2278|wlp800|wlp802|urkel|urquell|pilsner\s*urquell|czech\s*(lager|pilsen|pilsner)|bohemian\s*lager|budvar|cesky|lookr|\bl28\b|\bl29\b)/i,
  american_lager: /(wlp840|wlp810|wy2007|wy2035|wy2112|saflager.*us|american\s*lager|mexican\s*lager|cervezeria|\bl01\b|\bl02\b)/i,
  kolsch:         /(wlp029|wy2565|k[oö]lsch|kolsch|koelsch|stefon|\bg01\b|\bg04\b)/i,
  altbier:        /(wlp036|wlp011|wy1007|wy1010|alt\s*ale|dusseldorf|alt.?bier|kaiser|dieter|\bg02\b|\bg03\b)/i,
  california_common: /(wlp810|wy2112|california\s*(lager|common|steam)|cal\s*common|steam\s*beer|anchor|cablecar|cable\s*car|\bl05\b)/i,
  brett:          /(brett|brettanomyces|wlp648|wlp650|wlp653|wy5112|wy5526)/i,
  lacto:          /(lacto|lactobacillus|plantarum|brevis|pediococcus|wy4335|wy4733)/i,
  sour_blend:     /(roeselare|melange|rodenbach|lambic|spontaneous|wild\s*capture|ecy02|ecy04|wlp655|wlp665|wlp670|wy3763|wy3278|sour\s*blend|mixed\s*culture)/i,
  kveik:          /(kveik|voss|hornindal|hothead|omega\s*kveik|lutra)/i,
  wit:            /(wy3944|wlp400|wit\s*(ale|beer|yeast)|witbier|celis|forbidden\s*fruit|k.?97)/i,
};

// ═══════════════════ HOP SIGNATURE CHECKS ═══════════════════
const HOP_SIG = {
  american_c_hops: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el\s*dorado|summit|equinox|ekuanot|azacca|vic\s*secret|calypso|loral|strata|talus|cashmere)/i,
  english_hops:    /(ekg|east\s*kent|fuggles?|challenger|goldings|admiral|bramling|first\s*gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british\s*hop)/i,
  german_noble:    /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|mittelfr)/i,
  czech_saaz:      /(saaz|premiant|sladek|kazbek|zatec)/i,
  nz_hops:         /(nelson|motueka|riwaka|waimea|wakatu|pacific\s*(gem|jade)|rakau|sauvin)/i,
  australian_hops: /(galaxy|vic\s*secret|ella|enigma|topaz)/i,
  aged_hops:       /(aged\s*hop)/i,
  northern_brewer: /(northern\s*brewer|cluster|mount\s*hood)/i,
};

// ═══════════════════ KATKI SIGNATURE ═══════════════════
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

function signatureFlag(rx, str) { return rx.test(str) ? 1 : 0; }

function extractFeatures(recipe) {
  const yeastStr = [recipe._yeast_raw, recipe.mayaId, recipe.maya2Id].filter(Boolean).join('|');
  const hopStr   = (recipe.hopIds   || []).join('|');
  const maltStr  = (recipe.maltIds  || []).join('|');
  const katkiStr = (recipe.katkiIds || []).join('|');
  const p = recipe.percents || {};

  // Scalar features (raw values — KNN için normalize script aşağıda)
  const f = {
    og:  recipe._og  || 0,
    fg:  recipe._fg  || 0,
    abv: recipe._abv || 0,
    ibu: recipe._ibu || 0,
    srm: recipe._srm || 0,

    // Malt buckets (0-100)
    pct_pilsner:   p.pilsnerPct   || 0,
    pct_base:      p.baseMaltPct  || 0,
    pct_munich:    p.munichPct    || 0,
    pct_vienna:    p.viennaPct    || 0,
    pct_wheat:     p.wheatPct     || 0,
    pct_oats:      p.oatsPct      || 0,
    pct_crystal:   p.crystalPct   || 0,
    pct_choc:      p.chocPct      || 0,
    pct_roast:     p.roastPct     || 0,
    pct_corn:      p.cornPct      || 0,
    pct_rice:      p.ricePct      || 0,
    pct_sugar:     p.sugarPct     || 0,
    pct_aromatic_abbey: p.aromaticAbbeyMunichPct || 0,
    pct_smoked:    p.smokedPct    || 0,
    pct_rye:       p.ryePct       || 0,
    pct_sixrow:    p.sixRowPct    || 0,

    // Derived
    total_dark:    (p.chocPct||0) + (p.roastPct||0),
    total_adjunct: (p.cornPct||0) + (p.ricePct||0) + (p.sugarPct||0),
    crystal_ratio: (p.crystalPct||0) / Math.max(1, (p.pilsnerPct||0)+(p.baseMaltPct||0)+(p.wheatPct||0)),

    // Yeast binary flags
    yeast_english:        signatureFlag(YEAST_SIG.english, yeastStr),
    yeast_american:       signatureFlag(YEAST_SIG.american, yeastStr),
    yeast_belgian:        signatureFlag(YEAST_SIG.belgian, yeastStr),
    yeast_saison:         signatureFlag(YEAST_SIG.saison, yeastStr),
    yeast_wheat_german:   signatureFlag(YEAST_SIG.wheat_german, yeastStr),
    yeast_german_lager:   signatureFlag(YEAST_SIG.german_lager, yeastStr),
    yeast_czech_lager:    signatureFlag(YEAST_SIG.czech_lager, yeastStr),
    yeast_american_lager: signatureFlag(YEAST_SIG.american_lager, yeastStr),
    yeast_kolsch:         signatureFlag(YEAST_SIG.kolsch, yeastStr),
    yeast_altbier:        signatureFlag(YEAST_SIG.altbier, yeastStr),
    yeast_cal_common:     signatureFlag(YEAST_SIG.california_common, yeastStr),
    yeast_brett:          signatureFlag(YEAST_SIG.brett, yeastStr),
    yeast_lacto:          signatureFlag(YEAST_SIG.lacto, yeastStr),
    yeast_sour_blend:     signatureFlag(YEAST_SIG.sour_blend, yeastStr),
    yeast_kveik:          signatureFlag(YEAST_SIG.kveik, yeastStr),
    yeast_wit:            signatureFlag(YEAST_SIG.wit, yeastStr),

    // Hop binary flags
    hop_american_c: signatureFlag(HOP_SIG.american_c_hops, hopStr),
    hop_english:    signatureFlag(HOP_SIG.english_hops, hopStr),
    hop_german:     signatureFlag(HOP_SIG.german_noble, hopStr),
    hop_czech_saaz: signatureFlag(HOP_SIG.czech_saaz, hopStr),
    hop_nz:         signatureFlag(HOP_SIG.nz_hops, hopStr),
    hop_aged:       signatureFlag(HOP_SIG.aged_hops, hopStr),
    hop_northern_brewer: signatureFlag(HOP_SIG.northern_brewer, hopStr),

    // Katki binary flags
    katki_lactose:    signatureFlag(KATKI_SIG.lactose, katkiStr),
    katki_fruit:      signatureFlag(KATKI_SIG.fruit, katkiStr),
    katki_spice_herb: signatureFlag(KATKI_SIG.spice_herb, katkiStr),
    katki_chocolate:  signatureFlag(KATKI_SIG.chocolate, katkiStr),
    katki_coffee:     signatureFlag(KATKI_SIG.coffee, katkiStr),
    katki_chile:      signatureFlag(KATKI_SIG.chile, katkiStr),
    katki_smoke:      signatureFlag(KATKI_SIG.smoke, katkiStr),
    katki_honey:      signatureFlag(KATKI_SIG.honey, katkiStr),
    katki_pumpkin:    signatureFlag(KATKI_SIG.pumpkin, katkiStr),
    katki_salt:       signatureFlag(KATKI_SIG.salt, katkiStr),

    // Derived style signals
    high_hop:     (recipe._ibu || 0) > 50 ? 1 : 0,
    strong_abv:   (recipe._abv || 0) > 8 ? 1 : 0,
    dark_color:   (recipe._srm || 0) > 20 ? 1 : 0,
    pale_color:   (recipe._srm || 0) < 6 ? 1 : 0,
  };

  return f;
}

// ═══════════════════ DATASET BUILD ═══════════════════
const records = [];

// v1 frozen (199) — engine-input formatında
for (const raw of RAW_RECIPES) {
  const recipe = convertRawToEngineRecipe(raw);
  const features = extractFeatures(recipe);
  const hier = HIER.styles[raw.expected_slug] || { ferm_type:'?', family:'?' };
  records.push({
    id: 'v1_' + records.length.toString().padStart(3,'0'),
    source: raw.source,
    name: raw.data.name,
    label_slug:   raw.expected_slug,
    label_family: hier.family,
    label_ferm:   hier.ferm_type,
    features,
  });
}

const baselineCount = records.length;

// v2 batch1 — Kaan spec formatından (malt/hop null olabilir)
// Bu round'da v2 batch1'i DATASET'e ALMA — spec-only scalar ile feature vektor eksik, training için risk
// Sadece v1 training kullanılacak. (Kaan istediğinde v2'yi de ekleyebiliriz)

// ═══════════════════ FEATURE STATS ═══════════════════
const allFeatures = records.map(r => r.features);
const featureKeys = Object.keys(allFeatures[0]);
const stats = {};
for (const k of featureKeys) {
  const vals = allFeatures.map(f => f[k]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
  const variance = vals.reduce((a,b)=>a+(b-mean)**2, 0) / vals.length;
  stats[k] = { min, max, mean: +mean.toFixed(3), std: +Math.sqrt(variance).toFixed(3) };
}

// ═══════════════════ CIKTI ═══════════════════
const dataset = {
  _meta: {
    version: 'yol_b_v1',
    created_at: new Date().toISOString(),
    source: 'v1 frozen 199 recipes via convertRawToEngineRecipe',
    count: records.length,
    feature_count: featureKeys.length,
    feature_keys: featureKeys,
  },
  feature_stats: stats,
  records,
};

fs.writeFileSync(__dirname + '/_ml_dataset.json', JSON.stringify(dataset, null, 2));
console.log('✓ _ml_dataset.json yazildi');
console.log('  Recete sayisi:    ' + records.length);
console.log('  Feature sayisi:   ' + featureKeys.length);
console.log('  Dosya boyutu:     ' + (fs.statSync('_ml_dataset.json').size/1024).toFixed(1) + ' KB');

// Label distribution sanity check
const labelDist = {};
records.forEach(r => { labelDist[r.label_family] = (labelDist[r.label_family]||0)+1; });
console.log('\nAile dağılımı (L2 labels):');
Object.entries(labelDist).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+v+' × '+k));

// Feature coverage (kaç recipede aktif)
console.log('\nBinary feature coverage (top 15):');
const coverage = {};
featureKeys.forEach(k => {
  const binary = allFeatures.every(f => f[k] === 0 || f[k] === 1);
  if (binary) coverage[k] = allFeatures.filter(f=>f[k]===1).length;
});
Object.entries(coverage).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log('  '+v.toString().padStart(3)+' / '+records.length+' — '+k));
