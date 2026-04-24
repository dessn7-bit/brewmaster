const fs = require('fs');
const raw = fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\BJCP_2021_raw.txt', 'utf8');
const lines = raw.split(/\r?\n/);

// Style title patterns in BJCP 2021:
//   "<num><letter>. <name>"      e.g. 1A. American Light Lager, 21C. Hazy IPA, 26B. Belgian Dubbel
//   "Specialty IPA: <name>"      e.g. Specialty IPA: Belgian IPA
//   "Historical Beer: <name>"    e.g. Historical Beer: Kellerbier
//   "X<num>. <name>"             e.g. X1. Dorada Pampeana (Appendix B)
//   "Specialty Wood-Aged ..."    via 33B sub-variants... but these live under their own <num><letter>
const titleRe1 = /^(\d{1,2}[A-Z])\.\s+(.+)$/;
const titleRe2 = /^(Specialty IPA|Historical Beer):\s+(.+)$/;
const titleRe3 = /^(X\d{1,2})\.\s+(.+)$/;

function findStyles() {
  const styles = [];
  // We only care about lines AFTER table-of-contents (before page 5 ~= line 240)
  // TOC entries contain "..............." or trailing page numbers. Skip those.
  for (let i = 240; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;
    if (/\.{5,}/.test(s)) continue; // TOC dotted
    if (/^--\s*\d+\s*of\s*\d+\s*--/.test(s)) continue; // page marker
    let m = s.match(titleRe1) || s.match(titleRe2) || s.match(titleRe3);
    if (!m) continue;
    // Guard: next few lines must include "Overall Impression:" or "Aroma:" to confirm this is a style body
    let bodyStart = -1;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      if (/^(Overall Impression|Aroma|Appearance):/i.test(lines[j].trim())) { bodyStart = j; break; }
    }
    if (bodyStart < 0) continue;
    styles.push({ titleLine: i, code: m[1], name: m[2].trim().replace(/\s+/g, ' ') });
  }
  return styles;
}

const rawStyles = findStyles();

// Each style spans from its titleLine until next style's titleLine (or EOF)
// Find Vital Statistics block inside each style range
function extractVitals(fromLine, toLine) {
  const block = lines.slice(fromLine, toLine).join('\n');
  const m = /Vital Statistics:[\s\S]{0,800}?Commercial Examples/i.exec(block);
  let chunk = m ? m[0] : '';
  // Clean spaces, en/em dashes
  chunk = chunk.replace(/\s+/g, ' ').replace(/[‐-―]/g, '-');
  const og  = chunk.match(/OG:\s*(\d\.\d{3})\s*[-]\s*(\d\.\d{3})/);
  const fg  = chunk.match(/FG:\s*(\d\.\d{3})\s*[-]\s*(\d\.\d{3})/);
  const ibu = chunk.match(/IBUs?:\s*(\d+(?:\.\d+)?)\s*[-]\s*(\d+(?:\.\d+)?)/);
  const srm = chunk.match(/SRM:\s*(\d+(?:\.\d+)?)\s*[-]\s*(\d+(?:\.\d+)?)/);
  const abv = chunk.match(/ABV:\s*(\d+(?:\.\d+)?)\s*[-]\s*(\d+(?:\.\d+)?)\s*%/);
  return {
    og:  og  ? [+og[1], +og[2]]   : null,
    fg:  fg  ? [+fg[1], +fg[2]]   : null,
    ibu: ibu ? [+ibu[1], +ibu[2]] : null,
    srm: srm ? [+srm[1], +srm[2]] : null,
    abv: abv ? [+abv[1], +abv[2]] : null,
  };
}

const styles = [];
for (let i = 0; i < rawStyles.length; i++) {
  const cur = rawStyles[i];
  const nxt = rawStyles[i+1]?.titleLine ?? lines.length;
  const v = extractVitals(cur.titleLine, nxt);
  styles.push({ code: cur.code, name: cur.name, ...v });
}

// Filter out dupes (TOC entries snuck in) by checking duplicates
const seen = new Map();
for (const s of styles) {
  const k = s.code + '|' + s.name;
  if (!seen.has(k)) seen.set(k, s);
}
const uniq = [...seen.values()];

console.log('Total style titles matched:', rawStyles.length);
console.log('Unique styles (code+name):', uniq.length);
console.log('Missing OG:', uniq.filter(s=>!s.og).length);
console.log('Missing FG:', uniq.filter(s=>!s.fg).length);
console.log('Missing IBU:', uniq.filter(s=>!s.ibu).length);
console.log('Missing SRM:', uniq.filter(s=>!s.srm).length);
console.log('Missing ABV:', uniq.filter(s=>!s.abv).length);

// Dump
fs.writeFileSync('C:\\Users\\Kaan\\brewmaster\\BJCP_2021_styles.json', JSON.stringify(uniq, null, 2), 'utf8');
console.log('Wrote BJCP_2021_styles.json');

// Sanity sample: first + last 5 + Kaan focus
console.log('\nFirst 10:');
uniq.slice(0, 10).forEach(s => console.log(' ', s.code, '|', s.name, '| OG', s.og, '| ABV', s.abv, '| IBU', s.ibu, '| SRM', s.srm));

console.log('\nKaan focus (weizen/dubbel/weizenbock/witbier):');
uniq.filter(s => /weizen|weissbier|weissenbock|dubbel|tripel|quadrupel|witbier/i.test(s.name))
    .forEach(s => console.log(' ', s.code, '|', s.name, '| OG', s.og, '| ABV', s.abv, '| IBU', s.ibu, '| SRM', s.srm));

console.log('\nLast 5:');
uniq.slice(-5).forEach(s => console.log(' ', s.code, '|', s.name, '| OG', s.og, '| ABV', s.abv, '| IBU', s.ibu, '| SRM', s.srm));

// List styles with empty vitals (= probably Specialty/Experimental)
console.log('\nStyles with empty vitals:');
uniq.filter(s => !s.og && !s.ibu && !s.abv).forEach(s => console.log(' ', s.code, '|', s.name));
