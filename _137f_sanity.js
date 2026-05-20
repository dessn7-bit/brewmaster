// 137-F sanity: Dubbel yüklü + empty state çalışıyor + responsive intact
const path = require('path'); const fs = require('fs');
const puppeteer = require('puppeteer'); const http = require('http');

const server = http.createServer((req, res) => {
  let file = path.resolve(__dirname, req.url.slice(1) || 'Brewmaster_v2_79_10.html');
  if (req.url === '/') file = path.resolve(__dirname, 'Brewmaster_v2_79_10.html');
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file);
    const mt = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' :
               ext === '.woff2' ? 'font/woff2' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mt, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(file));
  } else { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(r => server.listen(8788, r));
  const results = [];

  // Test 1+2+3: Mobil 380, empty LS → Dubbel yüklendi + render OK + içerik tam
  {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 380, height: 800 });
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    const r = await page.evaluate(() => ({
      krLen: typeof KR !== 'undefined' ? KR.length : -1,
      dubbel: typeof KR !== 'undefined' ? KR.find(r => r && r.id === 'dubbel_2024') : null,
      ekran: typeof ekran !== 'undefined' ? ekran : null,
      bodyText: document.body.innerText.slice(0, 200)
    }));
    results.push({ name: 'Mobil 380 empty LS', krLen: r.krLen,
      hasDubbel: !!r.dubbel, biraAd: r.dubbel && r.dubbel.biraAd,
      maltCount: r.dubbel && r.dubbel.maltlar && r.dubbel.maltlar.length,
      hopCount: r.dubbel && r.dubbel.hoplar && r.dubbel.hoplar.length,
      mayaId: r.dubbel && r.dubbel.mayaId,
      ekran: r.ekran });
    await browser.close();
  }

  // Test 4: Empty state — Dubbel sil + tüm KR boşalt + render → "Planlanmış tarif yok" görünür mü
  {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 380, height: 800 });
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    // KR boşalt + render
    const r = await page.evaluate(() => {
      KR.length = 0;
      localStorage.setItem('bm_v6', '[]');
      ekran = 'liste';
      render();
      return { krLen: KR.length, bodyText: document.body.innerText.slice(0, 400) };
    });
    results.push({ name: 'Empty state', krLen: r.krLen,
      hasEmptyMessage: /yok|boş|henüz|tarif/i.test(r.bodyText),
      bodyText: r.bodyText.replace(/\n/g, ' ').slice(0, 120) });
    await browser.close();
  }

  // Test 5: Editör + Stok render — fonksiyonlar var mı, çağırınca render kırılmıyor mu
  {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 380, height: 800 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    // Editör aç
    const editor = await page.evaluate(() => {
      if (typeof tarifAc !== 'function' || !KR.length) return { error: 'no_func_or_kr' };
      tarifAc(KR[0].id);
      return { ok: true, ekran: typeof ekran !== 'undefined' ? ekran : null,
        editor_dom: !!document.querySelector('.bm-acc, .bm-sticky-summary, .bm-tahmin-ribbon') };
    });
    await new Promise(r => setTimeout(r, 400));
    // Stok aç
    const stok = await page.evaluate(() => {
      if (typeof stokEkranAc !== 'function') return { error: 'no_stok_func' };
      stokEkranAc();
      return { ok: true, ekran: typeof ekran !== 'undefined' ? ekran : null,
        stok_dom: !!document.querySelector('.bm-stok-anatab, .bm-stok-ictab') };
    });
    await new Promise(r => setTimeout(r, 400));
    results.push({ name: 'Editör + Stok render', editor, stok, errors });
    await browser.close();
  }

  // Test 6: Mobile 380px responsive (sidebar gizli, hamburger var)
  {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 380, height: 800 });
    await page.goto('http://localhost:8788/', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    const r = await page.evaluate(() => {
      const sb = document.querySelector('.bm-sidebar');
      const hm = document.querySelector('.bm-hamburger-btn');
      const sbRect = sb && sb.getBoundingClientRect();
      const hmRect = hm && hm.getBoundingClientRect();
      return {
        sidebarOffscreen: !sb ? null : (sbRect.right <= 0 || getComputedStyle(sb).transform.includes('matrix')),
        hamburgerVisible: !!(hm && hmRect && hmRect.width > 0)
      };
    });
    results.push({ name: 'Mobile 380px responsive', ...r });
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  server.close();
})().catch(e => { console.error('FATAL', e); server.close(); process.exit(2); });
