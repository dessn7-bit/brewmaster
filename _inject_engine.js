// HTML'e motor + adapter snippet enjekte et
const fs = require('fs');
const path = require('path');

const htmlPath     = path.join(__dirname, 'Brewmaster_v2_79_10.html');
const enginePath   = path.join(__dirname, '_inline_snippet.html');
const adapterPath  = path.join(__dirname, '_adapter_snippet.js');

let html = fs.readFileSync(htmlPath, 'utf8');
const engineBlock  = fs.readFileSync(enginePath, 'utf8');
const adapterBlock = fs.readFileSync(adapterPath, 'utf8');

// Onceki enjeksiyonu temizle (idempotent)
html = html.replace(/<script id="bm-engine-v2c">[\s\S]*?<\/script>\n?/g, '');
html = html.replace(/\s*\/\/ ══ FAZ 2c — Yeni motor paralel cagrisi[\s\S]*?console\.warn\('\[BM V2c\] motor hatasi:', e && e\.message\); \}\n/g, '');

// ENJEKSIYON 1: <script> etiketinden once motor blogunu ekle
const marker1 = '<div id="ekran"></div>\n<script>';
if (!html.includes(marker1)) { console.error('Marker 1 bulunamadi!'); process.exit(1); }
html = html.replace(marker1, '<div id="ekran"></div>\n' + engineBlock + '\n<script>');

// ENJEKSIYON 2: _hibritSorted.sort + BJCP override blogundan sonra adapter
// Marker: "if (enIyi.uyum >= 3 || enIyi.skor > -10) stil_tah = enIyi.stil;\n  }"
const marker2 = 'if (enIyi.uyum >= 3 || enIyi.skor > -10) stil_tah = enIyi.stil;\n  }';
if (!html.includes(marker2)) { console.error('Marker 2 bulunamadi!'); process.exit(1); }
html = html.replace(marker2, marker2 + '\n' + adapterBlock);

fs.writeFileSync(htmlPath, html);
console.log('Yeni HTML boyutu:', (html.length/1024/1024).toFixed(2), 'MB');
console.log('Enjeksiyon tamam. Grep ile dogrulama:');
console.log('  bm-engine-v2c:', (html.match(/bm-engine-v2c/g)||[]).length, 'kere');
console.log('  BM V2c marker:', (html.match(/BM V2c/g)||[]).length, 'kere');
console.log('  window.BM_ENGINE:', (html.match(/window\.BM_ENGINE/g)||[]).length, 'kere');
