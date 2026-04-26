// Track A: Re-map diydog specialty_beer fallbacks using enhanced heuristic
// Uses name patterns + composition (fermentables) + OG/IBU/SRM metrics
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('_v7_recipes_diydog.json', 'utf8'));
const records = data.records;

// Manual Brewdog catalog mapping — well-known products (curated)
const MANUAL_MAP = {
  // Core Brewdog catalog (known styles from Brewdog DIY Dog book)
  '5am saint': 'american_amber_red_ale',
  '10 heads high': 'american_imperial_stout', // OG 1.074, IBU 70, SRM 45 — high gravity dark hoppy
  'punk ipa': 'american_india_pale_ale',
  'punk ipa 2007': 'american_india_pale_ale',
  'hardcore ipa': 'double_ipa',
  'jack hammer': 'american_india_pale_ale',
  'elvis juice': 'american_india_pale_ale',
  'dead pony club': 'session_india_pale_ale',
  'cocoa psycho': 'american_imperial_stout',
  'paradox': 'american_imperial_stout',
  'tokyo': 'american_imperial_stout',
  'sink the bismarck': 'american_imperial_stout',
  'tactical nuclear penguin': 'american_imperial_stout',
  'end of history': 'eisbock',
  'sunmaid stout': 'sweet_stout',
  'bashah': 'american_imperial_stout',
  'libertine black ale': 'american_imperial_stout',
  'libertine porter': 'american_porter',
  'paradox grain': 'american_imperial_stout',
  'jet black heart': 'american_porter',
  'electric india': 'belgian_session_ale',
  'dogma': 'belgian_strong_dark_ale',
  'avery brown dredge': 'pilsner',
  'pilsen lager': 'pilsner',
  'dead metaphor': 'american_imperial_stout',
  'this. is. lager': 'pilsner',
  '77 lager': 'pilsner',
  'mr president': 'pilsner',
  'kingpin': 'pilsner',
  'choco libre': 'sweet_stout',
  'speed ball': 'american_imperial_stout',
  'born to die': 'double_ipa',
  'simcoe': 'american_india_pale_ale',
  'comet': 'american_india_pale_ale',
  'citra': 'american_india_pale_ale',
  'galaxy': 'american_india_pale_ale',
  'vagabond pilsner': 'pilsner',
  'whisky sour': 'specialty_beer',
  'arcade nation': 'american_imperial_stout',
  'doodlebug': 'session_india_pale_ale',
  'pumpkin king': 'pumpkin_spice_beer',
  'unicorn tears': 'specialty_beer',
  'eisadam': 'eisbock',
  'old worldie': 'old_ale',
  'libertine black ale': 'american_imperial_stout',
  'milk and two sugars': 'sweet_stout',
  'bramling x': 'american_india_pale_ale',
  'pumpkinhead': 'pumpkin_spice_beer',
  'the chimera': 'belgian_strong_dark_ale',
  'tropical nuclear penguin': 'eisbock',
  'restorative beverage': 'specialty_beer'
};

