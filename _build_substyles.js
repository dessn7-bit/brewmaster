const fs = require('fs');
const R = (src, flags='i') => ({ __regex: src, flags });

// 58 Brewmaster-özel alt-stil tanımı.
// Her biri parent STYLE_DEFINITIONS slug'una bağlı, tetikleyici koşullarıyla.
// Faz 2 motoru: parent'ın matchScore'u yüksek VE triggers sağlanıyorsa, display'de substyle önerilir.
const SUBSTYLES = {
  // ═══ STOUT/PORTER alt varyantları ═══
  'pastry_stout': {
    displayTR: 'Pastry Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('vanilla|vanilya|cocoa|kakao|caramel|karamel|maple|akcaagac|marshmallow|biscuit|biskuvi'),
      markerField: 'katki',
      sugarPctMin: 3,
      ogMin: 1.070,
    },
    note:'Aşırı tatlı, adjunct yüklü Imperial Stout varyantı'
  },
  'smoothie_stout': {
    displayTR: 'Smoothie Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('lactose|laktoz|meyve|fruit|vanilla|vanilya|marshmallow|cocoa|kakao'),
      markerField: 'katki',
      lactose: true,
      ogMin: 1.075,
    },
    note:'Aşırı tatlı, kremsi, meyveli Imperial Stout'
  },
  'chocolate_stout': {
    displayTR: 'Chocolate Stout',
    parentSlug: 'american_stout',
    triggers: {
      markerAny: R('cocoa|kakao|chocolate|cikolata|cacao'),
      markerField: 'katki',
    },
    note:'Kakao/çikolata eklenmiş American Stout'
  },
  'coffee_stout': {
    displayTR: 'Coffee Stout',
    parentSlug: 'american_stout',
    triggers: {
      markerAny: R('coffee|kahve|espresso|cold_brew'),
      markerField: 'katki',
    },
    note:'Kahve eklenmiş Stout'
  },
  'coconut_stout': {
    displayTR: 'Coconut Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('coconut|hindistancevizi|toasted_coconut'),
      markerField: 'katki',
    },
    note:'Hindistancevizi Imperial Stout'
  },
  'peanut_butter_stout': {
    displayTR: 'Peanut Butter Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('peanut|firistik|fistik|yer_fistik|pb2'),
      markerField: 'katki',
      ogMin: 1.060,
    },
    note:'Fıstık ezmesi aromalı Stout'
  },
  'smores_stout': {
    displayTR: 'S\'mores Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerMulti: [R('marshmallow'), R('cocoa|chocolate|kakao'), R('graham|biscuit|biskuvi')],
      markerField: 'katki',
      ogMin: 1.070,
    },
    note:'Marshmallow + çikolata + kraker (S\'mores) temalı Pastry Stout'
  },
  'birthday_cake_stout': {
    displayTR: 'Birthday Cake Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('vanilla|vanilya|cake|frosting|sprinkle|cream|krema'),
      markerField: 'katki',
      lactose: true,
    },
    note:'Vanilyalı, şekerli Pastry Stout'
  },
  'maple_bourbon_stout': {
    displayTR: 'Maple Bourbon Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('maple|akcaagac|akcagaac'),
      markerField: 'katki',
      bourbonAged: true,
    },
    note:'Bourbon fıçıda olgunlaştırılmış akçaağaç şuruplu Stout'
  },
  'pumpkin_stout': {
    displayTR: 'Pumpkin Stout',
    parentSlug: 'american_stout',
    triggers: {
      markerAny: R('pumpkin|kabak|balkabak'),
      markerField: 'katki',
    },
    note:'Balkabağı aromalı Stout'
  },
  'golden_stout': {
    displayTR: 'Golden Stout',
    parentSlug: 'specialty_beer',
    triggers: {
      srmMax: 12,
      markerAny: R('vanilla|vanilya|cocoa|kakao|coffee|kahve|coconut|hindistancevizi'),
      markerField: 'katki',
      lactose: true,
    },
    note:'Açık renkli ama stout profilli (laktoz + katkı) deneysel stil'
  },
  'double_milk_stout': {
    displayTR: 'Double Milk Stout',
    parentSlug: 'sweet_stout_or_cream_stout',
    triggers: {
      lactose: true,
      ogMin: 1.065,
    },
    note:'Yüksek ABV versiyonu Milk/Sweet Stout'
  },
  'imperial_milk_stout': {
    displayTR: 'Imperial Milk Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      lactose: true,
      ogMin: 1.080,
      abvMin: 8.0,
    },
    note:'Imperial + laktoz'
  },

  // ═══ PORTER varyantları ═══
  // (American Porter, Robust Porter ana stilde; substyle minimum)

  // ═══ IPA varyantları ═══
  'dark_neipa': {
    displayTR: 'Dark NEIPA',
    parentSlug: 'juicy_or_hazy_india_pale_ale',
    triggers: {
      srmMin: 25,
      chocPctMin: 2,
    },
    note:'NEIPA karakteri + koyu renk (dark malt)'
  },
  'hazy_red_ipa': {
    displayTR: 'Hazy Red IPA',
    parentSlug: 'specialty_ipa_red_ipa',
    triggers: {
      crystalPctMin: 10,
      oatsWheatPctMin: 5,
      srmRange: [10, 18],
    },
    note:'NEIPA tekniği uygulanmış Red IPA'
  },
  'hazy_imperial_ipa': {
    displayTR: 'Hazy Imperial IPA',
    parentSlug: 'juicy_or_hazy_india_pale_ale',
    triggers: {
      abvMin: 7.5,
      oatsWheatPctMin: 10,
    },
    note:'Yüksek ABV Hazy IPA'
  },
  'kveik_neipa': {
    displayTR: 'Kveik NEIPA',
    parentSlug: 'juicy_or_hazy_india_pale_ale',
    triggers: {
      mayaRegex: R('kveik|voss|hornindal|lutra|oslo|ebbegarden'),
      mayaField: 'maya',
    },
    note:'Kveik maya ile fermente edilmiş NEIPA'
  },
  'oat_cream_ipa': {
    displayTR: 'Oat Cream IPA',
    parentSlug: 'juicy_or_hazy_india_pale_ale',
    triggers: {
      oatsPctMin: 15,
    },
    note:'Yüksek yulaf (≥%15) ile yumuşak gövdeli NEIPA'
  },
  'milkshake_ipa': {
    displayTR: 'Milkshake IPA',
    parentSlug: 'juicy_or_hazy_india_pale_ale',
    triggers: {
      lactose: true,
      fruitRegex: R('meyve|fruit|vanilla|vanilya'),
      fruitField: 'katki',
    },
    note:'Laktoz + meyve/vanilya eklenmiş NEIPA (kremsi)'
  },
  'cryo_hop_ipa': {
    displayTR: 'Cryo Hop IPA',
    parentSlug: 'american_india_pale_ale',
    triggers: {
      markerAny: R('cryo|lupulin_powder|lupulin_pellet|luppi'),
      markerField: 'hop',
    },
    note:'Cryo hop / lupulin powder ile yapılmış American IPA'
  },
  'hop_bursted_ipa': {
    displayTR: 'Hop Bursted IPA',
    parentSlug: 'american_india_pale_ale',
    triggers: {
      lateHopRatioMin: 0.7,
    },
    note:'Geç hoplama ağırlıklı American IPA (10 dk altı + aroma)'
  },
  'fresh_hop_ipa': {
    displayTR: 'Fresh Hop IPA',
    parentSlug: 'fresh_hop_beer',
    triggers: {
      markerAny: R('fresh|wet_hop|taze_hop'),
      markerField: 'hop',
    },
    note:'Taze/wet hop ile yapılmış IPA'
  },
  'thiolized_ipa': {
    displayTR: 'Thiolized IPA',
    parentSlug: 'experimental_india_pale_ale',
    triggers: {
      mayaRegex: R('thiol|phantasm|cellar_science_hazy|sulfurex|hot_pop'),
      mayaField: 'maya',
    },
    note:'Thiol açığa çıkaran maya/enzim kullanan IPA'
  },
  'yuzu_ipa': {
    displayTR: 'Yuzu IPA',
    parentSlug: 'experimental_india_pale_ale',
    triggers: {
      markerAny: R('yuzu|sudachi|kabosu'),
      markerField: 'katki',
    },
    note:'Japon turunçgili (yuzu) ile IPA'
  },
  'sour_ipa': {
    displayTR: 'Sour IPA',
    parentSlug: 'american_style_sour_ale',
    triggers: {
      mayaRegex: R('lacto|kettle_sour|la_philly|bb_philly|wlp677'),
      mayaField: 'maya',
      ibuMin: 30,
      dhPer10LMin: 2,
    },
    note:'Asidifiye edilmiş ama bol dry hoplanmış IPA'
  },
  'brut_ipa': {
    displayTR: 'Brut IPA',
    parentSlug: 'specialty_ipa_brut_ipa',
    triggers: { fgMax: 1.004 },
    note:'Süper kuru (FG ≤ 1.004), amilaz enzimiyle atenüe IPA'
  },

  // ═══ BITTER/ALE varyantları ═══
  'juicy_bitter': {
    displayTR: 'Juicy Bitter',
    parentSlug: 'extra_special_bitter',
    triggers: {
      dhPer10LMin: 2,
      hopRegex: R('citra|mosaic|amarillo|centennial|cascade|el_dorado'),
      hopField: 'hop',
    },
    note:'Modern Amerikan hop karakteri eklenmiş ESB'
  },
  'hazy_bitter': {
    displayTR: 'Hazy Bitter',
    parentSlug: 'juicy_or_hazy_pale_ale',
    triggers: {
      abvMax: 4.5,
      oatsWheatPctMin: 5,
    },
    note:'Düşük ABV Hazy Pale (Bitter karakterinde)'
  },
  'nordic_pale_ale': {
    displayTR: 'Nordic Pale Ale',
    parentSlug: 'american_style_pale_ale',
    triggers: {
      mayaRegex: R('kveik|voss|hornindal|oslo|lutra|ebbegarden'),
      mayaField: 'maya',
    },
    note:'Kveik maya ile fermente edilmiş Pale Ale'
  },

  // ═══ SAISON varyantları ═══
  'lavender_saison': {
    displayTR: 'Lavanta Saison',
    parentSlug: 'specialty_saison',
    triggers: {
      markerAny: R('lavanta|lavender'),
      markerField: 'katki',
    },
    note:'Lavanta eklenmiş Saison'
  },
  'elderflower_saison': {
    displayTR: 'Elderflower Saison',
    parentSlug: 'specialty_saison',
    triggers: {
      markerAny: R('elder|murver|bozkurt|sambucus'),
      markerField: 'katki',
    },
    note:'Mürver çiçeği eklenmiş Saison'
  },
  'saison_dhiver': {
    displayTR: 'Saison d\'Hiver',
    parentSlug: 'specialty_saison',
    triggers: {
      abvMin: 7.0,
      srmMin: 8,
    },
    note:'Kış Saison\'u — daha koyu, daha güçlü'
  },
  'tropical_saison': {
    displayTR: 'Tropik Saison',
    parentSlug: 'specialty_saison',
    triggers: {
      hopRegex: R('citra|mosaic|galaxy|nelson|motueka|azacca'),
      hopField: 'hop',
      fruitRegex: R('mango|ananas|pineapple|passion|guava|maracuja'),
      fruitField: 'katki',
    },
    note:'Tropik hop + meyve eklenmiş Saison'
  },

  // ═══ GOSE varyantları ═══
  'pina_colada_gose': {
    displayTR: 'Piña Colada Gose',
    parentSlug: 'gose',
    triggers: {
      markerMulti: [R('ananas|pineapple'), R('coconut|hindistancevizi')],
      markerField: 'katki',
    },
    note:'Ananas + hindistancevizi Gose'
  },
  'cucumber_gose': {
    displayTR: 'Cucumber Gose',
    parentSlug: 'gose',
    triggers: {
      markerAny: R('cucumber|salatalik'),
      markerField: 'katki',
    },
    note:'Salatalık eklenmiş Gose'
  },
  'mexican_candy_gose': {
    displayTR: 'Mexican Candy Gose',
    parentSlug: 'gose',
    triggers: {
      markerMulti: [R('chili|biber|tajin|jalapeno'), R('lime|limon|tamarindo|mango')],
      markerField: 'katki',
    },
    note:'Acı biber + limon/tamarindo Gose'
  },
  'gose_de_fruit': {
    displayTR: 'Gose de Fruit',
    parentSlug: 'gose',
    triggers: {
      fruitRegex: R('meyve|fruit|passion|mango|ananas|pineapple|cilek|strawberry|ahududu|raspberry|visne|cherry|seftali|peach'),
      fruitField: 'katki',
    },
    note:'Meyve ağırlıklı modern Gose'
  },

  // ═══ SOUR varyantları ═══
  'pastry_sour': {
    displayTR: 'Pastry Sour',
    parentSlug: 'american_style_fruited_sour_ale',
    triggers: {
      markerAny: R('vanilla|vanilya|marshmallow|cocoa|kakao|caramel|karamel|pie|tart|cookie'),
      markerField: 'katki',
      lactose: true,
      ogMin: 1.055,
    },
    note:'Aşırı tatlı dessert tarzı sour'
  },
  'smoothie_sour': {
    displayTR: 'Smoothie Sour',
    parentSlug: 'american_style_fruited_sour_ale',
    triggers: {
      lactose: true,
      fruitRegex: R('meyve|fruit|purée|puree|pulp|passion|mango|raspberry|ahududu'),
      fruitField: 'katki',
      fruitPctHigh: true,
    },
    note:'Yoğun meyve pulp + laktoz = smoothie'
  },
  'session_sour': {
    displayTR: 'Session Sour',
    parentSlug: 'american_style_sour_ale',
    triggers: { abvMax: 4.5 },
    note:'Düşük ABV kettle sour'
  },
  'mixed_berry_sour': {
    displayTR: 'Mixed Berry Sour',
    parentSlug: 'american_style_fruited_sour_ale',
    triggers: {
      markerAny: R('ahududu|raspberry|cilek|strawberry|karadut|blackberry|mure|yabani'),
      markerField: 'katki',
      fruitMultiple: true,
    },
    note:'Birden fazla kırmızı meyve ile sour'
  },
  'sour_red_ale': {
    displayTR: 'Sour Red Ale',
    parentSlug: 'belgian_flanders_oud_bruin_or_oud_red_ale',
    triggers: {
      srmMin: 10,
      srmMax: 20,
      mayaRegex: R('roeselare|wlp655|wy3763|brett|lacto'),
      mayaField: 'maya',
    },
    note:'Amerikan interpretasyonu Flanders Red'
  },

  // ═══ LAGER varyantları ═══
  'honey_lager': {
    displayTR: 'Honey Lager',
    parentSlug: 'specialty_honey_beer',
    triggers: {
      markerAny: R('bal|honey'),
      markerField: 'katki',
      mayaRegex: R('w3470|s23|wy2124|wlp830|wlp840'),
      mayaField: 'maya',
    },
    note:'Bal eklenmiş Lager'
  },
  'oat_cream_lager': {
    displayTR: 'Oat Cream Lager',
    parentSlug: 'american_lager',
    triggers: {
      oatsPctMin: 10,
      mayaRegex: R('w3470|s23|wy2124|wlp830|wlp840'),
      mayaField: 'maya',
    },
    note:'Yulaf + lager maya'
  },
  'ranch_water_lager': {
    displayTR: 'Ranch Water Lager',
    parentSlug: 'american_light_lager',
    triggers: {
      markerAny: R('lime|limon|agave'),
      markerField: 'katki',
      abvMax: 5.0,
    },
    note:'Lime + agave Light Lager (ranch water cocktail temalı)'
  },
  'light_craft_lager': {
    displayTR: 'Light Craft Lager',
    parentSlug: 'american_light_lager',
    triggers: { abvMax: 4.0, ogMax: 1.040 },
    note:'Düşük ABV craft-pilsner'
  },
  'helles_naturtrub': {
    displayTR: 'Helles Naturtrüb',
    parentSlug: 'munich_helles',
    triggers: { unfiltered: true },
    note:'Filtrelenmemiş (bulanık) Helles'
  },
  'hazy_lager': {
    displayTR: 'Hazy Lager',
    parentSlug: 'american_india_pale_lager',
    triggers: {
      oatsWheatPctMin: 8,
      mayaRegex: R('w3470|s23|wy2124|wlp830|wlp840'),
      mayaField: 'maya',
      ibuMax: 30,
    },
    note:'Lager maya + NEIPA tekniği'
  },

  // ═══ SPECIALTY/INGREDIENT VARIANT ═══
  'agave_beer': {
    displayTR: 'Agave Beer',
    parentSlug: 'specialty_beer',
    triggers: {
      markerAny: R('agave|agav'),
      markerField: 'katki',
    },
    note:'Agave şurubu ile şekerlenmiş bira'
  },
  'tepache_beer': {
    displayTR: 'Tepache Beer',
    parentSlug: 'specialty_beer',
    triggers: {
      markerMulti: [R('ananas|pineapple'), R('tarcin|cinnamon|kahverengi_seker|piloncillo')],
      markerField: 'katki',
    },
    note:'Meksika fermente ananas içeceği tepache\'den esinlenme'
  },
  'grape_ale_wine_beer': {
    displayTR: 'Grape Ale / Wine Beer',
    parentSlug: 'italian_grape_ale',
    triggers: {
      markerAny: R('uzum|grape|wine|must|moscato|chardonnay|merlot'),
      markerField: 'katki',
    },
    note:'Üzüm ilavesi veya şarap must karışımı'
  },
  'matcha_beer': {
    displayTR: 'Matcha / Yeşil Çay Beer',
    parentSlug: 'specialty_beer',
    triggers: {
      markerAny: R('matcha|yesilcay|yesil_cay|green_tea'),
      markerField: 'katki',
    },
    note:'Matcha/yeşil çay ilaveli bira'
  },
  'rose_floral_beer': {
    displayTR: 'Gül / Çiçek Beer',
    parentSlug: 'spice_herb_or_vegetable_beer',
    triggers: {
      markerAny: R('gul|rose|hibiscus|elder|chamomile|papatya|lavanta|lavender|jasmine|yasemin'),
      markerField: 'katki',
    },
    note:'Çiçek aromalı bira'
  },
  'hemp_cbd_beer': {
    displayTR: 'Hemp / CBD Beer',
    parentSlug: 'specialty_beer',
    triggers: {
      markerAny: R('hemp|kenevir|cbd|cannabis'),
      markerField: 'katki',
    },
    note:'Kenevir / CBD içeren bira'
  },
  'botanical_ale': {
    displayTR: 'Botanical Ale',
    parentSlug: 'spice_herb_or_vegetable_beer',
    triggers: {
      markerAny: R('botanical|bitki|herbal|thyme|kekik|rosemary|biberiye|sage|adacayi'),
      markerField: 'katki',
    },
    note:'Otsu / bitkisel bira'
  },
  'steinbier_caramel_ale': {
    displayTR: 'Steinbier / Caramel Ale',
    parentSlug: 'kellerbier_or_zwickelbier',
    triggers: { hotStoneMash: true },
    note:'Kızgın taş maşlanmış bira (tarihî Alman tekniği)'
  },
  'kvass': {
    displayTR: 'Kvass',
    parentSlug: 'historical_beer',
    triggers: {
      markerAny: R('rye_bread|cavdar_ekmek|bread|ekmek'),
      markerField: 'katki',
      abvMax: 2.5,
    },
    note:'Ekmek fermente ederek yapılan Rus fermentesi (düşük alkol)'
  },
  'bourbon_barrel_aged_stout': {
    displayTR: 'Bourbon Barrel Aged Stout',
    parentSlug: 'american_imperial_stout',
    triggers: {
      markerAny: R('bourbon|wood|barrel|fıçı|oak'),
      markerField: 'katki',
      ogMin: 1.080,
    },
    note:'Bourbon fıçıda olgunlaştırılmış Imperial Stout'
  },
};

