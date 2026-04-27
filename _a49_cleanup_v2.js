// Adım 49 Faz 1+2 — Brett-protective cleanup + Re-process V12 base
// Strategy: ORIGINAL V10.1 yeast strings + brett/lacto/pedio keyword preservation
// Inputs: V10.1 raw yeast strings (we re-cleanup to recover lost biology mentions)
const fs = require('fs');

// === BIOLOGY KEYWORDS (preserve when found) ===
const BIO_KEYWORDS = [
  // Brett strains and species
  { re: /\b(Brett(?:anomyces)?\s+(?:bruxellensis|lambicus|claussenii|anomalus|drosophilae|naardenensis|custersianus|nanus|bruxellensis|trois|drie|c|b))\b/i, label: m => m[1] },
  { re: /\b(Brett(?:anomyces)?\s+[A-Z])\b/i, label: m => m[1] },
  { re: /\b(Brettanomyces)\b/i, label: m => 'Brettanomyces' },
  { re: /\b(Brett)\b(?!\s*(?:erfly|er|en|eltz))/i, label: m => 'Brett' },  // exclude butterfly, brettens etc.
  // Lacto strains and species
  { re: /\b(Lactobacillus\s+[a-z]{4,})\b/i, label: m => m[1] },
  { re: /\b(Lactobacillus)\b/i, label: m => 'Lactobacillus' },
  { re: /\b(Lacto\s*Plantarum|Lacto\s*Brevis)\b/i, label: m => m[1] },
  { re: /\bL\.\s*(?:plantarum|brevis|delbrueckii|fermentum)\b/i, label: m => m[0] },
  // Pedio strains
  { re: /\b(Pediococcus\s+[a-z]{4,})\b/i, label: m => m[1] },
  { re: /\b(Pediococcus|Pedio)\b/i, label: m => m[1] },
  // Sour blends and mixed culture
  { re: /\b(Roeselare(?:\s*(?:Ale|Blend))?)\b/i, label: m => m[1] },
  { re: /\b(Sourvisiae)\b/i, label: m => 'Sourvisiae' },
  { re: /\b(WildBrew\s*Sour\s*Pitch)\b/i, label: m => m[1] },
  { re: /\b(Mixed\s*Culture|Mixed\s*Fermentation|Spontaneous\s*Fermentation)\b/i, label: m => m[1] }
];

