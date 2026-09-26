// SPRINT BY — gerçek SW sürüm geçişi test düzeneği. Sunucu HTML + sw.js'i "faz"a göre değiştirir:
//   HTML'e window.__SURUM='A'|'B' enjekte edilir, sw.js'te CACHE_VERSION faza göre değişir (gerçek install/activate).
// Senaryolar:
//   S1 GÜVENLİ (ana ekran): güncelleme → otomatik yenileme → __SURUM 'B'
//   S2 EDİTÖR + odaklı input: yenileme YOK, banner, input değeri korunur
//   S3 BOŞLUK: editördeyken güncelleme → banner kapatılır → ana ekrana dön → resume/focus → (düzeltme ÖNCESİ: eski sürümde kalır)
//   S4 DÖNGÜ: güncelleme sonrası 110 sn izleme → navigasyon sayısı sabit
// Kullanım: node _by_sw_harness.mjs S1|S2|S3|S4
import http from 'http'; import fs from 'fs'; import path from 'path'; import puppeteer from 'puppeteer';
const KOK = 'C:/Users/Kaan/brewmaster', SEN = process.argv[2] || 'S3', PORT = 8797 + ['S1', 'S2', 'S3', 'S4'].indexOf(SEN);
let FAZ = 'A';
const html0 = fs.readFileSync(KOK + '/Brewmaster_v2_79_10.html', 'utf8'), sw0 = fs.readFileSync(KOK + '/sw.js', 'utf8');
const srv = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/' || p === '/Brewmaster_v2_79_10.html') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); return r.end(html0.replace('<head>', '<head><script>window.__SURUM=' + JSON.stringify(FAZ) + '</script>')); }
  if (p === '/sw.js') { r.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' }); return r.end(sw0.replace(/const CACHE_VERSION='bm-cache-[^']+'/, "const CACHE_VERSION='bm-cache-test-" + FAZ + "'")); }
  const f = path.join(KOK, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200); r.end(fs.readFileSync(f));
}).listen(PORT);
const bekle = ms => new Promise(z => setTimeout(z, ms));
const b = await puppeteer.launch({ headless: 'new' });
const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844 });
let nav = 0; pg.on('framenavigated', f => { if (f === pg.mainFrame()) nav++; });
const log = []; pg.on('console', m => { const t = m.text(); if (/\[BM SW\]/.test(t)) log.push(Math.round(performance.now() / 1000) + 's ' + t); });
const URL0 = 'http://127.0.0.1:' + PORT + '/';
await pg.goto(URL0, { waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 30000 }).catch(() => {});
await pg.reload({ waitUntil: 'domcontentloaded' }); // kurulu PWA benzetimi: controller VAR (BL tuzağı)
await pg.waitForFunction(() => !!navigator.serviceWorker.controller && typeof render === 'function', { timeout: 30000 });
const durum = () => pg.evaluate(() => ({ surum: window.__SURUM, ekran: typeof ekran !== 'undefined' ? ekran : '?', banner: !!document.getElementById('bmYeniSurumBar'),
  ctrl: navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.slice(-6) }));
const guncellemeYayinla = async () => { FAZ = 'B'; await pg.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); };
// sayfa yaşı > 15 sn olmalı (BL "HTML zaten taze" kapısı) → bekle
await pg.waitForFunction(() => performance.now() > 16000, { timeout: 30000 });
const sonuc = { senaryo: SEN, baslangic: await durum() };
// S2: V20 modeli yüklenince koşulsuz render() yapıyor (ÖNCEDEN VAR OLAN kusur, SW dışı) — SW yolunu ayrı ölçmek için
// model yüklemesinin bitmesini bekle (render izi temiz kalsın)
if (SEN === 'S2') await pg.waitForFunction(() => performance.now() > 40000, { timeout: 60000 });
if (SEN === 'S2' || SEN === 'S3') {
  await pg.evaluate(() => { const r = KR[0] || null; if (r) tarifAc(r.id); else { yeniTarif(); ekran = 'editor'; render(); } });
  if (SEN === 'S2') await bekle(6000); // reçete açılışı V20 yüklemesini tetikler → ~0,4 sn sonra koşulsuz render; bitsin
  if (SEN === 'S2') await pg.evaluate(() => { const i = document.querySelector('.bm-biraad-inp'); i.focus(); i.value = 'YAZIYORUM-S2'; });
  if (SEN === 'S2') await pg.evaluate(() => { window.__rn = []; const o = window.render; window.render = function(){ window.__rn.push(Math.round(performance.now()) + ' ' + (new Error().stack.split('\n').slice(2, 5).join(' | ').replace(/https?:[^ )]+/g, '').slice(0, 220))); return o.apply(this, arguments); }; window.__el = document.querySelector('.bm-biraad-inp'); });
}
await guncellemeYayinla();
await pg.waitForFunction(() => navigator.serviceWorker.controller && /test-B/.test(navigator.serviceWorker.controller.scriptURL) || document.getElementById('bmYeniSurumBar') || window.__SURUM === 'B', { timeout: 30000 }).catch(() => {});
await bekle(3000);
sonuc.guncellemeSonrasi = await durum();
if (SEN === 'S2') sonuc.inputKorundu = await pg.evaluate(() => ({ deger: (document.querySelector('.bm-biraad-inp') || {}).value, ayniEleman: document.querySelector('.bm-biraad-inp') === window.__el, renderler: window.__rn, odak: document.activeElement && document.activeElement.className }));
if (SEN === 'S3') {
  await pg.evaluate(() => { const k = document.getElementById('bmYeniSurumKapat'); if (k) k.click(); });   // banner kapatıldı
  await pg.evaluate(() => { ekran = 'ana'; render(); if (document.activeElement) document.activeElement.blur(); }); // güvenli ekrana dönüldü
  await bekle(1000);
  // RESUME benzetimi: sekme gizlenip geri gelir (CDP ile gerçek visibility değişimi) + focus
  const cdp = await pg.target().createCDPSession();
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await pg.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await bekle(500);
  await pg.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await pg.waitForFunction(() => window.__SURUM === 'B', { timeout: 45000 }).catch(() => {});
  await bekle(2000);
  sonuc.resumeSonrasi = await durum().catch(e => ({ hata: String(e) }));
}
const navOnce = nav;
if (SEN === 'S1' || SEN === 'S4' || SEN === 'S3') { await bekle(SEN === 'S4' ? 110000 : 20000); }
sonuc.izleme = { sure: SEN === 'S4' ? 110 : 20, navAralik: nav - navOnce, toplamNav: nav, son: await durum().catch(e => ({ hata: String(e) })) };
sonuc.log = log;
console.log(JSON.stringify(sonuc, null, 1));
await b.close(); srv.close();
