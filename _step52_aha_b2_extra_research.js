// B-2 ek araştırma — eski reçetelerde style etiketi başka yerde expose ediliyor mu?
// Test sırası: WP REST API discovery, custom post type, taxonomy, meta tag deep dive
const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';
const BASE = 'https://homebrewersassociation.org';

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json,text/html,*/*' },
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
  const report = { tests: [] };

  // 1. WP REST API root
  console.log('=== 1. WP REST API root discovery ===');
  await sleep(10000);
  const r1 = await rawFetch(`${BASE}/wp-json/`);
  console.log(`  ${BASE}/wp-json/ → HTTP ${r1.status}, body=${r1.body.length} chars`);
  if (r1.status === 200) {
    try {
      const d = JSON.parse(r1.body);
      const namespaces = d.namespaces || [];
      const routes = Object.keys(d.routes || {});
      console.log(`  Namespaces: ${namespaces.join(', ')}`);
      const recipeRoutes = routes.filter(r => /recipe|brew|beer-style|style/i.test(r));
      console.log(`  Recipe-related routes (${recipeRoutes.length}):`);
      for (const r of recipeRoutes.slice(0, 25)) console.log(`    ${r}`);
      report.tests.push({ test: 'wp_json_root', status: r1.status, namespaces, recipe_routes: recipeRoutes });
    } catch (e) {
      console.log(`  parse fail: ${e.message.slice(0, 100)}`);
      report.tests.push({ test: 'wp_json_root', status: r1.status, error: e.message });
    }
  } else {
    report.tests.push({ test: 'wp_json_root', status: r1.status, body_snippet: r1.body.slice(0, 200) });
  }

  // 2. Custom post type test — homebrew-recipe slug arama
  console.log('\n=== 2. /wp-json/wp/v2/homebrew-recipe?slug=... ===');
  const slugs = ['traditional-berliner-weisse', 'joes-tripel', 'no-fail-extract-ipa', 'pauls-hefeweizen', 'brett-strawberry-farmhouse'];
  for (const slug of slugs) {
    await sleep(10000);
    const u = `${BASE}/wp-json/wp/v2/homebrew-recipe?slug=${slug}`;
    const r = await rawFetch(u);
    console.log(`  ${slug}: HTTP ${r.status} (body=${r.body.length})`);
    if (r.status === 200 && r.body.length > 10) {
      try {
        const d = JSON.parse(r.body);
        if (Array.isArray(d) && d.length > 0) {
          const post = d[0];
          console.log(`    id=${post.id} type=${post.type}`);
          // Look for taxonomy/style-related fields
          const styleFields = Object.keys(post).filter(k => /style|category|tag|term|meta/i.test(k));
          console.log(`    style-related keys: ${styleFields.join(', ')}`);
          if (post.recipe_beer_style) console.log(`    recipe_beer_style: ${JSON.stringify(post.recipe_beer_style).slice(0, 150)}`);
          if (post['_links']) {
            const linkKeys = Object.keys(post._links).filter(k => /style|term|cat/i.test(k));
            console.log(`    _links style/term: ${linkKeys.join(', ')}`);
          }
          // Save first sample full
          if (slug === slugs[0]) {
            fs.writeFileSync(`_aha_wpjson_${slug}.json`, JSON.stringify(post, null, 2));
            console.log(`    saved → _aha_wpjson_${slug}.json`);
          }
        } else {
          console.log(`    array empty or wrong shape: ${JSON.stringify(d).slice(0, 100)}`);
        }
      } catch (e) {
        console.log(`    parse fail: ${e.message.slice(0, 80)}`);
      }
    }
    report.tests.push({ test: `wp_v2_homebrew-recipe_${slug}`, status: r.status, body_size: r.body.length });
  }

  // 3. Taxonomy test
  console.log('\n=== 3. /wp-json/wp/v2/recipe_beer_style ===');
  await sleep(10000);
  const r3 = await rawFetch(`${BASE}/wp-json/wp/v2/recipe_beer_style?per_page=10`);
  console.log(`  HTTP ${r3.status} body=${r3.body.length}`);
  if (r3.status === 200) {
    try {
      const d = JSON.parse(r3.body);
      console.log(`  Sample taxonomy terms: ${Array.isArray(d) ? d.length : 'not array'}`);
      if (Array.isArray(d)) {
        for (const t of d.slice(0, 10)) {
          console.log(`    id=${t.id} name="${t.name}" slug="${t.slug}" count=${t.count}`);
        }
        report.tests.push({ test: 'wp_v2_recipe_beer_style', status: r3.status, count: d.length });
      }
    } catch (e) {
      console.log(`  parse fail: ${e.message.slice(0, 100)}`);
    }
  }

  // 4. Recipe by slug then fetch its beer style terms
  console.log('\n=== 4. Recipe → taxonomy terms (joining) ===');
  await sleep(10000);
  const r4 = await rawFetch(`${BASE}/wp-json/wp/v2/homebrew-recipe?slug=traditional-berliner-weisse&_embed=1`);
  console.log(`  HTTP ${r4.status} body=${r4.body.length}`);
  if (r4.status === 200) {
    try {
      const d = JSON.parse(r4.body);
      if (Array.isArray(d) && d.length > 0) {
        const post = d[0];
        if (post._embedded) {
          console.log(`  _embedded keys: ${Object.keys(post._embedded).join(', ')}`);
          const wpTerm = post._embedded['wp:term'];
          if (Array.isArray(wpTerm)) {
            for (const termArr of wpTerm) {
              for (const t of (termArr || []).slice(0, 5)) {
                console.log(`    [${t.taxonomy}] ${t.name} (slug=${t.slug})`);
              }
            }
          }
        }
        // Also dump 'meta' field
        if (post.meta) {
          const metaKeys = Object.keys(post.meta);
          console.log(`  meta keys: ${metaKeys.slice(0, 20).join(', ')}`);
          for (const k of metaKeys) {
            if (/style|bjcp|category/i.test(k) && post.meta[k]) {
              console.log(`    meta.${k} = ${JSON.stringify(post.meta[k]).slice(0, 100)}`);
            }
          }
        }
      }
    } catch (e) {
      console.log(`  parse fail: ${e.message.slice(0, 80)}`);
    }
  }

  // 5. OpenGraph + meta tag deep dive — 3 eski reçete
  console.log('\n=== 5. Meta tag deep dive (3 eski reçete) ===');
  for (const slug of ['traditional-berliner-weisse', 'joes-tripel', 'pauls-hefeweizen']) {
    await sleep(10000);
    const url = `${BASE}/homebrew-recipe/${slug}/`;
    const r = await rawFetch(url);
    if (r.status !== 200) { console.log(`  ${slug}: HTTP ${r.status}`); continue; }
    console.log(`\n  ${slug}:`);
    // OpenGraph + meta tags
    const metaPatterns = [
      [/property="(og:[^"]+)"\s+content="([^"]*)"/g, 'og:'],
      [/name="(article:[^"]+)"\s+content="([^"]*)"/g, 'article:'],
      [/property="(article:[^"]+)"\s+content="([^"]*)"/g, 'article:'],
      [/name="(twitter:[^"]+)"\s+content="([^"]*)"/g, 'twitter:'],
      [/name="([^"]*)"\s+content="([^"]*)"\s*\/?>/g, 'meta_name:'],
    ];
    const seen = new Set();
    for (const [re, prefix] of metaPatterns) {
      const matches = [...r.body.matchAll(re)];
      for (const m of matches.slice(0, 30)) {
        const key = m[1] || '';
        const val = m[2] || '';
        if (seen.has(key)) continue;
        seen.add(key);
        if (/style|tag|category|section|term/i.test(key) || /style|tag/i.test(val)) {
          console.log(`    ${key} = "${val.slice(0, 80)}"`);
        }
      }
    }
    // Hidden form fields, data-* attributes referring to style
    const dataStyleMatch = [...r.body.matchAll(/data-(?:style|category|term|bjcp)[^=]*="([^"]*)"/gi)].slice(0, 5);
    if (dataStyleMatch.length) {
      console.log(`    data-style attributes: ${dataStyleMatch.map(m => m[0].slice(0, 60)).join(' | ')}`);
    }
  }

  fs.writeFileSync('_step52_aha_b2_extra_report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Report → _step52_aha_b2_extra_report.json');
}

main().catch(e => { console.error(e); process.exit(1); });
