// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER HIERARCHICAL STYLE ENGINE (V3)
// 3-seviye: ferm_type (hard gate) → family (marker skorlama) → style (flat score)
// Flat motor (style_engine.js) paralel kalir, bu yeni paralel motordur.
// Kullanim: const { classifyHierarchical } = require('./style_engine_v2.js')
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const defs = JSON.parse(fs.readFileSync(path.join(__dirname, 'STYLE_DEFINITIONS.json'), 'utf8'));
const HIER = JSON.parse(fs.readFileSync(path.join(__dirname, 'hierarchy_map.json'), 'utf8'));
const { styleMatchScore } = require('./style_engine.js');

// ═══════════════════════════════════════════════════════════════════════════
// SEVIYE 1 — FERM_TYPE HARD GATE (maya regex)
// Sira: wild > hybrid > lager > ale
// ═══════════════════════════════════════════════════════════════════════════
const WILD_YEAST_RX   = /(brett|brettanomyces|lacto|lactobacillus|pedio|pediococcus|sour\s*blend|roeselare|melange|philly\s*sour|hothead|omega\s*lutra|wlp644|wlp645|wlp650|wlp653|wlp655|wlp665|wlp670|wy3278|wy3763|wy4335|wy4733|wy5112|wy5335|wy5526|ecy02|ecy04|ecy20|wildbrew|lallemand\s*sour|fermentis\s*sour|mixed\s*culture|spontaneous|kettle[\-\s]?sour)/i;
// HYBRID: Imperial G-serisi (kolsch/altbier) + L05 Cablecar (california common)
const HYBRID_YEAST_RX = /(wlp029|wlp036|wlp011|wlp810|wy1007|wy1010|wy2112|wy2565|k[oö]lsch|koelsch|kolsch|altbier|alt[\-\s]?bier|california\s*(common|lager|steam)|anchor\s*steam|steam\s*beer|dusseldorf|stefon|kaiser|dieter|cablecar|cable\s*car|g01\b|g02\b|g03\b|g04\b|g05\b|l05\b)/i;
// LAGER: Imperial L-serisi diger (L05 hariç — o hybrid'e alindi). 'dieter' kaldirildi (altbier).
const LAGER_YEAST_RX  = /(34[\/\-]?70|w[\-]?34[\/\-]?70|wlp8\d\d|wlp9\d\d|wy20\d\d|wy21\d\d|wy22\d\d|wy23\d\d|wy24\d\d|s[\-]?23|s[\-]?189|saflager|bohemian\s*lager|czech\s*lager|munich\s*lager|mexican\s*lager|augustiner|global\s*lager|harvest\s*lager|lookr|urkel|urquell|pilsner\s*urquell|triumvirate|kellermeister|l0[1234689]\b|l1[0-9]\b|l2[0-9]\b|l3[0-9]\b|l40\b)/i;