// Heuristic by OG/IBU/SRM (Brewdog scale: OG 1095 = 1.095)
function metricHeuristic(og, ibu, srm) {
  if (og == null && ibu == null && srm == null) return null;
  const ogReal = og > 100 ? og / 1000 : og; // normalize
  const srmReal = srm; // SRM stays as-is
  const ibuReal = ibu;

  // Very strong + dark = imperial stout family
  if (ogReal >= 1.080 && srmReal >= 30) return 'american_imperial_stout';
  if (ogReal >= 1.080 && srmReal >= 15 && ibuReal >= 60) return 'double_ipa';
  if (ogReal >= 1.080 && srmReal >= 10 && srmReal < 20) return 'american_barleywine';

  // Strong dark
  if (ogReal >= 1.070 && srmReal >= 30) return 'american_imperial_stout';
  if (ogReal >= 1.070 && srmReal >= 15) return 'imperial_red_ale';

  // Imperial IPA range
  if (ogReal >= 1.065 && ibuReal >= 60 && srmReal < 12) return 'double_ipa';
  if (ogReal >= 1.060 && ibuReal >= 40 && srmReal < 10) return 'american_india_pale_ale';

  // Standard IPA
  if (ogReal >= 1.050 && ibuReal >= 35 && srmReal < 12) return 'american_india_pale_ale';

  // Pale Ale
  if (ogReal >= 1.045 && ibuReal >= 25 && srmReal < 10) return 'pale_ale';

  // Session
  if (ogReal < 1.045 && ibuReal >= 30 && srmReal < 10) return 'session_india_pale_ale';

  // Stout/Porter
  if (srmReal >= 35) return 'american_imperial_stout';
  if (srmReal >= 25 && ogReal >= 1.060) return 'american_imperial_stout';
  if (srmReal >= 25) return 'porter';
  if (srmReal >= 18 && ogReal >= 1.055) return 'porter';

  // Wheat / light
  if (ogReal < 1.040 && ibuReal < 20) return 'blonde_ale';

  // Lager (low IBU, low SRM)
  if (ogReal >= 1.040 && ogReal <= 1.055 && ibuReal <= 30 && srmReal <= 6) return 'pale_lager';

  // Eisbock-like (very high OG)
  if (ogReal >= 1.100) return 'eisbock';

  return null;
}

// Composition heuristic (fermentables)
function compositionHeuristic(fermentables) {
  if (!fermentables || !fermentables.length) return null;
  const total = fermentables.reduce((s, f) => s + (f.amount_kg || 0), 0);
  if (total <= 0) return null;

  const find = (rx) => fermentables.filter(f => rx.test((f.name || '').toLowerCase())).reduce((s, f) => s + (f.amount_kg || 0), 0) / total;

  const ryeP = find(/rye/);
  const wheatP = find(/wheat|weizen/);
  const oatP = find(/oat/);
  const smokeP = find(/smoke|rauch|peat/);
  const choc = find(/chocolate|carafa|dehusked/);
  const roast = find(/roast|black\b|patent/);
  const cara = find(/crystal|caramel|cara/);

  if (ryeP > 0.20) return 'rye_ipa';
  if (smokeP > 0.20) return 'bamberg_maerzen_rauchbier';
  if (oatP > 0.15 && (roast + choc) > 0.05) return 'oatmeal_stout';
  if ((roast + choc) > 0.08) return null; // roast → handled by metric
  return null;
}

