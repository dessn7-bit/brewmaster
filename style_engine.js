// Brewmaster yeni skorlama motoru
// Kullanim: const { styleMatchScore, findBestMatches } = require('./style_engine.js');
const fs = require('fs');
const defs = JSON.parse(fs.readFileSync(__dirname + '/STYLE_DEFINITIONS.json', 'utf8'));
const subs = JSON.parse(fs.readFileSync(__dirname + '/SUBSTYLE_VARIANTS.json', 'utf8'));
const FAM  = JSON.parse(fs.readFileSync(__dirname + '/STYLE_FAMILIES.json', 'utf8'));
const FAMILY_MAP           = FAM.familyMap;
const FAMILY_DISCRIMINATORS = FAM.discriminators;
const SPECIALTY_CAP_FAMILIES   = FAM.specialtyCapFamilies || ['specialty'];
const SPECIALTY_CAP_NORMALIZED = FAM.specialtyCapNormalized || 85;

function inRange(v, zone) {
  if (!zone) return false;
  const lo = zone.min != null ? zone.min : -Infinity;
  const hi = zone.max != null ? zone.max : Infinity;
  return v >= lo && v <= hi;
}

// Specificity: dar safe zone = daha spesifik stil = daha yüksek bonus
// Formula: typical_width / actual_width, clamp 0.7-1.6
const TYPICAL_WIDTHS = { srm: 8, ibu: 15, abv: 2, og: 0.020, yeast: 0 };
function specificityMult(zone, key) {
  if (!zone || zone.min == null || zone.max == null) return 1;
  const typical = TYPICAL_WIDTHS[key];
  if (!typical) return 1;
  const width = zone.max - zone.min;
  if (width <= 0) return 1;
  const factor = typical / width;
  return Math.max(0.7, Math.min(1.6, factor));
}

function mkRegex(obj) {
  if (!obj || !obj.__regex) return null;
  try { return new RegExp(obj.__regex, obj.flags || 'i'); } catch(e) { return null; }
}

function matchMarker(regexObj, field, recipe) {
  const rx = mkRegex(regexObj);
  if (!rx) return false;
  let arr = [];
  switch (field) {
    case 'maya':  arr = [recipe.mayaId, recipe.maya2Id].filter(Boolean); break;
    case 'hop':   arr = recipe.hopIds || []; break;
    case 'katki': arr = recipe.katkiIds || []; break;
    case 'malt':  arr = recipe.maltIds  || []; break;
    default: return false;
  }
  return arr.some(x => x && rx.test(String(x)));
}

function computeMaxScore(t, boostFields, boostMult, boostMarkers) {
  const bf = boostFields || [];
  const bm = boostMult || 1;
  const mul = (k, v) => (bf.includes(k) ? v * bm : v);
  const markerMul = (v) => (boostMarkers ? v * bm : v);
  let m = 0;
  if (t.yeast?.safe)   m += mul('yeast', t.yeast.safe.scoreBonus || 0);
  if (t.srm?.safe)     m += mul('srm',   t.srm.safe.scoreBonus   || 0);
  if (t.ibu?.safe)     m += mul('ibu',   t.ibu.safe.scoreBonus   || 0);
  if (t.abv?.safe)     m += mul('abv',   t.abv.safe.scoreBonus   || 0);
  if (t.og?.safe)      m += mul('og',    t.og.safe.scoreBonus    || 0);
  for (const rule of Object.values(t.malt || {}))    if (rule.safe?.scoreBonus)   m += rule.safe.scoreBonus;
  for (const rule of Object.values(t.markers || {})) if (rule.safe?.scoreBonus)   m += markerMul(rule.safe.scoreBonus);
  return m || 1;
}

