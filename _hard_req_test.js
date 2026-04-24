// Hard requirement bug testleri
// A) Black IPA: EBC 20 (SRM ~10), IBU 166 → skor 0 OLMALI (SRM & IBU exclusion)
// B) Wheat yeast ile non-wheat style: Weizenbock/Hefeweizen hariç stillerde markerMissing
const { styleMatchScore } = require('./style_engine.js');
const { classifyHierarchical } = require('./style_engine_v2.js');

function test(label, recipe, slug) {
  const r = styleMatchScore(slug, recipe);
  const hR = classifyHierarchical(recipe);
  const ok = r && r.normalized > 0;
  console.log('\n● ' + label);
  console.log('  ' + slug + ': normalized=' + (r?.normalized ?? '-') + ' score=' + (r?.score ?? '-'));
  if (r?.exclusions?.length) console.log('    exclusions: ' + r.exclusions.join(' | '));
  if (r?.breakdown?.length && r.normalized > 0) console.log('    breakdown: ' + r.breakdown.slice(0,6).join(', '));
  console.log('  Hiyerarsik: ' + hR.ferm_type + '/' + hR.family + ' → top1=' + (hR.top3[0]?.slug || '-'));
}

// ══ A) BLACK IPA: SRM 10, IBU 166 — SRM exclusion<17 ve IBU exclusion2>115 ══
test('A1 — Black IPA SRM 10 IBU 166 (beklenen: skor=0, iki exclusion)',
  { _og:1.072, _fg:1.012, _abv:7.5, _ibu:166, _srm:10, _mayaTip:'ale', mayaId:'us05', _yeast_raw:'Safale US-05',
    hopIds:['citra','mosaic'], maltIds:['2_row','chocolate_malt'], katkiIds:[],
    percents:{baseMaltPct:90,chocPct:10} },
  'black_ipa');

// ══ B) BLACK IPA: SRM 35, IBU 60 (normal beklenen score) ══
test('A2 — Black IPA SRM 35 IBU 60 (beklenen: normal skor)',
  { _og:1.072, _fg:1.012, _abv:7.5, _ibu:60, _srm:35, _mayaTip:'ale', mayaId:'us05', _yeast_raw:'Safale US-05',
    hopIds:['citra','mosaic','columbus'], maltIds:['2_row','carafa_iii','chocolate_malt'], katkiIds:[],
    percents:{baseMaltPct:80,chocPct:15,roastPct:5} },
  'black_ipa');

// ══ C) WHEAT yeast + HEFEWEIZEN (beklenen: yuksek skor) ══
test('B1 — WY3068 + Hefeweizen (beklenen: dogru match)',
  { _og:1.050, _fg:1.010, _abv:5.3, _ibu:14, _srm:4, _mayaTip:'wheat', mayaId:'wy3068', _yeast_raw:'Wyeast 3068 Weihenstephan Weizen',
    hopIds:['hallertau'], maltIds:['pilsner','wheat_malt'], katkiIds:[],
    percents:{pilsnerPct:50,wheatPct:50} },
  'south_german_hefeweizen');

// ══ D) WHEAT yeast + AMERICAN IPA (beklenen: skor=0 veya cok dusuk — wheat yeast markerMissing) ══
test('B2 — WY3068 + American IPA (beklenen: wheat markerMissing varsa skor 0/dusuk)',
  { _og:1.060, _fg:1.012, _abv:6.2, _ibu:60, _srm:8, _mayaTip:'wheat', mayaId:'wy3068', _yeast_raw:'Wyeast 3068 Weihenstephan Weizen',
    hopIds:['citra','mosaic'], maltIds:['2_row'], katkiIds:[],
    percents:{baseMaltPct:100} },
  'american_india_pale_ale');

// ══ E) WHEAT yeast + AMERICAN PALE ALE (ayni test) ══
test('B3 — WY3068 + APA',
  { _og:1.050, _fg:1.010, _abv:5.0, _ibu:40, _srm:9, _mayaTip:'wheat', mayaId:'wy3068', _yeast_raw:'Wyeast 3068',
    hopIds:['cascade','centennial'], maltIds:['2_row','crystal_40'], katkiIds:[],
    percents:{baseMaltPct:90,crystalPct:10} },
  'american_pale_ale');

// ══ F) WHEAT yeast + Weizenbock (beklenen: normal skor) ══
test('B4 — WY3068 + Weizenbock',
  { _og:1.080, _fg:1.018, _abv:8.5, _ibu:18, _srm:14, _mayaTip:'wheat', mayaId:'wy3068', _yeast_raw:'Wyeast 3068',
    hopIds:['hallertau'], maltIds:['pilsner','wheat_malt','munich'], katkiIds:[],
    percents:{pilsnerPct:30,wheatPct:50,munichPct:20} },
  'south_german_weizenbock');
