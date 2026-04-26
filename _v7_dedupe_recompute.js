// Adım 33: V7 dataset dedupe + classifyMalt recompute → _ml_dataset_v7_clean.json
const fs = require('fs');

// === Source loaders — normalize 3 different schemas to common ===
function loadPilot() {
  const d = JSON.parse(fs.readFileSync('_ml_dataset_v7_partial_with_malts.json', 'utf8'));
  return d.records.map(r => ({
    source: 'pilot',
    source_id: r.id,
    name: r.name,
    bjcp_slug: r.label_slug,
    bjcp_main_category: null,
    raw: {
      malts: (r.raw.malts || []).map(m => ({ name: m.name, amount_kg: m.weight_lb ? m.weight_lb * 0.453592 : 0, percent: m.pct })),
      hops: (r.raw.hops || []).map(h => ({ name: h.name, amount_kg: h.amount_oz ? h.amount_oz * 0.0283495 : 0, alpha: h.alpha_acid, time_min: h.time_min, use: h.use })),
      yeast: r.raw.yeast,
      og: r.raw.og,
      fg: r.raw.fg,
      abv: r.raw.abv,
      ibu: r.raw.ibu,
      srm: r.raw.srm,
      batch_size_l: r.raw.batch_size_gallons ? r.raw.batch_size_gallons * 3.78541 : null,
      fermentation_temp_F: r.raw.fermentation_temp_F
    }
  }));
}

function loadDiydog() {
  const d = JSON.parse(fs.readFileSync('_v7_recipes_diydog.json', 'utf8'));
  return d.records.filter(r => !r.bjcp_unmapped).map(r => ({
    source: 'diydog',
    source_id: r.source_file,
    name: r.name,
    bjcp_slug: r.bjcp_slug,
    bjcp_main_category: null,
    raw: {
      malts: (r.fermentables || []).map(m => ({ name: m.name, amount_kg: m.amount_kg, percent: null, type: m.type, color: m.color })),
      hops: (r.hops || []).map(h => ({ name: h.name, amount_kg: h.amount_kg, alpha: h.alpha, time_min: h.time_min, use: h.use })),
      yeasts: r.yeasts,
      og: r.og ? (r.og > 100 ? r.og / 1000 : r.og) : null,
      fg: r.fg ? (r.fg > 100 ? r.fg / 1000 : r.fg) : null,
      abv: null,
      ibu: r.ibu,
      srm: r.color_srm,
      batch_size_l: r.batch_size_l,
      boil_time_min: r.boil_time_min,
      efficiency_pct: r.efficiency_pct
    }
  }));
}

function loadTMF() {
  const d = JSON.parse(fs.readFileSync('_v7_recipes_tmf.json', 'utf8'));
  return d.records.filter(r => r.bjcp_slug && r.bjcp_slug !== 'specialty_beer').map(r => ({
    source: 'tmf',
    source_id: r.url ? r.url.split('/').pop() : (r.name || '').replace(/[^a-z0-9]/gi, '_'),
    name: r.name,
    bjcp_slug: r.bjcp_slug,
    bjcp_main_category: null,
    raw: {
      malts: (r.fermentables || []).map(m => ({
        name: m.name,
        amount_kg: m.amount_lb ? m.amount_lb * 0.453592 : (m.unit === 'lb' || m.unit === 'lbs') ? (m.amount || 0) * 0.453592 : (m.unit === 'kg' ? (m.amount || 0) : 0),
        percent: m.percent
      })),
      hops: (r.hops || []).map(h => ({
        name: h.name,
        amount_kg: h.amount_oz ? h.amount_oz * 0.0283495 : (h.unit === 'oz' ? (h.amount || 0) * 0.0283495 : (h.unit === 'g' ? (h.amount || 0) / 1000 : 0)),
        alpha: h.alpha,
        time_min: h.time_min,
        use: h.use
      })),
      yeast: r.yeast || (r.yeasts && r.yeasts[0]),
      og: r.og,
      fg: r.fg,
      abv: r.abv,
      ibu: r.ibu,
      srm: r.srm || r.srm_estimated,
      batch_size_l: r.batch_size_gal ? r.batch_size_gal * 3.78541 : null,
      boil_time_min: r.boil_time_min,
      efficiency_pct: r.efficiency_pct,
      mash_temp_f: r.mash_temp_f
    }
  }));
}

