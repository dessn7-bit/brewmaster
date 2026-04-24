const { findBestMatches, styleMatchScore, matchSubstyles } = require('./style_engine.js');

const TEST_RECIPES = [
  {
    name: 'Muzo Hefeweizen (Kaan\'in kendi recetesi)',
    expected: 'south_german_hefeweizen',
    recipe: {
      _og: 1.050, _fg: 1.012, _ibu: 14, _srm: 5, _abv: 5.0,
      _mayaTip: 'wheat',
      percents: { wheatPct: 54.5, pilsnerPct: 45, baseMaltPct: 45, oatsWheatPct: 54.5 },
      mayaId: 'wb06', hopIds: ['hallertau','tettnang'], katkiIds: [], maltIds: ['wheat','pilsner']
    }
  },
  {
    name: 'Classic Belgian Dubbel',
    expected: 'belgian_dubbel',
    recipe: {
      _og: 1.068, _fg: 1.014, _ibu: 22, _srm: 18, _abv: 7.0,
      _mayaTip: 'belcika',
      percents: { pilsnerPct: 65, munichPct: 20, aromaticAbbeyMunichPct: 20, aromaticMunichPct: 20, sugarPct: 12, crystalPct: 3, chocPct: 0, roastedPct: 0, baseMaltPct: 65 },
      mayaId: 'wlp530', hopIds: ['styrian','goldings'], katkiIds: ['candy_drk'], maltIds: ['pilsner','munich','aromatic','candy_drk']
    }
  },
  {
    name: 'Classic NEIPA (Citra/Mosaic/Galaxy)',
    expected: 'juicy_or_hazy_india_pale_ale',
    recipe: {
      _og: 1.065, _fg: 1.012, _ibu: 45, _srm: 5, _abv: 7.0,
      _mayaTip: 'ale',
      percents: { baseMaltPct: 75, oatsPct: 15, wheatPct: 10, oatsWheatPct: 25, crystalPct: 0 },
      mayaId: 'wy1318', hopIds: ['citra','mosaic','galaxy'], katkiIds: [], maltIds: ['pale_ale','oat','wheat']
    }
  },
  {
    name: 'Classic American Pale Ale',
    expected: 'american_pale_ale',
    recipe: {
      _og: 1.052, _fg: 1.012, _ibu: 40, _srm: 8, _abv: 5.2,
      _mayaTip: 'ale',
      percents: { baseMaltPct: 90, crystalPct: 8, wheatPct: 0, roastedPct: 0, chocPct: 0 },
      mayaId: 'us05', hopIds: ['cascade','centennial'], katkiIds: [], maltIds: ['pale','crystal']
    }
  },
  {
    name: 'German Pilsener',
    expected: 'german_pilsener',
    recipe: {
      _og: 1.048, _fg: 1.010, _ibu: 35, _srm: 3.5, _abv: 5.0,
      _mayaTip: 'lager',
      percents: { pilsnerPct: 95, crystalPct: 0, roastedPct: 0, chocPct: 0 },
      mayaId: 'w3470', hopIds: ['saaz','hallertau'], katkiIds: [], maltIds: ['pilsner']
    }
  },
];

console.log('═'.repeat(80));
console.log('FAZ 2a — 5 REFERANS REÇETE TESTI');
console.log('═'.repeat(80));

let passes = 0;
for (const test of TEST_RECIPES) {
  console.log('\n▼ ' + test.name);
  console.log('  Beklenen: ' + test.expected);
  const matches = findBestMatches(test.recipe, 5);
  if (matches.length === 0) {
    console.log('  SONUÇ: Hiçbir stil puan almadı');
    continue;
  }
  const topSlug = matches[0].slug;
  const ok = topSlug === test.expected ? '✓' : '✗';
  if (topSlug === test.expected) passes++;
  console.log('  Kazanan: ' + ok + ' ' + matches[0].displayTR + ' (slug=' + topSlug + ', %' + matches[0].normalized + ', ' + matches[0].score + '/' + matches[0].max + ')');
  console.log('  Top 5 alternatif:');
  matches.forEach((m,i) => {
    console.log('    ' + (i+1) + '. %' + String(m.normalized).padStart(3) + ' | ' + m.displayTR.padEnd(35) + ' | ' + m.slug);
  });
  console.log('  Kazanan detay:');
  matches[0].breakdown.forEach(b => console.log('    - ' + b));

  // Expected stil skoru nedir?
  if (topSlug !== test.expected) {
    const expR = styleMatchScore(test.expected, test.recipe);
    console.log('  Beklenen stilin durumu:');
    if (expR.exclusions?.length) {
      console.log('    ELENDI (exclusion):');
      expR.exclusions.forEach(e => console.log('      · ' + e));
    } else {
      console.log('    Skor: %' + expR.normalized + ' (' + expR.score + '/' + expR.max + ')');
      console.log('    Alt skorlar:');
      expR.breakdown.forEach(b => console.log('      · ' + b));
    }
  }
}

console.log('\n' + '═'.repeat(80));
console.log('SONUÇ: ' + passes + '/' + TEST_RECIPES.length + ' test geçti');
console.log('═'.repeat(80));
