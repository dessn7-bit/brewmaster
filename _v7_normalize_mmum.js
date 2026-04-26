// MMUM JSON → V7 schema normalize + DE classifyMalt + feature recompute + style mapping
// Reads _mmum_raw/recipe_*.json, outputs _v8_recipes_mmum.json
const fs = require('fs');
const path = require('path');

// === DE → EN classifyMalt mapping ===
// Pattern matched on lowercase malt name (German + English mixed)
function classifyMaltDE(name) {
  const n = (name || '').toLowerCase();
  if (!n) return 'other';
  // Pilsner / Pilsen
  if (/pilsner|pilsen|bohemian|bohem/.test(n)) return 'pilsner';
  // Pale Ale base
  if (/pale.?ale|pale.?malt|maris.?otter|golden.?promise/.test(n)) return 'pale_ale';
  // Munich / Münchner
  if (/^munich|^münchner|münchener|muenchner/.test(n)) return 'munich';
  // Vienna / Wiener
  if (/^vienna|^wien(er)?/.test(n)) return 'vienna';
  // Wheat / Weizen
  if (/(weizen|wheat|weiss)(?!.*roggen)/.test(n)) return 'wheat';
  // Rye / Roggen
  if (/roggen|\brye\b/.test(n)) return 'rye';
  // Oats / Hafer
  if (/hafer|\boat/.test(n)) return 'oats';
  // Crystal/Caramel/Karamell/Caramünch
  if (/karamell|caramel|cara(mun|ml|hell|red|amber|aroma|pils|special|wheat|rye|munich|gold|crystal)|crystal|karamel|cristal/.test(n)) return 'crystal';
  // Honey
  if (/honig|honey/.test(n)) return 'aromatic_abbey';
  // Aromatic / Special B / Melanoidin
  if (/aromatic|melanoidin|special.?b|biscuit|amber.?malt/.test(n)) return 'aromatic_abbey';
  // Chocolate / Carafa Special / Schokolade
  if (/(chocolate|schokolade|choc.?malt|carafa.?(spec|i|ii|iii)|röst.?(weiz|gerst|cara))/.test(n)) return 'choc';
  // Roasted barley / Schwarzmalz / Black patent
  if (/(schwarzmalz|röstmalz|röstgerste|roasted.?barley|black.?(malt|patent))/.test(n)) return 'roast';
  // Smoked / Rauch
  if (/rauch|smoked|smoke|peat|mesquite|cherry.?wood|alder/.test(n)) return 'smoked';
  // Sugar variants
  if (/zucker|sugar|candi|candy|invert|dextrose|saccharose|melasse|molasses|treacle|honig.?(syrup|sirup)/.test(n)) return 'sugar';
  // Corn / Mais
  if (/^mais|maize|^corn|maisflocken/.test(n)) return 'corn';
  // Rice / Reis
  if (/^reis|^rice/.test(n)) return 'rice';
  // 6-row
  if (/6.?row|sixrow|six.?row/.test(n)) return 'sixrow';
  // Acidulated / Säuermalz
  if (/säuermalz|saeuermalz|acidulated|sauer.?malz/.test(n)) return 'aromatic_abbey'; // close to aromatic
  // Smoked already handled
  return 'other';
}

