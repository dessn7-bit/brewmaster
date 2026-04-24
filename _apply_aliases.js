// Apply slug aliases to ML dataset — produces _ml_dataset_normalized.json
const fs = require('fs');
const ALIASES = JSON.parse(fs.readFileSync(__dirname + '/style_aliases.json','utf8'));
delete ALIASES._meta;
const DEFS = require('./STYLE_DEFINITIONS.json');
const canon = new Set(Object.keys(DEFS));

function normalizeSlug(s) { return ALIASES[s] || s; }

const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json','utf8'));
let changed = 0, still_unknown = 0;
const beforeLabels = new Set(DS.records.map(r=>r.label_slug));
for (const r of DS.records) {
  const old = r.label_slug;
  const nu = normalizeSlug(old);
  if (nu !== old) { r.label_slug = nu; changed++; }
  if (!canon.has(r.label_slug)) still_unknown++;
}
const afterLabels = new Set(DS.records.map(r=>r.label_slug));
console.log('Records:', DS.records.length);
console.log('Records with changed label:', changed);
console.log('Unique labels  before:', beforeLabels.size, ' after:', afterLabels.size);
console.log('Still-unknown (non-canonical) records:', still_unknown);

// Also normalize ground truth batches (v1 + v2 batch1-8)
function patchGT(filepath) {
  const gt = JSON.parse(fs.readFileSync(filepath,'utf8'));
  const recs = gt.recipes || (Array.isArray(gt) ? gt : []);
  let c = 0;
  for (const r of recs) {
    if (!r.correct_style_slug) continue;
    const nu = normalizeSlug(r.correct_style_slug);
    if (nu !== r.correct_style_slug) { r.correct_style_slug = nu; c++; }
  }
  return c;
}

DS._meta.aliases_applied = true;
DS._meta.alias_version = '1.0';
DS._meta.alias_changes = changed;
fs.writeFileSync(__dirname + '/_ml_dataset_normalized.json', JSON.stringify(DS));
console.log('Wrote _ml_dataset_normalized.json');
