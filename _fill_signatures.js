const fs = require('fs');
const bmSigs = JSON.parse(fs.readFileSync('./BM_signatures.json','utf8'));
const defs = JSON.parse(fs.readFileSync('./STYLE_DEFINITIONS.json','utf8'));

// Regex helper (serialized form: {__regex, flags})
const R = (src, flags='i') => ({ __regex: src, flags });

// ═══ MANUEL SIGNATURES — kritik stiller icin ozel tanim ═══
// Her biri: wheatPct/pilsnerPct/etc. aralik + banMalt + bonusMaya + bonusHop + bonusKatki
const MANUAL_SIGS = {
  // ─── BJCP Specialty IPA ailesi (7) ───
  'specialty_ipa_belgian_ipa': {
    baseMaltPct:[70,95], crystalPct:[0,10], sugarPct:[0,10],
    banMalt:R('roasted_barley|chocolate'),
    bonusMaya:R('be256|wy3944|wlp550|wlp570|wy3463|t58|bb_belc|bb_abbaye'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|galaxy|columbus|chinook|amarillo|hallertau|tettnang|styrian|ekg'),
  },
  'specialty_ipa_black_ipa': {
    baseMaltPct:[65,85], crystalPct:[2,10], chocPct:[0,5], roastedPct:[1,5],
    dehuskedBlack: R('dehusked|midnight|sinamar|crf1|crf2|crf3|carafa'),
    banMalt:R('smoked|rauch'),
    bonusMaya:R('us05|wy1056|wlp001|bry97|s04|kveik'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus|chinook|amarillo'),
  },
  'specialty_ipa_brown_ipa': {
    baseMaltPct:[65,85], crystalPct:[5,15], chocPct:[1,5], munichPct:[0,15],
    banMalt:R('roasted_barley'),
    bonusMaya:R('us05|wy1056|wlp001|bry97|s04'),
    bonusHop:R('cascade|centennial|citra|columbus|chinook|amarillo'),
  },
  'specialty_ipa_red_ipa': {
    baseMaltPct:[70,90], crystalPct:[8,20], munichPct:[0,10], viennaPct:[0,15],
    bonusMaya:R('us05|wy1056|wlp001|bry97'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus|chinook'),
  },
  'specialty_ipa_rye_ipa': {
    baseMaltPct:[55,80], ryePct:[10,30], crystalPct:[0,10],
    bonusMaya:R('us05|wy1056|wlp001|bry97'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|amarillo|columbus'),
  },
  'specialty_ipa_white_ipa': {
    wheatPct:[20,40], pilsnerPct:[50,75], oatsPct:[0,10],
    bonusKatki:R('koriander|coriander|portakal|orange|kisnis'),
    bonusMaya:R('wy3944|wb06|wlp410|be256|wy3463|us05'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|amarillo'),
  },
  'specialty_ipa_brut_ipa': {
    pilsnerPct:[70,95], sugarPct:[0,15], crystalPct:[0,5],
    banMalt:R('chocolate|roasted|crystal_dark|c60|c80|c120'),
    bonusKatki:R('amilaz|amylase|ao|starsan'),
    bonusMaya:R('us05|wy1056|wlp001|kveik|voss|hornindal'),
    bonusHop:R('nelson|motueka|citra|mosaic|galaxy|amarillo|simcoe'),
  },

  // ─── BA-özgü stiller (BJCP'de yok) ───
  'south_german_bernsteinfarbenes_weizen': {
    wheatPct:[50,70], pilsnerPct:[15,30], munichPct:[5,20], crystalPct:[0,5],
    banMalt:R('roasted_barley|chocolate|black'),
    bonusMaya:R('wb06|wy3068|wlp300|mj_m20|la_munich|bb_weissbier'),
    bonusHop:R('hallertau|tettnang|saaz|hersbrucker|spalt|mittelfrueh'),
  },
  'german_rye_ale': {
    pilsnerPct:[40,60], ryePct:[10,30], wheatPct:[10,25],
    bonusMaya:R('wb06|wy3068|wlp300|us05|wy1056'),
    bonusHop:R('hallertau|tettnang|saaz|hersbrucker|spalt|mittelfrueh'),
  },
  'bamberg_weiss_rauchbier': {
    wheatPct:[40,60], pilsnerPct:[25,45], smokedPct:[15,40],
    smoked:R('smoked|rauch|smk'),
    bonusMaya:R('wb06|wy3068|wlp300|mj_m20|bb_weissbier'),
    bonusHop:R('hallertau|tettnang|saaz|spalt'),
  },
  'bamberg_helles_rauchbier': {
    pilsnerPct:[60,80], smokedPct:[15,40],
    smoked:R('smoked|rauch|smk'),
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833'),
    bonusHop:R('hallertau|tettnang|saaz|spalt|mittelfrueh'),
  },
  'bamberg_bock_rauchbier': {
    pilsnerPct:[40,60], munichPct:[20,40], smokedPct:[15,40], viennaPct:[0,20],
    smoked:R('smoked|rauch|smk'),
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833|wlp838'),
    ogMin:1.060,
  },
  'franconian_rotbier': {
    pilsnerPct:[40,60], munichPct:[30,50], crystalPct:[5,15],
    bonusMaya:R('w3470|s23|s189|wy2124|wy2206|wy2308|wlp830|wlp833|wlp838'),
    bonusHop:R('hallertau|tettnang|spalt|mittelfrueh'),
  },

  // ─── Weizen (ek) ───
  'dunkles_weissbier': {
    wheatPct:[50,70], pilsnerPct:[10,30], munichPct:[10,30], chocPct:[0,3],
    banMalt:R('roasted_barley'),
    bonusMaya:R('wb06|wy3068|wlp300|mj_m20|la_munich|bb_weissbier'),
    bonusHop:R('hallertau|tettnang|saaz|hersbrucker|spalt'),
  },

  // ─── Lambic/Wild ───
  'belgian_gueuze': {
    pilsnerPct:[60,80], wheatPct:[20,40], aged:true,
    bonusMaya:R('brett|roeselare|wlp650|wlp655|wlp677|wy5526|wy5335|oyl605|lambic'),
    banMalt:R('crystal|roasted_barley|chocolate'),
    markerRequired:R('brett|lactobacillus|pediococcus|roeselare|lambic'),
  },
  'belgian_spontaneous_fermented_ale': {
    pilsnerPct:[60,80], wheatPct:[20,40],
    bonusMaya:R('brett|roeselare|wlp650|wlp655|wlp677|wy5526|wy5335|oyl605|lambic'),
  },
  'straight_sour_beer': {
    pilsnerPct:[60,90], wheatPct:[10,30],
    bonusMaya:R('la_philly|bb_philly|lacto|wlp677|lactobacillus|brett'),
  },
  'mixed_fermentation_sour_beer': {
    pilsnerPct:[40,80], wheatPct:[10,40],
    bonusMaya:R('brett|roeselare|wlp650|wlp655|lacto|wy5335|oyl605'),
  },

  // ─── Flanders ───
  'flanders_red_ale': {
    pilsnerPct:[40,60], viennaPct:[10,25], munichPct:[5,15], crystalPct:[10,25],
    bonusMaya:R('roeselare|wlp655|wy3763|wy5335|lacto|brett'),
    aged:true,
  },
  'oud_bruin': {
    pilsnerPct:[40,60], munichPct:[15,35], crystalPct:[10,25], chocPct:[0,5],
    bonusMaya:R('roeselare|wlp655|wy1581|lacto|brett'),
    aged:true,
  },

  // ─── Stout/Porter ek ───
  'american_porter': {
    baseMaltPct:[70,85], crystalPct:[5,15], chocPct:[3,8], roastedPct:[2,5],
    bonusMaya:R('us05|wy1056|wlp001|bry97|s04'),
    bonusHop:R('cascade|centennial|columbus|chinook|willamette|amarillo'),
  },
  'american_imperial_porter': {
    baseMaltPct:[65,80], crystalPct:[5,15], chocPct:[5,12], roastedPct:[3,8],
    bonusMaya:R('us05|wy1056|wlp001|wy1007|wlp090'),
    ogMin:1.080,
  },

  // ─── IPA ek ───
  'double_ipa': {
    baseMaltPct:[75,92], crystalPct:[0,10], sugarPct:[0,10],
    banMalt:R('roasted_barley|chocolate'),
    bonusMaya:R('us05|wy1056|wlp001|wy1007|wlp090|wy1318|bry97'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus|chinook|amarillo|galaxy|el_dorado'),
    ogMin:1.065,
  },
  'india_pale_ale': { // BA standalone IPA (high gravity)
    baseMaltPct:[75,90], crystalPct:[0,10],
    bonusMaya:R('us05|wy1056|wlp001|bry97'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus|chinook|amarillo'),
  },

  // ─── Historical (BJCP) ───
  'historical_beer_roggenbier': {
    pilsnerPct:[30,50], ryePct:[30,50], munichPct:[10,25],
    banMalt:R('roasted_barley|black_malt'),
    bonusMaya:R('wb06|wy3068|wlp300|mj_m20'),
    bonusHop:R('hallertau|tettnang|saaz|spalt'),
  },
  'historical_beer_kellerbier': {
    pilsnerPct:[50,80], munichPct:[10,30], viennaPct:[0,15],
    bonusMaya:R('w3470|s23|s189|wy2124|wlp830|wlp833'),
    bonusHop:R('hallertau|tettnang|saaz|spalt|mittelfrueh'),
  },
  'historical_beer_kentucky_common': {
    pilsnerPct:[50,70], cornPct:[20,35], crystalPct:[2,8], chocPct:[1,3],
    bonusMaya:R('us05|wy1056|wlp001|bry97|s04'),
  },
  'historical_beer_lichtenhainer': {
    wheatPct:[40,60], pilsnerPct:[40,60], smokedPct:[10,30],
    smoked:R('smoked|rauch|smk'),
    bonusMaya:R('lacto|la_philly|bb_philly|wlp677|brett'),
  },
  'historical_beer_london_brown_ale': {
    baseMaltPct:[60,80], crystalPct:[15,30], chocPct:[2,6], lactose:true,
    bonusMaya:R('wlp002|wy1968|wy1187|s04|bry97'),
  },
  'historical_beer_piwo_grodziskie': {
    wheatPct:[50,100], smokedPct:[20,50],
    smoked:R('smoked|oak_smoked|rauch|smk'),
    bonusMaya:R('wb06|wy3068|wlp300|kolsch|wy2565'),
  },
  'historical_beer_pre_prohibition_lager': {
    pilsnerPct:[55,75], cornPct:[15,30], ricePct:[0,15],
    bonusMaya:R('w3470|s23|s189|wy2124|wlp830|wlp840'),
    bonusHop:R('cluster|hallertau|tettnang|saaz'),
  },
  'historical_beer_pre_prohibition_porter': {
    baseMaltPct:[60,80], chocPct:[5,12], crystalPct:[5,15], cornPct:[0,15],
    bonusMaya:R('wlp002|wy1968|wy1187|s04|bry97|w3470|s23'),
  },
  'historical_beer_sahti': {
    baseMaltPct:[60,90], ryePct:[0,25],
    bonusKatki:R('juniper|ardic|ardıç'),
    bonusMaya:R('kveik|wb06|wy3068|voss|hornindal'),
    markerRequired:R('juniper|ardic|ardıç'),
  },

  // ─── Farmhouse ek ───
  'swedish_gotlandsdricke': {
    baseMaltPct:[50,85], smokedPct:[0,20],
    bonusKatki:R('juniper|ardic|ardıç'),
    bonusMaya:R('kveik|voss|hornindal'),
  },

  // ─── Other/Local ───
  'x3_italian_grape_ale': {
    baseMaltPct:[40,70], pilsnerPct:[30,60],
    bonusKatki:R('uzum|grape|wine|must|moscato'),
    fruit:R('uzum|grape|grape_must'),
    bonusMaya:R('be134|wy3711|wy3724|wy3463|wlp565|wlp001'),
  },
  'x2_ipa_argenta': {
    baseMaltPct:[70,90], crystalPct:[2,10],
    bonusHop:R('cascade|centennial|citra|mosaic|amarillo|simcoe'),
    bonusMaya:R('us05|wy1056|wlp001|bry97|s04'),
  },
  'x5_new_zealand_pilsner': {
    pilsnerPct:[80,100], crystalPct:[0,5],
    banMalt:R('chocolate|roasted_barley|crystal_dark'),
    bonusHop:R('motueka|nelson|riwaka|wai_iti|wakatu|green_bullet|taiheke'),
    bonusMaya:R('w3470|s23|wlp833|wy2007|wy2124|wy2308'),
  },

  // ─── Belgian ek ───
  'other_belgian_style_ale': {
    pilsnerPct:[40,80],
    bonusMaya:R('be256|wy3944|wy3463|wy3522|wy3787|wlp500|wlp530|wlp550|t58|bb_belc'),
  },
  'belgian_fruit_beer': {
    pilsnerPct:[40,70], wheatPct:[0,30],
    fruit:R('visne|cherry|ahududu|raspberry|kriek|framboise|meyve|fruit'),
    bonusMaya:R('brett|lambic|roeselare|lacto|be256'),
  },

  // ─── Strong Ale ek ───
  'juicy_or_hazy_strong_pale_ale': {
    baseMaltPct:[60,80], oatsWheatPct:[10,25],
    bonusMaya:R('wy1318|wlp066|wlp095|imperial_b44|lallemand_verdant|voss|hornindal'),
    bonusHop:R('citra|mosaic|galaxy|nelson|el_dorado|amarillo|simcoe'),
  },
  'double_hoppy_red_ale': {
    baseMaltPct:[70,85], crystalPct:[10,20], viennaPct:[0,15],
    bonusMaya:R('us05|wy1056|wlp001|bry97'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus|amarillo'),
    ogMin:1.058,
  },
  'imperial_red_ale': {
    baseMaltPct:[70,85], crystalPct:[12,22], viennaPct:[0,15], munichPct:[0,10],
    bonusMaya:R('us05|wy1056|wlp001|bry97|wy1007'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus'),
    ogMin:1.075,
  },

  // ─── Specialty ingredient-driven ───
  'adambier': {
    baseMaltPct:[40,60], munichPct:[20,35], viennaPct:[10,25], crystalPct:[5,15], smokedPct:[0,15],
    bonusMaya:R('wlp023|wy1318|kolsch|brett'),
    aged:true,
  },
  'dutch_kuit_kuyt_or_koyt': {
    pilsnerPct:[30,45], wheatPct:[20,40], oatsPct:[15,30],
    bonusHop:R('hallertau|saaz|hersbrucker|tettnang'),
    bonusMaya:R('wb06|wy1056|wy3944|us05'),
  },
  'breslau_schoeps': {
    wheatPct:[40,60], pilsnerPct:[40,60],
    bonusMaya:R('wb06|wy3068|wlp300|lacto'),
  },
  'ginjo_beer_or_sake_yeast_beer': {
    pilsnerPct:[60,85], ricePct:[10,30],
    bonusMaya:R('sake|kyokai|k7|k9|k14'),
  },
  'american_belgo_ale': {
    baseMaltPct:[70,90],
    bonusMaya:R('be256|wy3944|wy3463|wy3522|wy3787|wlp500|wlp550|t58'),
    bonusHop:R('cascade|centennial|citra|mosaic|columbus|amarillo|simcoe'),
  },

  // ─── Lager adjunct varyantları ───
  'american_light_lager': {
    pilsnerPct:[50,75], cornPct:[20,40], ricePct:[0,30],
    banMalt:R('crystal|chocolate|roasted'),
    bonusMaya:R('w3470|s23|wy2124|wy2007|wlp840'),
  },
  'american_lager': {
    pilsnerPct:[55,75], cornPct:[15,30], ricePct:[0,20],
    banMalt:R('crystal|chocolate|roasted'),
    bonusMaya:R('w3470|s23|wy2124|wy2007|wlp840'),
  },
  'german_leichtbier': {
    pilsnerPct:[70,95], munichPct:[0,15],
    ogMax:1.034,
    bonusMaya:R('w3470|s23|s189|wy2124|wlp800|wlp830|wlp833'),
    bonusHop:R('hallertau|tettnang|saaz|spalt|mittelfrueh'),
  },
  'international_pale_lager': {
    pilsnerPct:[60,85], cornPct:[10,25], ricePct:[0,15],
    bonusMaya:R('w3470|s23|s189|wy2124|wlp830|wlp840'),
  },
  'international_amber_lager': {
    pilsnerPct:[50,70], munichPct:[15,30], crystalPct:[2,10],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833|wlp838'),
  },
  'international_dark_lager': {
    pilsnerPct:[40,65], munichPct:[20,40], chocPct:[1,5],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833|wlp838'),
  },
  'american_pilsener': {
    pilsnerPct:[75,95], crystalPct:[0,3],
    banMalt:R('chocolate|roasted_barley'),
    bonusMaya:R('w3470|s23|s189|wy2124|wlp833|wlp800'),
    bonusHop:R('cascade|centennial|citra|amarillo|columbus|hallertau|saaz'),
  },
  'american_malt_liquor': {
    pilsnerPct:[40,65], cornPct:[20,40], sugarPct:[5,20],
    bonusMaya:R('w3470|s23|wy2124|wlp840'),
  },
  'american_amber_lager': {
    pilsnerPct:[50,70], munichPct:[15,30], crystalPct:[5,15], viennaPct:[0,15],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833'),
  },
  'american_maerzen_oktoberfest': {
    pilsnerPct:[40,60], munichPct:[25,45], viennaPct:[10,25], crystalPct:[0,10],
    bonusMaya:R('w3470|s23|wy2124|wy2206|wy2633|wlp820|wlp830|wlp833'),
  },
  'mexican_light_lager': {
    pilsnerPct:[60,85], cornPct:[10,25], ricePct:[0,15],
    bonusMaya:R('w3470|s23|wy2124|wy2007|wlp840'),
  },
  'mexican_amber_lager': {
    pilsnerPct:[50,70], munichPct:[15,35], crystalPct:[5,15],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833|wlp838'),
  },
  'mexican_dark_lager': {
    pilsnerPct:[40,60], munichPct:[20,40], chocPct:[2,6], crystalPct:[5,15],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833|wlp838'),
  },
  'west_coast_pilsener': {
    pilsnerPct:[75,95], crystalPct:[0,5],
    banMalt:R('chocolate|roasted_barley'),
    bonusHop:R('cascade|centennial|citra|simcoe|mosaic|columbus|amarillo|chinook'),
    bonusMaya:R('w3470|s23|wlp833|wy2124'),
  },
  'pre_prohibition_lager': {
    pilsnerPct:[55,75], cornPct:[15,30], ricePct:[0,15],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp840'),
    bonusHop:R('cluster|hallertau|tettnang|saaz'),
  },
  'pre_prohibition_porter': {
    baseMaltPct:[60,80], chocPct:[5,12], crystalPct:[5,15], cornPct:[0,15],
    bonusMaya:R('wlp002|wy1968|wy1187|s04|bry97|w3470|s23'),
  },
  'european_dark_lager': {
    pilsnerPct:[40,60], munichPct:[20,40], chocPct:[1,5],
    bonusMaya:R('w3470|s23|wy2124|wlp830|wlp833|wlp838'),
  },
  'new_zealand_pilsner': {
    pilsnerPct:[80,100], crystalPct:[0,5],
    banMalt:R('chocolate|roasted_barley'),
    bonusHop:R('motueka|nelson|riwaka|wai_iti|wakatu|green_bullet|taiheke'),
    bonusMaya:R('w3470|s23|wlp833|wy2007|wy2124|wy2308'),
  },

  // ─── Ale ek ───
  'special_bitter_or_best_bitter': {
    baseMaltPct:[75,90], crystalPct:[5,15],
    bonusMaya:R('wlp002|wy1968|wy1187|s04|london_iii'),
    bonusHop:R('ekg|east_kent|fuggle|target|challenger|styrian|cascade'),
  },
  'english_summer_ale': {
    baseMaltPct:[70,85], wheatPct:[0,20], crystalPct:[0,5],
    bonusMaya:R('wlp002|wy1968|wy1187|s04'),
    bonusHop:R('ekg|fuggle|target|cascade|citra|hallertau'),
  },
  'english_pale_ale': {
    baseMaltPct:[75,90], crystalPct:[5,15],
    bonusMaya:R('wlp002|wy1968|wy1187|s04'),
    bonusHop:R('ekg|east_kent|fuggle|target|styrian|challenger'),
  },
  'english_pale_mild_ale': {
    baseMaltPct:[80,95], crystalPct:[3,10],
    bonusMaya:R('wlp002|wy1968|wy1187|s04'),
    bonusHop:R('ekg|fuggle'),
  },
  'scottish_export_ale': {
    baseMaltPct:[70,88], crystalPct:[5,15], chocPct:[0,3],
    bonusMaya:R('wlp028|wy1728|s04|nottingham'),
  },
  'session_beer': {
    baseMaltPct:[70,95],
    bonusMaya:R('us05|wy1056|wlp001|s04|nottingham'),
    ogMax:1.045,
  },

  // ─── Specialty ingredient containers ───
  'fruit_beer': {
    baseMaltPct:[60,90],
    fruit:R('meyve|fruit|mango|ananas|pineapple|seftali|peach|cilek|strawberry|passion|raspberry|ahududu|visne|cherry|karadut|blackberry|portakal|orange|elma|apple|uzum|grape|pear|armut|karpuz|watermelon'),
  },
  'fruit_and_spice_beer': {
    baseMaltPct:[60,90],
    fruit:R('meyve|fruit'),
    spice:R('koriander|coriander|tarcin|cinnamon|zencefil|ginger|kakule'),
  },
  'grape_ale': {
    pilsnerPct:[40,80],
    fruit:R('uzum|grape|wine|must|moscato'),
    bonusMaya:R('brett|wy3763|roeselare|wy3711|be134'),
  },
  'autumn_seasonal_beer': {
    baseMaltPct:[50,80], crystalPct:[5,15],
    bonusKatki:R('kabak|pumpkin|tarcin|cinnamon|zencefil|ginger|karanfil|clove|kakule|cardamom'),
  },
  'winter_seasonal_beer': {
    baseMaltPct:[55,80], munichPct:[5,20], crystalPct:[5,20],
    bonusKatki:R('tarcin|cinnamon|zencefil|ginger|karanfil|clove|portakal|orange|kakule|meyankoku'),
  },
  'style_smoked_beer': {
    baseMaltPct:[40,85], smokedPct:[15,50],
    smoked:R('smoked|rauch|smk|oak_smoked|peat'),
  },
  'specialty_smoked_beer': {
    baseMaltPct:[40,85], smokedPct:[15,50],
    smoked:R('smoked|rauch|smk|oak_smoked|peat'),
  },
  'smoke_beer': {
    baseMaltPct:[40,85], smokedPct:[15,50],
    smoked:R('smoked|rauch|smk|oak_smoked|peat'),
  },
  'wood_aged_beer': {
    baseMaltPct:[50,90],
    bonusKatki:R('wood|barrel|fıçı|bourbon|rum|sherry|port|wine_barrel|oak'),
    aged:true,
  },
  'specialty_wood_aged_beer': {
    baseMaltPct:[50,90],
    bonusKatki:R('wood|barrel|fıçı|bourbon|rum|sherry|port|wine_barrel|oak'),
    aged:true,
  },
  'wood_and_barrel_aged_sour_beer': {
    baseMaltPct:[50,90],
    bonusKatki:R('wood|barrel|fıçı|bourbon|oak'),
    bonusMaya:R('brett|roeselare|lambic|wlp650|wlp655|wy5335|wy5526'),
    aged:true,
  },
  'field_beer': {
    baseMaltPct:[55,85],
    bonusKatki:R('karpuz|watermelon|salatalik|cucumber|chili|biber|zencefil|cilek|domates|tomato|roka|balkabak|pumpkin'),
  },
  'pumpkin_squash_beer': {
    baseMaltPct:[50,80], crystalPct:[5,20],
    bonusKatki:R('pumpkin|kabak|squash|butternut|tarcin|cinnamon|zencefil|karanfil|clove|kakule'),
  },
  'rye_beer': {
    pilsnerPct:[35,65], ryePct:[15,40],
    bonusHop:R('cascade|citra|hallertau|saaz|tettnang'),
  },
  'aged_beer': {
    baseMaltPct:[60,90],
    aged:true,
  },
  'gluten_free_beer': {
    baseMaltPct:[0,20],
    bonusKatki:R('sorgum|sorghum|buckwheat|karabugday|rice|millet|dari|glutensiz|gluten_free'),
  },
  'spice_herb_or_vegetable_beer': {
    baseMaltPct:[55,90],
    spice:R('tarcin|cinnamon|zencefil|ginger|karanfil|clove|kakule|portakal|orange|koriander|coriander|nane|mint|rosemary|biberiye|kisnis|lavender|lavanta|gul|rose|elderflower|chamomile|papatya|thyme|kekik'),
  },
  'other_strong_ale_or_lager': {
    baseMaltPct:[70,95],
    ogMin:1.070,
  },

  // ─── Other ───
  'australian_pale_ale': {
    baseMaltPct:[80,95], crystalPct:[0,8],
    bonusMaya:R('us05|wlp001|wy1056|nottingham|bry97'),
    bonusHop:R('galaxy|ella|vic_secret|enigma|topaz'),
  },
  'international_pale_ale': {
    baseMaltPct:[75,92], crystalPct:[0,10],
    bonusMaya:R('us05|wy1056|wlp001|nottingham|bry97'),
    bonusHop:R('cascade|centennial|citra|hallertau|saaz|amarillo|columbus|chinook'),
  },
  'new_zealand_pale_ale': {
    baseMaltPct:[80,95], crystalPct:[0,8],
    bonusHop:R('motueka|nelson|riwaka|wai_iti|wakatu|taiheke|green_bullet'),
    bonusMaya:R('us05|wlp001|wy1056|nottingham'),
  },
  'new_zealand_india_pale_ale': {
    baseMaltPct:[75,90], crystalPct:[0,10],
    bonusHop:R('motueka|nelson|riwaka|wai_iti|wakatu|taiheke|green_bullet|pacific_jade|pacific_gem'),
    bonusMaya:R('us05|wlp001|wy1056|nottingham|kveik'),
  },
};

// ═══ KATEGORI BAZLI DEFAULT ═══
// Used for styles that have NO manual signature — very loose defaults.
const CAT_DEFAULTS = {
  lager:        { pilsnerPct:[50,90], bonusMaya:R('w3470|s23|s189|wy2124|wy2007|wlp830|wlp833|wlp838|wlp840'), banMalt:R('chocolate|roasted_barley') },
  ipa:          { baseMaltPct:[65,92], bonusMaya:R('us05|wy1056|wlp001|bry97|nottingham|kveik'), bonusHop:R('cascade|centennial|citra|simcoe|mosaic|galaxy|columbus|chinook|amarillo|motueka|nelson') },
  stout_porter: { baseMaltPct:[55,80], chocPct:[2,10], roastedPct:[2,10], bonusMaya:R('us05|wy1056|wlp001|wlp002|wy1968|s04|bry97') },
  weizen:       { wheatPct:[40,70], bonusMaya:R('wb06|wy3068|wlp300|mj_m20|bb_weissbier') },
  witbier:      { wheatPct:[30,55], bonusMaya:R('wy3944|wb06|wlp410|bb_belc'), bonusKatki:R('koriander|coriander|portakal|orange') },
  belgian:      { pilsnerPct:[40,85], bonusMaya:R('be256|wy3944|wy3463|wy3522|wy3787|wlp500|wlp530|wlp550|wlp570|t58') },
  saison:       { pilsnerPct:[50,85], bonusMaya:R('be134|wy3711|wy3724|wy3463|wlp565|wlp590') },
  lambic:       { pilsnerPct:[50,80], wheatPct:[20,40], bonusMaya:R('brett|lambic|wlp650|wlp655|wy5526|roeselare') },
  flanders:     { pilsnerPct:[40,70], bonusMaya:R('roeselare|wlp655|wy3763|wy5335') },
  wild:         { bonusMaya:R('brett|roeselare|wlp650|wlp655|wy5335|oyl605|lacto') },
  sour_kettle:  { pilsnerPct:[50,85], bonusMaya:R('la_philly|bb_philly|lacto|wlp677|wy5335|brett') },
  farmhouse:    { baseMaltPct:[60,90], bonusMaya:R('kveik|voss|hornindal|saison') },
  ale:          { baseMaltPct:[70,92], bonusMaya:R('us05|wy1056|wlp001|wlp002|wy1968|s04|nottingham|bry97') },
  strong_ale:   { baseMaltPct:[70,92], bonusMaya:R('us05|wlp001|wy1056|wy1007|wy1968|wlp007'), ogMin:1.060 },
  specialty:    { baseMaltPct:[50,90] },
  other:        { baseMaltPct:[60,90] },
};

// ═══ APPLY ═══
let filled = 0, catFilled = 0;
for (const slug of Object.keys(defs)) {
  const d = defs[slug];
  if (!d || d.signature) continue;
  if (MANUAL_SIGS[slug]) {
    d.signature = { ...MANUAL_SIGS[slug], __source:'manual' };
    filled++;
  } else if (CAT_DEFAULTS[d.category]) {
    d.signature = { ...CAT_DEFAULTS[d.category], __source:'category_default:'+d.category };
    catFilled++;
  }
}

fs.writeFileSync('./STYLE_DEFINITIONS.json', JSON.stringify(defs, null, 2), 'utf8');
console.log('Manual signature eklendi:', filled);
console.log('Kategori-default eklendi:', catFilled);
const all = Object.values(defs).filter(Boolean);
console.log('Signature coverage:', all.filter(d=>d.signature).length, '/', all.length);
console.log('Hala eksik:', all.filter(d=>!d.signature).length);
