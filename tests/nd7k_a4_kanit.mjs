#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT ND7K Ö6 — AI4 KANIT PAKETİ ÖNCE / SONRA (ağ kapalı, gerçek API YOK, Firebase YOK, stok YOK)
//
//   node tests/nd7k_a4_kanit.mjs --cikti=<dosya.json>                 → çalışma ağacındaki HTML
//   node tests/nd7k_a4_kanit.mjs --html=<başka.html> --cikti=<dosya>  → başka sürüm (ör. git show <commit>:Brewmaster_v2_79_10.html çıktısı)
//   node tests/nd7k_a4_kanit.mjs --kiyas=<a.json>,<b.json>            → iki çıktıyı karşılaştır (fark sayısı; farkta çıkış kodu 1)
//
// Girdi: G seti (tests/ai5_g_seti.json) ve tuzak seti (tests/tuzak_seti.json) istem METİNLERİ + taban reçeteleri.
// Her istem için uygulamanın kendi akışı izlenir (A4.cozumle → ikame ise A1.degisiklikKur + A1.hukum → A4.kanitKur) ve kanıt paketinin
// METNİ kaydedilir. Ayrıca katalogdaki HER kalem için A4.odulluOrnekler(tip, id, null) listesi kaydedilir (AI4'ün ödüllü örnek kanıtı).
// Kişisel veri yüklenmez (stok boş, bardak kaydı yok); çıktıda yalnız set metinlerinden ve uygulama verisinden türeyen metin vardır.
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, '..'), HTML_AD = 'Brewmaster_v2_79_10.html', PORT = 8758, TABAN = 'http://127.0.0.1:' + PORT;
const argv = process.argv.slice(2);
const arg = ad => { const a = argv.find(x => x === '--' + ad || x.startsWith('--' + ad + '=')); return !a ? null : a.includes('=') ? a.split('=').slice(1).join('=') : true; };
const ALT_HTML = typeof arg('html') === 'string' ? path.resolve(arg('html')) : null, CIKTI = typeof arg('cikti') === 'string' ? arg('cikti') : null, KIYAS = typeof arg('kiyas') === 'string' ? arg('kiyas').split(',') : null;