// === MMUM Sorte → BJCP slug ===
// MMUM uses German style names + sometimes BJCP codes in parens
function sorteToBjcpSlug(sorte) {
  const s = (sorte || '').toLowerCase().trim();
  if (!s) return null;
  // Belgian
  if (/dubbel/.test(s)) return 'belgian_dubbel';
  if (/tripel|trippel/.test(s)) return 'belgian_tripel';
  if (/quadrupel|quad\b/.test(s)) return 'belgian_quadrupel';
  if (/belgisches?.?(dunkles?|starkes?.?dunkles?|strong.?dark)/.test(s)) return 'belgian_strong_dark_ale';
  if (/belgisches?.?(blondes?|blonde)/.test(s)) return 'belgian_blonde_ale';
  if (/witbier|weißbier.?belgisch|wit\b/.test(s)) return 'belgian_witbier';
  if (/saison/.test(s)) return 'french_belgian_saison';
  if (/biere.?de.?garde|bière.?de.?garde/.test(s)) return 'french_biere_de_garde';
  if (/lambic/.test(s)) return 'belgian_lambic';
  if (/gueuze/.test(s)) return 'gueuze';
  if (/oud.?bruin/.test(s)) return 'oud_bruin';
  if (/flanders.?red|flemish.?red/.test(s)) return 'flanders_red_ale';
  // German Lager
  if (/pilsner.?(deutsch|german)|deutsches?.?pilsner|pils\b/.test(s)) return 'german_pilsener';
  if (/münchner.?(hell|helles)|munich.?helles|^helles/.test(s)) return 'munich_helles';
  if (/münchner.?dunkel|munich.?dunkel|^dunkles?$/.test(s)) return 'munich_dunkel';
  if (/märzen|marzen|oktoberfest|festbier|wiesn/.test(s)) return 'german_maerzen';
  if (/schwarzbier|schwarz.?lager/.test(s)) return 'german_schwarzbier';
  if (/wiener.?lager|vienna.?lager/.test(s)) return 'vienna_lager';
  if (/dortmunder|export.?lager|dortmund/.test(s)) return 'dortmunder_european_export';
  if (/bock(?!.?ale)/.test(s) && /eis/.test(s)) return 'eisbock';
  if (/doppelbock|doppel.?bock/.test(s)) return 'german_doppelbock';
  if (/bock(?!.?ale)/.test(s) && /(maibock|hell)/.test(s)) return 'german_heller_bock_maibock';
  if (/bock\b/.test(s)) return 'german_doppelbock'; // generic bock fallback
  if (/altbier|^alt\b/.test(s)) return 'german_altbier';
  if (/kölsch|kolsch|koelsch/.test(s)) return 'german_koelsch';
  if (/kellerbier|zwickel|zoigl/.test(s)) return 'kellerbier';
  if (/rauchbier|rauch.?bier|rauch.?lager/.test(s)) return 'bamberg_maerzen_rauchbier';
  if (/rotbier|red.?lager|nürnberger.?rotbier|altfränkisches.?rotbier|franconian.?rotbier/.test(s)) return 'franconian_rotbier';
  if (/^pale.?lager/.test(s)) return 'pale_lager';
  if (/lager/.test(s)) return 'pale_lager';
  // German Wheat
  if (/hefeweizen|weiß.?bier|weissbier|^weizen|^weizenbier/.test(s)) return 'south_german_hefeweizen';
  if (/weizenbock/.test(s)) return 'weizenbock';
  if (/dunkelweizen|dunkles?.?weizen/.test(s)) return 'south_german_dunkel_weizen';
  if (/kristall|crystal.?weizen/.test(s)) return 'south_german_kristal_weizen';
  if (/roggenbier|rye.?ale.?(german|deutsch)/.test(s)) return 'german_rye_ale';
  // American
  if (/double.?ipa|imperial.?ipa|dipa/.test(s)) return 'double_ipa';
  if (/triple.?ipa|tipa/.test(s)) return 'triple_ipa';
  if (/black.?ipa|cascadian/.test(s)) return 'black_ipa';
  if (/session.?ipa/.test(s)) return 'session_india_pale_ale';
  if (/hazy.?ipa|juicy.?ipa|neipa|new.?england/.test(s)) return 'juicy_or_hazy_india_pale_ale';
  if (/brut.?ipa/.test(s)) return 'brut_ipa';
  if (/white.?ipa/.test(s)) return 'white_ipa';
  if (/rye.?ipa/.test(s)) return 'rye_ipa';
  if (/west.?coast.?ipa/.test(s)) return 'west_coast_india_pale_ale';
  if (/red.?ipa|imperial.?red/.test(s)) return 'imperial_red_ale';
  if (/india.?pale.?ale|amerikan.?ipa|american.?ipa|^ipa\b/.test(s)) return 'american_india_pale_ale';
  if (/amber.?ale|red.?ale/.test(s)) return 'american_amber_red_ale';
  if (/pale.?ale.?(amerikan|american)|american.?pale|^pale.?ale/.test(s)) return 'pale_ale';
  if (/blonde.?ale|^blonde/.test(s)) return 'blonde_ale';
  if (/cream.?ale/.test(s)) return 'cream_ale';
  if (/wheat.?ale.?(amerikan|american)|american.?wheat/.test(s)) return 'american_wheat_ale';
  if (/wheat.?wine/.test(s)) return 'american_wheat_wine_ale';
  // Stout / Porter
  if (/imperial.?stout|russian.?imperial/.test(s)) return 'american_imperial_stout';
  if (/oatmeal.?stout/.test(s)) return 'oatmeal_stout';
  if (/sweet.?stout|milk.?stout|cream.?stout/.test(s)) return 'sweet_stout';
  if (/(dry|trocken).?stout|irish.?stout/.test(s)) return 'irish_dry_stout';
  if (/dessert.?stout|pastry/.test(s)) return 'dessert_stout_or_pastry_beer';
  if (/coffee.?(stout|beer|porter)/.test(s)) return 'coffee_beer';
  if (/chocolate.?(stout|beer|porter)|kakao|schokoladen/.test(s)) return 'chocolate_or_cocoa_beer';
  if (/^stout/.test(s)) return 'stout';
  if (/baltic.?porter/.test(s)) return 'baltic_porter';
  if (/smoked?.?porter|rauch.?porter/.test(s)) return 'smoke_porter';
  if (/robust.?porter/.test(s)) return 'robust_porter';
  if (/brown.?porter/.test(s)) return 'brown_porter';
  if (/^porter/.test(s)) return 'porter';
  // British
  if (/scotch.?ale|wee.?heavy/.test(s)) return 'scotch_ale_or_wee_heavy';
  if (/scottish.?(export|heavy)/.test(s)) return 'scottish_export';
  if (/barleywine|barley.?wine|gerstewein/.test(s)) return /english/i.test(s)? 'british_barley_wine_ale' : 'american_barleywine';
  if (/old.?ale/.test(s)) return 'old_ale';
  if (/^mild|english.?mild/.test(s)) return 'mild';
  if (/esb|extra.?special.?bitter/.test(s)) return 'extra_special_bitter';
  if (/best.?bitter|special.?bitter/.test(s)) return 'special_bitter_or_best_bitter';
  if (/ordinary.?bitter|session.?bitter/.test(s)) return 'ordinary_bitter';
  if (/bitter\b/.test(s)) return 'special_bitter_or_best_bitter';
  if (/strong.?ale\b/.test(s)) return 'strong_ale';
  if (/brown.?ale|braunes?.?ale/.test(s)) return 'brown_ale';
  if (/irish.?red/.test(s)) return 'irish_red_ale';
  // Sour / Wild
  if (/berliner.?weiss|berliner.?weisse/.test(s)) return 'berliner_weisse';
  if (/^gose/.test(s)) return 'gose';
  if (/grätzer|grodziskie|piwo.?grodziskie/.test(s)) return 'piwo_grodziskie';
  if (/lichtenhainer/.test(s)) return 'lichtenhainer';
  if (/sahti/.test(s)) return 'finnish_sahti';
  if (/wild.?ale|brett(anomyces)?/.test(s)) return /belgian/i.test(s)? 'american_wild_ale' : 'brett_beer';
  if (/sour.?ale|kettle.?sour/.test(s)) return 'american_wild_ale';
  // Specialty
  if (/pumpkin|kürbis/.test(s)) return /spice/i.test(s)? 'pumpkin_spice_beer' : 'pumpkin_squash_beer';
  if (/fruit.?beer|frucht.?bier|fruchtbier/.test(s)) return 'fruit_beer';
  if (/honey.?beer|honig.?bier/.test(s)) return 'specialty_honey_beer';
  if (/chili.?(beer|bier)|jalapeño|pfeffer.?bier/.test(s)) return 'chili_pepper_beer';
  if (/winter.?(seasonal|ale)|christmas|weihnacht/.test(s)) return 'winter_seasonal_beer';
  if (/spice|gewürz|herb|kräuter/.test(s)) return 'herb_and_spice_beer';
  if (/california.?common|steam.?beer|dampfbier/.test(s)) return 'common_beer';
  if (/historical|historisch|adambier|gotlands|kuit/.test(s)) return 'specialty_historical';
  if (/experimental|experiment/.test(s)) return 'experimental_beer';
  return null; // unmapped
}

