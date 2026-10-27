// EŞİTLİK SPRINT 3 (kusur 7) — ADIM 2/2: eğitim maya dizgesi → katalog mayası → eğitimdeki gerçek bayrak tablosu
//
// Ne yapar: ml/maya_bayrak_egitim.py çıktısındaki her ham maya dizgesini UYGULAMANIN KENDİ eşleyicisiyle
//   (_bmKatCoz / _bmKalemCekirdek — eşitlik testinin dönüştürmesiyle aynı) katalog mayasına bağlar; katalog mayası başına
//   reçete ağırlıklı bayrak oranlarını toplar. Oranı ≥ 0,5 olan bayrak tabloya girer; en az ESIK reçetesi olan maya tabloya girer.
//   Tablo HTML'deki _BM_YEAST_EGITIM ile birebir olmalıdır (npm test ESIT3-MAYA denetler).
//
// Çalıştırma (depo kökünden; önce ml/maya_bayrak_egitim.py):
//   node ml/maya_bayrak_tablosu.mjs [--girdi working/_esitlik/s3/maya_top.json] [--html Brewmaster_v2_79_10.html] [--cikti ml/maya_bayrak_egitim.json] [--esik 5]
// Çıktı: ml/maya_bayrak_egitim.json — yalnız katalog kimliği, reçete sayısı ve bayrak adları (ham dizge / veri YOK)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer';
const argv = process.argv.slice(2), arg = (a, v) => { const x = argv.find(s => s.startsWith('--' + a + '=')); return x ? x.split('=').slice(1).join('=') : v; };
const KOK = process.cwd(), GIRDI = arg('girdi', 'working/_esitlik/s3/maya_top.json'), HTML = path.resolve(KOK, arg('html', 'Brewmaster_v2_79_10.html'));
const CIKTI = arg('cikti', 'ml/maya_bayrak_egitim.json'), ESIK = +arg('esik', '5'), ORAN = 0.5;
const YF = ['yeast_belgian', 'yeast_abbey', 'yeast_saison', 'yeast_kveik', 'yeast_english', 'yeast_american', 'yeast_german_lager', 'yeast_czech_lager', 'yeast_american_lager',
  'yeast_kolsch', 'yeast_altbier', 'yeast_cal_common', 'yeast_brett', 'yeast_lacto', 'yeast_sour_blend', 'yeast_witbier', 'yeast_wheat_german', 'yeast_wit'];
const G = JSON.parse(fs.readFileSync(GIRDI, 'utf8')), top = G.top;
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = u === '/' ? HTML : path.join(KOK, u);
  if (u === '/sw.js' || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' }); s.end(fs.readFileSync(p)); });
const PORT = await new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const b = await puppeteer.launch({ headless: true }), pg = await b.newPage();
await pg.setRequestInterception(true); pg.on('request', q => q.url().startsWith('http://127.0.0.1') || /^(data|blob):/.test(q.url()) ? q.continue() : q.abort());
await pg.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load' }); await pg.waitForFunction(() => window._bmKatCoz, { timeout: 120000 });
const ids = await pg.evaluate(ss => ss.map(ham => { const c = window._bmKalemCekirdek ? _bmKalemCekirdek(ham) : ham; return _bmKatCoz('maya', ham) || (c && c !== ham ? _bmKatCoz('maya', c) : null) || null; }), top.map(t => t.s));
const katalog = await pg.evaluate(() => MAYALAR.map(m => m.id));
await b.close(); srv.close();
const kat = {}; let esl = 0, tum = 0;
top.forEach((t, i) => { tum += t.n; const id = ids[i]; if (!id) return; esl += t.n; const k = kat[id] || (kat[id] = { n: 0, f: {} }); k.n += t.n; for (const [x, o] of Object.entries(t.f)) k.f[x] = (k.f[x] || 0) + o * t.n; });
const tablo = {}, az = {};
for (const id of katalog) { const k = kat[id]; if (!k) continue;
  const bay = YF.filter(x => (k.f[x] || 0) / k.n >= ORAN), oran = Object.fromEntries(YF.filter(x => k.f[x]).map(x => [x, +(k.f[x] / k.n).toFixed(3)]));
  (k.n >= ESIK ? tablo : az)[id] = { n: k.n, bayrak: bay, oran }; }
const out = { aciklama: 'Eşitlik Sprint 3 kusur 7: katalog mayası → eğitim verisinde (v8) o mayaya eşlenen reçetelerin yeast_* bayrakları (oran ≥ ' + ORAN + '). Eşleme uygulamanın kendi _bmKatCoz eşleyicisiyle. Üretici: ml/maya_bayrak_egitim.py + ml/maya_bayrak_tablosu.mjs',
  esik_recete: ESIK, oran_esik: ORAN, egitim_recete: G.recete, ilk_dizge: top.length, ilk_dizge_recete: tum, eslenen_recete: esl, katalog_maya: katalog.length, tablo, esik_alti: az };
fs.writeFileSync(CIKTI, JSON.stringify(out, null, 1) + '\n');
console.log('dizge', top.length, '· reçete', tum, '· eşlenen', esl, '· tablo', Object.keys(tablo).length, '· eşik altı', Object.keys(az).length, '→', CIKTI);
