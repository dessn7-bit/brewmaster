// Full diydog BeerXML parse + BJCP slug mapping → _v7_recipes_diydog.json
const fs = require('fs');
const path = require('path');

const SRC_DIR = './.tmp_diydog';

function tagText(s, t){
  const re = new RegExp('<'+t+'>([\\s\\S]*?)<\\/'+t+'>', 'i');
  const m = s.match(re);
  return m ? m[1].trim() : null;
}
function tagAll(s, t){
  const re = new RegExp('<'+t+'>([\\s\\S]*?)<\\/'+t+'>', 'gi');
  const r=[]; let m;
  while((m=re.exec(s))!==null) r.push(m[1]);
  return r;
}
function num(v){ if(v==null) return null; const n=parseFloat(v); return isNaN(n)?null:n; }

// BJCP slug heuristic — name + style_name string'inde keyword search
// Sıralama: en spesifik → en genel
function bjcpSlugFor(name, style_name){
  const n = (name||'').toLowerCase();
  const s = (style_name||'').toLowerCase();
  const t = n + ' ' + s;
  // Specific brand mappings (Brewdog catalog)
  if(/punk\s*ipa|hardcore\s*ipa|jack\s*hammer|elvis\s*juice|ipa\s*is\s*dead/.test(n)) {
    if(/hardcore|imperial|double/i.test(t)) return 'double_ipa';
    if(/triple/i.test(t)) return 'triple_ipa';
    if(/session|small|low\s*alc/i.test(t)) return 'session_india_pale_ale';
    if(/hazy|juicy|neipa/i.test(t)) return 'juicy_or_hazy_india_pale_ale';
    if(/black/i.test(t)) return 'black_ipa';
    if(/brut/i.test(t)) return 'brut_ipa';
    if(/west\s*coast/i.test(t)) return 'west_coast_india_pale_ale';
    if(/rye/i.test(t)) return 'rye_ipa';
    return 'american_india_pale_ale';
  }
  // Stout family
  if(/imperial.*stout|russian.*imperial/.test(t)) return 'american_imperial_stout';
  if(/oatmeal\s*stout/.test(t)) return 'oatmeal_stout';
  if(/sweet\s*stout|milk\s*stout|cream.*stout/.test(t)) return 'sweet_stout';
  if(/dry\s*stout|irish\s*stout/.test(t)) return 'irish_dry_stout';
  if(/dessert.*stout|pastry/.test(t)) return 'dessert_stout_or_pastry_beer';
  if(/coffee\s*stout|coffee.*beer/.test(t)) return 'coffee_beer';
  if(/chocolate\s*stout|cocoa.*stout|chocolate.*beer/.test(t)) return 'chocolate_or_cocoa_beer';
  if(/\bstout\b/.test(t)) return 'stout';
  if(/baltic\s*porter/.test(t)) return 'baltic_porter';
  if(/smoked\s*porter|smoke\s*porter/.test(t)) return 'smoke_porter';
  if(/robust\s*porter/.test(t)) return 'robust_porter';
  if(/brown\s*porter/.test(t)) return 'brown_porter';
  if(/\bporter\b/.test(t)) return 'porter';
  // IPA family (not specific brand)
  if(/double\s*ipa|dipa/.test(t)) return 'double_ipa';
  if(/triple\s*ipa|tipa/.test(t)) return 'triple_ipa';
  if(/black\s*ipa|cascadian/.test(t)) return 'black_ipa';
  if(/session.*ipa/.test(t)) return 'session_india_pale_ale';
  if(/hazy.*ipa|juicy.*ipa|neipa|new\s*england/.test(t)) return 'juicy_or_hazy_india_pale_ale';
  if(/brut\s*ipa/.test(t)) return 'brut_ipa';
  if(/white\s*ipa/.test(t)) return 'white_ipa';
  if(/rye\s*ipa/.test(t)) return 'rye_ipa';
  if(/west\s*coast\s*ipa/.test(t)) return 'west_coast_india_pale_ale';
  if(/red\s*ipa|imperial\s*red/.test(t)) return 'imperial_red_ale';
  if(/\bipa\b|india.*pale/.test(t)) return 'american_india_pale_ale';
  // Pale Ale / Amber
  if(/amber\s*ale|red\s*ale|fat\s*tire/.test(t)) return 'american_amber_red_ale';
  if(/pale\s*ale/.test(t)) return 'pale_ale';
  if(/blonde/.test(t)) return 'blonde_ale';
  if(/cream\s*ale/.test(t)) return 'cream_ale';
  // Belgian
  if(/dubbel/.test(t)) return 'belgian_dubbel';
  if(/tripel/.test(t)) return 'belgian_tripel';
  if(/quadrupel|\bquad\b/.test(t)) return 'belgian_quadrupel';
  if(/belgian\s*strong\s*dark|bsda|abbey\s*dark/.test(t)) return 'belgian_strong_dark_ale';
  if(/belgian\s*blonde|belgian\s*golden/.test(t)) return 'belgian_blonde_ale';
  if(/witbier|wit\b|white\s*ale/.test(t)) return 'belgian_witbier';
  if(/saison|farmhouse/.test(t)) return 'french_belgian_saison';
  if(/biere\s*de\s*garde/.test(t)) return 'french_biere_de_garde';
  // Sour / Wild
  if(/lambic|gueuze/.test(t)) return 'gueuze';
  if(/flanders\s*red|red\s*flanders/.test(t)) return 'flanders_red_ale';
  if(/oud\s*bruin/.test(t)) return 'oud_bruin';
  if(/berliner|berlin\s*weisse/.test(t)) return 'berliner_weisse';
  if(/\bgose\b/.test(t)) return 'gose';
  if(/wild\s*ale|brett|sour\s*ale/.test(t)) return 'american_wild_ale';
  if(/fruited\s*sour|kettle\s*sour/.test(t)) return 'american_fruited_sour_ale';
  // German Lager
  if(/pilsner|pils\b/.test(t)) return 'german_pilsener';
  if(/munich\s*helles|helles\b/.test(t)) return 'munich_helles';
  if(/munich\s*dunkel|dunkel\s*lager/.test(t)) return 'munich_dunkel';
  if(/märzen|marzen|oktoberfest/.test(t)) return 'german_maerzen';
  if(/festbier|wiesn/.test(t)) return 'festbier';
  if(/schwarzbier/.test(t)) return 'german_schwarzbier';
  if(/vienna\s*lager/.test(t)) return 'vienna_lager';
  if(/dortmunder|export\s*lager/.test(t)) return 'dortmunder_european_export';
  if(/doppelbock|double\s*bock/.test(t)) return 'german_doppelbock';
  if(/eisbock/.test(t)) return 'eisbock';
  if(/maibock|helles\s*bock/.test(t)) return 'german_heller_bock_maibock';
  if(/bock\b/.test(t)) return 'german_doppelbock'; // generic bock → doppelbock fallback
  if(/altbier|alt\b/.test(t)) return 'german_altbier';
  if(/koelsch|kölsch|kolsch/.test(t)) return 'german_koelsch';
  if(/kellerbier|zwickel/.test(t)) return 'kellerbier';
  if(/rauchbier|rauch\b|smoked\s*lager/.test(t)) return 'bamberg_maerzen_rauchbier';
  if(/lager\b/.test(t)) return 'pale_lager';
  // German Wheat
  if(/hefeweizen|weissbier|weiss\b/.test(t)) return 'south_german_hefeweizen';
  if(/weizenbock/.test(t)) return 'weizenbock';
  if(/dunkelweizen/.test(t)) return 'south_german_dunkel_weizen';
  if(/wheat\s*ale|american\s*wheat/.test(t)) return 'american_wheat_ale';
  // British
  if(/scotch\s*ale|wee\s*heavy/.test(t)) return 'scotch_ale_or_wee_heavy';
  if(/scottish.*export/.test(t)) return 'scottish_export';
  if(/scottish\s*heavy/.test(t)) return 'scottish_heavy';
  if(/barleywine|barley\s*wine/.test(t)) return /english/i.test(t) ? 'british_barley_wine_ale' : 'american_barleywine';
  if(/old\s*ale/.test(t)) return 'old_ale';
  if(/\bmild\b/.test(t)) return 'mild';
  if(/esb|extra\s*special\s*bitter/.test(t)) return 'extra_special_bitter';
  if(/best\s*bitter|special\s*bitter/.test(t)) return 'special_bitter_or_best_bitter';
  if(/ordinary\s*bitter|session\s*bitter/.test(t)) return 'ordinary_bitter';
  if(/bitter\b/.test(t)) return 'special_bitter_or_best_bitter';
  if(/strong\s*ale\b/.test(t)) return 'strong_ale';
  if(/brown\s*ale/.test(t)) return 'brown_ale';
  if(/irish\s*red/.test(t)) return 'irish_red_ale';
  // Specialty / Adjunct
  if(/pumpkin/.test(t)) return /spice/.test(t) ? 'pumpkin_spice_beer' : 'pumpkin_squash_beer';
  if(/winter\s*ale|christmas|holiday/.test(t)) return 'winter_seasonal_beer';
  if(/honey\b/.test(t)) return 'specialty_honey_beer';
  if(/chili|jalape|pepper/.test(t)) return 'chili_pepper_beer';
  if(/fruit\s*beer|fruit\s*ale/.test(t)) return 'fruit_beer';
  if(/historical|sahti|grodzis|adambier|gotlands|kuit/.test(t)) return 'specialty_historical';
  if(/herb|spice\s*ale/.test(t)) return 'herb_and_spice_beer';
  if(/wheat\s*wine|wheatwine/.test(t)) return 'american_wheat_wine_ale';
  if(/california\s*common|steam\s*beer/.test(t)) return 'common_beer';
  // Fallback
  return 'specialty_beer';
}

