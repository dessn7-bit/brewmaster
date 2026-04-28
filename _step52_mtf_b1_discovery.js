// Adım 52 Faz B-1 — MTF wiki keşif (MediaWiki API)
// Hedef: recipe sayfa listesi + tahmini parse edilebilir reçete sayısı
// Polite rate: 1 req/sec
// Custom User-Agent: educational, contact info

const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';
const BASE = 'https://www.milkthefunk.com/w/api.php';

// Cookie jar — Cloudflare humans_XXXXX challenge bypass için
const cookieJar = {};

function getCookieHeader() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function parseCookieFromBody(body) {
  // Cloudflare inline JS: document.cookie = "humans_21909=1"
  const m = body.match(/document\.cookie\s*=\s*"([^=]+)=([^"]+)"/);
  if (m) {
    cookieJar[m[1]] = m[2];
    return true;
  }
  return false;
}

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    const cookie = getCookieHeader();
    https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json,*/*',
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        // Capture Set-Cookie header
        const sc = res.headers['set-cookie'] || [];
        sc.forEach(c => {
          const m = c.match(/^([^=]+)=([^;]+)/);
          if (m) cookieJar[m[1]] = m[2];
        });
        resolve({ status: res.statusCode, body: data });
      });
    }).on('error', reject);
  });
}

async function fetchAPI(params) {
  const qs = new URLSearchParams({ ...params, format: 'json' }).toString();
  const url = BASE + '?' + qs;
  // Try 1: with current cookie jar
  let r = await rawFetch(url);
  // If Cloudflare cookie challenge, parse cookie from body and retry
  if (r.status === 409 || r.status === 403) {
    if (parseCookieFromBody(r.body)) {
      await new Promise(res => setTimeout(res, 500));
      r = await rawFetch(url);
    }
  }
  if (r.status !== 200) {
    throw new Error(`HTTP ${r.status}: ${r.body.slice(0, 300)}`);
  }
  try {
    return JSON.parse(r.body);
  } catch (e) {
    throw new Error(`Parse fail: ${r.body.slice(0, 300)}`);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const report = { timestamp: new Date().toISOString(), tests: {} };

  // 1. Siteinfo + statistics
  console.log('=== 1. Siteinfo ===');
  try {
    const info = await fetchAPI({ action: 'query', meta: 'siteinfo', siprop: 'general|statistics' });
    const g = info.query.general; const s = info.query.statistics;
    console.log(`  Wiki name : ${g.sitename}`);
    console.log(`  Generator : ${g.generator}`);
    console.log(`  Lang      : ${g.lang}`);
    console.log(`  Pages     : ${s.pages}`);
    console.log(`  Articles  : ${s.articles}`);
    console.log(`  Edits     : ${s.edits}`);
    report.tests.siteinfo = { sitename: g.sitename, generator: g.generator, pages: s.pages, articles: s.articles };
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    report.tests.siteinfo = { error: e.message };
    fs.writeFileSync('_step52_b1_report.json', JSON.stringify(report, null, 2));
    return;
  }
  await sleep(1000);

  // 2. Category:Recipes members
  console.log('\n=== 2. Category:Recipes members ===');
  try {
    const recipes = await fetchAPI({ action: 'query', list: 'categorymembers', cmtitle: 'Category:Recipes', cmlimit: 500 });
    const items = recipes.query.categorymembers || [];
    console.log(`  Recipe pages: ${items.length}`);
    items.forEach(r => console.log(`    ns=${r.ns}  ${r.title}`));
    report.tests.cat_recipes = { count: items.length, items: items.map(r => ({ title: r.title, ns: r.ns })) };
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    report.tests.cat_recipes = { error: e.message };
  }
  await sleep(1000);

  // 3. Recipe-related categories
  console.log('\n=== 3. Recipe-related categories (size >= 3) ===');
  try {
    const cats = await fetchAPI({ action: 'query', list: 'allcategories', acmin: 3, aclimit: 500, acprop: 'size' });
    const allCats = cats.query.allcategories || [];
    const interesting = allCats.filter(c => /recipe|sour|brett|lambic|saison|wheat|wild|funk|kettle|gose|berliner|flanders|gueuze|kveik|farmhouse|catharina|smoothie|pastry|cider|mead|sake/i.test(c['*']));
    interesting.forEach(c => console.log(`    ${c['*'].padEnd(45)}  size=${c.size}`));
    console.log(`  Total categories ≥3: ${allCats.length}`);
    console.log(`  Recipe-related: ${interesting.length}`);
    report.tests.recipe_categories = {
      total: allCats.length,
      interesting: interesting.map(c => ({ name: c['*'], size: c.size })),
    };
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    report.tests.recipe_categories = { error: e.message };
  }
  await sleep(1000);

  // 4. MTF_Member_Recipes page wikitext + links
  console.log('\n=== 4. MTF_Member_Recipes page ===');
  try {
    const page = await fetchAPI({ action: 'parse', page: 'MTF_Member_Recipes', prop: 'wikitext|links|externallinks' });
    if (page.error) throw new Error(JSON.stringify(page.error));
    const wikitext = page.parse.wikitext['*'];
    fs.writeFileSync('_mtf_member_recipes_wikitext.txt', wikitext);
    console.log(`  Wikitext: ${wikitext.length} chars → _mtf_member_recipes_wikitext.txt`);

    const ext = page.parse.externallinks || [];
    const bfLinks = ext.filter(l => /brewersfriend\.com/.test(l));
    const bfRecipeLinks = ext.filter(l => /brewersfriend\.com\/homebrew\/recipe/.test(l));
    const beerXmlLinks = ext.filter(l => /\.xml$|beerxml/i.test(l));
    const otherLinks = ext.filter(l => !/brewersfriend\.com/.test(l));
    console.log(`  External links: ${ext.length}`);
    console.log(`    Brewer's Friend total : ${bfLinks.length}`);
    console.log(`    Brewer's Friend recipe: ${bfRecipeLinks.length}  ⛔ (Brewer's Friend Cloudflare bloke)`);
    console.log(`    BeerXML / .xml         : ${beerXmlLinks.length}`);
    console.log(`    Other external         : ${otherLinks.length}`);

    const links = page.parse.links || [];
    console.log(`  Internal wiki links: ${links.length}`);
    const sampleInternal = links.slice(0, 15).map(l => l['*']);
    sampleInternal.forEach(t => console.log(`    ${t}`));

    report.tests.mtf_member_recipes = {
      wikitext_chars: wikitext.length,
      external_total: ext.length,
      brewersfriend_total: bfLinks.length,
      brewersfriend_recipe: bfRecipeLinks.length,
      beerxml: beerXmlLinks.length,
      other_external: otherLinks.length,
      internal_total: links.length,
      sample_internal: sampleInternal,
      sample_other_external: otherLinks.slice(0, 20),
    };
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    report.tests.mtf_member_recipes = { error: e.message };
  }
  await sleep(1000);

  // 5. Search for recipe-named pages (allpages prefix scan)
  console.log('\n=== 5. Allpages "Recipe" prefix scan ===');
  try {
    const pages = await fetchAPI({ action: 'query', list: 'allpages', apprefix: 'Recipe', aplimit: 500 });
    const items = pages.query.allpages || [];
    console.log(`  Pages starting with "Recipe": ${items.length}`);
    items.slice(0, 25).forEach(p => console.log(`    ${p.title}`));
    report.tests.allpages_recipe_prefix = { count: items.length, sample: items.slice(0, 25).map(p => p.title) };
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    report.tests.allpages_recipe_prefix = { error: e.message };
  }
  await sleep(1000);

  // 6. Search recipes by category names (Lambic, Brett, Sour styles)
  console.log('\n=== 6. Style category sample (Lambic, Brett Beer, etc) ===');
  const styleCats = ['Category:Lambic', 'Category:Brett_Beer', 'Category:Sour_Beer', 'Category:Mixed_Fermentation', 'Category:Berliner_Weisse', 'Category:Flanders'];
  const styleCounts = {};
  for (const cat of styleCats) {
    try {
      const r = await fetchAPI({ action: 'query', list: 'categorymembers', cmtitle: cat, cmlimit: 50 });
      const items = r.query.categorymembers || [];
      styleCounts[cat] = items.length;
      console.log(`  ${cat.padEnd(40)} ${items.length} items`);
    } catch (e) {
      styleCounts[cat] = `error: ${e.message.slice(0,80)}`;
      console.log(`  ${cat.padEnd(40)} FAIL: ${e.message.slice(0, 60)}`);
    }
    await sleep(1000);
  }
  report.tests.style_categories = styleCounts;

  fs.writeFileSync('_step52_b1_report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Done. Full report → _step52_b1_report.json');
}

main().catch(e => {
  console.error('Top-level error:', e);
  process.exit(1);
});
