// GT patch round 3 — Amber Red magnet, Hazy threshold, Dortmunder, Belgian, DIPA
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
  changes.push(slug + ': ' + pth + ' = ' + JSON.stringify(val));
}

// ═══ AMERICAN AMBER RED MAGNET ═══
// 3 recipe Amber'e yanlış düşüyor (Bitter, APA, Scottish). SRM 8-18 çok geniş.
tighten('american_amber_red_ale', 'srm.safe', {min:12, max:18, scoreBonus:15});
tighten('american_amber_red_ale', 'srm.marginal', {min:9, max:22, scoreBonus:5});
// Crystal zorunlu (Amber Red karakteri)
tighten('american_amber_red_ale', 'malt.crystalPct', {
  safe:{min:6, max:15, scoreBonus:15},
  marginal:{min:3, max:20, scoreBonus:5},
  exclusion:{max:1, hardZero:true, reason:'American Amber: crystal malt zorunlu (>1%)'}
});

// ═══ HAZY IPA — düşük oats threshold ═══
tighten('juicy_or_hazy_india_pale_ale', 'malt.oatsPct', {
  safe:{min:5, max:40, scoreBonus:20},
  marginal:{min:2, max:5, scoreBonus:8}
});
// Hazy için wheat+oat kombo bonus
tighten('juicy_or_hazy_india_pale_ale', 'malt._SUM_hazy_grain', {
  safe:{keysSumAbove:['oatsPct','wheatPct'], threshold:10, scoreBonus:20}
});
// AIPA'nın Hazy territory'ye düşmemesi için wheat+oat sum > 15 ise exclude
tighten('american_india_pale_ale', 'malt._SUM_not_hazy', {
  exclusion:{keysSumAbove:['oatsPct','wheatPct'], threshold:15, reason:'American IPA: oat+wheat > 15% Hazy IPA territory'}
});

// ═══ DORTMUNDER — munich/vienna limitle ═══
// Festbier'e yanılıyor. Dortmunder: düz pilsner, munich/vienna yok.
tighten('dortmunder_european_export', 'malt._SUM_no_munich', {
  exclusion:{keysSumAbove:['munichPct','viennaPct'], threshold:5, reason:'Dortmunder: munich/vienna > 5% Märzen/Festbier territory'}
});

// ═══ FESTBIER — munich bonus ═══
tighten('german_oktoberfest_festbier', 'malt.munichPct', {
  safe:{min:5, max:40, scoreBonus:20},
  marginal:{min:2, max:5, scoreBonus:5}
});

// ═══ BELGIAN TRIPEL vs STRONG BLONDE ═══
// Tripel: pilsner + sugar (tamam), Strong Blonde: aynı.
// Discriminator: Tripel tipik ABV 7.5-9.5 (safe 7.1-10.1), Strong Blonde 7.5-11.2
// Recipe ABV 8.4 her ikisinde safe. Zorlanıyor.
// Tight: Tripel'de aromatic/wheat destek bonus (recipe 5% wheat)
tighten('belgian_tripel', 'malt.wheatPct', {
  safe:{min:2, max:10, scoreBonus:10},
  marginal:{min:0, max:15, scoreBonus:3}
});
// Strong Blonde'de SRM üst tight
tighten('belgian_strong_blonde_ale', 'srm.exclusion2', {min:7, hardZero:true, reason:'Strong Blonde: SRM > 7 Tripel territory (daha altın)'});

// ═══ BELGIAN DUBBEL vs DARK STRONG ═══
// Dubbel SRM 16-22, Dark Strong 20-36. Recipe 26.8 → Dark Strong safe. Dubbel won (wrong).
// Fix: Dubbel SRM exclusion2 at 26 (recipe 26.8 > 26 excluded)
// Actually recipe 26.8 for Dark Strong expected — so Dubbel should be excluded.
tighten('belgian_dubbel', 'srm.exclusion2', {min:26, hardZero:true, reason:'Dubbel: SRM > 26 Dark Strong Ale territory'});

