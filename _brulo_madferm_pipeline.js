// Brulosophy + Mad Fermentationist bulk fetch + parse → V11 candidates
// Free-form blog regex extractor, V8.5 buildFeatures uyumlu
const https = require('https');
const fs = require('fs');

// ==== Config ====
const RATE_MS = 1000;
const BRULO_LISTING = './_brulo_slugs.json';
const BRULO_BLOG = './_brulo_all_blog_urls.json';
const BRULO_SAMPLE_LIMIT = 350;  // sample subset of 1678 blog posts
const MADFERM_URLS = './_madferm_post_urls.json';
const MADFERM_FETCH_LIMIT = 850;  // full

// ==== Style → BJCP slug mapping (English-spec for these blogs) ====
function styleToSlug(s) {
  const x = (s || '').toLowerCase().trim();
  if (!x) return null;
  // Belgian Strong/Trappist
  if (/dubbel|dubble/.test(x)) return ['belgian_dubbel', 'Belgian Strong / Trappist'];
  if (/tripel|trippel/.test(x)) return ['belgian_tripel', 'Belgian Strong / Trappist'];
  if (/quadrupel|quad\b/.test(x)) return ['belgian_quadrupel', 'Belgian Strong / Trappist'];
  if (/strong dark|bsda/.test(x)) return ['belgian_strong_dark_ale', 'Belgian Strong / Trappist'];
  if (/golden strong|strong golden/.test(x)) return ['belgian_strong_golden', 'Belgian Strong / Trappist'];
  if (/blonde|abbey blond/.test(x)) return ['belgian_blonde_ale', 'Belgian Pale / Witbier'];
  if (/witbier|wit\b|belgian white/.test(x)) return ['belgian_witbier', 'Belgian Pale / Witbier'];
  if (/saison|farmhouse/.test(x)) return ['french_belgian_saison', 'Saison / Farmhouse'];
  if (/biere de garde|bière de garde/.test(x)) return ['french_biere_de_garde', 'Saison / Farmhouse'];
  if (/sahti/.test(x)) return ['finnish_sahti', 'Saison / Farmhouse'];
  // Sour/Wild
  if (/lambic|gueuze/.test(x)) return ['belgian_lambic', 'Sour / Wild / Brett'];
  if (/flanders red|flemish red/.test(x)) return ['flanders_red_ale', 'Sour / Wild / Brett'];
  if (/oud bruin|flanders brown/.test(x)) return ['oud_bruin', 'Sour / Wild / Brett'];
  if (/berliner weiss/.test(x)) return ['berliner_weisse', 'Sour / Wild / Brett'];
  if (/^gose|^gosé/.test(x)) return ['gose', 'Sour / Wild / Brett'];
  if (/wild ale|brett beer/.test(x)) return ['american_wild_ale', 'Sour / Wild / Brett'];
  if (/sour|kettle sour|fast sour/.test(x)) return ['american_wild_ale', 'Sour / Wild / Brett'];
  // Stout / Porter
  if (/imperial stout|russian imperial/.test(x)) return ['american_imperial_stout', 'Stout / Porter'];
  if (/oatmeal stout/.test(x)) return ['oatmeal_stout', 'Stout / Porter'];
  if (/sweet stout|milk stout|cream stout/.test(x)) return ['sweet_stout', 'Stout / Porter'];
  if (/(dry|irish) stout/.test(x)) return ['irish_dry_stout', 'Stout / Porter'];
  if (/foreign extra|export stout/.test(x)) return ['export_stout', 'Stout / Porter'];
  if (/tropical stout/.test(x)) return ['tropical_stout', 'Stout / Porter'];
  if (/^stout|american stout|breakfast stout/.test(x)) return ['stout', 'Stout / Porter'];
  if (/baltic porter/.test(x)) return ['baltic_porter', 'German Lager'];
  if (/smoke porter|smoked porter|rauchporter/.test(x)) return ['smoke_porter', 'Stout / Porter'];
  if (/robust porter/.test(x)) return ['robust_porter', 'Stout / Porter'];
  if (/brown porter/.test(x)) return ['brown_porter', 'Stout / Porter'];
  if (/^porter/.test(x)) return ['porter', 'Stout / Porter'];
  // British Strong/Old
  if (/scotch ale|wee heavy/.test(x)) return ['scotch_ale_or_wee_heavy', 'British Strong / Old'];
  if (/scottish (export|heavy|light)/.test(x)) return ['scottish_export', 'British Strong / Old'];
  if (/strong scotch/.test(x)) return ['strong_scotch_ale', 'British Strong / Old'];
  if (/old ale/.test(x)) return ['old_ale', 'British Strong / Old'];
  if (/english barley|british barley/.test(x)) return ['british_barley_wine_ale', 'British Strong / Old'];
  if (/american barley|us barley/.test(x)) return ['american_barleywine', 'American Hoppy'];
  if (/^barley ?wine|barleywine/.test(x)) return ['british_barley_wine_ale', 'British Strong / Old'];
  if (/strong ale/.test(x)) return ['strong_ale', 'British Strong / Old'];
  if (/eisbock/.test(x)) return ['eisbock', 'British Strong / Old'];
  // British Bitter / Mild
  if (/extra special|esb/.test(x)) return ['extra_special_bitter', 'British Bitter / Mild'];
  if (/best bitter|special bitter/.test(x)) return ['special_bitter_or_best_bitter', 'British Bitter / Mild'];
  if (/strong bitter/.test(x)) return ['strong_bitter', 'British Bitter / Mild'];
  if (/ordinary bitter/.test(x)) return ['ordinary_bitter', 'British Bitter / Mild'];
  if (/^bitter\b/.test(x)) return ['special_bitter_or_best_bitter', 'British Bitter / Mild'];
  if (/(dark )?mild/.test(x)) return ['mild', 'British Bitter / Mild'];
  // Brown / Red
  if (/(american )?brown ale|northern english brown/.test(x)) return ['brown_ale', 'Irish / Red Ale'];
  if (/british brown|english brown/.test(x)) return ['brown_ale', 'Irish / Red Ale'];
  if (/irish red/.test(x)) return ['irish_red_ale', 'Irish / Red Ale'];
  if (/american amber|amber ale|red ale/.test(x)) return ['american_amber_red_ale', 'Irish / Red Ale'];
  // German Lager
  if (/german pils|deutsches pilsner|^pils\b/.test(x)) return ['german_pilsener', 'German Lager'];
  if (/bohemian pils|czech pils/.test(x)) return ['pale_lager', 'German Lager'];
  if (/munich helles|^helles\b/.test(x)) return ['munich_helles', 'German Lager'];
  if (/munich dunkel/.test(x)) return ['munich_dunkel', 'German Lager'];
  if (/dortmunder/.test(x)) return ['dortmunder_european_export', 'German Lager'];
  if (/märzen|marzen|oktoberfest/.test(x)) return ['german_maerzen', 'German Lager'];
  if (/festbier/.test(x)) return ['festbier', 'German Lager'];
  if (/schwarzbier/.test(x)) return ['german_schwarzbier', 'German Lager'];
  if (/(traditional )?bock\b/.test(x)) return ['dunkles_bock', 'German Lager'];
  if (/maibock|helles bock/.test(x)) return ['german_heller_bock_maibock', 'German Lager'];
  if (/doppelbock/.test(x)) return ['german_doppelbock', 'German Lager'];
  if (/kellerbier|zwickel/.test(x)) return ['kellerbier', 'German Lager'];
  if (/rauchbier/.test(x)) return ['bamberg_maerzen_rauchbier', 'German Lager'];
  if (/vienna lager/.test(x)) return ['vienna_lager', 'German Lager'];
  // German Wheat
  if (/dunkelweizen|dunkel weizen|dunkles weizen/.test(x)) return ['south_german_dunkel_weizen', 'German Wheat'];
  if (/weizenbock/.test(x)) return ['weizenbock', 'German Wheat'];
  if (/hefe ?weizen|weiss ?bier|weizenbier/.test(x)) return ['south_german_hefeweizen', 'German Wheat'];
  if (/roggen|rye ale.*german/.test(x)) return ['german_rye_ale', 'German Wheat'];
  // Hybrid
  if (/koelsch|kölsch|kolsch/.test(x)) return ['german_koelsch', 'Hybrid Ale-Lager'];
  if (/altbier/.test(x)) return ['german_altbier', 'Hybrid Ale-Lager'];
  if (/california common|steam beer/.test(x)) return ['common_beer', 'Hybrid Ale-Lager'];
  if (/cream ale/.test(x)) return ['cream_ale', 'Hybrid Ale-Lager'];
  if (/(american|us|premium) lager/.test(x)) return ['american_lager', 'Hybrid Ale-Lager'];
  // American Hoppy — SKIP per user CAP
  if (/(american )?ipa|black ipa|new england|neipa|hazy|brut ipa|white ipa|rye ipa|west coast/.test(x)) return null; // SKIP CAP
  if (/(american|us) pale ale|^apa\b|pale ale/.test(x) && !/belgian/.test(x)) return null; // SKIP CAP IPA family
  if (/double ipa|imperial ipa|dipa|triple ipa/.test(x)) return null; // SKIP
  // Other
  if (/(american )?wheat (beer|ale)|us wheat/.test(x)) return ['american_wheat_ale', 'American Hoppy'];
  if (/blonde ale/.test(x) && !/belgian/.test(x)) return ['blonde_ale', 'American Hoppy'];
  // Specialty
  if (/fruit beer|fruited|fruit lambic/.test(x)) return ['fruit_beer', 'Specialty / Adjunct'];
  if (/smoked beer|rauch/.test(x) && !/porter/.test(x)) return ['smoked_beer', 'Specialty / Adjunct'];
  if (/spice|herb|kräuter|gewürz/.test(x)) return ['herb_and_spice_beer', 'Specialty / Adjunct'];
  if (/pumpkin/.test(x)) return ['pumpkin_squash_beer', 'Specialty / Adjunct'];
  if (/coffee beer|coffee porter|coffee stout/.test(x)) return ['coffee_beer', 'Specialty / Adjunct'];
  if (/chocolate (beer|porter|stout)|cocoa/.test(x)) return ['chocolate_or_cocoa_beer', 'Specialty / Adjunct'];
  if (/honey beer/.test(x)) return ['specialty_honey_beer', 'Specialty / Adjunct'];
  if (/specialty|experimental/.test(x)) return ['specialty_beer', 'Specialty / Adjunct'];
  if (/winter|christmas|holiday/.test(x)) return ['winter_seasonal_beer', 'Specialty / Adjunct'];
  if (/historical|gose-lichten|grodzisk|piwo|sahti|adambier/.test(x)) return ['piwo_grodziskie', 'Historical / Special'];
  return null;
}

