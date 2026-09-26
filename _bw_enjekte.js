// SPRINT BW — AI altyapısı (BYOK) modülünü HTML'e göm. Kaynak: working/_bw_modul.js. ASSERT-ONCE; tek FAIL = yazım YOK.
'use strict';
const fs = require('fs');
const DOSYA = __dirname + '/Brewmaster_v2_79_10.html';
let html = fs.readFileSync(DOSYA, 'utf8');
const modul = fs.readFileSync(__dirname + '/working/_bw_modul.js', 'utf8');
const hata = [];
const say = (s, a) => s.split(a).length - 1;
if (say(html, 'window.BM_AI =') !== 0) hata.push('BM_AI zaten var (ikinci koşum?)');
const EOL = html.indexOf('\r\n') >= 0 ? '\r\n' : '\n';

// 1. modül: "// Ayarlar sekmesi render" + rStokAyarlar tanımının ÖNÜNE
const m1 = /\/\/ Ayarlar sekmesi render\r?\nwindow\.rStokAyarlar = function\(\)\{/g;
const e1 = html.match(m1) || [];
if (e1.length !== 1) hata.push('modül çapası ' + e1.length + ' kez');
else html = html.replace(m1, (x) => modul.replace(/\r?\n/g, EOL) + EOL + x);

// 2. kart: ℹ️ Uygulama kartının ÖNÜNE
const m2 = /( *)'<div class="bm-ayar-kart">'\+\r?\n *'<div class="bm-ayar-kart-baslik">ℹ️ Uygulama<\/div>'\+/g;
const e2 = html.match(m2) || [];
if (e2.length !== 1) hata.push('kart çapası ' + e2.length + ' kez');
else html = html.replace(m2, (x, girinti) => girinti + "window._bmAiKartHTML()+" + EOL + x);

if (hata.length) { console.error('[BW ENJEKTE ABORT] dosya YAZILMADI:\n  ' + hata.join('\n  ')); process.exit(1); }
fs.writeFileSync(DOSYA, html);
console.log('[BW ENJEKTE] modül ' + modul.split('\n').length + ' satır + kart çağrısı 1');
