#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT ND6 (0) — "Ne Demleyebilirim?" ÖLÇÜMÜ (ağ kapalı, gerçek API YOK, Firebase YOK)
//
//   node tests/nd6_olcum.mjs                 → bayraklar uygulamadaki varsayılanla
//   node tests/nd6_olcum.mjs --bayrak=kapali → tüm BM_ND6 bayrakları kapalı (eski davranış)
//   node tests/nd6_olcum.mjs --bayrak=acik   → tüm BM_ND6 bayrakları açık
//   node tests/nd6_olcum.mjs --bayrak=muadil → yalnız verilen bayrak(lar) açık (virgüllü liste)
//   node tests/nd6_olcum.mjs --json          → yalnız JSON
//
// Stok = kişisel yedek fixture (git DIŞI). Çıktıya YALNIZ SAYILAR ve stil adları (BJCP, kamuya açık) girer;
// stok kalemi adı / miktarı / reçete adı YAZILMAZ.
//  (a) yayımlanmış örnek rozetleri ✅/🟡/🔴 (+ ❔ taşıyan örnek, tür kırılımı, ND6 "tanınmadı" durumu)
//  (b) "✨ Yeni reçete / Boş iskelet" iskeletinin stokYetersizTam eksik dağılımı
//  (c) _bmStokUyarla('isk') tam / alınacak dağılımı + null dönen stiller
//  (d) seçilen ikame derecelerinin dağılımı (aynen / ✅ / ⚠️ / ≈ / bileşik / alınacak)
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, '..');
const HTML_AD = 'Brewmaster_v2_79_10.html';
const PORT = 8739, TABAN = 'http://127.0.0.1:' + PORT;
const argv = process.argv.slice(2);
const arg = ad => { const a = argv.find(x => x === '--' + ad || x.startsWith('--' + ad + '=')); return !a ? null : a.includes('=') ? a.split('=').slice(1).join('=') : true; };
const BAYRAK = typeof arg('bayrak') === 'string' ? arg('bayrak') : null, JSON_CIKTI = !!arg('json');

