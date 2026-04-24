const fs = require('fs');
const ba = JSON.parse(fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\BA_2026_styles.json', 'utf8'));
const bj = JSON.parse(fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\BJCP_2021_styles.json', 'utf8'));

// Normalize function for fuzzy matching
function norm(s) {
  return s.toLowerCase()
    .replace(/\bstyle\b/g, '')
    .replace(/[-/,]/g, ' ')
    .replace(/\(.*?\)/g, '')
    .replace(/\bclassic\b|\btraditional\b|\bcontemporary\b|\bmodern\b|\bspecial\b/g, '')
    .replace(/\bof\b|\bor\b|\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Manual alias map for styles that wouldn't match via normalization
// BJCP name -> canonical name (usually BA name if available)
const MANUAL_ALIAS = {
  'Weissbier': 'South German-Style Hefeweizen',
  'Dunkles Weissbier': 'Dunkel Weizen',
  'Weizenbock': 'South German-Style Weizenbock',
  'Witbier': 'Belgian-Style Witbier',
  'Belgian Dubbel': 'Belgian-Style Dubbel',
  'Belgian Tripel': 'Belgian-Style Tripel',
  'Belgian Single': 'Belgian-Style Table Beer',
  'Belgian Dark Strong Ale': 'Belgian-Style Strong Dark Ale',
  'Belgian Blond Ale': 'Belgian-Style Blonde Ale',
  'Belgian Golden Strong Ale': 'Belgian-Style Strong Blonde Ale',
  'Belgian Pale Ale': 'Belgian-Style Speciale Belge',
  'Saison': 'Classic French & Belgian-Style Saison',
  'Bière de Garde': 'French-Style Bière de Garde',
  'Berliner Weisse': 'Berliner-Style Weisse',
  'Gose': 'Contemporary-Style Gose',
  'Flanders Red Ale': 'Belgian-Style Flanders Oud Bruin', // borderline, keep distinct maybe
  'Oud Bruin': 'Belgian-Style Flanders Oud Bruin',
  'Lambic': 'Belgian-Style Lambic',
  'Gueuze': 'Traditional Belgian-Style Gueuze',
  'Fruit Lambic': 'Belgian-Style Fruit Lambic',
  'Kölsch': 'German-Style Koelsch',
  'Altbier': 'German-Style Altbier',
  'Doppelbock': 'German-Style Doppelbock',
  'Eisbock': 'German-Style Eisbock',
  'Dunkles Bock': 'Traditional German-Style Bock',
  'Helles Bock': 'German-Style Heller Bock/Maibock',
  'Munich Helles': 'Munich-Style Helles',
  'Munich Dunkel': 'Munich-Style Dunkel',
  'Schwarzbier': 'German-Style Schwarzbier',
  'Märzen': 'German-Style Maerzen',
  'Festbier': 'German-Style Oktoberfest/Festbier',
  'Rauchbier': 'Bamberg-Style Maerzen Rauchbier', // BJCP has single; BA has 3 Rauchbier subtypes
  'Vienna Lager': 'Vienna-Style Lager',
  'German Leichtbier': 'German-Style Leichtbier',
  'German Helles Exportbier': 'Dortmunder/European-Style Export',
  'German Pils': 'German-Style Pilsener',
  'Baltic Porter': 'Baltic-Style Porter',
  'Czech Pale Lager': 'Czech-Style Pale Lager',
  'Czech Premium Pale Lager': 'Czech-Style Pale Lager', // close; BA has no premium distinction
  'Czech Amber Lager': 'Czech-Style Amber Lager',
  'Czech Dark Lager': 'Czech-Style Dark Lager',
  'American Light Lager': 'American-Style Light Lager',
  'American Lager': 'American-Style Lager',
  'American Pale Ale': 'American-Style Pale Ale',
  'American IPA': 'American-Style India Pale Ale',
  'Double IPA': 'American-Style Imperial or Double India Pale Ale',
  'American Strong Ale': 'American-Style Strong Pale Ale',
  'American Barleywine': 'American-Style Barley Wine Ale',
  'Wheatwine': 'American-Style Wheat Wine Ale',
  'Hazy IPA': 'Juicy or Hazy India Pale Ale',
  'American Amber Ale': 'American-Style Amber/Red Ale',
  'American Brown Ale': 'American-Style Brown Ale',
  'American Porter': 'Smoke Porter', // no — American Porter no direct match
  'American Stout': 'American-Style Stout',
  'Imperial Stout': 'American-Style Imperial Stout',
  'Cream Ale': 'American-Style Cream Ale',
  'California Common': 'California Common Beer',
  'American Wheat Beer': 'American-Style Wheat Beer',
  'Blonde Ale': 'Golden or Blonde Ale',
  'English IPA': 'British-Style India Pale Ale',
  'Ordinary Bitter': 'Ordinary Bitter',
  'Best Bitter': 'Special Bitter or Best Bitter',
  'Strong Bitter': 'Extra Special Bitter',
  'British Brown Ale': 'English-Style Brown Ale',
  'Dark Mild': 'English-Style Dark Mild Ale',
  'English Porter': 'Brown Porter',
  'Sweet Stout': 'Sweet Stout or Cream Stout',
  'Oatmeal Stout': 'Oatmeal Stout',
  'Tropical Stout': 'Export-Style Stout',
  'Foreign Extra Stout': 'Export-Style Stout',
  'Irish Red Ale': 'Irish-Style Red Ale',
  'Irish Stout': 'Classic Irish-Style Dry Stout',
  'Irish Extra Stout': 'Export-Style Stout',
  'Scottish Light': 'Scottish-Style Light Ale',
  'Scottish Heavy': 'Scottish-Style Heavy Ale',
  'Scottish Export': 'Scottish-Style Export Ale',
  'Wee Heavy': 'Scotch Ale or Wee Heavy',
  'English Barley Wine': 'British-Style Barley Wine Ale',
  'British Strong Ale': 'Strong Ale',
  'Old Ale': 'Strong Ale', // BA merges
  'British Golden Ale': 'English-Style Summer Ale',
  'Australian Sparkling Ale': 'Classic Australian-Style Pale Ale',
};

// Correct a bad mapping above (American Porter vs Smoke Porter is wrong — unset)
delete MANUAL_ALIAS['American Porter'];

function findBA(bjName) {
  const aliased = MANUAL_ALIAS[bjName];
  if (aliased) return ba.find(s => s.name === aliased) || null;
  const nk = norm(bjName);
  return ba.find(s => norm(s.name) === nk) || null;
}

const pairs = [];
const bjOnly = [];
const baMatched = new Set();
for (const b of bj) {
  const a = findBA(b.name);
  if (a) { pairs.push({ bj: b, ba: a }); baMatched.add(a.name); }
  else bjOnly.push(b);
}
const baOnly = ba.filter(s => !baMatched.has(s.name));

console.log('=== HIBRIT KARSILASTIRMA ===');
console.log('BA 2026 stil:   ', ba.length);
console.log('BJCP 2021 stil: ', bj.length);
console.log('Eslestirilen:   ', pairs.length);
console.log('Sadece BJCP:    ', bjOnly.length);
console.log('Sadece BA:      ', baOnly.length);

// Function to compute union range from two [a,b] pairs
function union(r1, r2) {
  if (!r1 && !r2) return null;
  if (!r1) return r2;
  if (!r2) return r1;
  return [Math.min(r1[0], r2[0]), Math.max(r1[1], r2[1])];
}

// Build hybrid entries
const hybrid = [];
for (const {bj, ba} of pairs) {
  hybrid.push({
    name: ba.name,                         // BA adı primary
    bjcpName: bj.name,
    bjcpCode: bj.code,
    sources: ['BA2026', 'BJCP2021'],
    og:  union(bj.og,  ba.og),
    fg:  union(bj.fg,  ba.fg),
    ibu: union(bj.ibu, ba.ibu),
    srm: union(bj.srm, ba.srm),
    abv: union(bj.abv, ba.abv),
  });
}
for (const s of bjOnly) {
  hybrid.push({ name: s.name, bjcpName: s.name, bjcpCode: s.code, sources: ['BJCP2021'],
    og: s.og, fg: s.fg, ibu: s.ibu, srm: s.srm, abv: s.abv });
}
for (const s of baOnly) {
  hybrid.push({ name: s.name, sources: ['BA2026'],
    og: s.og, fg: s.fg, ibu: s.ibu, srm: s.srm, abv: s.abv });
}

fs.writeFileSync('C:\\Users\\Kaan\\brewmaster\\HYBRID_styles.json', JSON.stringify(hybrid, null, 2), 'utf8');
console.log('Hibrit toplam:  ', hybrid.length);
console.log('Wrote HYBRID_styles.json');

// Show range diffs for Kaan's focus styles
console.log('\n=== KAAN\'IN ODAK STILLERI — ARALIK FARKLARI ===');
const focus = pairs.filter(p => /weissbier|weizen|dubbel|tripel|witbier|saison|dark strong|blonde|dunkel/i.test(p.bj.name));
for (const p of focus) {
  console.log('\n', p.bj.code, p.bj.name, '→', p.ba.name);
  const fmt = (r) => r ? `${r[0]}-${r[1]}` : 'null';
  console.log('   OG   | BJCP', fmt(p.bj.og),  ' | BA', fmt(p.ba.og),  ' | UNION', fmt(union(p.bj.og, p.ba.og)));
  console.log('   FG   | BJCP', fmt(p.bj.fg),  ' | BA', fmt(p.ba.fg),  ' | UNION', fmt(union(p.bj.fg, p.ba.fg)));
  console.log('   IBU  | BJCP', fmt(p.bj.ibu), ' | BA', fmt(p.ba.ibu), ' | UNION', fmt(union(p.bj.ibu, p.ba.ibu)));
  console.log('   SRM  | BJCP', fmt(p.bj.srm), ' | BA', fmt(p.ba.srm), ' | UNION', fmt(union(p.bj.srm, p.ba.srm)));
  console.log('   ABV  | BJCP', fmt(p.bj.abv), ' | BA', fmt(p.ba.abv), ' | UNION', fmt(union(p.bj.abv, p.ba.abv)));
}

console.log('\n=== SADECE BJCP\'DE OLAN STILLER (BA\'DA YOK) ===');
bjOnly.sort((a,b)=>a.code.localeCompare(b.code))
      .forEach(s => console.log(' ', s.code, '|', s.name, '| OG', s.og, '| ABV', s.abv, '| IBU', s.ibu, '| SRM', s.srm));

console.log('\n=== SADECE BA\'DA OLAN STILLER (BJCP\'DE YOK) — ILK 30 ===');
baOnly.slice(0, 30).forEach(s => console.log(' ', s.name, '| OG', s.og, '| ABV', s.abv, '| IBU', s.ibu, '| SRM', s.srm));
console.log('... toplam BA-only:', baOnly.length);
