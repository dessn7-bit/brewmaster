// Ham reçeteyi (malt/hop/yeast isimleri) motor formatına çevirir — v2 geliştirilmiş.
// Değişiklikler v2:
//   - Extract (DME/LME) tip tespiti
//   - Malt brand dictionary (Weyermann, Best, Simpsons, Mecca Grade vs.)
//   - Yeast regex güçlendirildi (bavarian wheat, 3068, 3638 standalone vs.)
//   - Dedupe katkiIds
//   - Rice hulls skip (filtering aid)

const fs = require('fs');
const path = require('path');
const { findBestMatches } = require('./style_engine.js');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');

// ═══════════════════ MALT KURALLARI ═══════════════════
// Sıra kritik: daha spesifik kurallar ÖNCE (brand > jenerik). İlk eşleşen kazanır.
const MALT_RULES = [
  // SKIP: filtering aid, no calorie/flavor contribution
  { rx: /(rice\s*hulls?)/i, bucket: '__skip' },

  // EXTRACT / DME / LME (base type detection)
  { rx: /bavarian.*?(wheat|weissbier|hefeweizen).*?(dme|lme|extract)|weyermann.*?bavarian|bavarian.*?(dme|lme).*wheat/i, bucket: 'wheatPct' },
  { rx: /wheat.*?(dme|lme|extract|syrup)|(dme|lme|extract|syrup).*?wheat/i, bucket: 'wheatPct' },
  { rx: /munich.*?(dme|lme|extract|syrup)|(dme|lme|syrup).*?munich/i, bucket: 'munichPct' },
  { rx: /(amber).*?(dme|lme|extract|syrup)|(dme|lme|syrup).*?amber/i, bucket: 'crystalPct' },
  { rx: /(dark).*?(dme|lme|extract|syrup)|(dme|lme|syrup).*?dark(?!ness)/i, bucket: 'chocPct' },
  { rx: /(extra.?light|light|pale|pilsen|pilsner).*?(dme|lme|extract|syrup)/i, bucket: 'baseMaltPct', alsoPilsner: true },
  { rx: /^(malt extract|dme|lme|syrup)\b/i, bucket: 'baseMaltPct', alsoPilsner: true },

  // PILSNER BRAND
  { rx: /(weyermann\s*(pils|pilsner|barke)|best\s*(pils|pilsen|heidelberg)|czech\s*(pilsen|pilsner)|llano\s*(pilsen|pilsner)|pilsen\s*md|north\s*star|durst|bohemian\s*(pils|pilsner)|chateau\s*pils|floor.?malted\s*(bohemian|pilsner)?|isaria\s*1924|briess\s*(pils|pilsner))/i, bucket: 'pilsnerPct' },
  // PALE BRAND
  { rx: /(wildfire\s*pale|foundation\s*malt|lamonta|mecca\s*grade\s*(lamonta|pale)|admiral\s*maltings|golden\s*promise|simpsons\s*(maris|pale)|maris\s*otter|crisp\s*(pale|maris)|muntons\s*(pale|maris)|rahr\s*(pale|2.?row)|briess\s*pale|chateau\s*pale|viking\s*pale|thracian\s*pale|pale\s*ale\s*malt)/i, bucket: 'baseMaltPct', alsoPilsner: true },

  // Generic pilsner
  { rx: /\b(pilsner|pilsen|pils)\b/i, bucket: 'pilsnerPct' },
  // Generic pale
  { rx: /(pale\s*malt|pale\s*ale|2.?row|us\s*2.?row|xtra\s*pale|extra.?pale)/i, bucket: 'baseMaltPct', alsoPilsner: true },

  // MUNICH brand + generic
  { rx: /(weyermann\s*munich|best\s*munich|castle\s*munich|bonlander|munich\s*(malt|i{1,3}))|munich/i, bucket: 'munichPct' },

  // VIENNA brand + generic
  { rx: /(weyermann\s*vienna|best\s*vienna|castle\s*vienna|rimrock|vienna)/i, bucket: 'viennaPct' },

  // WHEAT (shaniko, wickiup, torrified, flaked wheat, generic wheat)
  { rx: /(shaniko|wickiup|denton\s*county|white\s*wheat|red\s*wheat|torrified\s*wheat|flaked\s*wheat|wheat\s*malt|malted\s*wheat|raw\s*wheat|weyermann\s*(pale\s*)?wheat|weyermann\s*dark\s*wheat|wheat|buğday|bugday|weizen|weissbier)/i, bucket: 'wheatPct' },

  // OATS
  { rx: /(golden\s*naked\s*oats|flaked\s*oats|rolled\s*oats|oat\s*malt|malted\s*oats|oat|yulaf)/i, bucket: 'oatsPct' },

  // CRYSTAL / CARAMEL family (caramunich/carahell/carapils/crystal/cara20MD/honey malt/dextrin/carastan/biscuit/cookie/victory)
  { rx: /(caramunich|caravienna|carahell|caraamber|caraaroma|carapils|cara\s*pils|carafoam|caramel\s*malt|crystal\s*malt|crystal\s*\d+|caramel\s*\d+|cara\s*\d+|cara\s*20\s*md|cara\s*red|crystal\s*light|light\s*crystal|dark\s*crystal|medium\s*crystal|honey\s*malt|carastan|dextrin\s*malt|dextrin|cookie\s*malt|biscuit\s*malt|melanoid|victory)/i, bucket: 'crystalPct' },

  // CHOCOLATE / CARAFA (dehusked dark)
  { rx: /(carafa|pale\s*chocolate|chocolate\s*wheat|chocolate\s*rye|chocolate\s*malt|chocolate|kakao|cacao|cikolata|midnight\s*wheat|pale\s*choc|choc\s*malt)/i, bucket: 'chocPct' },

  // ROAST (darkest)
  { rx: /(roasted\s*barley|roast\s*barley|black\s*barley|black\s*malt|black\s*patent|amber\s*malt|brown\s*malt|roast(?!ed\s+grain))/i, bucket: 'roastPct' },

  // RYE
  { rx: /(rye\s*malt|flaked\s*rye|rimrock.*rye|rye|çavdar|cavdar)/i, bucket: 'ryePct' },

  // CORN / MAIZE
  { rx: /(flaked\s*corn|flaked\s*maize|corn\s*syrup|corn\s*sugar|maize|corn|mısır|misir)/i, bucket: 'cornPct' },

  // RICE
  { rx: /(rice\s*syrup\s*solids|rice\s*syrup|rice\s*flakes|rice|pirinç|pirinc)/i, bucket: 'ricePct' },

  // SUGAR family (candi, turbinado, invert, brown, honey as fermentable, molasses)
  { rx: /(candi\s*syrup\s*d.?\d+|candi\s*syrup|candi|turbinado|invert\s*sugar|dark\s*brown\s*sugar|brown\s*sugar|cane\s*sugar|sucrose|dextrose|molasses|golden\s*syrup|^honey$|^bal$|maltodextrin|malto.?dextrin|sugar,\s*dark|sugar,\s*table)/i, bucket: 'sugarPct' },

  // AROMATIC / SPECIAL B / ABBEY
  { rx: /(special\s*b|aromatic\s*malt|abbey\s*malt|aromatic)/i, bucket: 'aromaticAbbeyMunichPct' },

  // SMOKED
  { rx: /(smoked\s*malt|rauch|weyermann\s*rauch|smoke\s*malt|cherry\s*wood|beech\s*wood)/i, bucket: 'smokedPct' },

  // GENERIC FLAKED / ADJUNCT
  { rx: /(flaked\s*barley|torrified\s*barley)/i, bucket: 'baseMaltPct' },
];

