// Adım 52 Faz B-3 — AHA bulk recipe fetch (1485 reçete, 5 thread × 10 sec)
// Her reçete: WP REST API /wp/v2/recipes?slug=<slug>&_embed=1
// Mapping: AHA primary style → V15 slug (FINAL tablodan)
// DROP/unmapped → _aha_recipes_rejected.json
// V15 valid → _aha_recipes_raw.json (B-4 parser input)

const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';
const BASE = 'https://homebrewersassociation.org';

// ── Bulk fetch parametreleri ──
const PARALLEL = 5;            // 5 worker thread
const SLEEP_PER_REQ = 10000;   // 10 sec polite delay (robots.txt zorunlu)
const MAX_RETRY = 2;
const PROGRESS_LOG = '_aha_b3_progress.log';

// ── Cookie jar (Cloudflare humans_XXXXX challenge bypass) ──
const cookieJar = {};
function getCookieHeader() { return Object.entries(cookieJar).map(([k,v]) => `${k}=${v}`).join('; '); }
function parseCookieFromBody(body) {
  const m = body.match(/document\.cookie\s*=\s*"([^=]+)=([^"]+)"/);
  if (m) { cookieJar[m[1]] = m[2]; return true; }
  return false;
}

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    const cookie = getCookieHeader();
    https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {})
      },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const sc = res.headers['set-cookie'] || [];
        sc.forEach(c => { const m = c.match(/^([^=]+)=([^;]+)/); if (m) cookieJar[m[1]] = m[2]; });
        resolve({ status: res.statusCode, body: data });
      });
    }).on('error', reject)
      .on('timeout', function(){ this.destroy(); reject(new Error('timeout')); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, maxRetry = MAX_RETRY) {
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      let r = await rawFetch(url);
      if ((r.status === 409 || r.status === 403) && attempt === 0) {
        if (parseCookieFromBody(r.body)) {
          await sleep(500);
          r = await rawFetch(url);
        }
      }
      return r;
    } catch (e) {
      if (attempt < maxRetry) {
        await sleep(5000);
        continue;
      }
      throw e;
    }
  }
}

function logProgress(msg) {
  fs.appendFileSync(PROGRESS_LOG, `[${new Date().toISOString()}] ${msg}\n`);
}