// V8.5 buildFeatures equivalent (Adım 41 normalize port for English text)
function classifyMaltEN(name) {
  const n = (name || '').toLowerCase();
  if (!n) return 'other';
  if (/(roasted barley|black malt|black patent|kilned black)/.test(n)) return 'roast';
  if (/chocolate|carafa|de-?bittered black|dark chocolate|pale chocolate/.test(n)) return 'choc';
  if (/cara(mel|mun|red|amber|hell|aroma|pils|special|wheat|stan|crystal|gold|brown|fa|vienne|hill)|crystal|caravienne|caramunich/.test(n)) return 'crystal';
  if (/honey malt|aromatic|melanoidin|special.?b|biscuit|victory|amber malt|amber\b|brown malt/.test(n)) return 'aromatic_abbey';
  if (/acid(ulated)?|sour malt/.test(n)) return 'aromatic_abbey';
  if (/rauch|smoked|peat|cherry wood|alder/.test(n)) return 'smoked';
  if (/sugar|candi|candy|invert|dextrose|maltodextrin|brown sugar|cane(?!.?wax)|jaggery|treacle|molasses|syrup|piloncillo|turbinado|demerara|honey\b|maltose|extract|dme|lme/.test(n)) return 'sugar';
  if (/^corn|maize|flaked corn|grits|cornmeal|polenta/.test(n)) return 'corn';
  if (/^rice|flaked rice|puffed rice/.test(n)) return 'rice';
  if (/wheat|weizen|weiss|white wheat|red wheat|torrified wheat|raw wheat|flaked wheat/.test(n) && !/buckwheat/.test(n)) return 'wheat';
  if (/\brye\b|flaked rye/.test(n)) return 'rye';
  if (/\boat|flaked oat|rolled oat|oatmeal/.test(n)) return 'oats';
  if (/munich/.test(n)) return 'munich';
  if (/vienna/.test(n)) return 'vienna';
  if (/pilsner|pilsen|bohemian|lager malt|^pils\b/.test(n)) return 'pilsner';
  if (/6-?row|sixrow/.test(n)) return 'sixrow';
  if (/maris.?otter|golden.?promise|optic|halcyon|pearl|^pale\b|2-?row|two.?row|ale malt|english 2|american 2|pale malt/.test(n)) return 'pale_ale';
  if (/raw barley|flaked barley|torrified barley|unmalted/.test(n)) return 'pale_ale';
  return 'other';
}

