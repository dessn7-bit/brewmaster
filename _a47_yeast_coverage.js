// Adım 47 Aşama 1.1 — Yeast strain coverage analysis on V10.1 dataset
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
const recipes = data.recipes;
console.log('V10.1 dataset: ' + recipes.length + ' recipes');

// Extract all yeast strings
const yeastStrings = [];
let missingCount = 0;
for (const r of recipes) {
  let y = r.raw && r.raw.yeast;
  if (Array.isArray(y)) y = y.join(' | ');
  if (!y) { missingCount++; continue; }
  yeastStrings.push(String(y).trim());
}
console.log('Recipes with yeast string: ' + yeastStrings.length + ' / ' + recipes.length);
console.log('Missing yeast: ' + missingCount);

// Frequency
const freq = {};
for (const y of yeastStrings) freq[y.toLowerCase()] = (freq[y.toLowerCase()] || 0) + 1;
const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
console.log('\nUnique yeast strings (case-insensitive): ' + sorted.length);

console.log('\n=== Top 50 yeast strings ===');
sorted.slice(0,50).forEach(([y, c]) => console.log('  ' + c.toString().padStart(4) + '  ' + y.slice(0,80)));

// Pattern definitions (as per Adım 47 prompt)
const PATTERNS = {
  brett: {
    ids: ['wyeast 5526', 'wy5526', 'wyeast 5112', 'wy5112', 'wyeast 5733', 'wy5733', 'wyeast 5151', 'wy5151', 'wyeast 5378', 'wy5378',
          'wlp650', 'wlp 650', 'wlp653', 'wlp 653', 'wlp655', 'wlp 655', 'wlp645', 'wlp 645', 'wlp644', 'wlp 644', 'wlp4639', 'wlp 4639'],
    keyword: /brett(anomyces)?\b/i
  },
  lacto: {
    ids: ['wyeast 5335', 'wy5335', 'wyeast 5223', 'wy5223', 'wyeast 5424', 'wy5424',
          'wlp677', 'wlp 677', 'wlp672', 'wlp 672', 'wlp693', 'wlp 693',
          'lallemand wildbrew', 'wildbrew sour'],
    keyword: /lacto(bacillus)?\b/i
  },
  pedio: {
    ids: ['wlp661', 'wlp 661', 'wyeast 5733', 'wy5733'],
    keyword: /pedio(coccus)?\b/i
  },
  sour_blend: {
    ids: ['wyeast 3278', 'wy3278', 'wlp655', 'wlp 655', 'wlp665', 'wlp 665'],
    keyword: /(sour|lambic|funk).*(blend|mix)|(blend|mix).*(sour|lambic|funk)/i
  },
  belgian: {
    ids: ['wyeast 1214', 'wy1214', 'wyeast 1762', 'wy1762', 'wyeast 1388', 'wy1388',
          'wyeast 3787', 'wy3787', 'wyeast 3522', 'wy3522', 'wyeast 3864', 'wy3864',
          'wlp500', 'wlp 500', 'wlp530', 'wlp 530', 'wlp540', 'wlp 540',
          'wlp565', 'wlp 565', 'wlp570', 'wlp 570', 'wlp575', 'wlp 575', 'wlp590', 'wlp 590',
          'safbrew abbaye', 'lalbrew abbaye', 'lallemand abbaye', 'belle saison'],
    keyword: /(abbey|trappist|abbaye|monastic|tripel|dubbel|saison|witbier)/i
  },
  clean_us05: {
    ids: ['wyeast 1056', 'wy1056', 'wlp001', 'wlp 001', 'safale us-05', 'safale us05', 'us-05', 'us05', 'bry-97', 'bry97', 'chico'],
    keyword: null
  }
};

// Apply patterns
function matchPattern(yLower, p) {
  for (const id of p.ids) if (yLower.includes(id)) return true;
  if (p.keyword && p.keyword.test(yLower)) return true;
  return false;
}

const matches = {};
for (const k of Object.keys(PATTERNS)) matches[k] = { count: 0, by_main_cat: {} };
for (const r of recipes) {
  let y = r.raw && r.raw.yeast;
  if (Array.isArray(y)) y = y.join(' | ');
  if (!y) continue;
  const yLower = String(y).toLowerCase();
  const main = r.bjcp_main_category || 'unknown';
  for (const k of Object.keys(PATTERNS)) {
    if (matchPattern(yLower, PATTERNS[k])) {
      matches[k].count++;
      matches[k].by_main_cat[main] = (matches[k].by_main_cat[main] || 0) + 1;
    }
  }
}

console.log('\n=== Coverage per pattern ===');
const total = recipes.length;
for (const [k, v] of Object.entries(matches)) {
  const pct = (100 * v.count / total).toFixed(2);
  console.log('  ' + k.padEnd(15) + v.count.toString().padStart(5) + ' / ' + total + ' (' + pct + '%)');
}

console.log('\n=== Brett by main_category (Sour/Wild beklenen) ===');
Object.entries(matches.brett.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([m,n])=>console.log('  '+m.padEnd(35)+n));

console.log('\n=== Lacto by main_category ===');
Object.entries(matches.lacto.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([m,n])=>console.log('  '+m.padEnd(35)+n));

console.log('\n=== Sour blend by main_category ===');
Object.entries(matches.sour_blend.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([m,n])=>console.log('  '+m.padEnd(35)+n));

console.log('\n=== Belgian yeast by main_category ===');
Object.entries(matches.belgian.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([m,n])=>console.log('  '+m.padEnd(35)+n));

console.log('\n=== Clean US05 isolate by main_category ===');
Object.entries(matches.clean_us05.by_main_cat).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([m,n])=>console.log('  '+m.padEnd(35)+n));

// Sour cluster yeast distribution
const sourYeasts = [];
for (const r of recipes) {
  if (r.bjcp_main_category !== 'Sour / Wild / Brett') continue;
  let y = r.raw && r.raw.yeast;
  if (Array.isArray(y)) y = y.join(' | ');
  if (!y) continue;
  sourYeasts.push(String(y));
}
console.log('\n=== Sour cluster ('+sourYeasts.length+' recipes) — what yeast do they use? ===');
const sFreq = {};
for (const y of sourYeasts) sFreq[y.toLowerCase()] = (sFreq[y.toLowerCase()]||0)+1;
const sSorted = Object.entries(sFreq).sort((a,b)=>b[1]-a[1]);
sSorted.slice(0,30).forEach(([y,c])=>console.log('  '+c.toString().padStart(3)+'  '+y.slice(0,80)));

// Save freq table
fs.writeFileSync('_a47_yeast_freq.json', JSON.stringify({ all_freq: sorted, matches, sour_yeasts: sSorted }, null, 2));
console.log('\nSaved _a47_yeast_freq.json');
