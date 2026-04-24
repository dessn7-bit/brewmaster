// Build hierarchy_map.json — 4 ferm_type x 18 family mapping
// Kaynak: STYLE_FAMILIES.json (33 mevcut aile) + istisna override
const fs = require('fs');
const fams = JSON.parse(fs.readFileSync(__dirname + '/STYLE_FAMILIES.json', 'utf8'));
const familyMap = fams.familyMap;

// ═══ Eski aile → yeni (ferm_type, family) varsayilan atama ═══
const OLD_TO_NEW = {
  // ═ ALE ═
  english_bitter:       ['ale', 'english'],
  brown_ale:            ['ale', 'english'],          // english brown; american_brown override
  scottish_ale:         ['ale', 'english'],
  irish_ale:            ['ale', 'english'],
  porter:               ['ale', 'english'],          // brown/robust porter; american_porter override
  stout_dry:            ['ale', 'english'],
  stout_sweet:          ['ale', 'english'],
  stout_american:       ['ale', 'american'],
  stout_imperial:       ['ale', 'american'],         // american imperial default; british override
  strong_ale_english:   ['ale', 'english'],
  strong_ale_american:  ['ale', 'american'],
  pale_american:        ['ale', 'american'],
  ipa_classic:          ['ale', 'american'],         // american IPA default; british/NZ override
  ipa_modern:           ['ale', 'american'],
  ipa_dark:             ['ale', 'american'],
  ipa_specialty:        ['ale', 'american'],
  belgian_pale:         ['ale', 'belgian'],
  belgian_strong:       ['ale', 'belgian'],
  saison:               ['ale', 'belgian'],
  witbier:              ['ale', 'belgian'],
  belgian_other:        ['ale', 'belgian'],
  weizen:               ['ale', 'wheat_german'],
  specialty:            ['ale', 'specialty_adjunct'],    // default — istisnalar override
  farmhouse:            ['ale', 'specialty_historical'],  // sahti/gotland

  // ═ LAGER ═ (alt aile: origin bazli)
  lager_pale:           ['lager', 'german_lager'],   // default — istisnalar override
  lager_amber:          ['lager', 'german_lager'],
  lager_dark:           ['lager', 'german_lager'],
  lager_bock:           ['lager', 'german_lager'],

  // ═ WILD ═
  lambic:               ['wild', 'lambic'],
  flanders:             ['wild', 'flanders'],
  wild:                 ['wild', 'mixed_ferm'],
  sour_kettle:          ['wild', 'mixed_ferm'],      // default — american istisna override

  // ═ HYBRID ═
  kolsch_altbier:       ['hybrid', 'kolsch'],        // default kolsch — altbier override
};

