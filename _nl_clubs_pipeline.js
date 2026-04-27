// Adım 45 Aşama 0 — Roerstok + Amervallei → V10.1
// Reuses twortwat parse_full.js patterns (Web-Op-Maat CMS = identical)
const https = require('https');
const fs = require('fs');

const HIER = JSON.parse(fs.readFileSync('_audit_step_26d_style_hierarchy.json', 'utf8'));
const slugToMain = {};
Object.entries(HIER.categories).forEach(([cat, info]) => info.slugs.forEach(s => slugToMain[s.slug] = cat));
if (!slugToMain['belgian_strong_golden']) slugToMain['belgian_strong_golden'] = 'Belgian Strong / Trappist';

// === classifyMaltDENL (V10 patch reuse) ===
function classifyMaltDENL(name) {
  const n = (name || '').toLowerCase();
  if (!n) return 'other';
  if (/honey.?malt|honig.?malz|honing.?mout/.test(n)) return 'aromatic_abbey';
  if (/(schwarzmalz|röstmalz|röstgerste|roasted.?barley|black.?(malt|patent)|zwart\s?mout|zwartmout|geroosterd(e)?\s+(gerst|mout))/.test(n)) return 'roast';
  if (/(chocolate|schokolade|choc.?malt|carafa.?(spec|i|ii|iii)|röst.?(weiz|gerst|cara)|chocolade.?mout|chocolademout)/.test(n)) return 'choc';
  if (/karamell|caramel|cara(mun|ml|hell|red|amber|aroma|pils|special|wheat|rye|munich|gold|crystal|mout|pils|ras)|crystal|karamel|cristal|kristalmout|caramout/.test(n)) return 'crystal';
  if (/aromatic|melanoidin|special.?b|biscuit|amber.?malt|ambermout|^amber\b|brown.?malt|brown.?ale.?malt/.test(n)) return 'aromatic_abbey';
  if (/säuermalz|saeuermalz|acidulated|sauer.?malz|sauermalz|zuurmout|zuurmolt/.test(n)) return 'aromatic_abbey';
  if (/rauch|smoked|^smoke|peat|mesquite|cherry.?wood|alder|whisky.?mout|whiskymout/.test(n)) return 'smoked';
  if (/zucker|sugar|candi|candy|invert|dextrose|saccharose|melasse|molasses|treacle|honig.?(syrup|sirup)|maltodextrin|^honig$|^honey$|honing|suiker|kandij|riet\s?suiker|bottel\s?suiker|kandijsiroop|kandijsuiker/.test(n)) return 'sugar';
  if (/^mais|maize|^corn|maisflocken|maïs/.test(n)) return 'corn';
  if (/^reis|^rice|^rijst/.test(n)) return 'rice';
  if (/6.?row|sixrow|six.?row/.test(n)) return 'sixrow';
  if (/(weizen|wheat|weiss|weiß|tarwe(mout|vlokken|bier)?|^tarwe|^spelt|speltvlokken)(?!.*roggen)/.test(n)) return 'wheat';
  if (/roggen|\brye\b|rogge(mout|vlokken)?|^rogge/.test(n)) return 'rye';
  if (/hafer|\boat|haver(mout|vlokken)?|^haver|haverflokken/.test(n)) return 'oats';
  if (/^munich|^münchner|münchener|muenchner|munichmout/.test(n)) return 'munich';
  if (/^vienna|^wien(er)?|^wenen|wenen.?mout|viennamout/.test(n)) return 'vienna';
  if (/pilsner|pilsen|bohemian|bohem|^pilsmalz|tennenmalz|pilsmout|pilsenmout|^pils\s|^pils$/.test(n)) return 'pilsner';
  if (/pale.?ale|pale.?malt|maris.?otter|golden.?promise|^pale\b|extra.?pale|palemout|^pale\s|gerstevlokken|gerste.?vlokken|^gerstemout|moutext|weyermann.?extra.?pale/.test(n)) return 'pale_ale';
  return 'other';
}