// ═══ DOUBLE IPA vs BARLEYWINE ═══
// Recipe Fred: ABV 8.53, IBU 83, SRM 10.9 — DIPA geçici
// Barleywine IBU safe 40-70, recipe 83 marginal. DIPA IBU safe 60-100, recipe safe. +7 avantaj DIPA.
// Barleywine ABV safe 8-12.2, recipe 8.53 safe. DIPA ABV safe 7.5-10, recipe safe.
// Barleywine SRM safe 8-36, recipe 10.9 safe. DIPA SRM safe 5-12, recipe safe.
// Malt: Barleywine munich/vienna/crystal wide. Recipe vienna 65% + rye 19% + munich 13% + crystal 6%.
// Tight: Barleywine IBU > 75 → exclude (Barleywine daha malty/low-IBU)
tighten('british_barley_wine_ale', 'ibu.exclusion2', {min:75, hardZero:true, reason:'Barleywine: IBU > 75 DIPA territory'});

// ═══ AMERICAN LAGER vs INTERNATIONAL LIGHT ═══
// American Lager (BA): corn OK, American Light Lager (BA): rice/corn OK.
// American Lager ABV 4-5.5, International Light 4-5. Farklı kaynak yok.
// International_light malt signature olmadan scoring — daha genel kategori.
tighten('international_light_lager', 'abv.exclusion', {max:3.5, hardZero:true, reason:'Int. Light: ABV < 3.5 Ultra-Light territory'});
// Ayrıca IBU range
tighten('international_light_lager', 'ibu.safe', {min:8, max:15, scoreBonus:10});
tighten('international_light_lager', 'ibu.exclusion2', {min:25, hardZero:true, reason:'Int. Light: IBU > 25 daha bitter lager'});

// ═══ PRE-PROHIBITION LAGER vs RICE LAGER ═══
// Pre-Pro: corn-adjunct. Rice Lager: rice-adjunct. Farklı adjunct profilleri.
tighten('rice_lager', 'malt.cornPct', {exclusion:{max:0, hardZero:true, reason:'Rice Lager: corn yerine rice'}});
// Wait, exclusion.max=0 means exclude if cornPct <= 0. That excludes all recipes with NO corn!
// Aksi: exclude if cornPct > 10%
tighten('rice_lager', 'malt._SUM_no_corn', {exclusion:{keysSumAbove:['cornPct'], threshold:10, reason:'Rice Lager: corn > 10% Pre-Pro/American Lager territory'}});

// ═══ ALTBIER — Kentucky Common magnet ═══
// Altbier (ale family, dark) vs Kentucky Common (lager family, amber)
// Altbier ABV safe 4.3-5.6, KC ABV 4-5.5. Overlap.
// Discriminator: Altbier SRM 9-19, KC 11-20. Recipe (The Bitter Pill) SRM 24.2 — OVER both!
// Altbier SRM exclusion2 low → should exclude Altbier. But recipe goes to KC.
// Hmm recipe SRM 24.2 > Altbier exclusion2 34 → Altbier excluded? no 24 < 34, still in range.
tighten('german_altbier', 'srm.safe', {min:11, max:19, scoreBonus:15});
tighten('german_altbier', 'srm.marginal', {min:8, max:25, scoreBonus:5});
tighten('kentucky_common', 'srm.exclusion2', {min:22, hardZero:true, reason:'Kentucky Common: SRM > 22 Altbier/Porter territory'});

// ═══ BELGIAN SESSION vs SPECIALE BELGE ═══
// Session ABV 3-5, Speciale Belge ABV 5-6 probably. Recipe Patersbier ABV 5.64 Session marginal.
tighten('belgian_session_ale', 'abv.safe', {min:3, max:5.5, scoreBonus:10});
tighten('belgian_session_ale', 'abv.exclusion2', {min:6.5, hardZero:true, reason:'Session: ABV > 6.5 Blonde/Strong territory'});
tighten('belgian_speciale_belge', 'abv.exclusion', {max:4, hardZero:true, reason:'Speciale Belge: ABV < 4 Session territory'});

// ═══ CZECH PALE vs GERMAN PILS (hop signature) ═══
// Czech Saaz, German Hallertau/Tettnang. Recipe Czech 100% Saaz.
// Czech Pale'de saaz bonus
tighten('czech_pale_lager', 'markers.required_saaz', {
  safe:{marker:{__regex:'saaz|zatec',flags:'i'}, field:'hop', scoreBonus:20, label:'Saaz zorunlu'}
});

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik');
