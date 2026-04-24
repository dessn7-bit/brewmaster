// GT v1 freeze — Kaan formati (recipe spec + _meta header, IMMUTABLE)
// Bu dosyayi overwrite ederek _ground_truth_v1.json yaziyor.
const fs = require('fs');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');

// Kaan formatina donustur
const recipes = RAW_RECIPES.map((raw, i) => {
  const d = raw.data || {};
  const id = String(i+1).padStart(3,'0');
  return {
    recipe_id: `${raw.source}_v1_${id}`,
    source: raw.source,
    source_url: raw.url || null,
    beer_name: d.name || '',
    brewery: d.brewery || null,
    correct_style_slug:  raw.expected_slug,
    correct_style_label: raw.style_label || null,
    og:  d.OG  ?? null,
    fg:  d.FG  ?? null,
    ibu: d.IBU ?? null,
    srm: d.SRM ?? null,
    abv: d.ABV ?? null,
    malt_profile:
      Array.isArray(d.malts) && d.malts.length
        ? d.malts.map(m => ({ name: m.name || null, weight_lb: m.weight_lb ?? null, pct: m.pct ?? null }))
        : null,
    hop_profile:
      Array.isArray(d.hops) && d.hops.length
        ? d.hops.map(h => ({ name: h.name || null, amount_oz: h.amount_oz ?? null, alpha_acid: h.alpha_acid ?? null, time_min: h.time_min ?? null, use: h.use || null }))
        : null,
    yeast: d.yeast
      ? (Array.isArray(d.yeast)
          ? d.yeast.map(y => (y.name||'') + (y.manufacturer ? ' ('+y.manufacturer+')' : '')).join('; ')
          : ((d.yeast.name||'') + (d.yeast.manufacturer ? ' ('+d.yeast.manufacturer+')' : '')))
      : null,
    notes: raw.tier ? `tier=${raw.tier}` : null,
  };
});

const out = {
  _meta: {
    version: 'v1',
    frozen_date: '2026-04-23',
    frozen: true,
    count: recipes.length,
    purpose: 'immutable baseline for engine regression testing',
    do_not_modify: true,
  },
  recipes,
};

fs.writeFileSync(__dirname + '/_ground_truth_v1.json', JSON.stringify(out, null, 2));
console.log('✓ _ground_truth_v1.json yazildi: ' + recipes.length + ' recete (Kaan spec formati, _meta.frozen=true)');
