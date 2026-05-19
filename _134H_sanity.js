// Adim 134-H sanity: .inp focus/hover/disabled + checkbox/radio vintage, 7 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');

async function setupRecipe(page){
  await page.evaluate(() => {
    try { localStorage.clear(); } catch(_){}
    const recipe = {
      id:'fh-test', biraAd:'134-H Test', durum:'aktif', klasor:'', tarih:'19.5.2026',
      stil:'Dubbel',
      ozet:{og:'1.072',fg:'1.014',abv:'7.8',ibu:'22',srm:'22'},
      maltlar:[{id:'pilsner',kg:3}],
      hoplar:[{id:'styrian',g:30,dk:60,tur:'kaynatma',aa:4}],
      mayaId:'bb_abbaye', hacim:10, mashSc:67, mashDk:60, verim:61,
      brewLog:[{tip:'siseleme',tarih:'2026-05-15',not:''}],
      tadim:{aroma:0,gorunum:0,tat:0,agizH:0,genel:0,offList:{},tadimNot:'',oturumlar:[]}
    };
    window.KR.length = 0;
    window.KR.push(recipe);
    try { localStorage.setItem('bm_v6', JSON.stringify(window.KR)); } catch(_){}
    try { localStorage.setItem('bm_recete_mode_fh-test', 'edit'); } catch(_){}
    render();
    tarifAc('fh-test');
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

  // S1: .inp:focus → border #B8763F + box-shadow rgba(184,118,63,0.15)
  // Puppeteer programmatic inp.focus() :focus pseudo'yu tetiklemez (headless quirk);
  // page.focus(selector) gerçek FocusEvent yollar + ::focus aktif olur
  await page.evaluate(() => setSekme('hesap'));
  await new Promise(r=>setTimeout(r,600));
  await page.evaluate(() => {
    const inp = document.querySelector('.inp');
    if(inp && !inp.id) inp.id = '_t_focus_inp';
  });
  await page.focus('#_t_focus_inp');
  await new Promise(r=>setTimeout(r,200));
  const s1 = await page.evaluate(() => {
    const inp = document.getElementById('_t_focus_inp');
    if(!inp) return {found:false};
    const cs = getComputedStyle(inp);
    return {
      found:true,
      isActiveElement: document.activeElement === inp,
      borderColor: cs.borderTopColor,
      boxShadow: cs.boxShadow,
      hasOutline: cs.outlineStyle === 'none'
    };
  });
  // #B8763F → rgb(184, 118, 63)
  const s1Pass = s1.found && /184,\s*118,\s*63/.test(s1.borderColor) &&
                 /184,\s*118,\s*63/.test(s1.boxShadow) && s1.hasOutline;
  results.push({n:1, name:'.inp:focus → border #B8763F + box-shadow + outline:none', pass:s1Pass, evidence:s1});

  // S2: .inp:hover stil — CSS source check
  const cssSourceCheck = await page.evaluate(() => {
    let allCssText = '';
    for(const sheet of document.styleSheets){
      try {
        for(const rule of sheet.cssRules){
          allCssText += rule.cssText + '\n';
        }
      } catch(_){}
    }
    return {
      hasHover: /\.inp:hover/.test(allCssText) && /rgba\(184,\s*118,\s*63/.test(allCssText),
      hasDisabled: /\.inp:disabled/.test(allCssText) && /not-allowed/.test(allCssText),
      hasNumberArrowsHide: /input\[type="number"\]\.inp::-webkit-outer-spin-button/.test(allCssText)
    };
  });
  const s2Pass = cssSourceCheck.hasHover && cssSourceCheck.hasDisabled && cssSourceCheck.hasNumberArrowsHide;
  results.push({n:2, name:'.inp:hover + :disabled + number arrows hide', pass:s2Pass, evidence:cssSourceCheck});

  // S3: input[type="checkbox"] global stil → width 18px + border-radius 4px + appearance none
  // 134-E Not tab off-flavor checkbox kullanalım (dinamik 8 chip)
  await page.evaluate(() => setSekme('not'));
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(() => {
    const acc = document.querySelector('.bm-acc[data-acc-id="not-tadim"]');
    if(acc && acc.getAttribute('aria-expanded')==='false') bmAccToggle('not-tadim', true);
  });
  await new Promise(r=>setTimeout(r,400));
  const s3 = await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if(!cb) return {found:false};
    const cs = getComputedStyle(cb);
    return {
      found:true,
      width: cs.width,
      height: cs.height,
      borderRadius: cs.borderRadius,
      appearance: cs.appearance || cs.webkitAppearance,
      borderWidth: cs.borderTopWidth
    };
  });
  const s3Pass = s3.found && s3.width === '18px' && s3.height === '18px' &&
                 (s3.borderRadius === '4px' || s3.borderRadius.startsWith('4px')) &&
                 s3.appearance === 'none';
  results.push({n:3, name:'checkbox global stil (18×18, radius 4px, appearance none)', pass:s3Pass, evidence:s3});

  // S4: Checkbox CHECKED state → bg #B8763F
  // Puppeteer programmatik .checked=true visual update'i tetiklemez;
  // S.tadim.offList'i mutate edip render tetikleyerek `checked` attribute'i HTML'e enjekte ederiz
  await page.evaluate(() => {
    if(!S.tadim) S.tadim = {offList:{}};
    if(!S.tadim.offList) S.tadim.offList = {};
    S.tadim.offList.diacetyl = true;
    render();
  });
  await new Promise(r=>setTimeout(r,600));
  await page.evaluate(() => {
    const acc = document.querySelector('.bm-acc[data-acc-id="not-tadim"]');
    if(acc && acc.getAttribute('aria-expanded')==='false') bmAccToggle('not-tadim', true);
  });
  await new Promise(r=>setTimeout(r,300));
  const s4 = await page.evaluate(() => {
    const cbs = document.querySelectorAll('input[type="checkbox"]');
    const checked = Array.from(cbs).find(c => c.hasAttribute('checked'));
    if(!checked) return {found:false, cbCount:cbs.length};
    checked.offsetWidth;
    const cs = getComputedStyle(checked);
    const afterCs = getComputedStyle(checked, '::after');
    return {
      found:true,
      hasAttr: checked.hasAttribute('checked'),
      matchesChecked: checked.matches(':checked'),
      bg: cs.backgroundColor,
      borderColor: cs.borderTopColor,
      afterContent: afterCs.content
    };
  });
  const s4Pass = s4.found && /184,\s*118,\s*63/.test(s4.bg) &&
                 /184,\s*118,\s*63/.test(s4.borderColor) && /✓/.test(s4.afterContent);
  results.push({n:4, name:'Checkbox checked → bg #B8763F + ✓ tick', pass:s4Pass, evidence:s4});

  // S5: input[type="radio"] global stil — radio kullanımı kaynak kodda yoksa CSS rule source check
  const s5 = await page.evaluate(() => {
    // Test için DOM'a radio ekle ve stil ölç
    const r = document.createElement('input');
    r.type = 'radio';
    r.style.cssText = 'position:fixed;top:-100px';
    document.body.appendChild(r);
    const cs = getComputedStyle(r);
    const out = {
      width: cs.width,
      height: cs.height,
      borderRadius: cs.borderRadius,
      appearance: cs.appearance || cs.webkitAppearance
    };
    r.remove();
    return out;
  });
  const s5Pass = s5.width === '18px' && s5.height === '18px' &&
                 s5.borderRadius === '50%' && s5.appearance === 'none';
  results.push({n:5, name:'radio global stil (18×18, radius 50%, appearance none)', pass:s5Pass, evidence:s5});

  // S6: Radio check toggle → inner dot
  const s6 = await page.evaluate(() => {
    const r = document.createElement('input');
    r.type = 'radio';
    r.style.cssText = 'position:fixed;top:-100px';
    document.body.appendChild(r);
    r.checked = true;
    r.offsetWidth;
    const cs = getComputedStyle(r);
    const afterCs = getComputedStyle(r, '::after');
    const out = {
      borderColor: cs.borderTopColor,
      afterBg: afterCs.backgroundColor,
      afterWidth: afterCs.width
    };
    r.remove();
    return out;
  });
  const s6Pass = /184,\s*118,\s*63/.test(s6.borderColor) &&
                 /184,\s*118,\s*63/.test(s6.afterBg) &&
                 s6.afterWidth === '8px';
  results.push({n:6, name:'Radio checked → border + inner dot #B8763F (8×8)', pass:s6Pass, evidence:s6});

  // S7: Mobile 380px responsive — checkbox 18px sığar
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page);
  await page.evaluate(() => setSekme('not'));
  await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:'_134H_form_mobile.png'});
  const s7 = await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if(!cb) return {found:false};
    const cs = getComputedStyle(cb);
    return {
      found:true,
      width: cs.width,
      bodyScroll: document.documentElement.scrollWidth,
      docW: document.documentElement.clientWidth,
      bodyOK: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    };
  });
  const s7Pass = s7.found && s7.width === '18px' && s7.bodyOK;
  results.push({n:7, name:'Mobile 380px (checkbox 18×18 + body taşmıyor)', pass:s7Pass, evidence:s7});

  // Final desktop screenshot — focus + checkbox + radio göster
  await page.setViewport({ width: 1366, height: 900 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await setupRecipe(page);
  await page.evaluate(() => setSekme('not'));
  await new Promise(r=>setTimeout(r,600));
  await page.evaluate(() => {
    const acc = document.querySelector('.bm-acc[data-acc-id="not-tadim"]');
    if(acc && acc.getAttribute('aria-expanded')==='false') bmAccToggle('not-tadim', true);
    const cb = document.querySelectorAll('input[type="checkbox"]');
    if(cb.length >= 2){ cb[0].checked = true; cb[2].checked = true; }
    const inp = document.querySelector('.inp');
    if(inp) inp.focus();
  });
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:'_134H_form_desktop.png', fullPage:false});

  await browser.close();

  console.log('\n=== ADIM 134-H SANITY (7 senaryo) ===\n');
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
