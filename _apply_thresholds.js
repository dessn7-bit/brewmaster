const fs = require('fs');
const R = (src, flags='i') => ({ __regex: src, flags });
const defs = JSON.parse(fs.readFileSync('./STYLE_DEFINITIONS.json','utf8'));

// ═══ ADIM 1 — NULL SLOTLARI TEMIZLE ═══
let removed = 0;
for (const k of Object.keys(defs)) {
  if (!defs[k]) { delete defs[k]; removed++; }
}
console.log('Temizlenen null slot:', removed);
const totalDefs = Object.keys(defs).length;
console.log('Kalan stil sayisi:', totalDefs);

// ═══ ADIM 2 — THRESHOLD AĞIRLIKLARI ═══
// Kaan'in karari: kriter onem agirliklari
const W = {
  yeast:    { safe: 40, marginal: 15 },    // EN belirleyici
  malt:     { safe: 25, marginal: 10 },    // Kompozisyon
  srm:      { safe: 15, marginal:  5 },
  ibu:      { safe: 10, marginal:  3 },
  abv:      { safe: 10, marginal:  3 },
  og:       { safe: 10, marginal:  3 },
  markers:  { safe: 20, marginal:  5 },    // Zorunlu katkı/marker
};

// ═══ ADIM 3 — HER STILE THRESHOLDS EKLE ═══
const ALL_YEAST_TYPES = ['ale','lager','wheat','wit','belcika','saison','kveik','sour'];

function clamp0(v) { return v < 0 ? 0 : v; }