const HOP_SIG = {
  american_c: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el dorado|summit|equinox|ekuanot|azacca|vic secret|calypso|loral|strata|talus|cashmere|hopshot|williamette|willamette)/i,
  english: /(ekg|east kent|fuggles?|challenger|goldings?|admiral|bramling|first gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british hop|styrian)/i,
  german: /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|magnum)/i,
  czech_saaz: /(saaz|premiant|sladek|kazbek|zatec)/i,
  nz: /(nelson|motueka|riwaka|waimea|wakatu|pacific|rakau|sauvin|kohatu)/i,
  aged: /(aged hop)/i,
  northern_brewer: /(northern brewer|cluster|mount hood)/i
};

const KATKI_SIG = {
  fruit: /fruit|mango|passion|peach|strawberry|raspberry|cherry|apple|pear|grape|orange|lemon|lime|cranberry|pomegranate|blueberry|berry|blackberry|apricot|fig/i,
  spice_herb: /coriander|ginger|cinnamon|nutmeg|clove|herbs|rosemary|mint|lavender|hibiscus|elderflower|jasmine|matcha|juniper|spice|sage/i,
  chocolate: /chocolate|cacao|cocoa|nibs/i,
  coffee: /coffee|espresso|mocha/i,
  chile: /chile|chili|jalape|habane|pepper|hot sauce/i,
  smoke: /smoke|smoked|rauch/i,
  honey: /honey|honig/i,
  pumpkin: /pumpkin|squash/i,
  salt: /sea salt|kosher salt/i,
  lactose: /lactose|milk sugar/i
};

