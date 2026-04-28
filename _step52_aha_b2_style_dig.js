// 8 sample'da style_links boş — body'de style label nereden çıkacak araştır
const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' },
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
  const samples = [
    'https://homebrewersassociation.org/homebrew-recipe/traditional-berliner-weisse/',
    'https://homebrewersassociation.org/homebrew-recipe/joes-tripel/',
    'https://homebrewersassociation.org/homebrew-recipe/no-fail-extract-ipa/',
  ];

  for (const url of samples) {
    console.log('='.repeat(70));
    console.log(`URL: ${url}`);
    await sleep(10000);
    const r = await rawFetch(url);
    if (r.status !== 200) {
      console.log(`HTTP ${r.status}`);
      continue;
    }
    const body = r.body;

    // 1. Search for "Style:" anywhere in body
    const styleMatches = [...body.matchAll(/[\s>"]Style\b\s*[:.\s][\s\S]{0,200}/gi)].slice(0, 5);
    console.log(`\nStyle: matches in body: ${styleMatches.length}`);
    for (const m of styleMatches) {
      const snippet = m[0].replace(/\n/g, ' ').replace(/\s+/g, ' ').slice(0, 150);
      console.log(`  "${snippet}"`);
    }

    // 2. Beer-style URL patterns ANYWHERE in body
    const beerStyleAll = [...body.matchAll(/href="[^"]*\/beer-style\/([^"\/]+)\/?"/g)];
    console.log(`\n/beer-style/<slug>/ links: ${beerStyleAll.length}`);
    const uniqueSlugs = [...new Set(beerStyleAll.map(m => m[1]))];
    console.log(`  unique slugs: ${JSON.stringify(uniqueSlugs)}`);

    // 3. JSON-LD content
    const jsonLdMatches = [...body.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    console.log(`\nJSON-LD scripts: ${jsonLdMatches.length}`);
    for (const m of jsonLdMatches) {
      try {
        const d = JSON.parse(m[1]);
        if (Array.isArray(d['@graph'])) {
          for (const it of d['@graph']) {
            if (it['@type']) console.log(`  @type=${it['@type']}  name=${it.name || it.headline || '?'}`);
          }
        } else if (d['@type']) {
          console.log(`  @type=${d['@type']}  name=${d.name || '?'}`);
        }
      } catch (e) {
        console.log(`  parse fail: ${e.message.slice(0, 60)}`);
      }
    }

    // 4. Specifications section content (full)
    const specsMatch = body.match(/<h3[^>]*>Specifications:?\s*<\/h3>([\s\S]{0,3000}?)<\/div>/);
    if (specsMatch) {
      const text = specsMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600);
      console.log(`\nSpecifications section text:\n  "${text}"`);
    }

    // 5. Tag area / category / breadcrumb
    const tagPatterns = [
      /<a[^>]+rel="(?:tag|category)"[^>]*>([^<]+)<\/a>/g,
      /<a[^>]+class="[^"]*(?:tag|category|term)[^"]*"[^>]*>([^<]+)<\/a>/g,
      /<a[^>]+href="[^"]*\/(?:tag|category)\/([^"\/]+)\/?"[^>]*>([^<]+)<\/a>/g,
    ];
    for (const re of tagPatterns) {
      const matches = [...body.matchAll(re)].slice(0, 8);
      if (matches.length) {
        console.log(`\nTags via ${re.source.slice(0, 30)}:`);
        for (const mt of matches) {
          console.log(`  ${mt[mt.length - 1].slice(0, 40)}`);
        }
      }
    }

    // 6. Breadcrumb
    const breadcrumb = body.match(/breadcrumb[\s\S]{0,500}/i);
    if (breadcrumb) {
      const text = breadcrumb[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300);
      console.log(`\nBreadcrumb area: "${text}"`);
    }

    console.log();
  }
}

main().catch(console.error);
