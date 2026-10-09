// ═══ SPRINT ISK2 madde 3 — EKSİK ALIAS (BV kuralı: alias = KİMLİK, ikame değil) ═══
// Örnek verisinde kataloğa eşlenemeyen ama TEK ürünü adlandıran yazımlar. Üretici + ürün adı katalog kaydıyla birebir olanlar alınır.
// ALINMAYANLAR (belirsiz — rol düzeyi eşlemeye bırakıldı): "carafa ii malt" (Weyermann hem kabuklu Carafa Type 2 hem Carafa Special Type 2
// satar), "caramunich malt" (I/II/III), "crystal malt" (°L yok), "best heidelberg malt" (BestMalz'ın Heidelberg pilsen'i mi pale ale'i mi),
// yazım hataları ("melanoiden", "weyermenn"), katalogda olmayan malthaneler (Rahr, Great Western, Mecca Grade, Fawcett golden promise…).
//   node _isk2_alias.js → kuru çalıştırma     node _isk2_alias.js --yaz → HTML'e yazar (idempotent)
'use strict';
const fs = require('fs'), vm = require('vm'), HF = __dirname + '/Brewmaster_v2_79_10.html', YAZ = process.argv.includes('--yaz');
const EK = [
  ['best_heidel_wheat', 'best heidelberg wheat malt'], ['best_redx', 'bestmalz red x malt'], ['muntons_propino', 'muntons propino pale malt'],
  ['viking_xpa', 'viking xtra pale malt'], ['chateau_bld', 'chateau pale malt'], ['dehusked_black', 'briess blackprinz malt'],
  ['cara_hell', 'cara-hell malt'], ['cara_foam', 'cara-foam malt'], ['smoked', 'weyermann beech smoked barley malt']
];
let s = fs.readFileSync(HF, 'utf8');
const mb = s.indexOf('const MALTLAR=[') >= 0 ? s.indexOf('const MALTLAR=[') : s.indexOf('const MALTLAR = [');
const esle = (p, ac, kp) => { let d = 0, str = false; for (let x = p; x < s.length; x++) { const c = s[x]; if (str) { if (c === '\\') x++; else if (c === '"') str = false; continue; } if (c === '"') str = true; else if (c === ac) d++; else if (c === kp) { d--; if (!d) return x; } } return -1; };
const me = esle(s.indexOf('[', mb), '[', ']');
const norm = v => String(v).toLowerCase().replace(/[®™©]/g, '').replace(/\s+/g, ' ').trim();
let n = 0;
EK.forEach(([id, al]) => {
  const a = s.indexOf('{id:"' + id + '",', mb); if (a < 0 || a > me) throw new Error('kayıt yok ' + id);
  const b = esle(a, '{', '}'); let e = s.slice(a, b + 1);
  if (e.indexOf(JSON.stringify(al)) >= 0) return; // idempotent
  const ai = e.indexOf('alias:[');
  if (ai >= 0) { const ae = e.indexOf(']', ai); e = e.slice(0, ae) + (e.slice(ai + 7, ae).trim() ? ',' : '') + JSON.stringify(al) + e.slice(ae); }
  else e = e.slice(0, -1) + ',alias:[' + JSON.stringify(al) + ']}';
  s = s.slice(0, a) + e + s.slice(b + 1); n++;
});
// doğrulama: her ad/alias TEK kayda çözülür, yeni alias'lar doğru kayda
const M = vm.runInNewContext('(' + s.slice(s.indexOf('[', mb), esle(s.indexOf('[', mb), '[', ']') + 1) + ')'), sah = {};
M.forEach(m => { if (!m) return; [m.ad].concat(m.alias || []).forEach(x => { const k = norm(x); (sah[k] = sah[k] || new Set()).add(m.id); }); });
EK.forEach(([id, al]) => { const z = sah[norm(al)]; if (!z || z.size !== 1 || !z.has(id)) { console.error('ABORT çakışma/eksik ' + al + ' → ' + (z ? [...z] : '-')); process.exit(1); } });
console.log('eklenen ' + n + ' / ' + EK.length);
if (YAZ) { fs.writeFileSync(HF, s); console.log('[yazıldı]'); }