function buildFeaturesFromExtraction(ext) {
  const yeastLower = (ext.yeast || '').toLowerCase();
  const yf = {
    yeast_belgian: /belgian|bel\b|trappist|abbey|abbaye|tripel|dubbel|saison|wlp5\d{2}|wy37|wy3787/i.test(yeastLower) ? 1 : 0,
    yeast_abbey: /abbaye|abbey|trappist|tripel|dubbel|monastic|westmalle|chimay|wlp500|wlp530|wlp540|wy1762|wy3787/i.test(yeastLower) ? 1 : 0,
    yeast_saison: /saison|farmhouse|dupont|wy3711|wy3724|wlp565|wlp585|wlp670|be134|belle.?saison/i.test(yeastLower) ? 1 : 0,
    yeast_kveik: /kveik|voss|hothead|hornindal/i.test(yeastLower) ? 1 : 0,
    yeast_english: /(wlp00[2345]|wlp013|wlp017|wy1098|wy1187|wy1318|wy1335|wy1469|s-04|safale.?s.?04|west.?yorkshire|london|esb|english|nottingham)/i.test(yeastLower) ? 1 : 0,
    yeast_american: /(us-?05|us05|wlp001|wy1056|chico|california.?ale|american.?ale|safale.?us|bry-?97)/i.test(yeastLower) ? 1 : 0,
    yeast_german_lager: /(34\/?70|w-?34|w-?34\/70|wy2007|wy2206|wy2308|wlp830|wlp833|wlp840|german.?lager|saflager|s-23)/i.test(yeastLower) ? 1 : 0,
    yeast_czech_lager: /(wy2278|wlp802|czech|premiant)/i.test(yeastLower) ? 1 : 0,
    yeast_american_lager: /(s-23|wlp840|wy2035|american.?lager)/i.test(yeastLower) ? 1 : 0,
    yeast_kolsch: /(wlp029|wy2565|kölsch|kolsch)/i.test(yeastLower) ? 1 : 0,
    yeast_altbier: /(wy1007|altbier|wlp036)/i.test(yeastLower) ? 1 : 0,
    yeast_cal_common: /(california.?common|wlp810|wy2112|steam.?beer)/i.test(yeastLower) ? 1 : 0,
    yeast_brett: /brett|brettanomyces|wy5112|wlp650|wlp653|3.?fonteinen/i.test(yeastLower) ? 1 : 0,
    yeast_lacto: /lactobacillus|lacto|wlp677|wlp672|wy5335/i.test(yeastLower) ? 1 : 0,
    yeast_sour_blend: /roeselare|sour.?blend|funk|de.?bom|cantillon/i.test(yeastLower) ? 1 : 0,
    yeast_witbier: /(wit\b|witbier|hoegaarden|wlp400|wy3463|wy3944)/i.test(yeastLower) ? 1 : 0,
    yeast_wheat_german: /(weizen|hefeweizen|w-?06|wb-?06|wy3068|wy3056|wlp300|wlp380|munich.?classic|bavarian.?wheat|weihenstephan)/i.test(yeastLower) ? 1 : 0,
    yeast_wit: /(wit\b|witbier|wlp400|wy3463)/i.test(yeastLower) ? 1 : 0
  };
  const hopStr = (ext.hops || []).map(h => (h || '').toLowerCase()).join('|');
  const hopFeats = {};
  for (const k of Object.keys(HOP_SIG)) hopFeats['hop_' + k] = HOP_SIG[k].test(hopStr) ? 1 : 0;

  const buckets = { pilsner:0, pale_ale:0, munich:0, vienna:0, wheat:0, oats:0, rye:0, crystal:0, choc:0, roast:0, smoked:0, corn:0, rice:0, sugar:0, aromatic_abbey:0, sixrow:0, other:0 };
  let totalKg = 0;
  for (const m of (ext.malts || [])) {
    const cat = classifyMaltEN(m.name);
    const kg = m.amount_kg || 0;
    buckets[cat] += kg;
    totalKg += kg;
  }
  const pct = {};
  if (totalKg > 0) {
    for (const k of Object.keys(buckets)) pct['pct_' + k] = +(buckets[k] / totalKg * 100).toFixed(2);
  } else {
    for (const k of Object.keys(buckets)) pct['pct_' + k] = 0;
  }
  const total_base = +((pct.pct_pilsner||0)+(pct.pct_pale_ale||0)+(pct.pct_munich||0)+(pct.pct_vienna||0)+(pct.pct_wheat||0)).toFixed(2);

  const allText = (ext.malts || []).map(m=>m.name||'').join('|').toLowerCase() + '|' + hopStr + '|' + yeastLower;
  const kf = {};
  for (const k of Object.keys(KATKI_SIG)) kf['katki_' + k] = KATKI_SIG[k].test(allText) ? 1 : 0;

  const lager = (yf.yeast_german_lager || yf.yeast_czech_lager || yf.yeast_american_lager) ? 1 : 0;
  const fermTemp = lager ? 12 : 19;
  const dryHopFlag = (ext.hops || []).some(h => /dry hop/i.test(h)) ? 5 : 0;

  return {
    og: ext.og || 0, fg: ext.fg || 0, abv: ext.abv || 0, ibu: ext.ibu || 0, srm: ext.srm || 0,
    ...pct, total_base, ...yf, ...hopFeats, ...kf,
    mash_temp_c: ext.mash_temp_c || 66,
    fermentation_temp_c: fermTemp,
    yeast_attenuation: 78, boil_time_min: ext.boil_time_min || 60,
    water_ca_ppm: 150, water_so4_ppm: 250, water_cl_ppm: 120,
    dry_hop_days: dryHopFlag,
    mash_type_step: 0, mash_type_decoction: 0,
    lagering_days: lager ? 14 : 0
  };
}