// === STRAIN ID PATTERNS (extract clean ID) ===
const STRAIN_PATTERNS = [
  /\b(Wyeast\s*\d{4}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(WY\s*\d{4})\b/i,
  /\b(WLP\s*\d{3,4}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(White\s*Labs\s*WLP\s*\d{3,4}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b((?:Safale|Safbrew|Saflager)\s*[A-Z]+-?\d{1,3}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(Fermentis\s*(?:Safale|Safbrew|Saflager)?\s*[A-Z]*-?\d{1,3}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b((?:Lalbrew|Lallemand|Danstar)\s+[A-Z][\w\s\-]{2,40})\b/i,
  /\b(BRY-?\s*\d{2})\b/i,
  /\b(Imperial\s+[A-Z]\d{2,3}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(Omega\s+(?:OYL-?\d{3,4}|[A-Z][\w\s\-]{2,40}))\b/i,
  /\b(M\d{2,3}\s+[A-Z][\w\s\-]{2,40})\b/i,
  /\b([SUWK]-?\d{2}(?:\/\d{2})?)\b/i,
  /\b(Belle\s+Saison)\b/i,
  /\b(Voss\s+Kveik|Hornindal\s+Kveik|Lutra\s+Kveik|Verdant\s+IPA|East\s+Coast\s+Yeast|ECY\s*\d{2,3})\b/i,
  /\b(Roeselare)\b/i  // also strain marker
];

// HTML entity decoder
const ENTITIES = {
  '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&nbsp;': ' ', '&#39;': "'", '&#x27;': "'", '&#34;': '"', '&#x22;': '"',
  '&#160;': ' ', '&#8217;': "'", '&#8220;': '"', '&#8221;': '"', '&#8211;': '-', '&#8212;': '-',
  '&rsquo;': "'", '&lsquo;': "'", '&rdquo;': '"', '&ldquo;': '"', '&ndash;': '-', '&mdash;': '-'
};
function decodeEntities(s) {
  if (!s) return '';
  let out = String(s);
  for (const [k, v] of Object.entries(ENTITIES)) out = out.split(k).join(v);
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  out = out.replace(/<[^>]+>/g, ' ');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

// === BRETT-PROTECTIVE cleanYeastString ===
function cleanYeastStringV2(rawYeast) {
  let y = rawYeast;
  if (Array.isArray(y)) y = y.map(x => (x && x.name) ? x.name : (typeof x === 'string' ? x : '')).filter(Boolean).join(' | ');
  if (typeof y !== 'string') y = String(y || '');
  y = y.trim();

  if (!y) return '';
  if (/^\[object\s*object\]$/i.test(y)) return '';

  y = decodeEntities(y);

  // Short-circuit: clean already
  if (y.length <= 80) return y;

  // === LONG STRING — extract priority order: strain ID, then biology keyword ===
  const tokens = [];

  // 1. Try strain ID extraction
  for (const pattern of STRAIN_PATTERNS) {
    const m = y.match(pattern);
    if (m) {
      let extracted = m[1].trim();
      extracted = extracted.split(/[.!?,]\s|[\n\r]/)[0].trim();
      if (extracted.length > 60) extracted = extracted.slice(0, 60).trim();
      tokens.push(extracted);
      break; // first strain ID is enough
    }
  }

  // 2. ALWAYS scan for biology keywords (preserve even if strain ID found)
  const bioFound = new Set();
  for (const { re, label } of BIO_KEYWORDS) {
    const m = y.match(re);
    if (m) {
      const lbl = label(m);
      if (lbl && !bioFound.has(lbl.toLowerCase())) {
        bioFound.add(lbl.toLowerCase());
        tokens.push(lbl);
      }
    }
  }

  if (tokens.length > 0) {
    const result = tokens.join(' + ');
    return result.length > 80 ? result.slice(0, 80) : result;
  }

  // 3. No strain ID, no biology keyword — try sentence truncation
  const firstSentence = y.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 80) return firstSentence;

  // Last resort: drop
  return '';
}

// === Re-cleanup V12 base ===
const v12 = JSON.parse(fs.readFileSync('_ml_dataset_v12_pre_retrain.json', 'utf8'));
console.log('V12 dataset (pre-Faz1): ' + v12.recipes.length + ' recipes');

// We need ORIGINAL V10.1 yeast strings (pre-Adım 48 cleanup)
// Solution: load V10.1 raw and re-cleanup with V2 function
const v101 = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));

// Build map V10.1 source+id → original yeast
const v101Map = {};
for (const r of v101.recipes) v101Map[r.source + ':' + r.source_id] = r.raw && r.raw.yeast;

// Re-cleanup V12 using V10.1 originals
let recovered = 0, stillEmpty = 0, sameClean = 0, brettRecovered = 0, lactoRecovered = 0;
const sample = [];

for (const r of v12.recipes) {
  const orig = v101Map[r.source + ':' + r.source_id];
  if (orig === undefined) { sameClean++; continue; }
  const newClean = cleanYeastStringV2(orig);
  const oldClean = (r.raw && r.raw.yeast) || '';
  if (r.raw) r.raw.yeast = newClean;
  if (newClean === oldClean) sameClean++;
  else if (!newClean) stillEmpty++;
  else {
    recovered++;
    if (sample.length < 15) sample.push({ source: r.source, source_id: r.source_id, before: String(oldClean).slice(0,80), after: newClean });
    if (/brett/i.test(newClean) && !/brett/i.test(oldClean)) brettRecovered++;
    if (/lacto|pediococcus|pedio/i.test(newClean) && !/lacto|pedio/i.test(oldClean)) lactoRecovered++;
  }
}

console.log('\n=== Re-cleanup V2 stats ===');
console.log('  same/unchanged: ' + sameClean);
console.log('  recovered with biology keyword: ' + recovered);
console.log('  brett recovered (was missing): ' + brettRecovered);
console.log('  lacto/pedio recovered: ' + lactoRecovered);
console.log('  still empty: ' + stillEmpty);

console.log('\n=== Sample recoveries ===');
sample.slice(0,15).forEach(s => {
  console.log('  [' + s.source + ':' + s.source_id + ']');
  console.log('    BEFORE: "' + s.before + '"');
  console.log('    AFTER:  "' + s.after + '"');
});

// === Re-measure brett/lacto coverage ===
const PATTERNS_BIO = {
  brett: { ids: ['wyeast 5526','wy5526','wyeast 5112','wy5112','wyeast 5733','wy5733','wyeast 5151','wy5151','wyeast 5378','wy5378','wlp650','wlp 650','wlp653','wlp 653','wlp655','wlp 655','wlp645','wlp 645','wlp644','wlp 644','wlp4639'], keyword: /brett(anomyces)?\b/i },
  lacto: { ids: ['wyeast 5335','wy5335','wyeast 5223','wy5223','wyeast 5424','wy5424','wlp677','wlp 677','wlp672','wlp 672','wlp693','wildbrew sour'], keyword: /lacto(bacillus)?\b|^l\.\s*(plantarum|brevis|delbrueckii)/i },
  pedio: { ids: ['wlp661','wlp 661','wyeast 5733','wy5733'], keyword: /pedio(coccus)?\b/i },
  sour_blend: { ids: ['wyeast 3278','wy3278','wlp655','wlp 655','wlp665','wlp 665','wyeast 5278','wy5278','sourvisiae','melange','mixed culture','mixed fermentation','spontaneous fermentation','roeselare'], keyword: /(sour|lambic|funk).*(blend|mix)|(blend|mix).*(sour|lambic|funk)/i },
  belgian: { ids: ['wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388','wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565','wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590','safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison'], keyword: /(abbey|trappist|abbaye|monastic|tripel|dubbel|saison|witbier)/i },
  clean_us05: { ids: ['wyeast 1056','wy1056','wlp001','wlp 001','safale us-05','safale us05','us-05','us05','bry-97','bry97','chico'], keyword: null }
};
function matchPattern(yLower, p) {
  for (const id of p.ids) if (yLower.includes(id)) return true;
  if (p.keyword && p.keyword.test(yLower)) return true;
  return false;
}
const matches = {};
const brettBySrc = {};
for (const k of Object.keys(PATTERNS_BIO)) matches[k] = { count: 0, by_main_cat: {} };
for (const r of v12.recipes) {
  let y = r.raw && r.raw.yeast;
  if (Array.isArray(y)) y = y.join(' | ');
  const yLower = String(y || '').toLowerCase();
  for (const k of Object.keys(PATTERNS_BIO)) {
    if (matchPattern(yLower, PATTERNS_BIO[k])) {
      matches[k].count++;
      matches[k].by_main_cat[r.bjcp_main_category] = (matches[k].by_main_cat[r.bjcp_main_category]||0)+1;
    }
  }
}
console.log('\n=== Yeast coverage POST-V2 cleanup (' + v12.recipes.length + ') ===');
for (const [k, v] of Object.entries(matches)) {
  console.log('  ' + k.padEnd(15) + v.count.toString().padStart(4) + ' (' + (100*v.count/v12.recipes.length).toFixed(2) + '%)');
}

console.log('\n=== Brett by cluster (V2 post) ===');
Object.entries(matches.brett.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(35)+v));
console.log('\n=== Sour blend by cluster (V2 post) ===');
Object.entries(matches.sour_blend.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(35)+v));

// Save V13 base
v12.meta.regex_version = (v12.meta.regex_version || '').replace('+v12clean', '+v13brettprotect');
v12.meta.generated = new Date().toISOString();
fs.writeFileSync('_ml_dataset_v13_pre_retrain.json', JSON.stringify(v12, null, 2));
console.log('\nWrote _ml_dataset_v13_pre_retrain.json');
