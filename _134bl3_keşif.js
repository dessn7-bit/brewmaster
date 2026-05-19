// 134-bl-3 keşif: mobile 380px milestone overflow var mı?
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page, sonGun){
  // sonGun: 'kısa' (14), 'orta' (45), 'uzun' (120) - kondisyon uzun lager
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
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));

  const tests = [];
  for(const sg of [14, 45, 120]){
    await setupRecipe(page, sg);
    await page.evaluate(() => setSekme('takvim'));
    await new Promise(r=>setTimeout(r,800));
    await page.evaluate(() => {
      const acc = document.querySelector('.bm-acc[data-acc-id="takvim-milestone"]');
      if(acc && acc.getAttribute('aria-expanded')==='false') bmAccToggle('takvim-milestone', true);
    });
    await new Promise(r=>setTimeout(r,400));
    await page.screenshot({path:`_134bl3_kesif_${sg}gun.png`});
    const r = await page.evaluate(() => {
      const cells = document.querySelectorAll('.bm-ms-cell');
      const container = cells.length > 0 ? cells[0].parentElement : null;
      const containerW = container ? container.getBoundingClientRect().width : 0;
      const containerSW = container ? container.scrollWidth : 0;
      const cellMinW = cells.length > 0 ? getComputedStyle(cells[0]).minWidth : null;
      const cellW = cells.length > 0 ? Math.round(cells[0].getBoundingClientRect().width * 10) / 10 : 0;
      return {
        cellCount: cells.length,
        cellMinW,
        cellWidth: cellW,
        containerW: Math.round(containerW),
        containerSW: Math.round(containerSW),
        overflows: containerSW > containerW + 1,
        bodyScroll: document.documentElement.scrollWidth,
        bodyOK: document.documentElement.scrollWidth <= 380 + 1
      };
    });
    tests.push({sg, ...r});
  }
  console.log(JSON.stringify(tests, null, 2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
