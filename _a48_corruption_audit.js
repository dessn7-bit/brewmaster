// Adım 48 Faz 1 — Full dataset yeast field corruption audit
// 8061 recipe × 6 pattern × all sources × all clusters
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
const recipes = data.recipes;
console.log('V10.1 dataset: ' + recipes.length + ' recipes');

// === Pattern classifiers ===
function classifyYeast(rawYeast) {
  let y = rawYeast;
  if (Array.isArray(y)) y = y.join(' | ');
  const ys = String(y || '').trim();

  if (!ys) return 'empty';
  // [object Object]
  if (/^\[object\s*object\]$/i.test(ys) || ys.includes('[object Object]')) return 'object_string';
  // HTML residue
  if (/<[a-z][^>]*>|&[a-z]+;|&#\d+;/i.test(ys)) return 'html_residue';
  // Prose paragraph (>200 char OR sentence patterns)
  if (ys.length > 200) return 'prose_paragraph';
  // Sentence-ish detection (>80 char + multiple sentence ends)
  if (ys.length > 80 && (ys.match(/[.!?]\s+[a-zA-Z]/g) || []).length >= 2) return 'prose_paragraph';
  // Pure name-only (just generic strain class without ID)
  if (/^(wyeast|wlp|white\s*labs|safale|safbrew|saflager|lallemand|lalbrew|fermentis|imperial|omega)$/i.test(ys)) return 'name_only';
  // Otherwise clean strain ID (most common case)
  if (ys.length <= 80) return 'clean';
  // Fallback: medium freeform (80-200 char without sentence structure)
  return 'medium_freeform';
}

const patterns = ['empty','object_string','html_residue','prose_paragraph','name_only','clean','medium_freeform'];
const sources = [...new Set(recipes.map(r => r.source))].sort();
const clusters = [...new Set(recipes.map(r => r.bjcp_main_category))].sort();

// 1. Source × Pattern matrix
const srcPattern = {};
for (const s of sources) {
  srcPattern[s] = {};
  for (const p of patterns) srcPattern[s][p] = 0;
  srcPattern[s].TOTAL = 0;
}
for (const r of recipes) {
  const p = classifyYeast(r.raw && r.raw.yeast);
  srcPattern[r.source][p] = (srcPattern[r.source][p] || 0) + 1;
  srcPattern[r.source].TOTAL++;
}

console.log('\n=== SOURCE × PATTERN MATRIX ===');
console.log('Source'.padEnd(12) + patterns.map(p => p.slice(0,10).padStart(11)).join('') + '   TOTAL');
for (const s of sources) {
  const row = [s.padEnd(12)];
  for (const p of patterns) row.push(srcPattern[s][p].toString().padStart(11));
  row.push('   ' + srcPattern[s].TOTAL.toString().padStart(5));
  console.log(row.join(''));
}

// 2. Source corruption rate (anything except 'clean' counted as corrupt)
console.log('\n=== SOURCE CORRUPTION RATE ===');
console.log('Source'.padEnd(12) + 'Total'.padStart(8) + 'Corrupt'.padStart(10) + 'Clean'.padStart(8) + 'Rate'.padStart(10));
for (const s of sources) {
  const total = srcPattern[s].TOTAL;
  const clean = srcPattern[s].clean;
  const corrupt = total - clean;
  const rate = (100 * corrupt / total).toFixed(1) + '%';
  console.log(s.padEnd(12) + total.toString().padStart(8) + corrupt.toString().padStart(10) + clean.toString().padStart(8) + rate.padStart(10));
}

// 3. Cluster × Corruption rate
const clusterPattern = {};
for (const c of clusters) {
  clusterPattern[c] = { total: 0, corrupt: 0 };
}
for (const r of recipes) {
  const p = classifyYeast(r.raw && r.raw.yeast);
  const c = r.bjcp_main_category;
  clusterPattern[c].total++;
  if (p !== 'clean') clusterPattern[c].corrupt++;
}

console.log('\n=== CLUSTER × CORRUPTION RATE ===');
console.log('Cluster'.padEnd(35) + 'Total'.padStart(7) + 'Corrupt'.padStart(10) + 'Rate'.padStart(8));
const sortedC = Object.entries(clusterPattern).sort((a,b)=>b[1].total-a[1].total);
for (const [c, v] of sortedC) {
  const rate = (100 * v.corrupt / v.total).toFixed(1) + '%';
  console.log(c.padEnd(35) + v.total.toString().padStart(7) + v.corrupt.toString().padStart(10) + rate.padStart(8));
}

// 4. Pattern aggregate
const patternTotal = {};
for (const p of patterns) patternTotal[p] = 0;
for (const r of recipes) {
  const p = classifyYeast(r.raw && r.raw.yeast);
  patternTotal[p]++;
}
console.log('\n=== PATTERN AGGREGATE (8061 total) ===');
for (const p of patterns) {
  console.log('  ' + p.padEnd(20) + patternTotal[p].toString().padStart(5) + ' (' + (100*patternTotal[p]/recipes.length).toFixed(2) + '%)');
}

// 5. Sample bad records per pattern (debug helper)
console.log('\n=== SAMPLE PROBLEMATIC RECORDS ===');
const samples = { object_string: [], prose_paragraph: [], html_residue: [], empty: [], name_only: [], medium_freeform: [] };
for (const r of recipes) {
  const p = classifyYeast(r.raw && r.raw.yeast);
  if (samples[p] && samples[p].length < 5) {
    let y = r.raw && r.raw.yeast;
    if (Array.isArray(y)) y = y.join(' | ');
    samples[p].push({ source: r.source, source_id: r.source_id, name: r.name, cluster: r.bjcp_main_category, yeast: String(y || '').slice(0, 120) });
  }
}
for (const [p, lst] of Object.entries(samples)) {
  if (!lst.length) continue;
  console.log('\n  --- ' + p + ' ---');
  for (const s of lst) console.log('    [' + s.source + ':' + s.source_id + '] ' + s.cluster + ' | "' + s.name.slice(0,40) + '" | yeast: "' + s.yeast + '"');
}

// Save full data
fs.writeFileSync('_a48_corruption_audit.json', JSON.stringify({
  source_pattern_matrix: srcPattern,
  cluster_corruption: clusterPattern,
  pattern_aggregate: patternTotal,
  samples
}, null, 2));
console.log('\nWrote _a48_corruption_audit.json');
