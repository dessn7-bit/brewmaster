// ═══ SPRINT CC — K2/K3 KAYNAKLI ÖRNEK TABLOSU (doğrulayıcı + normalleştirici) ═══
// Girdi : araştırma çıktıları (sonuc_*.json) + resmi sonuç metinleri (cc_odul/txt + kaynak.json) + tarif sayfası önbelleği.
// Çıktı : window._KAYNAKLI_ORNEK (HTML'e gömülür). Araştırmacının beyanına GÜVENİLMEZ — her kayıt burada yeniden doğrulanır:
//   K2 ödülü : alıntılanan sonuç satırı ilgili resmi metinde (normalize edilmiş) AYNEN geçmeli; madalya sözcüğü + bira + bira
//              fabrikası aynı satırda olmalı; resmi URL kaynak.json'dan alınır (araştırmacınınki değil).
//   Tarif    : yayımcı sayfası YENİDEN çekilir; OG değeri + grist adlarının ≥%60'ı + hop adlarının ≥%50'si sayfada geçmeli.
//   Kademe   : K3 yalnız K1 (AHA/NHC) ve K2 OLMAYAN stilde (Kaan'ın tanımı). Stil başına ≤3. "none" kayıtları raporlanır.
// Birim çevirisi deterministik aritmetik (lb/oz/kg/g, gal/L, °F→°C); parantezdeki metrik ile emperyal >3× tutarsızsa emperyal esas.
// Telif: yalnız OLGULAR (ad/miktar/ölçüler/maya/mash) + atıf (yayımcı + URL). Talimat düzyazısı GÖMÜLMEZ.
// Kullanım: node _cc_build_kay.js <arastirma-dizini> <cc_odul-dizini> <sayfa-onbellek-dizini> <k1-kapsam.json> [cikti.js]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
const [ARS, ODUL, ONB, K1KAP, CIKTI] = process.argv.slice(2);
if (!ARS || !ODUL || !ONB || !K1KAP) abort('kullanım: node _cc_build_kay.js <arastirma> <cc_odul> <onbellek> <k1-kapsam.json> [cikti]');
fs.mkdirSync(ONB, { recursive: true });
const KOK = __dirname;
const html = fs.readFileSync(path.join(KOK, 'Brewmaster_v2_79_10.html'), 'utf8').replace(/\r\n/g, '\n');
const ctx = vm.createContext({}); vm.runInContext(html.match(/const BJCP = \{[\s\S]*?\n\};/)[0].replace('const ', 'var '), ctx);
const BJCP = ctx.BJCP; if (Object.keys(BJCP).length !== 239) abort('BJCP 239 değil');
const K1 = new Set(JSON.parse(fs.readFileSync(K1KAP, 'utf8')));
const KAYNAK = {}; JSON.parse(fs.readFileSync(path.join(ODUL, 'kaynak.json'), 'utf8')).forEach(k => { KAYNAK[k.file] = k; });
const YR = { 'Great American Beer Festival': 'GABF', 'World Beer Cup': 'World Beer Cup', 'European Beer Star': 'European Beer Star' };
const norm = t => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`´]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();

// ── tarif sayfası (önbellekli, yavaş tempo) ──
let sonCekim = 0;
function sayfa(url) {
  const f = path.join(ONB, crypto.createHash('sha1').update(url).digest('hex') + '.html');
  if (fs.existsSync(f) && fs.statSync(f).size > 2000) return fs.readFileSync(f, 'utf8');
  const bekle = 1500 - (Date.now() - sonCekim); if (bekle > 0) cp.execSync('node -e "setTimeout(()=>{},' + bekle + ')"');
  sonCekim = Date.now();
  try {
    const out = cp.execFileSync('curl', ['-s', '-L', '-m', '40', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', url], { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
    if (out.length > 2000) fs.writeFileSync(f, out);
    return out;
  } catch (e) { return ''; }
}
const sayfaMetin = h => norm(h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/&deg;|&#176;/g, ' ').replace(/&nbsp;/g, ' '));

// ── birimler ──
const LB = 453.592, OZ = 28.3495;
function kesir(s) { s = String(s).trim(); let t = 0; s.split(/\s+/).forEach(x => { if (x.includes('/')) { const [a, b] = x.split('/'); t += (+a) / (+b); } else t += parseFloat(x); }); return t; }
function gram(miktar) {
  const t = String(miktar || '').replace(/,/g, '.');
  let metrik = null, emp = null, m;
  if ((m = /\(\s*~?([\d.]+)\s*kg\s*\)/i.exec(t))) metrik = parseFloat(m[1]) * 1000; else if ((m = /\(\s*~?([\d.]+)\s*g\s*\)/i.exec(t))) metrik = parseFloat(m[1]);
  if ((m = /^\s*~?([\d.]+(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(lbs?|pounds?)\b/i.exec(t))) emp = kesir(m[1]) * LB;
  else if ((m = /^\s*~?([\d.]+(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(oz|ounces?)\b/i.exec(t))) emp = kesir(m[1]) * OZ;
  else if ((m = /^\s*~?([\d.]+)\s*kg\b/i.exec(t))) emp = parseFloat(m[1]) * 1000;
  else if ((m = /^\s*~?([\d.]+)\s*g\b/i.exec(t))) emp = parseFloat(m[1]);
  let g = (metrik != null && emp != null) ? ((Math.max(metrik, emp) / Math.min(metrik, emp) > 3) ? emp : metrik) : (metrik != null ? metrik : emp);
  if (g == null || !(g > 0)) return null;
  return g >= 100 ? Math.round(g) : Math.round(g * 10) / 10;
}
function litre(b) {
  const t = String(b || '').replace(/,/g, '.'); let m;
  if ((m = /\(\s*([\d.]+)\s*L\s*\)/i.exec(t)) || (m = /([\d.]+)\s*(L|liters?|litres?)\b/i.exec(t))) return Math.round(parseFloat(m[1]) * 10) / 10;
  if ((m = /([\d.]+)\s*(gal|gallons?)\b/i.exec(t))) return Math.round(parseFloat(m[1]) * 3.78541 * 10) / 10;
  return null;
}
function mashC(t) {
  const s = String(t || ''); if (!s) return null;
  const cs = []; let m; const reF = /(\d{3}(?:\.\d)?)\s*°?\s*F\b/g; while ((m = reF.exec(s))) { const c = (parseFloat(m[1]) - 32) * 5 / 9; if (c >= 60 && c <= 74) cs.push(Math.round(c * 2) / 2); }
  const reC = /(\d{2}(?:\.\d)?)\s*°?\s*C\b/g; while ((m = reC.exec(s))) { const c = parseFloat(m[1]); if (c >= 60 && c <= 74) cs.push(Math.round(c * 2) / 2); }
  const ayrik = []; cs.forEach(c => { if (!ayrik.some(a => Math.abs(a - c) <= 1)) ayrik.push(c); });
  return ayrik.length === 1 ? ayrik[0] : null; // adımlı mash / aralık → tek değer uydurulmaz
}
function hopZaman(z) {
  const t = String(z || '').toLowerCase(); let m;
  if (/dry/.test(t)) return 'kuru'; if (/whirl|flame|knock|hop stand|steep/.test(t)) return 'wp'; if (/first wort|fwh/.test(t)) return 'FWH';
  if ((m = /([\d.]+)\s*min/.exec(t))) return Math.round(parseFloat(m[1]));
  if (/^\s*0\s*$/.test(t)) return 0; return null;
}
const aaSayi = a => { const m = /([\d.]+)\s*%/.exec(String(a || '')); return m ? parseFloat(m[1]) : null; };
const kisa = (s, n) => String(s || '').replace(/\s+/g, ' ').replace(/[<>"`]/g, ' ').trim().slice(0, n || 60);