// Final mapping function
function remap(rec) {
  if (!rec.bjcp_unmapped) return rec; // already mapped, keep

  const name = (rec.name || '').toLowerCase().trim();

  // Pass 1: manual map
  if (MANUAL_MAP[name]) {
    return Object.assign({}, rec, { bjcp_slug: MANUAL_MAP[name], bjcp_unmapped: false, bjcp_source: 'manual' });
  }

  // Pass 2: name pattern (Hello My Name Is, Ace Of, AB:XX)
  if (/^ace of/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'american_india_pale_ale', bjcp_unmapped: false, bjcp_source: 'name_ace' });
  }
  if (/^hello my name is/i.test(name)) {
    // Hello My Name Is series — Brewdog's experimental berliner-weisse-fruit collaboration
    return Object.assign({}, rec, { bjcp_slug: 'fruit_beer', bjcp_unmapped: false, bjcp_source: 'name_hello' });
  }
  if (/^ipa is dead/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'american_india_pale_ale', bjcp_unmapped: false, bjcp_source: 'name_ipaisdead' });
  }
  if (/^hazy jane/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'juicy_or_hazy_india_pale_ale', bjcp_unmapped: false, bjcp_source: 'name_hazy_jane' });
  }
  if (/^elvis juice/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'american_india_pale_ale', bjcp_unmapped: false, bjcp_source: 'name_elvis' });
  }
  if (/\bgose\b/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'gose', bjcp_unmapped: false, bjcp_source: 'name_gose' });
  }
  if (/saison|farmhouse/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'french_belgian_saison', bjcp_unmapped: false, bjcp_source: 'name_saison' });
  }
  if (/dubbel/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'belgian_dubbel', bjcp_unmapped: false, bjcp_source: 'name_dubbel' });
  }
  if (/tripel/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'belgian_tripel', bjcp_unmapped: false, bjcp_source: 'name_tripel' });
  }
  if (/quadrupel|\bquad\b/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'belgian_quadrupel', bjcp_unmapped: false, bjcp_source: 'name_quad' });
  }
  if (/witbier|\bwit\b/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'belgian_witbier', bjcp_unmapped: false, bjcp_source: 'name_wit' });
  }
  if (/lambic|gueuze/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'gueuze', bjcp_unmapped: false, bjcp_source: 'name_lambic' });
  }
  if (/sour\b/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'american_wild_ale', bjcp_unmapped: false, bjcp_source: 'name_sour' });
  }
  if (/pumpkin|squash/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'pumpkin_spice_beer', bjcp_unmapped: false, bjcp_source: 'name_pumpkin' });
  }
  if (/honey/i.test(name)) {
    return Object.assign({}, rec, { bjcp_slug: 'specialty_honey_beer', bjcp_unmapped: false, bjcp_source: 'name_honey' });
  }

  // Pass 3: composition heuristic
  const compResult = compositionHeuristic(rec.fermentables);
  if (compResult) {
    return Object.assign({}, rec, { bjcp_slug: compResult, bjcp_unmapped: false, bjcp_source: 'composition' });
  }

  // Pass 4: metric heuristic (OG/IBU/SRM)
  const metricResult = metricHeuristic(rec.og, rec.ibu, rec.color_srm);
  if (metricResult) {
    return Object.assign({}, rec, { bjcp_slug: metricResult, bjcp_unmapped: false, bjcp_source: 'metric' });
  }

  // Pass 5: real specialty (or unmappable)
  return Object.assign({}, rec, { bjcp_slug: 'specialty_beer', bjcp_unmapped: true, bjcp_source: 'unmapped_fallback' });
}

// Apply remap
const remapped = records.map(remap);
const newSpecialty = remapped.filter(r => r.bjcp_unmapped).length;
const newMapped = remapped.length - newSpecialty;
const initialMapped = records.filter(r => !r.bjcp_unmapped).length;

console.log('=== Mapping Improvement ===');
console.log('Total records:', records.length);
console.log('Initially mapped:', initialMapped);
console.log('After remap mapped:', newMapped);
console.log('After remap specialty:', newSpecialty);
console.log('Δ mapping:', '+' + (newMapped - initialMapped));

// Source breakdown
const bySource = {};
remapped.forEach(r => {
  const k = r.bjcp_source || 'original';
  bySource[k] = (bySource[k] || 0) + 1;
});
console.log('\nMapping source breakdown:');
Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + k + ': ' + n));

// New slug distribution
const slugCount = {};
remapped.forEach(r => slugCount[r.bjcp_slug] = (slugCount[r.bjcp_slug] || 0) + 1);
console.log('\nFinal slug distribution (top 25):');
Object.entries(slugCount).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([s, n]) => console.log('  ' + s.padEnd(40) + n));

// Save updated dataset
data.records = remapped;
data._meta.bjcp_mapped = newMapped;
data._meta.bjcp_unmapped = newSpecialty;
data._meta.remap_applied = '2026-04-26 step32 enhanced heuristic';
fs.writeFileSync('_v7_recipes_diydog.json', JSON.stringify(data, null, 2));
console.log('\nWrote _v7_recipes_diydog.json (updated)');

// Save mapping table for reference
const mappingTable = {
  _meta: {
    generated: new Date().toISOString(),
    description: 'Diydog BJCP mapping table — recipe name → bjcp_slug + source layer'
  },
  manual_overrides: MANUAL_MAP,
  records: remapped.map(r => ({
    file: r.source_file,
    name: r.name,
    og: r.og,
    ibu: r.ibu,
    srm: r.color_srm,
    bjcp_slug: r.bjcp_slug,
    bjcp_source: r.bjcp_source || 'original'
  }))
};
fs.writeFileSync('_diydog_bjcp_mapping.json', JSON.stringify(mappingTable, null, 2));
console.log('Wrote _diydog_bjcp_mapping.json');