function mapMalts(malts) {
  const buckets = {
    pilsnerPct:0, baseMaltPct:0, munichPct:0, viennaPct:0, wheatPct:0, oatsPct:0, oatsWheatPct:0,
    crystalPct:0, chocPct:0, roastPct:0, cornPct:0, ricePct:0, sugarPct:0,
    aromaticMunichPct:0, aromaticAbbeyMunichPct:0, smokedPct:0, ryePct:0, adjPct:0,
  };
  let totalUnknown = 0;
  for (const m of malts || []) {
    const pct = m.pct || 0;
    if (!pct) continue;
    let matched = false;
    for (const rule of MALT_RULES) {
      if (rule.rx.test(m.name)) {
        if (rule.bucket === '__skip') { matched = true; break; }
        buckets[rule.bucket] = (buckets[rule.bucket] || 0) + pct;
        if (rule.alsoPilsner) buckets.pilsnerPct = (buckets.pilsnerPct||0) + pct * 0.8; // hafif
        matched = true;
        break;
      }
    }
    if (!matched) {
      buckets.baseMaltPct = (buckets.baseMaltPct||0) + pct;
      totalUnknown += pct;
    }
  }
  buckets.oatsWheatPct = (buckets.oatsPct||0) + (buckets.wheatPct||0);
  buckets.adjPct = (buckets.cornPct||0) + (buckets.ricePct||0) + (buckets.sugarPct||0);
  if (totalUnknown > 15) buckets._unknown_malt_pct = totalUnknown; // debug
  return buckets;
}

