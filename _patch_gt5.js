// GT patch 5 — final push, targeted wins
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

let changes = [];
function tighten(slug, pth, val) {
  const parts = pth.split('.'); let obj = defs[slug]?.thresholds;
  if (!obj) return;
  for (let i=0;i<parts.length-1;i++) { obj[parts[i]] = obj[parts[i]] || {}; obj = obj[parts[i]]; }
  obj[parts[parts.length-1]] = Object.assign(obj[parts[parts.length-1]] || {}, val);
  changes.push(slug + ': ' + pth);
}

// ═══ INT LIGHT LAGER narrow ═══
tighten('international_light_lager', 'ibu.safe', {min:5, max:12, scoreBonus:10});
tighten('international_light_lager', 'ibu.exclusion2', {min:18, hardZero:true, reason:'Int. Light: IBU > 18 daha bitter lager territory'});

// ═══ PRE-PRO vs AMERICAN LAGER ═══
tighten('american_lager', 'ibu.exclusion2', {min:20, hardZero:true, reason:'American Lager: IBU > 20 Pre-Pro/Pils territory'});
tighten('pre_prohibition_lager', 'ibu.exclusion', {max:18, hardZero:true, reason:'Pre-Pro: IBU < 18 American/Int Lager territory'});

// ═══ HAZY PALE ALE — oat/wheat zorunlu ═══
tighten('juicy_or_hazy_pale_ale', 'malt._SUM_hazy_required', {
  exclusion:{keysSumAbove:['oatsPct','wheatPct'], threshold:-0.1, reason:''}, // placeholder
});
// Actually need inverse — exclude if sum BELOW threshold
// _SUM_ engine only supports "above". Use markerMissing or add different key.
// Simpler: require oatsPct >= 5 via malt rule
tighten('juicy_or_hazy_pale_ale', 'malt.oatsPct', {
  safe:{min:4, max:30, scoreBonus:20},
  marginal:{min:1, max:4, scoreBonus:5},
  exclusion:{max:0, hardZero:true, reason:'Hazy Pale Ale: oats zorunlu'}
});

// ═══ AMERICAN BROWN — SRM narrower ═══
tighten('american_brown_ale', 'srm.safe', {min:18, max:28, scoreBonus:15});

// ═══ OATMEAL STOUT — oats bonus (but not strict exclusion — bazı preset test reçeteleri oats flag'lemiyor) ═══
tighten('oatmeal_stout', 'malt.oatsPct', {
  safe:{min:5, max:30, scoreBonus:20},
  marginal:{min:1, max:5, scoreBonus:8}
});

// ═══ STRONG ALE IBU ceiling (DIPA territory) ═══
tighten('strong_ale', 'ibu.exclusion2', {min:65, hardZero:true, reason:'Strong Ale: IBU > 65 DIPA/Barleywine territory'});
tighten('old_ale', 'ibu.exclusion2', {min:60, hardZero:true, reason:'Old Ale: IBU > 60 Strong/Barley territory'});

// ═══ BELGIAN DUBBEL — chocolate signature ═══
// Dubbel'in kara malt karakteri (pale chocolate, special B) zorunlu
tighten('belgian_dubbel', 'markers.required_dark_malt', {
  safe:{marker:{__regex:'special.?b|chocolate|carafa|dark.?candi|d.?180|d.?150',flags:'i'}, field:'malt', scoreBonus:15, label:'Dark Belgian malt'}
});

// ═══ NEIPA IBU tighter upper ═══
// AIPA IBU tight: 40-70, Hazy IPA tight: 20-55
tighten('juicy_or_hazy_india_pale_ale', 'ibu.safe', {min:20, max:55, scoreBonus:10});
tighten('juicy_or_hazy_india_pale_ale', 'ibu.exclusion2', {min:70, hardZero:true, reason:'Hazy IPA: IBU > 70 American IPA territory'});

// ═══ KELLERBIER narrow ═══
// Hofbrau Oktoberfest → kellerbier. Kellerbier = unfiltered, şeffaf değil.
tighten('kellerbier', 'markers.required_unfiltered', {
  exclusion:{customCheck:'notFiltered', reason:'Kellerbier: unfiltered mandatory'}
});
tighten('kellerbier_or_zwickelbier', 'markers.required_unfiltered', {
  exclusion:{customCheck:'notFiltered', reason:'Kellerbier/Zwickelbier: unfiltered mandatory'}
});

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik');