async function main() {
  // Load inputs
  const b1 = JSON.parse(fs.readFileSync('_step52_aha_b1_report.json', 'utf-8'));
  const recipeUrls = b1.all_recipe_urls;
  console.log(`Total recipe URLs: ${recipeUrls.length}`);

  const taxonomy = JSON.parse(fs.readFileSync('_aha_taxonomy_terms.json', 'utf-8'));
  const idToAhaSlug = {};
  for (const t of taxonomy) idToAhaSlug[t.id] = t.slug;

  const mapping = JSON.parse(fs.readFileSync('_aha_style_to_slug_FINAL.json', 'utf-8'));
  const ahaSlugToV15 = {};
  for (const m of mapping) ahaSlugToV15[m.aha_slug] = { v15: m.v15_slug, note: m.note };
  console.log(`Mapping entries: ${Object.keys(ahaSlugToV15).length}`);

  // Resume support: önceden fetch edilmiş URL'leri atla
  let alreadyFetched = new Set();
  if (fs.existsSync('_aha_recipes_raw.json')) {
    try {
      const prev = JSON.parse(fs.readFileSync('_aha_recipes_raw.json', 'utf-8'));
      prev.forEach(r => alreadyFetched.add(r.source_url));
      console.log(`Resume: ${alreadyFetched.size} recipes already fetched`);
    } catch (e) { console.log('Resume parse fail, starting fresh'); }
  }
  if (fs.existsSync('_aha_recipes_rejected.json')) {
    try {
      const prev = JSON.parse(fs.readFileSync('_aha_recipes_rejected.json', 'utf-8'));
      prev.forEach(r => alreadyFetched.add(r.source_url));
      console.log(`Resume rejected: total ${alreadyFetched.size} processed`);
    } catch (e) {}
  }

  const todoUrls = recipeUrls.filter(u => !alreadyFetched.has(u));
  console.log(`To fetch: ${todoUrls.length}`);
  if (todoUrls.length === 0) { console.log('All done.'); return; }

  // Split URLs into PARALLEL chunks
  const chunks = Array.from({ length: PARALLEL }, () => []);
  todoUrls.forEach((u, i) => chunks[i % PARALLEL].push(u));
  console.log(`Worker chunks: ${chunks.map(c => c.length).join(', ')}`);

  // Track stats
  let done = 0, kept = 0, rejected = 0, errors = 0;
  const startTime = Date.now();
  const accepted = [];
  const rejectedRecs = [];

  const flushInterval = setInterval(() => {
    fs.writeFileSync('_aha_recipes_raw.json', JSON.stringify(accepted, null, 2));
    fs.writeFileSync('_aha_recipes_rejected.json', JSON.stringify(rejectedRecs, null, 2));
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = done / elapsed || 0;
    const eta = todoUrls.length > done ? Math.round((todoUrls.length - done) / rate) : 0;
    console.log(`[${elapsed}s] done=${done}/${todoUrls.length}  kept=${kept}  rejected=${rejected}  errors=${errors}  ETA=${eta}s`);
  }, 30000);

  async function worker(workerId, urls) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const slug = url.replace(/^.*\/homebrew-recipe\/([^/]+)\/?$/, '$1');
      const apiUrl = `${BASE}/wp-json/wp/v2/recipes?slug=${encodeURIComponent(slug)}&_embed=1`;
      await sleep(SLEEP_PER_REQ);
      try {
        const r = await fetchWithRetry(apiUrl);
        if (r.status !== 200) {
          errors++;
          logProgress(`[w${workerId}] ${slug}: HTTP ${r.status}`);
          rejectedRecs.push({ source_url: url, slug, error: `HTTP ${r.status}`, reason: 'http_error' });
          done++;
          continue;
        }
        const arr = JSON.parse(r.body);
        if (!Array.isArray(arr) || arr.length === 0) {
          errors++;
          logProgress(`[w${workerId}] ${slug}: empty response`);
          rejectedRecs.push({ source_url: url, slug, error: 'empty', reason: 'empty_response' });
          done++;
          continue;
        }
        const post = arr[0];

        // Determine V15 slug from style metadata
        const beerStyleIds = post['beer-style'] || [];
        const yoastPrimary = post._yoast_wpseo_primary_recipe_beer_style;
        let primaryAhaSlug = null;
        let v15Slug = null;
        let v15Note = null;
        let pickedFrom = null;

        // 1. Try Yoast primary
        if (yoastPrimary && idToAhaSlug[parseInt(yoastPrimary, 10)]) {
          primaryAhaSlug = idToAhaSlug[parseInt(yoastPrimary, 10)];
          if (ahaSlugToV15[primaryAhaSlug]) {
            v15Slug = ahaSlugToV15[primaryAhaSlug].v15;
            v15Note = ahaSlugToV15[primaryAhaSlug].note;
            pickedFrom = 'yoast_primary';
          }
        }
        // 2. Find first V15-valid mapping (skip DROP and unmapped)
        if (!v15Slug || v15Slug === 'DROP' || v15Slug === 'unmapped') {
          for (const id of beerStyleIds) {
            const ahaSlug = idToAhaSlug[id];
            if (!ahaSlug) continue;
            const m = ahaSlugToV15[ahaSlug];
            if (!m) continue;
            if (m.v15 !== 'DROP' && m.v15 !== 'unmapped') {
              primaryAhaSlug = ahaSlug;
              v15Slug = m.v15;
              v15Note = m.note;
              pickedFrom = 'first_valid_term';
              break;
            }
          }
        }
        // 3. Fallback: first AHA slug regardless of mapping (will be reject)
        if (!primaryAhaSlug && beerStyleIds.length > 0) {
          primaryAhaSlug = idToAhaSlug[beerStyleIds[0]] || null;
          if (primaryAhaSlug && ahaSlugToV15[primaryAhaSlug]) {
            v15Slug = ahaSlugToV15[primaryAhaSlug].v15;
            v15Note = ahaSlugToV15[primaryAhaSlug].note;
            pickedFrom = 'first_term_unmapped';
          }
        }

        // Extract custom fields (structured!)
        const rec = {
          source: 'aha',
          source_id: slug,
          source_url: url,
          api_id: post.id,
          name: (post.title?.rendered || post.recipe_beer_name || '').replace(/<[^>]+>/g,'').trim(),
          aha_style_name: post.recipe_style_name || null,
          aha_primary_slug: primaryAhaSlug,
          aha_all_style_ids: beerStyleIds,
          v15_slug: v15Slug || null,
          v15_mapping_note: v15Note,
          picked_from: pickedFrom,
          raw: {
            og: post.recipe_og || null,
            fg: post.recipe_fg || null,
            ibu: post.recipe_ibu || null,
            srm: post.recipe_srm || null,
            abv: post.recipe_abv || null,
            volume: post.recipe_volume || null,
            efficiency: post.recipe_efficiency || null,
            ingredients_html: post.recipe_ingredients || null,
            additional_html: post.recipe_additional || null,
            content_html: post.content?.rendered || null,
            introduction: post.recipe_introduction || null,
            brewer: post.recipe_brewery || null,
            brewer_city: post.recipe_city || null,
            brewer_state: post.recipe_state_name || null,
            zymurgy_issue: post.recipe_zym_issue_date || null,
            is_nhc_winner: post.recipe_is_nhc_winner === 'on',
            is_proam_winner: post.recipe_is_proam_winner === 'on',
            medal_placement: post.recipe_medal_placement || null,
          },
          fetch_date: new Date().toISOString(),
        };

        if (!v15Slug || v15Slug === 'DROP' || v15Slug === 'unmapped') {
          rejectedRecs.push({ ...rec, reason: v15Slug === 'DROP' ? 'drop_non_beer' : 'unmapped_style' });
          rejected++;
        } else {
          accepted.push(rec);
          kept++;
        }
        done++;

        if (done % 50 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[${elapsed}s] worker ${workerId}: ${i+1}/${urls.length} | global done=${done}, kept=${kept}, rej=${rejected}`);
        }
      } catch (e) {
        errors++;
        logProgress(`[w${workerId}] ${slug}: EXCEPTION ${e.message}`);
        rejectedRecs.push({ source_url: url, slug, error: e.message, reason: 'fetch_exception' });
        done++;
      }
    }
  }

  await Promise.all(chunks.map((c, i) => worker(i, c)));
  clearInterval(flushInterval);

  // Final flush
  fs.writeFileSync('_aha_recipes_raw.json', JSON.stringify(accepted, null, 2));
  fs.writeFileSync('_aha_recipes_rejected.json', JSON.stringify(rejectedRecs, null, 2));

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✓ Done in ${elapsed}s (${Math.round(elapsed/60)} min)`);
  console.log(`  Total processed: ${done}`);
  console.log(`  KEPT (V15 mapped): ${kept} → _aha_recipes_raw.json`);
  console.log(`  REJECTED: ${rejected} → _aha_recipes_rejected.json`);
  console.log(`  ERRORS: ${errors}`);

  // Summary by V15 slug
  const slugCount = {};
  for (const r of accepted) slugCount[r.v15_slug] = (slugCount[r.v15_slug] || 0) + 1;
  console.log('\nKept recipes by V15 slug (top 25):');
  Object.entries(slugCount).sort((a,b) => b[1]-a[1]).slice(0,25).forEach(([s,c]) => {
    console.log(`  ${s.padEnd(40)} ${c}`);
  });

  // Reject reasons
  const rejReasons = {};
  for (const r of rejectedRecs) rejReasons[r.reason] = (rejReasons[r.reason] || 0) + 1;
  console.log('\nReject reasons:');
  Object.entries(rejReasons).forEach(([r,c]) => console.log(`  ${r.padEnd(25)} ${c}`));
}

main().catch(e => { console.error('TOP-LEVEL ERROR:', e); process.exit(1); });