function parseBeerXML(xml, filename){
  const recipes = tagAll(xml, 'RECIPE');
  return recipes.map(r=>{
    const styleBlock = tagText(r,'STYLE')||'';
    const ferms = tagAll(r,'FERMENTABLE').map(f=>({
      name: tagText(f,'NAME'),
      amount_kg: num(tagText(f,'AMOUNT')),
      type: tagText(f,'TYPE'),
      color: num(tagText(f,'COLOR')),
      yield_pct: num(tagText(f,'YIELD'))
    }));
    const hops = tagAll(r,'HOP').map(h=>({
      name: tagText(h,'NAME'),
      amount_kg: num(tagText(h,'AMOUNT')),
      alpha: num(tagText(h,'ALPHA')),
      use: tagText(h,'USE'),
      time_min: num(tagText(h,'TIME')),
      form: tagText(h,'FORM')
    }));
    const yeasts = tagAll(r,'YEAST').map(y=>({
      name: tagText(y,'NAME'),
      type: tagText(y,'TYPE'),
      form: tagText(y,'FORM'),
      attenuation: num(tagText(y,'ATTENUATION'))
    }));
    const name = tagText(r,'NAME');
    const style_name = tagText(styleBlock,'NAME');
    const slug = bjcpSlugFor(name, style_name);
    return {
      source: 'diydog',
      source_file: filename,
      name,
      bjcp_slug: slug,
      bjcp_unmapped: slug === 'specialty_beer',
      style_name_brewdog: style_name,
      style_category: tagText(styleBlock,'CATEGORY'),
      type: tagText(r,'TYPE'),
      batch_size_l: num(tagText(r,'BATCH_SIZE')),
      boil_size_l: num(tagText(r,'BOIL_SIZE')),
      boil_time_min: num(tagText(r,'BOIL_TIME')),
      efficiency_pct: num(tagText(r,'EFFICIENCY')),
      og: num(tagText(r,'OG')) || num(tagText(r,'EST_OG')),
      fg: num(tagText(r,'FG')) || num(tagText(r,'EST_FG')),
      ibu: num(tagText(r,'IBU')) || num(tagText(r,'IBU_EST')),
      color_srm: num(tagText(r,'EST_COLOR')) || num(tagText(r,'COLOR')),
      fermentables: ferms,
      hops,
      yeasts
    };
  });
}