function styleMatchScore(slug, recipe, opts = {}) {
  const def = defs[slug];
  if (!def) return null;
  const t = def.thresholds || {};
  let raw = 0;
  const breakdown = [];
  const exclusions = [];

  // Aile ici tie-break icin boost parametreleri
  const boostFields  = (opts.familyBoost && opts.familyBoost.boostFields)  || [];
  const boostMult    = (opts.familyBoost && opts.familyBoost.multiplier)   || 1;
  const boostMarkers = (opts.familyBoost && opts.familyBoost.boostMarkers) || false;
  const boosted = (key, v) => (boostFields.includes(key) ? v * boostMult : v);
  const boostedMarker = (v) => (boostMarkers ? v * boostMult : v);

  const hit = (label, zone, boostKey) => {
    if (zone && zone.scoreBonus != null) {
      let val = zone.scoreBonus;
      if (boostKey) val = boosted(boostKey, val);
      else if (boostKey === undefined && label.startsWith('marker.')) val = boostedMarker(val);
      raw += val;
      breakdown.push(`${label} +${val}`);
    }
  };

  // YEAST
  if (t.yeast) {
    const m = recipe._mayaTip;
    if      (t.yeast.safe     && t.yeast.safe.types.includes(m))     hit(`yeast.safe[${m}]`,     t.yeast.safe,     'yeast');
    else if (t.yeast.marginal && t.yeast.marginal.types.includes(m)) hit(`yeast.marginal[${m}]`, t.yeast.marginal, 'yeast');
    else if (t.yeast.exclusion && t.yeast.exclusion.types.includes(m)) exclusions.push(`YEAST: ${t.yeast.exclusion.reason}`);
  }

  // SRM / IBU / ABV / OG — continuous scalars
  const scalarChecks = [
    ['srm', recipe._srm],
    ['ibu', recipe._ibu],
    ['abv', recipe._abv],
    ['og',  recipe._og ],
  ];
  for (const [key, val] of scalarChecks) {
    const z = t[key];
    if (!z || val == null) continue;
    if (z.exclusion  && val <= (z.exclusion.max  ?? -Infinity)) exclusions.push(`${key.toUpperCase()}: ${z.exclusion.reason}`);
    if (z.exclusion2 && val >= (z.exclusion2.min ??  Infinity)) exclusions.push(`${key.toUpperCase()}: ${z.exclusion2.reason}`);
    if      (inRange(val, z.safe))     hit(`${key}.safe`,     z.safe,     key);
    else if (inRange(val, z.marginal)) hit(`${key}.marginal`, z.marginal, key);
  }

  // MALT percents + composite rules
  for (const [key, rule] of Object.entries(t.malt || {})) {
    if (key.startsWith('_SUM_')) {
      const keys = rule.exclusion?.keysSumAbove || [];
      const sum = keys.reduce((s, k) => s + (recipe.percents?.[k] || 0), 0);
      if (rule.exclusion && sum > rule.exclusion.threshold) exclusions.push(`MALT: ${rule.exclusion.reason}`);
      continue;
    }
    if (key.startsWith('_OR_')) {
      const keys = rule.exclusion?.keysAllBelow || [];
      const allBelow = keys.every(k => (recipe.percents?.[k] || 0) < (rule.exclusion?.threshold ?? 0));
      if (rule.exclusion && allBelow) exclusions.push(`MALT: ${rule.exclusion.reason}`);
      continue;
    }
    const pct = recipe.percents?.[key];
    if (pct == null) continue;
    if (rule.exclusion && pct <= (rule.exclusion.max ?? -Infinity)) exclusions.push(`MALT.${key}: ${rule.exclusion.reason}`);
    // pct=0 phantom bonus fix: malzeme yoksa safe/marginal bonus verilmez
    if (pct > 0) {
      if      (inRange(pct, rule.safe))     hit(`malt.${key}.safe`,     rule.safe);
      else if (inRange(pct, rule.marginal)) hit(`malt.${key}.marginal`, rule.marginal);
    }
  }

  // MARKERS
  for (const [key, rule] of Object.entries(t.markers || {})) {
    if (rule.safe?.marker) {
      const has = matchMarker(rule.safe.marker, rule.safe.field, recipe);
      if (has) hit(`marker.${key}`, rule.safe);
    }
    if (rule.exclusion?.markerMissing) {
      const has = matchMarker(rule.exclusion.markerMissing, rule.exclusion.field, recipe);
      if (!has) exclusions.push(`MARKER: ${rule.exclusion.reason}`);
    }
    // Custom checks (non-regex): filtered, aged, hotStoneMash, bourbonAged, blended, hasSpecialMarker...
    if (rule.safe?.customCheck) {
      const flagName = rule.safe.customCheck;
      let hits = false;
      if (flagName === 'hasSpecialMarker') {
        const rx = /meyve|fruit|baharat|spice|hop|dry_hop|mango|passion|seftali|peach|strawberry|cilek|chocolate|cacao|kakao|coconut|hindistancevizi|vanilla|vanilya/i;
        hits = (recipe.katkiIds || []).some(k => rx.test(String(k))) || ((recipe.dhPer10L||0) > 1);
      } else {
        hits = recipe[flagName] === true;
      }
      if (hits) hit(`marker.${key}(custom:${flagName})`, rule.safe);
    }
    if (rule.exclusion?.customCheck) {
      const flagName = rule.exclusion.customCheck;
      let matches;
      if (flagName === 'notFiltered')     matches = recipe.filtered !== true;
      else if (flagName === 'notAged')    matches = recipe.aged !== true;
      else if (flagName === 'notBlended') matches = recipe.blended !== true;
      else if (flagName === 'noSpecialMarker') {
        const rx = /meyve|fruit|baharat|spice|mango|passion|seftali|peach|strawberry|cilek|chocolate|cacao|kakao|coconut|hindistancevizi|vanilla|vanilya|citra|mosaic|galaxy|dry_hop/i;
        const hasKatki = (recipe.katkiIds || []).some(k => rx.test(String(k)));
        const hasDH    = (recipe.dhPer10L || 0) >= 2;
        const hasDark  = (recipe._srm || 0) > 10;
        const hasStrong= (recipe._abv || 0) > 7.5;
        matches = !(hasKatki || hasDH || hasDark || hasStrong);
      } else {
        matches = recipe[flagName] === true;
      }
      if (matches) exclusions.push(`MARKER: ${rule.exclusion.reason}`);
    }
    // MarkerPresent (negatif marker — belirli marker varsa exclusion)
    if (rule.exclusion?.markerPresent) {
      const has = matchMarker(rule.exclusion.markerPresent, rule.exclusion.field, recipe);
      if (has) exclusions.push(`MARKER: ${rule.exclusion.reason}`);
    }
  }

  if (exclusions.length > 0) {
    return { score: 0, normalized: 0, exclusions, breakdown: [] };
  }
  const max = computeMaxScore(t, boostFields, boostMult, boostMarkers);
  const normalized = Math.round(raw / max * 100);
  return { score: raw, max, normalized, breakdown, exclusions: [] };
}

