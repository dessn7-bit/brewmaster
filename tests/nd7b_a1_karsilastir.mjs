#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT ND7B (j) — ASİSTAN KALEM BULUCUSU ÖNCE / SONRA (ağ kapalı, gerçek API YOK, Firebase YOK, stok YOK)
//
//   node tests/nd7b_a1_karsilastir.mjs --cikti=<dosya.json>                 → çalışma ağacındaki HTML
//   node tests/nd7b_a1_karsilastir.mjs --html=<başka.html> --cikti=<dosya>  → başka sürüm (ör. git show <commit>:Brewmaster_v2_79_10.html çıktısı)
//   node tests/nd7b_a1_karsilastir.mjs --kiyas=<a.json>,<b.json>            → iki çıktıyı karşılaştır (fark sayısı; farkta çıkış kodu 1)
//
// Girdi: G seti (tests/ai5_g_seti.json, 30 istem + 7 reçete) ve tuzak seti (tests/tuzak_seti.json, 93 istem + tabanlar) istem METİNLERİ.
// Her istem için soru çözücü (BM_AI4.cozumle) ve kalem tarayıcı (BM_AI4.kalemTara) reçeteli ve reçetesiz çalıştırılır; bu sırada
// BM_AI1._kalemBul1'e giden HER çağrı (ham ad, tercih tipi → bulunan kalem) kaydedilir. Tuzak setinin çıkarım alanlarındaki kalem adları
// (kalem / yeni_kalem) ayrıca BM_AI1.kalemBul'a sorulur. Çıktı: çağrı → sonuç haritası + istem → çözücü çıktısı.
// Kişisel veri yüklenmez (stok boş); çıktıda yalnız set metinlerinden türeyen ad öbekleri ve katalog kimlikleri vardır.
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, '..'), HTML_AD = 'Brewmaster_v2_79_10.html', PORT = 8757, TABAN = 'http://127.0.0.1:' + PORT;
const argv = process.argv.slice(2);
const arg = ad => { const a = argv.find(x => x === '--' + ad || x.startsWith('--' + ad + '=')); return !a ? null : a.includes('=') ? a.split('=').slice(1).join('=') : true; };
const ALT_HTML = typeof arg('html') === 'string' ? path.resolve(arg('html')) : null, CIKTI = typeof arg('cikti') === 'string' ? arg('cikti') : null, KIYAS = typeof arg('kiyas') === 'string' ? arg('kiyas').split(',') : null;

if (KIYAS) {
  const A = JSON.parse(fs.readFileSync(KIYAS[0], 'utf8')), B = JSON.parse(fs.readFileSync(KIYAS[1], 'utf8'));
  let fark = 0; const ornek = [];
  for (const alan of ['cagri', 'cozum', 'tara', 'dogrudan']) {
    const a = A[alan] || {}, b = B[alan] || {}, K = new Set(Object.keys(a).concat(Object.keys(b))); let f = 0;
    for (const k of K) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { f++; if (ornek.length < 12) ornek.push((alan + " · " + k + " · " + JSON.stringify(a[k]) + " → " + JSON.stringify(b[k])).slice(0, 260)); }
    console.log('  ' + alan.padEnd(9) + ' anahtar ' + K.size + ' (A ' + Object.keys(a).length + ' · B ' + Object.keys(b).length + ') · farklı ' + f); fark += f;
  }
  console.log('  istem ' + A.istemN + ' ↔ ' + B.istemN + ' · TOPLAM FARK ' + fark); ornek.forEach(x => console.log('    ' + x));
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
  const A1 = window.BM_AI1, A4 = window.BM_AI4, cagri = {}, cozum = {}, tara = {}, dogrudan = {};
  const asil = A1._kalemBul1;
  A1._kalemBul1 = function (ham, tip) { const r = asil.apply(this, arguments); cagri[String(ham) + ' ¦ ' + (tip || '')] = r ? r.tip + ':' + r.id + (r.belirsiz ? ' (belirsiz)' : '') : null; return r; };
  const sade = v => { try { return JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x))); } catch (e) { return 'HATA ' + e.message; } };
  const kos = (id, metin, T) => {
    [['T', T], ['-', null]].forEach(([e, t]) => {
      try { cozum[id + ' ¦ ' + e] = sade(A4.cozumle(metin, t)); } catch (x) { cozum[id + ' ¦ ' + e] = 'HATA ' + x.message; }
      try { tara[id + ' ¦ ' + e] = sade(A4.kalemTara(metin, null, t)); } catch (x) { tara[id + ' ¦ ' + e] = 'HATA ' + x.message; }
    });
  };
  const GR = {}; (G.receteler || []).forEach(r => { GR[r.id] = r.tarif; });
  (G.istemler || []).forEach(i => kos('G:' + i.id, i.metin, GR[i.recete] || null));
  (TZ.istemler || []).forEach(i => { kos('T:' + i.id, i.istem, (TZ.tabanlar[i.taban] || {}).tarif || null);
    const c = i.cikarim || {}; ['kalem', 'yeni_kalem'].forEach(k => { if (c[k]) { const r = A1.kalemBul(c[k]); dogrudan[i.id + ' ¦ ' + k + ' ¦ ' + c[k]] = r ? r.tip + ':' + r.id : null; } }); });
  A1._kalemBul1 = asil;
  return { istemN: (G.istemler || []).length + (TZ.istemler || []).length, cagri, cozum, tara, dogrudan, nd7: window.BM_ND7 ? Object.keys(window.BM_ND7).filter(k => typeof window.BM_ND7[k] === 'boolean' && window.BM_ND7[k]) : null, nd7b: window.BM_ND7B ? Object.keys(window.BM_ND7B).filter(k => typeof window.BM_ND7B[k] === 'boolean' && window.BM_ND7B[k]) : null };
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
    await page.waitForFunction(() => typeof render === 'function' && window.BM_AI1 && window.BM_AI4 && typeof window.BM_AI4.cozumle === 'function' && typeof window._bmKatCoz === 'function', { timeout: 60000 });
    const t0 = Date.now(), r = await page.evaluate(sayfada, G, TZ); r.sure_ms = Date.now() - t0;
    console.log('[a1] istem ' + r.istemN + ' · _kalemBul1 çağrısı (tekil) ' + Object.keys(r.cagri).length + ' · bulunan ' + Object.values(r.cagri).filter(Boolean).length + ' · doğrudan ' + Object.keys(r.dogrudan).length + ' · süre ' + r.sure_ms + ' ms · BM_ND7 ' + JSON.stringify(r.nd7) + ' · BM_ND7B ' + JSON.stringify(r.nd7b));
    if (CIKTI) fs.writeFileSync(CIKTI, JSON.stringify(r));
    return 0;
  } finally { await browser.close().catch(() => {}); srv.close(); }
}
main().then(k => process.exit(k)).catch(e => { console.error(e); process.exit(1); });