// ═══ Stil bazli istisnalar (override) ═══
const OVERRIDES = {
  // ─── Ale: amerikali/ingiliz ayrimi ───
  american_brown_ale:                 ['ale', 'american'],
  american_porter:                    ['ale', 'american'],
  american_imperial_porter:           ['ale', 'american'],
  smoke_porter:                       ['ale', 'american'],
  british_imperial_stout:             ['ale', 'english'],
  british_india_pale_ale:             ['ale', 'english'],
  english_pale_ale:                   ['ale', 'english'],
  new_zealand_india_pale_ale:         ['ale', 'american'],  // modern hoppy = american tradisyon
  new_zealand_pale_ale:               ['ale', 'american'],
  international_pale_ale:             ['ale', 'american'],

  // ─── Farmhouse/Saison edge ───
  french_bi_re_de_garde:              ['ale', 'belgian'],
  french_belgian_saison:              ['ale', 'belgian'],
  specialty_saison:                   ['ale', 'belgian'],
  sahti:                              ['ale', 'specialty_ale'],
  finnish_sahti:                      ['ale', 'specialty_ale'],
  swedish_gotlandsdricke:             ['ale', 'specialty_ale'],
  grodziskie:                         ['ale', 'specialty_ale'],
  piwo_grodziskie:                    ['ale', 'specialty_ale'],
  adambier:                           ['ale', 'specialty_ale'],
  dutch_kuit_kuyt_or_koyt:            ['ale', 'specialty_ale'],
  roggenbier:                         ['ale', 'wheat_german'],  // rye ale, german tarz
  rye_beer:                           ['ale', 'american'],
  german_rye_ale:                     ['ale', 'wheat_german'],
  bamberg_weiss_rauchbier:            ['ale', 'wheat_german'],

  // ─── IPA koken istisna ───
  // (yukarida halledildi)

  // ─── Belgian IPA/fruit ───
  belgian_ipa:                        ['ale', 'belgian'],
  belgian_fruit_beer:                 ['ale', 'belgian'],

  // ─── Weizen ailesi ───
  south_german_hefeweizen:            ['ale', 'wheat_german'],
  south_german_weizenbock:            ['ale', 'wheat_german'],
  south_german_kristal_weizen:        ['ale', 'wheat_german'],
  german_leichtes_weizen:             ['ale', 'wheat_german'],
  south_german_bernsteinfarbenes_weizen: ['ale', 'wheat_german'],
  south_german_dunkel_weizen:         ['ale', 'wheat_german'],
  american_wheat_beer:                ['ale', 'american'],
  american_wheat_wine_ale:            ['ale', 'american'],

  // ─── LAGER koken bazli ayrim ───
  // American lager familyas:
  american_light_lager:               ['lager', 'american_lager'],
  american_lager:                     ['lager', 'american_lager'],
  american_cream_ale:                 ['lager', 'american_lager'],  // hibrit ama ticari american
  american_pilsener:                  ['lager', 'american_lager'],
  american_india_pale_lager:          ['lager', 'american_lager'],
  american_malt_liquor:               ['lager', 'american_lager'],
  american_amber_lager:               ['lager', 'american_lager'],
  american_maerzen_oktoberfest:       ['lager', 'american_lager'],
  american_dark_lager:                ['lager', 'american_lager'],
  mexican_light_lager:                ['lager', 'american_lager'],
  mexican_pale_lager:                 ['lager', 'american_lager'],
  mexican_amber_lager:                ['lager', 'american_lager'],
  mexican_dark_lager:                 ['lager', 'american_lager'],
  west_coast_pilsener:                ['lager', 'american_lager'],
  pre_prohibition_lager:              ['lager', 'american_lager'],
  pre_prohibition_porter:             ['lager', 'american_lager'],
  rice_lager:                         ['lager', 'american_lager'],
  international_light_lager:          ['lager', 'american_lager'],
  international_pale_lager:           ['lager', 'american_lager'],
  international_pilsener:             ['lager', 'american_lager'],
  international_amber_lager:          ['lager', 'american_lager'],
  international_dark_lager:           ['lager', 'american_lager'],

  // Czech lager familya:
  czech_pale_lager:                   ['lager', 'czech_lager'],
  czech_amber_lager:                  ['lager', 'czech_lager'],
  czech_dark_lager:                   ['lager', 'czech_lager'],

  // German lager (default zaten german_lager, bu sadece belirginlik icin):
  // italian_pilsener German tradition ama italyan → specialty
  italian_pilsener:                   ['lager', 'specialty_lager'],
  new_zealand_pilsner:                ['lager', 'specialty_lager'],

  // Specialty lagers:
  baltic_porter:                      ['lager', 'specialty_lager'],
  kentucky_common:                    ['lager', 'specialty_lager'],
  kentucky_common_beer:               ['lager', 'specialty_lager'],
  breslau_schoeps:                    ['lager', 'specialty_lager'],

  // California Common: LAGER yeast, ALE temp → HYBRID (bu en dogru)
  california_common_beer:             ['hybrid', 'california_common'],

  // ─── HYBRID ───
  german_koelsch:                     ['hybrid', 'kolsch'],
  german_altbier:                     ['hybrid', 'altbier'],

  // ─── WILD ayrimi ───
  // sour_kettle default mixed_ferm; american olanlar → american_wild
  american_sour_ale:                  ['wild', 'american_wild'],
  american_fruited_sour_ale:          ['wild', 'american_wild'],
  // berliner/gose/lichtenhainer/leipzig → mixed_ferm (German tarih, mixed culture)
  // (default zaten mixed_ferm, override gerekmez)

  // Wild (brett) subtypes:
  brett_beer:                         ['wild', 'american_wild'],   // modern brett ale = amerikan
  mixed_culture_brett_beer:           ['wild', 'mixed_ferm'],
  mixed_fermentation_sour_beer:       ['wild', 'mixed_ferm'],
  straight_sour_beer:                 ['wild', 'mixed_ferm'],
  wild_beer:                          ['wild', 'mixed_ferm'],

  // Belgian spontaneous → lambic
  belgian_spontaneous_fermented_ale:  ['wild', 'lambic'],

  // ─── Specialty ALT-AILE ayrimi (3'e bolundu) ───
  london_brown_ale:                   ['ale', 'english'],
  dessert_stout_or_pastry_beer:       ['ale', 'american'],           // pastry stout = american
  american_fruit_beer:                ['ale', 'american'],
  american_belgo_ale:                 ['ale', 'belgian'],
  fresh_hop_beer:                     ['ale', 'american'],
  wood_and_barrel_aged_sour_beer:     ['wild', 'mixed_ferm'],

  // specialty_adjunct: meyve/bitki/adjunct_type hard marker
  fruit_beer:                         ['ale', 'specialty_adjunct'],
  fruit_and_spice_beer:               ['ale', 'specialty_adjunct'],
  fruit_wheat_beer:                   ['ale', 'specialty_adjunct'],   // (override — once belgian/specialty_ale degildi)
  spice_herb_or_vegetable_beer:       ['ale', 'specialty_adjunct'],
  herb_and_spice_beer:                ['ale', 'specialty_adjunct'],
  autumn_seasonal_beer:               ['ale', 'specialty_adjunct'],
  winter_seasonal_beer:               ['ale', 'specialty_adjunct'],
  style_smoked_beer:                  ['ale', 'specialty_adjunct'],
  specialty_smoked_beer:              ['ale', 'specialty_adjunct'],
  smoke_beer:                         ['ale', 'specialty_adjunct'],
  grape_ale:                          ['ale', 'specialty_adjunct'],
  italian_grape_ale:                  ['ale', 'specialty_adjunct'], // IGA: uzum/vinification adjunct (belgian degil)
  chocolate_or_cocoa_beer:            ['ale', 'specialty_adjunct'],
  coffee_beer:                        ['ale', 'specialty_adjunct'],
  chili_pepper_beer:                  ['ale', 'specialty_adjunct'],
  specialty_honey_beer:               ['ale', 'specialty_adjunct'],
  pumpkin_spice_beer:                 ['ale', 'specialty_adjunct'],
  pumpkin_squash_beer:                ['ale', 'specialty_adjunct'],
  field_beer:                         ['ale', 'specialty_adjunct'],

  // specialty_historical: origin/technique markerlari
  sahti:                              ['ale', 'specialty_historical'],
  finnish_sahti:                      ['ale', 'specialty_historical'],
  swedish_gotlandsdricke:             ['ale', 'specialty_historical'],
  grodziskie:                         ['ale', 'specialty_historical'],
  piwo_grodziskie:                    ['ale', 'specialty_historical'],
  adambier:                           ['ale', 'specialty_historical'],
  dutch_kuit_kuyt_or_koyt:            ['ale', 'specialty_historical'],
  historical_beer:                    ['ale', 'specialty_historical'],

  // specialty_strength_format: ABV/format variant (dusuk veya yuksek)
  non_alcohol_malt_beverage:          ['ale', 'specialty_strength_format'],
  gluten_free_beer:                   ['ale', 'specialty_strength_format'],
  experimental_beer:                  ['ale', 'specialty_strength_format'],
  specialty_beer:                     ['ale', 'specialty_strength_format'],
  other_strong_ale_or_lager:          ['ale', 'specialty_strength_format'],
  aged_beer:                          ['ale', 'specialty_strength_format'],
  wood_aged_beer:                     ['ale', 'specialty_strength_format'],
  specialty_wood_aged_beer:           ['ale', 'specialty_strength_format'],
  wood_and_barrel_aged_beer:          ['ale', 'specialty_strength_format'],
  ginjo_beer_or_sake_yeast_beer:      ['ale', 'specialty_strength_format'],

  // Rauch lager sub-family:
  bamberg_maerzen_rauchbier:          ['lager', 'german_lager'],
  bamberg_helles_rauchbier:           ['lager', 'german_lager'],
  bamberg_bock_rauchbier:             ['lager', 'german_lager'],

  franconian_rotbier:                 ['lager', 'german_lager'],
  european_dark_lager:                ['lager', 'german_lager'],
  kellerbier:                         ['lager', 'german_lager'],
  kellerbier_or_zwickelbier:          ['lager', 'german_lager'],
};