function findBestMatches(recipe, topN = 5) {
  const res = [];
  for (const slug of Object.keys(defs)) {
    const r = styleMatchScore(slug, recipe);
    if (!r || r.normalized <= 0) continue;
    const family = FAMILY_MAP[slug] || 'unknown';
    let score = r.score, normalized = r.normalized;

    // Specialty cap: aile="specialty" ise max normalized=85,
    // ANCAK required_ingredient marker tetiklendiyse skip (gerçek specialty match).
    if (SPECIALTY_CAP_FAMILIES.includes(family) && normalized > SPECIALTY_CAP_NORMALIZED) {
      const hasRequiredMarker = (r.breakdown || []).some(b => /marker\.required_ingredient/.test(b));
      if (!hasRequiredMarker) {
        const ratio = SPECIALTY_CAP_NORMALIZED / normalized;
        score = Math.round(score * ratio);
        normalized = SPECIALTY_CAP_NORMALIZED;
      }
    }

    res.push({
      slug,
      displayTR: defs[slug].displayTR,
      category:  defs[slug].category,
      family,
      score,
      max:       r.max,
      normalized,
      breakdown: r.breakdown,
    });
  }

  // HAM skor birincil siralama
  res.sort((a, b) => b.score - a.score || b.normalized - a.normalized);

  // Aile ici tie-break (IZOLE): top-5'te ayni aileden 2+ varsa, o ailenin
  // uyelerinin POZISYONLARI sabit kalir, hangisinin hangi pozisyona oturacagi
  // boost'lu skorla belirlenir. Aileler arasi sira degismez.
  const top5 = res.slice(0, 5);
  const famPositions = {};
  top5.forEach((x, i) => {
    if (!famPositions[x.family]) famPositions[x.family] = [];
    famPositions[x.family].push(i);
  });
  const colliding = Object.keys(famPositions).filter(f =>
    famPositions[f].length >= 2 && FAMILY_DISCRIMINATORS[f] && (FAMILY_DISCRIMINATORS[f].boostFields || []).length > 0
  );

  for (const fam of colliding) {
    const boost = FAMILY_DISCRIMINATORS[fam];
    const positions = famPositions[fam];
    const members = positions.map(i => res[i]);

    // Her uyeyi boost'lu skorla
    for (const m of members) {
      const r2 = styleMatchScore(m.slug, recipe, { familyBoost: boost });
      if (r2) {
        m._boostScore = r2.score;
        m._boostNorm  = r2.normalized;
      } else {
        m._boostScore = m.score;
        m._boostNorm  = m.normalized;
      }
    }
    // Uyeleri boost'lu skora gore sirala (buyukten kucuge)
    members.sort((a, b) => (b._boostScore - a._boostScore) || (b._boostNorm - a._boostNorm));
    // Orijinal pozisyonlara yeni siraya gore yerlestir
    positions.forEach((pos, idx) => {
      const winner = members[idx];
      winner._boosted = fam;
      res[pos] = winner;
    });
  }

  return res.slice(0, topN);
}

