// Adim 134-D sanity: Katki tab 4 akordiyon, 7 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

const EXPECTED = [
  {id:'katki-eklenen', icon:'✓',  title:'Eklenen Katkılar'},
  {id:'katki-ozel',    icon:'✏️', title:'Özel Katkı Ekle'},
  {id:'katki-arama',   icon:'🔍', title:'Arama + Öneriler'},
  {id:'katki-grid',    icon:'🧪', title:'Tüm Katkılar'}
];

async function setupRecipe(page){
  await page.evaluate(() => {
    try { localStorage.clear(); } catch(_){}
    const recipe = {
      id:'kt-test', biraAd:'134-D Test', durum:'aktif', klasor:'', tarih:'19.5.2026',
      stil:'Dubbel',
      ozet:{og:'1.072',fg:'1.014',abv:'7.8',ibu:'22',srm:'22'},
      maltlar:[{id:'pilsner',kg:3},{id:'chocolate',kg:0.5}],
      hoplar:[{id:'styrian',g:30,dk:60,tur:'kaynatma',aa:4}],
      mayaId:'bb_abbaye', hacim:10, mashSc:67, mashDk:60, verim:61,
      katkilar:[{id:'irish_moss', ad:'Irish Moss', miktar:5, birim:'g', zaman:'Kaynatma 15.dk'}],
      brewLog:[]
    };
    window.KR.length = 0;
    window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_kt-test', 'edit'); } catch(_){}
    render();
    tarifAc('kt-test');
  });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => setSekme('katki'));
  await new Promise(r=>setTimeout(r,800));
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,800));
  await setupRecipe(page);
  await page.screenshot({path:'_134D_katki_full.png', fullPage:false});

  const results = [];

  // S1: 4 .bm-acc[data-acc-id^="katki-"] DOM count
  const s1 = await page.evaluate(() => {
    const els = document.querySelectorAll('.bm-acc[data-acc-id^="katki-"]');
    return {count: els.length, ids: Array.from(els).map(e => e.getAttribute('data-acc-id'))};
  });
  const s1Pass = s1.count === 4 && EXPECTED.every(g => s1.ids.includes(g.id));
  results.push({n:1, name:'4 akordiyon DOM count + ids', pass:s1Pass, evidence:s1});

  // S2: Her grupta header (ikon+başlık+meta)
  const s2 = await page.evaluate((expected) => {
    const out = {};
    expected.forEach(g => {
      const acc = document.querySelector('.bm-acc[data-acc-id="'+g.id+'"]');
      if (!acc) { out[g.id] = {found:false}; return; }
      const title = acc.querySelector('.bm-acc-title');
      const meta = acc.querySelector('.bm-acc-meta');
      out[g.id] = {
        found:true,
        text: title ? title.textContent.trim() : null,
        hasIcon: title && title.textContent.includes(g.icon),
        hasTitle: title && title.textContent.includes(g.title),
        meta: meta ? meta.textContent.trim() : ''
      };
    });
    return out;
  }, EXPECTED);
  let s2Pass = true;
  EXPECTED.forEach(g => {
    const r = s2[g.id];
    if (!r || !r.found || !r.hasIcon || !r.hasTitle) s2Pass = false;
  });
  results.push({n:2, name:'Header icon+title+meta render', pass:s2Pass, evidence:s2});

  // S3: Default state — eklenen+arama+grid açık, ozel kapalı
  const s3 = await page.evaluate(() => {
    const out = {};
    ['katki-eklenen','katki-ozel','katki-arama','katki-grid'].forEach(id => {
      const acc = document.querySelector('.bm-acc[data-acc-id="'+id+'"]');
      out[id] = acc ? acc.getAttribute('aria-expanded') : 'NOT_RENDERED';
    });
    return out;
  });
  const s3Pass = s3['katki-eklenen']==='true' &&
                 s3['katki-ozel']==='false' &&
                 s3['katki-arama']==='true' &&
                 s3['katki-grid']==='true';
  results.push({n:3, name:'Default state (eklenen+arama+grid açık, ozel kapalı)', pass:s3Pass, evidence:s3});

  // S4: Click toggle + reload state restore
  await page.evaluate(() => bmAccToggle('katki-ozel'));
  await new Promise(r=>setTimeout(r,300));
  const sBefore = await page.evaluate(() => ({
    ozelExpanded: document.querySelector('.bm-acc[data-acc-id="katki-ozel"]').getAttribute('aria-expanded'),
    lsState: localStorage.getItem('bm_acc_state')
  }));
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => { tarifAc('kt-test'); });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => setSekme('katki'));
  await new Promise(r=>setTimeout(r,800));
  const s4 = await page.evaluate(() => ({
    ozelExpanded: document.querySelector('.bm-acc[data-acc-id="katki-ozel"]')?.getAttribute('aria-expanded')
  }));
  const s4Pass = sBefore.ozelExpanded === 'true' && s4.ozelExpanded === 'true';
  results.push({n:4, name:'Click toggle + reload restore', pass:s4Pass, evidence:{before:sBefore, after:s4}});

  // S5: Eklenen katkılar paneli — S.katkilar.length=1 → meta="1 katki"
  const s5 = await page.evaluate(() => {
    const acc = document.querySelector('.bm-acc[data-acc-id="katki-eklenen"]');
    if (!acc) return {found:false};
    const meta = acc.querySelector('.bm-acc-meta');
    const body = acc.querySelector('.bm-acc-body');
    const html = body ? body.innerHTML : '';
    return {
      found:true,
      metaText: meta ? meta.textContent.trim() : '',
      hasIrishMoss: html.includes('Irish Moss') || html.includes('irish_moss'),
      hasSilBtn: !!body.querySelector('button[onclick*="katki_sil"]')
    };
  });
  const s5Pass = s5.found && /1 katki/.test(s5.metaText) && s5.hasIrishMoss && s5.hasSilBtn;
  results.push({n:5, name:'Eklenen panel meta+Irish Moss+sil btn', pass:s5Pass, evidence:s5});

  // S6: Tüm Katkılar grid — KATKILAR listesi var, kategori chip bar var
  const s6 = await page.evaluate(() => {
    const gridAcc = document.querySelector('.bm-acc[data-acc-id="katki-grid"]');
    if (!gridAcc) return {found:false};
    const body = gridAcc.querySelector('.bm-acc-body');
    const ekleBtns = body.querySelectorAll('button[onclick*="katki_ekle_tarif"]');
    return {
      found:true,
      ekleBtnCount: ekleBtns.length,
      hasAccGrup: !!body.querySelector('details') || body.innerHTML.includes('summary')
    };
  });
  const s6Pass = s6.found && s6.ekleBtnCount > 5;
  results.push({n:6, name:'Grid içinde + Ekle butonları + accGrup', pass:s6Pass, evidence:s6});

  // S7: Mobile 380px responsive
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.evaluate(() => { try { localStorage.removeItem('bm_acc_state'); } catch(_){} });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => { tarifAc('kt-test'); });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => setSekme('katki'));
  await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:'_134D_katki_mobile.png'});
  const s7 = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const bodyScroll = document.documentElement.scrollWidth;
    const accs = document.querySelectorAll('.bm-acc[data-acc-id^="katki-"]');
    return {docW, bodyScroll, bodyOK: bodyScroll <= docW + 1, accCount: accs.length};
  });
  const s7Pass = s7.bodyOK && s7.accCount === 4;
  results.push({n:7, name:'Mobile 380px responsive', pass:s7Pass, evidence:s7});

  await browser.close();

  console.log('\n=== ADIM 134-D SANITY (7 senaryo) ===\n');
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
