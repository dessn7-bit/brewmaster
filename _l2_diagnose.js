// L2 miss detayı — her aile sızıntısı için recipe özellikleri
const { RAW_RECIPES } = require('./_gt_recipes_raw.js');
const { convertRawToEngineRecipe } = require('./_gt_convert.js');
const { classifyHierarchical, HIER, scoreFamily, FAMILY_SIGNATURES } = require('./style_engine_v2.js');

const misses = [];
for (const raw of RAW_RECIPES) {
  const recipe = convertRawToEngineRecipe(raw);
  const hR = classifyHierarchical(recipe);
  const exp = HIER.styles[raw.expected_slug];
  if (!exp) continue;
  if (hR.ferm_type !== exp.ferm_type) continue;   // L1 miss farklı problem
  if (hR.family === exp.family) continue;          // L2 ok
  misses.push({
    name: raw.data.name,
    exp_fam: exp.family, got_fam: hR.family,
    _yeast_raw: (recipe._yeast_raw || '').slice(0, 60),
    hops: (recipe.hopIds || []).slice(0,5).join(','),
    malts: (recipe.maltIds || []).slice(0,5).join(',').slice(0, 60),
    katki: (recipe.katkiIds || []).join(','),
    wheat_pct: recipe.percents?.wheatPct || 0,
    abv: recipe._abv,
    ibu: recipe._ibu,
    // Skor dump
    exp_score: scoreFamily(recipe, exp.family),
    got_score: scoreFamily(recipe, hR.family),
  });
}

// Grup by confusion pair
const byPair = {};
misses.forEach(m => {
  const k = m.exp_fam + ' → ' + m.got_fam;
  (byPair[k] = byPair[k] || []).push(m);
});

console.log('\n═══ L2 miss diagnosis ═══\n');
const sorted = Object.entries(byPair).sort((a,b)=>b[1].length-a[1].length);
for (const [pair, items] of sorted) {
  console.log('\n── ' + pair + ' (' + items.length + 'x) ──');
  items.slice(0, 5).forEach(m => {
    console.log('  · ' + m.name.slice(0,35).padEnd(35) +
      ' yeast="' + m._yeast_raw + '"');
    console.log('      hops=[' + m.hops + ']  malts=[' + m.malts + ']');
    console.log('      katki=[' + m.katki + ']  wheat=' + m.wheat_pct + '%  abv=' + m.abv + ' ibu=' + m.ibu);
    console.log('      EXP ' + m.exp_fam + ' score=' + m.exp_score.score + ' hits=' + JSON.stringify(m.exp_score.hits));
    console.log('      GOT ' + m.got_fam + ' score=' + m.got_score.score + ' hits=' + JSON.stringify(m.got_score.hits));
  });
}
