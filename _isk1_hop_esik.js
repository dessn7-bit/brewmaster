// ═══ SPRINT ISK1 madde 7 — HOP ✅ EŞİĞİ (KAT1 takibi) ═══
// Kural: ✅ için yetiştirici/üretici veri sayfası (Hopsteiner, YCH, BarthHaas, Yakima Chief) YA DA en az 2 bağımsız kaynak.
// KAT1'de yalnız Charles Faram (tüccar, 2022 web arşivi) listesine dayanan ✅'ler: ikinci bağımsız kaynak bulunan 7 çift ✅ kalır
// (kaynak2 alanı + fark metninde), bulunamayan 4 çift ⚠️'e iner. Hopunion (YCH öncülü tedarikçi) sayfaları; BYO hop tablosu Hopunion
// metninin kopyası olduğu için AYRI kaynak sayılmadı. Hopsteiner Fuggle sayfasındaki "Styrian Golding (Celeia)" Savinjski değil → kullanılmadı.
//   node _isk1_hop_esik.js         → kuru çalıştırma (doğrulama)    node _isk1_hop_esik.js --yaz → HTML'e yazar (idempotent)
'use strict';
const fs = require('fs'), vm = require('vm'), HF = __dirname + '/Brewmaster_v2_79_10.html', YAZ = process.argv.includes('--yaz');
const T = '[ISK1 hop eşiği]';
const KAL = [ // hedef, ikame, kaynak2 url, birebir alıntı, not
  ['cascade', 'amarillo', 'https://web.archive.org/web/20020613084403/http://www.hopunion.com:80/hvcb/cascade.htm', 'Possible Substitutions Centennial, Amarillo, possibly Columbus.', 'Hopunion Cascade sayfası (2002 arşivi)'],
  ['amarillo', 'cascade', 'https://web.archive.org/web/20140209120232/http://hopunion.com/amarillo-brand-vgxp01-cv/', 'Possible Substitutions Cascade Centennial Simcoe®', 'Hopunion Amarillo sayfası (2014 arşivi)'],
  ['fuggles', 'styrian', 'https://web.archive.org/web/20150111024202/http://hopunion.com/uk-fuggle/', 'Possible Substitutions Fuggle Willamette Styrian Savinjski Golding', 'Hopunion UK Fuggle sayfası (2015 arşivi)'],
  ['styrian', 'willamette', 'https://web.archive.org/web/20020617143740/http://www.hopunion.com:80/hvcb/styriangolding.htm', 'Possible Substitutions U.S. Fuggle, Willamette, UK Fuggle', 'Hopunion Styrian Golding sayfası (2002 arşivi; 2015 sayfasında Willamette yok)'],
  ['challenger', 'nbrewer', 'https://web.archive.org/web/20150111023721/http://hopunion.com/uk-challenger/', 'Possible Substitutions Northern Brewer German Perle', 'Hopunion UK Challenger sayfası (2015 arşivi)'],
  ['challenger', 'perle', 'https://web.archive.org/web/20150111023721/http://hopunion.com/uk-challenger/', 'Possible Substitutions Northern Brewer German Perle', 'Hopunion UK Challenger sayfası (2015 arşivi)'],
  ['willamette', 'tettn', 'https://pim.hopsteiner.de/api/v1/en/varieties/wil.pdf', 'SUBSTITUTES BREWHOUSE Fuggle Tettnanger Delta Bobek', 'Hopsteiner Willamette veri sayfası (yetiştirici)']
];
const IN = [ // ⚠️'e inenler: neden
  ['fuggles', 'progress', 'ikinci kaynak yalnız TERS yönde listeler (Hopunion Progress: "Possible Substitutions: UK Kent Golding, Fuggle")'],
  ['mosaic', 'citra', 'ikinci kaynakta ikame listesi yok, yalnız benzerlik ifadesi (BarthHaas: "Similar to Citra® and Cascade")'],
  ['idaho7', 'calypso', 'ikinci kaynak bulunamadı (Hopsteiner Calypso, YCH Idaho 7, BYO)'],
  ['pac_gem', 'columbus', 'ikinci kaynak bulunamadı (Hopunion ve BYO Pacific Gem için Galena verir)']
];
let s = fs.readFileSync(HF, 'utf8'); const q = v => JSON.stringify(v);
const mb = s.indexOf('const MUADIL={');
const esle = (p, ac, kp) => { let d = 0, str = false; for (let x = p; x < s.length; x++) { const c = s[x]; if (str) { if (c === '\\') x++; else if (c === '"') str = false; continue; } if (c === '"') str = true; else if (c === ac) d++; else if (c === kp) { d--; if (!d) return x; } } return -1; };
const giris = (k, sub) => { const kb = s.indexOf('\n  "' + k + '":[', mb); if (kb < 0) throw new Error('anahtar yok ' + k); const as = s.indexOf('[', kb), ae = esle(as, '[', ']');
  const li = s.slice(as, ae).indexOf('{id:"' + sub + '",'); if (li < 0) throw new Error('giriş yok ' + k + '→' + sub); const a = as + li, b = esle(a, '{', '}'); return [a, b]; };
