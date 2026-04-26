// Brewfather discovery — reads credentials from env BF_USER, BF_KEY
// Never logs credentials or commits them.
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
  console.log('--- /v2/recipes ---');
  const r1 = await fetchPath('/v2/recipes');
  if (r1.status === 200) {
    const j = JSON.parse(r1.body);
    console.log('Total recipes:', j.length);
    j.forEach((r, i) => console.log('  ' + (i+1) + '. ' + r._id + ' — ' + r.name + ' [style: ' + (r.style ? r.style.name : '?') + ']'));
  } else {
    console.log('STATUS:', r1.status, 'body:', r1.body.substring(0, 300));
  }

  console.log('\n--- /v2/recipes?limit=200 ---');
  const r2 = await fetchPath('/v2/recipes?limit=200');
  if (r2.status === 200) {
    const j = JSON.parse(r2.body);
    console.log('Returned:', j.length);
  }

  console.log('\n--- /v2/batches ---');
  const r3 = await fetchPath('/v2/batches?limit=50');
  if (r3.status === 200) {
    const j = JSON.parse(r3.body);
    console.log('Batches:', j.length);
    j.slice(0, 5).forEach(b => console.log('  ' + b._id + ' — ' + (b.name || '?') + ' status=' + (b.status || '?')));
  }

  console.log('\n--- recipe detail (first recipe) ---');
  if (r1.status === 200) {
    const first = JSON.parse(r1.body)[0];
    if (first) {
      const r4 = await fetchPath('/v2/recipes/' + first._id);
      if (r4.status === 200) {
        const j = JSON.parse(r4.body);
        console.log('Detail keys:', Object.keys(j));
        console.log('Has fermentables:', Array.isArray(j.fermentables), 'len:', (j.fermentables || []).length);
        console.log('Has hops:', Array.isArray(j.hops), 'len:', (j.hops || []).length);
        console.log('Has yeasts:', Array.isArray(j.yeasts), 'len:', (j.yeasts || []).length);
        console.log('OG/FG/IBU/Color:', j.og, j.fg, j.ibu, j.color);
        console.log('brewedCount:', j.brewedCount, 'public:', j.public, 'rating:', j.rating);
        if (j.fermentables && j.fermentables[0]) {
          console.log('First fermentable keys:', Object.keys(j.fermentables[0]));
        }
      } else {
        console.log('Detail fetch STATUS:', r4.status);
      }
    }
  }

  console.log('\n--- inventory (peek) ---');
  const r5 = await fetchPath('/v2/inventory/fermentables?limit=5');
  if (r5.status === 200) {
    const j = JSON.parse(r5.body);
    console.log('User inventory fermentables:', j.length);
  }
})();