// Unified NL category map (twortwat + roerstok extra terms)
const NL_MAP = {
  // ── Belgian Strong / Trappist ──
  'tripel': ['belgian_tripel', 'Belgian Strong / Trappist'],
  'dubbel': ['belgian_dubbel', 'Belgian Strong / Trappist'],
  'quadrupel': ['belgian_quadrupel', 'Belgian Strong / Trappist'],
  'sterke blonde': ['belgian_strong_golden', 'Belgian Strong / Trappist'],
  'belgisches dark strong ale': ['belgian_strong_dark_ale', 'Belgian Strong / Trappist'],
  // ── Belgian Pale / Witbier ──
  'witbier': ['belgian_witbier', 'Belgian Pale / Witbier'],
  'witbier (sterk)': ['belgian_witbier', 'Belgian Pale / Witbier'],
  'blond': ['blonde_ale', 'American Hoppy'],
  // ── Saison / Farmhouse ──
  'saison': ['french_belgian_saison', 'Saison / Farmhouse'],
  'bière de garde': ['french_biere_de_garde', 'Saison / Farmhouse'],
  'frans lentebier': ['french_biere_de_garde', 'Saison / Farmhouse'],
  // ── Sour / Wild ──
  'kriek': ['belgian_fruit_lambic', 'Sour / Wild / Brett'],
  'gose': ['gose', 'Sour / Wild / Brett'],
  'lambic': ['belgian_lambic', 'Sour / Wild / Brett'],
  'vlaams rood': ['flanders_red_ale', 'Sour / Wild / Brett'],
  // ── German Lager ──
  'pilsener': ['german_pilsener', 'German Lager'],
  'münchener helles': ['munich_helles', 'German Lager'],
  'münchener dunkel': ['munich_dunkel', 'German Lager'],
  'bohemian dark lager': ['munich_dunkel', 'German Lager'],
  'märzen': ['german_maerzen', 'German Lager'],
  'oktoberfest': ['german_maerzen', 'German Lager'],
  'feestbier': ['festbier', 'German Lager'],
  'schwarzbier': ['german_schwarzbier', 'German Lager'],
  'vienna': ['vienna_lager', 'German Lager'],
  'dark lager': ['dark_lager', 'German Lager'],
  'international pale lager': ['pale_lager', 'German Lager'],
  'ondergistend': ['pale_lager', 'German Lager'],
  'rauchbier': ['bamberg_maerzen_rauchbier', 'German Lager'],
  'meibok': ['german_heller_bock_maibock', 'German Lager'],
  'bokbier': ['german_heller_bock_maibock', 'German Lager'],
  'dubbelbok': ['german_doppelbock', 'German Lager'],
  'dubbelbock': ['german_doppelbock', 'German Lager'],
  // ── German Wheat ──
  'weizen': ['south_german_hefeweizen', 'German Wheat'],
  'tarwebier': ['south_german_hefeweizen', 'German Wheat'],
  'weizenbock': ['weizenbock', 'German Wheat'],
  'dunkel weizen': ['south_german_dunkel_weizen', 'German Wheat'],
  // ── Hybrid Ale-Lager ──
  'kölsch': ['german_koelsch', 'Hybrid Ale-Lager'],
  'alt': ['german_altbier', 'Hybrid Ale-Lager'],
  'cream ale': ['cream_ale', 'Hybrid Ale-Lager'],
  'california steam': ['common_beer', 'Hybrid Ale-Lager'],
  'pale american lager': ['american_lager', 'Hybrid Ale-Lager'],
  // ── American Hoppy ──
  'american ipa': ['american_india_pale_ale', 'American Hoppy'],
  'india pale ale': ['american_india_pale_ale', 'American Hoppy'],
  'ipa (us)': ['american_india_pale_ale', 'American Hoppy'],
  'ipa (gb)': ['british_india_pale_ale', 'American Hoppy'],
  'english ipa': ['british_india_pale_ale', 'American Hoppy'],
  'session ipa': ['session_india_pale_ale', 'American Hoppy'],
  'black ipa': ['black_ipa', 'American Hoppy'],
  'black india pale ale': ['black_ipa', 'American Hoppy'],
  'neipa': ['juicy_or_hazy_india_pale_ale', 'American Hoppy'],
  'new england india pale ale': ['juicy_or_hazy_india_pale_ale', 'American Hoppy'],
  'hazy ipa': ['juicy_or_hazy_india_pale_ale', 'American Hoppy'],
  'double ipa': ['double_ipa', 'American Hoppy'],
  'double ipa (usa)': ['double_ipa', 'American Hoppy'],
  'imperial ipa': ['double_ipa', 'American Hoppy'],
  'brut ipa': ['brut_ipa', 'American Hoppy'],
  'white ipa': ['white_ipa', 'American Hoppy'],
  'rye ipa': ['rye_ipa', 'American Hoppy'],
  'pale ale': ['pale_ale', 'American Hoppy'],
  'american pale ale': ['pale_ale', 'American Hoppy'],
  'apa': ['pale_ale', 'American Hoppy'],
  'australian style pale ale': ['australian_pale_ale', 'American Hoppy'],
  'haverbier': ['american_wheat_ale', 'American Hoppy'],
  'american wheat ale': ['american_wheat_ale', 'American Hoppy'],
  // ── British Bitter / Mild ──
  'british strong bitter': ['extra_special_bitter', 'British Bitter / Mild'],
  'bitter': ['special_bitter_or_best_bitter', 'British Bitter / Mild'],
  'best bitter': ['special_bitter_or_best_bitter', 'British Bitter / Mild'],
  'mild ale': ['mild', 'British Bitter / Mild'],
  // ── British Strong / Old ──
  'barley wine': ['british_barley_wine_ale', 'British Strong / Old'],
  'old ale': ['old_ale', 'British Strong / Old'],
  'scotch ale': ['scotch_ale_or_wee_heavy', 'British Strong / Old'],
  // ── Stout / Porter ──
  'porter': ['porter', 'Stout / Porter'],
  'porter (baltic)': ['baltic_porter', 'German Lager'],
  'porter (brown)': ['brown_porter', 'Stout / Porter'],
  'robuust porter': ['robust_porter', 'Stout / Porter'],
  'stout': ['stout', 'Stout / Porter'],
  'dry stout': ['irish_dry_stout', 'Stout / Porter'],
  'oatmeal stout': ['oatmeal_stout', 'Stout / Porter'],
  'milkstout': ['sweet_stout', 'Stout / Porter'],
  'export stout': ['export_stout', 'Stout / Porter'],
  'russian imperial stout': ['american_imperial_stout', 'Stout / Porter'],
  'imperial stout': ['american_imperial_stout', 'Stout / Porter'],
  // ── Irish / Red Ale ──
  'irish red ale': ['irish_red_ale', 'Irish / Red Ale'],
  'amber': ['american_amber_red_ale', 'Irish / Red Ale'],
  'american amber red': ['american_amber_red_ale', 'Irish / Red Ale'],
  'brown ale': ['brown_ale', 'Irish / Red Ale'],
  'oatmeal brown ale': ['brown_ale', 'Irish / Red Ale'],
  'amerikanisches brown ale': ['brown_ale', 'Irish / Red Ale'],
  // ── Specialty / Adjunct ──
  'fruchtbier': ['fruit_beer', 'Specialty / Adjunct'],
  'spezial-fruchtbier': ['fruit_beer', 'Specialty / Adjunct'],
  'gewürz-, kräuter- und gemüsebier': ['herb_and_spice_beer', 'Specialty / Adjunct'],
  'winterbier': ['winter_seasonal_beer', 'Specialty / Adjunct'],
  'fantasiebier': ['experimental_beer', 'Specialty / Adjunct'],
  'spezial-bier': ['specialty_beer', 'Specialty / Adjunct'],
  'lustrumbier 2014': ['specialty_beer', 'Specialty / Adjunct'],
  'lustrumbier 2024': ['specialty_beer', 'Specialty / Adjunct'],
  'overigen': ['specialty_beer', 'Specialty / Adjunct'],
  // ── Historical ──
  'grätzer': ['piwo_grodziskie', 'Historical / Special'],
  // ── Generic kveik ──
  'kveik bier': ['blonde_ale', 'American Hoppy'],
  // ── ALE generic ──
  'ale': ['blonde_ale', 'American Hoppy']
};

