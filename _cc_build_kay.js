// ═══ SPRINT CC — K2/K3 KAYNAKLI ÖRNEK TABLOSU (doğrulayıcı + normalleştirici) ═══
// Girdi : araştırma çıktıları (sonuc_*.json) + resmi sonuç metinleri (cc_odul/txt + kaynak.json) + tarif sayfası önbelleği.
// Çıktı : window._KAYNAKLI_ORNEK (HTML'e gömülür). Araştırmacının beyanına GÜVENİLMEZ — her kayıt burada yeniden doğrulanır:
//   K2 ödülü : alıntılanan sonuç satırı ilgili resmi metinde (normalize edilmiş) AYNEN geçmeli; madalya sözcüğü + bira + bira
//              fabrikası aynı satırda olmalı; resmi URL kaynak.json'dan alınır (araştırmacınınki değil).
//   Tarif    : yayımcı sayfası YENİDEN çekilir; OG değeri + grist adlarının ≥%60'ı + hop adlarının ≥%50'si sayfada geçmeli.
//   Kademe   : CC2 — stil başına EN AZ 3 hedefi: önce K1, sonra K2, sonra K3. K3 artık yalnız boş stillerle sınırlı DEĞİL:
//              K1+K2 toplamı 3'ün altındaysa K3 eksiği 3'e tamamlar (dolgu). K2 stil başına ≤5. "none" kayıtları raporlanır.
// Birim çevirisi deterministik aritmetik (lb/oz/kg/g, gal/L, °F→°C); parantezdeki metrik ile emperyal >3× tutarsızsa emperyal esas.
// Telif: yalnız OLGULAR (ad/miktar/ölçüler/maya/mash) + atıf (yayımcı + URL). Talimat düzyazısı GÖMÜLMEZ.
// Kullanım: node _cc_build_kay.js <arastirma-dizin(ler)i> <cc_odul-dizini> <sayfa-onbellek-dizini> <k1-kapsam.json> [cikti.js] [--kuru]
//   Varsayılan: tablo ornek_veri.js'e yazılır + içerik özeti HTML ve sw.js'te güncellenir (_cc_veri_yaz.js — CC5, elle adım yok).
//   --kuru: ornek_veri.js'e DOKUNMAZ (yalnız [cikti.js] ve rapor; inceleme için).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
const KURU = process.argv.includes('--kuru');
const [ARS, ODUL, ONB, K1KAP, CIKTI] = process.argv.slice(2).filter(a => a !== '--kuru');
if (!ARS || !ODUL || !ONB || !K1KAP) abort('kullanım: node _cc_build_kay.js <arastirma> <cc_odul> <onbellek> <k1-kapsam.json> [cikti]');
fs.mkdirSync(ONB, { recursive: true });
const KOK = __dirname;
const html = fs.readFileSync(path.join(KOK, 'Brewmaster_v2_79_10.html'), 'utf8').replace(/\r\n/g, '\n');
// CC4: örnek tabloları ornek_veri.js'e taşındı → HTML + veri dosyası birlikte okunur
const _veriKaynak = html + '\n' + (fs.existsSync(path.join(__dirname, 'ornek_veri.js')) ? fs.readFileSync(path.join(__dirname, 'ornek_veri.js'), 'utf8').replace(/\r\n/g, '\n') : '');
const ctx = vm.createContext({}); vm.runInContext(html.match(/const BJCP = \{[\s\S]*?\n\};/)[0].replace('const ', 'var '), ctx);
const BJCP = ctx.BJCP; if (Object.keys(BJCP).length !== 239) abort('BJCP 239 değil');
const K1 = new Set(JSON.parse(fs.readFileSync(K1KAP, 'utf8')));
const K1SAY = {};
(function(){
  const sat = {}; _veriKaynak.split('\n').filter(l => /^window\.(_TOPLULUK_MADALYA|_NHC_MADALYA) = /.test(l)).forEach(l => { const c = vm.createContext({ window: {} }); vm.runInContext(l, c); Object.assign(sat, { [l.slice(7, l.indexOf(' ='))]: c.window[l.slice(7, l.indexOf(' ='))] }); });
  const A = sat._TOPLULUK_MADALYA || {}, N = sat._NHC_MADALYA || {};
  Object.keys(BJCP).forEach(st => { const nv = (N[st] && N[st][1]) || [], mv = (A[st] && A[st][1]) || [];
    K1SAY[st] = nv.length + mv.filter(o => !nv.some(n => n.yil === o.yil && o.og && n.og && Math.abs(n.og - o.og) <= 0.0015)).length; });
})();
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
  if ((m = /([\d.]+)\s*(?:US\s*)?(gal|gallons?)\b/i.exec(t))) return Math.round(parseFloat(m[1]) * 3.78541 * 10) / 10;
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
const dosyalar = [];
ARS.split(',').forEach(dz => fs.readdirSync(dz).filter(f => /^sonuc_\d+\.json$/.test(f)).sort().forEach(f => dosyalar.push(path.join(dz, f))));
let ham = []; dosyalar.forEach(f => { try { const a = JSON.parse(fs.readFileSync(f, 'utf8')); a.forEach(x => { x._dosya = path.basename(path.dirname(f)) + '/' + path.basename(f); ham.push(x); }); } catch (e) { abort(f + ' JSON değil: ' + e.message); } });
const RED = [], NONE = [], OK = [], INDIRILEN = [], TASINAN = [];
const red = (x, neden) => RED.push((x.style || '?') + ' | ' + (x.tier || '?') + ' | ' + (x.beer || x.recipe_url || '') + ' → ' + neden);
const gorulenUrl = new Set(), gorulenTarif = new Set();
// BİLİNÇLİ ELEMELER (manuel inceleme; gerekçe raporda): araştırmacının kendisi zayıf dediği stil eşleşmeleri
const MANUEL_RED = { 'Alternative Grain Beer|https://byo.com/recipes/kent-falls-brewing-co-s-chocolate-spelt-porter-clone/': 'alternatif tahıl (spelt) gristin yalnız ~%8’i — stil eşleşmesi zayıf', 'Oud Bruin|https://byo.com/recipes/new-belgium-la-folie-clone/': 'ödül kategorisi genel Belgian-Style Sour Ale; Oud Bruin eşleşmesi yayımcı sayfasında yok (araştırmacı da zayıf dedi)' };
// CC2 ELLE KARARLAR (araştırmacı raporları + katı stil eşleşmesi) — [stil, kalıp (bira adı + URL üzerinde), işlem, gerekçe]
const KARAR = [
  ['Fresh Hop IPA', /black ipa/i, 'red', 'tam tahıl gristi sayfada yok — araştırmacının varsayımı (olgu değil)'],
  ['Pre-Prohibition Porter', /classic american porter/i, 'red', 'sayfa "pre-Prohibition" demiyor'],
  ['English Barleywine', /brick kiln/i, 'red', 'US-05 + Special B — İngiliz barleywine eşleşmesi zayıf'],
  ['Dry-Hopped Saison', /petit saison|petite saison/i, 'red', 'sayfada dry-hop açıkça doğrulanamadı'],
  ['Dry-Hopped Saison', /form.?to.?table|fermentory/i, 'red', '%3,5 table saison — Table Saison örneği olarak kalır'],
  ['Light Craft Lager', /leichtbier/i, 'red', 'Alman Leichtbier ≠ craft light lager (zaten German Leichtbier örneği)'],
  ['Spiced Wheat Beer', /michigan summer/i, 'red', 'yalnız 1 çay kaşığı kişniş — baharatlı buğday eşleşmesi zayıf'],
  ['Gruit Ale', /gruit.?style spiced/i, 'red', 'gruit tanımı gereği şerbetçiotsuz; bu tarifte şerbetçiotu var'],
  ['Rose / Floral Beer', /elderflower|apple/i, 'red', 'mürver çiçeği + elma — gül/çiçek birası eşleşmesi kısmi'],
  ['American Wild Ale', /consecration/i, 'red', 'frenk üzümü — Fruited / Dark Fruit Sour örneği olarak kalır'],
  ['Belgian Amber Ale', /de koninck/i, 'red', 'Belgian Pale Ale örneği olarak kalır'],
  ['Belgian Amber Ale', /belgian pale ale/i, 'red', 'başlığı Belgian PALE Ale'],
  ['Pastry Stout', /flaked/i, 'red', 'sayfadaki yazar bilgisi tutarsız — olgu güvenilirliği şüpheli'],
  ['Lavender Saison', /hippie farm/i, 'red', 'homebrew dükkânı tarifi (Great Fermentations) — protokol dükkân tariflerini dışlar'],
  ['American Pilsner', /siebel|classic american pilsner/i, 'red', '%20 mısır = BJCP Pre-Prohibition Lager (Classic American Pilsner)'],
  ['Kriek / Fruit Lambic', /lindeman/i, 'red', 'meyve kiraz değil, genel — Framboise örneği olarak kalır'],
  ['Contemporary Gose', /blood orange|raspberry/i, 'red', 'meyveli gose — Gose de Fruit örneği olarak kalır'],
  ['Scottish Ale / 80 Shilling', /taildragger|clan.?destine/i, 'red', 'OG 1.058 / %6,2 — 80 Shilling bandının çok üstünde'],
  ['Honey Beer', /indeed|mexican honey/i, 'k3', 'GABF 2014 satırında bira adı farklı («Mexican Honey»)'],
  ['Brown IPA', /10-clones-dark-side/i, 'red', 'sayfa içi birim çelişkisi: kuru şerbetçiotu «8 oz. (453 g)» (8 oz ≈ 227 g) — miktar belirsiz'],
  // CC2 3. tur
  ['New England Pale Ale', /dry mopped/i, 'red', 'OG 1.065 / %7 — IPA gücü; başlık «Hazy», New England pale değil'],
  ['Sour IPA', /brummel/i, 'red', 'böğürtlen + vanilya + laktoz — meyveli/pastry varyant, düz Sour IPA değil'],
  ['Hemp Beer / CBD Beer', /burnt/i, 'red', 'başlık/tanım kenevir birası demiyor (yalnız malzemede kenevir tohumu)'],
  ['Light Craft Lager', /old style light/i, 'red', 'kitlesel light lager — craft light lager değil'],
  ['Mixed Berry Sour', /slush/i, 'red', 'sayfada deniz tuzu «9 oz. (255 g)» / 19 L ≈ 13 g/L — olası baskı hatası, miktar güvenilmez'],
  ['Mixed Berry Sour', /red rum ruos/i, 'red', 'sayfa içi birim çelişkisi: hibiskus «5 oz. (21 g)» (5 oz ≈ 142 g)'],
  ['German Leichtbier', /carmelo/i, 'red', 'sayfa içi birim çelişkisi: şerbetçiotu «1.5 oz. (21g)» (1.5 oz ≈ 43 g)'],
  ['Trappist Single / Abbey Ale', /spencer/i, 'red', 'OG 1.058 / %6,5 — single bandının üstünde'],
  ['Kentucky Common', /spelunker/i, 'red', 'sayfada mısır gevreği «907 kg» — baskı hatası, miktar güvenilmez'],
  // CC3 4. tur (ikinci araştırma)
  ['Spiced Wheat Beer', /peppered honey/i, 'red', 'baharat acı biber — chili/bal birası, baharatlı buğday değil'],
  ['Spiced Wheat Beer', /lemongrass|outer banks/i, 'red', 'limon otu = ot; aynı tarif Herb Wheat Beer K2 örneği'],
  ['Non-Alcoholic Beer', /low alcohol pilsner/i, 'red', 'başlık «düşük alkollü», alkolsüz değil (CC2 3. tur kararıyla aynı)'],
  ['Trappist Single / Abbey Ale', /father|enkel/i, 'red', 'OG 1.040 + SRM 16 + tarçın/muskat — single bandı ve tanımı dışında'],
  ['Matcha / Green Tea Beer', /green tease/i, 'red', '%7,8 / 60 IBU IPA — stil gücü bandının üstünde'],
  ['Pumpkin Stout', /dark o.? ?the moon/i, 'red', 'tarif sayfası «stout» demiyor (CC2 3. tur kararıyla aynı)'],
  ['Spiced Witbier', /witty dutchman|gordon strong/i, 'red', 'düz witbier — Belgian Witbier komşu stili, «spiced» değil'],
  ['Contemporary Gose', /mangose|gold hammer/i, 'red', 'meyveli gose / sayfa «classic» diyor — komşu stil (CC2 kararıyla aynı)'],
  ['American Pilsner', /mustache|pre-prohibition/i, 'red', 'Pre-Prohibition Lager (Classic American Pilsner) — CC2 kararıyla aynı'],
  ['Double Milk Stout', /weldwerks|coffee coconut/i, 'red', 'sayfa «imperial milk stout» diyor + birim çelişkisi «9 oz. (283 g)»'],
  ['Tropical Saison', /tropic king/i, 'red', 'tropikal bağ yalnız ad + hop; %8 imperial saison'],
  ['Kriek / Fruit Lambic', /crabapple|apple/i, 'red', 'meyve kiraz değil (elma)'],
  ['International Pale Lager', /mexican lager/i, 'red', 'sayfada «2 lbs. (907 kg)» baskı hatası'],
  ['Table Saison', /petit saison/i, 'red', '%4,5 — table saison bandının (%2,5–3,5) üstünde'],
  ['Fresh Hop IPA', /hoptime/i, 'red', 'sayfa içi birim çelişkisi «16 oz (141.75 g)»'],
  ['Light Craft Lager', /lighter than helium/i, 'red', 'ABV %4,5 — light craft lager bandının (%2,5–3,8) üstünde'],
  ['International Pale Lager', /euro pale lager/i, 'red', 'OG 1.058 / %5,9 — International Pale Lager bandının (1.042–1.050) üstünde']
];
const KARARLOG = [];
// CC3: araştırmacı raporunda yanlış stile yazılmış kayıt — [yazılan stil, kalıp, doğru stil, gerekçe]
const STIL_DUZELT = [
  ['Framboise / Fruit Lambic', /basic kriek/i, 'Kriek / Fruit Lambic', 'tarif başlığı Kriek (kiraz) — Framboise değil']
];
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
  const sd = STIL_DUZELT.find(d => d[0] === x.style && d[1].test(String(x.beer || '') + ' ' + x.recipe_url));
  if (sd) { TASINAN.push(x.style + ' | ' + x.beer + ' → ' + sd[2] + ' (elle: ' + sd[3] + ')'); x = Object.assign({}, x, { style: sd[2] }); }
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
    const CAT2STIL = [[/italian.?style pilsener/i, 'Italian Pilsner'], [/german.?style pilsener/i, 'German Pils'], [/american.?style (india pale ale|ipa)/i, 'American IPA'], [/belgian.?style (witbier|white)/i, 'Belgian Witbier'], [/specialty honey/i, 'Honey Beer']];
    const hedef = (CAT2STIL.find(z => z[0].test(a.category || '')) || [])[1];
    if (hedef && hedef !== x.style) { TASINAN.push(x.style + ' | ' + x.beer + ' → ' + hedef + ' (kategori: ' + a.category + ')'); x = Object.assign({}, x, { style: hedef }); const mk2 = x.style + '|' + x.recipe_url; if (gorulenUrl.has(mk2)) return; gorulenUrl.add(mk2); }
  }
  const kr = KARAR.find(k => k[0] === x.style && k[1].test(String(x.beer || '') + ' ' + x.recipe_url));
  if (kr) { KARARLOG.push(x.style + ' | ' + (x.beer || x.recipe_url) + ' → ' + (kr[2] === 'red' ? 'ÇIKARILDI' : 'K3') + ' (' + kr[3] + ')'); if (kr[2] === 'red') return; x = Object.assign({}, x, { tier: 'K3', award: null }); od = null; }
  // tarif sayfası doğrulaması
  const h = sayfa(x.recipe_url); if (!h) return red(x, 'tarif sayfası çekilemedi');
  const sm = sayfaMetin(h);
  if (!(+f.og > 1)) return red(x, 'OG yok (CC2: örnekte OG zorunlu)');
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
  o.g = g; if (hh.length) o.h = hh; if (f.yeast) o.y = kisa(String(f.yeast).replace(/,\s*ideally\b/gi, ''), 90); // yönerge sözcüğü ('ideally') olgu değil → atılır
  const ek = (f.other || []).filter(z => z && z[0]).map(z => [kisa(z[0], 40), kisa(z[1], 40)]); if (ek.length) o.ek = ek.slice(0, 8);
  // bant bekçileri
  if (o.og && (o.og < 1.005 || o.og > 1.16)) return red(x, 'OG bant dışı'); // alkolsüz bira OG'si meşru olarak düşük
  if (!o.L) return red(x, 'batch hacmi sayfada yok — gramlar ölçeklenemez (CC3: zorunlu)');
  if (o.L && (o.L < 3 || o.L > 250)) return red(x, 'batch bant dışı');
  if (o.L) { const kgL = g.reduce((a, z) => a + z[1], 0) / 1000 / o.L; if (kgL < 0.05 || kgL > 0.8) return red(x, 'grist yoğunluğu tutarsız (' + kgL.toFixed(2) + ' kg/L) — sayfada birim yazım hatası olabilir'); }
  // aynı tarif farklı URL'de (ör. BYO hem /articles/ hem /recipes/ altında) → bir kez
  const imza = x.style + '|' + o.og + '|' + o.fg + '|' + g.map(z => z[1]).join(',');
  if (gorulenTarif.has(imza)) return red(x, 'aynı tarif başka URL’den zaten alındı'); gorulenTarif.add(imza);
  OK.push({ stil: x.style, o: o, not: x.style_match });
});

