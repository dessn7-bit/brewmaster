// Merge V10 + nlclubs → V10.1
const fs = require('fs');
const v10 = JSON.parse(fs.readFileSync('_ml_dataset_v10_pre_retrain.json', 'utf8'));
const nl = JSON.parse(fs.readFileSync('_v101_recipes_nlclubs.json', 'utf8'));
console.log('V10:', v10.recipes.length, 'NL clubs:', nl.records.length);

const allRecords = [...v10.recipes, ...nl.records];
function normalizeName(s) {
  return String(s||'').toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(clone|recipe|the|a|an|brewing|book|byo)\b/g, '').replace(/\b\d{4}\b/g, '').replace(/[^a-z0-9äöüß]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function vecKey(r) {
  const f = r.features || {};
  return r.bjcp_slug + '|' + Math.round((f.og||0)*1000) + '|' + Math.round((f.fg||0)*1000) + '|' + Math.round(f.abv||0) + '|' + Math.round((f.ibu||0)/2) + '|' + Math.round((f.srm||0)/2);
}
function nameKey(r) { return r.bjcp_slug + '|' + normalizeName(r.name); }
const sourcePriority = { roerstok:8, amervallei:7.5, twortwat:7, braureka:6, recipator:5, mmum:4, tmf:3, diydog:2, pilot:1 };
const seen = {}; const dups = [];
for (const r of allRecords) {
  const k1 = nameKey(r); const k2 = vecKey(r);
  const exN = seen[k1]; const exV = seen[k2];
  if (exN || exV) {
    const ex = exN || exV;
    const exP = sourcePriority[ex.source]||0; const newP = sourcePriority[r.source]||0;
    if (newP > exP) {
      dups.push({kept:r.source+':'+r.source_id, dropped:ex.source+':'+ex.source_id});
      seen[k1] = r; seen[vecKey(ex)] = r; seen[k2] = r;
    } else dups.push({kept:ex.source+':'+ex.source_id, dropped:r.source+':'+r.source_id});
    continue;
  }
  seen[k1] = r; seen[k2] = r;
}
const unique = Array.from(new Set(Object.values(seen)));
console.log('After dedupe:', unique.length, '(', dups.length, 'dups)');

// Stratified split for new (in_split=null) records
let seed=42;
function rnd(){seed=(seed*9301+49297)%233280; return seed/233280;}
function shuffle(arr){const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;}
const bySlug = {};
for (const r of unique) {
  if (r.in_split !== null && r.in_split !== undefined) continue;
  if (!bySlug[r.bjcp_slug]) bySlug[r.bjcp_slug] = [];
  bySlug[r.bjcp_slug].push(r);
}
for (const slug of Object.keys(bySlug)) {
  const arr = shuffle(bySlug[slug]);
  const tCount = Math.max(1, Math.floor(arr.length*0.2));
  for (let i=0;i<arr.length;i++) arr[i].in_split = i<tCount ? 'test' : 'train';
}

const trainN = unique.filter(r=>r.in_split==='train').length;
const testN = unique.filter(r=>r.in_split==='test').length;
const slugCount={}, mainCount={};
for (const r of unique) {
  slugCount[r.bjcp_slug]=(slugCount[r.bjcp_slug]||0)+1;
  mainCount[r.bjcp_main_category]=(mainCount[r.bjcp_main_category]||0)+1;
}
console.log('\n=== V10.1 ===');
console.log('Total:', unique.length, '/ train:', trainN, '/ test:', testN);
console.log('Sources:');
['pilot','diydog','tmf','mmum','recipator','braureka','twortwat','roerstok','amervallei'].forEach(s=>console.log('  '+s.padEnd(15)+unique.filter(r=>r.source===s).length));

console.log('\nKey clusters (V10 → V10.1):');
const v10s={}; for(const r of v10.recipes) v10s[r.bjcp_slug]=(v10s[r.bjcp_slug]||0)+1;
['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale','belgian_strong_golden','belgian_blonde_ale','belgian_witbier',
 'french_belgian_saison','flanders_red_ale','belgian_fruit_lambic','gose','belgian_lambic','berliner_weisse',
 'special_bitter_or_best_bitter','extra_special_bitter','mild','british_barley_wine_ale','scotch_ale_or_wee_heavy',
 'specialty_beer','fruit_beer','smoked_beer','herb_and_spice_beer','american_imperial_stout',
 'german_koelsch','german_altbier','german_pilsener','south_german_hefeweizen','weizenbock'].forEach(s=>{
  const a=v10s[s]||0, b=slugCount[s]||0;
  if (b !== a) console.log('  '+s.padEnd(40)+a+' → '+b+' ('+(b-a>0?'+'+(b-a):''+(b-a))+')');
});

const out = {
  meta: {
    generated: new Date().toISOString(), total_recipes: unique.length, train_n: trainN, test_n: testN,
    feature_count: v10.meta.feature_count, feature_list: v10.meta.feature_list,
    sources: { pilot:unique.filter(r=>r.source==='pilot').length, diydog:unique.filter(r=>r.source==='diydog').length, tmf:unique.filter(r=>r.source==='tmf').length, mmum:unique.filter(r=>r.source==='mmum').length, recipator:unique.filter(r=>r.source==='recipator').length, braureka:unique.filter(r=>r.source==='braureka').length, twortwat:unique.filter(r=>r.source==='twortwat').length, roerstok:unique.filter(r=>r.source==='roerstok').length, amervallei:unique.filter(r=>r.source==='amervallei').length },
    dedupe_total: dups.length,
    regex_version: '26B+recipator+braureka+twortwat+roerstok'
  },
  recipes: unique
};
fs.writeFileSync('_ml_dataset_v101_pre_retrain.json', JSON.stringify(out, null, 2));
console.log('\nWrote _ml_dataset_v101_pre_retrain.json ('+(JSON.stringify(out).length/1024/1024).toFixed(1)+' MB)');