// ── kayıtları oku ──
const dosyalar = fs.readdirSync(ARS).filter(f => /^sonuc_\d+\.json$/.test(f)).sort();
let ham = []; dosyalar.forEach(f => { try { const a = JSON.parse(fs.readFileSync(path.join(ARS, f), 'utf8')); a.forEach(x => { x._dosya = f; ham.push(x); }); } catch (e) { abort(f + ' JSON değil: ' + e.message); } });
const RED = [], NONE = [], OK = [], INDIRILEN = [], TASINAN = [];
const red = (x, neden) => RED.push((x.style || '?') + ' | ' + (x.tier || '?') + ' | ' + (x.beer || x.recipe_url || '') + ' → ' + neden);
const gorulenUrl = new Set();
// BİLİNÇLİ ELEMELER (manuel inceleme; gerekçe raporda): araştırmacının kendisi zayıf dediği stil eşleşmeleri
const MANUEL_RED = { 'Alternative Grain Beer|https://byo.com/recipes/kent-falls-brewing-co-s-chocolate-spelt-porter-clone/': 'alternatif tahıl (spelt) gristin yalnız ~%8’i — stil eşleşmesi zayıf', 'Oud Bruin|https://byo.com/recipes/new-belgium-la-folie-clone/': 'ödül kategorisi genel Belgian-Style Sour Ale; Oud Bruin eşleşmesi yayımcı sayfasında yok (araştırmacı da zayıf dedi)' };
// ÖDÜL KATEGORİSİ STİLE NET KARŞILIK GELMİYOR → K2 iddiası düşer, tarif (stile uyuyorsa) K3 olarak kalır. Gerekçeli, elle:
const K3_INDIR = {
  'Dry-Hopped Saison': 'ödül kategorisi American-Belgo-Style Ale (saison kategorisi değil)',
  'Hoppy Saison': 'ödül kategorisi American-Belgo-Style Ale (saison kategorisi değil)',
  'American Imperial Porter': 'ödül American-Style Imperial STOUT kategorisinde (porter kategorisi yoktu)',
  'Belgian Amber Ale': 'ödül Belgian-Style PALE Ale kategorisinde (2 giriş); bira amber olarak pazarlanıyor',
  'Italian Pilsner': 'ödül German-Style Kellerpils kategorisinde (Italian Pilsner kategorisi değil)',
  'Gose de Fruit': 'ödül Fruit Wheat Beer kategorisinde — kategori gose’u belirtmiyor',
  'Honey Lager': 'EBS 2017 sütunlu sonuç metninde madalya-bira eşlemesi yalnız KONUMDAN çıkarılabiliyor (tek satır kanıt yok); GABF 2014 satırında bira adı farklı («Mexican Honey»)'
};
ham.forEach(x => {
  if (!x || !x.style) return;
  if (x.tier === 'none') { NONE.push(x.style + ' — ' + kisa(x.notes, 140)); return; }
  if (!BJCP[x.style]) return red(x, 'stil BJCP-239 adı değil');
  if (x.tier !== 'K2' && x.tier !== 'K3') return red(x, 'kademe geçersiz');
  if (!x.recipe_url || !/^https:\/\//.test(x.recipe_url)) return red(x, 'tarif URL yok');
  if (/brewersfriend|milkthefunk|reddit|brewfather|beersmith/i.test(x.recipe_url)) return red(x, 'izinsiz kaynak');
  const mk = x.style + '|' + x.recipe_url; if (MANUEL_RED[mk]) return red(x, 'MANUEL: ' + MANUEL_RED[mk]);
  if (gorulenUrl.has(mk)) return; gorulenUrl.add(mk);
  if (x.tier === 'K2' && K3_INDIR[x.style]) { INDIRILEN.push(x.style + ' | ' + x.beer + ' → K3 (' + K3_INDIR[x.style] + ')'); x = Object.assign({}, x, { tier: 'K3', award: null, _indir: true }); }
  const f = x.facts || {};
  // K2 ödül doğrulaması
  let od = null;
  if (x.tier === 'K2') {
    const a = x.award || {}; const k = KAYNAK[a.file];
    if (!k) return red(x, 'ödül dosyası kaynak.json\'da yok: ' + a.file);
    const txt = norm(fs.readFileSync(path.join(ODUL, 'txt', a.file + '.txt'), 'utf8'));
    const parcalar = String(a.quoted_line || '').split(/\n|\s\|\s/).map(norm).filter(Boolean);
    // her alıntı parçası resmi metinde AYNEN geçmeli (EBS sütunlu düzeni parçalı alıntı gerektiriyor)
    const yokParca = parcalar.filter(p => txt.indexOf(p) < 0);
    if (!parcalar.length || yokParca.length) return red(x, 'alıntı parçası resmi metinde YOK: ' + (yokParca[0] || '(boş)').slice(0, 60));
    const fab0 = norm(x.brewery).split(' ').filter(w => w.length > 3 && !/brewing|brewery|company|beer|brauerei|birrificio/.test(w));
    // tek parçada birden çok madalya olabilir ("gold: … silver: …") → madalya başına böl, fabrika adını taşıyanı seç
    const madParca = [].concat.apply([], parcalar.map(p => p.split(/(?=\b(?:gold|silver|bronze)\b)/))).filter(p => /^\s*(gold|silver|bronze)\b/.test(p));
    const madalyaSatiri = madParca.find(p => fab0.some(w => p.indexOf(w) >= 0)) || (madParca.length === 1 ? madParca[0] : '') || parcalar.join(' ');
    const mad = (madalyaSatiri.match(/\b(gold|silver|bronze)\b/) || [])[1];
    if (!mad || mad !== String(a.medal || '').toLowerCase()) return red(x, 'madalya alıntıyla tutarsız');
    const fab = norm(x.brewery).split(' ').filter(w => w.length > 3 && !/brewing|brewery|company|beer/.test(w));
    if (fab.length && !fab.some(w => parcalar.join(' ').indexOf(w) >= 0)) return red(x, 'bira fabrikası adı alıntıda yok');
    od = { yr: YR[k.competition] || k.competition, y: +k.year, kat: kisa(a.category, 70), m: mad, u: k.official_url };
    // ödül kategorisi BAŞKA bir uygulama stiline BİREBİR karşılık geliyorsa kayıt o stile taşınır (stil = ödülün söylediği)
    const CAT2STIL = [[/italian.?style pilsener/i, 'Italian Pilsner'], [/german.?style pilsener/i, 'German Pils'], [/american[- ]style (india pale ale|ipa)/i, 'American IPA']];
    const hedef = (CAT2STIL.find(z => z[0].test(a.category || '')) || [])[1];
    if (hedef && hedef !== x.style) { TASINAN.push(x.style + ' | ' + x.beer + ' → ' + hedef + ' (kategori: ' + a.category + ')'); x = Object.assign({}, x, { style: hedef }); }
  }
  // tarif sayfası doğrulaması
  const h = sayfa(x.recipe_url); if (!h) return red(x, 'tarif sayfası çekilemedi');
  const sm = sayfaMetin(h);
  if (f.og && sm.indexOf(norm(Number(f.og).toFixed(3))) < 0 && sm.indexOf(norm(String(f.og))) < 0) return red(x, 'OG ' + f.og + ' sayfada yok');
  const adKok = s => norm(String(s).replace(/\(.*?\)/g, ' ')).split(' ').filter(w => w.length > 2 && !/^(malt|pellets?|hops?|lb|oz|kg|whole|leaf)$/.test(w)).slice(0, 2).join(' ');
  const gr = (f.grains || []).filter(g => g && g[0]);
  const grBul = gr.filter(g => { const k = adKok(g[0]); return !k || sm.indexOf(k) >= 0 || k.split(' ').every(w => sm.indexOf(w) >= 0); }).length;
  if (gr.length && grBul / gr.length < 0.6) return red(x, 'grist adları sayfada az (' + grBul + '/' + gr.length + ')');
  const hp = (f.hops || []).filter(g => g && g[0]);
  const hpBul = hp.filter(g => { const k = adKok(g[0]); return !k || sm.indexOf(k.split(' ')[0]) >= 0; }).length;
  if (hp.length && hpBul / hp.length < 0.5) return red(x, 'hop adları sayfada az (' + hpBul + '/' + hp.length + ')');
  // normalleştir
  const g = gr.map(z => [kisa(z[0], 60), gram(z[1])]).filter(z => z[1] != null);
  if (!g.length) return red(x, 'grist miktarı çözülemedi');
  const hh = hp.map(z => [kisa(z[0], 40), gram(z[1]), hopZaman(z[2]), aaSayi(z[3])]).filter(z => z[1] != null);
  const o = { k: x.tier, kay: { pub: kisa(x.publisher, 50), u: x.recipe_url } };
  if (x.tier === 'K2') { o.od = od; o.bira = kisa(x.beer, 60); o.bf = kisa(x.brewery, 60); o.yil = od.y; }
  else { if (x.beer) o.bira = kisa(x.beer, 60); if (x.recipe_year) o.yil = +x.recipe_year; }
  const L = litre(f.batch); if (L) o.L = L;
  if (+f.og > 1) o.og = +f.og; if (+f.fg > 0.98) o.fg = +f.fg; if (+f.ibu > 0) o.ib = Math.round(+f.ibu); if (+f.srm > 0) o.sr = +f.srm; if (+f.abv > 0) o.ab = +f.abv;
  const ms = mashC(f.mash); if (ms) o.ms = ms;
  o.g = g; if (hh.length) o.h = hh; if (f.yeast) o.y = kisa(f.yeast, 90);
  const ek = (f.other || []).filter(z => z && z[0]).map(z => [kisa(z[0], 40), kisa(z[1], 40)]); if (ek.length) o.ek = ek.slice(0, 8);
  // bant bekçileri
  if (o.og && (o.og < 1.005 || o.og > 1.16)) return red(x, 'OG bant dışı'); // alkolsüz bira OG'si meşru olarak düşük
  if (o.L && (o.L < 3 || o.L > 250)) return red(x, 'batch bant dışı');
  if (o.L) { const kgL = g.reduce((a, z) => a + z[1], 0) / 1000 / o.L; if (kgL < 0.05 || kgL > 0.8) return red(x, 'grist yoğunluğu tutarsız (' + kgL.toFixed(2) + ' kg/L) — sayfada birim yazım hatası olabilir'); }
  OK.push({ stil: x.style, o: o, not: x.style_match });
});

// ── kademe kuralı + stil başına ≤3 ──
const T = {};
const k2Stil = new Set(OK.filter(r => r.o.k === 'K2').map(r => r.stil));
OK.forEach(r => {
  if (r.o.k === 'K3' && (K1.has(r.stil) || k2Stil.has(r.stil))) { red({ style: r.stil, tier: 'K3', recipe_url: r.o.kay.u }, 'K3 yalnız K1/K2 olmayan stilde (kural)'); return; }
  (T[r.stil] = T[r.stil] || []);
  if (T[r.stil].length < 3) T[r.stil].push(r.o);
});
Object.keys(T).forEach(k => T[k].sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0)));

