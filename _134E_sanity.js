// Adim 134-E sanity: Not tab 2-3 akordiyon, 6 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

const EXPECTED_BASE = [
  {id:'not-tadim',   icon:'🍻', title:'Tadım Değerlendirmesi'},
  {id:'not-serbest', icon:'📝', title:'Serbest Not'}
];
const EXPECTED_WITH_OTURUM = {id:'not-oturumlar', icon:'📋', title:'Oturumlar'};

async function setupRecipe(page, withOturum){
  await page.evaluate((withOturum) => {
    try { localStorage.clear(); } catch(_){}
    const recipe = {
      id:'nt-test', biraAd:'134-E Test', durum:'aktif', klasor:'', tarih:'19.5.2026',
      stil:'Dubbel',
      ozet:{og:'1.072',fg:'1.014',abv:'7.8',ibu:'22',srm:'22'},
      maltlar:[{id:'pilsner',kg:3},{id:'chocolate',kg:0.5}],
      hoplar:[{id:'styrian',g:30,dk:60,tur:'kaynatma',aa:4}],
      mayaId:'bb_abbaye', hacim:10, mashSc:67, mashDk:60, verim:61,
      notlar:'Brewday gözlemi: mash temp stabil, OG hedefte.',
      brewLog:[{tip:'siseleme',tarih:'2026-05-15',not:''}],
      tadim: {aroma:10, gorunum:2, tat:16, agizH:4, genel:8, offList:{}, tadimNot:'Çok iyi', oturumlar: withOturum ? [
        {toplam:38, aroma:10, gorunum:2, tat:16, agizH:4, genel:6, offList:{}, tadimNot:'Önceki', tarih:'2026-05-10'}
      ] : []}
    };
    window.KR.length = 0;
    window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_nt-test', 'edit'); } catch(_){}
    render();
    tarifAc('nt-test');
  }, withOturum);
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => setSekme('not'));
  await new Promise(r=>setTimeout(r,800));
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,800));
  await setupRecipe(page, true); // 1 oturum var
  await page.screenshot({path:'_134E_not_full.png', fullPage:false});

  const results = [];

  // S1: 3 akordiyon DOM count (with oturum)
  const s1 = await page.evaluate(() => {
    const els = document.querySelectorAll('.bm-acc[data-acc-id^="not-"]');
    return {count: els.length, ids: Array.from(els).map(e => e.getAttribute('data-acc-id'))};
  });
  const s1Pass = s1.count === 3 &&
                 s1.ids.includes('not-tadim') &&
                 s1.ids.includes('not-oturumlar') &&
                 s1.ids.includes('not-serbest');
  results.push({n:1, name:'3 akordiyon (oturum var) DOM count + ids', pass:s1Pass, evidence:s1});

  // S2: Header icon+title+meta + tadım meta 40/50 dolu
  const s2 = await page.evaluate(() => {
    const out = {};
    ['not-tadim','not-oturumlar','not-serbest'].forEach(id => {
      const acc = document.querySelector('.bm-acc[data-acc-id="'+id+'"]');
      if (!acc) { out[id] = {found:false}; return; }
      const title = acc.querySelector('.bm-acc-title');
      const meta = acc.querySelector('.bm-acc-meta');
      out[id] = {
        found:true,
        text: title ? title.textContent.trim() : null,
        meta: meta ? meta.textContent.trim() : ''
      };
    });
    return out;
  });
  const s2Pass = s2['not-tadim'].found && /40\/50/.test(s2['not-tadim'].meta) &&
                 s2['not-oturumlar'].found && /1 oturum/.test(s2['not-oturumlar'].meta) &&
                 s2['not-serbest'].found && /\d+ kar/.test(s2['not-serbest'].meta);
  results.push({n:2, name:'Header icon+title+meta (40/50, 1 oturum, X kar)', pass:s2Pass, evidence:s2});

  // S3: Default state — tadım dolu+hasSis → açık, oturumlar default kapalı, serbest dolu → açık
  const s3 = await page.evaluate(() => {
    const out = {};
    ['not-tadim','not-oturumlar','not-serbest'].forEach(id => {
      const acc = document.querySelector('.bm-acc[data-acc-id="'+id+'"]');
      out[id] = acc ? acc.getAttribute('aria-expanded') : 'NOT_RENDERED';
    });
    return out;
  });
  const s3Pass = s3['not-tadim']==='true' &&
                 s3['not-oturumlar']==='false' &&
                 s3['not-serbest']==='true';
  results.push({n:3, name:'Default state (tadim+serbest açık, oturumlar kapalı)', pass:s3Pass, evidence:s3});

  // S4: Click toggle + reload restore
  await page.evaluate(() => bmAccToggle('not-oturumlar'));
  await new Promise(r=>setTimeout(r,300));
  const sBefore = await page.evaluate(() => ({
    oturExpanded: document.querySelector('.bm-acc[data-acc-id="not-oturumlar"]').getAttribute('aria-expanded'),
    lsState: localStorage.getItem('bm_acc_state')
  }));
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => { tarifAc('nt-test'); });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => setSekme('not'));
  await new Promise(r=>setTimeout(r,800));
  const s4 = await page.evaluate(() => ({
    oturExpanded: document.querySelector('.bm-acc[data-acc-id="not-oturumlar"]')?.getAttribute('aria-expanded')
  }));
  const s4Pass = sBefore.oturExpanded === 'true' && s4.oturExpanded === 'true';
  results.push({n:4, name:'Click toggle + reload restore', pass:s4Pass, evidence:{before:sBefore, after:s4}});

  // S5: BJCP puan input + off-flavor checkbox + textarea + arşivle button intact
  const s5 = await page.evaluate(() => {
    const tadAcc = document.querySelector('.bm-acc[data-acc-id="not-tadim"]');
    const serAcc = document.querySelector('.bm-acc[data-acc-id="not-serbest"]');
    if (!tadAcc || !serAcc) return {found:false};
    const tinAroma = tadAcc.querySelector('input[id="_tin_aroma"]');
    const offBox = tadAcc.querySelector('input[type="checkbox"][onchange*="tadimOff"]');
    const tadNot = tadAcc.querySelector('textarea#tadimNot');
    const arsivleBtn = Array.from(tadAcc.querySelectorAll('button')).find(b => (b.getAttribute('onclick')||'').includes('tadimOturumKaydet'));
    const notText = serAcc.querySelector('textarea#notText');
    return {
      found:true,
      tinAromaFound: !!tinAroma,
      tinAromaValue: tinAroma ? tinAroma.value : null,
      offBoxFound: !!offBox,
      tadNotFound: !!tadNot,
      arsivleBtnFound: !!arsivleBtn,
      notTextFound: !!notText,
      notTextValue: notText ? notText.value.slice(0,30) : null
    };
  });
  const s5Pass = s5.found && s5.tinAromaFound && s5.tinAromaValue==='10' &&
                 s5.offBoxFound && s5.tadNotFound && s5.arsivleBtnFound &&
                 s5.notTextFound && s5.notTextValue.includes('Brewday');
  results.push({n:5, name:'Tadım inputs + off-flavor + arşivle + serbest textarea intact', pass:s5Pass, evidence:s5});

  // S6: Mobile 380px responsive + no-oturum case (2 accordion)
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.evaluate(() => { try { localStorage.removeItem('bm_acc_state'); } catch(_){} });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,800));
  await setupRecipe(page, false); // 0 oturum
  await page.screenshot({path:'_134E_not_mobile.png'});
  const s6 = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const bodyScroll = document.documentElement.scrollWidth;
    const accs = document.querySelectorAll('.bm-acc[data-acc-id^="not-"]');
    return {docW, bodyScroll, bodyOK: bodyScroll <= docW + 1, accCount: accs.length, ids: Array.from(accs).map(e=>e.getAttribute('data-acc-id'))};
  });
  const s6Pass = s6.bodyOK && s6.accCount === 2 && !s6.ids.includes('not-oturumlar');
  results.push({n:6, name:'Mobile 380px + no-oturum (2 accordion, oturumlar gizli)', pass:s6Pass, evidence:s6});

  await browser.close();

  console.log('\n=== ADIM 134-E SANITY (6 senaryo) ===\n');
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