let n = 0;
KAL.forEach(([k, sub, url, al, ad]) => { const [a, b] = giris(k, sub); let e = s.slice(a, b + 1); if (e.indexOf('kaynak2:') >= 0) return;
  if (e.indexOf('[KAT1 hop kaynak]') < 0) throw new Error('KAT1 girişi değil ' + k + '→' + sub);
  const fm = /fark:"((?:[^"\\]|\\.)*)"/.exec(e); const f = JSON.parse('"' + fm[1] + '"'); if (f.trim().indexOf('✅') !== 0) throw new Error('✅ değil ' + k + '→' + sub);
  e = e.replace(fm[0], () => 'fark:' + q(f + ' · 2. kaynak: ' + ad + ' ' + T)); e = e.slice(0, -1) + ',kaynak2:{url:' + q(url) + ',alinti:' + q(al) + '}}'; s = s.slice(0, a) + e + s.slice(b + 1); n++; });
IN.forEach(([k, sub, ned]) => { const [a, b] = giris(k, sub); let e = s.slice(a, b + 1); const fm = /fark:"((?:[^"\\]|\\.)*)"/.exec(e); const f = JSON.parse('"' + fm[1] + '"');
  if (f.indexOf(T) >= 0) return; if (f.trim().indexOf('✅') !== 0) throw new Error('✅ değil ' + k + '→' + sub);
  e = e.replace(fm[0], () => 'fark:' + q('⚠️' + f.trim().slice(1) + ' · ' + T + ' tek tüccar listesi: ' + ned + ' → ✅ yerine ⚠️.')); s = s.slice(0, a) + e + s.slice(b + 1); n++; });
// doğrulama
let dd = 0, jj = mb + 13; for (; jj < s.length; jj++) { if (s[jj] === '{') dd++; else if (s[jj] === '}') { dd--; if (!dd) break; } }
const MU = vm.runInNewContext('(' + s.slice(mb + 13, jj + 1) + ')');
const E = (k, id) => MU[k].filter(x => x.id === id);
KAL.forEach(([k, sub]) => { const L = E(k, sub); if (L.length !== 1 || L[0].fark.trim().indexOf('✅') !== 0 || !L[0].kaynak2 || !L[0].kaynak2.url) { console.error('ABORT doğrulama ' + k + '→' + sub); process.exit(1); } });
IN.forEach(([k, sub]) => { const L = E(k, sub); if (L.length !== 1 || L[0].fark.trim().indexOf('⚠️') !== 0 || L[0].fark.indexOf(T) < 0) { console.error('ABORT doğrulama ' + k + '→' + sub); process.exit(1); } });
console.log('değişiklik ' + n + ' / ' + (KAL.length + IN.length));
if (YAZ) { fs.writeFileSync(HF, s); console.log('[yazıldı]'); }
