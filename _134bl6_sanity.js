// Adim 134-bl-6 sanity: Chip stok auto-decrement, 6 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupStokRecipe(page, stokConfig){
  // stokConfig: [{id, ad, miktar, birim, refId?}]
  await page.evaluate((stokC) => {
    try { localStorage.clear(); } catch(_){}
    // STOK is `let` global (line 6242) — not on window, mutate in-place
    var seed = stokC.map(s => ({
      id: s.id || s.refId,
      refId: s.refId || s.id,
      ad: s.ad,
      miktar: s.miktar,
      birim: s.birim,
      adim: 10
    }));
    STOK.length = 0;
    seed.forEach(s => STOK.push(s));
    try { localStorage.setItem('bm_stok_v1', JSON.stringify(STOK)); } catch(_){}
    // Recipe seed
    const recipe = {
      id:'bl6-test', biraAd:'134-bl-6 Test', durum:'aktif', klasor:'', tarih:'20.5.2026',
      stil:'American IPA',
      ozet:{og:'1.060',fg:'1.012',abv:'6.3',ibu:'40',srm:'8'},
      maltlar:[{id:'pilsner',kg:3.5}],
      hoplar:[{id:'cascade',g:20,dk:60,tur:'boil',aa:6}],
      mayaId:'us05', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[]
    };
    window.KR.length = 0; window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_bl6-test', 'edit'); } catch(_){}
    render(); tarifAc('bl6-test');
  }, stokConfig);
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

  // S1: window.bmStokDusurTek tanımlı
  const s1 = await page.evaluate(() => ({
    fnExists: typeof window.bmStokDusurTek === 'function'
  }));
  const s1Pass = s1.fnExists;
  results.push({n:1, name:'window.bmStokDusurTek fonksiyon tanımlı', pass:s1Pass, evidence:s1});

  // S2: Stok varsa + yeterli: hop_ekle → S.stok azalır (50g - 7g = 43g)
  await setupStokRecipe(page, [
    {refId:'centennial', ad:'Centennial', miktar:50, birim:'g'}
  ]);
  await page.evaluate(() => {
    const c = document.getElementById('bm-toast-container');
    if (c) c.innerHTML = '';
  });
  await page.evaluate(() => window.bmDoctorChipClick('+7g Centennial', '🌿'));
  await new Promise(r=>setTimeout(r,500));
  const s2 = await page.evaluate(() => {
    const stok = STOK.find(x => x.refId === 'centennial');
    const toasts = Array.from(document.querySelectorAll('.bm-toast')).map(t => ({tip:t.className, text:t.textContent}));
    return {stokMiktar: stok ? stok.miktar : null, toasts};
  });
  const s2Pass = s2.stokMiktar === 43 && s2.toasts.some(t => /50g\s*→\s*43g/.test(t.text) && /info/.test(t.tip));
  results.push({n:2, name:'Stok yeterli: 50g - 7g = 43g + info toast', pass:s2Pass, evidence:s2});

  // S3: Stok yoksa: info toast "{ad} stokta yok"
  await setupStokRecipe(page, [
    {refId:'cascade', ad:'Cascade', miktar:100, birim:'g'}
  ]);
  await page.evaluate(() => { document.getElementById('bm-toast-container').innerHTML = ''; });
  // Centennial reçeteye ekle ama STOK'ta sadece Cascade var
  await page.evaluate(() => window.bmDoctorChipClick('+5g Centennial', '🌿'));
  await new Promise(r=>setTimeout(r,400));
  const s3 = await page.evaluate(() => {
    const toasts = Array.from(document.querySelectorAll('.bm-toast')).map(t => ({tip:t.className, text:t.textContent}));
    return {toasts, cascadeStok: (STOK.find(x=>x.refId==='cascade')||{}).miktar};
  });
  const s3Pass = s3.toasts.some(t => /Centennial/.test(t.text) && /stokta yok|eklemeyi/i.test(t.text) && /info/.test(t.tip)) &&
                 s3.cascadeStok === 100; // Cascade dokunulmadı
  results.push({n:3, name:'Stok yoksa: info toast "Centennial stokta yok"', pass:s3Pass, evidence:s3});

  // S4: Stok yetersiz: warning toast + STOK dokunulmaz
  await setupStokRecipe(page, [
    {refId:'centennial', ad:'Centennial', miktar:3, birim:'g'}
  ]);
  await page.evaluate(() => { document.getElementById('bm-toast-container').innerHTML = ''; });
  await page.evaluate(() => window.bmDoctorChipClick('+7g Centennial', '🌿'));
  await new Promise(r=>setTimeout(r,400));
  const s4 = await page.evaluate(() => {
    const stok = STOK.find(x => x.refId === 'centennial');
    const toasts = Array.from(document.querySelectorAll('.bm-toast')).map(t => ({tip:t.className.match(/bm-toast--(\w+)/)?.[1], text:t.textContent.slice(0,60)}));
    const sR = ((typeof S!=='undefined')?S:window.KR[0]);
    // Centennial HOPLAR DB id='centn'; recipe initial cascade only → hop_ekle push centn
    const hopRow = sR.hoplar.find(h => h.id === 'centn');
    return {stokMiktar: stok ? stok.miktar : null, toasts, hopAddedToRecipe: !!hopRow, hoplarLen: sR.hoplar.length};
  });
  const s4Pass = s4.stokMiktar === 3 && // STOK dokunulmadı
                 s4.toasts.some(t => /yetersiz/.test(t.text) && /warning/.test(t.tip)) &&
                 s4.hopAddedToRecipe; // Reçete ekleme yapıldı
  results.push({n:4, name:'Stok yetersiz: warning + STOK intact + reçete eklendi', pass:s4Pass, evidence:s4});

  // S5: Düşük stok <10g: warning toast "{ad}: Ng kaldı"
  await setupStokRecipe(page, [
    {refId:'centennial', ad:'Centennial', miktar:15, birim:'g'}
  ]);
  await page.evaluate(() => { document.getElementById('bm-toast-container').innerHTML = ''; });
  await page.evaluate(() => window.bmDoctorChipClick('+7g Centennial', '🌿'));
  await new Promise(r=>setTimeout(r,400));
  const s5 = await page.evaluate(() => {
    const stok = STOK.find(x => x.refId === 'centennial');
    const toasts = Array.from(document.querySelectorAll('.bm-toast')).map(t => ({tip:t.className, text:t.textContent}));
    return {stokMiktar: stok ? stok.miktar : null, toasts};
  });
  // 15g - 7g = 8g → <10 → warning "8g kaldı"
  const s5Pass = s5.stokMiktar === 8 && s5.toasts.some(t => /8g kaldı|düşük stok/.test(t.text) && /warning/.test(t.tip));
  results.push({n:5, name:'Düşük stok (<10g): warning "{ad}: 8g kaldı"', pass:s5Pass, evidence:s5});

  // S6: malt_ekle aynı pattern (kategori malt, birim kg)
  // Crystal 60 MALTLAR DB: id='c60', ad='Crystal 60 (Briess/Simpsons)'
  await setupStokRecipe(page, [
    {refId:'c60', ad:'Crystal 60', miktar:2, birim:'kg'}
  ]);
  await page.evaluate(() => { document.getElementById('bm-toast-container').innerHTML = ''; });
  await page.evaluate(() => window.bmDoctorChipClick('0.5 kg Crystal 60', '📈'));
  await new Promise(r=>setTimeout(r,500));
  const s6 = await page.evaluate(() => {
    const stok = STOK.find(x => x.refId === 'c60');
    const toasts = Array.from(document.querySelectorAll('.bm-toast')).map(t => ({tip:t.className.match(/bm-toast--(\w+)/)?.[1], text:t.textContent.slice(0,80)}));
    const maltRow = ((typeof S!=='undefined')?S:window.KR[0]).maltlar.find(m => m.id === 'c60');
    return {stokMiktar: stok ? stok.miktar : null, toasts, maltAdded: !!maltRow};
  });
  // 2kg - 0.5kg = 1.5kg, kg birim → 1.5kg "düşük stok" değil (>0.1) → info "2kg → 1.5kg"
  const s6Pass = s6.stokMiktar === 1.5 && s6.maltAdded &&
                 s6.toasts.some(t => /2kg\s*→\s*1\.5kg/.test(t.text) && /info/.test(t.tip));
  results.push({n:6, name:'malt_ekle aynı pattern (2kg - 0.5kg = 1.5kg)', pass:s6Pass, evidence:s6});

  await browser.close();

  console.log('\n=== ADIM 134-bl-6 SANITY (6 senaryo) ===\n');
  console.log('| # | Senaryo | PASS | Detay |');
  console.log('|---|---------|------|-------|');
  let pass = 0;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    let detay = JSON.stringify(r.evidence);
    if (detay.length > 250) detay = detay.slice(0,250) + '...';
    console.log(`| ${r.n} | ${r.name} | ${mark} | ${detay} |`);
    if (r.pass) pass++;
  }
  console.log(`\nToplam: ${pass}/${results.length}`);
  console.log(pass === results.length ? `SANITY PASS (${pass}/${results.length})` : 'SANITY FAIL');
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
