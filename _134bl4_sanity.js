// Adim 134-bl-4 sanity: hop_azalt advanced action, 6 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page){
  await page.evaluate(() => {
    try { localStorage.clear(); } catch(_){}
    // Centennial 7g, Simcoe 20g — IBU yaklaşık 35+
    const recipe = {
      id:'bl4-test', biraAd:'134-bl-4 Test', durum:'aktif', klasor:'', tarih:'20.5.2026',
      stil:'American IPA',
      ozet:{og:'1.060',fg:'1.012',abv:'6.3',ibu:'40',srm:'8'},
      maltlar:[{id:'pilsner',kg:3.5}],
      hoplar:[
        {id:'centennial',g:7,dk:60,tur:'boil',aa:10},
        {id:'simcoe',g:20,dk:15,tur:'boil',aa:13}
      ],
      mayaId:'us05', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[]
    };
    window.KR.length = 0; window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_bl4-test', 'edit'); } catch(_){}
    render(); tarifAc('bl4-test');
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

  // S1: CSS .bm-hop-highlight + @keyframes bmHopPulse tanımlı
  const fs = require('fs');
  const html = fs.readFileSync('Brewmaster_v2_79_10.html','utf8');
  const kfMatch = html.match(/@keyframes\s+bmHopPulse\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  const s1 = {
    hasClass: /\.bm-hop-highlight\b/.test(html),
    hasKeyframe: /@keyframes\s+bmHopPulse\b/.test(html),
    hasVintageBg: /rgba\(184,\s*118,\s*63/.test(kfMatch ? kfMatch[0] : ''),
    keyframePreview: kfMatch ? kfMatch[0].slice(0,120) : 'no match'
  };
  const s1Pass = s1.hasClass && s1.hasKeyframe && s1.hasVintageBg;
  results.push({n:1, name:'CSS .bm-hop-highlight + @keyframes bmHopPulse', pass:s1Pass, evidence:s1});

  // S2: bmDoctorChipParse hop_azalt detay pattern (test: "Centennial 5g azalt")
  const s2 = await page.evaluate(() => {
    const r1 = window.bmDoctorChipParse('Centennial 5g azalt', '🌿');
    const r2 = window.bmDoctorChipParse('5g Cascade azalt', '🌿');
    const r3 = window.bmDoctorChipParse('Centennial azalt 5g', '🌿');
    const r4 = window.bmDoctorChipParse('azalt', '🌿'); // detay yok, generic
    return {r1, r2, r3, r4};
  });
  const s2Pass = s2.r1.action === 'hop_azalt' && s2.r1.name === 'Centennial' && s2.r1.gram === 5 &&
                 s2.r2.action === 'hop_azalt' && /Cascade/i.test(s2.r2.name||'') && s2.r2.gram === 5 &&
                 s2.r3.action === 'hop_azalt' && s2.r3.name === 'Centennial' && s2.r3.gram === 5 &&
                 s2.r4.action === 'hop_azalt' && s2.r4.gram == null;
  results.push({n:2, name:'Parse hop_azalt 4 pattern (3 detay + 1 generic fallback)', pass:s2Pass, evidence:s2});

  // S3: bmDoctorChipClick hop_azalt → setSekme('hop') + S.hoplar.g azalır
  // İlk başlangıç: Centennial 7g (S window-scoped olmayabilir, try direct + KR fallback)
  const s3Init = await page.evaluate(() => {
    var sR = (typeof S !== 'undefined') ? S : window.KR[0];
    return {
      hoplarLen: sR.hoplar ? sR.hoplar.length : 0,
      centennialG: sR.hoplar && sR.hoplar[0] ? sR.hoplar[0].g : null,
      hoplarRaw: JSON.stringify(sR.hoplar||[])
    };
  });
  await page.evaluate(() => window.bmDoctorChipClick('Centennial 5g azalt', '🌿'));
  await new Promise(r=>setTimeout(r,600));
  const s3 = await page.evaluate(() => ({
    centennialG: ((typeof S!=='undefined')?S:window.KR[0]).hoplar[0].g,
    currentSekme: (typeof sekme !== 'undefined') ? sekme : null,
    sbActiveBtn: (document.querySelector('.sb-btn.ak')||{}).getAttribute && document.querySelector('.sb-btn.ak').getAttribute('data-s')
  }));
  // 7g - 5g = 2g, aktif sekme = hop
  const s3Pass = s3.centennialG === 2 && (s3.currentSekme === 'hop' || s3.sbActiveBtn === 'hop');
  results.push({n:3, name:'Click → setSekme hop + S.hoplar.g azalır (7g - 5g = 2g)', pass:s3Pass, evidence:{init:s3Init, after:s3}});

  // S4: Negatif guard — azalt > mevcut → 0'a sabitle
  // Centennial şu an 2g. 10g azalt → 0g (negatif yok)
  await page.evaluate(() => window.bmDoctorChipClick('Centennial 10g azalt', '🌿'));
  await new Promise(r=>setTimeout(r,500));
  const s4 = await page.evaluate(() => ({
    centennialG: ((typeof S!=='undefined')?S:window.KR[0]).hoplar[0].g
  }));
  const s4Pass = s4.centennialG === 0;
  results.push({n:4, name:'Negatif guard (2g - 10g azalt = 0g, negatif yok)', pass:s4Pass, evidence:s4});

  // S5: IBU recalc tetiklenir (post-azalt IBU değişir)
  // Reset to fresh recipe
  await setupRecipe(page);
  const s5Before = await page.evaluate(() => {
    const cR = calc();
    return {ibu: Math.round(cR.ibu * 10) / 10, simcoeG: ((typeof S!=='undefined')?S:window.KR[0]).hoplar[1].g};
  });
  await page.evaluate(() => window.bmDoctorChipClick('Simcoe 15g azalt', '🌿'));
  await new Promise(r=>setTimeout(r,600));
  const s5 = await page.evaluate(() => {
    const cR = calc();
    return {ibu: Math.round(cR.ibu * 10) / 10, simcoeG: ((typeof S!=='undefined')?S:window.KR[0]).hoplar[1].g};
  });
  const s5Pass = s5.simcoeG === 5 && s5.ibu < s5Before.ibu;
  results.push({n:5, name:'IBU recalc (Simcoe 20g→5g sonrası IBU düşer)', pass:s5Pass, evidence:{before:s5Before, after:s5}});

  // S6: Hop bulunamadı warning (reçetede yok)
  await setupRecipe(page);
  // Capture toast text via DOM
  await page.evaluate(() => {
    const c = document.getElementById('bm-toast-container');
    if (c) c.innerHTML = '';
  });
  await page.evaluate(() => window.bmDoctorChipClick('Mosaic 5g azalt', '🌿'));
  await new Promise(r=>setTimeout(r,400));
  const s6 = await page.evaluate(() => {
    const warnings = document.querySelectorAll('.bm-toast--warning');
    return {
      warnCount: warnings.length,
      warnText: warnings.length ? warnings[0].textContent : '',
      mosaicInHoplar: ((typeof S!=='undefined')?S:window.KR[0]).hoplar.some(h => h.id === 'mosaic')
    };
  });
  const s6Pass = s6.warnCount >= 1 && /Mosaic/i.test(s6.warnText) && /yok|reçete/i.test(s6.warnText) && !s6.mosaicInHoplar;
  results.push({n:6, name:'Hop bulunamadı → bmToast warning (Mosaic reçetede yok)', pass:s6Pass, evidence:s6});

  await page.screenshot({path:'_134bl4_hop_after.png', fullPage:false});
  await browser.close();

  console.log('\n=== ADIM 134-bl-4 SANITY (6 senaryo) ===\n');
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