const files = fs.readdirSync(SRC_DIR).filter(f=>f.endsWith('.xml')).sort();
console.log('XML files:', files.length);
const allRecords = [];
let fileErrors = 0;
files.forEach(f=>{
  try {
    const xml = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
    const recs = parseBeerXML(xml, f);
    if(recs.length === 0) { fileErrors++; }
    allRecords.push(...recs);
  } catch(e){ fileErrors++; console.error('ERR', f, e.message); }
});
console.log('Total records parsed:', allRecords.length);
console.log('File errors:', fileErrors);

// Stats
const totalGood = allRecords.length;
const withName = allRecords.filter(r=>r.name).length;
const withFerm = allRecords.filter(r=>r.fermentables.length>=1).length;
const withHops = allRecords.filter(r=>r.hops.length>=1).length;
const withYeast = allRecords.filter(r=>r.yeasts.length>=1).length;
const mapped = allRecords.filter(r=>!r.bjcp_unmapped).length;
const unmapped = allRecords.filter(r=>r.bjcp_unmapped).length;

console.log('\n=== KALİTE METRİKLERİ ===');
console.log('Total:', totalGood);
console.log('with name:', withName, '('+(100*withName/totalGood).toFixed(1)+'%)');
console.log('with fermentables:', withFerm, '('+(100*withFerm/totalGood).toFixed(1)+'%)');
console.log('with hops:', withHops, '('+(100*withHops/totalGood).toFixed(1)+'%)');
console.log('with yeasts:', withYeast, '('+(100*withYeast/totalGood).toFixed(1)+'%)');
console.log('BJCP slug mapped:', mapped, '('+(100*mapped/totalGood).toFixed(1)+'%)');
console.log('BJCP slug unmapped (specialty_beer):', unmapped);