// === BJCP main category mapping (Adım 33 hierarchy) ===
const HIER = JSON.parse(fs.readFileSync('_audit_step_26d_style_hierarchy.json', 'utf8'));
const slugToMain = {};
Object.entries(HIER.categories).forEach(([cat, info]) => {
  info.slugs.forEach(s => { slugToMain[s.slug] = cat; });
});

// === Normalize one MMUM recipe ===
function normalize(raw, id) {
  const malts = raw.Malze || [];
  // Compute total grain kg
  let totalKg = 0;
  for (const m of malts) {
    const w = parseFloat(m.Menge || 0);
    const u = (m.Einheit || 'kg').toLowerCase();
    const kg = u === 'g' ? w / 1000 : w;
    totalKg += kg;
  }

  // 17-kategori pct buckets
  const buckets = { pilsner:0, pale_ale:0, munich:0, vienna:0, wheat:0, oats:0, rye:0, crystal:0, choc:0, roast:0, smoked:0, corn:0, rice:0, sugar:0, aromatic_abbey:0, sixrow:0, other:0 };
  const maltsOut = [];
  for (const m of malts) {
    const w = parseFloat(m.Menge || 0);
    const u = (m.Einheit || 'kg').toLowerCase();
    const kg = u === 'g' ? w / 1000 : w;
    const cat = classifyMaltDE(m.Name);
    buckets[cat] += kg;
    maltsOut.push({ name: m.Name, amount_kg: kg, cat });
  }
  const pct = {};
  for (const k of Object.keys(buckets)) pct['pct_' + k] = totalKg > 0 ? +(buckets[k] / totalKg * 100).toFixed(2) : 0;
  const total_base = +((pct.pct_pilsner||0)+(pct.pct_pale_ale||0)+(pct.pct_munich||0)+(pct.pct_vienna||0)+(pct.pct_wheat||0)).toFixed(2);

  // Hops
  const hops = (raw.Hopfenkochen || []).map(h => ({
    name: h.Sorte || h.Name || '?',
    amount_g: parseFloat(h.Menge || 0),
    alpha: parseFloat(h.Alpha || 0),
    time_min: parseInt(h.Zeit || 0),
    use: 'boil'
  }));
  // Dry hops (Stopfhopfen)
  for (const h of (raw.Stopfhopfen || [])) {
    hops.push({
      name: h.Sorte || h.Name || '?',
      amount_g: parseFloat(h.Menge || 0),
      use: 'dry_hop'
    });
  }

  // Yeast
  const yeast = raw.Hefe || '';
  const yLower = yeast.toLowerCase();

  // Yeast features (V6 port)
  const yf = {
    yeast_belgian: /belgian|bel\b|trappist|abbey|abbaye|tripel|dubbel|saison|wlp5\d{2}|wy37|wy3787/i.test(yLower) ? 1 : 0,
    yeast_abbey: /abbaye|abbey|trappist|tripel|dubbel|monastic|westmalle|chimay|wlp500|wlp530|wlp540|wy1762|wy3787/i.test(yLower) ? 1 : 0,
    yeast_saison: /saison|farmhouse|dupont|wy3711|wy3724|wlp565|wlp585|wlp670|be134|belle.?saison|farmhouse/i.test(yLower) ? 1 : 0,
    yeast_kveik: /kveik|voss|hothead|hornindal/i.test(yLower) ? 1 : 0,
    yeast_english: /(wlp00[2345]|wlp013|wlp017|wy1098|wy1187|wy1318|wy1335|wy1469|s-04|safale.?s.?04|west.?yorkshire|london|esb|english|nottingham)/i.test(yLower) ? 1 : 0,
    yeast_american: /(us-?05|us05|wlp001|wy1056|chico|california.?ale|american.?ale|safale.?us)/i.test(yLower) ? 1 : 0,
    yeast_german_lager: /(34\/?70|w-?34|w-?34\/70|wy2007|wy2206|wy2308|wlp830|wlp833|wlp840|german.?lager|saflager|s-23|saflager.?w)/i.test(yLower) ? 1 : 0,
    yeast_czech_lager: /(wy2278|wlp802|czech|premiant)/i.test(yLower) ? 1 : 0,
    yeast_american_lager: /(s-23|wlp840|wy2035|american.?lager)/i.test(yLower) ? 1 : 0,
    yeast_kolsch: /(wlp029|wy2565|kölsch|kolsch|gaffel)/i.test(yLower) ? 1 : 0,
    yeast_altbier: /(wy1007|altbier|wlp036)/i.test(yLower) ? 1 : 0,
    yeast_cal_common: /(california.?common|wlp810|wy2112|steam.?beer)/i.test(yLower) ? 1 : 0,
    yeast_brett: /brett|brettanomyces|wy5112|wlp650|wlp653|3.?fonteinen/i.test(yLower) ? 1 : 0,
    yeast_lacto: /lactobacillus|lacto|wlp677|wlp672|wy5335/i.test(yLower) ? 1 : 0,
    yeast_sour_blend: /roeselare|sour.?blend|funk|de.?bom|cantillon/i.test(yLower) ? 1 : 0,
    yeast_witbier: /(wit\b|witbier|hoegaarden|wlp400|wy3463|wy3944)/i.test(yLower) ? 1 : 0,
    yeast_wheat_german: /(weizen|hefe|w-?06|wb-?06|wy3068|wy3056|wlp300|wlp380|munich.?classic|bavarian.?wheat|safbrew.?wb)/i.test(yLower) ? 1 : 0,
    yeast_wit: /(wit\b|witbier|wlp400|wy3463)/i.test(yLower) ? 1 : 0
  };

  // Hop features
  const hopStr = hops.map(h => (h.name || '').toLowerCase()).join('|');
  const HOP_SIG = {
    american_c: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el.?dorado|summit|equinox|ekuanot|azacca|vic.?secret|calypso|loral|strata|talus|cashmere|hopshot)/i,
    english: /(ekg|east.?kent|fuggles?|challenger|goldings?|admiral|bramling|first.?gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british.?hop|styrian)/i,
    german: /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|mittelfr|magnum)/i,
    czech_saaz: /(saaz|premiant|sladek|kazbek|zatec)/i,
    nz: /(nelson|motueka|riwaka|waimea|wakatu|pacific|rakau|sauvin|kohatu)/i,
    aged: /(aged.?hop|alter.?hopfen)/i,
    northern_brewer: /(northern.?brewer|cluster|mount.?hood)/i
  };
  const hopFeats = {};
  for (const k of Object.keys(HOP_SIG)) hopFeats['hop_' + k] = HOP_SIG[k].test(hopStr) ? 1 : 0;
  hopFeats['hop_american_c'] = hopFeats['hop_american_c'] || 0;
  hopFeats['hop_german'] = hopFeats['hop_german'] || 0;
  hopFeats['hop_czech_saaz'] = hopFeats['hop_czech_saaz'] || 0;
  hopFeats['hop_nz'] = hopFeats['hop_nz'] || 0;
  hopFeats['hop_aged'] = hopFeats['hop_aged'] || 0;
  hopFeats['hop_northern_brewer'] = hopFeats['hop_northern_brewer'] || 0;
  hopFeats['hop_english'] = hopFeats['hop_english'] || 0;

  // Katki features (only lactose detectable from yeast/hop names)
  const allText = malts.map(m=>m.Name||'').join('|').toLowerCase() + '|' + hopStr;
  const KATKI_SIG = {
    fruit: /meyve|fruit|mango|passion|seftali|peach|strawberry|cilek|raspberry|cherry|kiraz|apple|elma|pear|armut|uzum|grape|orange|portakal|lemon|limon|lime|cranberry|pomegranate|kirsche|himbeere/i,
    spice_herb: /koriander|coriander|ginger|zencefil|cinnamon|tarcin|nutmeg|clove|karanfil|herbs|rosemary|biberiye|mint|nane|lavender|lavanta|hibiscus|elderflower|jasmine|matcha|juniper|ardic|gewürz|kräuter|wacholder|zimt/i,
    chocolate: /chocolate|cacao|kakao|cocoa|cikolata|schokolade/i,
    coffee: /coffee|kahve|espresso|mocha|kaffee/i,
    chile: /chile|chili|jalape|habane|pepper|biber|pfeffer/i,
    smoke: /smoke|smoked|rauch|isli/i,
    honey: /honey|honig|^bal\b/i,
    pumpkin: /pumpkin|balkabak|squash|kürbis/i,
    salt: /tuz|kosher|salt|salz/i,
    lactose: /lactose|laktoz|milk.?sugar|milchzucker/i
  };
  const kf = {};
  for (const k of Object.keys(KATKI_SIG)) kf['katki_' + k] = KATKI_SIG[k].test(allText) ? 1 : 0;

  // Process / scalar
  const og = parseFloat(raw.Stammwuerze || 0);
  const og_sg = og > 0 ? +(1 + og / (258.6 - og / 258.2 * 227.1)).toFixed(4) : 0; // °P → SG conversion
  const fg_attenuation = 78; // default
  const fg_sg = og_sg > 1 ? +(1 + (og_sg - 1) * (1 - fg_attenuation/100)).toFixed(4) : 0;
  const ibu = parseFloat(raw.Bittere || 0);
  const ebc = parseFloat(raw.Farbe || 0);
  const srm = ebc > 0 ? +(ebc * 0.508).toFixed(1) : 0;  // EBC → SRM
  const abv = parseFloat(raw.Alkohol || 0);
  const fermTemp = (raw.Hefe && /lager|w-?34|wlp83|wlp84|s-23|wy20|wy21|saflager/i.test(raw.Hefe)) ? 12 : 19;
  const mashSteps = raw.Rasten || [];
  const mashTempC = mashSteps.length ? parseFloat(mashSteps[0].Temperatur || 66) : 66;
  const boilTime = parseInt(raw.Kochzeit_Wuerze || 60);

  // Derived
  const lager = (yf.yeast_german_lager || yf.yeast_czech_lager || yf.yeast_american_lager) ? 1 : 0;
  const dryHop = (raw.Stopfhopfen || []).length > 0 ? 5 : 0;

  const features = {
    og: og_sg, fg: fg_sg, abv, ibu, srm,
    ...pct, total_base,
    ...yf, ...hopFeats, ...kf,
    mash_temp_c: mashTempC, fermentation_temp_c: fermTemp,
    yeast_attenuation: 78, boil_time_min: boilTime,
    water_ca_ppm: 150, water_so4_ppm: 250, water_cl_ppm: 120,
    dry_hop_days: dryHop, mash_type_step: mashSteps.length > 1 ? 1 : 0,
    mash_type_decoction: 0, lagering_days: lager ? 14 : 0
  };

  const slug = sorteToBjcpSlug(raw.Sorte) || null;
  const main = slug ? (slugToMain[slug] || 'unmapped') : 'unmapped';

  return {
    id: 'mmum_' + id,
    source: 'mmum',
    source_id: String(id),
    name: raw.Name || '?',
    bjcp_slug: slug,
    bjcp_main_category: main,
    sorte_raw: raw.Sorte || '',
    raw: {
      malts: maltsOut,
      hops,
      yeast,
      og: og_sg, fg: fg_sg, abv, ibu, srm,
      batch_size_l: parseFloat(raw.Ausschlagwuerze || 0),
      mash_steps: mashSteps,
      OG_plato: og, EBC: ebc
    },
    features
  };
}