function classifyFermType(recipe) {
  // _yeast_raw varsa ona oncelik (raw isim, orjinal detay). mayaId/maya2Id normalize olmus.
  const mayaStr = [recipe._yeast_raw, recipe.mayaId, recipe.maya2Id].filter(Boolean).join('|');
  const tip = recipe._mayaTip || '';

  // 1) WILD ilk gate (brett/lacto absolute override)
  if (tip === 'sour' || tip === 'brett' || tip === 'wild' || tip === 'mixed') {
    return { ferm_type: 'wild', reason: '_mayaTip=' + tip, confidence: 0.95 };
  }
  if (WILD_YEAST_RX.test(mayaStr)) {
    return { ferm_type: 'wild', reason: 'wild yeast marker in mayaId', confidence: 0.95 };
  }

  // 2) HYBRID (kolsch/alt/cal-common — hibrit yeast hard marker)
  if (HYBRID_YEAST_RX.test(mayaStr)) {
    return { ferm_type: 'hybrid', reason: 'hybrid yeast (kolsch/alt/cal-common)', confidence: 0.92 };
  }

  // 3) LAGER
  if (tip === 'lager') {
    return { ferm_type: 'lager', reason: '_mayaTip=lager', confidence: 0.95 };
  }
  if (LAGER_YEAST_RX.test(mayaStr)) {
    return { ferm_type: 'lager', reason: 'lager yeast marker in mayaId', confidence: 0.90 };
  }

  // 4) DEFAULT: ALE (tum ale/wheat/saison/wit/belcika/kveik)
  return { ferm_type: 'ale', reason: 'default (no wild/lager/hybrid marker)', confidence: 0.75 };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEVIYE 2 — FAMILY SIGNATURES (her aile icin signature skor)
// ═══════════════════════════════════════════════════════════════════════════
const FAMILY_SIGNATURES = {
  // ─── ALE ───
  english: {
    yeast_rx: /(wy1028|wy1098|wy1099|wy1187|wy1275|wy1318|wy1335|wy1469|wy1728|wy1768|wy1968|\b1187\b|\b1968\b|\b1968\b|\b1318\b|\b1098\b|\b1028\b|\b1728\b|wlp002|wlp004|wlp005|wlp007|wlp013|wlp017|wlp019|wlp022|wlp023|wlp025|wlp026|wlp028|nottingham|windsor|whitbread|london\s*ale|british\s*ale|english\s*ale|edinburgh|scottish\s*ale|irish\s*ale|tartan|m44\b|s[\-]?04\b|m36\b|m42\b|a09\b|a10\b|gypsy|thornbridge|fuller|fullers|fuller.?s|ringwood|harvest\s*ale|imperial\s*pub|imperial\s*house|pub\s*yeast|house\s*(ale|strain|yeast)|brewer.?s\s*choice|bulldog\s*b\d|ringwood\s*ale)/i,
    hard_yeast_rx: /(wy1968|wy1187|wy1098|wy1028|wy1318|wy1728|wlp002|wlp004|wlp005|wlp007|wlp013|wlp017|wlp023|wlp025|wlp028|nottingham|windsor|fuller|thornbridge|ringwood|\b1968\b|\b1187\b|\b1098\b|\b1028\b|\b1318\b|\b1728\b)/i,
    maris_otter_rx: /(maris\s*otter|golden\s*promise|halcyon|pearl|thomas\s*fawcett|chevalier|english\s*pale\s*ale)/i,
    hop_rx:   /(ekg|east\s*kent|fuggles?|challenger|goldings|admiral|bramling|first\s*gold|target|pilgrim|progress|northdown|phoenix|sovereign|endeavour|boadicea|jester|olicana|british\s*hop)/i,
    malt_rx:  /(maris\s*otter|golden\s*promise|thomas\s*fawcett|crisp|simpsons|muntons|pearl|halcyon|chevalier|british\s*(pale|crystal)|english\s*pale|brown\s*malt|amber\s*malt)/i,
  },
  american: {
    yeast_rx: /(us[\-]?05|wlp001|wlp008|wlp041|wlp051|wlp060|wlp090|wy1056|wy1272|wy1450|bry[\-]?97|safale.?(05|04\s*us|lesaffre\s*us)|chico|california\s*ale|west\s*coast\s*ale|american\s*ale|houston|flagship|independence|capri|brytec|imperial\s*flagship|vermont\s*ale|juice|barbarian|tropical|conan|wlp4000|wlp4500|dry\s*english\b|a35\b|a38\b|a31\b|a38\b|a43\b|a56\b)/i,
    hop_rx:   /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|nelson|sabro|idaho\s*7|denali|el\s*dorado|summit|apollo|equinox|ekuanot|eureka|azacca|bravo|vic\s*secret|calypso|loral|lemondrop|strata|comet|glacier|palisade|cashmere|sorachi|motueka|waimea|wakatu|pacific\s*(gem|jade)|rakau|riwaka|pekko|cryo|yakima|bbc|talus)/i,
    malt_rx:  /(2.?row|briess|rahr|mecca\s*grade|lamonta|flagship|admiral\s*maltings|american\s*pale|great\s*western|cargill)/i,
  },
  belgian: {
    yeast_rx: /(wy1214|wy1388|wy1762|wy3522|wy3724|wy3787|wy3944|wlp400|wlp500|wlp510|wlp515|wlp530|wlp540|wlp545|wlp550|wlp565|wlp566|wlp568|wlp570|wlp585|wlp590|wlp644|trappist|abbey|chimay|westmalle|rochefort|duvel|orval|strong\s*ale|belgian\s*(strong|dark|ale|abbey)|b45\b|b48\b|b63\b|b64\b|b90\b|t[\-]?58|m31\b|m41\b|m29\b|rustic|farmhouse|saison|dupont|napoleon|belle\s*saison|witbier|celis|forbidden\s*fruit|k[\-]?97|be[\-]?(13[04]|256))/i,
    hop_rx:   /(styrian|hallertau|strisselspalt|tettnang|saaz|aurora|brewer.?s?\s*gold|hersbrucker|spalt|tradition|tettnanger|challenger|goldings)/i,
    malt_rx:  /(chateau|castle|dingemans|pilsner|pilsen|best\s*heidel|weyermann|special\s*b|aromatic|biscuit|candi|dark\s*candi|d[\-\s]?180|d[\-\s]?90|d[\-\s]?45|trappist|abbey|lamonbaas)/i,
  },
  wheat_german: {
    yeast_rx: /(wy3056|wy3068|wy3333|wy3638|wlp300|wlp320|wlp351|wlp380|\b3056\b|\b3068\b|\b3638\b|m20\b|m08\b|m15\b|wb[\-]?06|weihenstephan|hefeweizen|bavarian\s*(wheat|hefe|weiss)|weiss\w*|hefe\w*|bb.?(alman|weissbier|bugday|wb))/i,
    hop_rx:   /(hallertau|tettnang|perle|mittelfr|hersbrucker|spalt|tradition|magnum|herkules|saphir|smaragd|mandarina)/i,
    malt_rx:  /(wheat\s*malt|weizen|weyermann\s*(pale\s*)?wheat|best\s*wheat|chateau\s*wheat|white\s*wheat|buğday|bugday)/i,
    wheat_min: 30,   // German wheat >= 30%
  },
  specialty_adjunct: {
    katki_rx: /(meyve|fruit|baharat|spice|otu?|mango|passion|seftali|peach|strawberry|cilek|raspberry|ahududu|blackberry|cherry|kiraz|elma|apple|armut|pear|uzum|grape|must|chocolate|cacao|kakao|coconut|hindistan|vanilla|vanilya|coffee|kahve|espresso|chile|chili|aci|biber|pepper|pumpkin|balkabag|squash|kabak|honey|bal|ginger|zencefil|cinnamon|tarcin|nutmeg|clove|karanfil|orange|portakal|lemon|limon|lime|misket|zest|herbs|tea|cay|rosemary|biberiye|mint|nane|lavender|lavanta|hibiscus|elderflower|elderberry|jasmine|matcha|smoke|smoked|rauch|isli|maple|akcaagac|molasses|pekmez|tonka|sassafras|juniper|ardic)/i,
    malt_rx:  /(rauch|smoked|cherrywood|mesquite|peat|oak[\-\s]?smoked|beech|beech[\-\s]?smoked)/i,
  },
  specialty_historical: {
    katki_rx:      /(juniper|ardic|gruit|sweet\s*gale|bog\s*myrtle|heather|yarrow|kentish|mugwort|horehound|wormwood|elecampane|ginger\s*root|bishopwort)/i,
    style_hint_rx: /(sahti|grodzisk|grodz|piwo|adambier|kuit|kuyt|koyt|gotlands|gotland|lichtenhainer|roggenbier|historical)/i,
    malt_rx:       /(raw\s*rye|raw\s*wheat|smoked\s*rye|oak[\-\s]?smoked\s*wheat|juniper[\-\s]?smoked)/i,
  },
  specialty_strength_format: {
    abv_extreme_low:  0.5,
    abv_extreme_high: 12.5,
    format_rx: /(wood|barrel|oak|bourbon|whiskey|tequila|rum|brandy|gluten[\-\s]?free|non[\-\s]?alcohol(ic)?|sake|ginjo)/i,
    experimental_hint_rx: /(experimental|test|research)/i,
  },

  // ─── LAGER ───
  german_lager: {
    // Imperial Yeast genişletme: L09 Global, L10 Triumvirate, L13 Global, L17 Harvest (Bavarian),
    // L30 Munich Lager, L32 Kellermeister, L40 Augustiner; 'dieter' SILINDI (altbier'e taşındı).
    yeast_rx: /(wlp830|wlp833|wlp838|wlp840|wlp920|wlp925|wy2000|wy2001|wy2007|wy2035|wy2042|wy2124|wy2206|wy2247|wy2308|wy2352|34[\/\-]?70|w[\-]?34|saflager|munich\s*lager|bavarian\s*lager|augustiner|global\s*lager|harvest\s*lager|triumvirate|kellermeister|l09\b|l10\b|l11\b|l13\b|l17\b|l30\b|l32\b|l40\b)/i,
    hop_rx:   /(hallertau|tettnang|perle|herkules|magnum|mittelfr|hersbrucker|spalt|tradition|saphir|smaragd|northern\s*brewer|select)/i,
    malt_rx:  /(weyermann|best\s*(pilsen|heidel|pils|munich|vienna)|chateau\s*pils|pilsen|pilsner|munich|vienna|melanoidin|aromatic|floor[\-\s]?malted)/i,
  },
  czech_lager: {
    // Imperial Yeast L28 Urkel, L29 Lookr
    yeast_rx: /(wy2278|wy2124|wlp800|wlp802|wlp830|urkel|urquell|pilsner\s*urquell|czech\s*(lager|pilsen|pilsner)|bohemian|budvar|budweiser\s*budvar|cesky|lookr|l28\b|l29\b)/i,
    hop_rx:   /(saaz|czech\s*saaz|premiant|sladek|kazbek|zatec)/i,
    malt_rx:  /(pilsen|pilsner|moravian|caramunich|floor[\-\s]?malted\s*bohemian|bohemian\s*pils)/i,
    czech_combo: true,
  },
  american_lager: {
    // Imperial L01 Global (American-leaning), L02 Cascade — ekleme
    yeast_rx:    /(wlp840|wlp810|wy2007|wy2035|wy2112|saflager.*us|us\s*west|american\s*lager|mexican\s*lager|fermoale.*american|cervezeria|cascade\s*lager|l01\b|l02\b)/i,
    adjunct_rx:  /(corn|misir|mais|flaked\s*corn|rice|pirinc|flaked\s*rice|corn\s*syrup|dextrose|glucose|invert)/i,
    american_lager_combo: true,
    weak_ok: true,
  },
  specialty_lager: {
    style_hint_rx: /(baltic|kentucky|breslau|schoep|italian\s*pils|new\s*zealand\s*pils)/i,
  },

  // ─── WILD ───
  lambic: {
    yeast_rx: /(roeselare|melange|lambic|spontaneous|wild\s*capture|ecy02|ecy04|ecy20|wlp655|wlp665|wlp670|wy3763|wy3278|belgian\s*sour|boon|cantillon|3\s*fonteinen)/i,
    malt_rx:  /(raw\s*wheat|torrified\s*wheat|wheat\s*malt|aged\s*hop)/i,
    wheat_min: 30,
  },
  flanders: {
    yeast_rx: /(roeselare|rodenbach|oud\s*bruin|flanders|flemish|wy3763|wlp655|wlp665|ecy02|rodenbach.*blend)/i,
    malt_rx:  /(vienna|munich|caramunich|special\s*b|d[\-]?180|dark\s*candi|crystal|caramel)/i,
  },
  american_wild: {
    yeast_rx: /(philly\s*sour|omega\s*lutra|hothead|lutra\s*kveik|wlp644|wy5335|brett[\-\s]?c|brett[\-\s]?b|brett[\-\s]?l|brettanomyces\s*claussenii|brettanomyces\s*bruxellensis|jao|fermentis\s*sour|lallemand\s*sour|wildbrew\s*sour|citra\s*brett|kettle[\-\s]?sour|quick[\-\s]?sour)/i,
    hop_rx:   /(cascade|centennial|citra|mosaic|chinook|galaxy|amarillo|simcoe|nelson|sabro|strata|nz\s*hop)/i,
  },
  mixed_ferm: {
    yeast_rx: /(lacto|lactobacillus|plantarum|brevis|sour\s*ale|wy4335|wy4733|wy5112|philly\s*sour|omega\s*lutra|mixed\s*culture|mixed\s*ferm|wit.*brett|brett\s*claussen|lallemand\s*sour|wildbrew|fermentis\s*sour|berliner|gose\s*culture)/i,
    wheat_min: 20,
  },

  // ─── HYBRID ───
  kolsch: {
    // Imperial G01 Stefon, G04 (varsa)
    yeast_rx: /(wlp029|wy2565|k[oö]lsch|kolsch|koelsch|stefon|g01\b|g04\b)/i,
    malt_rx:  /(pilsen|pilsner|wheat)/i,
  },
  altbier: {
    // Imperial G02 Kaiser, G03 Dieter (Düsseldorf altbier yeast)
    yeast_rx: /(wlp036|wlp011|wy1007|wy1010|alt\s*ale|german\s*ale|dusseldorf|alt.?bier|kaiser|dieter|g02\b|g03\b)/i,
    malt_rx:  /(munich|vienna|melanoidin|caramunich)/i,
  },
  california_common: {
    // Imperial L05 Cablecar
    yeast_rx: /(wlp810|wy2112|california\s*(lager|common|steam)|cal\s*common|steam\s*beer|anchor|cablecar|cable\s*car|l05\b)/i,
    hop_rx:   /(northern\s*brewer|cluster|mount\s*hood)/i,
  },
};

