// v3 converter (_gt_convert_v3.js) ile _ground_truth_v2.json uret.
// Bu her v3 iyilestirmesi sonrasi yeniden calisir → v2.json guncellenir.
const fs = require('fs');
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert_v3.js');

const records = RAW_RECIPES.map(raw => ({
  source: raw.source,
  tier:   raw.tier,
  name:   raw.data.name,
  style_label:   raw.style_label,
  expected_slug: raw.expected_slug,
  url:    raw.url,
  recipe: convertRawToEngineRecipe(raw),
}));

fs.writeFileSync(__dirname + '/_ground_truth_v2.json', JSON.stringify({
  version: 'v2',
  generated_at: new Date().toISOString(),
  converter: '_gt_convert_v3.js',
  count: records.length,
  records,
}, null, 2));

console.log('✓ _ground_truth_v2.json yazildi: ' + records.length + ' recete');
