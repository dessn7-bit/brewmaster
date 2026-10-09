// ═══ SPRINT AI2 1 — TOPLULUK KULLANIM TABLOSU (build-time) ═══
// Kaynak: 376K korpus (working/_step105_dataset_v8_clean.json — Kaan'ın bilgisayarında; uygulamaya YÜKLENMEZ).
// Çıktı: korpus_kullanim.js → window._KORPUS_KULLANIM (YALNIZ toplu istatistik; tek reçete adı / metni / kişi adı GÖMÜLMEZ — repo public).
// Malzeme → katalog id: uygulamanın KENDİ çözücüsü (ND1 bloğu: _bmKatCoz = BV L2 ad/alias/kod; katkı _bmMetinCoz = tek kayda ait terim)
//   HTML'den dilimlenip node vm'de koşulur → uygulama ile build aynı kuralı kullanır.
// Geçerli reçete: bjcp_slug → SLUG_TO_BJCP ile BJCP anahtarına bağlanan (stil sayımı yalnız bunlardan) · batch 3–250 L (doz için).
// Doz (g/L) yalnız miktarı ve batch hacmi olan satırlardan; aynı reçetede aynı kalem toplanır. Akıl dışı doz (malt > 800, hop > 60,
//   katkı > 200 g/L) dağılıma girmez (sayılır). Kalite etiketi YOK: tipiklik ≠ iyilik (kalite etiketi yalnız 539 reçetede).
// Kullanım: node _korpus_build.js [--kuru]   (--kuru: dosya yazmaz, ölçüm basar)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const KOK = __dirname, HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), SF = path.join(KOK, 'sw.js'), VF = path.join(KOK, 'korpus_kullanim.js');
const KORPUS = path.join(KOK, 'working', '_step105_dataset_v8_clean.json'), KURU = process.argv.includes('--kuru');
const TAG = /<script src="korpus_kullanim\.js\?v=([0-9a-f]+)"><\/script>/g, SWU = /'\.\/korpus_kullanim\.js\?v=([0-9a-f]+)'/g;
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
if (!fs.existsSync(KORPUS)) abort('korpus yok: ' + KORPUS);
const html = fs.readFileSync(HF, 'utf8').replace(/\r\n/g, '\n');
// dize-farkında parantez eşleme
function blok(bas, ac) {
  const i = html.indexOf(bas); if (i < 0) abort('dilim yok: ' + bas);
  let j = html.indexOf(ac, i), d = 0, q = null;
  for (let k = j; k < html.length; k++) { const c = html[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && html[k + 1] === '/') { k = html.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && html[k + 1] === '*') { k = html.indexOf('*/', k + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === ac) d++; else if (c === (ac === '[' ? ']' : '}')) { d--; if (d === 0) return html.slice(j, k + 1); } }
  abort('kapanmadı: ' + bas);
}
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(['MALTLAR', 'HOPLAR', 'MAYALAR', 'KATKILAR'].map(a => 'var ' + a + ' = ' + blok('const ' + a + '=[', '[') + ';').join('\n') +
  '\nvar BJCP = ' + blok('const BJCP = {', '{') + ';\nvar SLUG_TO_BJCP = ' + blok('const SLUG_TO_BJCP = {', '{') + ';', ctx);
const nb = html.indexOf('// ═══ SPRINT ND1 — ÖRNEK → KURU REÇETE'), ne = html.indexOf('\n})();', nb); if (nb < 0 || ne < 0) abort('ND1 bloğu yok');
vm.runInContext(html.slice(nb, ne + 6), ctx);
const W = ctx.window; if (typeof W._bmKatCoz !== 'function' || typeof W._bmMetinCoz !== 'function') abort('çözücü yüklenmedi');
const BJCP = ctx.BJCP, S2B = ctx.SLUG_TO_BJCP; if (Object.keys(BJCP).length !== 240) abort('BJCP 240 değil');

// ── kullanım zamanı sınıfları ──
function hopZaman(h) { const u = String(h.use || '').toLowerCase(), t = +h.time_min;
  if (/dry|kalt|trocken/.test(u)) return 'kuru hop'; if (/whirl|hopstand|stand|flame|steep/.test(u)) return 'whirlpool';
  if (/first|fwh|vorder/.test(u)) return 'FWH'; if (/mash|maisch/.test(u)) return 'mash';
  if (!isFinite(t)) return 'zaman yok'; return t >= 45 ? 'kaynatma ≥45 dk' : t >= 15 ? 'kaynatma 15–44 dk' : t > 0 ? 'kaynatma 1–14 dk' : 'kaynatma sonu (0 dk)'; }
function katkiZaman(x) { const u = String(x.use || '').toLowerCase();
  if (/bottl|abfüll|prim(ing)?$|keg/.test(u)) return 'şişeleme'; if (/second|ferment|primary|gär|dry/.test(u)) return 'fermantasyon';
  if (/mash|maisch/.test(u)) return 'mash'; if (/boil|koch|whirl|flame/.test(u)) return 'kaynatma'; return u ? 'diğer' : 'zaman yok'; }
const SINIR = { malt: 800, hop: 60, katki: 200, maya: Infinity };

// ── tek geçiş ──
const T = new Map(); // 'tip:id' → { n, st:Map, d:[], z:Map, dis }
const say = { kayit: 0, ayristirilamadi: 0, gecerli: 0, hacimli: 0, satir: { malt: 0, hop: 0, katki: 0, maya: 0 }, eslesen: { malt: 0, hop: 0, katki: 0, maya: 0 }, miscAlan: {}, miscMiktarli: 0, misc: 0 };
const cache = { malt: new Map(), hop: new Map(), katki: new Map(), maya: new Map() };
function coz(tip, ham) { const c = cache[tip]; if (c.has(ham)) return c.get(ham); let id = null;
  try { id = tip === 'katki' ? W._bmMetinCoz('katki', ham) : (W._bmKatCoz(tip, ham) || W._bmMetinCoz(tip, ham)); } catch (e) { id = null; }
  c.set(ham, id || null); return id || null; }
function kayit(r) {
  say.kayit++; const raw = r.raw || {}, stil = r.bjcp_slug && S2B[r.bjcp_slug] && BJCP[S2B[r.bjcp_slug]] ? S2B[r.bjcp_slug] : null;
  if (!stil) return; say.gecerli++;
  const L = +raw.batch_size_l, hacim = L >= 3 && L <= 250; if (hacim) say.hacimli++;
  const rec = new Map(); // 'tip:id' → { g, z:Set }
  const ekle = (tip, ham, g, z) => { say.satir[tip]++; const id = ham ? coz(tip, String(ham)) : null; if (!id) return; say.eslesen[tip]++;
    const k = tip + ':' + id; let e = rec.get(k); if (!e) { e = { g: 0, gv: false, z: new Set() }; rec.set(k, e); } if (g > 0) { e.g += g; e.gv = true; } if (z) e.z.add(z); };
  (Array.isArray(raw.malts) ? raw.malts : []).forEach(m => m && ekle('malt', m.name, (+m.amount_kg || 0) * 1000, null));
  (Array.isArray(raw.hops) ? raw.hops : []).forEach(h => h && ekle('hop', h.name, +h.amount_g || 0, hopZaman(h)));
  (Array.isArray(raw.misc) ? raw.misc : []).forEach(x => { if (!x) return; say.misc++; const ad = typeof x === 'string' ? x : x.name;
    if (typeof x === 'object') Object.keys(x).forEach(k => { say.miscAlan[k] = (say.miscAlan[k] || 0) + 1; });
    if (typeof x === 'object' && typeof x.amount === 'number') say.miscMiktarli++; const g = 0; // AI2 ölçümü: katkı 'amount' SAYI ama BİRİMSİZ (çay kaşığı / adet / tablet / ons karışık) → g/L HESAPLANMAZ
    ekle('katki', ad, g, typeof x === 'object' ? katkiZaman(x) : 'zaman yok'); });
  const y = typeof raw.yeast === 'string' ? raw.yeast : (raw.yeast && raw.yeast.name) || ''; if (y) ekle('maya', y, 0, null);
  rec.forEach((e, k) => { let t = T.get(k); if (!t) { t = { n: 0, st: new Map(), d: [], z: new Map(), dis: 0 }; T.set(k, t); }
    t.n++; t.st.set(stil, (t.st.get(stil) || 0) + 1); e.z.forEach(z => t.z.set(z, (t.z.get(z) || 0) + 1));
    if (hacim && e.gv) { const gL = e.g / L, tip = k.split(':')[0]; if (gL > 0 && gL <= SINIR[tip]) t.d.push(gL); else t.dis++; } });
}
const rs = fs.createReadStream(KORPUS, { encoding: 'utf8', highWaterMark: 1 << 24 }); let buf = ''; const BOUND = '}, {"id": ';
const isle = t => { try { kayit(JSON.parse(t)); } catch (e) { say.ayristirilamadi++; } };
rs.on('data', ch => { buf += ch; const st = buf.indexOf('{"id": '); if (st < 0) return; buf = buf.slice(st); let i;
  while ((i = buf.indexOf(BOUND, 1)) >= 0) { isle(buf.slice(0, i + 1)); buf = buf.slice(i + 2); } if (buf.length > 50e6) { say.ayristirilamadi++; buf = ''; } });
rs.on('end', () => { let last = buf; const c = last.lastIndexOf('}]}'); if (c > 0) last = last.slice(0, c + 1); isle(last); bitir(); });

function yuzde(a, p) { const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); }
const yuv = v => v >= 10 ? Math.round(v * 10) / 10 : v >= 1 ? Math.round(v * 100) / 100 : Math.round(v * 1000) / 1000;
function bitir() {
  const k = {}, ASGARI = 5; // 5'ten az reçetede geçen kalem yazılmaz (gürültü)
  [...T.keys()].sort().forEach(key => { const t = T.get(key); if (t.n < ASGARI) return;
    const o = { n: t.n, st: [...t.st.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5) };
    if (t.d.length >= ASGARI) { const d = t.d.sort((a, b) => a - b); o.d = [yuv(yuzde(d, 0.1)), yuv(yuzde(d, 0.5)), yuv(yuzde(d, 0.9))]; o.dn = d.length; }
    else o.dn = t.d.length;
    if (t.z.size) o.z = [...t.z.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    k[key] = o; });
  const meta = { kaynak: 'Brewmaster korpusu (working/_step105_dataset_v8_clean.json; rmwoods/brewersfriend/brewtoad/braureka/recipator… derlemesi)', kayit: say.kayit, gecerli: say.gecerli,
    hacimli: say.hacimli, kaliteEtiketli: 539, asgari: ASGARI, katkiMiktarli: say.miscMiktarli, katkiSatir: say.misc, katkiMiktarBirim: 'yok — korpusta katkı miktarı birimsiz (çay kaşığı / adet / tablet / ons karışık); katkı için g/L dağılımı verilmez',
    not: 'Topluluk böyle yapmış — kalite ölçüsü değil. Doz g/L = reçete toplamı ÷ batch hacmi; p10 / medyan / p90.' };
  const metin = 'window._KORPUS_KULLANIM = ' + JSON.stringify({ m: meta, k }) + ';\n';
  const kap = { malt: 0, hop: 0, katki: 0, maya: 0 }; Object.keys(k).forEach(x => kap[x.split(':')[0]]++);
  const dozlu = { malt: 0, hop: 0, katki: 0 }; Object.keys(k).forEach(x => { const tp = x.split(':')[0]; if (k[x].d && dozlu[tp] != null) dozlu[tp]++; });
  console.log('[korpus] kayıt ' + say.kayit + ' · ayrıştırılamadı ' + say.ayristirilamadi + ' · geçerli (BJCP stiline bağlı) ' + say.gecerli + ' · hacimli ' + say.hacimli);
  console.log('[satır] ' + JSON.stringify(say.satir) + ' · eşleşen ' + JSON.stringify(say.eslesen));
  console.log('[katkı alanları] ' + JSON.stringify(say.miscAlan) + ' · miktarlı katkı satırı ' + say.miscMiktarli + '/' + say.misc);
  console.log('[tablo] kalem ' + Object.keys(k).length + ' ' + JSON.stringify(kap) + ' · dozlu ' + JSON.stringify(dozlu) + ' · ' + (Buffer.byteLength(metin) / 1024).toFixed(1) + ' KB');
  ['katki:lavanta', 'malt:crf3', 'malt:black_wheat', 'hop:saaz', 'katki:kisnisch'].forEach(x => console.log('  ' + x + ' ' + JSON.stringify(k[x] || null)));
  if (KURU) return;
  fs.writeFileSync(VF, metin);
  const v = crypto.createHash('sha256').update(metin).digest('hex').slice(0, 10);
  let h = fs.readFileSync(HF, 'utf8'), sw = fs.readFileSync(SF, 'utf8');
  const t = [...h.matchAll(TAG)], u = [...sw.matchAll(SWU)]; if (t.length > 1 || u.length > 1) abort('korpus_kullanim.js adresi birden çok kez var');
  const nl = h.includes('\r\n') ? '\r\n' : '\n';
  if (!t.length) { const a = h.indexOf('<script src="iskelet_veri.js?v='), e = h.indexOf('</script>', a) + 9; if (a < 0) abort('iskelet_veri etiketi yok'); h = h.slice(0, e) + nl + '<script src="korpus_kullanim.js?v=' + v + '"></script>' + h.slice(e); }
  else h = h.replace(TAG, () => '<script src="korpus_kullanim.js?v=' + v + '"></script>');
  if (!u.length) { const a = sw.indexOf("'./iskelet_veri.js?v="), e = sw.indexOf('\n', a); if (a < 0) abort('sw.js iskelet_veri satırı yok'); sw = sw.slice(0, e + 1) + "  './korpus_kullanim.js?v=" + v + "',   // SPRINT AI2: topluluk kullanım tablosu — HTML'deki <script src> ile BİREBİR aynı URL (test kilitli)" + (sw.includes('\r\n') ? '\r\n' : '\n') + sw.slice(e + 1); }
  else sw = sw.replace(SWU, () => "'./korpus_kullanim.js?v=" + v + "'");
  fs.writeFileSync(HF, h); fs.writeFileSync(SF, sw);
  console.log('[korpus_kullanim.js] yazıldı · ?v ' + v);
}