function scoreFamily(recipe, family) {
  const sig = FAMILY_SIGNATURES[family];
  if (!sig) return { family, score: 0, hits: [] };

  const mayaStr  = [recipe._yeast_raw, recipe.mayaId, recipe.maya2Id].filter(Boolean).join('|');
  const hopStr   = (recipe.hopIds  || []).join('|');
  const maltStr  = (recipe.maltIds || []).join('|');
  const katkiStr = (recipe.katkiIds|| []).join('|');
  const anyStr   = mayaStr + '|' + hopStr + '|' + maltStr + '|' + katkiStr + '|' + (recipe._recipeName || '');

  let s = 0;
  const hits = [];

  if (sig.yeast_rx && sig.yeast_rx.test(mayaStr))                  { s += 40; hits.push('yeast'); }
  if (sig.hop_rx && sig.hop_rx.test(hopStr))                       { s += 20; hits.push('hop'); }
  if (sig.malt_rx && sig.malt_rx.test(maltStr))                    { s += 15; hits.push('malt'); }
  if (sig.katki_rx && sig.katki_rx.test(katkiStr))                 { s += 45; hits.push('katki_adjunct'); }
  if (sig.style_hint_rx && sig.style_hint_rx.test(anyStr))         { s += 35; hits.push('style_hint'); }
  if (sig.adjunct_rx && sig.adjunct_rx.test(maltStr + '|' + katkiStr)) { s += 25; hits.push('adjunct_malt'); }
  if (sig.wheat_min && (recipe.percents?.wheatPct || 0) >= sig.wheat_min) { s += 15; hits.push('wheat_pct'); }
  if (sig.experimental_hint_rx && sig.experimental_hint_rx.test(recipe._recipeName || '')) { s += 25; hits.push('experimental'); }

  // Strength/format aile — ABV uc ya da format markeri
  if (sig.abv_extreme_low != null && recipe._abv != null && recipe._abv < sig.abv_extreme_low) {
    s += 45; hits.push('abv_extreme_low');
  }
  if (sig.abv_extreme_high != null && recipe._abv != null && recipe._abv > sig.abv_extreme_high) {
    s += 25; hits.push('abv_extreme_high');
  }
  if (sig.format_rx && (sig.format_rx.test(katkiStr + '|' + maltStr) || recipe.aged || recipe.bourbonAged)) {
    s += 30; hits.push('format');
  }

  // ═ Patch 1: Czech saaz+pilsen hard combo marker ═
  if (sig.czech_combo) {
    const hasSaaz    = /saaz|premiant|sladek|kazbek|zatec/i.test(hopStr);
    const hasPilsner = /pilsen|pilsner|moravian|bohemian|floor[\-\s]?malted/i.test(maltStr);
    if (hasSaaz && hasPilsner) { s += 40; hits.push('czech_combo'); }
  }

  // ═ Patch 3: American Lager combo — corn+rice veya corn+6-row hard marker ═
  if (sig.american_lager_combo) {
    const cornPct = recipe.percents?.cornPct || 0;
    const ricePct = recipe.percents?.ricePct || 0;
    const hasSixRow = /6[\-\s]?row|six[\-\s]?row/i.test(maltStr);
    if (cornPct > 0 && (ricePct > 0 || hasSixRow)) { s += 40; hits.push('american_lager_combo'); }
    else if (cornPct > 3 || ricePct > 3) { s += 15; hits.push('adjunct_present'); }
  }

  // ═ Patch 5: Maris Otter + English yeast kombosu = ek bonus ═
  // (Genisletilmis yeast_rx'ten +40 zaten alınıyor; Maris Otter kombosu +10 ek)
  if (family === 'english') {
    const hasEnglishYeast = sig.yeast_rx && sig.yeast_rx.test(mayaStr);
    const hasMarisOtter = sig.maris_otter_rx && sig.maris_otter_rx.test(maltStr);
    if (hasEnglishYeast && hasMarisOtter) { s += 10; hits.push('maris_otter_combo'); }
  }

  // ═ Patch 4: American yeast (US-05/WY1056/WLP001) varsa english ×0.5 ═
  if (family === 'english') {
    const AMERICAN_YEAST_RX = /\bus[\-]?05\b|wlp001|wy1056|bry[\-]?97|chico|american\s*ale|california\s*ale|\bus[\-]?04\b|safale.*us/i;
    const ENGLISH_YEAST_RX  = sig.yeast_rx;
    if (AMERICAN_YEAST_RX.test(mayaStr) && !ENGLISH_YEAST_RX.test(mayaStr)) {
      s = s * 0.5;
      hits.push('american_yeast_penalty');
    }
  }

  // ═ Patch 2: adjunct dominant sinyal — specialty_adjunct disi ailelere ×0.5 ═
  // Sadece hakiki adjunct markerlari (fruit/spice/herb/honey/coffee/chile/vinification).
  // Laktoz dahil DEGIL (pastry stout = american).
  if (family !== 'specialty_adjunct' && family !== 'wheat_german' && family !== 'specialty_historical') {
    const ADJUNCT_RX = /(meyve|fruit|baharat|spice|otu?|mango|passion|seftali|peach|strawberry|cilek|raspberry|ahududu|blackberry|cherry|kiraz|elma|apple|armut|pear|uzum|grape|must|vinification|chocolate|cacao|kakao|coconut|hindistan|vanilla|vanilya|coffee|kahve|espresso|chile|chili|aci|biber|pepper|pumpkin|balkabag|squash|kabak|honey|bal|ginger|zencefil|cinnamon|tarcin|nutmeg|clove|karanfil|orange|portakal|lemon|limon|lime|zest|herbs|rosemary|biberiye|mint|nane|lavender|lavanta|hibiscus|elderflower|elderberry|jasmine|matcha|maple|akcaagac|molasses|pekmez|tonka)/i;
    if (ADJUNCT_RX.test(katkiStr)) { s = s * 0.5; hits.push('adjunct_penalty'); }
  }

  return { family, score: s, hits };
}

