// MMUM bulk fetch ID 1-1822 — env-only, conservative rate limit
// Reads each export_json.php, saves to ./_mmum_raw/recipe_X.json
// Skips HTML responses (recipe-not-found)
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT = './_mmum_raw';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const RATE_MS = 300; // 0.3 sec per request

function fetchOne(id) {
  return new Promise((resolve) => {
    const url = `/export_json.php?id=${id}&factoraw=0&factorsha=0&factorhav=0&factorha1=0&factorha2=0&factorha3=0&factorha4=0&factorha5=0&factorha6=0&factorha7=0`;
    const req = https.request({
      hostname: 'www.maischemalzundmehr.de',
      path: url,
      method: 'GET',
      headers: {
        'User-Agent': 'Brewmaster Audit Bot (research, contact via github)',
        'Accept': 'application/json'
      }
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        // Detect HTML response (recipe-not-found)
        if (body.startsWith('<') || res.headers['content-type'] && !res.headers['content-type'].includes('json')) {
          resolve({ id, status: 'NOT_FOUND', size: body.length });
          return;
        }
        try {
          const j = JSON.parse(body);
          fs.writeFileSync(`${OUT}/recipe_${id}.json`, body);
          resolve({ id, status: 'OK', size: body.length, name: j.Name || '?', sorte: j.Sorte || '?' });
        } catch (e) {
          resolve({ id, status: 'PARSE_ERR', size: body.length, err: e.message });
        }
      });
    });
    req.on('error', e => resolve({ id, status: 'NET_ERR', err: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ id, status: 'TIMEOUT' }); });
    req.setTimeout(15000);
    req.end();
  });
}

async function main() {
  const start = Date.now();
  const results = { ok: 0, not_found: 0, errors: 0, by_status: {}, errors_log: [] };

  for (let id = 1; id <= 1822; id++) {
    const r = await fetchOne(id);
    results.by_status[r.status] = (results.by_status[r.status] || 0) + 1;
    if (r.status === 'OK') results.ok++;
    else if (r.status === 'NOT_FOUND') results.not_found++;
    else { results.errors++; if (results.errors_log.length < 30) results.errors_log.push(r); }

    // Progress every 100
    if (id % 100 === 0 || id === 1822) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`[${id}/1822] ok=${results.ok} not_found=${results.not_found} err=${results.errors} (${elapsed}s)`);
    }

    if (id < 1822) await new Promise(r => setTimeout(r, RATE_MS));
  }

  results.total_seconds = Math.round((Date.now() - start) / 1000);
  console.log('\n=== FINAL ===');
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync('_mmum_fetch_log.json', JSON.stringify(results, null, 2));
}
main();
