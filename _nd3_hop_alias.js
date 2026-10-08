// ═══ SPRINT ND3 — ÖRNEK VERİSİNDEKİ HOP YAZIMLARI → KATALOG ALIAS'I (BV kuralıyla, build-time) ═══
// ALIAS = KİMLİK ("bu ham ad BU katalog kaydını adlandırır"), İKAME DEĞİL. Katalogda olmayan çeşit (Hersbrucker, Mt. Hood,
// Cluster, Liberty, Crystal, Sorachi Ace…) başka hopa BAĞLANMAZ — rapora "katalogda yok" yazılır.
// Yöntem: ham ad (örnek verisinde birebir geçen yazım) → ÇEKİRDEK: yalnız biçim / zamanlama / oran gürültüsü atılır
// ("pellets", "whole", "leaf", "(dry)", "(90 min.)", "2.6%", "T45", "(14 g)"…). Çekirdek, TEK katalog kaydının mevcut
// ad'ına ya da (BV'nin kabul ettiği) alias'ına birebir eşit olmalı (tekil/çoğul "golding(s)" toleransı + yazım düzeltmesi
// "e.k." → "east kent", "mittlefruh" → "mittelfruh"). Ülke öneki (german / czech / english / us / slovenian / wye) yalnız
// kaydın kökeniyle (HOPLAR.g) UYUŞUYORSA atılır — "german saaz" (Saaz = Çek), "us goldings" (EKG = İngiliz) BAĞLANMAZ.
// RED (ayrı ürün / terroir / işlem): aged, homegrown, fresh, wet, nz / new zealand, argentin, incognito, cgx, lupo, lupulin,
// powder, hash, extract; "cryo" yalnız katalogdaki Cryo Citra / Cryo Mosaic kaydına. BV REDDET hop listesi aynen uygulanır.
// KAPI: K1 hedef var · K2 ham ad başka kaydın ad'ı/alias'ı değil · K4 ham ad örnek verisinde görülmüş (yapı gereği).
// Kullanım: node _nd3_hop_alias.js         → rapor (working/_nd3_hop_alias_rapor.json, yazma yok)
//           node _nd3_hop_alias.js --yaz   → HOPLAR satırlarına ekler (ASSERT; tek hata = yazım yok). İdempotent.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html'), VF = path.join(__dirname, 'ornek_veri.js');
const YAZ = process.argv.includes('--yaz');
const html = fs.readFileSync(HF, 'utf8');
function blokAl(ad) { const i = html.indexOf('const ' + ad + '=['); let d = 0, j = i + ad.length + 7; for (; j < html.length; j++) { if (html[j] === '[') d++; else if (html[j] === ']') { d--; if (d === 0) break; } } return vm.runInNewContext('(' + html.slice(i + ad.length + 7, j + 1) + ')'); }
const HOP = blokAl('HOPLAR');
const w = {}; fs.readFileSync(VF, 'utf8').split('\n').filter(l => /^window\.(_TOPLULUK_MADALYA|_NHC_MADALYA|_KAYNAKLI_ORNEK|_TOPLULUK_ORNEK) = /.test(l)).forEach(l => vm.runInNewContext(l, { window: w }));
const bvNorm = s => String(s == null ? '' : s).toLowerCase().replace(/[®™©]/g, '').replace(/[  -​ ]/g, ' ').replace(/\s+/g, ' ').trim();
const SOZ = new Map(); HOP.forEach(x => { if (!x) return; SOZ.set(bvNorm(x.ad), x.id); (x.alias || []).forEach(a => SOZ.set(bvNorm(a), x.id)); });
const KOKEN = {}; HOP.forEach(x => { if (x) KOKEN[x.id] = x.g; });
const BV_RED = require('./_bv_alias_kaynak.js').REDDET.hop || {};
// ── ham hop adları (frekans + kademe) ──
const ham = new Map();
function ekle(ad, k) { const n = bvNorm(ad); if (!n) return; const e = ham.get(n) || { n: 0, k: {} }; e.n++; e.k[k] = (e.k[k] || 0) + 1; ham.set(n, e); }
['_NHC_MADALYA', '_TOPLULUK_MADALYA'].forEach(t => Object.values(w[t] || {}).forEach(v => (v[1] || []).forEach(o => (o.h || []).forEach(h => ekle(h[0], 'K1')))));
['_KAYNAKLI_ORNEK', '_TOPLULUK_ORNEK'].forEach(t => Object.values(w[t] || {}).forEach(v => v.forEach(o => (o.h || []).forEach(h => ekle(h[0], o.k || 'K3')))));
// ── kurallar ──
const RED = /\b(aged|homegrown|home grown|home-grown|fresh|wet|nz|new zealand|argentin\w*|incognito|cgx|lupo\w*|lupulin|powder|hash|extract|spectrum|phantasm)\b|\bor\b|\//;
const ULKE = [[/^(german|germany|ger\.?|hallertau|hallertauer)\s+/, 'Alman'], [/^(czech|czech republic)\s+/, 'Çek'], [/^(english|uk|u\.k\.|british|wye)\s+/, 'İngiliz'],
  [/^(us|u\.s\.|american|usa)\s+/, 'Amerikan'], [/^(slovenian|slovenia|slovenija)\s+/, 'Slovenya'], [/^(polish)\s+/, 'Polonya'], [/^(australian)\s+/, 'Avustralya']];
