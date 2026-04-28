// B-2.1 — AHA beer-style taxonomy terms fetch
// Endpoint: /wp/v2/beer-style?per_page=100&page=N
// Çıktı: _aha_taxonomy_terms.json (id, name, slug, count)

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
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const allTerms = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${BASE}/wp-json/wp/v2/beer-style?per_page=${perPage}&page=${page}`;
    console.log(`Page ${page}: fetching ${url}`);
    await sleep(10000);
    const r = await rawFetch(url);
    if (r.status !== 200) {
      // 400 likely means page out of range — done
      console.log(`  HTTP ${r.status} — stopping (probably end of pagination)`);
      break;
    }
    const totalPages = parseInt(r.headers['x-wp-totalpages'] || '1', 10);
    const totalItems = parseInt(r.headers['x-wp-total'] || '0', 10);
    console.log(`  X-WP-Total: ${totalItems}, X-WP-TotalPages: ${totalPages}`);
    try {
      const d = JSON.parse(r.body);
      if (Array.isArray(d) && d.length > 0) {
        for (const t of d) {
          allTerms.push({
            id: t.id,
            name: t.name,
            slug: t.slug,
            count: t.count,
            taxonomy: t.taxonomy,
            description: (t.description || '').slice(0, 120),
            link: t.link,
          });
        }
        console.log(`  Got ${d.length} terms (total so far ${allTerms.length})`);
      } else {
        console.log(`  Empty page or wrong shape, stopping`);
        break;
      }
    } catch (e) {
      console.log(`  Parse fail: ${e.message.slice(0, 80)}`);
      break;
    }
    if (page >= totalPages) break;
    page++;
  }

  // Sort by count desc (most-used styles first)
  allTerms.sort((a, b) => b.count - a.count);

  fs.writeFileSync('_aha_taxonomy_terms.json', JSON.stringify(allTerms, null, 2));
  console.log(`\n✓ Total ${allTerms.length} taxonomy terms saved → _aha_taxonomy_terms.json`);

  // Print summary
  console.log('\n=== Taxonomy summary (top 30 by recipe count) ===');
  for (const t of allTerms.slice(0, 30)) {
    console.log(`  [${String(t.count).padStart(4)}]  ${t.name.padEnd(35)}  (slug=${t.slug})`);
  }
  console.log('\n=== Bottom 20 (least used, possible niche styles) ===');
  for (const t of allTerms.slice(-20)) {
    console.log(`  [${String(t.count).padStart(4)}]  ${t.name.padEnd(35)}  (slug=${t.slug})`);
  }

  // Categorize: beer vs non-beer (mead/cider/sake)
  const nonBeer = allTerms.filter(t => /mead|cider|sake|braggot|wine|kvass/i.test(t.name + ' ' + t.slug));
  console.log(`\n=== Non-beer (DROP candidates) ===`);
  for (const t of nonBeer) {
    console.log(`  [${t.count}] ${t.name} (${t.slug})`);
  }
  console.log(`\nTotal non-beer terms: ${nonBeer.length}`);
  console.log(`Total beer terms: ${allTerms.length - nonBeer.length}`);

  // Total recipe count from taxonomy (sum of counts — but a recipe can have multiple styles, so this overcounts)
  const totalCount = allTerms.reduce((s, t) => s + (t.count || 0), 0);
  console.log(`\nSum of counts (note: recipes can have multiple styles, so sum > unique recipes): ${totalCount}`);
}

main().catch(e => { console.error(e); process.exit(1); });