// === Pool ===
const pool = [...loadPilot(), ...loadDiydog(), ...loadTMF()];
console.log('=== POOL ===');
console.log('Total records:', pool.length);
const bySource = {};
pool.forEach(r => bySource[r.source] = (bySource[r.source] || 0) + 1);
console.log('By source:', bySource);
console.log('Unmapped excluded:', 'diydog 41 specialty + tmf ~unknown');

// === DEDUPE ===
function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(clone|recipe|the|a|an|brewing|book|byo)\b/g, '')
    .replace(/\b\d{4}\b/g, '') // years
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function vecKey(r) {
  const og = r.raw.og || 0;
  const fg = r.raw.fg || 0;
  const abv = r.raw.abv || 0;
  const ibu = r.raw.ibu || 0;
  const srm = r.raw.srm || 0;
  return r.bjcp_slug + '|' + Math.round(og * 1000) + '|' + Math.round(fg * 1000) + '|' + Math.round(abv) + '|' + Math.round(ibu / 2) + '|' + Math.round(srm / 2);
}

function nameKey(r) {
  return r.bjcp_slug + '|' + normalizeName(r.name);
}

const sourcePriority = { tmf: 3, diydog: 2, pilot: 1 };
const seen = {};
const dups = [];
for (const r of pool) {
  const k1 = nameKey(r);
  const k2 = vecKey(r);
  const existingByName = seen[k1];
  const existingByVec = seen[k2];
  if (existingByName) {
    const exP = sourcePriority[existingByName.source];
    const newP = sourcePriority[r.source];
    if (newP > exP) {
      dups.push({ kept: r.source + ':' + r.source_id, dropped: existingByName.source + ':' + existingByName.source_id, reason: 'name_match', name: r.name });
      seen[k1] = r;
      seen[vecKey(existingByName)] = r;
    } else {
      dups.push({ kept: existingByName.source + ':' + existingByName.source_id, dropped: r.source + ':' + r.source_id, reason: 'name_match', name: r.name });
    }
    continue;
  }
  if (existingByVec) {
    const exP = sourcePriority[existingByVec.source];
    const newP = sourcePriority[r.source];
    if (newP > exP) {
      dups.push({ kept: r.source + ':' + r.source_id, dropped: existingByVec.source + ':' + existingByVec.source_id, reason: 'vec_match', name: r.name });
      seen[nameKey(existingByVec)] = r;
      seen[k2] = r;
    } else {
      dups.push({ kept: existingByVec.source + ':' + existingByVec.source_id, dropped: r.source + ':' + r.source_id, reason: 'vec_match', name: r.name });
    }
    continue;
  }
  seen[k1] = r;
  seen[k2] = r;
}
const unique = Array.from(new Set(Object.values(seen)));
console.log('\n=== DEDUPE ===');
console.log('Before:', pool.length);
console.log('After:', unique.length);
console.log('Duplicates removed:', dups.length);
console.log('Top 10 dup pairs:');
dups.slice(0, 10).forEach(d => console.log('  ' + d.reason + ': KEEP ' + d.kept + ' | DROP ' + d.dropped + ' | name=' + d.name));

