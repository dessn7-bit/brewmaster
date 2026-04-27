// Merge V10.1 + Brulosophy + Mad Ferm → V11
const fs = require('fs');
const v101 = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
const blogs = JSON.parse(fs.readFileSync('_v11_recipes_blogs.json', 'utf8'));
console.log('V10.1 records:', v101.recipes.length);
console.log('Blog (Brulo+MadFerm):', blogs.records.length);

const allRecords = [...v101.recipes, ...blogs.records];
function normalizeName(s) {
  return String(s||'').toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(clone|recipe|the|a|an|brewing|book|byo|exbeeriment)\b/g, '').replace(/\b\d{4}\b/g, '').replace(/[^a-z0-9äöüß]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function vecKey(r) {
  const f = r.features || {};
  return r.bjcp_slug + '|' + Math.round((f.og||0)*1000) + '|' + Math.round((f.fg||0)*1000) + '|' + Math.round(f.abv||0) + '|' + Math.round((f.ibu||0)/2) + '|' + Math.round((f.srm||0)/2);
}
function nameKey(r) { return r.bjcp_slug + '|' + normalizeName(r.name); }
const sourcePriority = { roerstok:8, amervallei:7.5, twortwat:7, braureka:6, recipator:5, mmum:4, tmf:3, diydog:2, pilot:1, brulosophy:9, madferm:9 };
const seen = {}; const dups = []; const dedupeBySource = {};
for (const r of allRecords) {
  const k1 = nameKey(r); const k2 = vecKey(r);
  const exN = seen[k1]; const exV = seen[k2];
  if (exN || exV) {
    const ex = exN || exV;
    const pair = [ex.source, r.source].sort().join('_vs_');
    dedupeBySource[pair] = (dedupeBySource[pair]||0)+1;
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

console.log('\nDedupe by pair:');
Object.entries(dedupeBySource).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(40)+v));

// Stratified split for new (in_split=null)
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
console.log('\n=== V11 ===');
console.log('Total:', unique.length, '/ train:', trainN, '/ test:', testN);
console.log('\nSources:');
['pilot','diydog','tmf','mmum','recipator','braureka','twortwat','roerstok','amervallei','brulosophy','madferm'].forEach(s=>console.log('  '+s.padEnd(15)+unique.filter(r=>r.source===s).length));

console.log('\nKey clusters (V10.1 → V11):');
const v101s={}; for(const r of v101.recipes) v101s[r.bjcp_slug]=(v101s[r.bjcp_slug]||0)+1;
['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale','belgian_strong_golden','belgian_blonde_ale','belgian_witbier',
 'french_belgian_saison','flanders_red_ale','belgian_fruit_lambic','gose','belgian_lambic','berliner_weisse','american_wild_ale',
 'special_bitter_or_best_bitter','strong_bitter','ordinary_bitter','extra_special_bitter','mild',
 'old_ale','british_barley_wine_ale','scotch_ale_or_wee_heavy','scottish_export','strong_scotch_ale','wee_heavy','strong_ale',
 'specialty_beer','fruit_beer','smoked_beer','herb_and_spice_beer','coffee_beer','pumpkin_squash_beer','chocolate_or_cocoa_beer',
 'german_koelsch','german_altbier','common_beer','german_pilsener','south_german_hefeweizen','weizenbock','american_imperial_stout',
 'oatmeal_stout','sweet_stout','irish_dry_stout','baltic_porter'].forEach(s=>{
  const a=v101s[s]||0, b=slugCount[s]||0, d=b-a;
  if (d !== 0) console.log('  '+s.padEnd(40)+a+' → '+b+' '+(d>0?`(+${d})`:`(${d})`));
});

const out = {
  meta: {
    generated: new Date().toISOString(), total_recipes: unique.length, train_n: trainN, test_n: testN,
    feature_count: v101.meta.feature_count, feature_list: v101.meta.feature_list,
    sources: Object.fromEntries(['pilot','diydog','tmf','mmum','recipator','braureka','twortwat','roerstok','amervallei','brulosophy','madferm'].map(s=>[s, unique.filter(r=>r.source===s).length])),
    dedupe_total: dups.length, dedupe_by_pair: dedupeBySource,
    regex_version: '26B+r+b+t+roer+blog'
  },
  recipes: unique
};
fs.writeFileSync('_ml_dataset_v11_pre_retrain.json', JSON.stringify(out, null, 2));
console.log('\nWrote _ml_dataset_v11_pre_retrain.json ('+(JSON.stringify(out).length/1024/1024).toFixed(1)+' MB)');
