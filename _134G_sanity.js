// Adim 134-G sanity: bm-toast vintage + flash refactor + 7 alert dönüşüm, 8 senaryo
const puppeteer = require('puppeteer');
const path = require('path');
const HTML_PATH = 'file:///' + path.resolve('Brewmaster_v2_79_10.html').replace(/\\/g,'/');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // Native dialog'ları yakala — alert dönüşümünden sonra hiç tetiklenmemeli
  const nativeDialogs = [];
  page.on('dialog', async (d) => { nativeDialogs.push(d.message()); await d.dismiss(); });

  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,400));

  const results = [];

  // S1: CSS .bm-toast class tanımlı + 4 tip varyant + container CSS
  const cssText = fs.readFileSync('Brewmaster_v2_79_10.html','utf8');
  const s1 = {
    hasBaseClass: /\.bm-toast\s*\{/.test(cssText),
    hasInfo: /\.bm-toast--info\b/.test(cssText),
    hasSuccess: /\.bm-toast--success\b/.test(cssText),
    hasWarning: /\.bm-toast--warning\b/.test(cssText),
    hasError: /\.bm-toast--error\b/.test(cssText),
    hasContainer: /#bm-toast-container\s*\{/.test(cssText)
  };
  const s1Pass = s1.hasBaseClass && s1.hasInfo && s1.hasSuccess && s1.hasWarning && s1.hasError && s1.hasContainer;
  results.push({n:1, name:'CSS .bm-toast + 4 tip + container tanımlı', pass:s1Pass, evidence:s1});

  // S2: window.bmToast helper var
  const s2 = await page.evaluate(() => ({
    bmToastFn: typeof window.bmToast === 'function',
    flashFn: typeof window.flash === 'function' || typeof flash === 'function'
  }));
  const s2Pass = s2.bmToastFn;
  results.push({n:2, name:'window.bmToast global helper (typeof fn)', pass:s2Pass, evidence:s2});

  // S3: flash() body bmToast çağrısı yapıyor (kayitMsg overwrite YOK)
  // flash() trigger → DOM toast eklenmeli, kayitMsg "" kalmalı
  const s3 = await page.evaluate(() => {
    flash('Test mesajı','success');
    return {
      kayitMsgEmpty: (typeof kayitMsg !== 'undefined' && kayitMsg === '') || typeof kayitMsg === 'undefined',
      toastContainerExists: !!document.getElementById('bm-toast-container'),
      toastCount: document.querySelectorAll('.bm-toast').length
    };
  });
  const s3Pass = s3.kayitMsgEmpty && s3.toastContainerExists && s3.toastCount >= 1;
  results.push({n:3, name:'flash() bmToast çağrı + kayitMsg "" (button overwrite yok)', pass:s3Pass, evidence:s3});

  // S4: Toast auto-dismiss 4sn
  await page.evaluate(() => { document.getElementById('bm-toast-container').innerHTML=''; });
  await page.evaluate(() => bmToast('Auto-dismiss test','info'));
  await new Promise(r=>setTimeout(r,400));
  const s4Before = await page.evaluate(() => document.querySelectorAll('.bm-toast').length);
  await new Promise(r=>setTimeout(r,4400)); // 4sn + 320ms fade-out + buffer
  const s4After = await page.evaluate(() => document.querySelectorAll('.bm-toast').length);
  const s4Pass = s4Before >= 1 && s4After === 0;
  results.push({n:4, name:'Toast auto-dismiss 4sn (count: before>=1, after=0)', pass:s4Pass, evidence:{before:s4Before, after:s4After}});

  // S5: Hover toast → timer reset (5sn beklerken hala görünür)
  await page.evaluate(() => bmToast('Hover pause test','info'));
  await new Promise(r=>setTimeout(r,300));
  const s5Init = await page.evaluate(() => document.querySelectorAll('.bm-toast').length);
  // Hover et — 5sn bekle (4sn auto-dismiss'i geçer)
  await page.evaluate(() => {
    const t = document.querySelector('.bm-toast');
    if(t) t.dispatchEvent(new MouseEvent('mouseenter'));
  });
  await new Promise(r=>setTimeout(r,5000));
  const s5Persist = await page.evaluate(() => document.querySelectorAll('.bm-toast').length);
  const s5Pass = s5Init === 1 && s5Persist === 1;
  results.push({n:5, name:'Hover toast → timer pause (5sn sonra hala görünür)', pass:s5Pass, evidence:{init:s5Init, persist:s5Persist}});

  // S6: Click toast → manual dismiss
  await page.evaluate(() => {
    const t = document.querySelector('.bm-toast');
    if(t){ t.dispatchEvent(new MouseEvent('mouseleave')); t.click(); }
  });
  await new Promise(r=>setTimeout(r,400));
  const s6 = await page.evaluate(() => document.querySelectorAll('.bm-toast').length);
  const s6Pass = s6 === 0;
  results.push({n:6, name:'Click toast → manual dismiss', pass:s6Pass, evidence:{count:s6}});

  // S7: alert() çağrısı KALMADI — bmToast tetiklensin, native dialog tetiklenmesin
  // Test: bmToast'i dummy bir alert konseptiyle simüle et + kaynak kodunda alert( say
  const alertInSource = (cssText.match(/[^.\w]alert\(/g)||[]).length;
  // Sync modal aç + boş URL ile kaydet (bmToast warning trigger)
  await page.evaluate(() => syncPanelAc());
  await new Promise(r=>setTimeout(r,300));
  await page.evaluate(() => syncKaydetVeBaslat());
  await new Promise(r=>setTimeout(r,400));
  const s7 = await page.evaluate(() => {
    const toasts = document.querySelectorAll('.bm-toast--warning');
    return {warningCount: toasts.length, text: toasts.length ? toasts[0].textContent : ''};
  });
  const s7Pass = alertInSource === 0 && nativeDialogs.length === 0 && s7.warningCount >= 1 && /URL/.test(s7.text);
  results.push({n:7, name:'alert() 0 (kaynak) + native dialog 0 + bmToast warning tetik', pass:s7Pass, evidence:{alertInSource, nativeDialogCount:nativeDialogs.length, ...s7}});

  // Cleanup
  await page.evaluate(() => { try { syncTemizle(); } catch(_){} document.getElementById('bm-toast-container').innerHTML=''; });

  // S8: Mobile 380px responsive
  await page.setViewport({ width: 380, height: 800, isMobile: true, deviceScaleFactor: 2 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await page.evaluate(() => {
    bmToast('Mobile info test','info');
    bmToast('Mobile success test','success');
    bmToast('Mobile error test','error');
  });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:'_134G_toast_mobile.png'});
  const s8 = await page.evaluate(() => {
    const cont = document.getElementById('bm-toast-container');
    if(!cont) return {found:false};
    const rect = cont.getBoundingClientRect();
    const docW = document.documentElement.clientWidth;
    return {
      found:true,
      docW,
      containerW: Math.round(rect.width),
      containerLeft: Math.round(rect.left),
      toastCount: cont.children.length,
      bodyOK: document.documentElement.scrollWidth <= docW + 1
    };
  });
  const s8Pass = s8.found && s8.bodyOK && s8.toastCount === 3 && s8.containerW <= s8.docW;
  results.push({n:8, name:'Mobile 380px (3 toast stack + body taşmıyor)', pass:s8Pass, evidence:s8});

  // Final screenshot — 4 tip toast desktop
  await page.setViewport({ width: 1366, height: 900 });
  await page.reload({waitUntil:'networkidle0', timeout:60000});
  await page.waitForFunction(() => document.querySelectorAll('.bm-stat-kart').length === 4, { timeout: 15000 });
  await new Promise(r=>setTimeout(r,500));
  await page.evaluate(() => {
    bmToast('Info: 4 tip test','info');
    bmToast('Success: işlem tamam','success');
    bmToast('Warning: dikkat','warning');
    bmToast('Error: hata oluştu','error');
  });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:'_134G_toast_4tip.png'});

  await browser.close();

  console.log('\n=== ADIM 134-G SANITY (8 senaryo) ===\n');
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
