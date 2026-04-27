// Test cf_clearance + bf_device_id with Playwright real Chromium
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });

  // Inject cookies before any request
  await context.addCookies([
    {
      name: 'cf_clearance',
      value: 'ssxdD1ykL6jkBUI1KMWY3YDbcNd2TQU2vK7YF7sfZ7E-1777295829-1.2.1.1-L4z3TX_X.bq7yZraMrPnTnHYI13X2P9nm.eCXDtT9rVfW2m.KUtMOVR71G6ZY6l9thcheFwKxXpMQUK1HG0B4oi1GD9ndwZFBz1hPDscntlWNgtdQXyv6RJi3mrjsJcduZN7dGwZfminYAP.Jc7px6gTJysap2.iRU.GtSyaYetiEF5CW84zvXr_LnVTtVTa76r.w1CpbpAgwdCHdIzRA_mbU89wPr0P5UovnC.usGYSiYb26tjktwXVPQddzCKw50nLyS5jJhtTbpL4RpK_xEUUA8lCPf1bUwhbnsa0pjcSiaji6NVNioSLqVJRVrVKFRVqlTvoKClLvDTlmPwDyg',
      domain: '.brewersfriend.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None'
    },
    {
      name: 'bf_device_id',
      value: '43fddd9c3de109d4575069f75a976a3cfc8b581c17b813b5fab134f99d9ac310',
      domain: '.brewersfriend.com',
      path: '/',
      secure: true,
      sameSite: 'Lax'
    }
  ]);

  const page = await context.newPage();

  console.log('=== Test 1: Recipe view 465277 ===');
  try {
    const r = await page.goto('https://www.brewersfriend.com/homebrew/recipe/view/465277/quadrupel', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('  HTTP:', r.status());
    const title = await page.title();
    console.log('  Title:', title);
    const cf = await page.locator('text=Just a moment').count();
    console.log('  CF challenge:', cf);
    const html = await page.content();
    fs.writeFileSync('_bf_test1.html', html);
    console.log('  HTML size:', html.length);
    if (cf === 0 && r.status() === 200) {
      console.log('  ✅ BYPASS WORKS');
      // Test 2: extract embedded JSON
      const jsonMatches = html.match(/(?:"RecipeId"|"Fermentables"|window\.recipe|var\s+recipe\s*=)/gi);
      console.log('  Embedded JSON markers:', jsonMatches?.slice(0, 5));
      const bxmlBtn = html.match(/(?:beerxml|BeerXML)[^"<>]{0,40}(?:\/[^"<>]+)?/gi);
      console.log('  BeerXML links:', bxmlBtn?.slice(0, 5));
    }
  } catch (e) {
    console.log('  ERROR:', e.message);
  }

  console.log('\n=== Test 3: Sitemap ===');
  try {
    const r = await page.goto('https://www.brewersfriend.com/homebrew/sitemap.xml', { timeout: 30000 });
    console.log('  HTTP:', r.status());
    const txt = await r.text();
    fs.writeFileSync('_bf_sitemap.xml', txt);
    console.log('  Size:', txt.length, 'XML?:', txt.startsWith('<?xml'));
    console.log('  Recipe URL count:', (txt.match(/\/homebrew\/recipe\/view\//g) || []).length);
  } catch (e) {
    console.log('  ERROR:', e.message);
  }

  console.log('\n=== Test 4: BJCP 26D listing ===');
  try {
    const r = await page.goto('https://www.brewersfriend.com/homebrew-recipes/?style_id=26D', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('  HTTP:', r.status());
    const title = await page.title();
    console.log('  Title:', title);
    const html = await page.content();
    fs.writeFileSync('_bf_quad_listing.html', html);
    const recipeLinks = html.match(/\/homebrew\/recipe\/view\/\d+\//g) || [];
    const totalCount = html.match(/(\d{1,3}(?:,\d{3})*)\s*(recipes|results)/i);
    console.log('  Recipe links:', recipeLinks.length);
    console.log('  Total count hint:', totalCount?.[0] || 'not found');
  } catch (e) {
    console.log('  ERROR:', e.message);
  }

  console.log('\n=== Test 5: 3 sequential recipes ===');
  for (const id of [465277, 793490, 617270]) {
    try {
      const p = await context.newPage();
      const r = await p.goto(`https://www.brewersfriend.com/homebrew/recipe/view/${id}`, { timeout: 20000, waitUntil: 'domcontentloaded' });
      const t = await p.title();
      console.log(`  ID ${id}: HTTP ${r.status()} title="${t.slice(0,50)}"`);
      await p.close();
      await new Promise(rsv => setTimeout(rsv, 2000));
    } catch (e) {
      console.log(`  ID ${id}: ERROR ${e.message}`);
    }
  }

  await browser.close();
})();
