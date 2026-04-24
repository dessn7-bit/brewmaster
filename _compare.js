const fs = require('fs');
const ba = JSON.parse(fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\BA_2026_styles.json', 'utf8'));

// Extract Brewmaster BJCP list (satır 1735-1984)
const html = fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\Brewmaster_v2_79_10.html', 'utf8');
const lines = html.split('\n');
const bjcpBlock = lines.slice(1734, 1984).join('\n');
const re = /"([^"]+)"\s*:\s*\{/g;
const bm = new Set();
let m;
while ((m = re.exec(bjcpBlock)) !== null) bm.add(m[1]);

// Build BA name set
const baNames = new Set(ba.map(s => s.name));

// Normalize for fuzzy comparison
const norm = s => s.toLowerCase()
  .replace(/\bstyle\b/g, '')
  .replace(/[-/]/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/\(.*?\)/g, '')
  .trim();

const baNorm = new Map(); for (const n of baNames) baNorm.set(norm(n), n);
const bmNorm = new Map(); for (const n of bm) bmNorm.set(norm(n), n);

// Exact matches on normalized names
const matched = [];
const baOnly = [];
const bmOnly = [];
for (const [nk, orig] of baNorm.entries()) {
  if (bmNorm.has(nk)) matched.push([orig, bmNorm.get(nk)]);
  else baOnly.push(orig);
}
for (const [nk, orig] of bmNorm.entries()) {
  if (!baNorm.has(nk)) bmOnly.push(orig);
}

console.log('=== COUNTS ===');
console.log('BA 2026 stil sayisi (parse edilebilen):', ba.length);
console.log('Brewmaster BJCP stil sayisi:', bm.size);
console.log('Exact match (normalize):', matched.length);
console.log('Sadece BA\'da:', baOnly.length);
console.log('Sadece Brewmaster\'da:', bmOnly.length);

console.log('\n=== BA 2026\'DA YENI / BREWMASTER\'DA YOK ===');
baOnly.sort().forEach(n => console.log(' +', n));

console.log('\n=== BREWMASTER\'DA VAR AMA BA 2026\'DA YOK ===');
bmOnly.sort().forEach(n => console.log(' -', n));

// Key Kaan-focused styles deep-check
console.log('\n=== KAAN\'IN ODAK STILLERI (Weizen/Dubbel/Weizenbock) ===');
const focus = ['hefeweizen', 'weizen', 'weissbier', 'weizenbock', 'kristal', 'dunkel weizen', 'bernsteinfarbenes', 'leichtes weizen', 'dubbel', 'tripel', 'quadrupel', 'dark strong', 'witbier'];
for (const f of focus) {
  const hits = ba.filter(s => s.name.toLowerCase().includes(f));
  if (hits.length) {
    console.log('\n  ' + f.toUpperCase() + ':');
    hits.forEach(h => console.log('    -', h.name, '| OG', h.og, '| ABV', h.abv, '| IBU', h.ibu, '| SRM', h.srm));
  }
}

// Rice Lager check
console.log('\n=== RICE LAGER ===');
const rice = ba.find(s => /rice lager/i.test(s.name));
if (rice) {
  console.log('  BA 2026:', rice.name, '| OG', rice.og, '| ABV', rice.abv, '| IBU', rice.ibu, '| SRM', rice.srm);
} else {
  console.log('  BA 2026\'da Rice Lager bulunamadi (parse problemi olabilir)');
}
const bmRice = [...bm].filter(n => /rice/i.test(n));
console.log('  Brewmaster\'da /rice/ gecen:', bmRice.join(', ') || '(yok)');