function buildThresholds(def) {
  const t = {};
  const label = def.displayTR || def.slug;

  // ─── YEAST ───
  const y = def.yeast || { primary: [], secondary: [], tolerant: [] };
  t.yeast = {};
  if (y.primary && y.primary.length > 0) {
    t.yeast.safe = { types: [...y.primary], scoreBonus: W.yeast.safe };
  }
  if (y.secondary && y.secondary.length > 0) {
    t.yeast.marginal = { types: [...y.secondary], scoreBonus: W.yeast.marginal };
  }
  // Exclusion: tolerant dışındaki, primary+secondary+tolerant setinde OLMAYAN maya tipleri
  const allowed = new Set([
    ...(y.primary || []),
    ...(y.secondary || []),
    ...(y.tolerant || []),
  ]);
  const excluded = ALL_YEAST_TYPES.filter(tp => !allowed.has(tp));
  if (excluded.length > 0 && excluded.length < ALL_YEAST_TYPES.length) {
    t.yeast.exclusion = {
      types: excluded,
      hardZero: true,
      reason: `${label}: primary/secondary/tolerant dışı maya tipi imkansız`
    };
  }

  // ─── SRM ───
  if (def.srm && Array.isArray(def.srm)) {
    const [smin, smax] = def.srm;
    const range = Math.max(0.5, smax - smin);
    t.srm = {
      safe:     { min: smin, max: smax, scoreBonus: W.srm.safe },
      marginal: { min: clamp0(smin - range * 0.5), max: smax + range * 0.5, scoreBonus: W.srm.marginal }
    };
    // Exclusion only for narrow ranges (don't exclude open-ended specialty)
    if (range <= 15) {
      const excLo = clamp0(smin - range * 1.5);
      const excHi = smax + range * 1.5;
      if (excLo > 0.5) {
        t.srm.exclusion = { max: Math.round(excLo * 10) / 10, hardZero: true, reason: `${label}: SRM çok açık` };
      }
      if (smax < 35) {
        t.srm.exclusion2 = { min: Math.round(excHi * 10) / 10, hardZero: true, reason: `${label}: SRM çok koyu` };
      }
    }
  }

  // ─── IBU ───
  if (def.ibu && Array.isArray(def.ibu)) {
    const [imin, imax] = def.ibu;
    const range = Math.max(3, imax - imin);
    t.ibu = {
      safe:     { min: imin, max: imax, scoreBonus: W.ibu.safe },
      marginal: { min: clamp0(imin - range * 0.5), max: imax + range * 0.5, scoreBonus: W.ibu.marginal }
    };
    if (range <= 30) {
      const excLo = clamp0(imin - range * 1.5);
      const excHi = imax + range * 1.5;
      if (excLo > 0.5) {
        t.ibu.exclusion = { max: Math.round(excLo), hardZero: true, reason: `${label}: IBU çok düşük` };
      }
      t.ibu.exclusion2 = { min: Math.round(excHi), hardZero: true, reason: `${label}: IBU çok yüksek` };
    }
  }

  // ─── ABV ───
  if (def.abv && Array.isArray(def.abv)) {
    const [amin, amax] = def.abv;
    const range = Math.max(0.5, amax - amin);
    t.abv = {
      safe:     { min: amin, max: amax, scoreBonus: W.abv.safe },
      marginal: { min: clamp0(amin - range * 0.4), max: amax + range * 0.4, scoreBonus: W.abv.marginal }
    };
  }

  // ─── OG ───
  if (def.og && Array.isArray(def.og)) {
    const [omin, omax] = def.og;
    t.og = {
      safe:     { min: omin, max: omax, scoreBonus: W.og.safe },
      marginal: { min: Math.max(1.000, omin - 0.008), max: omax + 0.010, scoreBonus: W.og.marginal }
    };
  }

  // ─── MALT (signature'dan) ───
  t.malt = {};
  const sig = def.signature || {};
  const pctKeys = [
    'wheatPct','pilsnerPct','baseMaltPct','munichPct','viennaPct',
    'oatsPct','ryePct','roastedPct','chocPct','crystalPct','smokedPct',
    'cornPct','ricePct','sugarPct','oatsWheatPct','ryeWheatPct',
    'aromaticMunichPct','aromaticAbbeyMunichPct','cornRicePct','marisOtterPct','roastedBarleyPct'
  ];
  for (const k of pctKeys) {
    const v = sig[k];
    if (!v || !Array.isArray(v)) continue;
    const [mn, mx] = v;
    const rng = Math.max(3, mx - mn);
    const entry = {
      safe: { min: mn, max: mx, scoreBonus: W.malt.safe },
    };
    if (mn > 0) {
      entry.marginal = { min: clamp0(mn - rng * 0.5), max: mn, scoreBonus: W.malt.marginal };
    }
    // Exclusion: only if this malt pct is meaningfully required (min >= 15)
    if (mn >= 15) {
      const excMax = clamp0(mn - rng * 0.7);
      if (excMax > 0 && excMax < mn) {
        entry.exclusion = { max: Math.round(excMax), hardZero: true, reason: `${k} ≥ ${mn} gerekli (${label})` };
      }
    }
    t.malt[k] = entry;
  }

  // ─── MARKERS (signature'daki bonusHop/bonusMaya/bonusKatki/spice/fruit/salt/smoked) ───
  t.markers = {};
  const markerFields = {
    bonusMaya:    { field: 'maya',  label: 'Tipik maya', tier: 'safe' },
    bonusHop:     { field: 'hop',   label: 'Tipik hop',  tier: 'marginal' },
    bonusKatki:   { field: 'katki', label: 'Stil markeri katkı', tier: 'marginal' },
    spice:        { field: 'katki', label: 'Baharat',    tier: 'safe' },
    fruit:        { field: 'katki', label: 'Meyve',      tier: 'safe' },
    salt:         { field: 'katki', label: 'Tuz',        tier: 'safe' },
    smoked:       { field: 'malt',  label: 'Dumanlı',    tier: 'safe' },
    darkCandy:    { field: 'katki', label: 'Koyu candy', tier: 'marginal' },
    dehuskedBlack:{ field: 'malt',  label: 'Dehusked siyah malt', tier: 'marginal' },
    bonusMalt:    { field: 'malt',  label: 'Tipik malt', tier: 'marginal' },
  };
  for (const [sigKey, meta] of Object.entries(markerFields)) {
    const rx = sig[sigKey];
    if (!rx || !rx.__regex) continue;
    const bonus = meta.tier === 'safe' ? W.markers.safe : W.markers.marginal;
    t.markers[sigKey] = {
      safe: { marker: rx, field: meta.field, scoreBonus: bonus, label: meta.label }
    };
  }

  // ─── Legacy hardZero kurallarını thresholds'a migre et ───
  for (const rule of (def.hardZero || [])) {
    switch (rule.type) {
      case 'pctMin': {
        t.malt[rule.key] = t.malt[rule.key] || {};
        if (!t.malt[rule.key].exclusion) {
          t.malt[rule.key].exclusion = { max: Math.max(0, rule.min - 10), hardZero: true, reason: rule.reason };
        }
        break;
      }
      case 'pctMinEither': {
        const compositeKey = '_OR_' + rule.keys.join('_');
        t.malt[compositeKey] = {
          exclusion: { keysAllBelow: rule.keys, threshold: rule.min, hardZero: true, reason: rule.reason }
        };
        break;
      }
      case 'pctMaxSum': {
        const compositeKey = '_SUM_' + rule.keys.join('_');
        t.malt[compositeKey] = {
          exclusion: { keysSumAbove: rule.keys, threshold: rule.max, hardZero: true, reason: rule.reason }
        };
        break;
      }
      case 'markerAny': {
        const lbl = rule.reason.split(':')[0].trim();
        const safeKey = 'required_' + lbl.toLowerCase().replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'');
        t.markers[safeKey] = {
          safe: { marker: rule.regex, field: rule.field, scoreBonus: W.markers.safe, label: lbl },
          exclusion: { markerMissing: rule.regex, field: rule.field, hardZero: true, reason: rule.reason }
        };
        break;
      }
      case 'abvMin': {
        t.abv = t.abv || {};
        t.abv.exclusion = { max: Math.max(0, rule.value - 0.3), hardZero: true, reason: rule.reason };
        break;
      }
      case 'abvMax': {
        t.abv = t.abv || {};
        t.abv.exclusion2 = { min: rule.value + 0.3, hardZero: true, reason: rule.reason };
        break;
      }
      case 'ogMin': {
        t.og = t.og || {};
        t.og.exclusion = { max: Math.max(1.000, rule.value - 0.003), hardZero: true, reason: rule.reason };
        break;
      }
      case 'ogMax': {
        t.og = t.og || {};
        t.og.exclusion2 = { min: rule.value + 0.003, hardZero: true, reason: rule.reason };
        break;
      }
    }
  }
  return t;
}

