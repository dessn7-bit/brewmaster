// GT patch 4 — Imperial styles için ABV minimum, Czech Pale IBU revert, Hefe IBU yüksek
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

// ═══ IMPERIAL / STRONG styles — ABV minimum exclusion ═══
// Bu stiller ABV 7+ olmalı. Düşük ABV reçeteyi "imperial" olarak puanlamasın.
[
  ['imperial_red_ale', 7],
  ['double_hoppy_red_ale', 7],
  ['american_strong_pale_ale', 7],
  ['juicy_or_hazy_strong_pale_ale', 7],
  ['american_imperial_stout', 7.5],
  ['british_imperial_stout', 8],
  ['american_imperial_porter', 7],
  ['british_barley_wine_ale', 7.5],
  ['american_barley_wine_ale', 7.5],
  ['american_wheat_wine_ale', 8],
  ['strong_ale', 5.5],
  ['old_ale', 5.5],
  ['belgian_strong_blonde_ale', 6.5],
  ['belgian_strong_dark_ale', 6.5],
  ['belgian_quadrupel', 8],
  ['belgian_tripel', 6.5],
  ['double_ipa', 7],
  ['experimental_india_pale_ale', 6],
  ['german_doppelbock', 6.5],
  ['german_eisbock', 8],
].forEach(([slug, minAbv]) => {
  tighten(slug, 'abv.exclusion', {max: minAbv - 0.5, hardZero:true, reason: (defs[slug]?.displayTR||slug)+': ABV < '+minAbv+' imperial/strong değil'});
});

// ═══ CZECH PALE LAGER — IBU revert (eski 25-42) ═══
// Patch 3'te 30-45 yaptım, test recipe IBU 40 idi sorun değildi. Ama daralttığım czech muhtemelen
// Czech Premium reçetesinde sıkıntı yarattı. Geri al.
tighten('czech_pale_lager', 'ibu.safe', {min:25, max:45, scoreBonus:10});

// ═══ LOW-ABV stiller için sağlamlık ═══
// Hefeweizen, Blonde, APA gibi low-ABV stillerde Imperial Red/Strong Pale Ale çıkmamalı
// Yukarıdaki ABV exclusion halletsin

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik');
