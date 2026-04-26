// Brewfather styles endpoint discovery — env-only credentials
const https = require('https');
const auth = 'Basic ' + Buffer.from(process.env.BF_USER + ':' + process.env.BF_KEY).toString('base64');

function fetchPath(path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.brewfather.app', path, method: 'GET',
      headers: { 'Authorization': auth, 'Accept': 'application/json' }
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers}));
    });
    req.on('error', e => resolve({error: e.message}));
    req.end();
  });
}

(async () => {
  // Try various style endpoints
  const candidates = [
    '/v2/styles',
    '/v2/styles?limit=200',
    '/v2/style',
    '/v2/inventory/styles',
    '/v1/styles',
    '/v2/style-guide',
    '/v2/recipe-styles'
  ];
  for (const p of candidates) {
    const r = await fetchPath(p);
    console.log(p+' → '+r.status, r.status===200 ? '(body len '+(r.body||'').length+')' : '');
    if (r.status === 200 && r.body) {
      try {
        const j = JSON.parse(r.body);
        if (Array.isArray(j)) {
          console.log('  Array of '+j.length+' items');
          if (j[0]) console.log('  First keys:', Object.keys(j[0]).slice(0, 10));
        } else if (j) {
          console.log('  Object keys:', Object.keys(j).slice(0, 10));
        }
      } catch(e) {
        console.log('  parse err, body[:200]:', (r.body||'').substring(0, 200));
      }
    }
  }
})();
