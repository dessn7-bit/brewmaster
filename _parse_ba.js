const fs = require('fs');
const raw = fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\BA_2026_raw.txt', 'utf8');

const bodyMarkerRe = /^\s*ALE STYLES\s*$/m;
const bodyStart = raw.search(bodyMarkerRe);
if (bodyStart < 0) { console.error('ALE STYLES marker not found'); process.exit(1); }
const body = raw.slice(bodyStart);
const lines = body.split(/\r?\n/);

// Identify category headers (ALL CAPS lines that aren't style names) and page markers
function isPageMarker(s) { return /^--\s*\d+\s*of\s*\d+\s*--/.test(s); }
function isAllCaps(s) { return /[A-Z]/.test(s) && s === s.toUpperCase() && !/[a-z]/.test(s); }
function isBlank(s) { return !s.trim(); }
function isPageNumber(s) { return /^\d+$/.test(s.trim()) && s.trim().length <= 3; }
function isToc(s) { return /\.{5,}/.test(s); }
function isSkipLine(s) {
  const t = s.trim();
  return isBlank(t) || isPageMarker(t) || isPageNumber(t) || isToc(t) || isAllCaps(t);
}
function isStatsFragment(s) {
  const t = s.trim();
  return /Original Gravity|Hop Bitterness|Color SRM|Alcohol by Weight|°Plato|EBC\)|\(IBU\)|\(Volume\)|\d+(\.\d+)?%\s*[-–]\s*\d+(\.\d+)?%/.test(t);
}
function isSkipOrStats(s) { return isSkipLine(s) || isStatsFragment(s); }

// For each "Color:" line, backtrack to find style name (possibly multi-line)
const stats = [];
let idx = 0;
while (idx < lines.length) {
  if (/Original Gravity/.test(lines[idx])) {
    let buf = [];
    let j = idx;
    let last = idx;
    while (j < lines.length && j < idx + 20) {
      const L = lines[j];
      if (isBlank(L) || isPageMarker(L) || isPageNumber(L)) { j++; continue; }
      buf.push(L);
      last = j;
      if (/EBC\)\s*$/.test(L.trim())) break;
      j++;
    }
    j = last;
    const joined = buf.join(' ').replace(/\s+/g, ' ').trim();
    const ogM = joined.match(/Original Gravity[^)]*\)\s*(1\.\d{3})\s*[-–]\s*(1\.\d{3})/);
    const fgM = joined.match(/Final Gravity[^)]*\)\s*(1\.\d{3})\s*[-–]\s*(1\.\d{3})/);
    const abvM = joined.match(/Alcohol by Weight \(Volume\)\s*[\d.]+%?\s*[-–]\s*[\d.]+%\s*\((\d+(?:\.\d+)?)%\s*[-–]\s*(\d+(?:\.\d+)?)%\)/);
    const ibuM = joined.match(/Hop Bitterness \(IBU\)\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    const srmM = joined.match(/Color SRM \(EBC\)\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    stats.push({
      startLine: idx,
      og: ogM ? [parseFloat(ogM[1]), parseFloat(ogM[2])] : null,
      fg: fgM ? [parseFloat(fgM[1]), parseFloat(fgM[2])] : null,
      abv: abvM ? [parseFloat(abvM[1]), parseFloat(abvM[2])] : null,
      ibu: ibuM ? [parseFloat(ibuM[1]), parseFloat(ibuM[2])] : null,
      srm: srmM ? [parseFloat(srmM[1]), parseFloat(srmM[2])] : null,
    });
    idx = j + 1;
  } else {
    idx++;
  }
}

// For each stats, find style name — may span up to 2 lines
function findStyleName(startIdx) {
  // Go up to find "Color:" line (first descriptor in style body)
  let k = startIdx - 1;
  while (k >= 0 && !/^Color\s*:/.test(lines[k].trim())) {
    k--;
    if (startIdx - k > 200) return null;
  }
  if (k < 0) return null;

  // Find the primary (nearest non-skip/non-stats) line above "Color:"
  let i = k - 1;
  while (i >= 0 && isSkipOrStats(lines[i])) i--;
  if (i < 0) return null;
  const primary = lines[i].trim();

  // Peek one more line up: if it's a continuation (ends with "-Style", "or", "&", ","), include
  let j = i - 1;
  while (j >= 0 && (lines[j].trim() === '' || isPageMarker(lines[j]) || isPageNumber(lines[j]))) j--;
  if (j >= 0) {
    const prev = lines[j].trim();
    const prevOk = !isStatsFragment(prev) && !isAllCaps(prev) && !isToc(prev);
    if (prevOk) {
      const prevEndsContinuable = /(-Style|\bor\b|&|,)\s*$/.test(prev);
      const primaryStartsCont = /^(or|and|&|,)\s+/i.test(primary);
      const primaryTooShort = primary.split(/\s+/).length <= 2 && /-Style/.test(prev);
      if (prevEndsContinuable || primaryStartsCont || primaryTooShort) {
        return (prev + ' ' + primary).replace(/\s+/g, ' ').trim();
      }
    }
  }
  return primary;
}

const styles = [];
for (const st of stats) {
  const name = findStyleName(st.startLine);
  styles.push({ name, ...st });
}

// Dedup and filter
const seen = new Map();
for (const s of styles) {
  if (!s.name) continue;
  const key = s.name.toLowerCase();
  if (!seen.has(key)) seen.set(key, s);
}

const out = [...seen.values()].map(s => ({
  name: s.name, og: s.og, fg: s.fg, abv: s.abv, ibu: s.ibu, srm: s.srm
}));

console.log('Stats blocks:', stats.length);
console.log('Unique styles:', out.length);
console.log('Missing OG:', out.filter(s=>!s.og).length);
console.log('Missing ABV:', out.filter(s=>!s.abv).length);
console.log('Missing SRM:', out.filter(s=>!s.srm).length);

fs.writeFileSync('C:\\Users\\Kaan\\brewmaster\\BA_2026_styles.json', JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote BA_2026_styles.json');

// Key focus check
console.log('\nKaan focus:');
['Hefeweizen','Dubbel','Tripel','Quadrupel','Witbier','Weizen','Weizenbock','Saison','Oud','Rauchbier'].forEach(f => {
  const hits = out.filter(s => s.name.toLowerCase().includes(f.toLowerCase()));
  hits.forEach(h => console.log(' ', f, '→', h.name, '| OG', h.og, '| ABV', h.abv, '| IBU', h.ibu, '| SRM', h.srm));
});