// ═══════════════════ HOP → ID ═══════════════════
function normalizeHop(name) {
  if (!name) return '';
  const n = name.toLowerCase()
    .replace(/hallertauer?\s*mittelfrueh?/gi, 'hallertau')
    .replace(/hallertauer?|hallertau/gi, 'hallertau')
    .replace(/tettnanger?/gi, 'tettnang')
    .replace(/styrian\s*(goldings?|wolf)?/gi, 'styrian')
    .replace(/east\s*kent\s*goldings?|ekg|kent\s*goldings?/gi, 'ekg')
    .replace(/northern\s*brewer/gi, 'northern_brewer')
    .replace(/mandarina\s*bavaria/gi, 'mandarina')
    .replace(/nelson\s*sauvin/gi, 'nelson')
    .replace(/hersbrucker?/gi, 'hersbrucker')
    .replace(/columbus|tomahawk|zeus|ctz/gi, 'columbus')
    .replace(/bru.?1(?:\s*lupomax)?/gi, 'bru1')
    .replace(/lupomax/gi, '')
    .replace(/ekuanot|equinot|ekaunot/gi, 'ekuanot')
    .replace(/amarillo/gi, 'amarillo')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g,'_').replace(/^_|_$/g,'');
  return n;
}

function mapHops(hops) {
  const set = new Set();
  (hops||[]).forEach(h => { const n = normalizeHop(h.name); if (n) set.add(n); });
  return Array.from(set);
}

