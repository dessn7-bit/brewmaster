// Render docs.brewersfriend.com/api/recipes (GitBook JS-rendered) for full tier info
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const url of [
    'https://docs.brewersfriend.com/api/recipes',
    'https://docs.brewersfriend.com/api',
    'https://docs.brewersfriend.com/api/recipes/recipe'
  ]) {
    console.log(`\n=== ${url} ===`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      const text = await page.evaluate(() => document.body.innerText);
      console.log('Body text (first 3000 chars):');
      console.log(text.slice(0, 3000));
      const slug = url.split('/').slice(-1)[0] || 'api';
      fs.writeFileSync(`_bf_docs_${slug}.txt`, text);
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }

  await browser.close();
})();
