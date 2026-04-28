// B-2 — 169 AHA style listesi + 8-10 ek sample (Brett/Sour ağırlıklı)
const https = require('https');
const fs = require('fs');

const UA = 'Brewmaster-DatasetBuilder/1.0 (educational; contact: github.com/dessn7-bit/brewmaster)';

function rawFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/xml,text/html,*/*' },
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
  // 1. 169 AHA style listesi
  console.log('=== 1. AHA style sitemap fetch ===');
  await sleep(10000);
  const sm = await rawFetch('https://homebrewersassociation.org/recipe_beer_style-sitemap.xml');
  if (sm.status !== 200) throw new Error(`sitemap HTTP ${sm.status}`);
  const styleUrls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(sm.body)) !== null) styleUrls.push(m[1].trim());
  // Filter beer-style only
  const styles = styleUrls
    .filter(u => /\/beer-style\/[^/]+\/?$/.test(u))
    .map(u => u.replace(/^.*\/beer-style\/([^/]+)\/?$/, '$1'));
  console.log(`Total beer-style slugs: ${styles.length}`);
  // Convert slug to display name (hyphens → spaces, title-case)
  const styleNames = styles.map(s => ({
    slug: s,
    display: s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  }));
  console.log('\nFirst 30 styles:');
  for (const sn of styleNames.slice(0, 30)) console.log(`  ${sn.display.padEnd(40)} (${sn.slug})`);
  console.log(`\n... ve ${styleNames.length - 30} daha`);
  fs.writeFileSync('_aha_169_styles.json', JSON.stringify(styleNames, null, 2));
  console.log('Saved → _aha_169_styles.json');

  // 2. 8 ek sample reçete fetch (stratified, Brett/Sour ağırlıklı)
  console.log('\n=== 2. Ek sample reçete fetch (8 reçete, Brett/Sour ağırlıklı) ===');
  // Bu URL'leri B-1 sitemap'inden manual seçtim (Brett/Sour aile + diğer aileler)
  const samples = [
    // Brett/Sour aile (5)
    'https://homebrewersassociation.org/homebrew-recipe/traditional-berliner-weisse/',
    'https://homebrewersassociation.org/homebrew-recipe/jamils-flanders-red/',
    'https://homebrewersassociation.org/homebrew-recipe/distemper-sour-ale/',
    'https://homebrewersassociation.org/homebrew-recipe/brett-strawberry-farmhouse/',
    'https://homebrewersassociation.org/homebrew-recipe/poblano-wit/',
    // Diğer aileler (3) — stratified
    'https://homebrewersassociation.org/homebrew-recipe/pauls-hefeweizen/',  // wheat
    'https://homebrewersassociation.org/homebrew-recipe/joes-tripel/',  // belgian_strong
    'https://homebrewersassociation.org/homebrew-recipe/no-fail-extract-ipa/',  // ipa
  ];

  const results = [];
  for (let i = 0; i < samples.length; i++) {
    const url = samples[i];
    console.log(`  [${i+1}/${samples.length}] ${url.replace('https://homebrewersassociation.org','').slice(0, 60)}...`);
    await sleep(10000);
    try {
      const r = await rawFetch(url);
      const styleLinks = [];
      const styleRe = /<a[^>]+href="[^"]*\/beer-style\/([^"\/]+)\/?"[^>]*>([^<]+)<\/a>/g;
      let mm;
      while ((mm = styleRe.exec(r.body)) !== null) {
        styleLinks.push({ slug: mm[1], text: mm[2].trim() });
      }
      const titleMatch = r.body.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const og = (r.body.match(/(?:Original\s*Gravity|<p\s+class="spec">OG)\s*:?\s*([0-9]+\.[0-9]{2,4})/i) || [])[1];
      const fg = (r.body.match(/(?:Final\s*Gravity|<p\s+class="spec">FG)\s*:?\s*([0-9]+\.[0-9]{2,4})/i) || [])[1];
      const ibu = (r.body.match(/<p\s+class="spec">IBU\s*:?\s*([0-9]+\.?[0-9]*)/i) || [])[1];
      const srm = (r.body.match(/<p\s+class="spec">SRM\s*:?\s*([0-9]+\.?[0-9]*)/i) || [])[1];
      const abv = (r.body.match(/<p\s+class="spec">ABV\s*:?\s*([0-9]+\.?[0-9]*)/i) || [])[1];

      const r1 = {
        url, status: r.status, body_length: r.body.length,
        title: titleMatch ? titleMatch[1].trim() : '?',
        beer_style_links: styleLinks,
        og, fg, ibu, srm, abv,
      };
      results.push(r1);
      console.log(`     status=${r.status} title="${r1.title.slice(0, 40)}"`);
      console.log(`     style_links: [${styleLinks.map(l => l.text).join(', ')}]`);
      console.log(`     OG=${og}  FG=${fg}  IBU=${ibu}  SRM=${srm}  ABV=${abv}`);
    } catch (e) {
      console.log(`     FAIL: ${e.message}`);
      results.push({ url, error: e.message });
    }
  }

  fs.writeFileSync('_step52_aha_b2_samples.json', JSON.stringify(results, null, 2));
  console.log('\n✓ 8 sample report → _step52_aha_b2_samples.json');
}

main().catch(console.error);
