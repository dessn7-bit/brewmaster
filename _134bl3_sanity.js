// Adim 134-bl-3 sanity: Mobile long timeline horizontal scroll, 5 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page, sonGun){
  await page.evaluate((sg) => {
    try { localStorage.clear(); } catch(_){}
    const pitchTarih = new Date(Date.now() - sg*86400000);
    const siseleTarih = new Date(Date.now() - Math.floor(sg/2)*86400000);
    const recipe = {
      id:'bl3-test', biraAd:'134-bl-3 Test', durum:'aktif', klasor:'',
      tarih: pitchTarih.toLocaleDateString('tr-TR'),
      stil: sg > 80 ? 'Doppelbock' : 'American Pale Ale',
      ozet:{og:'1.060',fg:'1.012',abv:'6.3',ibu:'40',srm:'8'},
      maltlar:[{id:'pilsner',kg:3}],
      hoplar:[{id:'styrian',g:30,dk:60,tur:'kaynatma',aa:4}],
      mayaId:'us05', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[
        {tip:'pitching', tarih: pitchTarih.toISOString().slice(0,10), not:''},
        {tip:'siseleme', tarih: siseleTarih.toISOString().slice(0,10), not:''}
      ]
    };
    window.KR.length = 0; window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_bl3-test', 'edit'); } catch(_){}
    render(); tarifAc('bl3-test');
  }, sonGun);
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => setSekme('takvim'));
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => {
    const acc = document.querySelector('.bm-acc[data-acc-id="takvim-milestone"]');
    if(acc && acc.getAttribute('aria-expanded')==='false') bmAccToggle('takvim-milestone', true);
  });
  await new Promise(r=>setTimeout(r,400));
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));

  const results = [];

  // S1: Mobile 380px uzun timeline (120 gün) → wrap container overflow-x:auto + body taşmıyor
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page, 120);
  await page.screenshot({path:'_134bl3_mobile_120gun.png'});
  const s1 = await page.evaluate(() => {
    const wrap = document.querySelector('.bm-ms-container-wrap');
    if(!wrap) return {found:false};
    const cs = getComputedStyle(wrap);
    const inner = wrap.querySelector('.bm-ms-container');
    return {
      found:true,
      wrapOverflowX: cs.overflowX,
      wrapScrollW: wrap.scrollWidth,
      wrapClientW: wrap.clientWidth,
      innerScrollW: inner ? inner.scrollWidth : 0,
      cellCount: wrap.querySelectorAll('.bm-ms-cell').length,
      bodyScroll: document.documentElement.scrollWidth,
      bodyOK: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    };
  });
  // wrap overflow-x auto + scrollWidth > clientWidth (scrollable) + body taşmaz
  const s1Pass = s1.found && s1.wrapOverflowX === 'auto' &&
                 s1.wrapScrollW > s1.wrapClientW && s1.bodyOK;
  results.push({n:1, name:'Mobile 380px uzun timeline (120 gün) overflow-x:auto + body taşmıyor', pass:s1Pass, evidence:s1});

  // S2: Mobile 380px kısa timeline (14 gün) → scrollable değil (fit) + body taşmıyor
  await setupRecipe(page, 14);
  await page.screenshot({path:'_134bl3_mobile_14gun.png'});
  const s2 = await page.evaluate(() => {
    const wrap = document.querySelector('.bm-ms-container-wrap');
    if(!wrap) return {found:false};
    return {
      found:true,
      wrapScrollW: wrap.scrollWidth,
      wrapClientW: wrap.clientWidth,
      scrollable: wrap.scrollWidth > wrap.clientWidth,
      bodyOK: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    };
  });
  // 14 gün için scrollable olmamalı (fit)
  const s2Pass = s2.found && !s2.scrollable && s2.bodyOK;
  results.push({n:2, name:'Mobile 380px kısa timeline (14 gün) fit (scrollable=false)', pass:s2Pass, evidence:s2});

  // S3: Desktop 1024px → uzun timeline tek satır intact (overflow yok)
  await page.setViewport({ width: 1366, height: 900 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page, 120);
  await page.screenshot({path:'_134bl3_desktop_120gun.png', fullPage:false});
  const s3 = await page.evaluate(() => {
    const wrap = document.querySelector('.bm-ms-container-wrap');
    if(!wrap) return {found:false};
    const cs = getComputedStyle(wrap);
    return {
      found:true,
      wrapOverflowX: cs.overflowX,
      scrollable: wrap.scrollWidth > wrap.clientWidth + 1,
      cellCount: wrap.querySelectorAll('.bm-ms-cell').length
    };
  });
  // Desktop: overflow-x:visible (mobile media query inactive) → desktop layout DOKUNULMAZ
  // Scrollable durumu pre-existing (cell × min-width > container) — bizim eklediğimiz scroll affordance YOK
  const s3Pass = s3.found && s3.wrapOverflowX === 'visible';
  results.push({n:3, name:'Desktop 1024px+ overflow-x:visible (mobile media query inactive)', pass:s3Pass, evidence:s3});

  // S4: Click hücre intact + accordion state intact
  const s4 = await page.evaluate(() => {
    const cells = document.querySelectorAll('.bm-ms-cell');
    const cell = cells[Math.floor(cells.length/2)];
    if(!cell) return {found:false};
    const title = cell.getAttribute('title');
    const acc = document.querySelector('.bm-acc[data-acc-id="takvim-milestone"]');
    return {
      found:true,
      cellCount: cells.length,
      midCellTitle: title,
      accExpanded: acc ? acc.getAttribute('aria-expanded') : null
    };
  });
  const s4Pass = s4.found && /gün/.test(s4.midCellTitle) && s4.accExpanded === 'true';
  results.push({n:4, name:'Hücre title intact + accordion state intact', pass:s4Pass, evidence:s4});

  // S5: Mobile 380px body.scrollWidth ≤ 380
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page, 120);
  const s5 = await page.evaluate(() => ({
    docW: document.documentElement.clientWidth,
    bodyScroll: document.documentElement.scrollWidth,
    bodyOK: document.documentElement.scrollWidth <= 380 + 1
  }));
  const s5Pass = s5.bodyOK;
  results.push({n:5, name:'Mobile 380px body.scrollWidth ≤ 380 (uzun timeline ile bile)', pass:s5Pass, evidence:s5});

  await browser.close();

  console.log('\n=== ADIM 134-bl-3 SANITY (5 senaryo) ===\n');
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
