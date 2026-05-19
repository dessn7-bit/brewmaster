// Adim 134-F sanity: Sync modal layout polish, 5 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));

  const results = [];

  // S1: Modal aç (syncPanelAc) + DOM render
  await page.evaluate(() => syncPanelAc());
  await new Promise(r=>setTimeout(r,400));
  const s1 = await page.evaluate(() => {
    const modal = document.querySelector('[onclick="this.remove()"]');
    if (!modal) return {found:false};
    const inputs = modal.querySelectorAll('input.inp');
    const buttons = modal.querySelectorAll('button.btn');
    return {
      found:true,
      inputCount: inputs.length,
      btnCount: buttons.length,
      hasTitle: modal.textContent.includes('Bulut Senkron'),
      hasUrlInput: !!document.getElementById('syncUrlInp'),
      hasOdaInput: !!document.getElementById('syncOdaInp'),
      hasCihazInput: !!document.getElementById('syncCihazInp')
    };
  });
  const s1Pass = s1.found && s1.inputCount === 3 && s1.btnCount === 2 &&
                 s1.hasTitle && s1.hasUrlInput && s1.hasOdaInput && s1.hasCihazInput;
  results.push({n:1, name:'Modal aç (3 input + 2 btn + başlık + ID)', pass:s1Pass, evidence:s1});

  // S2: Vintage palette intact — #6A8A9A 0 match (slate-blue silinmiş), eski #1A3A5A 0 match (134-Q migrate)
  const s2 = await page.evaluate(() => {
    const modal = document.querySelector('[onclick="this.remove()"]');
    if (!modal) return {found:false};
    const html = modal.outerHTML;
    return {
      found:true,
      oldSlateBlue: (html.match(/#6A8A9A/gi)||[]).length,
      old134QBlue: (html.match(/#1A3A5A/gi)||[]).length,
      old134QSky: (html.match(/#A0D0F0/gi)||[]).length,
      hasKahve: html.includes('#5C3A0E'),
      hasAmber: html.includes('#E8C28A'),
      hasVintageBg: html.includes('#F5E8D0')
    };
  });
  const s2Pass = s2.found && s2.oldSlateBlue === 0 && s2.old134QBlue === 0 && s2.old134QSky === 0 &&
                 s2.hasKahve && s2.hasAmber && s2.hasVintageBg;
  results.push({n:2, name:'Vintage palette intact (slate-blue 0, kahve+amber+vintage-bg var)', pass:s2Pass, evidence:s2});

  // S3: Input default value handling (mevcut config yoksa boş)
  const s3 = await page.evaluate(() => {
    const url = document.getElementById('syncUrlInp');
    const oda = document.getElementById('syncOdaInp');
    const cihaz = document.getElementById('syncCihazInp');
    return {
      urlValue: url ? url.value : null,
      odaValue: oda ? oda.value : null,
      cihazValue: cihaz ? cihaz.value : null,
      urlPlaceholder: url ? url.placeholder.includes('firebaseio.com') : false,
      odaPlaceholder: oda ? oda.placeholder.includes('oda') || oda.placeholder.includes('kaan') : false
    };
  });
  const s3Pass = s3.urlPlaceholder && s3.odaPlaceholder;
  results.push({n:3, name:'Input placeholder intact (firebaseio + oda hint)', pass:s3Pass, evidence:s3});

  // S4: syncKaydetVeBaslat + syncTemizle handlers intact
  const s4 = await page.evaluate(() => {
    const btnKaydet = Array.from(document.querySelectorAll('button.btn')).find(b =>
      (b.getAttribute('onclick')||'').includes('syncKaydetVeBaslat'));
    const btnKapat = Array.from(document.querySelectorAll('button.btn')).find(b =>
      (b.getAttribute('onclick')||'').includes('syncTemizle'));
    return {
      kaydetFound: !!btnKaydet,
      kapatFound: !!btnKapat,
      kaydetText: btnKaydet ? btnKaydet.textContent.trim() : null,
      kapatText: btnKapat ? btnKapat.textContent.trim() : null,
      fnsExist: typeof syncKaydetVeBaslat === 'function' && typeof syncTemizle === 'function'
    };
  });
  const s4Pass = s4.kaydetFound && s4.kapatFound && s4.fnsExist &&
                 /Kaydet/.test(s4.kaydetText) && /Kapat/.test(s4.kapatText);
  results.push({n:4, name:'Kaydet+Kapat btn handlers intact', pass:s4Pass, evidence:s4});

  // Modal kapat
  await page.evaluate(() => syncTemizle());
  await new Promise(r=>setTimeout(r,300));

  // S5: Mobile 380px responsive — modal taşmıyor, max-width:380 sığıyor
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await page.evaluate(() => syncPanelAc());
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:'_134F_sync_mobile.png'});
  const s5 = await page.evaluate(() => {
    const modal = document.querySelector('[onclick="this.remove()"]');
    if (!modal) return {found:false};
    const inner = modal.firstElementChild;
    const rect = inner ? inner.getBoundingClientRect() : null;
    const docW = document.documentElement.clientWidth;
    return {
      found:true,
      docW,
      modalW: rect ? Math.round(rect.width) : null,
      bodyScroll: document.documentElement.scrollWidth,
      bodyOK: document.documentElement.scrollWidth <= docW + 1
    };
  });
  const s5Pass = s5.found && s5.modalW <= s5.docW && s5.bodyOK;
  results.push({n:5, name:'Mobile 380px modal sığar + body taşmıyor', pass:s5Pass, evidence:s5});

  await browser.close();

  console.log('\n=== ADIM 134-F SANITY (5 senaryo) ===\n');
  console.log('| # | Senaryo | PASS | Detay |');
  console.log('|---|---------|------|-------|');
  let pass = 0;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    let detay = JSON.stringify(r.evidence);
    if (detay.length > 140) detay = detay.slice(0,140) + '...';
    console.log(`| ${r.n} | ${r.name} | ${mark} | ${detay} |`);
    if (r.pass) pass++;
  }
  console.log(`\nToplam: ${pass}/${results.length}`);
  console.log(pass === results.length ? `SANITY PASS (${pass}/${results.length})` : 'SANITY FAIL');
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