// Substyle trigger kontrolu (Faz 2b'de genisletilecek)
function matchSubstyles(recipe, topParentSlug) {
  const hits = [];
  for (const [slug, s] of Object.entries(subs)) {
    if (s.parentSlug !== topParentSlug) continue;
    const tr = s.triggers || {};
    let passes = true;
    if (tr.markerAny) {
      const rx = mkRegex(tr.markerAny);
      let arr = [];
      switch (tr.markerField) {
        case 'katki': arr = recipe.katkiIds || []; break;
        case 'hop':   arr = recipe.hopIds   || []; break;
        case 'maya':  arr = [recipe.mayaId, recipe.maya2Id].filter(Boolean); break;
        case 'malt':  arr = recipe.maltIds  || []; break;
      }
      if (!arr.some(x => x && rx && rx.test(String(x)))) passes = false;
    }
    if (tr.lactose && !recipe.lactose) passes = false;
    if (tr.abvMin  != null && (recipe._abv || 0) < tr.abvMin)  passes = false;
    if (tr.abvMax  != null && (recipe._abv || 0) > tr.abvMax)  passes = false;
    if (tr.ogMin   != null && (recipe._og  || 0) < tr.ogMin)   passes = false;
    if (tr.srmMin  != null && (recipe._srm || 0) < tr.srmMin)  passes = false;
    if (tr.srmMax  != null && (recipe._srm || 0) > tr.srmMax)  passes = false;
    if (passes) hits.push({ slug, displayTR: s.displayTR, note: s.note });
  }
  return hits;
}

module.exports = { styleMatchScore, findBestMatches, matchSubstyles, defs, subs };
