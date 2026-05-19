// Adim 134-bl-7 sanity: Chip miktar artır duplicate önle, 5 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page, opts){
  opts = opts || {};
  await page.evaluate((o) => {
    try { localStorage.clear(); } catch(_){}
    // STOK seed (bl-6 entegrasyon test için)
    if (o.stok) {
      STOK.length = 0;
      o.stok.forEach(s => STOK.push({
        id: s.id || s.refId, refId: s.refId || s.id,
        ad: s.ad, miktar: s.miktar, birim: s.birim, adim: 10
      }));
      try { localStorage.setItem('bm_stok_v1', JSON.stringify(STOK)); } catch(_){}
    } else {
      STOK.length = 0; // boş stok
    }
    const recipe = {
      id:'bl7-test', biraAd:'134-bl-7 Test', durum:'aktif', klasor:'', tarih:'20.5.2026',
      stil:'American IPA',
      ozet:{og:'1.060',fg:'1.012',abv:'6.3',ibu:'40',srm:'8'},
      maltlar: o.maltlar || [{id:'pilsner',kg:3.5}],
      hoplar: o.hoplar || [{id:'cascade',g:20,dk:60,tur:'boil',aa:6}],
      mayaId:'us05', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[]
    };
    window.KR.length = 0; window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_bl7-test', 'edit'); } catch(_){}
    render(); tarifAc('bl7-test');
  }, opts);
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

  // S1: Aynı hop + aynı dk (60) 2 kere ekle → 1 satır, miktar toplam
  // Initial: Centennial 60dk 5g preset
  await setupRecipe(page, {
    hoplar: [{id:'centn', g:5, dk:60, tur:'boil', aa:10}]
  });
  await page.evaluate(() => window.bmDoctorChipClick('+7g Centennial', '🌿'));
  await new Promise(r=>setTimeout(r,500));
  const s1 = await page.evaluate(() => {
    const sR = (typeof S!=='undefined')?S:window.KR[0];
    const centns = sR.hoplar.filter(h => h.id === 'centn');
    return {
      centnCount: centns.length,
      centnG: centns.length ? centns[0].g : null,
      centnDk: centns.length ? centns[0].dk : null,
      totalHopRows: sR.hoplar.length
    };
  });
  // 5 + 7 = 12g, 1 satır
  const s1Pass = s1.centnCount === 1 && s1.centnG === 12 && s1.centnDk === 60;
  results.push({n:1, name:'Aynı hop+dk: 5g + 7g = 12g (1 satır)', pass:s1Pass, evidence:s1});

  // S2: Aynı hop + FARKLI dk (10dk preset, +60dk chip) → 2 satır
  await setupRecipe(page, {
    hoplar: [{id:'centn', g:5, dk:10, tur:'boil', aa:10}]  // 10dk preset
  });
  await page.evaluate(() => window.bmDoctorChipClick('+7g Centennial', '🌿')); // 60dk default
  await new Promise(r=>setTimeout(r,500));
  const s2 = await page.evaluate(() => {
    const sR = (typeof S!=='undefined')?S:window.KR[0];
    const centns = sR.hoplar.filter(h => h.id === 'centn');
    return {
      centnCount: centns.length,
      centnDks: centns.map(c => c.dk),
      centnGs: centns.map(c => c.g)
    };
  });
  // 2 satır: 5g@10dk + 7g@60dk
  const s2Pass = s2.centnCount === 2 && s2.centnDks.includes(10) && s2.centnDks.includes(60);
  results.push({n:2, name:'Aynı hop+farklı dk: 2 satır (5g@10dk + 7g@60dk)', pass:s2Pass, evidence:s2});

  // S3: Yeni hop ekle → push normal (length artar)
  await setupRecipe(page, {
    hoplar: [{id:'cascade', g:20, dk:60, tur:'boil', aa:6}]
  });
  const s3Before = await page.evaluate(() => ((typeof S!=='undefined')?S:window.KR[0]).hoplar.length);
  await page.evaluate(() => window.bmDoctorChipClick('+10g Simcoe', '🌿'));
  await new Promise(r=>setTimeout(r,500));
  const s3 = await page.evaluate(() => {
    const sR = (typeof S!=='undefined')?S:window.KR[0];
    return {
      hoplarLen: sR.hoplar.length,
      ids: sR.hoplar.map(h => h.id)
    };
  });
  const s3Pass = s3.hoplarLen === s3Before + 1 && s3.ids.includes('simcoe');
  results.push({n:3, name:'Yeni hop (Simcoe) push (length +1)', pass:s3Pass, evidence:{before:s3Before, after:s3}});

  // S4: Aynı malt ekle → miktar artır (existing prevention zaten var, korunur)
  await setupRecipe(page, {
    maltlar: [{id:'pilsner', kg:1}]
  });
  await page.evaluate(() => window.bmDoctorChipClick('+0.5 kg Pilsner', '📈'));
  await new Promise(r=>setTimeout(r,500));
  const s4 = await page.evaluate(() => {
    const sR = (typeof S!=='undefined')?S:window.KR[0];
    const pilsners = sR.maltlar.filter(m => m.id === 'pilsner');
    return {
      pilsnerCount: pilsners.length,
      pilsnerKg: pilsners.length ? pilsners[0].kg : null
    };
  });
  // 1 + 0.5 = 1.5 kg, 1 satır
  const s4Pass = s4.pilsnerCount === 1 && s4.pilsnerKg === 1.5;
  results.push({n:4, name:'Aynı malt: 1kg + 0.5kg = 1.5kg (1 satır, existing prevention)', pass:s4Pass, evidence:s4});

  // S5: bl-6 stokDusur match branch'te de çağrılır (aynı hop ekle → stok düşürülür)
  await setupRecipe(page, {
    hoplar: [{id:'centn', g:5, dk:60, tur:'boil', aa:10}],
    stok: [{refId:'centn', ad:'Centennial', miktar:30, birim:'g'}]
  });
  await page.evaluate(() => { document.getElementById('bm-toast-container').innerHTML = ''; });
  await page.evaluate(() => window.bmDoctorChipClick('+7g Centennial', '🌿'));
  await new Promise(r=>setTimeout(r,500));
  const s5 = await page.evaluate(() => {
    const sR = (typeof S!=='undefined')?S:window.KR[0];
    const centns = sR.hoplar.filter(h => h.id === 'centn');
    const stok = STOK.find(x => x.refId === 'centn' || x.id === 'centn');
    return {
      centnG: centns.length ? centns[0].g : null,
      centnCount: centns.length,
      stokMiktar: stok ? stok.miktar : null
    };
  });
  // Hop: 5+7=12, stok: 30-7=23
  const s5Pass = s5.centnG === 12 && s5.centnCount === 1 && s5.stokMiktar === 23;
  results.push({n:5, name:'bl-6 stokDusur match branch (hop 12g, stok 23g)', pass:s5Pass, evidence:s5});

  await browser.close();

  console.log('\n=== ADIM 134-bl-7 SANITY (5 senaryo) ===\n');
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
