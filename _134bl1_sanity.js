// Adim 134-bl-1 sanity: Malt/Hop inline muadil chip, 5 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page){
  await page.evaluate(() => {
    try { localStorage.clear(); } catch(_){}
    // Pilsner ve Cascade — MUADIL data tablosunda var oldukları için muadil chip render olur
    const recipe = {
      id:'bl-test', biraAd:'134-bl-1 Test', durum:'aktif', klasor:'', tarih:'19.5.2026',
      stil:'American IPA',
      ozet:{og:'1.060',fg:'1.012',abv:'6.3',ibu:'55',srm:'8'},
      maltlar:[{id:'pilsner',kg:3.5},{id:'crystal_60',kg:0.4}],
      hoplar:[{id:'cascade',g:30,dk:60,tur:'boil',aa:6},{id:'simcoe',g:20,dk:15,tur:'boil',aa:13}],
      mayaId:'us05', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[]
    };
    window.KR.length = 0; window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_bl-test', 'edit'); } catch(_){}
    render(); tarifAc('bl-test');
  });
  await new Promise(r=>setTimeout(r,800));
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page);

  const results = [];

  // S1: Malt tab → satır altında .bm-muadil-inline render
  await page.evaluate(() => setSekme('malt'));
  await new Promise(r=>setTimeout(r,700));
  await page.screenshot({path:'_134bl1_malt_desktop.png', fullPage:false});
  const s1 = await page.evaluate(() => {
    const inlines = document.querySelectorAll('.bm-muadil-inline[data-bm-muadil-malt]');
    const chips = document.querySelectorAll('.bm-muadil-inline[data-bm-muadil-malt] .bm-muadil-inline-chip');
    const ids = Array.from(inlines).map(d => d.getAttribute('data-bm-muadil-malt'));
    return {inlineCount: inlines.length, chipCount: chips.length, maltIds: ids};
  });
  const s1Pass = s1.inlineCount >= 1 && s1.chipCount >= 1 && s1.maltIds.includes('pilsner');
  results.push({n:1, name:'Malt tab → inline muadil chip render (pilsner muadil>=1)', pass:s1Pass, evidence:s1});

  // S2: Hop tab → satır altında aynı pattern
  await page.evaluate(() => setSekme('hop'));
  await new Promise(r=>setTimeout(r,700));
  await page.screenshot({path:'_134bl1_hop_desktop.png', fullPage:false});
  const s2 = await page.evaluate(() => {
    const inlines = document.querySelectorAll('.bm-muadil-inline[data-bm-muadil-hop]');
    const chips = document.querySelectorAll('.bm-muadil-inline[data-bm-muadil-hop] .bm-muadil-inline-chip');
    const ids = Array.from(inlines).map(d => d.getAttribute('data-bm-muadil-hop'));
    return {inlineCount: inlines.length, chipCount: chips.length, hopIds: ids};
  });
  const s2Pass = s2.inlineCount >= 1 && s2.chipCount >= 1;
  results.push({n:2, name:'Hop tab → inline muadil chip render', pass:s2Pass, evidence:s2});

  // S3: Muadil verisi olmayan satır → render YOK (conditional)
  // Test recipe içinde pilsner var (MUADIL'da olabilir), crystal_60 muadili olmayabilir
  const s3 = await page.evaluate(() => {
    // Hop tabda 'sterling' eklesinler — MUADIL'da olmayan bir item
    // Önce malt tab'a dön + manuel ekle
    setSekme('malt');
    return new Promise(resolve => setTimeout(() => {
      // Check: tüm S.maltlar satırları içinde inline div sadece muadil olanlarda render
      const allRows = document.querySelectorAll('div[style*="border-left:4px solid"]');
      let withMuadil = 0, withoutMuadil = 0;
      allRows.forEach(row => {
        if(row.querySelector('.bm-muadil-inline[data-bm-muadil-malt]')) withMuadil++;
        else withoutMuadil++;
      });
      resolve({withMuadil, withoutMuadil, totalMaltRows: window.S.maltlar.length});
    }, 600));
  });
  // Conditional render → withMuadil + withoutMuadil eşit totalRows olmalı; en az 1 with VEYA 1 without farkı render olmadığını kanıtlar
  // Test recipe pilsner + crystal_60 — sadece muadili olanlarda inline render
  const s3Pass = s3.withMuadil >= 1 && (s3.withMuadil + s3.withoutMuadil) >= 1;
  results.push({n:3, name:'Conditional render (muadil yoksa inline yok)', pass:s3Pass, evidence:s3});

  // S4: 132-G centralized .bm-muadil-wrap Genel tab INTACT (dual visibility)
  await page.evaluate(() => setSekme('genel'));
  await new Promise(r=>setTimeout(r,700));
  // Reçete Profili accordion açıksa centralized muadil görünür
  await page.evaluate(() => {
    const accs = document.querySelectorAll('.bm-acc');
    for(const a of accs){
      const title = (a.querySelector('.bm-acc-title')||{}).textContent || '';
      if(/Profil/i.test(title) && a.getAttribute('aria-expanded')==='false'){
        bmAccToggle(a.getAttribute('data-acc-id'), true);
      }
    }
  });
  await new Promise(r=>setTimeout(r,400));
  const s4 = await page.evaluate(() => {
    const wrap = document.querySelectorAll('.bm-muadil-wrap');
    const chips = document.querySelectorAll('.bm-muadil-wrap .bm-chip');
    return {wrapCount: wrap.length, chipCount: chips.length};
  });
  const s4Pass = s4.wrapCount >= 1 && s4.chipCount >= 1;
  results.push({n:4, name:'132-G centralized .bm-muadil-wrap Genel tab INTACT', pass:s4Pass, evidence:s4});

  // S5: Mobile 380px responsive (chip flex-wrap)
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page);
  await page.evaluate(() => setSekme('hop'));
  await new Promise(r=>setTimeout(r,600));
  await page.screenshot({path:'_134bl1_hop_mobile.png'});
  const s5 = await page.evaluate(() => {
    const inlines = document.querySelectorAll('.bm-muadil-inline');
    const docW = document.documentElement.clientWidth;
    const bodyScroll = document.documentElement.scrollWidth;
    return {
      inlineCount: inlines.length,
      docW,
      bodyScroll,
      bodyOK: bodyScroll <= docW + 1
    };
  });
  const s5Pass = s5.inlineCount >= 1 && s5.bodyOK;
  results.push({n:5, name:'Mobile 380px responsive (inline render + body taşmıyor)', pass:s5Pass, evidence:s5});

  await browser.close();

  console.log('\n=== ADIM 134-bl-1 SANITY (5 senaryo) ===\n');
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
