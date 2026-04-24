// Confusion pair analizi — 195 reçetenin fail pattern'larını kategori bazlı grupla
const { findBestMatches } = require('./style_engine.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const defs = require('./STYLE_DEFINITIONS.json');
const fams = require('./STYLE_FAMILIES.json').familyMap;

// ─── Stil grupları — patch tasarımı için ───
const STYLE_GROUPS = {
  'Belgian Strong': ['belgian_dubbel','belgian_tripel','belgian_strong_blonde_ale','belgian_strong_dark_ale','belgian_quadrupel'],
  'Belgian Pale': ['belgian_blonde_ale','belgian_speciale_belge','belgian_session_ale','belgian_table_beer','other_belgian_ale'],
  'Belgian Wit/Witbier': ['belgian_witbier'],
  'Lager Pale': ['munich_helles','german_pilsener','czech_pale_lager','dortmunder_european_export','italian_pilsener','american_pilsener','american_lager','american_light_lager','pre_prohibition_lager','west_coast_pilsener','new_zealand_pilsner','international_pale_lager','international_light_lager','mexican_light_lager','mexican_pale_lager','kellerbier','kellerbier_or_zwickelbier','american_cream_ale','german_leichtbier','rice_lager'],
  'Lager Amber': ['vienna_lager','czech_amber_lager','german_maerzen','german_oktoberfest_festbier','international_amber_lager','franconian_rotbier','american_amber_lager','american_maerzen_oktoberfest','mexican_amber_lager','bamberg_maerzen_rauchbier','california_common_beer'],
  'Lager Dark': ['munich_dunkel','german_schwarzbier','czech_dark_lager','international_dark_lager','mexican_dark_lager','american_dark_lager','european_dark_lager','baltic_porter','pre_prohibition_porter'],
  'Lager Bock': ['german_heller_bock_maibock','german_bock','german_doppelbock','german_eisbock','bamberg_bock_rauchbier'],
  'IPA classic': ['british_india_pale_ale','american_india_pale_ale','west_coast_india_pale_ale','session_india_pale_ale','india_pale_ale','ipa_argenta'],
  'IPA modern/hazy': ['juicy_or_hazy_india_pale_ale','double_ipa','new_zealand_india_pale_ale'],
  'IPA dark/specialty': ['black_ipa','brown_ipa','red_ipa','rye_ipa','white_ipa','brut_ipa','experimental_india_pale_ale','belgian_ipa','american_india_pale_lager'],
  'Stout Dry': ['irish_dry_stout','export_stout'],
  'Stout Sweet': ['sweet_stout_or_cream_stout','oatmeal_stout'],
  'Stout Imperial': ['american_imperial_stout','british_imperial_stout','dessert_stout_or_pastry_beer'],
  'Stout American': ['american_stout'],
  'Porter': ['brown_porter','american_porter','robust_porter','american_imperial_porter','smoke_porter'],
  'Brown Ale': ['english_brown_ale','american_brown_ale','english_dark_mild_ale','london_brown_ale'],
  'Pale American': ['american_pale_ale','american_amber_red_ale','juicy_or_hazy_pale_ale','golden_or_blonde_ale','session_beer','australian_pale_ale','new_zealand_pale_ale','international_pale_ale'],
  'English Bitter': ['ordinary_bitter','special_bitter_or_best_bitter','extra_special_bitter','english_pale_ale','english_pale_mild_ale','english_summer_ale'],
  'Scottish': ['scottish_light_ale','scottish_heavy_ale','scottish_export_ale','scotch_ale_or_wee_heavy'],
  'Strong Ale American': ['american_strong_pale_ale','american_barley_wine_ale','american_wheat_wine_ale','juicy_or_hazy_strong_pale_ale','imperial_red_ale','double_hoppy_red_ale','american_black_ale','other_strong_ale_or_lager'],
  'Strong Ale English': ['strong_ale','british_barley_wine_ale','old_ale'],
  'Weizen': ['south_german_hefeweizen','south_german_weizenbock','south_german_kristal_weizen','german_leichtes_weizen','south_german_bernsteinfarbenes_weizen','south_german_dunkel_weizen','american_wheat_beer','dunkles_weissbier'],
  'Saison/Farmhouse': ['french_belgian_saison','french_bi_re_de_garde','specialty_saison','sahti','finnish_sahti','swedish_gotlandsdricke'],
  'Kolsch/Altbier': ['german_koelsch','german_altbier'],
  'Irish Red': ['irish_red_ale'],
  'Sour kettle': ['berliner_weisse','gose','leipzig_gose','lichtenhainer','american_sour_ale','american_fruited_sour_ale'],
  'Lambic/Wild': ['belgian_lambic','belgian_gueuze','belgian_fruit_lambic','belgian_spontaneous_fermented_ale','brett_beer','straight_sour_beer','mixed_culture_brett_beer','wild_beer','mixed_fermentation_sour_beer'],
  'Flanders': ['flanders_red_ale','oud_bruin','belgian_flanders_oud_bruin_or_oud_red_ale'],
  'Specialty': [] // rest
};

function groupOf(slug) {
  for (const [g, slugs] of Object.entries(STYLE_GROUPS)) if (slugs.includes(slug)) return g;
  return 'Specialty';
}

const fails = [];
const confusion = {};
const expectedByGroup = {};
const winsByGroup = {};
const styleFails = {};

for (const raw of RAW_RECIPES) {
  const recipe = convertRawToEngineRecipe(raw);
  const top = findBestMatches(recipe, 5);
  const got = top[0]?.slug || '(yok)';
  const top3 = top.slice(0,3).map(m=>m.slug);
  const exp = raw.expected_slug;
  const expGrp = groupOf(exp);
  expectedByGroup[expGrp] = (expectedByGroup[expGrp]||0)+1;

  if (got === exp) {
    winsByGroup[expGrp] = (winsByGroup[expGrp]||0)+1;
    continue;
  }
  fails.push({ name: raw.data.name, exp, got, expGrp, gotGrp: groupOf(got), top3, t3: top3.includes(exp) });
  const key = exp + ' → ' + got;
  confusion[key] = (confusion[key]||0)+1;
  styleFails[exp] = (styleFails[exp]||0)+1;
}

// ═══ Rapor ═══
console.log('═'.repeat(80));
console.log('CONFUSION ANALIZI — ' + RAW_RECIPES.length + ' reçete');
console.log('═'.repeat(80));
console.log('\nTOP-1 başarısız: ' + fails.length + '/' + RAW_RECIPES.length);
console.log('Top-3 başarılı olan fail: ' + fails.filter(f=>f.t3).length + ' (top-3\'te var)');
console.log('\n─── Grup bazında başarı oranı ───');
Object.entries(expectedByGroup).sort((a,b)=>b[1]-a[1]).forEach(([g,total])=>{
  const wins = winsByGroup[g]||0;
  const pct = Math.round(wins/total*100);
  console.log('  '+g.padEnd(22)+' '+wins+'/'+total+' ('+pct+'%)');
});

console.log('\n─── En çok fail olan stiller (expected, >=2) ───');
Object.entries(styleFails).filter(([k,v])=>v>=2).sort((a,b)=>b[1]-a[1]).forEach(([s,n])=>{
  console.log('  '+n+'× '+s);
});

console.log('\n─── En çok görülen confusion pairs (>=2) ───');
Object.entries(confusion).filter(([k,v])=>v>=2).sort((a,b)=>b[1]-a[1]).forEach(([p,n])=>{
  console.log('  '+n+'× '+p);
});

console.log('\n─── Grup içi / dışı fail dağılımı ───');
const intra = fails.filter(f=>f.expGrp===f.gotGrp).length;
const inter = fails.length - intra;
console.log('  Aynı grup içinde (yakın-komşu): '+intra+' ('+Math.round(intra/fails.length*100)+'%)');
console.log('  Farklı grupta (uzak): '+inter+' ('+Math.round(inter/fails.length*100)+'%)');

console.log('\n─── Grup arası fail patern ───');
const interGroup = {};
fails.filter(f=>f.expGrp!==f.gotGrp).forEach(f=>{
  const key = f.expGrp + ' → ' + f.gotGrp;
  interGroup[key] = (interGroup[key]||0)+1;
});
Object.entries(interGroup).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([p,n])=>{
  console.log('  '+n+'× '+p);
});