// BJCP slug distribution
const slugCount = {};
allRecords.forEach(r=>{slugCount[r.bjcp_slug]=(slugCount[r.bjcp_slug]||0)+1;});
const sortedSlugs = Object.entries(slugCount).sort((a,b)=>b[1]-a[1]);
console.log('\n=== BJCP slug dağılımı (top 20) ===');
sortedSlugs.slice(0,20).forEach(([s,n])=>console.log('  '+s.padEnd(40)+n));

// Top unmapped recipe names (first 10)
const unmappedNames = allRecords.filter(r=>r.bjcp_unmapped).slice(0,15).map(r=>r.name+' [style: '+r.style_name_brewdog+']');
console.log('\n=== Sample unmapped (specialty_beer fallback) ===');
unmappedNames.forEach(n=>console.log('  '+n));

const out = {
  _meta: {
    generated: new Date().toISOString(),
    source_repo: 'stuartraetaylor/diydog-beerxml',
    source_origin: 'Brewdog DIY Dog book (public)',
    total_files: files.length,
    parsed_records: totalGood,
    bjcp_mapped: mapped,
    bjcp_unmapped: unmapped,
    description: 'Brewdog DIY Dog book recipes parsed from BeerXML, BJCP slug heuristic applied'
  },
  records: allRecords
};
fs.writeFileSync('_v7_recipes_diydog.json', JSON.stringify(out, null, 2));
console.log('\nWrote _v7_recipes_diydog.json ('+(JSON.stringify(out).length/1024).toFixed(0)+' KB)');