// ═══ 18 aile tanimi (ferm_type altinda) ═══
const FERM_TYPES = {
  ale: {
    label: 'Ale',
    families: ['english', 'american', 'belgian', 'wheat_german',
               'specialty_adjunct', 'specialty_historical', 'specialty_strength_format'],
    yeast_rx: null,  // default (ale yeast — eksik eleme mantigi)
  },
  lager: {
    label: 'Lager',
    families: ['german_lager', 'czech_lager', 'american_lager', 'specialty_lager'],
    yeast_rx: /(34[\/\-]?70|wlp830|wlp833|wlp838|wlp840|wlp920|s[\-]?23|s[\-]?189|w[\-]?34[\/\-]?70|2633|2278|2206|2001|2042|2124|saflager|fermoale l|urkel|czech lager|bohemian lager|lager yeast|bavarian lager|mexican lager|german lager)/i,
  },
  wild: {
    label: 'Wild',
    families: ['lambic', 'flanders', 'american_wild', 'mixed_ferm'],
    yeast_rx: /(brett|brettanomyces|lacto|lactobacillus|pedio|pediococcus|sour blend|roeselare|lambic|melange|flanders|mixed culture|wyeast 3278|wyeast 3763|wlp655|wlp645|wlp665|wlp670|philly sour|omega lutra|omega hothead)/i,
  },
  hybrid: {
    label: 'Hybrid',
    families: ['kolsch', 'altbier', 'california_common'],
    yeast_rx: /(kolsch|k[oö]lsch|wlp029|wy2565|altbier|wy1007|wy2124|wlp036|wlp810|calfornia common|wlp810|california lager)/i,
  },
};