// Uygula
for (const slug of Object.keys(defs)) {
  const d = defs[slug];
  d.thresholds = buildThresholds(d);
  delete d.hardZero;   // kaldir
}

fs.writeFileSync('./STYLE_DEFINITIONS.json', JSON.stringify(defs, null, 2), 'utf8');
console.log('Thresholds eklendi, hardZero kaldirildi');

// ═══ ADIM 4 — OZET TABLOSU ═══
const arr = Object.values(defs);
const byCat = {};
for (const d of arr) {
  (byCat[d.category] = byCat[d.category] || []).push(d);
}

console.log('\n═══ KATEGORI BAZLI THRESHOLDS OZETI ═══\n');
const lines = ['=== STYLE_DEFINITIONS Thresholds — Kategori Ozet Tablo ===\n'];
lines.push('Kriter önem ağırlıkları:');
lines.push('  YEAST:   safe=40  marginal=15   (en belirleyici)');
lines.push('  MALT:    safe=25  marginal=10');
lines.push('  SRM:     safe=15  marginal=5');
lines.push('  IBU:     safe=10  marginal=3');
lines.push('  ABV:     safe=10  marginal=3');
lines.push('  OG:      safe=10  marginal=3');
lines.push('  MARKERS: safe=20  marginal=5');
lines.push('');
lines.push('-'.repeat(80));

