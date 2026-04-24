const { findBestMatches, styleMatchScore } = require('./style_engine.js');

// Her reçete: { id, name, expected (primary), alternatives (kabul edilebilir top-3), recipe }
// recipe formatı: _og, _fg, _ibu, _srm, _abv, _mayaTip, percents, mayaId, hopIds, katkiIds, maltIds, lactose, filtered, aged
const R = {
  // ═══ WEIZEN AILESI (8) ═══
  muzo_hefeweizen: {
    name: "Muzo Hefeweizen",
    expected: 'south_german_hefeweizen',
    alternatives: ['american_wheat_beer','south_german_kristal_weizen'],
    recipe: { _og:1.050,_fg:1.012,_ibu:14,_srm:5,_abv:5.0,_mayaTip:'wheat', percents:{wheatPct:54.5,pilsnerPct:45,baseMaltPct:45,oatsWheatPct:54.5}, mayaId:'wb06', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['wheat','pilsner'] },
  },
  kristal_weizen: {
    name: "Kristal Weizen (filtrelenmiş)",
    expected: 'south_german_kristal_weizen',
    alternatives: ['south_german_hefeweizen'],
    recipe: { _og:1.052,_fg:1.010,_ibu:12,_srm:4,_abv:5.2,_mayaTip:'wheat', percents:{wheatPct:55,pilsnerPct:45,oatsWheatPct:55}, mayaId:'wy3068', hopIds:['hallertau'], katkiIds:[], maltIds:['wheat','pilsner'], filtered:true },
  },
  dunkelweizen: {
    name: "Dunkelweizen",
    // BA adı 'South German-Style Dunkel Weizen' ve BJCP adı 'Dunkles Weissbier' ayrı kayıtlar.
    // Dunkles Weissbier (BJCP 10B, sadece BJCP'de) kazanabilir — kabul edilebilir alias.
    expected: 'south_german_dunkel_weizen',
    alternatives: ['dunkles_weissbier','south_german_hefeweizen','south_german_weizenbock'],
    recipe: { _og:1.053,_fg:1.012,_ibu:15,_srm:17,_abv:5.3,_mayaTip:'wheat', percents:{wheatPct:55,pilsnerPct:15,munichPct:25,chocPct:3,oatsWheatPct:55}, mayaId:'wb06', hopIds:['hallertau'], katkiIds:[], maltIds:['wheat','pilsner','munich','chocolate'] },
  },
  weizenbock: {
    name: "Weizenbock (klasik)",
    expected: 'south_german_weizenbock',
    alternatives: ['south_german_dunkel_weizen'],
    recipe: { _og:1.075,_fg:1.018,_ibu:22,_srm:18,_abv:7.8,_mayaTip:'wheat', percents:{wheatPct:55,pilsnerPct:15,munichPct:25,chocPct:3,oatsWheatPct:55}, mayaId:'wy3068', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['wheat','pilsner','munich'] },
  },
  leichtes_weizen: {
    name: "Leichtes Weizen (düşük ABV)",
    expected: 'german_leichtes_weizen',
    alternatives: ['south_german_hefeweizen'],
    recipe: { _og:1.038,_fg:1.008,_ibu:10,_srm:5,_abv:3.0,_mayaTip:'wheat', percents:{wheatPct:55,pilsnerPct:45,oatsWheatPct:55}, mayaId:'wb06', hopIds:['hallertau'], katkiIds:[], maltIds:['wheat','pilsner'] },
  },
  bernsteinfarbenes: {
    name: "Bernsteinfarbenes Weizen (amber)",
    expected: 'south_german_bernsteinfarbenes_weizen',
    alternatives: ['south_german_dunkel_weizen','south_german_hefeweizen'],
    recipe: { _og:1.052,_fg:1.012,_ibu:12,_srm:11,_abv:5.2,_mayaTip:'wheat', percents:{wheatPct:55,pilsnerPct:22,munichPct:18,crystalPct:3,oatsWheatPct:55}, mayaId:'wy3068', hopIds:['hallertau'], katkiIds:[], maltIds:['wheat','pilsner','munich','crystal'] },
  },
  american_hefeweizen: {
    name: "American Hefeweizen (US-05)",
    expected: 'american_wheat_beer',
    alternatives: ['south_german_hefeweizen'],
    recipe: { _og:1.048,_fg:1.010,_ibu:18,_srm:5,_abv:4.8,_mayaTip:'ale', percents:{wheatPct:50,pilsnerPct:50,baseMaltPct:50,oatsWheatPct:50}, mayaId:'us05', hopIds:['cascade','hallertau'], katkiIds:[], maltIds:['wheat','pilsner'] },
  },
  american_wheat_ipa: {
    name: "American Wheat IPA",
    expected: 'american_wheat_beer',  // American Wheat Beer (IPA alt dalı ayrı)
    alternatives: ['juicy_or_hazy_india_pale_ale','american_india_pale_ale'],
    recipe: { _og:1.060,_fg:1.012,_ibu:45,_srm:5,_abv:6.2,_mayaTip:'ale', percents:{wheatPct:40,baseMaltPct:60,oatsWheatPct:40}, mayaId:'us05', hopIds:['citra','mosaic','amarillo'], katkiIds:[], maltIds:['wheat','pale'] },
  },
  // Kaan'in gercek reçetesi — yuksek-ABV hopsu buğday, IBU 28 (Hefe için çok yüksek,
  // Weizenbock için ABV sınırında ama yine en iyi aday). Eski sp() Saison dedi (yanlıs).
  kaan_hoppy_wheat: {
    name: "Kaan Hoppy Wheat (Buğday 71% + Maris, IBU 28, ABV 6.01)",
    expected: 'south_german_weizenbock',
    alternatives: ['american_wheat_beer','south_german_hefeweizen','international_pale_ale'],
    recipe: { _og:1.061,_fg:1.016,_ibu:28,_srm:5,_abv:6.01,_mayaTip:'wheat',
      mayaId:'bb_alman_bugday', maya2Id:'',
      hopIds:['hallertau'], maltIds:['wheat','maris_otter'], katkiIds:[],
      percents:{ wheatPct:71, oatsWheatPct:71, oatsPct:0, pilsnerPct:29, baseMaltPct:100,
                 munichPct:0, viennaPct:0, crystalPct:0, chocPct:0, roastPct:0,
                 cornPct:0, ricePct:0, sugarPct:0 },
      lactose:false, filtered:false, aged:false },
  },
  // ═══ WITBIER (3) ═══
  classic_witbier: {
    name: "Klasik Witbier (koriander+portakal)",
    expected: 'belgian_witbier',
    alternatives: ['spiced_wheat_beer'],
    recipe: { _og:1.050,_fg:1.010,_ibu:15,_srm:3,_abv:5.2,_mayaTip:'wit', percents:{wheatPct:45,pilsnerPct:50,oatsPct:5}, mayaId:'wy3944', hopIds:['hallertau','saaz'], katkiIds:['koriander','portakal'], maltIds:['wheat','pilsner','oat'] },
  },
  spiced_witbier: {
    name: "Baharatli Witbier (koriander+portakal+zencefil)",
    expected: 'belgian_witbier',
    alternatives: ['fruit_wheat_beer'],
    recipe: { _og:1.052,_fg:1.012,_ibu:15,_srm:3.5,_abv:5.2,_mayaTip:'wit', percents:{wheatPct:45,pilsnerPct:50,oatsPct:5}, mayaId:'wb06', hopIds:['hallertau'], katkiIds:['koriander','portakal','zencefil'], maltIds:['wheat','pilsner'] },
  },
  blanche_sour: {
    name: "Blanche Sour (ekşi witbier)",
    expected: 'belgian_witbier',
    alternatives: ['american_sour_ale'],
    recipe: { _og:1.045,_fg:1.008,_ibu:10,_srm:3,_abv:4.8,_mayaTip:'sour', percents:{wheatPct:45,pilsnerPct:50,oatsPct:5}, mayaId:'lacto', hopIds:['hallertau'], katkiIds:['koriander','portakal'], maltIds:['wheat','pilsner','oat'] },
  },
  // ═══ BELCIKA SADE (5) ═══
  belgian_pale: {
    name: "Belgian Pale Ale",
    expected: 'belgian_speciale_belge',
    alternatives: ['modern_belgian_pale_ale'],
    recipe: { _og:1.050,_fg:1.012,_ibu:24,_srm:11,_abv:5.0,_mayaTip:'belcika', percents:{pilsnerPct:75,munichPct:10,aromaticMunichPct:10,aromaticAbbeyMunichPct:10,crystalPct:5,baseMaltPct:75}, mayaId:'wy3944', hopIds:['styrian','ekg'], katkiIds:[], maltIds:['pilsner','munich','aromatic','crystal'] },
  },
  belgian_blonde: {
    name: "Belgian Blonde",
    expected: 'belgian_blonde_ale',
    alternatives: ['belgian_speciale_belge'],
    recipe: { _og:1.065,_fg:1.012,_ibu:22,_srm:5,_abv:7.0,_mayaTip:'belcika', percents:{pilsnerPct:88,aromaticMunichPct:5,aromaticAbbeyMunichPct:5,sugarPct:7}, mayaId:'wlp500', hopIds:['styrian','saaz'], katkiIds:[], maltIds:['pilsner','aromatic','candy_clr'] },
  },
  belgian_strong_golden: {
    name: "Belgian Strong Golden",
    expected: 'belgian_strong_blonde_ale',
    alternatives: ['belgian_tripel'],
    recipe: { _og:1.078,_fg:1.008,_ibu:28,_srm:4,_abv:9.2,_mayaTip:'belcika', percents:{pilsnerPct:82,sugarPct:15,aromaticMunichPct:3}, mayaId:'wy3787', hopIds:['styrian','saaz'], katkiIds:[], maltIds:['pilsner','candy_clr'] },
  },
  classic_dubbel: {
    name: "Klasik Dubbel",
    expected: 'belgian_dubbel',
    alternatives: ['belgian_strong_dark_ale'],
    recipe: { _og:1.068,_fg:1.014,_ibu:22,_srm:18,_abv:7.0,_mayaTip:'belcika', percents:{pilsnerPct:65,munichPct:20,aromaticAbbeyMunichPct:20,aromaticMunichPct:20,sugarPct:12,crystalPct:3}, mayaId:'wlp530', hopIds:['styrian'], katkiIds:['candy_drk'], maltIds:['pilsner','munich','aromatic','candy_drk'] },
  },
  classic_tripel: {
    name: "Klasik Tripel",
    expected: 'belgian_tripel',
    alternatives: ['belgian_strong_blonde_ale'],
    recipe: { _og:1.082,_fg:1.010,_ibu:30,_srm:5,_abv:9.5,_mayaTip:'belcika', percents:{pilsnerPct:82,sugarPct:15,aromaticMunichPct:3}, mayaId:'wy3787', hopIds:['styrian','saaz'], katkiIds:['candy_clr'], maltIds:['pilsner','candy_clr'] },
  },
  // ═══ BELCIKA KOYU/GUCLU (3) ═══
  dark_strong: {
    name: "Belgian Dark Strong",
    expected: 'belgian_strong_dark_ale',
    alternatives: ['belgian_quadrupel','belgian_dubbel'],
    recipe: { _og:1.085,_fg:1.018,_ibu:28,_srm:22,_abv:9.0,_mayaTip:'belcika', percents:{pilsnerPct:55,munichPct:25,aromaticAbbeyMunichPct:25,aromaticMunichPct:25,crystalPct:8,chocPct:3,sugarPct:10}, mayaId:'wlp530', hopIds:['styrian'], katkiIds:['candy_drk'], maltIds:['pilsner','munich','aromatic','chocolate','candy_drk'] },
  },
  quadrupel: {
    name: "Belgian Quadrupel",
    expected: 'belgian_quadrupel',
    alternatives: ['belgian_strong_dark_ale'],
    recipe: { _og:1.100,_fg:1.020,_ibu:35,_srm:22,_abv:11.0,_mayaTip:'belcika', percents:{pilsnerPct:55,munichPct:20,aromaticAbbeyMunichPct:20,aromaticMunichPct:20,crystalPct:8,sugarPct:15,chocPct:2}, mayaId:'wy3787', hopIds:['styrian'], katkiIds:['candy_drk'], maltIds:['pilsner','munich','aromatic','candy_drk'] },
  },
  barrel_aged_quad: {
    name: "Bourbon Barrel Aged Quad",
    expected: 'belgian_quadrupel',
    alternatives: ['belgian_strong_dark_ale'],
    recipe: { _og:1.105,_fg:1.020,_ibu:30,_srm:22,_abv:12.0,_mayaTip:'belcika', percents:{pilsnerPct:55,munichPct:20,aromaticAbbeyMunichPct:20,aromaticMunichPct:20,crystalPct:5,sugarPct:18}, mayaId:'wy3787', hopIds:['styrian'], katkiIds:['candy_drk','bourbon'], maltIds:['pilsner','munich','aromatic','candy_drk'], aged:true },
  },
  // ═══ SAISON (4) ═══
  classic_saison: {
    name: "Klasik Saison",
    expected: 'french_belgian_saison',
    alternatives: ['specialty_saison','french_bi_re_de_garde'],
    recipe: { _og:1.055,_fg:1.008,_ibu:28,_srm:5,_abv:6.5,_mayaTip:'saison', percents:{pilsnerPct:80,wheatPct:10,munichPct:8}, mayaId:'wy3724', hopIds:['styrian','ekg','saaz'], katkiIds:[], maltIds:['pilsner','wheat','munich'] },
  },
  dark_saison: {
    name: "Dark Saison",
    expected: 'specialty_saison',
    alternatives: ['french_belgian_saison'],
    recipe: { _og:1.060,_fg:1.008,_ibu:25,_srm:14,_abv:7.0,_mayaTip:'saison', percents:{pilsnerPct:60,munichPct:20,crystalPct:8,chocPct:3,viennaPct:10}, mayaId:'wlp565', hopIds:['styrian','saaz'], katkiIds:[], maltIds:['pilsner','munich','crystal','chocolate'] },
  },
  biere_de_garde: {
    name: "Bière de Garde",
    expected: 'french_bi_re_de_garde',
    alternatives: ['french_belgian_saison','specialty_saison'],
    recipe: { _og:1.065,_fg:1.012,_ibu:22,_srm:11,_abv:7.0,_mayaTip:'saison', percents:{pilsnerPct:70,munichPct:15,viennaPct:10,crystalPct:5}, mayaId:'wy3725', hopIds:['styrian','hallertau'], katkiIds:[], maltIds:['pilsner','munich','vienna','crystal'] },
  },
  tropical_saison: {
    name: "Tropical Saison",
    expected: 'specialty_saison',
    alternatives: ['french_belgian_saison'],
    recipe: { _og:1.060,_fg:1.008,_ibu:30,_srm:5,_abv:7.0,_mayaTip:'saison', percents:{pilsnerPct:75,wheatPct:15,munichPct:5}, mayaId:'wy3724', hopIds:['citra','mosaic','galaxy'], katkiIds:['mango','passion'], maltIds:['pilsner','wheat'] },
  },
  // ═══ LAGER ACIK (5) ═══
  german_pils: {
    name: "German Pilsener",
    expected: 'german_pilsener',
    alternatives: ['italian_pilsener','czech_pale_lager'],
    recipe: { _og:1.048,_fg:1.010,_ibu:35,_srm:3.5,_abv:5.0,_mayaTip:'lager', percents:{pilsnerPct:95}, mayaId:'w3470', hopIds:['saaz','hallertau'], katkiIds:[], maltIds:['pilsner'] },
  },
  helles: {
    name: "Munich Helles",
    expected: 'munich_helles',
    alternatives: ['dortmunder_european_export','german_pilsener'],
    recipe: { _og:1.047,_fg:1.011,_ibu:20,_srm:4,_abv:5.0,_mayaTip:'lager', percents:{pilsnerPct:95}, mayaId:'wlp830', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['pilsner'] },
  },
  dortmunder: {
    name: "Dortmunder Export",
    expected: 'dortmunder_european_export',
    alternatives: ['munich_helles','german_pilsener'],
    recipe: { _og:1.054,_fg:1.013,_ibu:28,_srm:5,_abv:5.4,_mayaTip:'lager', percents:{pilsnerPct:90,viennaPct:5}, mayaId:'wlp830', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['pilsner','vienna'] },
  },
  vienna_lager: {
    name: "Vienna Lager",
    expected: 'vienna_lager',
    alternatives: ['german_maerzen','czech_amber_lager'],
    recipe: { _og:1.050,_fg:1.012,_ibu:24,_srm:12,_abv:5.0,_mayaTip:'lager', percents:{viennaPct:60,pilsnerPct:30,munichPct:10,crystalPct:3}, mayaId:'wlp830', hopIds:['hallertau','saaz'], katkiIds:[], maltIds:['vienna','pilsner','munich','crystal'] },
  },
  czech_premium: {
    name: "Czech Premium Pale Lager",
    expected: 'czech_pale_lager',
    alternatives: ['german_pilsener'],
    recipe: { _og:1.053,_fg:1.014,_ibu:40,_srm:4.5,_abv:5.3,_mayaTip:'lager', percents:{pilsnerPct:95,munichPct:2}, mayaId:'wy2278', hopIds:['saaz','kazbek'], katkiIds:[], maltIds:['pilsner','munich'] },
  },
  // ═══ LAGER KOYU/GUCLU (5) ═══
  munich_dunkel: {
    name: "Munich Dunkel",
    expected: 'munich_dunkel',
    alternatives: ['european_dark_lager','german_schwarzbier'],
    recipe: { _og:1.052,_fg:1.013,_ibu:22,_srm:22,_abv:5.0,_mayaTip:'lager', percents:{munichPct:70,pilsnerPct:25,chocPct:3,aromaticMunichPct:70,aromaticAbbeyMunichPct:70}, mayaId:'wlp833', hopIds:['hallertau'], katkiIds:[], maltIds:['munich','pilsner','chocolate'] },
  },
  schwarzbier: {
    name: "Schwarzbier",
    expected: 'german_schwarzbier',
    alternatives: ['munich_dunkel'],
    recipe: { _og:1.052,_fg:1.013,_ibu:25,_srm:27,_abv:5.0,_mayaTip:'lager', percents:{pilsnerPct:60,munichPct:25,chocPct:8,roastedPct:3}, mayaId:'wlp833', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['pilsner','munich','chocolate','roasted'] },
  },
  maerzen: {
    name: "Märzen/Oktoberfest",
    expected: 'german_maerzen',
    alternatives: ['german_oktoberfest_festbier','vienna_lager'],
    recipe: { _og:1.056,_fg:1.012,_ibu:22,_srm:10,_abv:5.8,_mayaTip:'lager', percents:{munichPct:50,pilsnerPct:35,viennaPct:15}, mayaId:'wlp820', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['munich','pilsner','vienna'] },
  },
  doppelbock: {
    name: "Doppelbock",
    expected: 'german_doppelbock',
    alternatives: ['traditional_german_bock','german_eisbock'],
    recipe: { _og:1.080,_fg:1.020,_ibu:22,_srm:18,_abv:8.0,_mayaTip:'lager', percents:{munichPct:80,pilsnerPct:15,chocPct:5,aromaticMunichPct:80}, mayaId:'wlp833', hopIds:['hallertau','tettnang'], katkiIds:[], maltIds:['munich','pilsner','chocolate'] },
  },
  baltic_porter: {
    name: "Baltic Porter",
    expected: 'baltic_porter',
    alternatives: ['robust_porter','american_porter'],
    recipe: { _og:1.072,_fg:1.018,_ibu:30,_srm:28,_abv:7.0,_mayaTip:'lager', percents:{munichPct:50,pilsnerPct:30,chocPct:12,crystalPct:5,roastedPct:3}, mayaId:'wlp830', hopIds:['hallertau','magnum'], katkiIds:[], maltIds:['munich','pilsner','chocolate','crystal','roasted'] },
  },
  // ═══ IPA (6) ═══
  apa: {
    name: "Classic APA",
    expected: 'american_pale_ale',
    alternatives: ['american_india_pale_ale','american_strong_pale_ale'],
    recipe: { _og:1.052,_fg:1.012,_ibu:40,_srm:8,_abv:5.2,_mayaTip:'ale', percents:{baseMaltPct:90,crystalPct:8}, mayaId:'us05', hopIds:['cascade','centennial'], katkiIds:[], maltIds:['pale','crystal'] },
  },
  american_ipa: {
    name: "American IPA",
    expected: 'american_india_pale_ale',
    alternatives: ['double_ipa','american_pale_ale'],
    recipe: { _og:1.062,_fg:1.012,_ibu:60,_srm:7,_abv:6.5,_mayaTip:'ale', percents:{baseMaltPct:90,crystalPct:5}, mayaId:'us05', hopIds:['citra','simcoe','columbus'], katkiIds:[], maltIds:['pale','crystal'] },
  },
  neipa: {
    name: "NEIPA",
    expected: 'juicy_or_hazy_india_pale_ale',
    alternatives: ['juicy_or_hazy_strong_pale_ale','american_india_pale_ale'],
    recipe: { _og:1.065,_fg:1.012,_ibu:45,_srm:5,_abv:7.0,_mayaTip:'ale', percents:{baseMaltPct:75,oatsPct:15,wheatPct:10,oatsWheatPct:25}, mayaId:'wy1318', hopIds:['citra','mosaic','galaxy'], katkiIds:[], maltIds:['pale','oat','wheat'] },
  },
  wci: {
    name: "West Coast IPA",
    expected: 'west_coast_india_pale_ale',
    alternatives: ['american_india_pale_ale','double_ipa'],
    recipe: { _og:1.062,_fg:1.008,_ibu:70,_srm:5,_abv:7.0,_mayaTip:'ale', percents:{baseMaltPct:95,crystalPct:3}, mayaId:'us05', hopIds:['cascade','simcoe','columbus','chinook'], katkiIds:[], maltIds:['pale','crystal'] },
  },
  session_ipa: {
    name: "Session IPA",
    expected: 'session_india_pale_ale',
    alternatives: ['american_pale_ale','juicy_or_hazy_pale_ale'],
    recipe: { _og:1.045,_fg:1.008,_ibu:45,_srm:4,_abv:4.8,_mayaTip:'ale', percents:{baseMaltPct:92,crystalPct:5}, mayaId:'us05', hopIds:['citra','mosaic'], katkiIds:[], maltIds:['pale','crystal'] },
  },
  double_ipa: {
    name: "Double/Imperial IPA",
    expected: 'double_ipa',
    alternatives: ['american_india_pale_ale','american_strong_pale_ale'],
    recipe: { _og:1.075,_fg:1.012,_ibu:80,_srm:8,_abv:8.5,_mayaTip:'ale', percents:{baseMaltPct:85,crystalPct:5,sugarPct:5}, mayaId:'us05', hopIds:['citra','simcoe','columbus','amarillo'], katkiIds:[], maltIds:['pale','crystal'] },
  },
  // ═══ STOUT/PORTER (5) ═══
  dry_stout: {
    name: "Irish Dry Stout",
    expected: 'irish_dry_stout',
    alternatives: ['oatmeal_stout','american_stout'],
    recipe: { _og:1.042,_fg:1.010,_ibu:35,_srm:35,_abv:4.2,_mayaTip:'ale', percents:{baseMaltPct:70,marisOtterPct:60,roastedPct:8,roastedBarleyPct:8,chocPct:2}, mayaId:'wy1084', hopIds:['ekg','fuggle'], katkiIds:[], maltIds:['maris','roasted','chocolate'] },
  },
  oatmeal_stout: {
    name: "Oatmeal Stout",
    expected: 'oatmeal_stout',
    alternatives: ['sweet_stout_or_cream_stout','american_stout'],
    recipe: { _og:1.052,_fg:1.014,_ibu:30,_srm:32,_abv:5.0,_mayaTip:'ale', percents:{baseMaltPct:65,oatsPct:12,chocPct:8,crystalPct:5,roastedPct:3}, mayaId:'wy1084', hopIds:['ekg','fuggle'], katkiIds:[], maltIds:['pale','oat','chocolate','crystal','roasted'] },
  },
  milk_stout: {
    name: "Milk Stout",
    expected: 'sweet_stout_or_cream_stout',
    alternatives: ['oatmeal_stout','export_stout'],
    recipe: { _og:1.055,_fg:1.018,_ibu:25,_srm:35,_abv:4.8,_mayaTip:'ale', percents:{baseMaltPct:70,chocPct:10,crystalPct:8,roastedPct:4}, mayaId:'wy1084', hopIds:['ekg','fuggle'], katkiIds:['lactose','laktoz'], maltIds:['pale','chocolate','crystal','roasted'], lactose:true },
  },
  imperial_stout: {
    name: "Russian Imperial Stout",
    expected: 'american_imperial_stout',
    alternatives: ['british_imperial_stout','american_imperial_porter'],
    recipe: { _og:1.095,_fg:1.020,_ibu:70,_srm:40,_abv:10.0,_mayaTip:'ale', percents:{baseMaltPct:72,chocPct:15,crystalPct:5,roastedPct:8}, mayaId:'us05', hopIds:['columbus','chinook','simcoe'], katkiIds:[], maltIds:['pale','chocolate','crystal','roasted'] },
  },
  london_porter: {
    name: "London (Brown) Porter",
    expected: 'brown_porter',
    alternatives: ['robust_porter','english_brown_ale'],
    recipe: { _og:1.045,_fg:1.012,_ibu:25,_srm:25,_abv:4.5,_mayaTip:'ale', percents:{baseMaltPct:70,marisOtterPct:65,chocPct:8,crystalPct:10,roastedPct:0}, mayaId:'wlp002', hopIds:['ekg','fuggle'], katkiIds:[], maltIds:['maris','chocolate','crystal'] },
  },
  // ═══ SOUR (4) ═══
  berliner_weisse: {
    name: "Berliner Weisse",
    expected: 'berliner_weisse',
    alternatives: ['historical_beer_lichtenhainer','gose'],
    recipe: { _og:1.030,_fg:1.004,_ibu:5,_srm:2.5,_abv:3.2,_mayaTip:'sour', percents:{wheatPct:50,pilsnerPct:50,oatsWheatPct:50}, mayaId:'wlp630', hopIds:['hallertau'], katkiIds:[], maltIds:['wheat','pilsner'] },
  },
  gose_classic: {
    name: "Leipzig Gose",
    expected: 'leipzig_gose',
    alternatives: ['gose','berliner_weisse'],
    recipe: { _og:1.044,_fg:1.008,_ibu:8,_srm:4,_abv:4.5,_mayaTip:'sour', percents:{wheatPct:45,pilsnerPct:55,oatsWheatPct:45}, mayaId:'lacto', hopIds:['hallertau'], katkiIds:['koriander','tuz'], maltIds:['wheat','pilsner'] },
  },
  flanders_red: {
    name: "Flanders Red Ale",
    expected: 'flanders_red_ale',
    alternatives: ['belgian_flanders_oud_bruin_or_oud_red_ale','oud_bruin'],
    recipe: { _og:1.055,_fg:1.010,_ibu:15,_srm:14,_abv:6.0,_mayaTip:'sour', percents:{pilsnerPct:55,viennaPct:20,munichPct:10,crystalPct:15}, mayaId:'roeselare', hopIds:['styrian'], katkiIds:[], maltIds:['pilsner','vienna','munich','crystal'], aged:true },
  },
  lambic: {
    name: "Lambic",
    expected: 'belgian_lambic',
    alternatives: ['traditional_belgian_gueuze','belgian_fruit_lambic'],
    recipe: { _og:1.048,_fg:1.004,_ibu:5,_srm:4,_abv:5.5,_mayaTip:'sour', percents:{pilsnerPct:65,wheatPct:35,oatsWheatPct:35}, mayaId:'wlp655', hopIds:['aged_hop'], katkiIds:[], maltIds:['pilsner','wheat'], aged:true },
  },
  // ═══ INGLIZ/ISKOÇ (3) ═══
  esb: {
    name: "Extra Special Bitter",
    expected: 'extra_special_bitter',
    alternatives: ['classic_english_pale_ale','special_bitter_or_best_bitter'],
    recipe: { _og:1.053,_fg:1.013,_ibu:40,_srm:14,_abv:5.2,_mayaTip:'ale', percents:{baseMaltPct:80,marisOtterPct:70,crystalPct:12,munichPct:5}, mayaId:'wlp002', hopIds:['ekg','fuggle','target'], katkiIds:[], maltIds:['maris','crystal','munich'] },
  },
  best_bitter: {
    name: "Best Bitter",
    expected: 'special_bitter_or_best_bitter',
    alternatives: ['ordinary_bitter','extra_special_bitter'],
    recipe: { _og:1.042,_fg:1.010,_ibu:32,_srm:10,_abv:4.2,_mayaTip:'ale', percents:{baseMaltPct:85,marisOtterPct:80,crystalPct:10}, mayaId:'wlp002', hopIds:['ekg','fuggle'], katkiIds:[], maltIds:['maris','crystal'] },
  },
  wee_heavy: {
    name: "Wee Heavy / Scotch Ale",
    expected: 'scotch_ale_or_wee_heavy',
    alternatives: ['old_ale','strong_ale'],
    recipe: { _og:1.085,_fg:1.020,_ibu:25,_srm:20,_abv:8.5,_mayaTip:'ale', percents:{baseMaltPct:75,marisOtterPct:70,crystalPct:15,munichPct:8,chocPct:2}, mayaId:'wlp028', hopIds:['ekg','fuggle'], katkiIds:[], maltIds:['maris','crystal','munich','chocolate'] },
  },
  // ═══ HIBRIT / DIGER (4) ═══
  kolsch: {
    name: "Kölsch",
    expected: 'german_koelsch',
    alternatives: ['golden_or_blonde_ale','munich_helles'],
    recipe: { _og:1.047,_fg:1.009,_ibu:22,_srm:4,_abv:5.0,_mayaTip:'ale', percents:{pilsnerPct:95,wheatPct:3,baseMaltPct:95}, mayaId:'wlp029', hopIds:['hallertau','tettnang','spalt'], katkiIds:[], maltIds:['pilsner','wheat'] },
  },
  altbier: {
    name: "Altbier",
    expected: 'german_altbier',
    alternatives: ['vienna_lager','german_maerzen'],
    recipe: { _og:1.048,_fg:1.012,_ibu:38,_srm:14,_abv:4.8,_mayaTip:'ale', percents:{munichPct:50,pilsnerPct:30,viennaPct:15,crystalPct:5}, mayaId:'wy1007', hopIds:['spalt','tettnang','hallertau'], katkiIds:[], maltIds:['munich','pilsner','vienna','crystal'] },
  },
  american_amber: {
    name: "American Amber",
    expected: 'american_amber_red_ale',
    alternatives: ['american_pale_ale','american_brown_ale'],
    recipe: { _og:1.054,_fg:1.013,_ibu:32,_srm:14,_abv:5.4,_mayaTip:'ale', percents:{baseMaltPct:80,crystalPct:12,munichPct:5}, mayaId:'us05', hopIds:['cascade','centennial','amarillo'], katkiIds:[], maltIds:['pale','crystal','munich'] },
  },
  american_brown: {
    name: "American Brown",
    expected: 'american_brown_ale',
    alternatives: ['english_brown_ale','american_amber_red_ale'],
    recipe: { _og:1.052,_fg:1.013,_ibu:30,_srm:22,_abv:5.0,_mayaTip:'ale', percents:{baseMaltPct:75,crystalPct:12,chocPct:5,munichPct:5}, mayaId:'us05', hopIds:['cascade','centennial'], katkiIds:[], maltIds:['pale','crystal','chocolate','munich'] },
  },
};

