// V3 motoru HTML'e enjekte et (idempotent: eski V3 varsa sil, yeniden ekle).
// Ayrica adapter snippet'i V2 adapter'in hemen altina ekle.
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, 'Brewmaster_v2_79_10.html');
const V3_SNIPPET = fs.readFileSync(path.join(__dirname, '_inline_v3_snippet.html'), 'utf8');
const V3_ADAPTER = fs.readFileSync(path.join(__dirname, '_adapter_v3_snippet.js'), 'utf8');

let html = fs.readFileSync(HTML, 'utf8');

// 1) Mevcut <script id="bm-engine-v3"> varsa sil
html = html.replace(/<script id="bm-engine-v3">[\s\S]*?<\/script>\n?/, '');

// 2) V2c script'in kapanisindan hemen sonra V3'u ekle
const V2C_CLOSE = '</script>\n';
const v2cIdx = html.indexOf('<script id="bm-engine-v2c">');
if (v2cIdx < 0) throw new Error('bm-engine-v2c bulunamadi');
const v2cCloseIdx = html.indexOf(V2C_CLOSE, v2cIdx);
if (v2cCloseIdx < 0) throw new Error('bm-engine-v2c kapanisi bulunamadi');
const insertAt = v2cCloseIdx + V2C_CLOSE.length;
html = html.slice(0, insertAt) + V3_SNIPPET + '\n' + html.slice(insertAt);

// 3) V2 adapter sonrasina V3 adapter ekle (idempotent)
html = html.replace(/\n  \/\/ ══ FAZ 4 — V3 Hiyerarşik motor paralel cagrisi[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V3\] motor hatasi:', e && e\.message\); \}\n/, '\n');

const V2_ADAPTER_TAIL = "} catch(e) { console.warn('[BM V2c] motor hatasi:', e && e.message); }";
const v2AdapterIdx = html.indexOf(V2_ADAPTER_TAIL);
if (v2AdapterIdx < 0) throw new Error('V2 adapter tail bulunamadi');
const afterV2 = v2AdapterIdx + V2_ADAPTER_TAIL.length;
html = html.slice(0, afterV2) + '\n' + V3_ADAPTER + html.slice(afterV2);

fs.writeFileSync(HTML, html);
console.log('✓ HTML guncellendi. Yeni boyut: ' + fs.statSync(HTML).size + ' bytes');