// Fix parent slugs that differ from actual STYLE_DEFINITIONS keys
// Load defs to verify
const defs = JSON.parse(fs.readFileSync('./STYLE_DEFINITIONS.json','utf8'));
const defKeys = new Set(Object.keys(defs));

const PARENT_FIXUP = {
  'american_imperial_stout':        'american_imperial_stout',
  'american_stout':                  'american_stout',
  'sweet_stout_or_cream_stout':      'sweet_stout_or_cream_stout',
  'bourbon_barrel_aged_stout':       'bourbon_barrel_aged_stout',
  'juicy_or_hazy_india_pale_ale':    'juicy_or_hazy_india_pale_ale',
  'juicy_or_hazy_pale_ale':          'juicy_or_hazy_pale_ale',
  'juicy_or_hazy_imperial_or_double_india_pale_ale': 'juicy_or_hazy_imperial_or_double_india_pale_ale',
  'specialty_ipa_red_ipa':           'red_ipa',
  'specialty_ipa_brut_ipa':          'brut_ipa',
  'american_india_pale_ale':         'american_india_pale_ale',
  'fresh_hop_beer':                   'fresh_hop_beer',
  'experimental_india_pale_ale':     'experimental_india_pale_ale',
  'american_style_sour_ale':         'american_sour_ale',
  'american_style_fruited_sour_ale': 'american_fruited_sour_ale',
  'american_style_pale_ale':         'american_pale_ale',
  'belgian_style_flanders_oud_bruin_or_oud_red_ale': 'flanders_oud_bruin_oud_red_ale',
  'contemporary_style_gose':         'contemporary_gose',
  'extra_special_bitter':            'extra_special_bitter',
  'specialty_saison':                'specialty_saison',
  'specialty_honey_beer':            'specialty_honey_beer',
  'american_lager':                   'american_lager',
  'american_light_lager':            'american_light_lager',
  'munich_helles':                    'munich_helles',
  'american_india_pale_lager':       'american_india_pale_lager',
  'specialty_beer':                   'specialty_beer',
  'x3_italian_grape_ale':            'x3_italian_grape_ale',
  'spice_herb_or_vegetable_beer':    'spice_herb_or_vegetable_beer',
  'historical_beer_kellerbier':      'historical_beer_kellerbier',
  'historical_beer':                  'historical_beer',
};

