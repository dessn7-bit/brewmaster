// Faz 2+3 birleşik — yeast field cleanup (V10.1 dataset)
// Strategy: post-hoc cleanup function (avoids 4019 HTML re-fetch + re-parse).
// Same logic also applied to recipator_parse_normalize.js for future use.
const fs = require('fs');

// === Strain ID patterns (canonical brewing yeast manufacturers) ===
const STRAIN_PATTERNS = [
  // Wyeast: "Wyeast 1056", "Wyeast 1056 American Ale", "WY1056", "1056"
  /\b(Wyeast\s*\d{4}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(WY\s*\d{4})\b/i,
  // White Labs: "WLP001", "WLP 001", "WLP001 California Ale"
  /\b(WLP\s*\d{3,4}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(White\s*Labs\s*WLP\s*\d{3,4}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  // Fermentis: "Safale US-05", "Safbrew T-58", "Saflager S-23"
  /\b((?:Safale|Safbrew|Saflager)\s*[A-Z]+-?\d{1,3}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  /\b(Fermentis\s*(?:Safale|Safbrew|Saflager)?\s*[A-Z]*-?\d{1,3}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  // Lallemand: "Lalbrew Voss", "Lallemand Belle Saison", "BRY-97", "Nottingham", "Windsor"
  /\b((?:Lalbrew|Lallemand|Danstar)\s+[A-Z][\w\s\-]{2,40})\b/i,
  /\b(BRY-?\s*\d{2})\b/i,
  // Imperial Yeast: "Imperial A07 Flagship"
  /\b(Imperial\s+[A-Z]\d{2,3}(?:\s+[A-Z][\w\s\-/]{0,40})?)\b/i,
  // Omega: "Omega OYL-218", "Omega Hothead"
  /\b(Omega\s+(?:OYL-?\d{3,4}|[A-Z][\w\s\-]{2,40}))\b/i,
  // Mangrove Jack's: "M44 US Westcoast", "M36 Liberty Bell"
  /\b(M\d{2,3}\s+[A-Z][\w\s\-]{2,40})\b/i,
  // Generic short hand: "US-05", "S-04", "W-34/70", "K-97"
  /\b([SUWK]-?\d{2}(?:\/\d{2})?)\b/i,
  // Brettanomyces strains: "Brett B", "Brett C", "Brettanomyces lambicus"
  /\b(Brett(?:anomyces)?\s+[a-zA-Z]{2,30})\b/i,
  // Common direct strain keywords
  /\b(Belle\s+Saison)\b/i,
  /\b(Voss\s+Kveik|Hornindal\s+Kveik|Lutra\s+Kveik|Verdant\s+IPA)\b/i,
  /\b(Roeselare(?:\s+(?:Ale|Blend))?)\b/i
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
  // Numeric entities
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  // Strip remaining HTML tags
  out = out.replace(/<[^>]+>/g, ' ');
  // Normalize whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function cleanYeastString(rawYeast) {
  let y = rawYeast;
  if (Array.isArray(y)) y = y.map(x => (x && x.name) ? x.name : (typeof x === 'string' ? x : '')).filter(Boolean).join(' | ');
  if (typeof y !== 'string') y = String(y || '');
  y = y.trim();

  // Hard reject: known garbage values
  if (!y) return '';
  if (/^\[object\s*object\]$/i.test(y)) return '';

  // Decode HTML entities and strip tags
  y = decodeEntities(y);

  // If short and clean, keep as-is
  if (y.length <= 80) return y;

  // Long string: try to extract first matching strain ID
  for (const pattern of STRAIN_PATTERNS) {
    const m = y.match(pattern);
    if (m) {
      let extracted = m[1].trim();
      // Truncate at first sentence boundary or punctuation if extracted has it
      extracted = extracted.split(/[.!?,]\s|[\n\r]/)[0].trim();
      // Cap at 80 chars
      if (extracted.length > 80) extracted = extracted.slice(0, 80).trim();
      return extracted;
    }
  }

  // No strain ID found in long string — try sentence truncation
  const firstSentence = y.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 80) return firstSentence;

  // Last resort: drop (return empty, marks as unusable)
  return '';
}

// === Apply to V10.1 dataset ===
const data = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
console.log('V10.1 dataset: ' + data.recipes.length + ' recipes');

// Step 1: Drop diydog + pilot (per Kaan decision)
const beforeCount = data.recipes.length;
data.recipes = data.recipes.filter(r => r.source !== 'diydog' && r.source !== 'pilot');
const afterDropCount = data.recipes.length;
console.log('Dropped diydog (243) + pilot (183) = ' + (beforeCount - afterDropCount) + ' recipes');
console.log('Remaining: ' + afterDropCount);

// Step 2: Cleanup yeast field
let cleaned = 0, became_empty = 0, unchanged = 0;
const beforeAfter = [];
for (const r of data.recipes) {
  const before = r.raw && r.raw.yeast;
  const beforeStr = Array.isArray(before) ? before.join(' | ') : String(before || '');
  const after = cleanYeastString(before);
  if (r.raw) r.raw.yeast = after;
  if (beforeStr.trim() === after) unchanged++;
  else if (!after && beforeStr) became_empty++;
  else if (after && after !== beforeStr.trim()) {
    cleaned++;
    if (beforeAfter.length < 20) beforeAfter.push({ source: r.source, source_id: r.source_id, before: beforeStr.slice(0, 100), after });
  }
}

console.log('\n=== Cleanup stats ===');
console.log('  unchanged:     ' + unchanged);
console.log('  cleaned:       ' + cleaned + ' (truncated/decoded)');
console.log('  became_empty:  ' + became_empty + ' (no salvageable strain ID)');

console.log('\n=== Sample before/after ===');
for (const x of beforeAfter.slice(0, 10)) {
  console.log('  [' + x.source + ':' + x.source_id + ']');
  console.log('    BEFORE: "' + x.before + '"');
  console.log('    AFTER:  "' + x.after + '"');
}

// Step 3: Re-classify yeast quality post-cleanup
function classifyYeast(rawYeast) {
  let y = rawYeast;
  if (Array.isArray(y)) y = y.join(' | ');
  const ys = String(y || '').trim();
  if (!ys) return 'empty';
  if (/^\[object\s*object\]$/i.test(ys)) return 'object_string';
  if (/<[a-z][^>]*>|&[a-z]+;|&#\d+;/i.test(ys)) return 'html_residue';
  if (ys.length > 200) return 'prose_paragraph';
  if (ys.length > 80 && (ys.match(/[.!?]\s+[a-zA-Z]/g) || []).length >= 2) return 'prose_paragraph';
  if (/^(wyeast|wlp|white\s*labs|safale|safbrew|saflager|lallemand|lalbrew|fermentis|imperial|omega)$/i.test(ys)) return 'name_only';
  if (ys.length <= 80) return 'clean';
  return 'medium_freeform';
}
const buckets = {};
for (const r of data.recipes) {
  const p = classifyYeast(r.raw && r.raw.yeast);
  buckets[p] = (buckets[p] || 0) + 1;
}
console.log('\n=== Post-cleanup pattern aggregate (' + data.recipes.length + ' total) ===');
for (const [p, n] of Object.entries(buckets).sort((a,b)=>b[1]-a[1])) {
  console.log('  ' + p.padEnd(20) + n.toString().padStart(5) + ' (' + (100*n/data.recipes.length).toFixed(2) + '%)');
}

// Step 4: Brett/Lacto coverage re-measure
const PATTERNS_BIO = {
  brett: { ids: ['wyeast 5526','wy5526','wyeast 5112','wy5112','wyeast 5733','wy5733','wyeast 5151','wy5151','wyeast 5378','wy5378','wlp650','wlp 650','wlp653','wlp 653','wlp655','wlp 655','wlp645','wlp 645','wlp644','wlp 644','wlp4639'], keyword: /brett(anomyces)?\b/i },
  lacto: { ids: ['wyeast 5335','wy5335','wyeast 5223','wy5223','wyeast 5424','wy5424','wlp677','wlp 677','wlp672','wlp 672','wlp693','wildbrew sour'], keyword: /lacto(bacillus)?\b/i },
  pedio: { ids: ['wlp661','wlp 661','wyeast 5733','wy5733'], keyword: /pedio(coccus)?\b/i },
  sour_blend: { ids: ['wyeast 3278','wy3278','wlp655','wlp 655','wlp665','wlp 665','wyeast 5278','wy5278','sourvisiae','melange'], keyword: /(sour|lambic|funk).*(blend|mix)|(blend|mix).*(sour|lambic|funk)/i },
  belgian: { ids: ['wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388','wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565','wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590','safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison'], keyword: /(abbey|trappist|abbaye|monastic|tripel|dubbel|saison|witbier)/i },
  clean_us05: { ids: ['wyeast 1056','wy1056','wlp001','wlp 001','safale us-05','safale us05','us-05','us05','bry-97','bry97','chico'], keyword: null }
};
function matchPattern(yLower, p) {
  for (const id of p.ids) if (yLower.includes(id)) return true;
  if (p.keyword && p.keyword.test(yLower)) return true;
  return false;
}
const matches = {};
for (const k of Object.keys(PATTERNS_BIO)) matches[k] = { count: 0, by_main_cat: {} };
for (const r of data.recipes) {
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
console.log('\n=== Yeast pattern coverage POST-cleanup (' + data.recipes.length + ') ===');
for (const [k, v] of Object.entries(matches)) {
  console.log('  ' + k.padEnd(15) + v.count.toString().padStart(4) + ' (' + (100*v.count/data.recipes.length).toFixed(2) + '%)');
}

console.log('\n=== Brett by cluster ===');
Object.entries(matches.brett.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(35)+v));
console.log('\n=== Lacto by cluster ===');
Object.entries(matches.lacto.by_main_cat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(35)+v));

// Save cleaned dataset (V12 base)
data.meta.generated = new Date().toISOString();
data.meta.regex_version = data.meta.regex_version + '+v12clean';
data.meta.total_recipes = data.recipes.length;
// Recompute sources
data.meta.sources = {};
for (const r of data.recipes) data.meta.sources[r.source] = (data.meta.sources[r.source] || 0) + 1;
fs.writeFileSync('_ml_dataset_v12_pre_retrain.json', JSON.stringify(data, null, 2));
console.log('\nWrote _ml_dataset_v12_pre_retrain.json (' + (JSON.stringify(data).length/1024/1024).toFixed(1) + ' MB)');

// Save cleanup audit JSON
fs.writeFileSync('_a48_cleanup_audit.json', JSON.stringify({ before_count: beforeCount, after_drop: afterDropCount, cleaned, became_empty, unchanged, post_buckets: buckets, post_yeast_coverage: matches, beforeAfterSample: beforeAfter }, null, 2));
console.log('Wrote _a48_cleanup_audit.json');
