// GT patch round 7 — Identity marker boost + magnet counter-exclusion
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

let changes = [];

// ═══ IDENTITY MARKERS boost (+20 → +40) ═══
// Bu stiller yeast/hop/malt identity markerı olmazsa görünmüyor.
// Bonus'larını 2x yap.
const IDENTITY_BOOST_STYLES = {
  // English Brown Ale
  english_brown_ale: ['english_yeast'],
  // American Brown
  american_brown_ale: ['american_yeast'],
  // Bitter family
  ordinary_bitter: ['english_ingredients'],
  special_bitter_or_best_bitter: ['english_ingredients'],
  extra_special_bitter: ['english_ingredients'],
  english_pale_ale: ['english_ingredients'],
  // Scottish
  scottish_light_ale: ['scottish_yeast','british_hop'],
  scottish_heavy_ale: ['scottish_yeast','british_hop'],
  scottish_export_ale: ['scottish_yeast','british_hop'],
  scotch_ale_or_wee_heavy: ['scottish_yeast','british_hop'],
  // Irish Red
  irish_red_ale: ['irish_yeast'],
  // Irish Stout
  irish_dry_stout: ['irish_yeast'],
  // Belgian Pale
  belgian_blonde_ale: ['belgian_yeast'],
  belgian_speciale_belge: ['belgian_yeast'],
  belgian_session_ale: ['belgian_yeast'],
  other_belgian_ale: ['belgian_yeast'],
  // Strong English
  strong_ale: ['english_yeast'],
  old_ale: ['english_yeast'],
  // Flanders
  flanders_red_ale: ['sour_blend'],
  oud_bruin: ['sour_blend'],
  // Saison
  french_belgian_saison: ['saison_yeast'],
  specialty_saison: ['saison_yeast'],
  french_bi_re_de_garde: ['french_yeast'],
  // American Imperial Stout
  american_imperial_stout: ['american_hop'],
  british_imperial_stout: ['english_hop'],
  // American Barleywine
  american_barley_wine_ale: [],  // already competed with DIPA
  british_barley_wine_ale: ['english_yeast'],
  // Czech Pale
  czech_pale_lager: ['required_saaz'],
};

Object.entries(IDENTITY_BOOST_STYLES).forEach(([slug, markerKeys]) => {
  const def = defs[slug];
  if (!def?.thresholds?.markers) return;
  markerKeys.forEach(mk => {
    const m = def.thresholds.markers[mk];
    if (m?.safe?.scoreBonus) {
      m.safe.scoreBonus = Math.max(m.safe.scoreBonus, 35);
      changes.push(slug + ': marker.' + mk + ' → 35');
    }
  });
});

// ═══ MAGNET STYLE counter-exclusion ═══
// American Brown has been catching English Brown + Irish Red + Bitter + Scottish.
// Add exclusion if clearly British/Scottish/Irish style markers present.
// Using markerPresent exclusion on hop/yeast field.
const MAGNET_EXCLUSIONS = [
  {
    slug: 'american_brown_ale',
    field: 'maya',
    rx: 'wy1028|wy1098|wy1099|wy1318|wy1768|wy1968|wlp002|wlp013|wlp017|wlp023|wlp028|nottingham|windsor|whitbread|london ale|british ale|wy1084|wy1728|edinburgh|scottish|irish ale|tartan',
    reason: 'American Brown: British/Scottish/Irish yeast → yanlış stil'
  },
  {
    slug: 'american_pale_ale',
    field: 'maya',
    rx: 'wy1968|wlp002|wlp013|wlp017|nottingham|windsor|whitbread|british ale|english ale|wy1084|wy1728|scottish|irish ale',
    reason: 'APA: British/Scottish/Irish yeast → İngiliz pale/brown territory'
  },
  {
    slug: 'session_beer',
    field: 'maya',
    rx: 'wy1968|wlp002|wlp013|wlp017|nottingham|windsor|whitbread|wy1084|wy1728|wlp028|scottish|irish',
    reason: 'Session Beer: İngiliz yeast → ilgili İngiliz stiline aittir'
  },
  {
    slug: 'imperial_red_ale',
    field: 'hop',
    rx: 'ekg|fuggles|goldings|kent',
    reason: 'Imperial Red: English hop → British Strong Ale/Barleywine territory'
  },
  {
    slug: 'black_ipa',
    field: 'hop',
    rx: 'fuggles|goldings|kent|ekg',
    reason: 'Black IPA: English hop → İngiliz Porter/Stout olmalı'
  },
  {
    slug: 'brown_ipa',
    field: 'hop',
    rx: 'fuggles|goldings|kent|ekg',
    reason: 'Brown IPA: English hop → İngiliz Brown Ale olmalı'
  },
];
MAGNET_EXCLUSIONS.forEach(m => {
  const def = defs[m.slug];
  if (!def) return;
  def.thresholds = def.thresholds || {};
  def.thresholds.markers = def.thresholds.markers || {};
  def.thresholds.markers['_magnet_exclude_'+m.field] = {
    exclusion:{markerPresent:{__regex:m.rx, flags:'i'}, field:m.field, reason: m.reason}
  };
  changes.push(m.slug + ': magnet exclusion for '+m.field);
});

// ═══ EXTRA: Porter'a karşı-korumayla Black IPA ═══
// Black IPA IBU 60+ zorunlu (Porter 25-40)
const t = defs.black_ipa?.thresholds;
if (t?.ibu) {
  t.ibu.exclusion = {max:40, hardZero:true, reason:'Black IPA: IBU ≥ 40 (Porter territory altında)'};
  changes.push('black_ipa: IBU exclusion <40');
}

// Brown IPA IBU 40+ zorunlu (Brown Ale 20-30)
const t2 = defs.brown_ipa?.thresholds;
if (t2?.ibu) {
  t2.ibu.exclusion = {max:30, hardZero:true, reason:'Brown IPA: IBU < 30 (Brown Ale territory)'};
  changes.push('brown_ipa: IBU exclusion <30');
}

// Session Beer IBU ceiling — çok hoppy olmamalı
const t3 = defs.session_beer?.thresholds;
if (t3?.ibu) {
  t3.ibu.exclusion2 = {min:40, hardZero:true, reason:'Session Beer: IBU > 40 (hoppy-forward stile aittir)'};
  changes.push('session_beer: IBU ceiling 40');
}

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik');
