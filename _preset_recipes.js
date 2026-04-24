// Brewmaster preset test reçeteleri — 15 çeşitli stil
// Her reçete: primary_expected (ana doğru) + acceptable_alternatives (kabul edilebilir diğerleri)
// Geçme kriteri: top-1 winner ∈ {primary ∪ alts}, top-3 için aynı kural
// Zorluk: kolay (açık sinyal) | orta (overlap var) | zor (kenar) | sınır (belirsiz)
//
// Her recipe objesi yeni motor formatında.
// HTML adapter'inin urettigi percents seti tam doldurulur (0'lar dahil).

function fullPercents(partial) {
  const defaults = {
    pilsnerPct: 0, wheatPct: 0, oatsWheatPct: 0, oatsPct: 0,
    munichPct: 0, viennaPct: 0, crystalPct: 0, chocPct: 0, roastPct: 0,
    cornPct: 0, ricePct: 0, sugarPct: 0,
    aromaticMunichPct: 0, aromaticAbbeyMunichPct: 0,
    baseMaltPct: 0, adjPct: 0, smokedPct: 0, ryePct: 0,
  };
  return Object.assign(defaults, partial);
}

const PRESETS = [
  // ═══════════════════ 1. KLASIK NEIPA ═══════════════════
  {
    id: 'neipa_classic',
    name: 'Klasik NEIPA (Citra+Mosaic, oat, dip)',
    primary_expected: 'juicy_or_hazy_india_pale_ale',
    acceptable_alternatives: ['american_india_pale_ale'],
    difficulty: 'kolay',
    notes: 'Citra/Mosaic aroma forward, oat body, US-05',
    recipe: {
      _og: 1.065, _fg: 1.014, _ibu: 35, _srm: 4.5, _abv: 6.7, _mayaTip: 'ale',
      mayaId: 'us05', maya2Id: '',
      hopIds: ['citra', 'mosaic', 'amarillo'],
      maltIds: ['pale', 'wheat', 'oats', 'flaked_oats', 'crystal_light'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 95, pilsnerPct: 60, wheatPct: 20, oatsPct: 15, oatsWheatPct: 35, crystalPct: 3 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 3, blended: false,
    },
  },
  // ═══════════════════ 2. KLASIK APA ═══════════════════
  {
    id: 'apa_cascade',
    name: 'Klasik APA (Cascade, krystal, US-05)',
    primary_expected: 'american_pale_ale',
    acceptable_alternatives: ['juicy_or_hazy_pale_ale', 'american_amber_red_ale'],
    difficulty: 'kolay',
    notes: 'Cascade forward, light crystal malt, standard APA',
    recipe: {
      _og: 1.055, _fg: 1.012, _ibu: 40, _srm: 8, _abv: 5.6, _mayaTip: 'ale',
      mayaId: 'us05', maya2Id: '',
      hopIds: ['cascade', 'centennial'],
      maltIds: ['pale', 'crystal', 'munich'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 85, pilsnerPct: 80, crystalPct: 8, munichPct: 7 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 1, blended: false,
    },
  },
  // ═══════════════════ 3. BELGIAN DUBBEL ═══════════════════
  {
    id: 'belgian_dubbel',
    name: 'Klasik Belgian Dubbel (Special B, Abbey maya)',
    primary_expected: 'belgian_dubbel',
    acceptable_alternatives: [],
    difficulty: 'kolay',
    notes: 'Pilsner + Special B + Munich, Abbey yeast, dark candi',
    recipe: {
      _og: 1.065, _fg: 1.013, _ibu: 22, _srm: 20, _abv: 6.8, _mayaTip: 'belcika',
      mayaId: 'wy3787', maya2Id: '',
      hopIds: ['styrian', 'saaz'],
      maltIds: ['pilsner', 'munich', 'special_b', 'candy_drk', 'aromatic'],
      katkiIds: ['candy_drk'],
      percents: fullPercents({ baseMaltPct: 75, pilsnerPct: 65, munichPct: 15, crystalPct: 0, chocPct: 2, sugarPct: 10, aromaticAbbeyMunichPct: 8 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 4. IMPERIAL STOUT ═══════════════════
  {
    id: 'imperial_stout',
    name: 'Russian Imperial Stout (roast + choc, English Ale)',
    primary_expected: 'american_imperial_stout',
    acceptable_alternatives: ['british_imperial_stout'],
    difficulty: 'orta',
    notes: 'Heavy roast, chocolate, high ABV. Could also hit british_imperial_stout.',
    recipe: {
      _og: 1.095, _fg: 1.024, _ibu: 60, _srm: 40, _abv: 9.3, _mayaTip: 'ale',
      mayaId: 'wy1084', maya2Id: '',
      hopIds: ['columbus', 'cascade'],
      maltIds: ['pale', 'chocolate', 'roasted_barley', 'crystal_dark', 'munich'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 75, pilsnerPct: 65, munichPct: 5, crystalPct: 8, chocPct: 8, roastPct: 8 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 5. GERMAN PILS ═══════════════════
  {
    id: 'german_pils',
    name: 'German Pilsener (Saaz, classic bitter)',
    primary_expected: 'german_pilsener',
    acceptable_alternatives: ['czech_pale_lager', 'italian_pilsener', 'american_pilsener'],
    difficulty: 'kolay',
    notes: 'Clean lager, Saaz heavy, bitter-forward',
    recipe: {
      _og: 1.047, _fg: 1.010, _ibu: 35, _srm: 3.5, _abv: 4.9, _mayaTip: 'lager',
      mayaId: 'wy2124', maya2Id: '',
      hopIds: ['saaz', 'hallertau'],
      maltIds: ['pilsner'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 100, pilsnerPct: 100 }),
      lactose: false, filtered: true, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 6. HEFEWEIZEN ═══════════════════
  {
    id: 'hefeweizen',
    name: 'South German Hefeweizen (wheat 55%, wb06)',
    primary_expected: 'south_german_hefeweizen',
    acceptable_alternatives: ['south_german_kristal_weizen', 'american_wheat_beer'],
    difficulty: 'kolay',
    notes: 'Classic textbook Hefeweizen',
    recipe: {
      _og: 1.050, _fg: 1.012, _ibu: 12, _srm: 5, _abv: 5.0, _mayaTip: 'wheat',
      mayaId: 'wb06', maya2Id: '',
      hopIds: ['hallertau', 'tettnang'],
      maltIds: ['wheat', 'pilsner'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 100, pilsnerPct: 45, wheatPct: 55, oatsWheatPct: 55 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 7. SAISON ═══════════════════
  {
    id: 'saison_classic',
    name: 'Klasik Saison (Biscuit + Saison, yüksek atten)',
    primary_expected: 'french_belgian_saison',
    acceptable_alternatives: ['specialty_saison', 'french_bi_re_de_garde'],
    difficulty: 'kolay',
    notes: 'Pilsner + biscuit, saison yeast, FG düşük',
    recipe: {
      _og: 1.055, _fg: 1.006, _ibu: 28, _srm: 5, _abv: 6.5, _mayaTip: 'saison',
      mayaId: 'wy3724', maya2Id: '',
      hopIds: ['styrian', 'ekg', 'saaz'],
      maltIds: ['pilsner', 'wheat', 'biscuit', 'munich'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 88, pilsnerPct: 80, wheatPct: 8, munichPct: 8, oatsWheatPct: 8 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 8. BELGIAN WITBIER ═══════════════════
  {
    id: 'witbier',
    name: 'Belgian Witbier (coriander + portakal)',
    primary_expected: 'belgian_witbier',
    acceptable_alternatives: [],
    difficulty: 'kolay',
    notes: 'Wheat + oats + coriander + orange peel',
    recipe: {
      _og: 1.048, _fg: 1.010, _ibu: 15, _srm: 3, _abv: 5.0, _mayaTip: 'wit',
      mayaId: 'wy3944', maya2Id: '',
      hopIds: ['hallertau', 'saaz'],
      maltIds: ['pilsner', 'wheat', 'oats'],
      katkiIds: ['koriander', 'portakal'],
      percents: fullPercents({ baseMaltPct: 95, pilsnerPct: 50, wheatPct: 45, oatsPct: 5, oatsWheatPct: 50 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 9. BALTIC PORTER ═══════════════════
  {
    id: 'baltic_porter',
    name: 'Baltic Porter (Munich + roast, lager)',
    primary_expected: 'baltic_porter',
    acceptable_alternatives: ['european_dark_lager'],
    difficulty: 'orta',
    notes: 'Yüksek ABV dark lager, Munich heavy, lager yeast',
    recipe: {
      _og: 1.080, _fg: 1.020, _ibu: 35, _srm: 30, _abv: 7.9, _mayaTip: 'lager',
      mayaId: 'wy2124', maya2Id: '',
      hopIds: ['saaz', 'hallertau'],
      maltIds: ['pilsner', 'munich', 'chocolate', 'roasted_barley', 'crystal'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 80, pilsnerPct: 40, munichPct: 35, crystalPct: 5, chocPct: 8, roastPct: 5 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 10. AMERICAN IPA ═══════════════════
  {
    id: 'american_ipa',
    name: 'American IPA (Cascade+Centennial, pale+crystal)',
    primary_expected: 'american_india_pale_ale',
    acceptable_alternatives: ['west_coast_india_pale_ale', 'british_india_pale_ale'],
    difficulty: 'kolay',
    notes: 'Classic West-Coast style IPA, crystal malt, aggressive late hop',
    recipe: {
      _og: 1.062, _fg: 1.013, _ibu: 65, _srm: 9, _abv: 6.4, _mayaTip: 'ale',
      mayaId: 'us05', maya2Id: '',
      hopIds: ['cascade', 'centennial', 'columbus', 'simcoe'],
      maltIds: ['pale', 'crystal', 'munich'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 88, pilsnerPct: 80, crystalPct: 7, munichPct: 5 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 1.5, blended: false,
    },
  },
  // ═══════════════════ 11. DOPPELBOCK ═══════════════════
  {
    id: 'doppelbock',
    name: 'Doppelbock (Munich + Vienna, lager)',
    primary_expected: 'german_doppelbock',
    acceptable_alternatives: ['german_bock', 'german_eisbock'],
    difficulty: 'orta',
    notes: 'Rich malty lager, Munich heavy, high ABV',
    recipe: {
      _og: 1.080, _fg: 1.018, _ibu: 22, _srm: 18, _abv: 8.2, _mayaTip: 'lager',
      mayaId: 'wy2124', maya2Id: '',
      hopIds: ['hallertau', 'tettnang'],
      maltIds: ['munich', 'pilsner', 'vienna', 'crystal'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 95, pilsnerPct: 25, munichPct: 55, viennaPct: 15, crystalPct: 3 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 12. BERLINER WEISSE ═══════════════════
  {
    id: 'berliner_weisse',
    name: 'Berliner Weisse (laktik, düşük ABV, wheat)',
    primary_expected: 'berliner_weisse',
    acceptable_alternatives: ['gose', 'leipzig_gose'],
    difficulty: 'kolay',
    notes: 'Sour wheat beer, very light, laktik fermented',
    recipe: {
      _og: 1.032, _fg: 1.006, _ibu: 5, _srm: 3, _abv: 3.4, _mayaTip: 'sour',
      mayaId: 'lacto_plantarum', maya2Id: 'us05',
      hopIds: ['hallertau'],
      maltIds: ['pilsner', 'wheat'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 100, pilsnerPct: 50, wheatPct: 50, oatsWheatPct: 50 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 13. MILK STOUT ═══════════════════
  {
    id: 'milk_stout',
    name: 'Milk Stout (laktoz + chocolate + roast)',
    primary_expected: 'sweet_stout_or_cream_stout',
    acceptable_alternatives: ['oatmeal_stout'],
    difficulty: 'orta',
    notes: 'Lactose sweet, roasty, English ale',
    recipe: {
      _og: 1.055, _fg: 1.018, _ibu: 25, _srm: 32, _abv: 4.8, _mayaTip: 'ale',
      mayaId: 'wy1084', maya2Id: '',
      hopIds: ['ekg', 'fuggle'],
      maltIds: ['pale', 'chocolate', 'roasted_barley', 'crystal', 'flaked_oats'],
      katkiIds: ['laktoz'],
      percents: fullPercents({ baseMaltPct: 75, pilsnerPct: 70, crystalPct: 10, chocPct: 8, roastPct: 7, oatsPct: 5 }),
      lactose: true, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 14. KAAN HOPPY WHEAT ═══════════════════
  {
    id: 'kaan_hoppy_wheat',
    name: 'Kaan Hoppy Wheat (Buğday 71% + Maris, IBU 28)',
    primary_expected: 'american_wheat_beer',
    acceptable_alternatives: ['south_german_weizenbock', 'south_german_hefeweizen'],
    difficulty: 'sınır',
    notes: 'Gerçek reçete — ABV 6.01 hem Hefe hem Weizenbock sınırında. American Wheat en makul primary.',
    recipe: {
      _og: 1.061, _fg: 1.016, _ibu: 28, _srm: 5, _abv: 6.01, _mayaTip: 'wheat',
      mayaId: 'bb_alman_bugday', maya2Id: '',
      hopIds: ['hallertau'],
      maltIds: ['wheat', 'maris_otter'],
      katkiIds: [],
      percents: fullPercents({ baseMaltPct: 100, pilsnerPct: 29, wheatPct: 71, oatsWheatPct: 71 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
  // ═══════════════════ 15. KOYU DUBBEL (Kaan test3) ═══════════════════
  {
    id: 'dark_dubbel',
    name: 'Koyu Belgian Dubbel (Pilsner+Munich+Dark Candi, SRM 24.9)',
    primary_expected: 'belgian_dubbel',
    acceptable_alternatives: ['belgian_strong_dark_ale'],
    difficulty: 'orta',
    notes: 'SRM 24.9 Strong Dark sınırında — ABV 6.55 Strong Dark için düşük ama renk üst sınırda.',
    recipe: {
      _og: 1.069, _fg: 1.020, _ibu: 25, _srm: 24.9, _abv: 6.5, _mayaTip: 'belcika',
      mayaId: 'wy3787', maya2Id: '',
      hopIds: ['styrian'],
      maltIds: ['pilsner', 'munich', 'special_b', 'aromatic', 'candy_drk', 'carafa'],
      katkiIds: ['candy_drk'],
      percents: fullPercents({ baseMaltPct: 70, pilsnerPct: 55, munichPct: 15, crystalPct: 2, chocPct: 4, sugarPct: 12, aromaticAbbeyMunichPct: 12 }),
      lactose: false, filtered: false, aged: false, dhPer10L: 0, blended: false,
    },
  },
];

module.exports = { PRESETS, fullPercents };
