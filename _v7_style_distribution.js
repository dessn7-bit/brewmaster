// V7 Style Distribution Analysis — current 613-recipe dataset
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('_ml_dataset_v7_clean.json', 'utf8'));
const hierarchy = JSON.parse(fs.readFileSync('_audit_step_26d_style_hierarchy.json', 'utf8'));

// Build slug → main_category map
const slugToMain = {};
Object.entries(hierarchy.categories).forEach(([cat, info]) => {
  info.slugs.forEach(s => { slugToMain[s.slug] = cat; });
});

// Per-slug stats
const stats = {};  // slug → {n, sources, in_train, in_test}
data.recipes.forEach(r => {
  const s = r.bjcp_slug;
  if (!stats[s]) stats[s] = { n: 0, sources: {}, in_train: 0, in_test: 0, main_cat: slugToMain[s] || 'Unmapped' };
  stats[s].n++;
  stats[s].sources[r.source] = (stats[s].sources[r.source] || 0) + 1;
  if (r.in_split === 'train') stats[s].in_train++; else stats[s].in_test++;
});

// Sorted slug list
const slugList = Object.entries(stats).map(([s, v]) => ({ slug: s, ...v })).sort((a, b) => b.n - a.n);

// Histogram buckets
const buckets = {
  'n>=20': [], '10<=n<20': [], '5<=n<10': [], '2<=n<5': [], 'n=1': []
};
slugList.forEach(x => {
  if (x.n >= 20) buckets['n>=20'].push(x.slug);
  else if (x.n >= 10) buckets['10<=n<20'].push(x.slug);
  else if (x.n >= 5) buckets['5<=n<10'].push(x.slug);
  else if (x.n >= 2) buckets['2<=n<5'].push(x.slug);
  else buckets['n=1'].push(x.slug);
});

// Production-readiness flags
function status(n) {
  if (n >= 20) return '✅ Train için yeterli (n>=20)';
  if (n >= 10) return '⚠️ Marjinal (10<=n<20)';
  if (n >= 5) return '⚠️ Düşük (5<=n<10)';
  if (n >= 3) return '❌ Yetersiz (3<=n<5)';
  return '🚫 Çöp (n<3)';
}

// Main category aggregates
const byMain = {};
slugList.forEach(x => {
  if (!byMain[x.main_cat]) byMain[x.main_cat] = { stil_sayisi: 0, toplam_recete: 0, n_ge_10: 0, n_lt_5: 0 };
  byMain[x.main_cat].stil_sayisi++;
  byMain[x.main_cat].toplam_recete += x.n;
  if (x.n >= 10) byMain[x.main_cat].n_ge_10++;
  if (x.n < 5) byMain[x.main_cat].n_lt_5++;
});

// Eksik styller — hierarchy'de var ama datasette n=0
const allHierSlugs = new Set();
Object.values(hierarchy.categories).forEach(info => info.slugs.forEach(s => allHierSlugs.add(s.slug)));
const datasetSlugs = new Set(Object.keys(stats));
const missing = [...allHierSlugs].filter(s => !datasetSlugs.has(s));

// Output
const output = {
  meta: {
    generated: new Date().toISOString(),
    total_recipes: data.recipes.length,
    total_slugs: slugList.length,
    total_main_categories: Object.keys(byMain).length,
    train_n: data.meta.train_n,
    test_n: data.meta.test_n
  },
  per_slug: slugList.map(x => ({
    slug: x.slug,
    main_cat: x.main_cat,
    n: x.n,
    in_train: x.in_train,
    in_test: x.in_test,
    sources: x.sources,
    status: status(x.n)
  })),
  per_main_category: Object.entries(byMain).map(([cat, v]) => ({ main_cat: cat, ...v })).sort((a, b) => b.toplam_recete - a.toplam_recete),
  histogram_buckets: buckets,
  missing_styles_from_hierarchy: missing,
  belgian_trappist_focus: {
    belgian_dubbel: stats.belgian_dubbel ? stats.belgian_dubbel.n : 0,
    belgian_tripel: stats.belgian_tripel ? stats.belgian_tripel.n : 0,
    belgian_quadrupel: stats.belgian_quadrupel ? stats.belgian_quadrupel.n : 0,
    belgian_strong_dark_ale: stats.belgian_strong_dark_ale ? stats.belgian_strong_dark_ale.n : 0,
    belgian_blonde_ale: stats.belgian_blonde_ale ? stats.belgian_blonde_ale.n : 0,
    belgian_witbier: stats.belgian_witbier ? stats.belgian_witbier.n : 0
  }
};

fs.writeFileSync('_v7_style_distribution.json', JSON.stringify(output, null, 2));
console.log('Wrote _v7_style_distribution.json');
console.log('');
console.log('=== ÖZET ===');
console.log('Toplam reçete:', output.meta.total_recipes);
console.log('Toplam unique stil:', output.meta.total_slugs);
console.log('Ana kategori:', output.meta.total_main_categories);
console.log('');
console.log('Histogram:');
Object.entries(buckets).forEach(([k, v]) => console.log('  '+k+': '+v.length+' stil'));
console.log('');
console.log('Belgian Trappist focus:');
Object.entries(output.belgian_trappist_focus).forEach(([k, v]) => console.log('  '+k+': '+v));
console.log('');
console.log('Missing from hierarchy:', missing.length, 'styles');
if (missing.length) console.log('  Examples:', missing.slice(0, 10).join(', '));
console.log('');
console.log('--- Top 20 stiller ---');
slugList.slice(0, 20).forEach(x => console.log('  ' + x.slug.padEnd(40) + ' n='+x.n+' [' + x.main_cat + ']'));