function classifyFamily(recipe, ferm_type) {
  const candidates = (HIER.ferm_types[ferm_type] && HIER.ferm_types[ferm_type].families) || [];
  const ranks = candidates.map(f => scoreFamily(recipe, f));
  ranks.sort((a, b) => b.score - a.score);

  const DEFAULT_FAMILY = {
    ale: 'american', lager: 'american_lager', wild: 'mixed_ferm', hybrid: 'kolsch',
  };
  // Eger en iyi aile skoru 0 ise default'a dus
  const chosen = ranks[0] && ranks[0].score > 0 ? ranks[0].family : DEFAULT_FAMILY[ferm_type];
  return { family: chosen, chosen_score: ranks[0]?.score || 0, ranks };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEVIYE 3 — Aile ici stil skorlama (sadece family uyesi stiller)
// ═══════════════════════════════════════════════════════════════════════════
function scoreWithinFamily(recipe, family, topN = 3) {
  const styles = Object.keys(HIER.styles).filter(s => HIER.styles[s].family === family);
  const results = [];
  for (const slug of styles) {
    const r = styleMatchScore(slug, recipe);
    if (!r || r.normalized <= 0) continue;
    results.push({
      slug,
      displayTR: defs[slug]?.displayTR || slug,
      score: r.score,
      max:   r.max,
      normalized: r.normalized,
      breakdown:  r.breakdown,
    });
  }
  results.sort((a, b) => b.score - a.score || b.normalized - a.normalized);
  return results.slice(0, topN);
}

// ═══════════════════════════════════════════════════════════════════════════
// ANA FONKSIYON — hiyerarsik siniflandirma
// softFallback: L2'nin top-N ailesini de degerlendir (L2 hata toleransi)
// ═══════════════════════════════════════════════════════════════════════════
function classifyHierarchical(recipe, opts = {}) {
  const topN         = opts.topN || 3;
  const softFallback = opts.softFallback !== false;        // default ON
  const fallbackK    = opts.fallbackK    || 2;             // kac aileden toplayacak

  const l1 = classifyFermType(recipe);
  const l2 = classifyFamily(recipe, l1.ferm_type);

  let l3;
  let consideredFamilies;
  if (softFallback && l2.ranks && l2.ranks.length > 1) {
    // Top-K aileyi degerlendir, birlesik sirala
    consideredFamilies = l2.ranks.filter(r => r.score > 0).slice(0, fallbackK).map(r => r.family);
    if (consideredFamilies.length === 0) consideredFamilies = [l2.family];
    const combined = [];
    for (const fam of consideredFamilies) {
      const top = scoreWithinFamily(recipe, fam, 5);
      top.forEach(x => combined.push({ ...x, _family: fam }));
    }
    combined.sort((a, b) => b.score - a.score || b.normalized - a.normalized);
    l3 = combined.slice(0, topN);
  } else {
    consideredFamilies = [l2.family];
    l3 = scoreWithinFamily(recipe, l2.family, topN);
  }

  return {
    ferm_type: l1.ferm_type,
    family:    l2.family,
    consideredFamilies,
    top3:      l3,
    levels: {
      '1': l1,
      '2': l2,
      '3': l3,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifyHierarchical,
    classifyFermType,
    classifyFamily,
    scoreWithinFamily,
    scoreFamily,
    FAMILY_SIGNATURES,
    HIER,
  };
}

// ═══ CLI test modu: node style_engine_v2.js ═══
if (require.main === module) {
  const testRecipes = [
    { name: 'Pilsner Urquell clone', recipe: { _og:1.047, _fg:1.011, _abv:4.7, _ibu:35, _srm:4, _mayaTip:'lager', mayaId:'wy2278', hopIds:['saaz'], maltIds:['floor_malted_bohemian_pilsner'], percents:{pilsnerPct:100} } },
    { name: 'Sierra Nevada PA',      recipe: { _og:1.054, _fg:1.012, _abv:5.6, _ibu:37, _srm:11, _mayaTip:'ale',   mayaId:'us05',   hopIds:['cascade','magnum'], maltIds:['2_row','crystal_60'], percents:{baseMaltPct:90,crystalPct:10} } },
    { name: 'Hefeweizen',            recipe: { _og:1.050, _fg:1.010, _abv:5.3, _ibu:14, _srm:4,  _mayaTip:'wheat', mayaId:'wy3068', hopIds:['hallertau'], maltIds:['pilsner','wheat_malt'], percents:{pilsnerPct:50,wheatPct:50} } },
    { name: 'Cantillon Gueuze',      recipe: { _og:1.050, _fg:1.004, _abv:6.0, _ibu:10, _srm:5,  _mayaTip:'brett', mayaId:'roeselare', hopIds:['aged_saaz'], maltIds:['pilsner','raw_wheat'], percents:{pilsnerPct:60,wheatPct:40} } },
    { name: 'Kölsch',                recipe: { _og:1.046, _fg:1.009, _abv:4.8, _ibu:22, _srm:3,  _mayaTip:'ale',   mayaId:'wlp029', hopIds:['hallertau','tettnang'], maltIds:['pilsner'], percents:{pilsnerPct:100} } },
    { name: 'Peach IPA',             recipe: { _og:1.062, _fg:1.014, _abv:6.5, _ibu:55, _srm:8,  _mayaTip:'ale',   mayaId:'us05',   hopIds:['citra','mosaic'], maltIds:['2_row'], katkiIds:['peach_puree'], percents:{baseMaltPct:100} } },
  ];

  console.log('═══ style_engine_v2.js — classify test ═══\n');
  for (const t of testRecipes) {
    const r = classifyHierarchical(t.recipe);
    console.log('● ' + t.name);
    console.log('  Seviye 1 (ferm_type): ' + r.ferm_type + '  [' + r.levels['1'].reason + ']');
    console.log('  Seviye 2 (family):    ' + r.family    + '  [score=' + r.levels['2'].chosen_score + ']');
    console.log('  Seviye 3 (top-3):');
    r.top3.slice(0,3).forEach((x,i)=>console.log('    '+(i+1)+'. '+x.slug+' ('+x.displayTR+') %'+x.normalized));
    console.log('');
  }
}