// ═══ Ferm_type hard gate logic — hierarchy_map'e yaz ═══
// classification sirasinda kullanilacak:
// 1) wild_rx match → wild
// 2) hybrid_rx match → hybrid
// 3) lager_rx match → lager
// 4) default → ale

const hierarchy = {};
let missing = [];
Object.keys(familyMap).forEach(slug => {
  const old = familyMap[slug];
  let node;
  if (OVERRIDES[slug]) {
    node = OVERRIDES[slug];
  } else if (OLD_TO_NEW[old]) {
    node = OLD_TO_NEW[old];
  } else {
    missing.push(slug + ' (old=' + old + ')');
    return;
  }
  hierarchy[slug] = { ferm_type: node[0], family: node[1], old_family: old };
});

// ═══ CIKTI ═══
const out = {
  version: '1.0',
  generated: new Date().toISOString(),
  ferm_types: FERM_TYPES,
  styles: hierarchy,
};

fs.writeFileSync(__dirname + '/hierarchy_map.json', JSON.stringify(out, null, 2));

// ═══ OZET ═══
const summary = {};
Object.values(hierarchy).forEach(h => {
  const k = h.ferm_type + '/' + h.family;
  summary[k] = (summary[k]||0) + 1;
});
console.log('Toplam stil: ' + Object.keys(hierarchy).length);
console.log('Eksik: ' + missing.length);
if (missing.length) console.log('  → ', missing);
console.log('\nDagilim:');
const sorted = Object.entries(summary).sort((a,b)=>b[1]-a[1]);
sorted.forEach(([k,v])=>console.log('  ' + k.padEnd(35) + ' ' + v));

// Her aile icindeki stiller listesi
console.log('\n--- Her aile icindeki stiller ---');
const byFamily = {};
Object.entries(hierarchy).forEach(([slug,h])=>{
  const k = h.ferm_type + '/' + h.family;
  (byFamily[k]=byFamily[k]||[]).push(slug);
});
Object.keys(byFamily).sort().forEach(k=>{
  console.log('\n[' + k + '] (' + byFamily[k].length + ')');
  byFamily[k].sort().forEach(s=>console.log('  - ' + s));
});
