// Aile taksonomisini kurar ve STYLE_FAMILIES.json'a yazar.
// Her stil bir aileye atanir. Ayni ailedekiler tie-break'te birbirine karsi yarisir.
const fs = require('fs');
const defs = JSON.parse(fs.readFileSync(__dirname + '/STYLE_DEFINITIONS.json', 'utf8'));

// Slug-ozel override (kategori/pattern yetmiyorsa)
const OVERRIDES = {
  london_brown_ale: 'specialty',
  german_rye_ale:   'specialty',
  grodziskie:       'specialty',
  piwo_grodziskie:  'specialty',
  roggenbier:       'specialty',
  mixed_fermentation_sour_beer: 'wild',
  american_cream_ale: 'lager_pale',
  american_india_pale_lager: 'lager_pale',
  california_common_beer: 'lager_amber',
  kellerbier: 'lager_pale',
  kellerbier_or_zwickelbier: 'lager_pale',
  bamberg_helles_rauchbier: 'lager_pale',
  bamberg_weiss_rauchbier:  'weizen',
  bamberg_maerzen_rauchbier: 'lager_amber',
  bamberg_bock_rauchbier:   'lager_bock',
  american_wheat_beer: 'weizen',
  american_black_ale: 'ipa_dark',
  juicy_or_hazy_strong_pale_ale: 'strong_ale_american',
  imperial_red_ale: 'strong_ale_american',
  double_hoppy_red_ale: 'strong_ale_american',
  dessert_stout_or_pastry_beer: 'specialty',
  kentucky_common: 'lager_amber',
  kentucky_common_beer: 'lager_amber',
  pre_prohibition_lager: 'lager_pale',
  pre_prohibition_porter: 'lager_dark',
  // Session IPA karakter olarak APA'ya en yakin — ayni aile = tie-break'e dahil
  session_india_pale_ale: 'pale_american',
};

function assignFamily(slug, def) {
  if (OVERRIDES[slug]) return OVERRIDES[slug];
  const cat = def.category;

  if (cat === 'weizen')     return 'weizen';
  if (cat === 'witbier')    return 'witbier';
  if (cat === 'flanders')   return 'flanders';
  if (cat === 'lambic')     return 'lambic';
  if (cat === 'wild')       return 'wild';
  if (cat === 'farmhouse')  return 'farmhouse';
  if (cat === 'saison')     return 'saison';
  if (cat === 'specialty')  return 'specialty';
  if (cat === 'sour_kettle') return 'sour_kettle';

  if (cat === 'ipa') {
    if (/juicy|hazy/.test(slug))       return 'ipa_modern';
    if (/double|triple/.test(slug))    return 'ipa_modern';
    if (/new_zealand/.test(slug))      return 'ipa_modern';
    if (/black|brown|red|rye/.test(slug)) return 'ipa_dark';
    if (/white|brut|experimental|argenta/.test(slug)) return 'ipa_specialty';
    return 'ipa_classic';
  }

  if (cat === 'stout_porter') {
    if (/dry|irish/.test(slug))        return 'stout_dry';
    if (/sweet|cream|oatmeal/.test(slug)) return 'stout_sweet';
    if (/imperial/.test(slug))         return 'stout_imperial';
    if (/porter/.test(slug))           return 'porter';
    return 'stout_american';
  }

  if (cat === 'strong_ale') {
    if (/american/.test(slug))                return 'strong_ale_american';
    if (/imperial|double_hoppy/.test(slug))   return 'strong_ale_american';
    if (/juicy|hazy/.test(slug))              return 'strong_ale_american';
    if (/black/.test(slug))                   return 'ipa_dark';
    return 'strong_ale_english';
  }

  if (cat === 'belgian') {
    if (/dubbel|tripel|strong_blonde|strong_dark|quadrupel/.test(slug)) return 'belgian_strong';
    if (/witbier/.test(slug))  return 'witbier';
    if (/belgian_ipa/.test(slug)) return 'belgian_other';
    if (/fruit/.test(slug))    return 'belgian_other';
    if (/spice_herb/.test(slug)) return 'specialty';
    return 'belgian_pale';
  }

  if (cat === 'ale') {
    if (/scottish|scotch|wee_heavy/.test(slug)) return 'scottish_ale';
    if (/ordinary_bitter|special_bitter|best_bitter|extra_special|english_pale|english_summer|english_dark_mild/.test(slug)) return 'english_bitter';
    if (/koelsch|altbier/.test(slug)) return 'kolsch_altbier';
    if (/irish/.test(slug))           return 'irish_ale';
    if (/american_pale|american_amber|golden|blonde|juicy|hazy/.test(slug)) return 'pale_american';
    if (/session/.test(slug))         return 'pale_american';
    return 'pale_american';
  }

  if (cat === 'lager') {
    if (/light|american_lager|american_pilsener|pilsener|pils|helles|leichtbier|dortmunder|rice_lager|malt_liquor|czech_pale|mexican_pale|mexican_light|international_pale|international_light/.test(slug)) return 'lager_pale';
    if (/maerzen|oktoberfest|amber|vienna|rotbier|international_amber|mexican_amber/.test(slug)) return 'lager_amber';
    if (/dunkel|schwarz|dark|baltic_porter|international_dark|mexican_dark|european_dark/.test(slug)) return 'lager_dark';
    if (/bock|doppel|eis|maibock/.test(slug)) return 'lager_bock';
    return 'lager_pale';
  }

  if (cat === 'other') {
    if (slug === 'vienna_lager')       return 'lager_amber';
    if (slug === 'munich_dunkel')      return 'lager_dark';
    if (slug === 'australian_pale_ale') return 'pale_american';
    if (slug === 'english_brown_ale')  return 'brown_ale';
    if (slug === 'american_brown_ale') return 'brown_ale';
    if (/international_pale_ale|new_zealand_pale_ale/.test(slug)) return 'pale_american';
    return 'pale_american';
  }

  return 'unknown';
}