// === classifyMalt ===
function classifyMalt(name) {
  const lid = String(name || '').toLowerCase();
  if (!lid) return 'other';
  // Crystal/Caramel — most specific (c40 etc)
  if (/(?:^|\s|_)(c\d+|caram|cara[\s_-]|crystal|kristal)/.test(lid) || /^cara[mh]/.test(lid)) return 'crystal';
  if (/honey\s*malt|honey malt/.test(lid)) return 'aromatic_abbey';
  if (/(carafa|chocolate|choc[^o]|cikolata|dehusked)/.test(lid)) return 'choc';
  if (/(roast(?:ed)?\s*barley|roasted_barley|black\s*malt|black_malt|patent|debittered|kavrulmus|siyah)/.test(lid)) return 'roast';
  if (/(rauch|smoke|smoked|isli|cherrywood|beechwood|peat)/.test(lid)) return 'smoked';
  if (/(rye|cavdar|roggen|rwh)/.test(lid)) return 'rye';
  if (/^oat|^yulaf|flaked\s*oat|flaked_oat|oats?\b/.test(lid)) return 'oats';
  if (/(wheat|weizen|bugday|weizenmalt|torrified[\s_]wheat|flaked[\s_]wheat|raw[\s_]wheat|red[\s_]wheat|white[\s_]wheat|dark[\s_]wheat)/.test(lid)) return 'wheat';
  if (/^(corn|misir|mais|flaked[\s_]corn|maize|grits)/.test(lid)) return 'corn';
  if (/^rice|pirinc|flaked[\s_]rice/.test(lid)) return 'rice';
  if (/(sugar|seker|candi|candy|nobet|demerara|turbinado|molasses|honey(?!\s*malt)|maple|invert|cane|dextrose|brown[\s_]sugar|table[\s_]sugar|d-180|d-90|d-45|treacle)/.test(lid)) return 'sugar';
  if (/(aromatic|melanoidin|special[\s_]b)/.test(lid)) return 'aromatic_abbey';
  if (/(abbey)/.test(lid)) return 'aromatic_abbey';
  if (/^(munich|muenchner|munchner)/.test(lid)) return 'munich';
  if (/^(vienna|viyana)/.test(lid)) return 'vienna';
  if (/^(6.row|sixrow|six[\s_-]row|6[\s_]row)/.test(lid)) return 'sixrow';
  if (/pale[\s_]ale|pale[\s_]malt|maris|maris[\s_]otter|golden[\s_]promise|halcyon|optic|tipple|chevalier|2[\s_-]row|two[\s_-]row|extra[\s_]pale|us[\s_]2[\s_-]row|american[\s_]2[\s_-]row|pale[\s_]2[\s_-]row|^pale|caraamber/.test(lid)) return 'pale_ale';
  if (/^(pilsner|pils\b|pilsen|bohemian|bohem|chateau[\s_]pils|extra[\s_]pale[\s_]pils|bel[\s_]pils|best[\s_]heidel|viking[\s_]pils|german[\s_]pilsen|french[\s_]pilsen|premium[\s_]pilsen|floor[\s_]malted)/.test(lid)) return 'pilsner';
  // Biscuit, Victory, etc fall to "other"
  return 'other';
}

// === Yeast/hop/katki signature port from Adım 20 ===
const HOP_SIG = {
  american_c_hops: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el\s*dorado|summit|equinox|ekuanot|azacca|vic\s*secret|calypso|loral|strata|talus|cashmere|hopshot)/i,
  english_hops: /(ekg|east\s*kent|fuggles?|challenger|goldings?|admiral|bramling|first\s*gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british\s*hop|styrian)/i,
  german_noble: /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|mittelfr|magnum)/i,
  czech_saaz: /(saaz|premiant|sladek|kazbek|zatec)/i,
  nz_hops: /(nelson|motueka|riwaka|waimea|wakatu|pacific|rakau|sauvin|kohatu)/i,
  aged_hops: /(aged\s*hop)/i,
  northern_brewer: /(northern\s*brewer|cluster|mount\s*hood)/i
};
const KATKI_SIG = {
  fruit: /meyve|fruit|mango|passion|seftali|peach|strawberry|cilek|raspberry|cherry|kiraz|apple|elma|pear|armut|uzum|grape|orange|portakal|lemon|limon|lime|cranberry|pomegranate|nar|kakaonibs/i,
  spice_herb: /koriander|coriander|ginger|zencefil|cinnamon|tarcin|nutmeg|clove|karanfil|herbs|rosemary|biberiye|mint|nane|lavender|lavanta|hibiscus|elderflower|jasmine|matcha|juniper|ardic|thyme|bay|cardamom/i,
  chocolate: /chocolate|cacao|kakao|cocoa|cikolata/i,
  coffee: /coffee|kahve|espresso|mocha/i,
  chile: /chile|chili|jalape|habane|pepper|biber/i,
  smoke: /smoke|smoked|rauch|isli/i,
  honey: /honey(?!\s*malt)|^bal\b/i,
  pumpkin: /pumpkin|balkabak|squash/i,
  salt: /tuz|kosher|salt/i,
  lactose: /lactose|laktoz|milk\s*sugar/i
};

// === Compute features ===
const V6_DEFAULTS = {
  mash_temp_c: 66,
  fermentation_temp_c: 19,
  yeast_attenuation: 78,
  boil_time_min: 60,
  water_ca_ppm: 150,
  water_so4_ppm: 250,
  water_cl_ppm: 120
};