// ── kademe kuralı + stil başına ≤3 ──
const T = {};
// önce K2 (stil başına ≤5), sonra K3 yalnız K1+K2 < 3 ise eksiği 3'e tamamlayacak kadar (dolgu)
OK.filter(r => r.o.k === 'K2').forEach(r => { T[r.stil] = T[r.stil] || []; if (T[r.stil].length < 5) T[r.stil].push(r.o); });
OK.filter(r => r.o.k === 'K3').forEach(r => {
  const var_ = (K1SAY[r.stil] || 0) + (T[r.stil] || []).length;
  if (var_ >= 3) { red({ style: r.stil, tier: 'K3', recipe_url: r.o.kay.u }, 'K3 dolgu gereksiz (K1+K2+K3 zaten ≥3)'); return; }
  (T[r.stil] = T[r.stil] || []).push(r.o);
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
if (!KURU) require('./_cc_veri_yaz.js').yaz([js]); else console.log('[--kuru] ornek_veri.js değiştirilmedi');
const k2 = Object.values(T).reduce((a, v) => a + v.filter(o => o.k === 'K2').length, 0), k3 = Object.values(T).reduce((a, v) => a + v.filter(o => o.k === 'K3').length, 0);
console.log('[ham] ' + ham.length + ' kayıt · ' + dosyalar.length + ' dosya');
console.log('[KABUL] stil=' + Object.keys(T).length + ' K2=' + k2 + ' K3=' + k3 + ' (' + (js.length / 1024).toFixed(1) + ' KB)');
console.log('[ELLE KARAR ' + KARARLOG.length + ']'); KARARLOG.forEach(r => console.log('  ⊘ ' + r));
console.log('[STİL TAŞINAN ' + TASINAN.length + ']'); TASINAN.forEach(r => console.log('  → ' + r));
console.log('[K2→K3 İNDİRİLEN ' + INDIRILEN.length + ']'); INDIRILEN.forEach(r => console.log('  ↓ ' + r));
console.log('[RED ' + RED.length + ']'); RED.forEach(r => console.log('  ✗ ' + r));
console.log('[NONE ' + NONE.length + ']'); NONE.forEach(r => console.log('  · ' + r));