const cats = Object.keys(byCat).sort((a,b)=>byCat[b].length - byCat[a].length);
for (const cat of cats) {
  const list = byCat[cat];
  const sample = list[0];
  lines.push('');
  lines.push('▼ ' + cat.toUpperCase() + ' (' + list.length + ' stil)');
  lines.push('   Ornek: ' + sample.displayTR + ' (' + sample.slug + ')');
  const t = sample.thresholds;
  // Yeast
  if (t.yeast?.safe) {
    lines.push('   ├ YEAST primary: [' + t.yeast.safe.types.join(', ') + ']' +
      (t.yeast.marginal ? ' | secondary: [' + t.yeast.marginal.types.join(', ') + ']' : '') +
      (t.yeast.exclusion ? ' | excluded: [' + t.yeast.exclusion.types.join(', ') + ']' : ''));
  }
  // SRM
  if (t.srm?.safe) lines.push('   ├ SRM safe: ' + t.srm.safe.min + '-' + t.srm.safe.max + ', marginal: ' + t.srm.marginal.min + '-' + t.srm.marginal.max);
  // IBU
  if (t.ibu?.safe) lines.push('   ├ IBU safe: ' + t.ibu.safe.min + '-' + t.ibu.safe.max);
  // ABV
  if (t.abv?.safe) lines.push('   ├ ABV safe: ' + t.abv.safe.min + '-' + t.abv.safe.max + (t.abv.exclusion ? ' | hardmin: <' + t.abv.exclusion.max : '') + (t.abv.exclusion2 ? ' | hardmax: >' + t.abv.exclusion2.min : ''));
  // Malt keys
  const maltKeys = Object.keys(t.malt || {}).filter(k => !k.startsWith('_'));
  const maltComposite = Object.keys(t.malt || {}).filter(k => k.startsWith('_'));
  if (maltKeys.length) lines.push('   ├ MALT kriterleri: ' + maltKeys.join(', '));
  if (maltComposite.length) lines.push('   ├ MALT composite: ' + maltComposite.join(', '));
  // Markers
  const mkKeys = Object.keys(t.markers || {});
  if (mkKeys.length) lines.push('   └ MARKER kriterleri: ' + mkKeys.join(', '));
}

// Ozel istatistik
lines.push('');
lines.push('-'.repeat(80));
const withYeastExcl = arr.filter(d => d.thresholds?.yeast?.exclusion).length;
const withSrmExcl = arr.filter(d => d.thresholds?.srm?.exclusion || d.thresholds?.srm?.exclusion2).length;
const withAbvExcl = arr.filter(d => d.thresholds?.abv?.exclusion || d.thresholds?.abv?.exclusion2).length;
const withOgExcl = arr.filter(d => d.thresholds?.og?.exclusion || d.thresholds?.og?.exclusion2).length;
const withMaltExcl = arr.filter(d => d.thresholds?.malt && Object.values(d.thresholds.malt).some(v => v.exclusion)).length;
const withMarkerExcl = arr.filter(d => d.thresholds?.markers && Object.values(d.thresholds.markers).some(v => v.exclusion)).length;
lines.push('');
lines.push('Exclusion (hardZero) kural sayisi:');
lines.push('  Yeast exclusion: ' + withYeastExcl + ' stil');
lines.push('  SRM exclusion:   ' + withSrmExcl);
lines.push('  IBU exclusion:   ' + arr.filter(d => d.thresholds?.ibu?.exclusion || d.thresholds?.ibu?.exclusion2).length);
lines.push('  ABV exclusion:   ' + withAbvExcl);
lines.push('  OG exclusion:    ' + withOgExcl);
lines.push('  Malt exclusion:  ' + withMaltExcl);
lines.push('  Marker exclusion:' + withMarkerExcl);

fs.writeFileSync('./THRESHOLDS_summary.txt', lines.join('\n'), 'utf8');
console.log('Yazildi: THRESHOLDS_summary.txt (' + (fs.statSync('./THRESHOLDS_summary.txt').size/1024).toFixed(1) + ' KB)');
console.log('STYLE_DEFINITIONS.json boyut:', (fs.statSync('./STYLE_DEFINITIONS.json').size/1024).toFixed(1) + ' KB');

// Kaan'in iki ornek stilinin yeni halini gosterelim
console.log('\n═══ YENI HEFEWEIZEN ═══');
const hef = defs['south_german_hefeweizen'];
console.log(JSON.stringify(hef.thresholds, null, 2));

console.log('\n═══ YENI IRISH DRY STOUT ═══');
const irish = defs['irish_dry_stout'];
console.log(JSON.stringify(irish.thresholds, null, 2));