// === Process all ===
const RAW_DIR = './_mmum_raw';
const files = fs.readdirSync(RAW_DIR).filter(f => f.startsWith('recipe_') && f.endsWith('.json'));
console.log('Found', files.length, 'raw MMUM files');

const records = [];
const stats = { mapped: 0, unmapped: 0, malt_other_high: 0, by_main: {}, by_slug: {} };
const dropped = [];

for (const f of files) {
  const id = parseInt(f.match(/recipe_(\d+)/)[1]);
  try {
    const raw = JSON.parse(fs.readFileSync(`${RAW_DIR}/${f}`, 'utf8'));
    const r = normalize(raw, id);
    records.push(r);
    if (r.bjcp_slug) stats.mapped++;
    else stats.unmapped++;
    stats.by_main[r.bjcp_main_category] = (stats.by_main[r.bjcp_main_category] || 0) + 1;
    if (r.bjcp_slug) stats.by_slug[r.bjcp_slug] = (stats.by_slug[r.bjcp_slug] || 0) + 1;
    const pctOther = r.features.pct_other || 0;
    if (pctOther > 30) stats.malt_other_high++;
  } catch (e) {
    dropped.push({ id, err: e.message });
  }
}

console.log('Records:', records.length);
console.log('Mapped:', stats.mapped, '(' + (100*stats.mapped/records.length).toFixed(1) + '%)');
console.log('Unmapped:', stats.unmapped);
console.log('pct_other > 30:', stats.malt_other_high);
console.log('Dropped:', dropped.length);

console.log('\nBy main category (top 15):');
Object.entries(stats.by_main).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log('  '+k.padEnd(35)+v));

console.log('\nBy bjcp_slug (top 25):');
Object.entries(stats.by_slug).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log('  '+k.padEnd(40)+v));

// Belgian focus
console.log('\nBelgian Trappist focus:');
['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale','belgian_blonde_ale','belgian_witbier'].forEach(s=>{
  console.log('  '+s+': '+(stats.by_slug[s] || 0));
});

const out = {
  _meta: {
    generated: new Date().toISOString(),
    source: 'maischemalzundmehr.de',
    total_fetched: files.length,
    total_processed: records.length,
    mapped: stats.mapped,
    unmapped: stats.unmapped,
    pct_other_high: stats.malt_other_high
  },
  records
};
fs.writeFileSync('_v8_recipes_mmum.json', JSON.stringify(out, null, 2));
console.log('\nWrote _v8_recipes_mmum.json (' + (JSON.stringify(out).length/1024).toFixed(0) + ' KB)');
