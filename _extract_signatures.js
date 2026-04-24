const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\Brewmaster_v2_79_10.html', 'utf8');

const startMarker = 'const STIL_SIGNATURES = {';
const i0 = html.indexOf(startMarker);
if (i0 < 0) { console.error('STIL_SIGNATURES start not found'); process.exit(1); }
// End is the first top-level "\n};" after i0
// STIL_SIGNATURES is ~420 lines. Find the next "\n};" that's followed by blank/newline/"const" etc.
let i = i0 + startMarker.length;
let depth = 1;
while (i < html.length && depth > 0) {
  const ch = html[i];
  // Skip strings (both single and double quote, no heredocs here)
  if (ch === '"' || ch === "'") {
    const q = ch;
    i++;
    while (i < html.length && html[i] !== q) {
      if (html[i] === '\\') i += 2; else i++;
    }
    i++;
    continue;
  }
  // Skip regex literals /.../.flags (approximate)
  if (ch === '/') {
    // Check previous non-space: if previous char makes regex context
    // Simple heuristic: regex follows '[,:({=\n'
    let p = i - 1;
    while (p >= 0 && /\s/.test(html[p])) p--;
    const prev = p >= 0 ? html[p] : '\n';
    if ('[,:({=|&!?\n'.includes(prev)) {
      i++;
      while (i < html.length && html[i] !== '/') {
        if (html[i] === '\\') i += 2;
        else if (html[i] === '\n') break;
        else i++;
      }
      i++;
      // Skip regex flags
      while (i < html.length && /[gimsuy]/.test(html[i])) i++;
      continue;
    }
  }
  // Skip line comments
  if (ch === '/' && html[i+1] === '/') {
    while (i < html.length && html[i] !== '\n') i++;
    continue;
  }
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
  if (depth === 0) { i++; break; }
  i++;
}
const endIdx = i;
const block = html.substring(i0, endIdx);
console.log('Block length:', block.length);

// Eval block and expose SIGS
const modified = block.replace('const STIL_SIGNATURES =', 'globalThis.SIGS =') + ';';
try { (0, eval)(modified); } catch(e) { console.error('Eval error:', e.message); process.exit(1); }
const SIGS = globalThis.SIGS;
console.log('Unique sig styles:', Object.keys(SIGS).length);

// Convert regexes to serializable
function convert(obj) {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof RegExp) return { __regex: obj.source, flags: obj.flags };
  if (Array.isArray(obj)) return obj.map(convert);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = convert(obj[k]);
    return out;
  }
  return obj;
}
const serialized = convert(SIGS);
fs.writeFileSync('C:\\Users\\Kaan\\brewmaster\\BM_signatures.json', JSON.stringify(serialized, null, 2), 'utf8');
console.log('Wrote BM_signatures.json');

// Sanity — print one Hefeweizen-like entry
for (const name of ['Hefeweizen', 'Weizen / Weissbier', 'Belgian Witbier', 'Dubbel']) {
  if (serialized[name]) {
    console.log('\n--', name, '--');
    console.log(JSON.stringify(serialized[name], null, 2));
  }
}