// Normalize parent slugs to existing STYLE_DEFINITIONS keys
for (const slug of Object.keys(SUBSTYLES)) {
  const s = SUBSTYLES[slug];
  // First try PARENT_FIXUP mapping
  if (PARENT_FIXUP[s.parentSlug] && defKeys.has(PARENT_FIXUP[s.parentSlug])) {
    s.parentSlug = PARENT_FIXUP[s.parentSlug];
    continue;
  }
  // Then try direct
  if (defKeys.has(s.parentSlug)) continue;
  // Try without "specialty_ipa_" prefix
  const alt1 = s.parentSlug.replace(/^specialty_ipa_/, '');
  if (defKeys.has(alt1)) { s.parentSlug = alt1; continue; }
  // Try with "specialty_ipa_" prefix
  const alt2 = 'specialty_ipa_' + s.parentSlug;
  if (defKeys.has(alt2)) { s.parentSlug = alt2; continue; }
}

// Verify all parents exist
const missing = [];
for (const slug of Object.keys(SUBSTYLES)) {
  const p = SUBSTYLES[slug].parentSlug;
  if (!defKeys.has(p)) missing.push([slug, p]);
}

console.log('Toplam substyle:', Object.keys(SUBSTYLES).length);
console.log('Parent bulunamayan:', missing.length);
if (missing.length > 0) {
  missing.forEach(([sub, parent]) => {
    console.log('  -', sub, '→', parent, '(yok)');
  });
  console.log('\nMevcut def slug\'larindan benzerleri:');
  missing.forEach(([sub, parent]) => {
    const hint = parent.split('_').slice(-2).join('_');
    const matches = [...defKeys].filter(k => k.includes(hint.split('_')[0]) || k.includes(hint.split('_')[1]||'zzz')).slice(0,5);
    console.log('  ', sub, '→', parent, '|', matches.join(' | '));
  });
}

// Write output
fs.writeFileSync('./SUBSTYLE_VARIANTS.json', JSON.stringify(SUBSTYLES, null, 2), 'utf8');
console.log('\nWrote SUBSTYLE_VARIANTS.json');
console.log('Boyut:', (fs.statSync('./SUBSTYLE_VARIANTS.json').size/1024).toFixed(1), 'KB');
