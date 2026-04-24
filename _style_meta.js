// Category-based metadata for every style.
// Given a style name (BA canonical), returns: category, yeastFamily, weights, hardZero hints.

// ═══ KATEGORI TESPITI ═══
// Style name -> high-level category tag
function inferCategory(name) {
  const n = name.toLowerCase();
  // Weizen/wheat German
  if (/weissbier|weizen|weizenbock/.test(n)) return 'weizen';
  // Witbier
  if (/witbier|belgian white|white ale/.test(n)) return 'witbier';
  // Lambic / Gueuze / Fruit Lambic / Wild
  if (/lambic|gueuze|spontaneous|framboise|kriek/.test(n)) return 'lambic';
  if (/flanders|oud bruin|oud red/.test(n)) return 'flanders';
  if (/wild (ale|beer)|brett beer|mixed.culture|mixed-culture|straight sour/.test(n)) return 'wild';
  // Sour kettle / Berliner / Gose / Catharina
  if (/berliner|gose|lichtenhainer|catharina|sour ale|kettle sour|fruited sour|straight sour|blanche sour|session sour|mixed berry sour|sour red ale|sour witbier|smoothie sour|pastry sour/.test(n)) return 'sour_kettle';
  // Belgian (all non-sour, non-wit, non-saison)
  if (/belgian|dubbel|tripel|quadrupel|trappist|abbey|speciale belge|session ale|table beer/.test(n) && !/saison|witbier|flanders|lambic/.test(n)) return 'belgian';
  if (/bière de garde|biere de garde|saison|grisette|provision|farmhouse ale|specialty saison/.test(n)) return 'saison';
  // Kveik / Norwegian farmhouse / Sahti / Gotlands
  if (/kveik|norwegian farmhouse|sahti|gotlands|finnish|kvass/.test(n)) return 'farmhouse';
  // Lager broad
  if (/pilsner|pilsener|pils\b|helles|dortmund|vienna lager|märzen|maerzen|oktoberfest|festbier|munich dunkel|schwarzbier|kellerbier|zwickelbier|zoigl|rauchbier|bock|doppelbock|eisbock|maibock|baltic.style porter|baltic porter|czech.*lager|czech pale|czech amber|czech dark|international.*lager|american.*lager|mexican.*lager|rice lager|leichtbier|dark american lager|dark lager|dortmunder|california common|kentucky common|steam beer|pre-prohibition lager|dampfbier|european.*dark lager|amber lager|dark american lager|honey lager|craft pilsner|italian.*pilsen|rotbier|hazy lager|heller bock|new zealand pilsner|light.*lager|malt liquor|international.*pale lager|international.*pilsener|helles exportbier|oat cream lager|ranch water lager|helles naturtrüb|pre-prohibition porter/.test(n)) return 'lager';
  // IPA family
  if (/\bipa\b|india pale ale|imperial.*ipa|double ipa|cold ipa|hazy ipa|neipa|experimental ipa|thiolized|biotech ipa|fresh hop ipa|oat cream ipa|hop bursted|brut ipa|cryo hop|american-style india pale lager|specialty ipa/.test(n)) return 'ipa';
  // Stout / Porter
  if (/stout|porter|smoke porter/.test(n)) return 'stout_porter';
  // Barleywine / Wheatwine / Rye Wine / Old Ale / Strong Ale
  if (/barleywine|barley wine|wheatwine|wheat wine|rye wine|old ale|british strong|american strong|strong ale|strong pale|strong golden|strong blonde|strong dark|winter warmer|spiced beer|christmas|holiday beer|american-style black ale|british-style barley wine|double hoppy|imperial red/.test(n)) return 'strong_ale';
  // Kölsch / Altbier (hybrid)
  if (/kölsch|koelsch|altbier|cream ale|blonde ale|golden.*ale|summer ale|table beer|session beer|session ale|australian sparkling|ordinary bitter|best bitter|special bitter|extra special bitter|strong bitter|bitter|english bitter|scottish|wee heavy|irish red|red ale|english.*mild|dark mild|american amber|amber ale|american brown|english brown|british brown|english-style pale ale|american-style pale ale|hazy pale|hazy bitter|juicy bitter|new england pale|nordic pale|new zealand pale|australian pale|amber/.test(n)) return 'ale';
  // Specialty fruit/spice/seasonal without beer-family anchor
  if (/fruit beer|fruit wheat|fruit and spice|spice.*beer|herb.*beer|field beer|pumpkin|chili|coffee|chocolate|cocoa|dessert stout|pastry|honey beer|honey ale|braggot|hemp|cbd|botanical|matcha|rose|floral|yuzu|elderflower|lavender|agave|tepache|grape ale|wine beer|smoked beer|rauchbier|smoke beer|wood-aged|barrel.aged|bourbon barrel|experimental|historical|specialty beer|specialty honey|ginjo|sake-yeast|adambier|kuit|koyt|kuyt|schoeps|ipa argenta|italian grape|dorada pampeana|aged beer|non-alcohol|gluten-free|other strong|other belgian|american-belgo|alternative grain|alternative sugar|wild specialty|specialty smoked|specialty wood-aged|commercial specialty|mixed-style|autumn seasonal|winter seasonal|fresh hop|steinbier|caramel ale|golden stout|peanut butter|s'mores|smores|birthday cake|maple bourbon|coconut stout|pumpkin stout|grape ale|rye beer|roggenbier|imperial milk|double milk|brett beer|mixed-culture brett|gruit|commercial specialty|pina colada|piña colada|cucumber|mexican candy/.test(n)) return 'specialty';
  return 'other';
}

// ═══ YEAST AILESI MATRISI ═══
// For each category, what yeast types (maya tipi) match at each tier
// Brewmaster maya tipleri: ale, lager, wheat, wit, belcika, saison, kveik, sour
const YEAST_BY_CATEGORY = {
  weizen:       { primary:['wheat'],    secondary:['ale'],            tolerant:[] },       // American Hefeweizen = ale yeast + wheat
  witbier:      { primary:['wit'],      secondary:['belcika'],        tolerant:['ale'] },
  belgian:      { primary:['belcika'],  secondary:[],                 tolerant:['saison'] },
  saison:       { primary:['saison'],   secondary:['belcika'],        tolerant:['kveik'] },
  lambic:       { primary:['sour'],     secondary:[],                 tolerant:[] },
  flanders:     { primary:['sour'],     secondary:['belcika'],        tolerant:[] },
  wild:         { primary:['sour'],     secondary:['ale','belcika'],  tolerant:[] },
  sour_kettle:  { primary:['sour'],     secondary:['wheat','wit'],    tolerant:['ale'] },
  farmhouse:    { primary:['kveik','saison'], secondary:['ale'],      tolerant:['belcika'] },
  lager:        { primary:['lager'],    secondary:[],                 tolerant:[] },
  ipa:          { primary:['ale'],      secondary:['kveik'],          tolerant:['lager'] }, // Cold IPA = lager yeast
  stout_porter: { primary:['ale'],      secondary:['lager'],          tolerant:['kveik'] }, // Baltic Porter = lager
  strong_ale:   { primary:['ale'],      secondary:['belcika'],        tolerant:['kveik'] },
  ale:          { primary:['ale'],      secondary:['kveik'],          tolerant:['lager'] },
  specialty:    { primary:['ale','belcika','lager','wheat','sour','saison','kveik','wit'], secondary:[], tolerant:[] },
  other:        { primary:['ale'],      secondary:['lager','belcika','wheat','sour','saison','kveik','wit'], tolerant:[] },
};

// Style-specific yeast override (for styles where category default is too loose/tight)
const YEAST_OVERRIDES = {
  'German-Style Koelsch':              { primary:['ale'],     secondary:['lager'],    tolerant:[] },      // hybrid
  'Kölsch':                             { primary:['ale'],     secondary:['lager'],    tolerant:[] },
  'German-Style Altbier':              { primary:['ale'],     secondary:['lager'],    tolerant:[] },
  'California Common Beer':            { primary:['lager'],   secondary:['ale'],      tolerant:[] },       // uses lager yeast at ale temps
  'California Common / Steam Beer':    { primary:['lager'],   secondary:['ale'],      tolerant:[] },
  'Cream Ale':                          { primary:['ale'],     secondary:['lager'],    tolerant:[] },
  'American-Style Cream Ale':          { primary:['ale'],     secondary:['lager'],    tolerant:[] },
  'Dampfbier':                          { primary:['ale'],     secondary:['wheat'],    tolerant:[] },
  'Baltic-Style Porter':                { primary:['lager'],   secondary:['ale'],      tolerant:[] },
  'Baltic Porter':                      { primary:['lager'],   secondary:['ale'],      tolerant:[] },
  'Cold IPA':                           { primary:['lager'],   secondary:['ale'],      tolerant:[] },
  'American-Style India Pale Lager':   { primary:['lager'],   secondary:['ale'],      tolerant:[] },
  'Lager IPA':                          { primary:['lager'],   secondary:['ale'],      tolerant:[] },
  'Kentucky Common Beer':               { primary:['ale'],     secondary:['lager'],    tolerant:[] },
  'Kentucky Common':                    { primary:['ale'],     secondary:['lager'],    tolerant:[] },
  'Belgian IPA':                        { primary:['belcika'], secondary:['ale'],      tolerant:[] },
  'Specialty IPA: Belgian IPA':        { primary:['belcika'], secondary:['ale'],      tolerant:[] },
  'American-Belgo-Style Ale':          { primary:['belcika'], secondary:['ale'],      tolerant:['saison'] },
  'White IPA':                          { primary:['wit'],     secondary:['belcika','ale'], tolerant:[] },
  'Specialty IPA: White IPA':          { primary:['wit'],     secondary:['belcika','ale'], tolerant:[] },
  'Farmhouse IPA':                      { primary:['saison'],  secondary:['belcika','ale'], tolerant:[] },
  'American Hefeweizen':                { primary:['ale'],     secondary:['wheat'],    tolerant:[] },
  'American-Style Wheat Beer':         { primary:['ale'],     secondary:['wheat'],    tolerant:[] },
  'American Wheat Beer':                { primary:['ale'],     secondary:['wheat'],    tolerant:[] },
  'Fruit Wheat Beer':                   { primary:['ale','wheat'], secondary:['sour'], tolerant:[] },
  'American Wheat IPA / Hoppy Wheat':  { primary:['ale'],     secondary:['wheat'],    tolerant:[] },
  'Kvass':                              { primary:['ale'],     secondary:['sour'],     tolerant:['wheat'] },
  'Catharina Sour':                     { primary:['sour'],    secondary:['ale'],      tolerant:[] },
  'X4. Catharina Sour':                 { primary:['sour'],    secondary:['ale'],      tolerant:[] },
};

function yeastFamilyFor(styleName) {
  if (YEAST_OVERRIDES[styleName]) return YEAST_OVERRIDES[styleName];
  const cat = inferCategory(styleName);
  return YEAST_BY_CATEGORY[cat];
}

// ═══ DINAMIK AGIRLIK PROFILLERI ═══
// weights sum = 1.0. Categories that are yeast-defined get higher yeast weight.
const WEIGHTS_BY_CATEGORY = {
  weizen:       { yeast:0.35, malt:0.35, gravity:0.10, bitter:0.05, color:0.10, other:0.05 },
  witbier:      { yeast:0.30, malt:0.25, gravity:0.10, bitter:0.05, color:0.05, other:0.25 },  // spice markers critical
  belgian:      { yeast:0.40, malt:0.25, gravity:0.15, bitter:0.05, color:0.10, other:0.05 },
  saison:       { yeast:0.40, malt:0.20, gravity:0.15, bitter:0.10, color:0.10, other:0.05 },
  lambic:       { yeast:0.45, malt:0.15, gravity:0.05, bitter:0.05, color:0.05, other:0.25 },  // acidity + brett critical
  flanders:     { yeast:0.40, malt:0.15, gravity:0.10, bitter:0.05, color:0.10, other:0.20 },
  wild:         { yeast:0.45, malt:0.15, gravity:0.10, bitter:0.05, color:0.05, other:0.20 },
  sour_kettle:  { yeast:0.30, malt:0.15, gravity:0.10, bitter:0.05, color:0.10, other:0.30 },  // salt/fruit markers
  farmhouse:    { yeast:0.40, malt:0.20, gravity:0.15, bitter:0.10, color:0.10, other:0.05 },
  lager:        { yeast:0.35, malt:0.25, gravity:0.10, bitter:0.10, color:0.15, other:0.05 },
  ipa:          { yeast:0.20, malt:0.15, gravity:0.10, bitter:0.30, color:0.10, other:0.15 },  // hop-centric
  stout_porter: { yeast:0.20, malt:0.30, gravity:0.15, bitter:0.10, color:0.20, other:0.05 },  // roast + color dominant
  strong_ale:   { yeast:0.25, malt:0.25, gravity:0.20, bitter:0.10, color:0.15, other:0.05 },
  ale:          { yeast:0.30, malt:0.20, gravity:0.10, bitter:0.15, color:0.15, other:0.10 },
  specialty:    { yeast:0.20, malt:0.20, gravity:0.05, bitter:0.05, color:0.10, other:0.40 },  // markers dominant
  other:        { yeast:0.30, malt:0.25, gravity:0.10, bitter:0.10, color:0.15, other:0.10 },
};

function weightsFor(styleName) {
  const cat = inferCategory(styleName);
  return WEIGHTS_BY_CATEGORY[cat];
}

// ═══ HARD-ZERO KURALLARI ═══
// Returns array of hard-zero conditions (each: {type, value, reason}).
// If ANY evaluates true against a recipe, styleScore = 0.
// Types:
//   pctMin: { key: 'wheatPct', min: 40 }
//   pctMax: { key: 'crystalRoastSum', max: 5 }
//   markerRequired: { regex, field: 'malt'|'katki'|'maya' }
//   ogMin / ogMax / abvMin / abvMax
function hardZeroFor(styleName) {
  const n = styleName.toLowerCase();
  const rules = [];

  // Weizen ailesi -> buğday ≥ %40
  if (/weissbier|hefeweizen|kristal weizen|leichtes weizen|bernstein|dunkel weizen|weizen$|weizenbock|weiss rauchbier|wheatwine|wheat wine|american.*wheat/.test(n)
      || /south german-style dunkel weizen/.test(n)) {
    rules.push({ type:'pctMin', key:'wheatPct', min:30, reason:'Weizen ailesi: buğday maltı ≥ %30' });
  }
  // Witbier ailesi
  if (/witbier|belgian white|white ale|spiced witbier|blanche sour|sour witbier/.test(n)) {
    rules.push({ type:'pctMin', key:'wheatPct', min:25, reason:'Witbier: buğday ≥ %25' });
    rules.push({ type:'markerAny', regex:/koriander|coriander|portakal|orange/, field:'katki', reason:'Witbier: kişniş VEYA portakal kabuğu' });
  }
  // Roggenbier / Rye ailesi
  if (/roggenbier|rye ale|rye ipa|rye pale|rye beer|rye wine|adambier/.test(n)) {
    rules.push({ type:'pctMin', key:'ryePct', min:10, reason:'Rye stili: çavdar ≥ %10' });
  }
  // Rauchbier / Smoke
  if (/rauchbier|smoke porter|smoke beer|specialty smoked|classic style smoked|grodziskie|gotlandsdricke|lichtenhainer/.test(n)) {
    rules.push({ type:'pctMin', key:'smokedPct', min:15, reason:'Smoked: dumanlı malt ≥ %15' });
  }
  // Dry/Oatmeal/Sweet/Milk/Imperial Stout -> roasted ≥ 5 OR chocolate ≥ 5
  if (/\b(stout|porter)\b/.test(n) && !/smoke porter/.test(n)) {
    rules.push({ type:'pctMinEither', keys:['roastedPct','chocPct'], min:3, reason:'Stout/Porter: roasted VEYA chocolate ≥ %3' });
  }
  // Kölsch -> crystal+roasted düşük
  if (/koelsch|kölsch/.test(n)) {
    rules.push({ type:'pctMaxSum', keys:['crystalPct','roastedPct'], max:3, reason:'Kölsch: crystal+roasted ≤ %3' });
  }
  // Pilsener -> crystal+roasted çok düşük
  if (/pilsner|pilsener|pils\b/.test(n) && !/american|mexican|international/.test(n)) {
    rules.push({ type:'pctMaxSum', keys:['crystalPct','roastedPct'], max:2, reason:'Pilsener: crystal+roasted ≤ %2' });
  }
  // Gose -> tuz zorunlu
  if (/\bgose\b/.test(n)) {
    rules.push({ type:'markerAny', regex:/tuz|salt|sea_salt/, field:'katki', reason:'Gose: tuz katkısı zorunlu' });
  }
  // Sahti -> ardıç zorunlu
  if (/sahti/.test(n)) {
    rules.push({ type:'markerAny', regex:/ardic|juniper/, field:'katki', reason:'Sahti: ardıç zorunlu' });
  }
  // Lambic/Gueuze/Wild -> brett veya mixed
  if (/lambic|gueuze|wild|brett beer|mixed-culture|mixed-fermentation|spontaneous/.test(n)) {
    rules.push({ type:'markerAny', regex:/brett|lambic|lacto|pediococcus|mixed|roeselare|wlp650|wlp655|wy5526/, field:'maya', reason:'Wild: brett veya mixed culture maya' });
  }
  // Doppelbock ABV ≥ 7
  if (/doppelbock/.test(n)) {
    rules.push({ type:'abvMin', value:6.5, reason:'Doppelbock: ABV ≥ 6.5' });
  }
  // Eisbock ABV ≥ 9
  if (/eisbock/.test(n)) {
    rules.push({ type:'abvMin', value:8.5, reason:'Eisbock: ABV ≥ 8.5' });
  }
  // Weizenbock
  if (/weizenbock/.test(n)) {
    rules.push({ type:'abvMin', value:6.5, reason:'Weizenbock: ABV ≥ 6.5' });
  }
  // Barleywine / Wheatwine / Rye Wine OG ≥ 1.075
  if (/barleywine|barley wine|wheatwine|wheat wine|rye wine/.test(n)) {
    rules.push({ type:'ogMin', value:1.075, reason:'Barleywine: OG ≥ 1.075' });
  }
  // Quadrupel
  if (/quadrupel/.test(n)) {
    rules.push({ type:'abvMin', value:9.0, reason:'Quadrupel: ABV ≥ 9.0' });
  }
  // Tripel
  if (/tripel/.test(n) && !/specialty ipa|rye ipa|white ipa/.test(n)) {
    rules.push({ type:'abvMin', value:7.0, reason:'Tripel: ABV ≥ 7.0' });
  }
  // Mexican Adjunct / American Adjunct -> corn or rice
  if (/mexican.*lager|american-style lager|american lager|pre-prohibition lager|american-style light lager|rice lager|malt liquor|international.*light lager/.test(n)) {
    rules.push({ type:'pctMinEither', keys:['cornPct','ricePct'], min:8, reason:'Adjunct lager: mısır VEYA pirinç ≥ %8' });
  }
  // Oatmeal Stout
  if (/oatmeal stout/.test(n)) {
    rules.push({ type:'pctMin', key:'oatsPct', min:5, reason:'Oatmeal Stout: yulaf ≥ %5' });
  }
  // Milk/Sweet Stout -> lactose marker
  if (/milk stout|sweet stout|cream stout/.test(n)) {
    rules.push({ type:'markerAny', regex:/lactose|laktoz/, field:'katki', reason:'Milk Stout: laktoz zorunlu' });
  }
  // Coffee Beer
  if (/coffee beer|coffee stout/.test(n)) {
    rules.push({ type:'markerAny', regex:/coffee|kahve|espresso/, field:'katki', reason:'Coffee: kahve katkısı' });
  }
  // Chocolate Beer
  if (/chocolate or cocoa|chocolate stout|coconut stout/.test(n)) {
    rules.push({ type:'markerAny', regex:/cocoa|kakao|chocolate|cikolata/, field:'katki', reason:'Chocolate: kakao/çikolata' });
  }
  // Honey Beer/Ale
  if (/honey ale|honey beer|honey lager|braggot|specialty honey/.test(n)) {
    rules.push({ type:'markerAny', regex:/bal|honey/, field:'katki', reason:'Honey: bal zorunlu' });
  }
  // Pumpkin
  if (/pumpkin/.test(n)) {
    rules.push({ type:'markerAny', regex:/pumpkin|kabak/, field:'katki', reason:'Pumpkin: balkabağı zorunlu' });
  }
  // Chili
  if (/chili pepper|chili beer/.test(n)) {
    rules.push({ type:'markerAny', regex:/chili|biber|jalapeno|jala|chipotle|habanero/, field:'katki', reason:'Chili: biber zorunlu' });
  }
  // Fruit Beer
  if (/fruit beer|fruit wheat|fruited|fruit lambic|gose de fruit|fruit\b/.test(n)) {
    rules.push({ type:'markerAny', regex:/meyve|fruit|mango|ananas|pineapple|seftali|peach|cilek|strawberry|passion|raspberry|ahududu|visne|cherry|karadut|blackberry|portakal|orange|elma|apple|uzum|grape|pear|armut|karpuz|watermelon/, field:'katki', reason:'Fruit: meyve zorunlu' });
  }
  // Wood-aged
  if (/wood-aged|barrel-aged|bourbon barrel/.test(n)) {
    rules.push({ type:'markerAny', regex:/wood|barrel|fıçı|bourbon|rum|sherry|port|wine_barrel/, field:'katki', reason:'Wood-aged: ahşap/fıçı' });
  }
  return rules;
}

module.exports = {
  inferCategory,
  yeastFamilyFor,
  weightsFor,
  hardZeroFor,
  YEAST_BY_CATEGORY,
  WEIGHTS_BY_CATEGORY,
};