// ── kapılar ──
const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir', 'gereklidir', 'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
const metin = JSON.stringify(T).toLocaleLowerCase('tr-TR');
const ih = YASAK.filter(k => metin.includes(k)); if (ih.length) abort('yasak kelime: ' + ih);
let uzun = 0; JSON.stringify(T, (kk, vv) => { if (typeof vv === 'string' && vv.length > 110 && !/^https:/.test(vv)) uzun++; return vv; }); if (uzun) abort('düzyazı sızıntısı şüphesi: ' + uzun);
if (Object.keys(T).some(k => !BJCP[k])) abort('BJCP dışı anahtar');

const js = 'window._KAYNAKLI_ORNEK = ' + JSON.stringify(T) + ';';
if (CIKTI) fs.writeFileSync(CIKTI, js);
const k2 = Object.values(T).reduce((a, v) => a + v.filter(o => o.k === 'K2').length, 0), k3 = Object.values(T).reduce((a, v) => a + v.filter(o => o.k === 'K3').length, 0);
console.log('[ham] ' + ham.length + ' kayıt · dosya ' + dosyalar.join(','));
console.log('[KABUL] stil=' + Object.keys(T).length + ' K2=' + k2 + ' K3=' + k3 + ' (' + (js.length / 1024).toFixed(1) + ' KB)');
console.log('[STİL TAŞINAN ' + TASINAN.length + ']'); TASINAN.forEach(r => console.log('  → ' + r));
console.log('[K2→K3 İNDİRİLEN ' + INDIRILEN.length + ']'); INDIRILEN.forEach(r => console.log('  ↓ ' + r));
console.log('[RED ' + RED.length + ']'); RED.forEach(r => console.log('  ✗ ' + r));
console.log('[NONE ' + NONE.length + ']'); NONE.forEach(r => console.log('  · ' + r));
