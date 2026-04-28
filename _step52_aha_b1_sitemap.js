// Adım 52 (yeni numara) Faz B-1 — AHA recipe sitemap parse + Brett/Sour sayım + sample schema check
// Etik: Crawl-delay 10 sec/req (robots.txt zorunlu).
// Sample sayısı: 30 reçete (3 thread × 10 reçete each, 10 sec sleep her thread içinde).
// Çıktı: _step52_aha_b1_report.json

const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/xml,application/xml,text/html,*/*' },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject)
      .on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// URL'leri sitemap.xml'den çek
async function fetchSitemap(url) {
  console.log(`[fetch] ${url}`);
  const r = await rawFetch(url);
  if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}`);
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(r.body)) !== null) urls.push(m[1].trim());
  return urls;
}

// Recipe URL slug'ından Brett/Sour aile ön sayım
function classifyByUrlSlug(url) {
  const slug = url.replace(/^.*\/homebrew-recipe\/([^/]+)\/.*$/, '$1').toLowerCase();
  const families = [];
  if (/sour|kettle/.test(slug)) families.push('sour_generic');
  if (/brett|brettanomyces/.test(slug)) families.push('brett');
  if (/lambic|gueuze/.test(slug)) families.push('lambic');
  if (/berliner|weisse/.test(slug)) families.push('berliner');
  if (/\bgose\b/.test(slug)) families.push('gose');
  if (/flanders|flemish|oud[-_]bruin/.test(slug)) families.push('flanders');
  if (/wild[-_]ale|wild ale|funky/.test(slug)) families.push('wild');
  if (/saison|farmhouse/.test(slug)) families.push('saison');
  if (/witbier|wit\b/.test(slug)) families.push('witbier');
  if (/hefe|weizen|weiss/.test(slug)) families.push('wheat');
  if (/\bipa\b|hazy|neipa/.test(slug)) families.push('ipa');
  if (/stout|porter/.test(slug)) families.push('stout_porter');
  if (/dubbel|tripel|quad|abbey|trappist|belgian|gold[-_]?strong|dark[-_]?strong/.test(slug)) families.push('belgian_strong');
  if (/lager|pils|helles|maerzen|maerzen|festbier|oktoberfest|bock|dunkel|schwarz|vienna/.test(slug)) families.push('lager');
  if (/altbier|kolsch|cream|california[-_]?common|steam/.test(slug)) families.push('hybrid');
  if (/bitter|esb|mild|brown[-_]?ale|wee[-_]?heavy|scotch|english[-_]?pale/.test(slug)) families.push('british');
  if (/red[-_]?ale|amber|irish/.test(slug)) families.push('amber_red');
  if (/mead|cider|sake|kvass/.test(slug)) families.push('non_beer');
  return families;
}

// Sample reçete fetch — schema check
async function fetchRecipeSample(url) {
  await sleep(10000); // 10 sec polite delay
  const r = await rawFetch(url);
  const slug = url.replace(/^.*\/homebrew-recipe\/([^/]+)\/.*$/, '$1');
  const out = {
    url, slug, status: r.status,
    has_login_wall: /please log in|login required|members? only|sign in to view|locked recipe/i.test(r.body),
    has_recipe_content: /<h[12345][^>]*>(\s*Ingredients|\s*Specifications|\s*Directions)/i.test(r.body),
    body_length: r.body.length,
    bjcp_style: null,
    extracted: {},
  };
  if (r.status !== 200) return out;
  // BJCP Style label extraction (heuristic)
  const styleMatch = r.body.match(/Style\s*[:\-]?\s*<\/[a-z]+>\s*[\s\S]{0,40}?<[^>]+>([^<]+)</i)
    || r.body.match(/<dt[^>]*>Style<\/dt>\s*<dd[^>]*>([^<]+)</i)
    || r.body.match(/style[-_]name[^>]*>([^<]+)</i);
  if (styleMatch) out.bjcp_style = styleMatch[1].trim();
  // OG/IBU/SRM heuristic
  for (const field of ['OG', 'FG', 'IBU', 'SRM', 'ABV']) {
    const re = new RegExp(`\\b${field}\\b[^0-9]{0,40}([0-9]+\\.?[0-9]*\\s*%?)`, 'i');
    const mm = r.body.match(re);
    if (mm) out.extracted[field] = mm[1].trim();
  }
  return out;
}

async function main() {
  const SITEMAPS = [
    'https://homebrewersassociation.org/recipes-sitemap.xml',
    'https://homebrewersassociation.org/recipes-sitemap2.xml',
  ];

  // 1. Sitemap parse
  console.log('=== 1. Sitemap parse ===');
  let allUrls = [];
  for (const sm of SITEMAPS) {
    try {
      await sleep(10000);
      const urls = await fetchSitemap(sm);
      console.log(`  ${sm}: ${urls.length} URLs`);
      allUrls = allUrls.concat(urls);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
  }

  // Recipe URL only (filter out non-recipe entries like recipe-format introductions)
  const recipeUrls = allUrls.filter(u => /\/homebrew-recipe\/[^/]+\/?$/.test(u));
  console.log(`\nTotal sitemap URLs: ${allUrls.length}`);
  console.log(`Recipe URLs (matching /homebrew-recipe/<slug>/): ${recipeUrls.length}`);

  // 2. Slug-based family classification (ön sayım)
  console.log('\n=== 2. URL slug family classification (ön sayım) ===');
  const familyCounts = {};
  const slugSamples = {};
  for (const u of recipeUrls) {
    const fams = classifyByUrlSlug(u);
    if (fams.length === 0) {
      familyCounts['_unclassified'] = (familyCounts['_unclassified'] || 0) + 1;
    }
    for (const f of fams) {
      familyCounts[f] = (familyCounts[f] || 0) + 1;
      if (!slugSamples[f]) slugSamples[f] = [];
      if (slugSamples[f].length < 5) slugSamples[f].push(u);
    }
  }
  const sortedFams = Object.entries(familyCounts).sort((a, b) => b[1] - a[1]);
  for (const [f, c] of sortedFams) {
    console.log(`  ${f.padEnd(20)} ${c}`);
  }

  const sourBrettCount =
    (familyCounts.sour_generic || 0) +
    (familyCounts.brett || 0) +
    (familyCounts.lambic || 0) +
    (familyCounts.berliner || 0) +
    (familyCounts.gose || 0) +
    (familyCounts.flanders || 0) +
    (familyCounts.wild || 0);
  console.log(`\n>>> Brett/Sour aile ön sayım: ~${sourBrettCount} reçete (slug match)`);

  // 3. Sample fetch — 30 reçete (schema + member-only oranı)
  console.log('\n=== 3. Sample fetch (30 reçete) — schema + member-only check ===');
  // Stratified sample: 5 from each top family
  const samplePool = [];
  const seen = new Set();
  const topFams = ['sour_generic', 'brett', 'lambic', 'berliner', 'flanders', 'saison', 'witbier', 'wheat', 'ipa', 'stout_porter', 'belgian_strong', 'lager', 'amber_red'];
  for (const fam of topFams) {
    if (!slugSamples[fam]) continue;
    for (const u of slugSamples[fam].slice(0, 3)) {
      if (!seen.has(u)) { seen.add(u); samplePool.push(u); }
      if (samplePool.length >= 30) break;
    }
    if (samplePool.length >= 30) break;
  }
  // Random fill if not enough
  while (samplePool.length < 30 && recipeUrls.length > samplePool.length) {
    const u = recipeUrls[Math.floor(Math.random() * recipeUrls.length)];
    if (!seen.has(u)) { seen.add(u); samplePool.push(u); }
  }
  console.log(`Sample size: ${samplePool.length}`);

  const sampleResults = [];
  for (let i = 0; i < samplePool.length; i++) {
    const url = samplePool[i];
    console.log(`  [${i+1}/${samplePool.length}] ${url.slice(0, 80)}...`);
    try {
      const r = await fetchRecipeSample(url);
      sampleResults.push(r);
      const flag = r.has_login_wall ? '🔒' : (r.has_recipe_content ? '✓' : '?');
      console.log(`     ${flag} status=${r.status} login_wall=${r.has_login_wall} content=${r.has_recipe_content} bjcp="${r.bjcp_style||'?'}"`);
    } catch (e) {
      sampleResults.push({ url, error: e.message });
      console.log(`     ✗ FAIL: ${e.message}`);
    }
  }

  // 4. Member-only oranı + schema homojenliği
  const loginCount = sampleResults.filter(s => s.has_login_wall).length;
  const contentCount = sampleResults.filter(s => s.has_recipe_content).length;
  const bjcpCount = sampleResults.filter(s => s.bjcp_style).length;
  console.log(`\n=== 4. Sample analiz ===`);
  console.log(`  Login wall: ${loginCount}/${samplePool.length} (${(100*loginCount/samplePool.length).toFixed(0)}%)`);
  console.log(`  Recipe content visible: ${contentCount}/${samplePool.length}`);
  console.log(`  BJCP style extracted (heuristic): ${bjcpCount}/${samplePool.length}`);

  // Unique BJCP style labels
  const styleLabels = sampleResults.filter(s => s.bjcp_style).map(s => s.bjcp_style);
  const uniqueStyles = [...new Set(styleLabels)];
  console.log(`\n  Unique BJCP style labels in sample (${uniqueStyles.length}):`);
  for (const sl of uniqueStyles) console.log(`    - ${sl}`);

  // Output
  const report = {
    timestamp: new Date().toISOString(),
    sitemaps: {
      total_urls: allUrls.length,
      recipe_urls: recipeUrls.length,
    },
    family_classification: {
      counts: familyCounts,
      sour_brett_total: sourBrettCount,
      samples: slugSamples,
    },
    sample_fetch: {
      attempted: samplePool.length,
      login_wall: loginCount,
      content_visible: contentCount,
      bjcp_extracted: bjcpCount,
      unique_bjcp_styles: uniqueStyles,
      results: sampleResults,
    },
    all_recipe_urls: recipeUrls,
  };
  fs.writeFileSync('_step52_aha_b1_report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Done. Report → _step52_aha_b1_report.json');
}

main().catch(e => { console.error(e); process.exit(1); });
