// GT benchmark patch round 2 — Scalar tightening (magnet fixes)
// Hedef: Märzen, Dubbel, Dark Strong, Czech Dark vs. loose safe zone'larını sıkılaştır
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

let changes = [];

function tighten(slug, path, newVal, reason) {
  const parts = path.split('.');
  let obj = defs[slug]?.thresholds;
  if (!obj) return;
  for (let i=0; i<parts.length-1; i++) {
    obj = obj[parts[i]];
    if (!obj) return;
  }
  const lastKey = parts[parts.length-1];
  Object.assign(obj[lastKey] = obj[lastKey] || {}, newVal);
  changes.push(slug + ': ' + path + ' → ' + JSON.stringify(newVal) + (reason?' ('+reason+')':''));
}

// ═══ LAGER AMBER FAMILY — Märzen/Vienna/Czech Amber ayrıştırma ═══
// Märzen SRM 4-17 çok geniş (4=pils, 17=dunkel)
tighten('german_maerzen', 'srm.safe', {min:7, max:14, scoreBonus:15}, 'narrow: classic Märzen');
tighten('german_maerzen', 'srm.marginal', {min:5, max:18, scoreBonus:5});
tighten('german_maerzen', 'srm.exclusion2', {min:22, hardZero:true, reason:'Märzen: SRM çok koyu (Dunkel territory)'});

tighten('vienna_lager', 'srm.safe', {min:8, max:14, scoreBonus:15});
tighten('vienna_lager', 'srm.exclusion2', {min:20, hardZero:true, reason:'Vienna: SRM çok koyu'});

tighten('czech_amber_lager', 'srm.safe', {min:10, max:16, scoreBonus:15});

// Festbier — Märzen'in açık hali (safe srm 4-7)
tighten('german_oktoberfest_festbier', 'srm.safe', {min:4, max:8, scoreBonus:15});
tighten('german_oktoberfest_festbier', 'srm.exclusion2', {min:12, hardZero:true, reason:'Festbier: SRM çok koyu'});

// ═══ LAGER DARK — Dunkel/Schwarz/Czech Dark ayrıştırma ═══
tighten('munich_dunkel', 'srm.safe', {min:17, max:24, scoreBonus:15});
tighten('munich_dunkel', 'srm.exclusion2', {min:30, hardZero:true, reason:'Munich Dunkel: SRM çok koyu (Schwarz/Porter territory)'});

tighten('czech_dark_lager', 'srm.safe', {min:17, max:25, scoreBonus:15});
tighten('czech_dark_lager', 'srm.marginal', {min:14, max:30, scoreBonus:5});
tighten('czech_dark_lager', 'srm.exclusion2', {min:35, hardZero:true, reason:'Czech Dark: SRM çok koyu'});

tighten('german_schwarzbier', 'srm.safe', {min:25, max:35, scoreBonus:15});
tighten('german_schwarzbier', 'srm.marginal', {min:20, max:40, scoreBonus:5});

// ═══ BELGIAN STRONG FAMILY — tie-break iyileştirme ═══
// Dubbel SRM 10-36 çok geniş, Dark Strong 8-40 de öyle
tighten('belgian_dubbel', 'srm.safe', {min:16, max:22, scoreBonus:15});
tighten('belgian_dubbel', 'srm.marginal', {min:12, max:28, scoreBonus:5});
tighten('belgian_dubbel', 'srm.exclusion2', {min:35, hardZero:true, reason:'Dubbel: SRM çok koyu (Dark Strong territory)'});

tighten('belgian_strong_dark_ale', 'srm.safe', {min:20, max:36, scoreBonus:15});
tighten('belgian_strong_dark_ale', 'srm.marginal', {min:16, max:45, scoreBonus:5});
tighten('belgian_strong_dark_ale', 'srm.exclusion', {max:10, hardZero:true, reason:'Belgian Strong Dark: SRM çok açık (Tripel/Strong Blonde territory)'});

// Tripel (düşüş: SRM 4-9 idi, gerçek 4-7)
tighten('belgian_tripel', 'srm.safe', {min:4.5, max:7, scoreBonus:15});
tighten('belgian_tripel', 'srm.marginal', {min:3, max:9, scoreBonus:5});
// Strong Blonde (düşüş: 2-7 → 3-6)
tighten('belgian_strong_blonde_ale', 'srm.safe', {min:3, max:6, scoreBonus:15});
tighten('belgian_strong_blonde_ale', 'srm.marginal', {min:2, max:8, scoreBonus:5});

