// Merge _ml_dataset_v7_clean.json (613) + _v8_recipes_mmum.json → _ml_dataset_v8_pre_retrain.json
// Apply Adım 33 dedupe logic + stratified split
const fs = require('fs');

const v7 = JSON.parse(fs.readFileSync('_ml_dataset_v7_clean.json', 'utf8'));
const mmum = JSON.parse(fs.readFileSync('_v8_recipes_mmum.json', 'utf8'));
const HIER = JSON.parse(fs.readFileSync('_audit_step_26d_style_hierarchy.json', 'utf8'));
const slugToMain = {};
Object.entries(HIER.categories).forEach(([cat, info]) => {
  info.slugs.forEach(s => { slugToMain[s.slug] = cat; });
});

console.log('V7 records:', v7.recipes.length);
console.log('MMUM records:', mmum.records.length);

// Filter MMUM to mapped only (drop unmapped for V7 retrain)
const mmumMapped = mmum.records.filter(r => r.bjcp_slug);
console.log('MMUM mapped:', mmumMapped.length);

// Combine — all share same v7 schema (id, source, source_id, name, bjcp_slug, bjcp_main_category, raw, features)
// V7 had 'in_split' field, MMUM doesn't → assign later
const allRecords = [
  ...v7.recipes,  // already has in_split
  ...mmumMapped.map(r => ({ ...r, in_split: null }))  // assign later
];
console.log('Combined raw:', allRecords.length);

// Dedupe (Adım 33 logic)
function normalizeName(s) {
  return String(s||'').toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(clone|recipe|the|a|an|brewing|book|byo)\b/g, '')
    .replace(/\b\d{4}\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function vecKey(r) {
  const f = r.features || {};
  return r.bjcp_slug + '|' + Math.round((f.og||0)*1000) + '|' + Math.round((f.fg||0)*1000) + '|' + Math.round(f.abv||0) + '|' + Math.round((f.ibu||0)/2) + '|' + Math.round((f.srm||0)/2);
}
function nameKey(r) {
  return r.bjcp_slug + '|' + normalizeName(r.name);
}

// Priority: mmum > tmf > diydog > pilot
const sourcePriority = { mmum: 4, tmf: 3, diydog: 2, pilot: 1 };

const seen = {};
const dups = [];
for (const r of allRecords) {
  const k1 = nameKey(r);
  const k2 = vecKey(r);
  const exN = seen[k1]; const exV = seen[k2];
  if (exN || exV) {
    const ex = exN || exV;
    const exP = sourcePriority[ex.source] || 0;
    const newP = sourcePriority[r.source] || 0;
    if (newP > exP) {
      dups.push({ kept: r.source+':'+r.source_id, dropped: ex.source+':'+ex.source_id, reason: exN?'name':'vec' });
      seen[k1] = r; seen[vecKey(ex)] = r; seen[k2] = r;
    } else {
      dups.push({ kept: ex.source+':'+ex.source_id, dropped: r.source+':'+r.source_id, reason: exN?'name':'vec' });
    }
    continue;
  }
  seen[k1] = r; seen[k2] = r;
}
const unique = Array.from(new Set(Object.values(seen)));
console.log('After dedupe:', unique.length, '(', dups.length, 'duplicates removed)');

// Stratified split for new MMUM records (V7 already has in_split)
// For unsplit (in_split === null), apply 80/20 stratified by bjcp_slug
let seed = 42;
function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length-1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}

// Group new MMUM (in_split === null) by slug
const bySlug = {};
for (const r of unique) {
  if (r.in_split !== null) continue;
  if (!bySlug[r.bjcp_slug]) bySlug[r.bjcp_slug] = [];
  bySlug[r.bjcp_slug].push(r);
}
for (const slug of Object.keys(bySlug)) {
  const arr = shuffle(bySlug[slug]);
  const tCount = Math.max(1, Math.floor(arr.length * 0.2));
  for (let i = 0; i < arr.length; i++) arr[i].in_split = i < tCount ? 'test' : 'train';
}

// Final stats
const trainN = unique.filter(r => r.in_split==='train').length;
const testN = unique.filter(r => r.in_split==='test').length;
const slugCount = {};
for (const r of unique) slugCount[r.bjcp_slug] = (slugCount[r.bjcp_slug]||0)+1;
const sortedSlug = Object.entries(slugCount).sort((a,b)=>b[1]-a[1]);

console.log('\n=== FINAL V8 DATASET ===');
console.log('Total:', unique.length);
console.log('Train:', trainN, '/ Test:', testN);
console.log('Unique slugs:', sortedSlug.length);
console.log('n>=20:', sortedSlug.filter(([s,n])=>n>=20).length);
console.log('n>=10:', sortedSlug.filter(([s,n])=>n>=10).length);
console.log('n>=5:', sortedSlug.filter(([s,n])=>n>=5).length);
console.log('n<5:', sortedSlug.filter(([s,n])=>n<5).length);

console.log('\nBelgian Trappist:');
['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale','belgian_blonde_ale','belgian_witbier'].forEach(s=>{
  const before = (v7.recipes.filter(r=>r.bjcp_slug===s).length);
  const after = (slugCount[s] || 0);
  console.log('  '+s+': '+before+' → '+after+' (+'+(after-before)+')');
});

console.log('\nTop 20 slugs (V8):');
sortedSlug.slice(0,20).forEach(([s,n])=>console.log('  '+s.padEnd(40)+n));

const out = {
  meta: {
    generated: new Date().toISOString(),
    total_recipes: unique.length,
    train_n: trainN, test_n: testN,
    total_styles: sortedSlug.length,
    feature_count: v7.meta.feature_count,
    feature_list: v7.meta.feature_list,
    sources: { pilot: v7.recipes.filter(r=>r.source==='pilot').length, diydog: v7.recipes.filter(r=>r.source==='diydog').length, tmf: v7.recipes.filter(r=>r.source==='tmf').length, mmum: unique.filter(r=>r.source==='mmum').length },
    dedupe_removed: dups.length,
    regex_version: '26B'
  },
  recipes: unique
};
fs.writeFileSync('_ml_dataset_v8_pre_retrain.json', JSON.stringify(out, null, 2));
console.log('\nWrote _ml_dataset_v8_pre_retrain.json (' + (JSON.stringify(out).length/1024/1024).toFixed(1) + ' MB)');