if (KIYAS) {
  const A = JSON.parse(fs.readFileSync(KIYAS[0], 'utf8')), B = JSON.parse(fs.readFileSync(KIYAS[1], 'utf8'));
  let fark = 0; const ornek = [];
  for (const alan of ['kanit', 'odul']) {
    const a = A[alan] || {}, b = B[alan] || {}, K = new Set(Object.keys(a).concat(Object.keys(b))); let f = 0, yalnizB = 0;
    for (const k of K) { if (alan === 'odul' && !(k in a)) { yalnizB++; continue; } // B'de yeni katalog kalemi (A'da kayıt yok): ayrı sayılır
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { f++; if (ornek.length < 12) ornek.push((alan + ' · ' + k + ' · ' + JSON.stringify(a[k]) + ' → ' + JSON.stringify(b[k])).slice(0, 300)); } }
    console.log('  ' + alan.padEnd(6) + ' anahtar ' + K.size + ' (A ' + Object.keys(a).length + ' · B ' + Object.keys(b).length + ') · farklı ' + f + (yalnizB ? ' · yalnız B\'de (yeni katalog kalemi) ' + yalnizB : '')); fark += f;
  }
  console.log('  istem ' + A.istemN + ' ↔ ' + B.istemN + ' · paket kurulan ' + A.paketN + ' ↔ ' + B.paketN + ' · TOPLAM FARK ' + fark); ornek.forEach(x => console.log('    ' + x));
  process.exit(fark ? 1 : 0);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
function sunucuKur() {
  return new Promise((coz, hata) => {
    const s = http.createServer((req, res) => {
      try {
        const u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/sw.js') { res.writeHead(404); res.end(); return; }
        let p = path.join(KOK, u === '/' ? HTML_AD : u);
        if (!path.normalize(p).startsWith(path.normalize(KOK)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
        if (ALT_HTML && u === '/' + HTML_AD) p = ALT_HTML;
        const buf = fs.readFileSync(p);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'no-store' }); res.end(buf);
      } catch (e) { res.writeHead(500); res.end(); }
    });
    s.on('error', hata); s.listen(PORT, '127.0.0.1', () => coz(s));
  });
}

function sayfada(G, TZ) {
  const A1 = window.BM_AI1, A4 = window.BM_AI4, kanit = {}, odul = {}; let paketN = 0;
  const kur = (id, metin, T) => {
    try {
      const c = A4.cozumle(metin, T); let kal = [], hk = null, deg = null;
      if (c.mod === 'yok' || c.mod === 'belirsiz') { kanit[id] = 'MOD ' + c.mod; return; }
      if (c.mod === 'ikame') { deg = A1.degisiklikKur(T, c.v); if (!(deg && deg.ok)) { kanit[id] = 'İKAME KURULAMADI'; return; } hk = A1.hukum(c.stil || T.stil, deg);
        kal = [deg.yeniId ? { tip: deg.tip, id: deg.yeniId } : null, deg.eskiId ? { tip: deg.tip, id: deg.eskiId } : null].filter(Boolean); }
      const tek = c.kalem || (c.yeni ? c.yeni : c.eski) || null; if (!kal.length && tek) kal = [tek];
      const P = A4.kanitKur({ stil: c.stil, kalemler: kal, hk: hk, deg: deg, mod: c.mod }); paketN++;
      kanit[id] = { mod: c.mod, stil: c.stil || null, kalemler: kal.map(k => k.tip + ':' + k.id), metin: P.metin, f: P.f };
    } catch (x) { kanit[id] = 'HATA ' + x.message; }
  };
  const GR = {}; (G.receteler || []).forEach(r => { GR[r.id] = r; });
  (G.istemler || []).forEach(i => { const r = GR[i.recete] || {}; kur('G:' + i.id, i.metin, { stil: r.stil || (r.tarif && r.tarif.stil) || '', tarif: Object.assign({ hacim: 11, verim: 61, mashSc: 66 }, JSON.parse(JSON.stringify(r.tarif || {}))) }); });
  (TZ.istemler || []).forEach(i => { const tb = TZ.tabanlar[i.taban] || {}; kur('T:' + i.id, i.istem, { stil: tb.stil || '', tarif: Object.assign({ hacim: 11, verim: 61, mashSc: 66 }, JSON.parse(JSON.stringify(tb.tarif || {}))) }); });
  [['malt', MALTLAR], ['hop', HOPLAR], ['maya', MAYALAR], ['katki', KATKILAR]].forEach(([t, L]) => L.forEach(x => { if (!x || !x.id) return;
    try { odul[t + ':' + x.id] = A4.odulluOrnekler(t, x.id, null).map(o => [o.k, o.stil, o.ad, o.miktar, o.odul].join(' ¦ ')); } catch (e) { odul[t + ':' + x.id] = 'HATA ' + e.message; } }));
  const bay = o => o ? Object.keys(o).filter(k => typeof o[k] === 'boolean' && o[k]) : null;
  return { istemN: (G.istemler || []).length + (TZ.istemler || []).length, paketN, kanit, odul, nd7: bay(window.BM_ND7), nd7b: bay(window.BM_ND7B), nd7k: bay(window.BM_ND7K) };
}

async function main() {
  const puppeteer = (await import('puppeteer')).default;
  const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai5_g_seti.json'), 'utf8')), TZ = JSON.parse(fs.readFileSync(path.join(__dirname, 'tuzak_seti.json'), 'utf8'));
  const srv = await sunucuKur(), browser = await puppeteer.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });
  try {
    const page = await (await browser.createBrowserContext()).newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { const u = r.url(); (u.startsWith(TABAN) || u.startsWith('data:') ? r.continue() : r.abort()).catch(() => {}); }); // dış ağ YASAK
    await page.goto(TABAN + '/' + HTML_AD, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof render === 'function' && window.BM_AI1 && window.BM_AI4 && typeof window.BM_AI4.kanitKur === 'function' && typeof window._bmMalzemeAra === 'function' && window._ndVeriVar && window._ndVeriVar(), { timeout: 60000 });
    const t0 = Date.now(), r = await page.evaluate(sayfada, G, TZ); r.sure_ms = Date.now() - t0;
    const odDolu = Object.values(r.odul).filter(v => Array.isArray(v) && v.length).length, hata = Object.values(r.kanit).filter(v => typeof v === 'string' && /^HATA/.test(v)).length + Object.values(r.odul).filter(v => typeof v === 'string').length;
    console.log('[a4] istem ' + r.istemN + ' · paket kurulan ' + r.paketN + ' · katalog kalemi ' + Object.keys(r.odul).length + ' (ödüllü örneği olan ' + odDolu + ') · hata ' + hata + ' · süre ' + r.sure_ms + ' ms · BM_ND7 ' + JSON.stringify(r.nd7) + ' · BM_ND7B ' + JSON.stringify(r.nd7b) + ' · BM_ND7K ' + JSON.stringify(r.nd7k));
    if (CIKTI) fs.writeFileSync(CIKTI, JSON.stringify(r));
    return 0;
  } finally { await browser.close().catch(() => {}); srv.close(); }
}
main().then(k => process.exit(k)).catch(e => { console.error(e); process.exit(1); });