// parantez içi: yalnız biçim / zaman / oran / ağırlık / kullanım ATILIR; ülke → köken kontrolü; başka her şey (çeşit adı
// "celeia", "whitbread golding variety", "nz cascade", "variety not specified"…) kimlik bilgisidir → BAĞLANMAZ
const PAREN_BICIM = /^(whole( leaf| cone)?|leaf|pellets?|cone|dry|dry hop|boil|~?\d+(\.\d+)?\s*(min\.?|minutes?|g|oz)|~?\d+(\.\d+)?\s*%( ?aa)?|optional)$/;
const PAREN_ULKE = [[/^(u\.s\.|us|usa|american)$/, 'Amerikan'], [/^(u\.k\.|uk|english|british)$/, 'İngiliz'], [/^(german|germany)$/, 'Alman'], [/^(czech)$/, 'Çek']];
function parenAyir(n) { let kok = null, kotu = null; (n.match(/\(([^)]*)\)/g) || []).forEach(p => { const c = p.slice(1, -1).trim(); if (PAREN_BICIM.test(c)) return; const u = PAREN_ULKE.find(([re]) => re.test(c)); if (u) kok = u[1]; else kotu = c; }); return { kok, kotu }; }
function cekirdek(n) {
  let s = n.replace(/\[|\]/g, ' ').replace(/\([^)]*\)/g, ' ').split(/\s,|,\s|,$/)[0];
  s = s.replace(/\bu\.s\.(?=\s)/g, 'us');
  s = s.replace(/\b\d+(\.\d+)?\s*%\s*(a\.?a\.?)?/g, ' ').replace(/\b(hop )?pellets?\b|\bwhole( leaf| cone)?\b|\bleaf\b|\bcones?\b|\bplugs?\b|\bt-?45\b|\bt-?90\b|\bhops?\b(?!\s*\w)/g, ' ');
  s = s.replace(/\be\.\s*k\.?|\be\.k\b|^ek\b|\be\.\s+kent\b/g, m => /kent/.test(m) ? 'east kent' : 'east kent').replace(/\beast kent kent\b/, 'east kent');
  s = s.replace(/mittlefr[uü]h/g, 'mittelfruh').replace(/’/g, "'");
  s = s.replace(/^kent english golding/, 'kent golding').replace(/^english kent golding/, 'kent golding').replace(/^select spalt$/, 'spalt select');
  return s.replace(/\s+/g, ' ').trim();
}
function bul(c) {
  const ad = [c, c.replace(/golding$/, 'goldings'), c.replace(/goldings$/, 'golding')];
  for (const a of ad) if (SOZ.has(a)) return SOZ.get(a);
  return null;
}
const sonuc = [], red = [], yok = new Map();
for (const [n, e] of ham) {
  if (SOZ.has(n)) continue; // zaten eşleniyor (BV)
  if (BV_RED[n]) { red.push([n, e.n, 'BV REDDET: ' + BV_RED[n]]); continue; }
  let hedef = null, neden = '';
  if (/\bcryo\b/.test(n)) { // cryo = ayrı ürün; yalnız katalogdaki Cryo kaydı
    const c = cekirdek(n).replace(/\bcryo\b/, '').trim(); hedef = c === 'citra' ? 'cc' : c === 'mosaic' ? 'cm' : null; neden = hedef ? 'cryo ürün' : 'cryo: katalogda bu çeşidin Cryo kaydı yok';
  } else if (RED.test(n)) { red.push([n, e.n, 'ayrı ürün / terroir / işlem / alternatifli ad']); continue; }
  else {
    const pa = parenAyir(n); if (pa.kotu) { red.push([n, e.n, 'parantez içi kimlik bilgisi: "' + pa.kotu + '"']); continue; }
    const c = cekirdek(n); hedef = bul(c); neden = 'biçim gürültüsü';
    if (hedef && pa.kok && KOKEN[hedef] !== pa.kok) { red.push([n, e.n, 'köken uyuşmaz (parantez): ' + KOKEN[hedef] + ' ≠ ' + pa.kok]); continue; }
    if (!hedef) for (const [re, kok] of ULKE) { if (!re.test(c)) continue; const c2 = c.replace(re, ''); const h = bul(c2); if (h && KOKEN[h] === kok) { hedef = h; neden = 'köken öneki (' + kok + ')'; } else if (h) { red.push([n, e.n, 'köken uyuşmaz: ' + KOKEN[h] + ' ≠ ' + kok]); hedef = 'RED'; } break; }
    if (hedef === 'RED') continue;
    if (!hedef) { yok.set(c, (yok.get(c) || 0) + e.n); continue; }
  }
  if (!hedef) { red.push([n, e.n, neden]); continue; }
  if (SOZ.has(n) && SOZ.get(n) !== hedef) { red.push([n, e.n, 'K2 başka kaydın adı/alias: ' + SOZ.get(n)]); continue; }
  sonuc.push({ n, id: hedef, sayi: e.n, k: e.k, neden });
}
const yokL = [...yok.entries()].sort((a, b) => b[1] - a[1]);
fs.mkdirSync(path.join(__dirname, 'working'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'working', '_nd3_hop_alias_rapor.json'), JSON.stringify({ sonuc, red, yok: yokL }, null, 1));
console.log('alias adayı ' + sonuc.length + ' (' + sonuc.reduce((a, s) => a + s.sayi, 0) + ' satır) · red ' + red.length + ' · katalogda yok ' + yokL.length);
console.log('KATALOGDA YOK (ilk 25): ' + yokL.slice(0, 25).map(([a, b]) => b + '× ' + a).join(' | '));
if (YAZ) {
  const grup = {}; sonuc.forEach(s => { (grup[s.id] = grup[s.id] || []).push(s.n); });
  const L = html.split('\n'); let degisen = 0; const bas = L.findIndex(l => l.includes('const HOPLAR=['));
  for (const id of Object.keys(grup)) {
    let i = -1; for (let j = bas; j < L.length && j < bas + 400; j++) { if (L[j].includes('{id:"' + id + '",')) { if (i >= 0) { console.error('ABORT çift satır ' + id); process.exit(1); } i = j; } if (/^\];/.test(L[j])) break; }
    if (i < 0) { console.error('ABORT satır yok ' + id); process.exit(1); }
    const satir = L[i], ek = grup[id].sort(); let yeniS;
    const am = /alias:\[([^\]]*)\]/.exec(satir);
    if (am) { const eski = JSON.parse('[' + am[1] + ']'); yeniS = satir.replace(am[0], () => 'alias:' + JSON.stringify(eski.concat(ek.filter(a => eski.indexOf(a) < 0)))); }
    else { const m = /^(\s*\{id:"[^"]+",.*)\}(,?)(\s*(?:\/\/.*)?)(\r?)$/.exec(satir); if (!m) { console.error('ABORT biçim ' + id); process.exit(1); } yeniS = m[1] + ',alias:' + JSON.stringify(ek) + '}' + m[2] + m[3] + m[4]; }
    const obj = vm.runInNewContext('(' + yeniS.trim().replace(/,\s*(\/\/.*)?\r?$/, '').replace(/\/\/.*$/, '') + ')');
    if (obj.id !== id || !ek.every(a => obj.alias.indexOf(a) >= 0)) { console.error('ABORT doğrulama ' + id); process.exit(1); }
    L[i] = yeniS; degisen++;
  }
  fs.writeFileSync(HF, L.join('\n')); console.log('[yazıldı] ' + degisen + ' HOPLAR satırı, ' + sonuc.length + ' alias');
}