// === Blog post regex extractor (works for both Brulosophy and Mad Ferm) ===
function extractFromBlogHtml(html, source) {
  // Strip HTML tags for plaintext working version
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');

  // Title
  const title = (text.match(/<title>([^<|]+)/) || ['', ''])[1].replace(/&[a-z]+;/g, ' ').trim();

  // Style
  let style = '';
  const styleMatches = [
    text.match(/Style:?\s*<[^>]+>([^<]{3,80})/i),
    text.match(/<strong>Style:?<\/strong>[^<]*([A-Z][^<]{3,80})/i),
    text.match(/<b>Style:?<\/b>[^<]*([A-Z][^<]{3,80})/i),
    text.match(/Style[:\s]*([A-Z][a-zA-Z ]{3,40})\b/),
  ];
  for (const m of styleMatches) { if (m && m[1]) { style = m[1].replace(/<[^>]+>/g,'').trim(); break; } }

  // Scalar regex
  function num(re) {
    const m = text.match(re);
    return m ? parseFloat(m[1]) : null;
  }
  const og = num(/OG[:\s]*[<\/a-z>]*\s*([0-9]\.0[0-9][0-9]+)/i);
  const fg = num(/FG[:\s]*[<\/a-z>]*\s*([0-9]\.0[0-9][0-9]+)/i);
  const ibu = num(/IBU[:\s]*[<\/a-z>]*\s*([0-9]+(?:\.[0-9]+)?)/i);
  const srm = num(/SRM[:\s]*[<\/a-z>]*\s*([0-9]+(?:\.[0-9]+)?)/i);
  const abv = num(/ABV[:\s]*[<\/a-z>]*\s*([0-9]+(?:\.[0-9]+)?)/i);

  // Yeast pattern (Wyeast XXXX, WLP XXX)
  const yeastMatches = text.match(/(Wyeast\s*[0-9]+[^,<\n]{0,40}|WLP\s*[0-9]+[^,<\n]{0,40}|White\s*Labs\s*WLP[0-9]+[^,<\n]{0,40}|Safale\s*[A-Z]?-?[0-9]+|Fermentis\s*[A-Z]+-?[0-9]+|Lallemand\s*[a-zA-Z\s]+|Imperial\s*[A-Z][0-9]+[^,<\n]{0,40}|Omega\s*[a-zA-Z]+[^,<\n]{0,40}|Belle\s*Saison)/i);
  const yeast = yeastMatches ? yeastMatches[0].replace(/<[^>]+>/g,'').trim() : '';

  // Hop names (regex looking for known hop names)
  const hopRegex = /\b(Cascade|Centennial|Citra|Mosaic|Chinook|Amarillo|Simcoe|Columbus|CTZ|Zeus|Warrior|Galaxy|Sabro|El\s*Dorado|Summit|Equinox|Ekuanot|Azacca|Vic\s*Secret|Calypso|Loral|Strata|Talus|Cashmere|Willamette|EKG|East\s*Kent|Fuggles?|Challenger|Goldings?|Admiral|Bramling|First\s*Gold|Target|Pilgrim|Progress|Northdown|Phoenix|Jester|Olicana|Boadicea|Styrian|Hallertau|Tettnang|Perle|Herkules|Hersbrucker|Spalt|Tradition|Saphir|Smaragd|Magnum|Polaris|Saaz|Premiant|Sladek|Kazbek|Zatec|Nelson|Motueka|Riwaka|Waimea|Wakatu|Pacific\s*\w+|Rakau|Sauvin|Kohatu|Northern\s*Brewer|Cluster|Mount\s*Hood)\b/gi;
  const hops = [];
  let hm;
  while ((hm = hopRegex.exec(text))) {
    if (hops.indexOf(hm[1]) < 0) hops.push(hm[1]);
  }

  // Malt names — broad pattern, use grain bill section if findable
  const malts = [];
  // Try: "8 lb Maris Otter" or "8.5 lbs Pilsner" or "3.5 kg Pale Ale"
  const maltRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(lbs?|kg|oz|grams?|g)\b\s*([A-Z][\w\s\-]{2,50}?)(?:\s*\(|<|,|\s*-|\s*\d|\s*$|\s*for|\s*at|\s*to)/g;
  let mm;
  let count = 0;
  while ((mm = maltRegex.exec(text)) && count < 30) {
    let amount = parseFloat(mm[1]);
    let unit = mm[2].toLowerCase();
    let name = mm[3].trim();
    if (!name || name.length < 3) continue;
    let kg = 0;
    if (/lbs?/.test(unit)) kg = amount * 0.453592;
    else if (unit === 'oz') kg = amount * 0.0283495;
    else if (unit === 'kg') kg = amount;
    else if (/grams?|g/.test(unit)) kg = amount / 1000;
    if (!isFinite(kg) || kg <= 0 || kg > 50) continue;
    // Quick sanity: name should be malt-like (skip "min" "minutes" "for" etc.)
    if (/^(min|minute|for|at|of|each|the|a |an )/i.test(name)) continue;
    malts.push({ name, amount_kg: kg });
    count++;
  }

  return { title, style, og, fg, abv, ibu, srm, yeast, hops, malts };
}

function fetchOne(host, path) {
  return new Promise(resolve => {
    https.request({
      hostname: host, path, method: 'GET',
      headers: { 'User-Agent': 'Brewmaster Audit Bot (research)' }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', e => resolve({ status: 0, err: e.message })).end();
  });
}

// === Main ===
(async () => {
  const allRecords = [];
  const errs = { not_all_grain:0, no_grain:0, no_slug:0, bad_og:0, bad_fg:0, bad_srm:0, no_recipe_data:0 };

  // ===== BRULOSOPHY =====
  console.log('=== BRULOSOPHY ===');
  const brulo_listing = JSON.parse(fs.readFileSync(BRULO_LISTING, 'utf8'));
  const brulo_blog = JSON.parse(fs.readFileSync(BRULO_BLOG, 'utf8'));
  const brulo_dated = brulo_blog.filter(u => /\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}\//.test(u));
  // Sample subset
  const brulo_sample = brulo_dated.slice(0, BRULO_SAMPLE_LIMIT);
  // Also include /recipes/ slugs explicitly
  const brulo_slugs_uri = brulo_listing.filter(s => s !== 'feed' && s !== 'patreon-recipes').map(s => `https://brulosophy.com/recipes/${s}/`);
  const brulo_targets = [...new Set([...brulo_slugs_uri, ...brulo_sample])];
  console.log('Brulosophy targets:', brulo_targets.length);

  let brulo_ok = 0, brulo_skip = 0;
  for (let i = 0; i < brulo_targets.length; i++) {
    const url = brulo_targets[i];
    const path = url.replace('https://brulosophy.com', '');
    const r = await fetchOne('brulosophy.com', path);
    if (r.status !== 200 || !r.body) { brulo_skip++; continue; }
    const ext = extractFromBlogHtml(r.body, 'brulosophy');
    if (!ext.style || !ext.og || ext.malts.length === 0) { errs.no_recipe_data++; continue; }
    if (ext.og < 1.020 || ext.og > 1.150) { errs.bad_og++; continue; }
    if (ext.fg && (ext.fg >= ext.og || ext.fg < 0.990 || ext.fg > 1.060)) { errs.bad_fg++; continue; }
    if (ext.srm && ext.srm > 80) { errs.bad_srm++; continue; }
    const sm = styleToSlug(ext.style);
    if (!sm) { errs.no_slug++; continue; }
    const features = buildFeaturesFromExtraction(ext);
    allRecords.push({
      id: 'brulosophy_' + (path.split('/').filter(Boolean).pop()),
      source: 'brulosophy', source_id: path, name: ext.title,
      bjcp_slug: sm[0], bjcp_main_category: sm[1], sorte_raw: ext.style,
      raw: { malts: ext.malts, hops: ext.hops, yeast: ext.yeast, og: ext.og, fg: ext.fg, abv: ext.abv, ibu: ext.ibu, srm: ext.srm },
      features, in_split: null
    });
    brulo_ok++;
    if ((i+1) % 50 === 0) console.log(`  [${i+1}/${brulo_targets.length}] ok=${brulo_ok} skip=${brulo_skip}`);
    await new Promise(rs => setTimeout(rs, RATE_MS));
  }
  console.log(`Brulosophy done: ok=${brulo_ok}, skip=${brulo_skip}`);

  // ===== MAD FERMENTATIONIST =====
  console.log('\n=== MAD FERMENTATIONIST ===');
  const madferm_urls = JSON.parse(fs.readFileSync(MADFERM_URLS, 'utf8')).slice(0, MADFERM_FETCH_LIMIT);
  console.log('Mad Ferm targets:', madferm_urls.length);
  let mf_ok = 0, mf_skip = 0;
  for (let i = 0; i < madferm_urls.length; i++) {
    const url = madferm_urls[i];
    const path = url.replace('https://www.themadfermentationist.com', '');
    const r = await fetchOne('www.themadfermentationist.com', path);
    if (r.status !== 200 || !r.body) { mf_skip++; continue; }
    const ext = extractFromBlogHtml(r.body, 'madferm');
    if (!ext.style || !ext.og || ext.malts.length === 0) { errs.no_recipe_data++; continue; }
    if (ext.og < 1.020 || ext.og > 1.150) { errs.bad_og++; continue; }
    if (ext.fg && (ext.fg >= ext.og || ext.fg < 0.990 || ext.fg > 1.060)) { errs.bad_fg++; continue; }
    if (ext.srm && ext.srm > 80) { errs.bad_srm++; continue; }
    const sm = styleToSlug(ext.style);
    if (!sm) { errs.no_slug++; continue; }
    const features = buildFeaturesFromExtraction(ext);
    allRecords.push({
      id: 'madferm_' + (path.split('/').filter(Boolean).slice(-1)[0]).replace('.html',''),
      source: 'madferm', source_id: path, name: ext.title,
      bjcp_slug: sm[0], bjcp_main_category: sm[1], sorte_raw: ext.style,
      raw: { malts: ext.malts, hops: ext.hops, yeast: ext.yeast, og: ext.og, fg: ext.fg, abv: ext.abv, ibu: ext.ibu, srm: ext.srm },
      features, in_split: null
    });
    mf_ok++;
    if ((i+1) % 100 === 0) console.log(`  [${i+1}/${madferm_urls.length}] ok=${mf_ok} skip=${mf_skip}`);
    await new Promise(rs => setTimeout(rs, RATE_MS));
  }
  console.log(`Mad Ferm done: ok=${mf_ok}, skip=${mf_skip}`);

  console.log('\n=== TOTAL ===');
  console.log('Records:', allRecords.length);
  console.log('Errors:', JSON.stringify(errs));
  const slugCnt = {};
  for (const r of allRecords) slugCnt[r.bjcp_slug] = (slugCnt[r.bjcp_slug]||0)+1;
  console.log('Per slug:');
  Object.entries(slugCnt).sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([k,v])=>console.log('  '+k.padEnd(40)+v));

  fs.writeFileSync('_v11_recipes_blogs.json', JSON.stringify({ _meta: { errors: errs, total: allRecords.length }, records: allRecords }, null, 2));
  console.log('\nWrote _v11_recipes_blogs.json (' + (JSON.stringify(allRecords).length / 1024).toFixed(0) + ' KB)');
})();
