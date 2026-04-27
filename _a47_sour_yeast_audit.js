// Sour cluster yeast field audit — kayıp yeast data hangi kaynaktan?
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('_ml_dataset_v101_pre_retrain.json', 'utf8'));
const sour = data.recipes.filter(r => r.bjcp_main_category === 'Sour / Wild / Brett');
console.log('Sour cluster total: ' + sour.length + ' recipes');

const sourceCount = {};
for (const r of sour) sourceCount[r.source] = (sourceCount[r.source]||0)+1;
console.log('\nSour by source:');
Object.entries(sourceCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(15)+v));

// Categorize yeast field quality
const buckets = {
  empty: [],
  object_string: [],     // "[object object]"
  prose_paragraph: [],   // > 80 chars sentence
  short_strain_id: [],   // < 40 chars, likely real
  medium_freeform: [],   // 40-80 chars
  array_string: []       // contains " | "
};

for (const r of sour) {
  let y = r.raw && r.raw.yeast;
  const summary = { source: r.source, source_id: r.source_id, name: r.name, yeast_raw: y };
  if (Array.isArray(y)) y = y.join(' | ');
  const ys = String(y || '').trim();
  if (!ys) buckets.empty.push(summary);
  else if (ys === '[object Object]' || /\[object\s*object\]/i.test(ys)) buckets.object_string.push(summary);
  else if (ys.length > 80) buckets.prose_paragraph.push(summary);
  else if (ys.includes(' | ')) buckets.array_string.push(summary);
  else if (ys.length < 40) buckets.short_strain_id.push(summary);
  else buckets.medium_freeform.push(summary);
}

console.log('\n=== Yeast field quality buckets ===');
for (const [k, v] of Object.entries(buckets)) {
  console.log('  ' + k.padEnd(20) + v.length + ' / ' + sour.length);
}

// Source breakdown per bucket
console.log('\n=== object_string [object Object] — by source ===');
const srcObj = {};
for (const x of buckets.object_string) srcObj[x.source] = (srcObj[x.source]||0)+1;
Object.entries(srcObj).forEach(([k,v])=>console.log('  '+k.padEnd(15)+v));
console.log('Sample (first 5):');
buckets.object_string.slice(0,5).forEach(x=>console.log('  '+x.source+':'+x.source_id+' "'+x.name.slice(0,50)+'"'));

console.log('\n=== prose_paragraph (>80 chars) — by source ===');
const srcProse = {};
for (const x of buckets.prose_paragraph) srcProse[x.source] = (srcProse[x.source]||0)+1;
Object.entries(srcProse).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(15)+v));
console.log('Sample (first 8):');
buckets.prose_paragraph.slice(0,8).forEach(x=>console.log('  '+x.source+':'+x.source_id+'\n     "'+String(x.yeast_raw).slice(0,150)+'..."'));

console.log('\n=== short_strain_id (good!) — by source ===');
const srcGood = {};
for (const x of buckets.short_strain_id) srcGood[x.source] = (srcGood[x.source]||0)+1;
Object.entries(srcGood).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(15)+v));
console.log('Sample:');
buckets.short_strain_id.slice(0,10).forEach(x=>console.log('  '+x.source+':'+x.source_id+' yeast="'+x.yeast_raw+'"'));

// Recipator-specific deep dive (recipator was the main source of Sour data)
const recipatorSour = sour.filter(r => r.source === 'recipator');
console.log('\n=== Recipator Sour deep dive ('+recipatorSour.length+') ===');
let recObj=0, recProse=0, recGood=0, recOther=0;
for (const r of recipatorSour) {
  let y = r.raw && r.raw.yeast;
  if (Array.isArray(y)) y = y.join(' | ');
  const ys = String(y || '').trim();
  if (ys === '[object Object]' || /\[object\s*object\]/i.test(ys)) recObj++;
  else if (ys.length > 80) recProse++;
  else if (ys && ys.length < 40) recGood++;
  else recOther++;
}
console.log(`  [object Object]: ${recObj}, prose: ${recProse}, short ID: ${recGood}, other: ${recOther}`);

// Full output
fs.writeFileSync('_a47_sour_yeast_buckets.json', JSON.stringify(buckets, null, 2));
console.log('\nSaved _a47_sour_yeast_buckets.json');