function fixtureYukle() {
  const adaylar = [path.join(__dirname, 'fixtures', 'brewmaster_yedek_2026-06-26.json'), process.env.BM_FIXTURE || ''].filter(Boolean);
  for (const yol of adaylar) {
    if (!fs.existsSync(yol)) continue;
    const p = JSON.parse(fs.readFileSync(yol, 'utf8')); if (!p || !p.data) continue;
    const ALLOW = /^(bm_|kabir_|_orig|acc_|KR$)/, DISLA = /^(bm_sync_v1|bm_sync_ts_v1|bm_push_sub|bm_draft_v1|bm_alarm_sentkeys_v1|bm_hata_log_v1)$/, seed = {};
    for (const k of Object.keys(p.data)) if (ALLOW.test(k) && !DISLA.test(k) && typeof p.data[k] === 'string') seed[k] = p.data[k];
    return seed;
  }
  return null;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
function sunucuKur() {
  return new Promise((coz, hata) => {
    const s = http.createServer((req, res) => {
      try {
        const u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/sw.js') { res.writeHead(404); res.end(); return; }
        const p = path.join(KOK, u === '/' ? HTML_AD : u);
        if (!path.normalize(p).startsWith(path.normalize(KOK)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
        const buf = fs.readFileSync(p);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'no-store' }); res.end(buf);
      } catch (e) { res.writeHead(500); res.end(); }
    });
    s.on('error', hata); s.listen(PORT, '127.0.0.1', () => coz(s));
  });
}

// ── sayfa içi ölçüm (yalnız sayı + stil adı döner) ──
function olc(bayrak) {
  const N = window.BM_ND6 || null, ADLAR = N ? Object.keys(N).filter(k => typeof N[k] === 'boolean') : [];
  if (N && bayrak) {
    const ac = bayrak === 'acik' ? ADLAR : bayrak === 'kapali' ? [] : bayrak.split(',');
    ADLAR.forEach(k => { N[k] = ac.indexOf(k) >= 0; });
    if (typeof N.uygula === 'function') N.uygula();
  }
  const out = { bayraklar: N ? Object.fromEntries(ADLAR.map(k => [k, N[k]])) : null, hacim: +S.hacim, stokKalem: STOK.filter(Boolean).length };
  const dag = a => { const d = {}; a.forEach(v => { d[v] = (d[v] || 0) + 1; }); return d; };
  // MUADIL sayımı
  let mOk = 0, mOkK = 0, mUy = 0, mX = 0, mT = 0;
  Object.keys(MUADIL).forEach(k => (MUADIL[k] || []).forEach(m => { if (!m) return; mT++; const f = String(m.fark || '').trim(); if (f.indexOf('✅') === 0) { mOk++; if (m.kaynak && m.kaynak.url) mOkK++; } else if (f.indexOf('⚠️') === 0) mUy++; else if (f.indexOf('❌') === 0) mX++; }));
  out.muadil = { kayit: mT, ok: mOk, okKaynakli: mOkK, uyari: mUy, yanlis: mX };
  // (a) örnek rozetleri
  const H = window._bmOrnekHepsi(), a = { n: 0, ok: 0, farkli: 0, yakin: 0, eksik: 0, taninmadi: 0, farkOlan: 0, kapaliOg: 0, esOlan: 0, es: { malt: 0, hop: 0, maya: 0, katki: 0 }, mayaCokKod: 0, malzemeli: 0, malzemeliTam: 0 };
  H.forEach(e => {
    const s = window._bmOrnekStok(e.kaynak, e.stil, e.idx); if (!s) return; a.n++; a[s.durum] = (a[s.durum] || 0) + 1;
    if (s.eslenemedi > 0) a.esOlan++; if (s.farkN > 0) a.farkOlan++; if (window._bmOrnekKapaliNeden && window._bmOrnekKapaliNeden(e.kaynak, e.stil, e.idx)) a.kapaliOg++; // SPRINT ND7B: 🟨 fark taşıyan örnek · (g) kapalı düğme
    const tum = s.g.concat(s.h, s.ek, s.y ? [s.y] : [], s.yEk || []).filter(x => !x.proses && x.d === 'eslenemedi');
    ['malt', 'hop', 'maya', 'katki'].forEach(t => { if (tum.some(x => x.k.tip === t) || (t === 'katki' && s.ekAdsiz)) a.es[t]++; });
    if (window._bmOrnekMalzemeliMi(e.kaynak, e.stil, e.idx)) { a.malzemeli++; const p = window._bmStokUyarla(e.kaynak, e.stil, e.idx); if (p && !p.alinacak.length && !(p.yetersiz || []).length) a.malzemeliTam++; }
  });
  out.ornek = a;
  // (b) + (c) + (d) iskelet
  const stiller = Object.keys(BJCP).filter(st => window._bmIskeletVar(st)), hz = _stokMayaHazirlik();
  const b = { n: 0, eksiksiz: 0, dagilim: {} }, c = { n: stiller.length, plan: 0, alinacak0: 0, tam: 0, nullStiller: [], alinacakDag: {}, sure_ms: 0, nedenDag: {} }, d = { aynen: 0, ok: 0, uyari: 0, ozellik: 0, bilesik: 0, alinacak: 0, proses: 0 };
  const rozet = { n: 0, dag: {} };
  const t0 = performance.now();
  stiller.forEach(st => {
    const A = window._bmIskeletAl(st), r = window._stilIskeletHesap(st, +S.hacim || 11, +S.verim || 61, null, A.isk);
    if (r && r.malts && r.malts.length) {
      const y = stokYetersizTam({ maltlar: r.malts, hoplar: r.hops, mayaId: r.mayaId, hacim: +S.hacim }, hz), e = (y.eksik || []).length + (y.yetersiz || []).length;
      b.n++; if (!e) b.eksiksiz++; b.dagilim[e] = (b.dagilim[e] || 0) + 1;
    }
    const p = window._bmStokUyarla('isk', st, 0);
    if (!p) { c.nullStiller.push(st); if (window._bmIskStokNeden) { const nd = window._bmIskStokNeden(st); const kk = nd ? nd.kod : '?'; c.nedenDag[kk] = (c.nedenDag[kk] || 0) + 1; } return; }
    const mk = p.miktarsiz || []; // ND6B (1): alınacak = REÇETEYE GİREN satırlar (miktarı kaynakta olmayan katkı sayılmaz); bayraklar kapalıyken mk boş → eski sayım
    c.plan++; const al = p.alinacak.filter(z => mk.indexOf(z) < 0).length; c.alinacakDag[al] = (c.alinacakDag[al] || 0) + 1; if (mk.length) d.miktarsiz = (d.miktarsiz || 0) + mk.length;
    if (!al) { c.alinacak0++; if (!(p.yetersiz || []).length) c.tam++; }
    p.satirlar.forEach(z => { if (z.proses) d.proses++; else if (mk.indexOf(z) >= 0) { /* reçeteye girmez */ } else if (z.alinacak) d.alinacak++; else if (z.secilen) { d[{ 1: 'aynen', 2: 'ok', 3: 'uyari', 4: 'ozellik', 5: 'bilesik' }[z.secilen.derece]]++; if (z.secilen.beyan) d.beyan = (d.beyan || 0) + 1; } });
    if (window._bmIskStokDurum) { const q = window._bmIskStokDurum(st); if (q) { rozet.n++; rozet.dag[q.durum] = (rozet.dag[q.durum] || 0) + 1; } }
  });
  c.sure_ms = Math.round(performance.now() - t0);
  out.yeniRecete = b; out.iskStok = c; out.derece = d; if (rozet.n) out.rozet = rozet;
  return out;
}

async function main() {
  const seed = fixtureYukle(); if (!seed) { console.error('fixture yok (tests/fixtures/brewmaster_yedek_2026-06-26.json) — ölçüm koşulamaz'); return 2; }
  const srv = await sunucuKur(), browser = await puppeteer.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });
  try {
    const page = await (await browser.createBrowserContext()).newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { const u = r.url(); (u.startsWith(TABAN) || u.startsWith('data:') ? r.continue() : r.abort()).catch(() => {}); }); // dış ağ YASAK
    await page.evaluateOnNewDocument(v => { try { if (!localStorage.getItem('__bm_reg_seed')) { for (const k in v) { try { localStorage.setItem(k, v[k]); } catch (e) {} } localStorage.setItem('__bm_reg_seed', '1'); } } catch (e) {} }, seed);
    await page.goto(TABAN + '/' + HTML_AD, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof render === 'function' && Array.isArray(KR) && typeof window._bmOrnekHepsi === 'function' && window._ndVeriVar && window._ndVeriVar() && !!window._ISKELET_TURETILMIS, { timeout: 60000 });
    const r = await page.evaluate(olc, BAYRAK);
    if (JSON_CIKTI) { console.log(JSON.stringify(r)); return 0; }
    const o = r.ornek, y = r.yeniRecete, c = r.iskStok, d = r.derece, m = r.muadil;
    console.log('ND6 ÖLÇÜM — bayraklar: ' + (r.bayraklar ? JSON.stringify(r.bayraklar) : 'BM_ND6 yok (ND6 öncesi kod)') + ' · hacim ' + r.hacim + ' L · stok ' + r.stokKalem + ' kalem');
    console.log('MUADIL  kayıt ' + m.kayit + ' · ✅ ' + m.ok + ' (kaynak alanlı ' + m.okKaynakli + ') · ⚠️ ' + m.uyari + ' · ❌ ' + m.yanlis);
    console.log('(a) örnek ' + o.n + ': ✅ ' + o.ok + ' · 🟡 ' + o.yakin + ' · 🔴 ' + o.eksik + (o.taninmadi ? ' · ❔ tanınmadı ' + o.taninmadi : '') + (o.farkli != null ? ' · 🟨 yakın ürünle ' + o.farkli + ' (fark taşıyan örnek ' + o.farkOlan + ')' : '') + ' | ❔ kalemli örnek ' + o.esOlan + ' (malt ' + o.es.malt + ', maya ' + o.es.maya + ', hop ' + o.es.hop + ', katkı ' + o.es.katki + ') | "Stoğumla oluştur" görünen ' + o.malzemeli + ', tam ' + o.malzemeliTam + (o.kapaliOg != null ? ', OG hesaplanamadığı için kapalı ' + o.kapaliOg : ''));
    console.log('(b) "Yeni reçete / boş iskelet" ' + y.n + ' stil: stokla eksiksiz ' + y.eksiksiz + ' · eksik kalem dağılımı ' + JSON.stringify(y.dagilim));
    console.log('(c) iskelet + stok ' + c.n + ' stil: plan ' + c.plan + ' · alınacak 0 ' + c.alinacak0 + ' · tam ' + c.tam + ' · null ' + c.nullStiller.length + ' · alınacak dağılımı ' + JSON.stringify(c.alinacakDag) + ' · ' + c.sure_ms + ' ms' + (Object.keys(c.nedenDag).length ? ' · null nedenleri ' + JSON.stringify(c.nedenDag) : ''));
    if (arg('null')) console.log('    null stiller: ' + c.nullStiller.join(' | '));
    console.log('(d) seçilen derece: aynen ' + d.aynen + ' · ✅ ' + d.ok + ' · ⚠️ ' + d.uyari + ' · ≈ ' + d.ozellik + ' · bileşik ' + d.bilesik + ' · alınacak ' + d.alinacak + ' · (proses ' + d.proses + (d.miktarsiz ? ' · reçeteye girmeyen miktarsız katkı ' + d.miktarsiz : '') + (d.beyan ? ' · ⚠️ içinde satıcı beyanı ' + d.beyan : '') + ')');
    if (r.rozet) console.log('(e) iskelet-stok rozeti ' + r.rozet.n + ' stil: ' + JSON.stringify(r.rozet.dag));
    return 0;
  } finally { await browser.close().catch(() => {}); srv.close(); }
}
main().then(k => process.exit(k)).catch(e => { console.error(e); process.exit(1); });