function computeFeatures(rec) {
  const malts = rec.raw.malts || [];
  const hops = rec.raw.hops || [];
  const yeast = rec.raw.yeast;
  const yeastName = yeast ? (typeof yeast === 'string' ? yeast : (yeast.name || '')).toLowerCase() : '';
  const hopStr = hops.map(h => (h.name || '').toLowerCase()).join('|');

  // pct_* via classifyMalt
  const buckets = { pilsner:0, pale_ale:0, munich:0, vienna:0, wheat:0, oats:0, rye:0, crystal:0, choc:0, roast:0, smoked:0, corn:0, rice:0, sugar:0, aromatic_abbey:0, sixrow:0, other:0 };
  let totalKg = 0;
  for (const m of malts) {
    const kg = m.amount_kg || 0;
    if (kg <= 0) continue;
    totalKg += kg;
    const cat = classifyMalt(m.name);
    buckets[cat] += kg;
  }
  const pct = {};
  if (totalKg > 0) {
    for (const k of Object.keys(buckets)) pct['pct_' + k] = +(buckets[k] / totalKg * 100).toFixed(2);
  } else {
    for (const k of Object.keys(buckets)) pct['pct_' + k] = 0;
  }

  // Total base derived
  const total_base = +((pct.pct_pilsner || 0) + (pct.pct_pale_ale || 0) + (pct.pct_munich || 0) + (pct.pct_vienna || 0) + (pct.pct_wheat || 0)).toFixed(2);
  const pct_sum = Object.values(pct).reduce((s, v) => s + v, 0);

  // Yeast features
  function yeastFlag(rx) { return rx.test(yeastName) ? 1 : 0; }
  const yf = {
    yeast_belgian: /belgian|bel\b|belgique|trappist|abbey|abbaye|tripel|dubbel|saison|dupont|wlp5\d{2}|wy3[78]|wy1762|wy1388/i.test(yeastName) ? 1 : 0,
    yeast_abbey: /abbaye|abbey|trappist|tripel|dubbel|monastic|monastery|westmalle|chimay|rochefort|wlp500|wlp530|wlp540|wy1762|wy3787|imp_b63|bb_abbaye|la_abbaye|mj_m31|mj_m47|be256/i.test(yeastName) ? 1 : 0,
    yeast_saison: /saison|farmhouse|dupont|wy3711|wy3724|wlp565|wlp585|wlp670|be134|la_belle|la_farmhouse|mj_m29|oyl500/i.test(yeastName) ? 1 : 0,
    yeast_kveik: /kveik|voss|hothead|hornindal|opshaug/i.test(yeastName) ? 1 : 0,
    yeast_english: /(wlp00[2345]|wlp013|wlp017|wy1098|wy1187|wy1318|wy1335|wy1469|s-04|west yorkshire|london|esb|english|ringwood|nottingham)/i.test(yeastName) ? 1 : 0,
    yeast_american: /(us-?05|us-05|wlp001|wy1056|conan|chico|california ale|american ale|bry-?97|wlp090|us05|imperial a01|imperial l13|safale us-05)/i.test(yeastName) ? 1 : 0,
    yeast_german_lager: /(34\/70|w-?34|wy2007|wy2206|wy2308|wlp830|wlp833|wlp840|german lager|imperial l17)/i.test(yeastName) ? 1 : 0,
    yeast_czech_lager: /(wy2278|wlp802|czech|pilsner urquell|premiant lager)/i.test(yeastName) ? 1 : 0,
    yeast_american_lager: /(s-23|wlp840|wy2035|american lager)/i.test(yeastName) ? 1 : 0,
    yeast_kolsch: /(wlp029|wy2565|kolsch|kölsch|gaffel)/i.test(yeastName) ? 1 : 0,
    yeast_altbier: /(wy1007|altbier|alt yeast|wlp036)/i.test(yeastName) ? 1 : 0,
    yeast_cal_common: /(california common|wlp810|wy2112|steam beer|anchor)/i.test(yeastName) ? 1 : 0,
    yeast_brett: /brett|brettanomyces|wy5112|wlp650|wlp653|drie|fonteinen/i.test(yeastName) ? 1 : 0,
    yeast_lacto: /lactobacillus|lacto|wlp677|wlp672|wy5335|sour starter/i.test(yeastName) ? 1 : 0,
    yeast_sour_blend: /roeselare|sour blend|funk|temptation|de bom|cantillon|3 fonteinen/i.test(yeastName) ? 1 : 0,
    yeast_witbier: /(wit\b|witbier|hoegaarden|wlp400|wy3463|wy3944)/i.test(yeastName) ? 1 : 0,
    yeast_wheat_german: /(weizen|hefe|w-?06|wb-?06|wy3068|wy3056|wlp300|wlp380|munich classic|bavarian wheat)/i.test(yeastName) ? 1 : 0,
    yeast_wit: /(wit\b|witbier|wlp400|wy3463)/i.test(yeastName) ? 1 : 0
  };

  // Hop features
  const hf = {};
  for (const k of Object.keys(HOP_SIG)) hf['hop_' + k.replace(/_hops|_noble/, '')] = HOP_SIG[k].test(hopStr) ? 1 : 0;
  // Normalize names
  const hopFeats = {
    hop_american_c: hf.hop_american_c,
    hop_english: hf.hop_english,
    hop_german: hf.hop_german,
    hop_czech_saaz: hf.hop_czech_saaz,
    hop_nz: hf.hop_nz,
    hop_aged: hf.hop_aged,
    hop_northern_brewer: hf.hop_northern_brewer
  };

  // Katki features
  const kf = {};
  const allText = malts.map(m => m.name || '').join('|').toLowerCase() + '|' + hopStr;
  for (const k of Object.keys(KATKI_SIG)) kf['katki_' + k] = KATKI_SIG[k].test(allText) ? 1 : 0;

  // Process features
  const og = rec.raw.og || 0;
  const fg = rec.raw.fg || 0;
  const abv = rec.raw.abv || (og && fg ? +((og - fg) * 131).toFixed(2) : 0);
  const ibu = rec.raw.ibu || 0;
  const srm = rec.raw.srm || 0;

  const fermTempC = rec.raw.fermentation_temp_F ? +((rec.raw.fermentation_temp_F - 32) * 5 / 9).toFixed(1) : V6_DEFAULTS.fermentation_temp_c;
  const mashTempC = rec.raw.mash_temp_f ? +((rec.raw.mash_temp_f - 32) * 5 / 9).toFixed(1) : V6_DEFAULTS.mash_temp_c;

  const proc = {
    mash_temp_c: mashTempC,
    fermentation_temp_c: fermTempC,
    yeast_attenuation: V6_DEFAULTS.yeast_attenuation,
    boil_time_min: rec.raw.boil_time_min || V6_DEFAULTS.boil_time_min,
    water_ca_ppm: V6_DEFAULTS.water_ca_ppm,
    water_so4_ppm: V6_DEFAULTS.water_so4_ppm,
    water_cl_ppm: V6_DEFAULTS.water_cl_ppm
  };

  // Derived
  const lager = (yf.yeast_german_lager || yf.yeast_czech_lager || yf.yeast_american_lager) ? 1 : 0;
  const dryHopAny = hops.some(h => /dry[_\s]?hop/i.test(h.use || ''));
  const derived = {
    dry_hop_days: dryHopAny ? 5 : 0,
    mash_type_step: 1,
    mash_type_decoction: 0,
    lagering_days: lager ? 14 : 0
  };

  return {
    og: og,
    fg: fg,
    abv: abv,
    ibu: ibu,
    srm: srm,
    ...pct,
    total_base,
    ...yf,
    ...hopFeats,
    ...kf,
    ...proc,
    ...derived,
    _pct_sum: +pct_sum.toFixed(2)
  };
}