// ═══════════════════ YEAST → TIP + ID ═══════════════════
function mapYeast(y) {
  if (!y) return { _mayaTip: 'ale', mayaId: 'us05', _yeast_raw: '' };
  // y may be object, array, or string
  if (Array.isArray(y)) y = y[0]; // take primary
  const name = (y.name || '').toLowerCase();
  const mfr  = (y.manufacturer || '').toLowerCase();
  const full = name + ' ' + mfr;
  // _yeast_raw: orjinal ismi sakla ki V2 motor hiyerarsik family detectionda kullansin
  const _yeast_raw = (y.name || '') + ' ' + (y.manufacturer || '');

  // SOUR / LACTO / BRETT first (can override base yeast mention)
  if (/(lacto|lactobacillus|pediococcus|sour\s*mix|plantarum|brevis|wy4335|wy4733|wy5112)/i.test(full)) return { _mayaTip:'sour', mayaId:'lacto_plantarum', _yeast_raw };
  if (/(brett|brettanomyces|wlp648|wlp650|wlp653|wy5112|wy5526)/i.test(full)) return { _mayaTip:'brett', mayaId:'brett', _yeast_raw };
  if (/(kveik|voss|hornindal|hothead|omega\s*kveik)/i.test(full)) return { _mayaTip:'kveik', mayaId:'kveik', _yeast_raw };

  // SAISON (specific)
  if (/(wy3724|b47\b|saison\b|dupont|farmhouse|rustic|wlp565|wlp566|wlp568|wlp590|napoleon|belle\s*saison|danstar\s*belle|m29\b|m41\b|b64\b)/i.test(full)) return { _mayaTip:'saison', mayaId:'wy3724', _yeast_raw };

  // WIT (specific)
  if (/(wy3944|wlp400|wit\s*(ale|beer|yeast)|witbier|celis|b44\b|b49\b|wy3463|forbidden\s*fruit|k.?97)/i.test(full)) return { _mayaTip:'wit', mayaId:'wy3944', _yeast_raw };

  // WHEAT / HEFEWEIZEN — GENIŞ TANIMA
  if (/(wlp300|wlp320|wlp351|wlp380|wy3056|wy3068|wy3638|wy3333|3068\b|3638\b|3056\b|wb.?06|bb.?(alman|weissbier|bugday|wb)|weiss\w*|weihenstephan|hefe\w*|bavarian\s*(wheat|hefe|weiss)|m20\b|m08\b|m15\b)/i.test(full)) return { _mayaTip:'wheat', mayaId:'wb06', _yeast_raw };

  // BELGIAN
  if (/(wy3787|wy3522|wy1762|wy1214|wy1388|wlp500|wlp510|wlp515|wlp530|wlp540|wlp545|wlp550|wlp570|wlp585|b45\b|b48\b|b63\b|triple\s*double|chimay|westmalle|rochefort|abbey\s*ale|trappist|belgian\s*(strong|dark|ale|abbey))/i.test(full)) return { _mayaTip:'belcika', mayaId:'wy3787', _yeast_raw };

  // LAGER
  if (/(wlp8\d{2}|wlp9\d{2}|wy20\d{2}|wy21\d{2}|wy22\d{2}|wy23\d{2}|wy24\d{2}|s.?23|w.?34.?70|w.?34|34\/70|harvest|global|cablecar|dieter|lookr|augustiner|czech\s*(lager|pilsen)|pilsner\s*urquell|munich\s*lager|bohemian\s*lager|pilgrimage|\bl0\d\b|\bl1\d\b|\bl2\d\b|\bl3\d\b)/i.test(full)) return { _mayaTip:'lager', mayaId:'wy2124', _yeast_raw };

  // KOLSCH/ALTBIER — ayrık mayaId (altbier'i kolsch ile karıştırmamak için)
  if (/(koelsch|kölsch|kolsch|wlp029|wy2565|g01\b)/i.test(full)) return { _mayaTip:'ale', mayaId:'wlp029', _yeast_raw };
  if (/(altbier|dusseldorf|wlp036|wlp011|wy1007|wy1010|g02\b|kaiser|stefon)/i.test(full)) return { _mayaTip:'ale', mayaId:'wy1007', _yeast_raw };

  // ENGLISH / GENERIC ALE
  if (/(\ba0\d\b|\ba1\d\b|\ba2\d\b|\ba3\d\b|wlp001|wlp002|wlp005|wlp007|wlp013|wlp023|wlp051|wlp080|wy1056|wy1084|wy1098|wy1272|wy1275|wy1318|wy1335|wy1968|us.?05|bry.?97|s.?04|nottingham|windsor|london|flagship|house|pub|independence|capri|tartan|darkness|american\s*ale|chico|safale|west\s*coast\s*ale|california|brytec)/i.test(full)) return { _mayaTip:'ale', mayaId:'us05', _yeast_raw };

  return { _mayaTip:'ale', mayaId:'us05', _yeast_raw };
}

// ═══════════════════ KATKI ═══════════════════
function mapKatki(raw) {
  const set = new Set();
  if (raw.data && Array.isArray(raw.data.katki)) raw.data.katki.forEach(k => set.add(k));
  const style = (raw.data?.style || raw.style_label || '').toLowerCase();
  const name = (raw.data?.name || '').toLowerCase();
  const combined = style + ' ' + name;
  if (/laktoz|lactose|milk\s*stout|sweet\s*stout|cream\s*stout/i.test(combined)) set.add('laktoz');
  if (/coffee|kahve|espresso|mocha/i.test(combined)) set.add('coffee');
  if (/gose/i.test(combined)) { set.add('tuz'); set.add('koriander'); }
  if (/witbier|white\s*ale|blanche|wit\b/i.test(combined)) { set.add('koriander'); set.add('portakal'); }
  if (/pumpkin|balkabak/i.test(combined)) set.add('pumpkin');
  if (/chocolate\s*beer|chocolat\s*stout|kakao.*?bira/i.test(combined) && !/malt/i.test(combined)) set.add('cikolata');
  // Bacteria / spice from raw recipe structure
  if (raw.data && raw.data.spices) raw.data.spices.forEach(s => {
    const ln = (s.name||'').toLowerCase();
    if (/coriander|koriander/i.test(ln)) set.add('koriander');
    if (/orange|portakal|curaçao|curacao/i.test(ln)) set.add('portakal');
    if (/salt|tuz/i.test(ln)) set.add('tuz');
  });
  if (raw.data && raw.data.additional_ingredients) raw.data.additional_ingredients.forEach(s => {
    const ln = (s.name||'').toLowerCase();
    if (/coriander|koriander/i.test(ln)) set.add('koriander');
    if (/salt|tuz|kosher/i.test(ln)) set.add('tuz');
    if (/lactobacillus|plantarum/i.test(ln)) set.add('lacto_plantarum');
  });
  if (raw.data && raw.data.bacteria) {
    const ln = (raw.data.bacteria.name||'').toLowerCase();
    if (/lactobacillus|plantarum|pedio/i.test(ln)) set.add('lacto_plantarum');
  }
  return Array.from(set);
}