// ═══ BELGIAN SESSION vs TABLE BEER ABV ayrıştırma ═══
// Table beer <3%, Session 3-5%
tighten('belgian_table_beer', 'abv.exclusion2', {min:5, hardZero:true, reason:'Table Beer: ABV ≥ 5 (Session territory)'});
tighten('belgian_session_ale', 'abv.safe', {min:3, max:5, scoreBonus:10});
tighten('belgian_session_ale', 'abv.exclusion', {max:2, hardZero:true, reason:'Session Ale: ABV < 2 (Table Beer)'});

// ═══ IPA SIKIŞMA ═══
// Hazy IPA: oat+wheat kombosu için malt bonus zaten var (patch A). IBU farkı: Hazy 25-50 vs AIPA 40-70
// AIPA: recipe IBU < 40 ise exclude (çok az bitter)
tighten('american_india_pale_ale', 'ibu.exclusion', {max:35, hardZero:true, reason:'American IPA: IBU < 35 (Hazy veya Pale Ale territory)'});

// WCI ABV tight: 6-7.5 (recipe ABV 7.22 safe)
tighten('west_coast_india_pale_ale', 'srm.exclusion2', {min:8, hardZero:true, reason:'West Coast IPA: SRM çok koyu (dry/light expected)'});

// Double IPA vs Barleywine: ABV overlap
// Barleywine tipik 8-12 ABV ama IBU 60-100. DIPA 7.5-10 ABV, IBU 60-100
// Discriminator: SRM (Barleywine 10-19 amber, DIPA 6-14 gold)
tighten('british_barley_wine_ale', 'ibu.safe', {min:40, max:70, scoreBonus:10});
tighten('british_barley_wine_ale', 'ibu.exclusion2', {min:85, hardZero:true, reason:'British Barleywine: IBU çok yüksek (DIPA territory)'});
tighten('double_ipa', 'ibu.safe', {min:60, max:100, scoreBonus:10});
tighten('double_ipa', 'srm.safe', {min:5, max:12, scoreBonus:15});
tighten('double_ipa', 'srm.exclusion2', {min:18, hardZero:true, reason:'Double IPA: SRM çok koyu'});

// ═══ AMERICAN BROWN — stout territory koruması ═══
tighten('american_brown_ale', 'srm.exclusion2', {min:35, hardZero:true, reason:'American Brown: SRM çok koyu (Stout territory)'});
tighten('english_brown_ale', 'srm.exclusion2', {min:35, hardZero:true, reason:'English Brown: SRM çok koyu'});

// ═══ CZECH PALE vs GERMAN PILS ═══
// Czech Pale IBU 25-42, German Pils 25-40. Overlap.
// Signature diff: Saaz (Czech) vs Hallertau/Tettnang (German)
// Bu marker düzeyinde. Şimdilik IBU marginal'i kısalt.
tighten('czech_pale_lager', 'ibu.safe', {min:30, max:45, scoreBonus:10});
tighten('german_pilsener', 'ibu.safe', {min:25, max:38, scoreBonus:10});

// ═══ RAUCHBIER — smoke markerı yoksa exclusion ═══
// Rauchbier kategorisi (bamberg_*) smoke hard-req
['bamberg_maerzen_rauchbier','bamberg_helles_rauchbier','bamberg_bock_rauchbier','bamberg_weiss_rauchbier'].forEach(slug => {
  const def = defs[slug];
  if (!def) return;
  def.thresholds = def.thresholds || {};
  def.thresholds.markers = def.thresholds.markers || {};
  def.thresholds.markers.required_smoke = {
    safe: { marker:{__regex:'rauch|smoke|smoked|tütsü|tutsu|cherry.?wood|beech.?wood',flags:'i'}, field:'malt', scoreBonus:20, label:'Tütsülü malt zorunlu'},
    exclusion: { markerMissing:{__regex:'rauch|smoke|smoked|tütsü|tutsu|cherry.?wood|beech.?wood',flags:'i'}, field:'malt', reason: (def.displayTR||slug)+': tütsülü malt zorunlu' }
  };
  changes.push(slug + ': smoke required marker');
});

// Contra: Märzen smoke içerirse rauchbier olmalı
tighten('german_maerzen', 'malt._SUM_no_smoke', {exclusion:{keysSumAbove:['smokedPct'],threshold:10,reason:'Märzen: smoke > 10% Rauchbier territory'}});
tighten('german_pilsener', 'malt._SUM_no_smoke', {exclusion:{keysSumAbove:['smokedPct'],threshold:5,reason:'Pilsener: smoke > 5% Rauchbier territory'}});

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik.');