// === Style hierarchy → main category ===
const HIERARCHY = JSON.parse(fs.readFileSync('_audit_step_26d_style_hierarchy.json', 'utf8'));
const slugToMain = {};
Object.entries(HIERARCHY.categories).forEach(([cat, info]) => {
  info.slugs.forEach(s => { slugToMain[s.slug] = cat; });
});

// === Process all unique records ===
console.log('\n=== RECOMPUTE ===');
const processed = [];
const sumStats = { ok_95_105: 0, low: 0, high: 0, very_high_30: 0 };
const otherFlagged = [];
for (const r of unique) {
  const f = computeFeatures(r);
  const recId = r.source + '_' + r.source_id;
  const main = slugToMain[r.bjcp_slug] || 'unmapped';
  const out = {
    id: recId,
    source: r.source,
    source_id: r.source_id,
    name: r.name,
    bjcp_slug: r.bjcp_slug,
    bjcp_main_category: main,
    raw: r.raw,
    features: f
  };
  processed.push(out);
  // Sanity stats
  const s = f._pct_sum;
  if (s >= 95 && s <= 105) sumStats.ok_95_105++;
  else if (s < 95) sumStats.low++;
  else if (s > 105 && s <= 130) sumStats.high++;
  else sumStats.very_high_30++;
  if (f.pct_other > 30) otherFlagged.push({ id: recId, pct_other: f.pct_other, name: r.name });
}
console.log('Recipes processed:', processed.length);
console.log('Pct sum 95-105 (sağlıklı):', sumStats.ok_95_105, '(' + (100 * sumStats.ok_95_105 / processed.length).toFixed(1) + '%)');
console.log('Pct sum < 95 (eksik):', sumStats.low);
console.log('Pct sum 105-130 (orta çakışma):', sumStats.high);
console.log('Pct sum > 130 (yüksek çakışma):', sumStats.very_high_30);
console.log('pct_other > 30 (yanlış kategorize?):', otherFlagged.length);
if (otherFlagged.length) console.log('  First 5:', otherFlagged.slice(0, 5).map(x => x.name + ' (' + x.pct_other + '%)'));

