// Mevcut _gt_convert.js cikisini _ground_truth_v1.json olarak DONDUR.
// Bu dosya bir kez calistirilir, sonra _ground_truth_v1.json immutable kalir.
const fs = require('fs');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');

const OUT = __dirname + '/_ground_truth_v1.json';
if (fs.existsSync(OUT)) {
  console.log('_ground_truth_v1.json zaten var. Immutable — yeniden yazilmaz.');
  process.exit(0);
}

const records = RAW_RECIPES.map(raw => ({
  source: raw.source,
  tier:   raw.tier,
  name:   raw.data.name,
  style_label:   raw.style_label,
  expected_slug: raw.expected_slug,
  url:    raw.url,
  recipe: convertRawToEngineRecipe(raw),
}));

fs.writeFileSync(OUT, JSON.stringify({
  version: 'v1',
  frozen_at: new Date().toISOString(),
  converter: '_gt_convert.js (v2 converter, _yeast_raw eklenmis)',
  count: records.length,
  records,
}, null, 2));

console.log('✓ _ground_truth_v1.json yazildi: ' + records.length + ' recete');
console.log('  Bu dosya IMMUTABLE — bir daha degismeyecek.');