const famMap = {};
Object.keys(defs).forEach(slug => {
  famMap[slug] = assignFamily(slug, defs[slug]);
});

// Tie-break konfigi — aile ici ayristiricilar
// boostFields: hangi scalar/marker alanlarinin ham skor agirligi ×mult olacak
// markerBoost: hangi marker anahtarlarinin ×mult olacak (markers objesinde key)
const FAMILY_DISCRIMINATORS = {
  // Agresif agirliklar — safe+marginal farklarinin gorunur olmasi icin 2.5-3.0 band
  belgian_strong:       { boostFields: ['abv','og','ibu','srm'], multiplier: 2.5 },
  scottish_ale:         { boostFields: ['abv','og'],             multiplier: 2.5 },
  english_bitter:       { boostFields: ['abv','ibu'],            multiplier: 2.5 },
  lager_pale:           { boostFields: ['ibu','abv'],            multiplier: 2.8 },
  lager_amber:          { boostFields: ['srm','abv','ibu'],      multiplier: 2.5 },
  lager_dark:           { boostFields: ['srm','abv'],            multiplier: 2.2 },
  lager_bock:           { boostFields: ['abv','og'],             multiplier: 2.5 },
  ipa_classic:          { boostFields: ['abv','ibu','srm'],      multiplier: 2.5 },
  ipa_modern:           { boostFields: ['abv','ibu'],            multiplier: 2.0 },
  stout_imperial:       { boostFields: ['abv','og'],             multiplier: 3.0 },
  stout_sweet:          { boostFields: ['abv','srm'],            multiplier: 2.5 },
  stout_american:       { boostFields: ['abv','srm'],            multiplier: 2.5 },
  porter:               { boostFields: ['abv','srm'],            multiplier: 2.0 },
  strong_ale_american:  { boostFields: ['abv','ibu'],            multiplier: 2.2 },
  strong_ale_english:   { boostFields: ['abv','og'],             multiplier: 2.2 },
  weizen:               { boostFields: ['abv','srm'],            multiplier: 2.0 },
  saison:               { boostFields: ['srm','abv'],            multiplier: 2.2 },
  sour_kettle:          { boostFields: ['srm','abv'],            multiplier: 2.0 },
  lambic:               { boostFields: [],                       multiplier: 1.0 },
  flanders:             { boostFields: ['srm','abv'],            multiplier: 1.5 },
  belgian_pale:         { boostFields: ['abv','og'],             multiplier: 2.0 },
  pale_american:        { boostFields: ['abv','ibu'],            multiplier: 2.2 },
  brown_ale:            { boostFields: ['abv','srm'],            multiplier: 2.0 },
  irish_ale:            { boostFields: ['abv','srm'],            multiplier: 1.5 },
  kolsch_altbier:       { boostFields: ['srm'],                  multiplier: 1.5 },
  wild:                 { boostFields: [],                       multiplier: 1.0 },
  farmhouse:            { boostFields: [],                       multiplier: 1.0 },
  ipa_dark:             { boostFields: ['srm','abv'],            multiplier: 2.0 },
  ipa_specialty:        { boostFields: ['abv'],                  multiplier: 1.5 },
};

// Specialty cap — bu ailedekiler max %85'te sinirlanir
const SPECIALTY_CAP_FAMILIES = ['specialty'];
const SPECIALTY_CAP_NORMALIZED = 85;

// Ozet
const counts = {};
Object.values(famMap).forEach(f => counts[f] = (counts[f]||0)+1);
console.log('Aile dagilimi:');
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([f,c]) => console.log('  '+c+'\t'+f));
console.log('\nToplam:', Object.keys(famMap).length, 'stil,', Object.keys(counts).length, 'aile');

fs.writeFileSync(__dirname + '/STYLE_FAMILIES.json', JSON.stringify({
  familyMap: famMap,
  discriminators: FAMILY_DISCRIMINATORS,
  specialtyCapFamilies: SPECIALTY_CAP_FAMILIES,
  specialtyCapNormalized: SPECIALTY_CAP_NORMALIZED,
}, null, 2));
console.log('\n→ STYLE_FAMILIES.json yazildi');
