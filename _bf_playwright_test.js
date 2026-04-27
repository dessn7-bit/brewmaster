// Playwright stealth test — Brewer's Friend Cloudflare bypass
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US'
  });
  const page = await context.newPage();

  console.log('Test 1: View recipe (Quadrupel)');
  let resp = null;
  try {
    resp = await page.goto('https://www.brewersfriend.com/homebrew/recipe/view/465277/quadrupel', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('  Status:', resp.status());
    // Wait for potential CF challenge to resolve
    await page.waitForTimeout(8000);
    const title = await page.title();
    console.log('  Title:', title);
    const cfMarker = await page.locator('text=Just a moment').count();
    console.log('  CF challenge visible:', cfMarker > 0);
    if (cfMarker === 0) {
      // Page passed — extract recipe data
      const html = await page.content();
      fs.writeFileSync('_bf_465277_via_browser.html', html);
      console.log('  HTML saved:', html.length, 'bytes');
      // Look for embedded JSON or BeerXML link
      const jsonMatches = html.match(/"RecipeId"\s*:|window\.recipeData|var\s+recipe\s*=/gi);
      console.log('  Embedded recipe JSON markers:', jsonMatches);
      const bxmlLinks = html.match(/href="[^"]*beerxml[^"]*"/gi);
      console.log('  BeerXML links:', bxmlLinks?.slice(0,3));
    }
  } catch (e) {
    console.log('  ERROR:', e.message);
  }

  // Test 2: BeerXML endpoint via same context (cookies might be set)
  if (resp && resp.status() === 200) {
    console.log('\nTest 2: BeerXML endpoint via browser cookies');
    try {
      const xmlPage = await context.newPage();
      const r = await xmlPage.goto('https://www.brewersfriend.com/homebrew/recipe/beerxml/465277', { timeout: 30000 });
      console.log('  Status:', r.status());
      const txt = await r.text();
      console.log('  First 200:', txt.slice(0, 200));
      console.log('  Has <RECIPE>:', txt.includes('<RECIPE>'));
      await xmlPage.close();
    } catch (e) {
      console.log('  BeerXML error:', e.message);
    }

    console.log('\nTest 3: Sitemap via browser cookies');
    try {
      const smPage = await context.newPage();
      const r = await smPage.goto('https://www.brewersfriend.com/homebrew/sitemap.xml', { timeout: 30000 });
      console.log('  Status:', r.status());
      const txt = await r.text();
      console.log('  First 300:', txt.slice(0, 300));
      await smPage.close();
    } catch (e) {
      console.log('  Sitemap error:', e.message);
    }

    console.log('\nTest 4: Style filter via browser');
    try {
      const fPage = await context.newPage();
      await fPage.goto('https://www.brewersfriend.com/homebrew-recipes/?style_id=26D', { waitUntil: 'networkidle', timeout: 60000 });
      await fPage.waitForTimeout(5000);
      const ttl = await fPage.title();
      const html = await fPage.content();
      console.log('  Title:', ttl);
      console.log('  Total recipes hint:', html.match(/(\d{1,3},\d{3}|\d{1,4}) (recipes|results)/i)?.[0]);
      // Recipe count and BJCP filter
      const recipeLinks = html.match(/\/homebrew\/recipe\/view\/\d+\//g) || [];
      console.log('  Recipe links on page:', recipeLinks.length);
      await fPage.close();
    } catch (e) {
      console.log('  Filter error:', e.message);
    }
  }

  await browser.close();
})();