function nlStyleToSlug(cat) {
  if (!cat) return { slug: null, main: null };
  const r = NL_MAP[cat.toLowerCase().trim()];
  if (r && r[0]) return { slug: r[0], main: r[1] };
  return { slug: null, main: null };
}

function dec(s) {
  return String(s||'').replace(/&amp;apos;/g,"'").replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
}

// === BeerXML parser (twortwat reuse) ===
function parseRecipe(xml, idStr, source, idxRec) {
  if (!xml.includes('<RECIPE>')) return { error: 'no_recipe_xml' };
  function get1(re) { const m = xml.match(re); return m ? dec(m[1]) : ''; }
  const beerName = get1(/<NAME>([^<]+)<\/NAME>/);
  const type = get1(/<TYPE>([^<]+)<\/TYPE>/);
  if (type && !/all.?grain/i.test(type)) return { error: 'not_all_grain', type };
  const og = parseFloat(get1(/<OG>([^<]+)<\/OG>/)) || 0;
  const fg = parseFloat(get1(/<FG>([^<]+)<\/FG>/)) || 0;
  const ibu = parseFloat(get1(/<IBU>([^<]+)<\/IBU>/)) || 0;
  const abv = parseFloat(get1(/<ABV>([^<]+)<\/ABV>/)) || (og && fg ? +(((og - fg) * 131.25).toFixed(2)) : 0);
  const batchSize = parseFloat(get1(/<BATCH_SIZE>([^<]+)<\/BATCH_SIZE>/)) || 10;
  const boilTime = parseInt(get1(/<BOIL_TIME>([^<]+)<\/BOIL_TIME>/)) || 60;
  const efficiency = parseFloat(get1(/<EFFICIENCY>([^<]+)<\/EFFICIENCY>/)) || 0;
  let ebc = 0;
  const eccMatch = xml.match(/<EST_COLOR>([\d.]+)\s*EBC<\/EST_COLOR>/);
  if (eccMatch) ebc = parseFloat(eccMatch[1]);
  else {
    const cMatch = xml.match(/<COLOR>([\d.]+)<\/COLOR>(?!\s*<\/FERMENTABLE)/);
    if (cMatch) ebc = parseFloat(cMatch[1]);
  }
  const srm = ebc > 0 ? +(ebc * 0.508).toFixed(1) : 0;
  if (og < 1.020 || og > 1.150) return { error: 'bad_og', og };
  if (fg > 0 && (fg >= og || fg < 0.990 || fg > 1.060)) return { error: 'bad_fg', og, fg };
  if (srm > 80) return { error: 'bad_srm', srm, ebc };
  const sm = nlStyleToSlug(idxRec.cat);
  if (!sm.slug) return { error: 'no_slug', cat: idxRec.cat || '?' };

  // Fermentables
  const fRe = /<FERMENTABLE>([\s\S]*?)<\/FERMENTABLE>/g;
  const malts = []; let totalKg = 0; let fm;
  while ((fm = fRe.exec(xml))) {
    const fName = dec((fm[1].match(/<NAME>([^<]+)<\/NAME>/) || [, ''])[1]);
    const fType = (fm[1].match(/<TYPE>([^<]+)<\/TYPE>/) || [, ''])[1].trim().toLowerCase();
    const fAmt = parseFloat((fm[1].match(/<AMOUNT>([^<]+)<\/AMOUNT>/) || [, '0'])[1]) || 0;
    if (!fName || fAmt <= 0) continue;
    let cat = classifyMaltDENL(fName);
    if (fType === 'sugar' && cat === 'other') cat = 'sugar';
    if (fType === 'adjunct' && cat === 'other') cat = 'sugar';
    malts.push({ name: fName, amount_kg: fAmt, cat });
    totalKg += fAmt;
  }
  if (malts.length === 0 || totalKg < 0.05) return { error: 'no_grain' };

  const buckets = { pilsner:0, pale_ale:0, munich:0, vienna:0, wheat:0, oats:0, rye:0, crystal:0, choc:0, roast:0, smoked:0, corn:0, rice:0, sugar:0, aromatic_abbey:0, sixrow:0, other:0 };
  for (const m of malts) buckets[m.cat] += m.amount_kg;
  const pct = {};
  for (const k of Object.keys(buckets)) pct['pct_' + k] = +(buckets[k] / totalKg * 100).toFixed(2);
  const total_base = +((pct.pct_pilsner||0)+(pct.pct_pale_ale||0)+(pct.pct_munich||0)+(pct.pct_vienna||0)+(pct.pct_wheat||0)).toFixed(2);

  const hRe = /<HOP>([\s\S]*?)<\/HOP>/g;
  const hops = []; let hm;
  while ((hm = hRe.exec(xml))) {
    const hName = dec((hm[1].match(/<NAME>([^<]+)<\/NAME>/) || [, ''])[1]);
    const hAmt = parseFloat((hm[1].match(/<AMOUNT>([^<]+)<\/AMOUNT>/) || [, '0'])[1]) * 1000;
    const hUse = (hm[1].match(/<USE>([^<]+)<\/USE>/) || [, ''])[1].trim();
    hops.push({ name: hName, amount_g: hAmt, use: hUse });
  }
  const yeastStr = dec((xml.match(/<YEAST>[\s\S]*?<NAME>([^<]+)<\/NAME>/) || [, ''])[1]);
  const yeastAtt = parseFloat((xml.match(/<YEAST>[\s\S]*?<ATTENUATION>([^<]+)<\/ATTENUATION>/) || [, '78'])[1]) || 78;
  const yeastLower = yeastStr.toLowerCase();
  const yf = {
    yeast_belgian: /belgian|belgium|bel\b|trappist|abbey|abbaye|tripel|dubbel|saison|wlp5\d{2}|wy37|wy3787/i.test(yeastLower) ? 1 : 0,
    yeast_abbey: /abbaye|abbey|trappist|tripel|dubbel|monastic|westmalle|chimay|wlp500|wlp530|wlp540|wy1762|wy3787|t-58|safbrew.?t/i.test(yeastLower) ? 1 : 0,
    yeast_saison: /saison|farmhouse|dupont|wy3711|wy3724|wlp565|wlp585|wlp670|be134|belle.?saison/i.test(yeastLower) ? 1 : 0,
    yeast_kveik: /kveik|voss|hothead|hornindal/i.test(yeastLower) ? 1 : 0,
    yeast_english: /(wlp00[2345]|wlp013|wlp017|wy1098|wy1187|wy1318|wy1335|wy1469|s-04|safale.?s.?04|west.?yorkshire|london|esb|english|nottingham|notty)/i.test(yeastLower) ? 1 : 0,
    yeast_american: /(us-?05|us05|wlp001|wy1056|chico|california.?ale|american.?ale|safale.?us|bry-?97)/i.test(yeastLower) ? 1 : 0,
    yeast_german_lager: /(34\/?70|w-?34|w-?34\/70|wy2007|wy2206|wy2308|wlp830|wlp833|wlp840|german.?lager|saflager|s-23|saflager.?w|bavarian.?lager)/i.test(yeastLower) ? 1 : 0,
    yeast_czech_lager: /(wy2278|wlp802|czech|premiant|budweiser)/i.test(yeastLower) ? 1 : 0,
    yeast_american_lager: /(s-23|wlp840|wy2035|american.?lager)/i.test(yeastLower) ? 1 : 0,
    yeast_kolsch: /(wlp029|wy2565|kölsch|kolsch|gaffel)/i.test(yeastLower) ? 1 : 0,
    yeast_altbier: /(wy1007|altbier|wlp036)/i.test(yeastLower) ? 1 : 0,
    yeast_cal_common: /(california.?common|wlp810|wy2112|steam.?beer)/i.test(yeastLower) ? 1 : 0,
    yeast_brett: /brett|brettanomyces|wy5112|wlp650|wlp653|3.?fonteinen/i.test(yeastLower) ? 1 : 0,
    yeast_lacto: /lactobacillus|lacto|wlp677|wlp672|wy5335/i.test(yeastLower) ? 1 : 0,
    yeast_sour_blend: /roeselare|sour.?blend|funk|de.?bom|cantillon/i.test(yeastLower) ? 1 : 0,
    yeast_witbier: /(wit\b|witbier|hoegaarden|wlp400|wy3463|wy3944|belgium.?white|belgian.?white)/i.test(yeastLower) ? 1 : 0,
    yeast_wheat_german: /(weizen|hefeweizen|hefe.?weiz|w-?06|wb-?06|wy3068|wy3056|wlp300|wlp380|munich.?classic|bavarian.?wheat|safbrew.?wb|weihenstephan)/i.test(yeastLower) ? 1 : 0,
    yeast_wit: /(wit\b|witbier|wlp400|wy3463)/i.test(yeastLower) ? 1 : 0
  };
  const hopStr = hops.map(h => (h.name || '').toLowerCase()).join('|');
  const HOP_SIG = {
    american_c: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el.?dorado|summit|equinox|ekuanot|azacca|vic.?secret|calypso|loral|strata|talus|cashmere|hopshot|williamette|willamette)/i,
    english: /(ekg|east.?kent|fuggles?|challenger|goldings?|admiral|bramling|first.?gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british.?hop|styrian)/i,
    german: /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|mittelfr|magnum|polaris)/i,
    czech_saaz: /(saaz|premiant|sladek|kazbek|zatec)/i,
    nz: /(nelson|motueka|riwaka|waimea|wakatu|pacific|rakau|sauvin|kohatu)/i,
    aged: /(aged.?hop|alter.?hopfen)/i,
    northern_brewer: /(northern.?brewer|cluster|mount.?hood)/i
  };
  const hopFeats = {};
  for (const k of Object.keys(HOP_SIG)) hopFeats['hop_' + k] = HOP_SIG[k].test(hopStr) ? 1 : 0;
  const allText = malts.map(m=>m.name||'').join('|').toLowerCase() + '|' + hopStr + '|' + yeastLower;
  const KATKI_SIG = {
    fruit: /meyve|fruit|mango|passion|peach|strawberry|raspberry|cherry|kers|kiraz|apple|appel|pear|grape|orange|sinaasappel|lemon|citroen|lime|cranberry|pomegranate|kirsche|himbeere|frambozen|aardbei/i,
    spice_herb: /koriander|coriander|ginger|gember|cinnamon|kaneel|nutmeg|nootmuskaat|clove|kruidnagel|herbs|kruiden|rosemary|rozemarijn|mint|munt|lavender|lavendel|hibiscus|elderflower|vlierbloesem|jasmine|matcha|juniper|jeneverbes|gewürz|kräuter|zimt|salie|sage|citroenmelisse/i,
    chocolate: /chocolate|cacao|kakao|cocoa|schokolade|chocolade|nibs/i,
    coffee: /coffee|espresso|mocha|kaffee|koffie/i,
    chile: /chile|chili|jalape|habane|pepper|peper|biber|pfeffer/i,
    smoke: /smoke|smoked|rauch|gerookt/i,
    honey: /honey(?!.?malt)|^honig\b|honing|lindebloesem/i,
    pumpkin: /pumpkin|pompoen|squash|kürbis/i,
    salt: /salt|salz|zout/i,
    lactose: /lactose|laktoz|milk.?sugar|milchzucker/i
  };
  const kf = {};
  for (const k of Object.keys(KATKI_SIG)) kf['katki_' + k] = KATKI_SIG[k].test(allText) ? 1 : 0;

  let mashTempC = 66; let mashSteps = 0;
  const stepRe = /<MASH_STEP>([\s\S]*?)<\/MASH_STEP>/g;
  let stm; let firstStepTemp = null;
  while ((stm = stepRe.exec(xml))) {
    mashSteps++;
    const t = parseFloat((stm[1].match(/<STEP_TEMP>([^<]+)<\/STEP_TEMP>/) || [, '0'])[1]);
    if (firstStepTemp === null && t > 30 && t < 90) firstStepTemp = t;
  }
  if (firstStepTemp !== null) mashTempC = firstStepTemp;
  if (mashSteps === 0) mashSteps = 1;
  const lager = (yf.yeast_german_lager || yf.yeast_czech_lager || yf.yeast_american_lager) ? 1 : 0;
  const fermTemp = lager ? 12 : 19;
  const dryHop = hops.some(h => /dry.?hop|stopfen/i.test(h.use || '')) ? 5 : 0;

  const features = {
    og, fg, abv, ibu, srm, ...pct, total_base, ...yf, ...hopFeats, ...kf,
    mash_temp_c: mashTempC, fermentation_temp_c: fermTemp,
    yeast_attenuation: yeastAtt, boil_time_min: boilTime,
    water_ca_ppm: 150, water_so4_ppm: 250, water_cl_ppm: 120,
    dry_hop_days: dryHop, mash_type_step: mashSteps > 1 ? 1 : 0,
    mash_type_decoction: 0, lagering_days: lager ? 14 : 0
  };
  return {
    id: source + '_' + idStr, source, source_id: idStr,
    name: beerName || idxRec.name,
    bjcp_slug: sm.slug, bjcp_main_category: sm.main, sorte_raw: idxRec.cat || '',
    raw: { malts, hops, yeast: yeastStr, og, fg, abv, ibu, srm, batch_size_l: batchSize, mash_eff_pct: efficiency, mash_steps: mashSteps, ebc, author: idxRec.author },
    features, in_split: null
  };
}

