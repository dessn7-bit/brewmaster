// Hızlı endpoint doğrulama: /wp/v2/recipes + /wp/v2/beer-style + /custom/v2/recipes
const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';
const BASE = 'https://homebrewersassociation.org';

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json,*/*' },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const tests = [
    // Recipe by slug
    `${BASE}/wp-json/wp/v2/recipes?slug=traditional-berliner-weisse&_embed=1`,
    // Recipe sample list
    `${BASE}/wp-json/wp/v2/recipes?per_page=5`,
    // Beer-style taxonomy listesi
    `${BASE}/wp-json/wp/v2/beer-style?per_page=20`,
    // Custom v2 recipes (özel endpoint)
    `${BASE}/wp-json/custom/v2/recipes?per_page=5`,
  ];

  for (const url of tests) {
    console.log('='.repeat(70));
    console.log(`URL: ${url}`);
    await sleep(10000);
    const r = await rawFetch(url);
    console.log(`Status: ${r.status}, body=${r.body.length}`);
    if (r.status === 200) {
      try {
        const d = JSON.parse(r.body);
        if (Array.isArray(d)) {
          console.log(`Array length: ${d.length}`);
          for (const item of d.slice(0, 3)) {
            const keys = Object.keys(item);
            const styleKeys = keys.filter(k => /style|beer|category|tag|term|bjcp/i.test(k));
            console.log(`  --- item id=${item.id} ---`);
            console.log(`  total keys: ${keys.length}`);
            console.log(`  style-related keys: ${styleKeys.join(', ')}`);
            // Print common fields
            for (const k of ['title', 'slug', 'beer-style', 'beer_style', 'meta', 'taxonomy', '_embedded', 'name']) {
              if (item[k] !== undefined) {
                const v = JSON.stringify(item[k]).slice(0, 200);
                console.log(`  ${k}: ${v}`);
              }
            }
            // Embedded terms
            if (item._embedded && item._embedded['wp:term']) {
              console.log(`  _embedded[wp:term]:`);
              for (const ta of item._embedded['wp:term']) {
                for (const t of (ta || [])) {
                  console.log(`    [${t.taxonomy}] ${t.name} (slug=${t.slug})`);
                }
              }
            }
          }
        } else if (typeof d === 'object') {
          console.log(`Object keys: ${Object.keys(d).slice(0, 30).join(', ')}`);
          console.log(JSON.stringify(d, null, 2).slice(0, 800));
        }
      } catch (e) {
        console.log(`Parse fail: ${e.message.slice(0, 100)}`);
        console.log(`Body snippet: ${r.body.slice(0, 200)}`);
      }
    } else {
      console.log(`Body: ${r.body.slice(0, 200)}`);
    }
  }

  // 5. Save full sample (for parser planning)
  console.log('\n=== Final: full sample dump ===');
  await sleep(10000);
  const r5 = await rawFetch(`${BASE}/wp-json/wp/v2/recipes?slug=traditional-berliner-weisse&_embed=1`);
  if (r5.status === 200) {
    fs.writeFileSync('_aha_wpjson_berliner_full.json', r5.body);
    console.log('Saved → _aha_wpjson_berliner_full.json');
  }
}

main().catch(e => console.error(e));
