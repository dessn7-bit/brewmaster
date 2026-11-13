#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT ND7 (0) — ÖRNEK SATIRI TANIMA ÖLÇÜMÜ (ağ kapalı, gerçek API YOK, Firebase YOK)
//
//   node tests/nd7_tanima.mjs                  → uygulamanın varsayılan bayraklarıyla
//   node tests/nd7_tanima.mjs --bayrak=kapali  → BM_ND7 bayrakları kapalı (ND7 öncesi davranış; BM_ND6 aynen)
//   node tests/nd7_tanima.mjs --bayrak=acik    → BM_ND7 bayrakları açık
//   node tests/nd7_tanima.mjs --json           → yalnız JSON
//   node tests/nd7_tanima.mjs --dok=<dosya>    → tüm satırların dökümü (yazım → kimlik / sınıf / kural); örnek verisi KAMUYA AÇIK malzeme adlarıdır
//
// Ölçülenler: (1) satır düzeyi tanıma (tip başına; kural kırılımı: sözlük / okuyucu / renk / tablo / sınıf / katalog_bekliyor / VEYA)
//             (2) tamamen tanınan örnek sayısı (malt + hop + maya; ek dahil)  (3) "📦 Stoğumla oluştur" görünen örnek (_bmOrnekMalzemeliMi)
//             (4) kalan tanınmayan adların sıklık listesi (ilk 100)
// Stok fixture'ı yalnız sayfayı ND ölçümleriyle aynı koşulda açmak için yüklenir; çıktıya stok içeriği GİRMEZ.
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, '..'), HTML_AD = 'Brewmaster_v2_79_10.html', PORT = 8753, TABAN = 'http://127.0.0.1:' + PORT;
const argv = process.argv.slice(2);
const arg = ad => { const a = argv.find(x => x === '--' + ad || x.startsWith('--' + ad + '=')); return !a ? null : a.includes('=') ? a.split('=').slice(1).join('=') : true; };
const BAYRAK = typeof arg('bayrak') === 'string' ? arg('bayrak') : null, BAYRAK7 = typeof arg('nd7b') === 'string' ? arg('nd7b') : null, BAYRAK9 = typeof arg('nd7k') === 'string' ? arg('nd7k') : null, JSON_CIKTI = !!arg('json'), DOK = typeof arg('dok') === 'string' ? arg('dok') : null;
const ALT_HTML = process.env.ND7_HTML || null; // karşılaştırma için başka bir HTML sürümü (ör. git show <commit>:… çıktısı)