// === Bulk fetch a club ===
function fetchOne(host, id) {
  return new Promise(resolve => {
    https.request({
      hostname: host, path: `/recepten?id=${id}&xml=1`, method: 'GET',
      headers: { 'User-Agent': 'Brewmaster Audit Bot (research)' }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', e => resolve({ status: 0, err: e.message })).end();
  });
}

(async () => {
  const allRecords = [];
  const totalErrs = { no_grain:0, no_slug:0, bad_og:0, bad_fg:0, bad_srm:0, not_all_grain:0, no_recipe_xml:0, http_err:0 };
  const slugCount = {};

  for (const club of [
    { source: 'roerstok', host: 'www.roerstok.nl', listing: '_roerstok_listing.json' },
    { source: 'amervallei', host: 'amervallei.nl', listing: '_amervallei_listing.json' }
  ]) {
    console.log(`\n=== ${club.source.toUpperCase()} ===`);
    const listing = JSON.parse(fs.readFileSync(club.listing, 'utf8'));
    let ok = 0, err = 0;
    for (let i = 0; i < listing.length; i++) {
      const idx = listing[i];
      const r = await fetchOne(club.host, idx.id);
      if (r.status !== 200 || !r.body || !r.body.includes('<RECIPE>')) {
        totalErrs.http_err++; err++;
        continue;
      }
      const rec = parseRecipe(r.body, idx.id, club.source, idx);
      if (rec.error) { totalErrs[rec.error] = (totalErrs[rec.error]||0)+1; err++; continue; }
      allRecords.push(rec);
      slugCount[rec.bjcp_slug] = (slugCount[rec.bjcp_slug]||0)+1;
      ok++;
      if ((i+1) % 25 === 0 || i === listing.length-1) {
        console.log(`  [${i+1}/${listing.length}] ok=${ok} err=${err}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`  ${club.source} done: ok=${ok}, err=${err}`);
  }

  console.log('\n=== TOTAL ===');
  console.log('Records:', allRecords.length);
  console.log('Errors:', JSON.stringify(totalErrs));
  console.log('\nKey clusters:');
  ['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale','belgian_strong_golden','belgian_blonde_ale','belgian_witbier',
   'french_belgian_saison','flanders_red_ale','belgian_fruit_lambic','gose','belgian_lambic','berliner_weisse',
   'special_bitter_or_best_bitter','extra_special_bitter','mild',
   'old_ale','british_barley_wine_ale','scotch_ale_or_wee_heavy',
   'specialty_beer','fruit_beer','smoked_beer','herb_and_spice_beer','german_pilsener','south_german_hefeweizen','weizenbock','american_imperial_stout'].forEach(s=>{
    if (slugCount[s]) console.log('  '+s.padEnd(40)+slugCount[s]);
  });

  const out = {
    _meta: { generated: new Date().toISOString(), sources: ['roerstok','amervallei'], total_parsed: allRecords.length, errors: totalErrs },
    records: allRecords
  };
  fs.writeFileSync('_v101_recipes_nlclubs.json', JSON.stringify(out, null, 2));
  console.log('\nWrote _v101_recipes_nlclubs.json ('+(JSON.stringify(out).length/1024).toFixed(0)+' KB)');
})();
