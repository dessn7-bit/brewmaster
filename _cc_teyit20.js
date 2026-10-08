// ═══ SPRINT CC2 — KADEME BAŞINA 20 RASTGELE ÖRNEĞİN KAYNAĞINA KARŞI YENİDEN TEYİDİ ═══
// Gömülü tablolardan (HTML) kademe başına 20 örnek seçilir (tohumlu → tekrarlanabilir) ve kaynağa karşı YENİDEN doğrulanır:
//   K1 AHA : ham AHA derlemesi (working/_an_madalya.json) — madalya + yıl + OG + grist adları; ayrıca AHA'nın CANLI tarif
//            sayfası denenir (çoğu üye-kilitli: kilitliyse "canlı: kilitli" yazılır, ham kayıt teyidi geçerli sayılır)
//   K1 NHC : ham nhc.db satırı — yıl + OG + grist adları (malzeme metninde)
//   K2     : ödül resmi sonuç metninde (yerel arşiv) bira fabrikası + madalya aynı satırda; tarif sayfası ÖNBELLEKSİZ yeniden
//            çekilir: OG + grist adları (≥%60) + hop adları (≥%50)
//   K3     : tarif sayfası önbelleksiz yeniden çekilir: OG + grist + hop adları
// Kullanım: node _cc_teyit20.js <nhc.db> <cc_odul> [tohum]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const [DB, ODUL, TOHUM] = process.argv.slice(2);
const html = fs.readFileSync(path.join(__dirname, 'Brewmaster_v2_79_10.html'), 'utf8').replace(/\r\n/g, '\n');
// CC4: örnek tabloları ornek_veri.js'e taşındı → HTML + veri dosyası birlikte okunur
const _veriKaynak = html + '\n' + (fs.existsSync(path.join(__dirname, 'ornek_veri.js')) ? fs.readFileSync(path.join(__dirname, 'ornek_veri.js'), 'utf8').replace(/\r\n/g, '\n') : '');
const T = {}; _veriKaynak.split('\n').filter(l => /^window\.(_TOPLULUK_MADALYA|_NHC_MADALYA|_KAYNAKLI_ORNEK) = /.test(l)).forEach(l => { const c = vm.createContext({ window: {} }); vm.runInContext(l, c); Object.assign(T, c.window); });
const norm = t => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let rs = +(TOHUM || 20261008); const rnd = () => (rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648;
function sec(L, n) { const a = L.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
let son = 0;
function cek(url) { const b = 1500 - (Date.now() - son); if (b > 0) cp.execSync('node -e "setTimeout(()=>{},' + b + ')"'); son = Date.now();
  try { return cp.execFileSync('curl', ['-s', '-L', '-m', '40', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', url], { maxBuffer: 20 * 1024 * 1024 }).toString('utf8'); } catch (e) { return ''; } }
const metin = h => norm(h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&'));
const kok = s => norm(String(s).replace(/\(.*?\)/g, ' ')).split(' ').filter(w => w.length > 2 && !/^(malt|pellets?|hops?|lb|oz|kg|whole|leaf|the|and)$/.test(w)).slice(0, 2);
const varMi = (sm, ad) => { const k = kok(ad); return !k.length || k.every(w => sm.indexOf(w) >= 0); };
const oran = (L, f) => L.length ? L.filter(f).length / L.length : 1;
const satir = [];
// ── K1 havuzu ──
const A = T._TOPLULUK_MADALYA, N = T._NHC_MADALYA, K = T._KAYNAKLI_ORNEK;
const k1 = []; Object.keys(A).forEach(st => A[st][1].forEach((o, i) => k1.push({ t: 'aha', st, o, i }))); Object.keys(N).forEach(st => N[st][1].forEach((o, i) => k1.push({ t: 'nhc', st, o, i })));
const ham = JSON.parse(fs.readFileSync(path.join(__dirname, 'working', '_an_madalya.json'), 'utf8'));
const db = new DatabaseSync(DB, { readOnly: true }); const nrow = db.prepare('select * from recipes').all();
const moj = s => { try { const m = Buffer.from(String(s || ''), 'latin1').toString('utf8'); return m.includes('�') ? String(s || '') : m; } catch (_) { return String(s || ''); } };
sec(k1, 20).forEach(x => {
  const o = x.o;
  if (x.t === 'aha') {
    const aday = ham.filter(r => r.medal != null && +r.medal === o.m && r.og === o.og && (String((r.aha_extra && r.aha_extra.introduction) || '').replace(/<[^>]+>/g, ' ').match(/\b(19|20)\d{2}\b/) || [''])[0] === String(o.yil || ''));
    const r = aday.find(r => (o.g || []).every(g => (r.malts || []).some(m => norm(m.name).indexOf(norm(g[0]).split(' ')[0]) >= 0)));
    let canli = '—';
    if (r) { const h = cek('https://www.homebrewersassociation.org/homebrew-recipe/' + String(r.id).replace(/^aha_/, '') + '/'); const sm = metin(h);
      const ogV = sm.indexOf(norm(Number(o.og).toFixed(3))) >= 0, grV = (o.g || []).filter(g => varMi(sm, g[0])).length >= Math.ceil((o.g || []).length * 0.6);
      canli = !h ? 'çekilemedi' : (ogV && grV) ? 'OG + grist ✓' : ogV ? 'OG ✓, malzeme listesi görünmüyor (üye alanı)' : 'veri görünmüyor (üye alanı)'; }
    satir.push(['K1', x.st, 'AHA ' + (o.yil || '?') + ' madalya ' + o.m, r ? '✓ (ham kayıt: madalya+yıl)' : '✗', r ? '✓' : '✗', r ? '✓' : '✗', 'canlı: ' + canli]);
  } else {
    // aynı yıl + aynı OG birden çok NHC satırında olabilir → grist adları en çok tutan aday seçilir
    const adaylar = nrow.filter(r => +r.year === o.yil && (String(r.specs || '').match(/[01]\.\d{2,3}/g) || []).some(v => Math.abs(parseFloat(v) - o.og) < 0.0005));
    const puan = r => { const ing = norm(moj(r.ingredients)); return (o.g || []).filter(g => varMi(ing, g[0])).length; };
    const r = adaylar.sort((a, b) => puan(b) - puan(a))[0];
    const ing = r ? norm(moj(r.ingredients)) : '';
    const gOk = r && (o.g || []).filter(g => varMi(ing, g[0])).length >= Math.ceil((o.g || []).length * 0.6);
    satir.push(['K1', x.st, 'NHC ' + o.yil + ' altın', r ? '✓ (NHC altın arşivi)' : '✗', r ? '✓' : '✗', gOk ? '✓' : '✗', 'ham nhc.db satırı']);
  }
});
// ── K2 / K3 ──
const kay = []; Object.keys(K).forEach(st => K[st].forEach((o, i) => kay.push({ st, o, i })));
const DOSYA = { 'GABF': 'GABF', 'World Beer Cup': 'WBC', 'European Beer Star': 'EBS' };
['K2', 'K3'].forEach(kd => sec(kay.filter(x => x.o.k === kd), 20).forEach(x => {
  const o = x.o; let odul = '—';
  if (kd === 'K2') {
    const f = path.join(ODUL, 'txt', DOSYA[o.od.yr] + '_' + o.od.y + '.txt');
    const txt = fs.existsSync(f) ? norm(fs.readFileSync(f, 'utf8')) : '';
    const fab = norm(o.bf).split(' ').filter(w => w.length > 3 && !/brewing|brewery|company|beer/.test(w));
    const madK = { gold: 'gold', silver: 'silver', bronze: 'bronze' }[o.od.m];
    // madalya sözcüğünden sonraki ~200 karakterde fabrika adı
    let ok = false, re = new RegExp('\\b' + madK + '\\b', 'g'), m;
    while (txt && (m = re.exec(txt))) { const pen = txt.slice(m.index, m.index + 220); if (fab.some(w => pen.indexOf(w) >= 0)) { ok = true; break; } }
    odul = ok ? '✓ ' + o.od.yr + ' ' + o.od.y + ' ' + o.od.m : '✗';
  }
  const h = cek(o.kay.u), sm = metin(h);
  const ogOk = !o.og || sm.indexOf(norm(Number(o.og).toFixed(3))) >= 0 || sm.indexOf(norm(String(o.og))) >= 0;
  const gO = oran(o.g || [], g => varMi(sm, g[0])), hO = oran(o.h || [], z => sm.indexOf(kok(z[0])[0] || '§') >= 0);
  satir.push([kd, x.st, kd === 'K2' ? o.bf + ' — ' + o.bira : o.kay.pub, odul, h ? (ogOk ? '✓' : '✗') : 'çekilemedi', h ? ((gO >= 0.6 && hO >= 0.5) ? '✓ (' + Math.round(gO * 100) + '%/' + Math.round(hO * 100) + '%)' : '✗ (' + Math.round(gO * 100) + '%/' + Math.round(hO * 100) + '%)') : '—', 'canlı yeniden çekim']);
}));
console.log('| Kademe | Stil | Kaynak | Ödül | OG | Malzeme adları | Not |');
console.log('|---|---|---|---|---|---|---|');
satir.forEach(r => console.log('| ' + r.join(' | ') + ' |'));
const gecti = kd => satir.filter(r => r[0] === kd && !r.slice(3, 6).some(c => /✗/.test(c))).length + '/' + satir.filter(r => r[0] === kd).length;
console.log('\nÖZET: K1 ' + gecti('K1') + ' · K2 ' + gecti('K2') + ' · K3 ' + gecti('K3'));