// ═══ RUN ═══
const arr = Object.entries(R);
let top1 = 0, top3 = 0, fails = [];
console.log('═'.repeat(80));
console.log('FAZ 2b — ' + arr.length + ' TEST REÇETE');
console.log('═'.repeat(80));

for (const [id, test] of arr) {
  const matches = findBestMatches(test.recipe, 5);
  const winnerSlug = matches[0]?.slug;
  const top3Slugs = matches.slice(0,3).map(m => m.slug);
  const is1 = winnerSlug === test.expected;
  const is3 = top3Slugs.includes(test.expected);
  if (is1) top1++;
  if (is3) top3++;

  const mark = is1 ? '✓' : (is3 ? '◐' : '✗');
  console.log('\n' + mark + ' ' + test.name);
  console.log('   Beklenen: ' + test.expected);
  console.log('   Kazanan:  ' + (winnerSlug||'(yok)') + ' (%' + (matches[0]?.normalized||0) + ', ham=' + (matches[0]?.score||0) + ')');
  if (!is1) {
    console.log('   Top 3: ' + matches.slice(0,3).map(m => m.slug + '(%'+m.normalized+'/'+m.score+')').join(', '));
    fails.push({ id, expected: test.expected, got: winnerSlug, inTop3: is3, recipe: test.recipe });
  }
}

console.log('\n' + '═'.repeat(80));
console.log('SONUÇ: ' + top1 + '/' + arr.length + ' top-1, ' + top3 + '/' + arr.length + ' top-3');
console.log('═'.repeat(80));

if (fails.length) {
  console.log('\nBaşarısız ' + fails.length + ' test — patch için gerekli:');
  fails.forEach(f => console.log('  · ' + f.id + ': beklenen=' + f.expected + ', got=' + f.got + ' (top3?=' + f.inTop3 + ')'));
}