function fixtureYukle() {
  for (const yol of [path.join(__dirname, 'fixtures', 'brewmaster_yedek_2026-06-26.json'), process.env.BM_FIXTURE || ''].filter(Boolean)) {
    if (!fs.existsSync(yol)) continue;
    const p = JSON.parse(fs.readFileSync(yol, 'utf8')); if (!p || !p.data) continue;
    const ALLOW = /^(bm_|kabir_|_orig|acc_|KR$)/, DISLA = /^(bm_sync_v1|bm_sync_ts_v1|bm_push_sub|bm_draft_v1|bm_alarm_sentkeys_v1|bm_hata_log_v1)$/, seed = {};
    for (const k of Object.keys(p.data)) if (ALLOW.test(k) && !DISLA.test(k) && typeof p.data[k] === 'string') seed[k] = p.data[k];
    return seed;
  }
  return {};
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

// ── sayfa içi ──
function olc(bayrak, dokIste, bayrak7, bayrak9) {
  const K9 = window.BM_ND7K || null, AD9 = K9 ? Object.keys(K9).filter(k => typeof K9[k] === 'boolean') : [];
  if (K9 && bayrak9) { const ac9 = bayrak9 === 'acik' ? AD9 : bayrak9 === 'kapali' ? [] : bayrak9.split(','); AD9.forEach(k => { K9[k] = ac9.indexOf(k) >= 0; }); if (typeof K9.uygula === 'function') K9.uygula(); } // SPRINT ND7K: --nd7k=kapali|acik|<liste>
  const B7 = window.BM_ND7B || null, AD7 = B7 ? Object.keys(B7).filter(k => typeof B7[k] === 'boolean') : [];
  if (B7 && bayrak7) { const ac7 = bayrak7 === 'acik' ? AD7 : bayrak7 === 'kapali' ? [] : bayrak7.split(','); AD7.forEach(k => { B7[k] = ac7.indexOf(k) >= 0; }); if (typeof B7.uygula === 'function') B7.uygula(); } // SPRINT ND7B: --nd7b=kapali|acik|<liste>
  const N = window.BM_ND7 || null, ADLAR = N ? Object.keys(N).filter(k => typeof N[k] === 'boolean') : [];
  if (N && bayrak) { const ac = bayrak === 'acik' ? ADLAR : bayrak === 'kapali' ? [] : bayrak.split(','); ADLAR.forEach(k => { N[k] = ac.indexOf(k) >= 0; }); if (typeof N.uygula === 'function') N.uygula(); }
  const out = { bayraklar: N ? Object.fromEntries(ADLAR.map(k => [k, N[k]])) : null, nd7b: B7 ? Object.fromEntries(AD7.map(k => [k, B7[k]])) : null, nd7k: K9 ? Object.fromEntries(AD9.map(k => [k, K9[k]])) : null, nd6: window.BM_ND6 ? Object.fromEntries(Object.keys(window.BM_ND6).filter(k => typeof window.BM_ND6[k] === 'boolean').map(k => [k, window.BM_ND6[k]])) : null };
  const H = window._bmOrnekHepsi(), T = { malt: null, hop: null, maya: null, ek: null }; Object.keys(T).forEach(k => { T[k] = { satir: 0, urun: 0, sinif: 0, bekliyor: 0, proses: 0, artik: 0, taninmayan: 0, kural: {}, fark: { marka: 0, koken: 0, renk: 0, bicim: 0 } }; });
  const nd7b = { farkSatir: 0, farkOrnek: 0, tasinan: [], mayaKarisim: [], mayse: [], kapaliOg: [], tazeHop: [] }; // SPRINT ND7B ölçümleri (örnek referansı = kaynak stil:idx, kamuya açık)
  const yok = {}, dok = [], ornek = { n: 0, mhm: 0, hepsi: 0, malzemeli: 0, ekAdsizOrnek: 0, ekAdsizSatir: 0, hopsuz: 0, mayasiz: 0 };
  // durum: 'urun' (katalog kimliği) · 'sinif' (ürün yazılmamış, sınıf kalemi) · 'bekliyor' (gerçek ürün, katalogda yok) · 'yok' (tanınmadı)
  const durum = k => k.id ? 'urun' : k.nd7Proses ? 'proses' : k.nd7Artik ? 'artik' : k.bekliyor ? 'bekliyor' : k.sinif ? 'sinif' : 'yok';
  H.forEach(e => {
    const r = window._bmOrnekKuru(e.kaynak, e.stil, e.idx); if (!r) return; ornek.n++;
    let mhm = true, ek = true, farkVar = false; const kim = e.kaynak + ' ' + e.stil + ':' + e.idx;
    const say = (grup, k) => { const t = T[grup], d = durum(k); t.satir++; if (d === 'yok') { t.taninmayan++; const a = grup + '|' + String(k.ham == null ? '' : k.ham).toLowerCase().trim(); yok[a] = (yok[a] || 0) + 1; } else t[d === 'urun' ? 'urun' : d]++;
      const kr = d === 'yok' ? 'tanınmadı' : (k.kural || (k.veya ? 'VEYA' : 'sözlük')); t.kural[kr] = (t.kural[kr] || 0) + 1;
      if (k.fark && k.id) { t.fark[k.fark] = (t.fark[k.fark] || 0) + 1; nd7b.farkSatir++; farkVar = true; }
      if (dokIste) dok.push([grup, String(k.ham == null ? '' : k.ham), k.tip || '', k.id || '', k.sinif || '', k.bekliyor || '', kr, k.fark || '']);
      return d !== 'yok'; };
    r.g.forEach(k => { if (!say('malt', k)) mhm = false; }); r.h.forEach(k => { if (!say('hop', k)) mhm = false; });
    if (r.y) { if (!say('maya', r.y)) mhm = false; } else ornek.mayasiz++;
    (r.yEk || []).forEach(k => { if (!say('maya', k)) mhm = false; }); if (r.yEk && r.yEk.length) nd7b.mayaKarisim.push(kim + ' (' + (r.yEk.length + 1) + ' maya)');
    { const o7 = window._bmOrnekNesne(e.kaynak, e.stil, e.idx) || {}; (o7._tasinan7 || []).forEach(t => nd7b.tasinan.push(kim + ' · ' + t.ham + ' · ' + t.nereden + ' → ' + t.nereye + ' (' + t.id + ')'));
      if (window._bmOrnekHopNorm && window._bmOrnekHopNorm(e.kaynak, o7).some(x => x[2] === 'mash')) nd7b.mayse.push(kim); }
    if (r.h.some(k => k.bicim === 'taze' || k.bicim === 'aged')) nd7b.tazeHop.push(kim);
    if (farkVar) nd7b.farkOrnek++;
    if (window._bmOrnekKapaliNeden && window._bmOrnekKapaliNeden(e.kaynak, e.stil, e.idx)) nd7b.kapaliOg.push(kim);
    if (!r.h.length) ornek.hopsuz++;
    r.ek.forEach(k => { if (!say('ek', k)) ek = false; });
    if (r.ekAdsiz) { ornek.ekAdsizOrnek++; ornek.ekAdsizSatir += r.ekAdsiz; ek = false; }
    if (mhm) ornek.mhm++; if (mhm && ek) ornek.hepsi++;
    if (window._bmOrnekMalzemeliMi(e.kaynak, e.stil, e.idx)) ornek.malzemeli++;
  });
  out.satir = T; out.ornek = ornek; out.nd7bOlcum = nd7b;
  const L = Object.keys(yok).map(a => [a.split('|')[0], a.slice(a.indexOf('|') + 1), yok[a]]).sort((x, y) => y[2] - x[2] || (x[1] < y[1] ? -1 : 1));
  out.taninmayanYazim = { malt: 0, hop: 0, maya: 0, ek: 0 }; L.forEach(x => { out.taninmayanYazim[x[0]]++; });
  out.ilk100 = L.slice(0, 100); if (dokIste) { out.dok = dok; out.tumTaninmayan = L; }
  return out;
}

async function main() {
  const seed = fixtureYukle();
  const srv = await sunucuKur(), browser = await puppeteer.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });
  try {
    const page = await (await browser.createBrowserContext()).newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { const u = r.url(); (u.startsWith(TABAN) || u.startsWith('data:') ? r.continue() : r.abort()).catch(() => {}); }); // dış ağ YASAK
    await page.evaluateOnNewDocument(v => { try { if (!localStorage.getItem('__bm_reg_seed')) { for (const k in v) { try { localStorage.setItem(k, v[k]); } catch (e) {} } localStorage.setItem('__bm_reg_seed', '1'); } } catch (e) {} }, seed);
    await page.goto(TABAN + '/' + HTML_AD, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof render === 'function' && Array.isArray(KR) && typeof window._bmOrnekHepsi === 'function' && window._ndVeriVar && window._ndVeriVar() && !!window._ISKELET_TURETILMIS, { timeout: 60000 });
    const r = await page.evaluate(olc, BAYRAK, !!DOK, BAYRAK7, BAYRAK9);
    if (DOK) { fs.writeFileSync(DOK, JSON.stringify({ dok: r.dok, tumTaninmayan: r.tumTaninmayan })); delete r.dok; delete r.tumTaninmayan; }
    if (JSON_CIKTI) { console.log(JSON.stringify(r)); return 0; }
    console.log('ND7 TANIMA — BM_ND7: ' + (r.bayraklar ? JSON.stringify(r.bayraklar) : 'yok (ND7 öncesi kod)') + ' · örnek ' + r.ornek.n);
    for (const t of ['malt', 'hop', 'maya', 'ek']) { const x = r.satir[t]; console.log('  ' + t.padEnd(4) + ' satır ' + String(x.satir).padStart(4) + ' · ürün ' + x.urun + ' · sınıf ' + x.sinif + ' · katalog bekliyor ' + x.bekliyor + ' · proses ' + x.proses + ' · artık ' + x.artik + ' · TANINMAYAN ' + x.taninmayan + ' (farklı yazım ' + r.taninmayanYazim[t] + ') · kural ' + JSON.stringify(x.kural)); }
    const top = ['malt', 'hop', 'maya', 'ek'].reduce((a, t) => a + r.satir[t].taninmayan, 0);
    console.log('  TOPLAM tanınmayan satır ' + top + ' · adı verilmeyen ek kalem ' + r.ornek.ekAdsizSatir + ' satır / ' + r.ornek.ekAdsizOrnek + ' örnek · hop satırı olmayan örnek ' + r.ornek.hopsuz + ' · maya satırı olmayan ' + r.ornek.mayasiz);
    console.log('  örnek: malt + hop + maya tamamen tanınan ' + r.ornek.mhm + '/' + r.ornek.n + ' · ek dahil ' + r.ornek.hepsi + ' · "Stoğumla oluştur" görünen ' + r.ornek.malzemeli);
    if (r.nd7bOlcum) { const q = r.nd7bOlcum, fk = t => r.satir[t].fark || {}; console.log('  ND7B — BM_ND7B: ' + JSON.stringify(r.nd7b) + ' · fark dolu satır ' + q.farkSatir + ' (malt: marka ' + (fk('malt').marka || 0) + ' · köken ' + (fk('malt').koken || 0) + ' · renk ' + (fk('malt').renk || 0) + ' | hop: biçim ' + (fk('hop').bicim || 0) + ' · köken ' + (fk('hop').koken || 0) + ' | ek: ' + JSON.stringify(fk('ek')) + ') · fark taşıyan örnek ' + q.farkOrnek);
      console.log('  ND7B — taşınan satır ' + q.tasinan.length + ' · maya karışımı ' + q.mayaKarisim.length + ' örnek · mayşe hoplu ' + q.mayse.length + ' örnek · taze / yıllandırılmış hoplu ' + q.tazeHop.length + ' örnek · OG hesaplanamadığı için düğmesi kapalı ' + q.kapaliOg.length + ' örnek');
      if (arg('nd7bliste')) { ['tasinan', 'mayaKarisim', 'mayse', 'tazeHop', 'kapaliOg'].forEach(a => { console.log('    [' + a + ']'); q[a].forEach(x => console.log('      ' + x)); }); } }
    if (arg('liste')) r.ilk100.forEach(x => console.log('    ' + String(x[2]).padStart(3) + ' × [' + x[0] + '] ' + x[1]));
    return 0;
  } finally { await browser.close().catch(() => {}); srv.close(); }
}
main().then(k => process.exit(k)).catch(e => { console.error(e); process.exit(1); });
