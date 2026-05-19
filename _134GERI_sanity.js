// Adim 134-GERI sanity: 132-C breadcrumb → ← Geri tuşu, 5 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page, klasor){
  await page.evaluate((kl) => {
    try { localStorage.clear(); } catch(_){}
    const recipe = {
      id:'geri-test', biraAd:'134-GERI Test', durum:'aktif', klasor: kl||'',
      tarih:'20.5.2026', stil:'Dubbel',
      ozet:{og:'1.072',fg:'1.014',abv:'7.8',ibu:'22',srm:'22'},
      maltlar:[{id:'pilsner',kg:3}],
      hoplar:[{id:'styrian',g:30,dk:60,tur:'kaynatma',aa:4}],
      mayaId:'bb_abbaye', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[]
    };
    window.KR.length = 0; window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_geri-test', 'edit'); } catch(_){}
    render(); tarifAc('geri-test');
  }, klasor);
  await new Promise(r=>setTimeout(r,800));
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));

  const results = [];

  // S1: Editör açık → .bm-geri tuşu render, .bm-breadcrumb 0
  await setupRecipe(page, '');
  await page.screenshot({path:'_134GERI_editor_no_folder.png', fullPage:false});
  const s1 = await page.evaluate(() => {
    const geriBtns = document.querySelectorAll('.bm-geri');
    const breadcrumbs = document.querySelectorAll('.bm-breadcrumb');
    const bcLinks = document.querySelectorAll('.bm-bc-link');
    const bcCurrent = document.querySelectorAll('.bm-bc-current');
    return {
      geriCount: geriBtns.length,
      geriText: geriBtns.length ? geriBtns[0].textContent.trim() : null,
      bcCount: breadcrumbs.length,
      bcLinkCount: bcLinks.length,
      bcCurrentCount: bcCurrent.length,
      hasHandler: geriBtns.length ? !!geriBtns[0].getAttribute('onclick') : false
    };
  });
  const s1Pass = s1.geriCount === 1 && /Geri/i.test(s1.geriText) && s1.hasHandler &&
                 s1.bcCount === 0 && s1.bcLinkCount === 0 && s1.bcCurrentCount === 0;
  results.push({n:1, name:'.bm-geri render + breadcrumb DOM 0', pass:s1Pass, evidence:s1});

  // S2: window.bmGeriDon fonksiyon tanımlı
  const s2 = await page.evaluate(() => ({
    fnExists: typeof window.bmGeriDon === 'function'
  }));
  const s2Pass = s2.fnExists;
  results.push({n:2, name:'window.bmGeriDon helper tanımlı', pass:s2Pass, evidence:s2});

  // S3: Geri click → defter sayfası (S.klasor yok)
  const s3Before = await page.evaluate(() => ekran);
  await page.evaluate(() => window.bmGeriDon());
  await new Promise(r=>setTimeout(r,400));
  const s3 = await page.evaluate(() => ({
    ekran: ekran,
    aktifKlasor: (typeof aktifKlasor!=='undefined') ? aktifKlasor : null
  }));
  const s3Pass = s3Before !== 'liste' && s3.ekran === 'liste' && s3.aktifKlasor === '';
  results.push({n:3, name:'Geri click → defter (S.klasor yok, aktifKlasor=)', pass:s3Pass, evidence:{before:s3Before, after:s3}});

  // S4: Klasör context → klasöre dön
  await setupRecipe(page, 'TestKlasor');
  const s4Before = await page.evaluate(() => ({
    ekran: ekran,
    aktifKlasor: (typeof aktifKlasor!=='undefined') ? aktifKlasor : null
  }));
  await page.evaluate(() => window.bmGeriDon());
  await new Promise(r=>setTimeout(r,400));
  const s4 = await page.evaluate(() => ({
    ekran: ekran,
    aktifKlasor: (typeof aktifKlasor!=='undefined') ? aktifKlasor : null
  }));
  const s4Pass = s4.ekran === 'liste' && s4.aktifKlasor === 'TestKlasor';
  results.push({n:4, name:'Klasör context → klasöre dön (aktifKlasor=TestKlasor)', pass:s4Pass, evidence:{before:s4Before, after:s4}});

  // S5: Vintage stil + mobile 380px responsive (touch area ≥ 32px)
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page, '');
  await page.screenshot({path:'_134GERI_editor_mobile.png'});
  const s5 = await page.evaluate(() => {
    const geri = document.querySelector('.bm-geri');
    if(!geri) return {found:false};
    const rect = geri.getBoundingClientRect();
    const cs = getComputedStyle(geri);
    const docW = document.documentElement.clientWidth;
    return {
      found:true,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      docW,
      bodyOK: document.documentElement.scrollWidth <= docW + 1,
      hasBorder: cs.borderStyle !== 'none',
      cursor: cs.cursor
    };
  });
  const s5Pass = s5.found && s5.height >= 28 && s5.bodyOK && s5.hasBorder && s5.cursor === 'pointer';
  results.push({n:5, name:'Mobile 380px: touch area ≥28px + vintage stil + body OK', pass:s5Pass, evidence:s5});

  await browser.close();

  console.log('\n=== ADIM 134-GERI SANITY (5 senaryo) ===\n');
  console.log('| # | Senaryo | PASS | Detay |');
  console.log('|---|---------|------|-------|');
  let pass = 0;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    let detay = JSON.stringify(r.evidence);
    if (detay.length > 180) detay = detay.slice(0,180) + '...';
    console.log(`| ${r.n} | ${r.name} | ${mark} | ${detay} |`);
    if (r.pass) pass++;
  }
  console.log(`\nToplam: ${pass}/${results.length}`);
  console.log(pass === results.length ? `SANITY PASS (${pass}/${results.length})` : 'SANITY FAIL');
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
