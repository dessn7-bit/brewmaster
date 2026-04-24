// Preset reçeteleri yeni motorda koştur — Top-1 / Top-3 raporu (primary ∪ alts kriteri)
// Eski sp() karşılaştırması HTML UI'da, CLI'da sadece yeni motor
const { findBestMatches } = require('./style_engine.js');
const { PRESETS } = require('./_preset_recipes.js');

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const accept = (p) => [p.primary_expected].concat(p.acceptable_alternatives || []);

const results = [];
let top1 = 0, top3 = 0;

console.log('\n' + '═'.repeat(125));
console.log('BREWMASTER PRESET TEST — ' + PRESETS.length + ' REÇETE  |  kriter: top-1 ∈ {primary ∪ alts}');
console.log('═'.repeat(125));

for (const p of PRESETS) {
  const matches = findBestMatches(p.recipe, 5);
  const got1 = matches[0]?.slug || '(yok)';
  const top3Slugs = matches.slice(0, 3).map(m => m.slug);
  const accepted = accept(p);
  const is1 = accepted.includes(got1);
  const is3 = top3Slugs.some(s => accepted.includes(s));
  const isExactPrimary = got1 === p.primary_expected;
  if (is1) top1++;
  if (is3) top3++;
  results.push({
    id: p.id, name: p.name, primary: p.primary_expected, alts: p.acceptable_alternatives || [],
    difficulty: p.difficulty, got1, top3Slugs, is1, is3, isExactPrimary, matches,
  });

  const mark = is1 ? (isExactPrimary ? '✓' : '≈') : (is3 ? '◐' : '✗');
  console.log('\n' + mark + ' [' + p.difficulty + '] ' + p.name);
  console.log('    Primary  : ' + p.primary_expected + (p.acceptable_alternatives?.length ? '  (alt: ' + p.acceptable_alternatives.join(', ') + ')' : ''));
  console.log('    Top-1    : ' + got1 + ' (%' + (matches[0]?.normalized||0) + ', ham=' + (matches[0]?.score||0) + ')' + (matches[0]?._boosted?' [boost:'+matches[0]._boosted+']':''));
  console.log('    Top-3    : ' + matches.slice(0, 3).map(m => m.slug + '(%' + m.normalized + '/' + m.score + ')').join(', '));
  if (!is1 && !is3) {
    console.log('    Top-5    : ' + matches.map(m => m.slug).join(', '));
  }
}

// Tablo
console.log('\n' + '═'.repeat(125));
console.log('TABLO RAPORU  (✓ primary tam eşleşme, ≈ alternatif kabul, ◐ top-3, ✗ miss)');
console.log('═'.repeat(125));
console.log(
  pad('#', 3) + pad('Reçete', 42) + pad('Primary', 30) + pad('Yeni top-1', 30) + pad('T1', 4) + pad('T3', 4) + pad('Zorluk', 8)
);
console.log('─'.repeat(125));
results.forEach((r, i) => {
  const t1mark = r.is1 ? (r.isExactPrimary ? '✓' : '≈') : '✗';
  console.log(
    pad(i + 1, 3) +
    pad(r.name.length > 41 ? r.name.slice(0, 39) + '..' : r.name, 42) +
    pad(r.primary, 30) +
    pad(r.got1, 30) +
    pad(t1mark, 4) +
    pad(r.is3 ? '✓' : '✗', 4) +
    pad(r.difficulty, 8)
  );
});
console.log('─'.repeat(125));
console.log(
  'ÖZET: Top-1 ' + top1 + '/' + PRESETS.length + ' (%' + Math.round(top1/PRESETS.length*100) + '), ' +
  'Top-3 ' + top3 + '/' + PRESETS.length + ' (%' + Math.round(top3/PRESETS.length*100) + ')'
);

// Zorluk breakdown
const byDiff = {};
results.forEach(r => {
  byDiff[r.difficulty] = byDiff[r.difficulty] || { total:0, top1:0, top3:0, exact:0 };
  byDiff[r.difficulty].total++;
  if (r.is1) byDiff[r.difficulty].top1++;
  if (r.is3) byDiff[r.difficulty].top3++;
  if (r.isExactPrimary) byDiff[r.difficulty].exact++;
});
console.log('\nZORLUK BAZINDA:');
['kolay','orta','zor','sınır'].forEach(d => {
  const x = byDiff[d]; if (!x) return;
  console.log('  ' + pad(d,7) + ' Top-1: ' + x.top1 + '/' + x.total + ' (primary tam: ' + x.exact + ')  Top-3: ' + x.top3 + '/' + x.total);
});

// Fails
const fails = results.filter(r => !r.is1);
if (fails.length) {
  console.log('\nTOP-1 BAŞARISIZ (' + fails.length + ' reçete):');
  fails.forEach(f => {
    console.log('  · ' + pad(f.id,22) + ' primary=' + pad(f.primary,30) + ' got=' + f.got1 + (f.is3 ? '  (top-3 OK)' : '  (top-3 miss)'));
  });
}
console.log('═'.repeat(125));