// ═══════════════════ FULL CONVERTER ═══════════════════
function convertRawToEngineRecipe(raw) {
  const d = raw.data;
  const malts = mapMalts(d.malts || []);
  const yeast = mapYeast(d.yeast);
  const katkiIds = mapKatki(raw);
  const maltIds = (d.malts||[]).map(m=>m.name).filter(Boolean);
  const hopIds = mapHops(d.hops);
  // Lactose recipe flag (sour_stout exclusion marker)
  const lactose = katkiIds.includes('laktoz');
  return {
    _og: d.OG, _fg: d.FG, _ibu: d.IBU, _srm: d.SRM, _abv: d.ABV,
    _mayaTip: yeast._mayaTip, mayaId: yeast.mayaId, maya2Id:'', _yeast_raw: yeast._yeast_raw || '',
    _recipeName: d.name || '',
    hopIds, maltIds, katkiIds,
    percents: malts,
    lactose, filtered:false, aged:false, dhPer10L:0, blended:false,
  };
}

// ═══════════════════ BENCHMARK ═══════════════════
function runBenchmark() {
  const results = [];
  let top1 = 0, top3 = 0;
  for (const raw of RAW_RECIPES) {
    const recipe = convertRawToEngineRecipe(raw);
    const matches = findBestMatches(recipe, 5);
    const got1 = matches[0]?.slug || '(yok)';
    const top3Slugs = matches.slice(0, 3).map(m => m.slug);
    const is1 = got1 === raw.expected_slug;
    const is3 = top3Slugs.includes(raw.expected_slug);
    if (is1) top1++;
    if (is3) top3++;
    results.push({ name: raw.data.name, expected: raw.expected_slug, got1, top3Slugs,
      is1, is3, score: matches[0]?.score, norm: matches[0]?.normalized,
      tier: raw.tier, source: raw.source, style_label: raw.style_label });
  }
  return { results, top1, top3, total: RAW_RECIPES.length };
}

function printReport(b) {
  const pad = (s,n) => String(s).padEnd(n).slice(0,n);
  console.log('\n' + '═'.repeat(130));
  console.log('GROUND TRUTH BENCHMARK — ' + b.total + ' reçete (v2 converter)');
  console.log('═'.repeat(130));
  b.results.forEach((r,i) => {
    const m1 = r.is1 ? '✓' : '✗', m3 = r.is3 ? '✓' : '✗';
    console.log(pad(i+1,4)+pad(r.source,12)+pad((r.style_label||'').slice(0,26),28)+pad(r.expected,28)+pad(r.got1,28)+m1.padEnd(4)+m3.padEnd(4)+r.score);
  });
  console.log('─'.repeat(130));
  console.log('ÖZET: Top-1 '+b.top1+'/'+b.total+' (%'+Math.round(b.top1/b.total*100)+'), Top-3 '+b.top3+'/'+b.total+' (%'+Math.round(b.top3/b.total*100)+')');
  const fails = b.results.filter(r=>!r.is1);
  if (fails.length) {
    console.log('\nFails ('+fails.length+'):');
    fails.forEach(f=>console.log('  · '+f.name+' | exp='+f.expected+' | got='+f.got1+(f.is3?' (t3 OK)':' (t3 miss)')));
  }
  // Confusion count
  const conf = {};
  fails.forEach(f=>{ const k=f.expected+' → '+f.got1; conf[k]=(conf[k]||0)+1; });
  const sortedConf = Object.entries(conf).sort((a,b)=>b[1]-a[1]);
  if (sortedConf.length) {
    console.log('\nConfusion pairs (top):');
    sortedConf.slice(0,15).forEach(([k,n])=>console.log('  '+n+'× '+k));
  }
}

if (require.main === module) {
  const b = runBenchmark();
  printReport(b);
}
module.exports = { convertRawToEngineRecipe, runBenchmark, printReport };
