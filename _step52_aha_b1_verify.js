// Login wall mı false positive mi — körce regex doğrulaması
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
  // Ruddles Best Bitter — sandbox WebFetch'te tam görünüyordu
  const URL_PUBLIC = 'https://homebrewersassociation.org/homebrew-recipe/ruddles-best-bitter-learn-to-homebrew-2025-official-recipe/';
  // Flanders Brown — sample'da login wall göründü
  const URL_SUSPECT = 'https://homebrewersassociation.org/homebrew-recipe/flanders-brown-ale/';

  for (const [label, url] of [['PUBLIC_REF', URL_PUBLIC], ['SUSPECT', URL_SUSPECT]]) {
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    await sleep(10000);
    const r = await rawFetch(url);
    console.log(`Status: ${r.status}`);
    console.log(`Body length: ${r.body.length}`);

    // Search for key markers
    const checks = [
      ['login wall: "please log in"', /please log in/i],
      ['login wall: "members? only"', /members? only/i],
      ['login wall: "sign in to view"', /sign in to view/i],
      ['login wall: "locked recipe"', /locked recipe/i],
      ['login wall: "ahaaccess|members-only|memberlocked"', /aha[-_]?access|members?[-_]?only|member[-_]?locked/i],
      ['ingredient header (h2/3 Ingredients)', /<h[12345][^>]*>(\s*Ingredients|\s*Specifications|\s*Directions)/i],
      ['"Ingredients" plain text', /\bIngredients\b/],
      ['malt mention "OG" near number', /\bOG\s*[:=\-]?\s*1\.0/],
      ['style label after "Style:"', /Style\s*[:\-]/i],
      ['hidden content marker', /membership|paywall|locked/i],
      ['"Members" mention', /\bMembers\b/],
    ];
    for (const [label2, re] of checks) {
      const m = r.body.match(re);
      console.log(`  ${m ? 'YES' : 'no '}  ${label2}${m ? ' → "'+m[0].slice(0,60)+'"' : ''}`);
    }

    // Save body
    const fn = `_aha_${label.toLowerCase()}_body.html`;
    fs.writeFileSync(fn, r.body);
    console.log(`Saved → ${fn}`);
  }
}

main().catch(console.error);
