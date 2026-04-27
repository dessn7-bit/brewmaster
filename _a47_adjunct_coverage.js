// Adım 47 Aşama 1.2 — Adjunct keyword coverage analysis
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
const recipes = data.recipes;

// Build text source per recipe (title + sorte_raw + raw text fields when available)
function recipeText(r) {
  const parts = [];
  if (r.name) parts.push(String(r.name));
  if (r.sorte_raw) parts.push(String(r.sorte_raw));
  // Some sources have notes/description in raw
  if (r.raw) {
    if (r.raw.notes) parts.push(String(r.raw.notes));
    if (r.raw.author) parts.push(String(r.raw.author));
  }
  // Also include malt names + hop names + yeast (for cross-reference noise check)
  if (r.raw && r.raw.malts) parts.push(r.raw.malts.map(m => m.name || '').join(' '));
  if (r.raw && r.raw.hops) parts.push(r.raw.hops.map(h => h.name || '').join(' '));
  if (r.raw && r.raw.yeast) parts.push(String(r.raw.yeast));
  return parts.join(' ').toLowerCase();
}

// Patterns from prompt
const PATTERNS = {
  has_coffee: /\b(coffee|espresso|cold[\s-]?brew|caffè)\b/i,
  has_fruit: /\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|lime|lemon zest|orange peel|frambozen|himbeere|kirsche|aardbei|pomegranate)\b/i,
  has_spice: /\b(coriander|cardamom|cinnamon|vanilla bean|black pepper|ginger|anise|nutmeg|clove|kruidnagel|kaneel|gember)\b/i,
  has_cocoa: /\b(cocoa|cacao|chocolate(?!\s*malt|\s*malz|mout|nmout)|nibs)\b/i,
  has_chili: /\b(chipotle|jalape[ñn]o|habanero|ghost pepper|chili pepper|chili|ancho|poblano|chile)\b/i,
  has_smoke: /\b(smoke|smoked|rauch|peat|gerookt|isli)\b(?!\s*malt|\s*malz|mout)/i
};

const matches = {};
for (const k of Object.keys(PATTERNS)) matches[k] = { count: 0, by_main_cat: {}, samples: [] };
const cluster_size = {};
for (const r of recipes) cluster_size[r.bjcp_main_category] = (cluster_size[r.bjcp_main_category]||0)+1;

for (const r of recipes) {
  const text = recipeText(r);
  const main = r.bjcp_main_category || 'unknown';
  for (const k of Object.keys(PATTERNS)) {
    if (PATTERNS[k].test(text)) {
      matches[k].count++;
      matches[k].by_main_cat[main] = (matches[k].by_main_cat[main] || 0) + 1;
      if (matches[k].samples.length < 5) matches[k].samples.push({ name: r.name, main, slug: r.bjcp_slug });
    }
  }
}

const total = recipes.length;
console.log('Total recipes: ' + total);
console.log('\n=== Coverage per pattern ===');
for (const [k, v] of Object.entries(matches)) {
  const pct = (100 * v.count / total).toFixed(2);
  console.log('  ' + k.padEnd(15) + v.count.toString().padStart(5) + ' / ' + total + ' (' + pct + '%)');
}

console.log('\n=== Per-cluster breakdown (signal vs noise) ===');
for (const k of Object.keys(matches)) {
  console.log('\n  --- ' + k + ' ---');
  const sorted = Object.entries(matches[k].by_main_cat).sort((a,b)=>b[1]-a[1]);
  for (const [main, n] of sorted) {
    const cluster_total = cluster_size[main] || 1;
    const within_pct = (100*n/cluster_total).toFixed(1);
    const tag = main === 'Specialty / Adjunct' ? '⭐SIGNAL' : (main === 'Sour / Wild / Brett' && k === 'has_fruit' ? '⭐SIGNAL' : 'noise?');
    console.log('    '+main.padEnd(35)+n.toString().padStart(4)+' ('+within_pct+'% of cluster) '+tag);
  }
  console.log('    Samples: ' + matches[k].samples.map(s=>s.name+' ['+s.slug+']').slice(0,3).join(' | '));
}

// Specialty cluster coverage
console.log('\n=== Specialty cluster ('+cluster_size['Specialty / Adjunct']+' recipes) — keyword hit rate ===');
const specialty_recs = recipes.filter(r => r.bjcp_main_category === 'Specialty / Adjunct');
let specialty_with_any_keyword = 0;
for (const r of specialty_recs) {
  const text = recipeText(r);
  if (Object.values(PATTERNS).some(re => re.test(text))) specialty_with_any_keyword++;
}
console.log('  Specialty recipes with at least 1 adjunct keyword: ' + specialty_with_any_keyword + ' / ' + specialty_recs.length + ' (' + (100*specialty_with_any_keyword/specialty_recs.length).toFixed(1) + '%)');

// Stout false positive risk
console.log('\n=== Stout cluster ('+cluster_size['Stout / Porter']+' recipes) — adjunct keyword false positive risk ===');
const stout_recs = recipes.filter(r => r.bjcp_main_category === 'Stout / Porter');
let stout_coffee = 0, stout_cocoa = 0, stout_vanilla = 0, stout_fruit = 0;
for (const r of stout_recs) {
  const text = recipeText(r);
  if (PATTERNS.has_coffee.test(text)) stout_coffee++;
  if (PATTERNS.has_cocoa.test(text)) stout_cocoa++;
  if (/vanilla/i.test(text)) stout_vanilla++;
  if (PATTERNS.has_fruit.test(text)) stout_fruit++;
}
console.log('  Stout with coffee keyword: ' + stout_coffee + ' (' + (100*stout_coffee/stout_recs.length).toFixed(1) + '%)');
console.log('  Stout with cocoa keyword:  ' + stout_cocoa + ' (' + (100*stout_cocoa/stout_recs.length).toFixed(1) + '%)');
console.log('  Stout with vanilla:        ' + stout_vanilla + ' (' + (100*stout_vanilla/stout_recs.length).toFixed(1) + '%)');
console.log('  Stout with fruit:          ' + stout_fruit + ' (' + (100*stout_fruit/stout_recs.length).toFixed(1) + '%)');

// IPA false positive
const ipa_recs = recipes.filter(r => r.bjcp_main_category === 'American Hoppy');
let ipa_fruit = 0, ipa_chili = 0;
for (const r of ipa_recs) {
  const text = recipeText(r);
  if (PATTERNS.has_fruit.test(text)) ipa_fruit++;
  if (PATTERNS.has_chili.test(text)) ipa_chili++;
}
console.log('\n  IPA/Hoppy ('+ipa_recs.length+') with fruit:    ' + ipa_fruit + ' (' + (100*ipa_fruit/ipa_recs.length).toFixed(1) + '%)');
console.log('  IPA/Hoppy with chili:    ' + ipa_chili + ' (' + (100*ipa_chili/ipa_recs.length).toFixed(1) + '%)');

fs.writeFileSync('_a47_adjunct_freq.json', JSON.stringify({ matches, cluster_size, specialty_with_any_keyword, total }, null, 2));
console.log('\nSaved _a47_adjunct_freq.json');
