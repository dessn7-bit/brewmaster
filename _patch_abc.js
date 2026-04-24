// Patch A/B/C — Faz 2c feedback round
// A) NEIPA sinyatür güçlendirme: oat+wheat+low-ibu-high-abv favor juicy_hazy
// B) Baltic Porter signature fix: roastedPct→roastPct + chocPct bonus
// C) Milk Stout lactose hard requirement
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

let changes = [];

// ════════════════════ A) NEIPA / AIPA ayrisma ════════════════════
// AIPA: oats > 12% ise exclusion (NEIPA territory, AIPA olamaz)
{
  const t = defs.american_india_pale_ale.thresholds;
  t.malt = t.malt || {};
  t.malt._SUM_oats_neipa_territory = {
    exclusion: {
      keysSumAbove: ['oatsPct'],
      threshold: 12,
      reason: 'American IPA: oats > 12% NEIPA territory — Juicy/Hazy IPA daha uygun',
    },
  };
  changes.push('AIPA: oats > 12% exclusion eklendi');
}

// NEIPA: oats bonus (>= 8%) + modern aroma hop bonus
{
  const t = defs.juicy_or_hazy_india_pale_ale.thresholds;
  t.malt = t.malt || {};
  t.malt.oatsPct = {
    safe:     { min: 8, max: 40, scoreBonus: 20 },
    marginal: { min: 3, max: 8,  scoreBonus: 8  },
  };
  t.markers = t.markers || {};
  t.markers.modern_hop_bonus = {
    safe: {
      marker: { __regex: 'citra|mosaic|galaxy|nelson|simcoe|el_dorado|strata|nectaron|sabro|riwaka|motueka|vic_secret|azacca|idaho_7|talus|amarillo', flags:'i' },
      field: 'hop',
      scoreBonus: 15,
      label: 'Modern NEIPA hop',
    },
  };
  changes.push('NEIPA: oatsPct safe bonus + modern hop marker eklendi');
}

// ════════════════════ B) Baltic Porter signature fix ════════════════════
// roastedPct key'i adapter'da "roastPct". Rename edip chocPct bonus ekle.
{
  const t = defs.baltic_porter.thresholds;
  if (t.malt && t.malt.roastedPct) {
    t.malt.roastPct = t.malt.roastedPct;
    delete t.malt.roastedPct;
    changes.push('Baltic Porter: malt.roastedPct → malt.roastPct (schema fix)');
  }
  // Chocolate malt ortak Baltic signature
  if (!t.malt || !t.malt.chocPct) {
    t.malt = t.malt || {};
    t.malt.chocPct = {
      safe:     { min: 3, max: 12, scoreBonus: 20 },
      marginal: { min: 1, max: 15, scoreBonus: 8  },
    };
    changes.push('Baltic Porter: chocPct safe bonus eklendi');
  }
  // Pilsner base beklenir
  if (!t.malt.pilsnerPct) {
    t.malt.pilsnerPct = {
      safe:     { min: 40, max: 80, scoreBonus: 15 },
      marginal: { min: 25, max: 90, scoreBonus: 5  },
    };
    changes.push('Baltic Porter: pilsnerPct safe bonus eklendi');
  }
}

// Doppelbock tarafında: ROAST malt varsa exclusion (Doppelbock roast olmamalı)
{
  const t = defs.german_doppelbock.thresholds;
  t.malt = t.malt || {};
  t.malt._SUM_doppelbock_no_roast = {
    exclusion: {
      keysSumAbove: ['roastPct', 'chocPct'],
      threshold: 5,
      reason: 'Doppelbock: roast/chocolate malt > 5% olmamalı (Baltic Porter daha uygun)',
    },
  };
  changes.push('Doppelbock: roast+choc > 5% exclusion eklendi');
}

// ════════════════════ C) Sweet/Milk Stout lactose hard req + malt signature ════════════════════
{
  const t = defs.sweet_stout_or_cream_stout.thresholds;
  t.markers = t.markers || {};
  t.markers.required_lactose = {
    safe: {
      marker: { __regex: 'laktoz|lactose|laktoza', flags:'i' },
      field: 'katki',
      scoreBonus: 25,
      label: 'Laktoz (zorunlu)',
    },
    exclusion: {
      markerMissing: { __regex: 'laktoz|lactose|laktoza', flags:'i' },
      field: 'katki',
      reason: 'Sweet/Milk Stout: laktoz katkısı zorunlu (Milk Stout = Sweet Stout + laktoz)',
    },
  };
  changes.push('Sweet/Milk Stout: lactose hard requirement eklendi');

  // Malt sinyatur (adapter-compatible keys): chocPct, roastPct, crystalPct beklenir
  t.malt = t.malt || {};
  t.malt.chocPct = { safe:{min:3,max:12,scoreBonus:15}, marginal:{min:1,max:18,scoreBonus:5} };
  t.malt.roastPct = { safe:{min:2,max:10,scoreBonus:10}, marginal:{min:0.5,max:15,scoreBonus:3} };
  t.malt.crystalPct = { safe:{min:5,max:15,scoreBonus:10}, marginal:{min:2,max:20,scoreBonus:3} };
  t.malt.baseMaltPct = { safe:{min:60,max:85,scoreBonus:15}, marginal:{min:50,max:90,scoreBonus:5} };
  changes.push('Sweet/Milk Stout: choc+roast+crystal+base malt sinyaturu eklendi');
}

// American Brown, Brown Porter, Robust Porter — laktoz varsa exclusion
// (Lactose = sweet/milk/pastry stout territory, kahverengi biralarda yok)
['american_brown_ale','english_brown_ale','brown_porter','robust_porter','american_porter'].forEach(slug => {
  const def = defs[slug];
  if (!def) return;
  def.thresholds = def.thresholds || {};
  def.thresholds.markers = def.thresholds.markers || {};
  def.thresholds.markers.no_lactose = {
    exclusion: {
      markerPresent: { __regex: 'laktoz|lactose|laktoza', flags:'i' },
      field: 'katki',
      reason: (def.displayTR||slug)+': laktoz varsa stil Sweet/Milk Stout olmalı',
    },
  };
  changes.push(slug + ': laktoz exclusion eklendi');
});

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik uygulandı:');
changes.forEach(c => console.log('  · ' + c));
console.log('\nSTYLE_DEFINITIONS.json boyutu:', (fs.statSync(file).size/1024).toFixed(1), 'KB');