// === Stratified train/test split ===
console.log('\n=== SPLIT ===');
const bySlug = {};
for (const r of processed) {
  if (!bySlug[r.bjcp_slug]) bySlug[r.bjcp_slug] = [];
  bySlug[r.bjcp_slug].push(r);
}
const slugCounts = Object.entries(bySlug).map(([s, arr]) => ({ slug: s, n: arr.length })).sort((a, b) => b.n - a.n);
console.log('Total unique slugs:', slugCounts.length);
console.log('n>=20:', slugCounts.filter(x => x.n >= 20).length);
console.log('n>=10:', slugCounts.filter(x => x.n >= 10).length);
console.log('n>=5:', slugCounts.filter(x => x.n >= 5).length);
console.log('n<5 (V7 problem):', slugCounts.filter(x => x.n < 5).length);
console.log('Top 10 slugs:');
slugCounts.slice(0, 10).forEach(x => console.log('  ' + x.slug.padEnd(40) + x.n));

// 80/20 stratified, deterministic seed shuffle (skip 1)
let seed = 42;
function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
let trainN = 0, testN = 0;
for (const slug of Object.keys(bySlug)) {
  const arr = shuffle(bySlug[slug]);
  const testCount = Math.max(1, Math.floor(arr.length * 0.2));
  for (let i = 0; i < arr.length; i++) {
    arr[i].in_split = i < testCount ? 'test' : 'train';
    if (arr[i].in_split === 'train') trainN++; else testN++;
  }
}
console.log('Train:', trainN, '/ Test:', testN);

// === Write final ===
const featureList = Object.keys(processed[0].features).filter(k => k !== '_pct_sum');
const out = {
  meta: {
    generated: new Date().toISOString(),
    total_recipes: processed.length,
    train_n: trainN,
    test_n: testN,
    total_styles: slugCounts.length,
    feature_count: featureList.length,
    feature_list: featureList,
    regex_version: '26B',
    sources: bySource,
    dedupe_removed: dups.length,
    pct_sum_quality: sumStats
  },
  recipes: processed.map(r => ({
    id: r.id,
    source: r.source,
    source_id: r.source_id,
    name: r.name,
    bjcp_slug: r.bjcp_slug,
    bjcp_main_category: r.bjcp_main_category,
    raw: r.raw,
    features: { ...r.features },  // includes _pct_sum
    in_split: r.in_split
  }))
};
delete out.recipes.forEach;
out.recipes.forEach(r => { delete r.features._pct_sum; });
fs.writeFileSync('_ml_dataset_v7_clean.json', JSON.stringify(out, null, 2));
console.log('\n=== OUTPUT ===');
console.log('Wrote _ml_dataset_v7_clean.json (' + (JSON.stringify(out).length / 1024).toFixed(0) + ' KB)');
console.log('Feature count:', featureList.length);
console.log('Feature list:', featureList);

// Save dedupe report
fs.writeFileSync('_v7_dedupe_log.json', JSON.stringify({ duplicates: dups, n_before: pool.length, n_after: unique.length }, null, 2));
