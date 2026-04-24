// Feature elimination: zayıf feature'ları (t1<2%) çıkar, KNN yeniden benchmark
const fs = require('fs');
const DS = JSON.parse(fs.readFileSync(__dirname + '/_ml_dataset.json', 'utf8'));
const records = DS.records;
const featureKeys = DS._meta.feature_keys;
const stats = DS.feature_stats;

// Feature importance skorlarından zayıf olanları bul (manuel listede top 20'deki olmayanlar)
const STRONG = new Set([
  'ibu','srm','abv','og','fg',
  'pct_wheat','pct_pilsner','pct_crystal','pct_oats','pct_base','pct_munich','pct_choc','pct_roast','pct_sugar','pct_corn','pct_vienna','pct_rice','pct_sixrow','pct_rye','pct_smoked','pct_aromatic_abbey',
  'yeast_american','yeast_german_lager','yeast_saison','yeast_wheat_german','yeast_czech_lager','yeast_english','yeast_belgian','yeast_brett','yeast_lacto','yeast_sour_blend','yeast_kolsch','yeast_altbier','yeast_cal_common','yeast_american_lager','yeast_wit','yeast_kveik',
  'hop_american_c','hop_english','hop_german','hop_czech_saaz','hop_nz',
  'katki_fruit','katki_spice_herb','katki_chocolate','katki_pumpkin','katki_lactose','katki_vanilla',
  'total_dark','total_adjunct','crystal_ratio','strong_abv','pale_color',
]);

const keepIdx = featureKeys.map((k, i) => STRONG.has(k) ? i : -1).filter(i => i >= 0);
console.log('Keeping', keepIdx.length, '/', featureKeys.length, 'features');

function normalize(f, keys) {
  return keys.map(k => {
    const s = stats[k];
    if (s.std < 0.001) return 0;
    if (s.min === 0 && s.max === 1) return f[k];
    return (f[k] - s.mean) / s.std;
  });
}
const keepKeys = keepIdx.map(i => featureKeys[i]);
const vecs = records.map(r => normalize(r.features, keepKeys));

const W = keepKeys.map(k => {
  if (k.startsWith('yeast_')) return 2.0;
  if (k.startsWith('katki_')) return 5.0;
  if (k.startsWith('hop_'))   return 1.5;
  if (k.startsWith('pct_'))   return 1.2;
  if (['og','fg','abv','ibu','srm'].includes(k)) return 2.5;  // scalar ağırlık artırıldı
  return 0.8;
});

function dist(a,b) { let s=0; for (let i=0;i<a.length;i++) { const d=(a[i]-b[i])*W[i]; s+=d*d; } return Math.sqrt(s); }

function evalKNN(k) {
  let t1=0, t3=0, t5=0;
  for (let i=0; i<records.length; i++) {
    const dists = [];
    for (let j=0; j<records.length; j++) {
      if (j === i) continue;
      dists.push({ j, d: dist(vecs[i], vecs[j]) });
    }
    dists.sort((a,b)=>a.d-b.d);
    const top = dists.slice(0, k);
    const sc = {}; let tw=0;
    for (const {j,d} of top) { const w=1/(d+0.1); sc[records[j].label_slug] = (sc[records[j].label_slug]||0)+w; tw+=w; }
    for (const s in sc) sc[s] /= tw;
    const ranked = Object.entries(sc).sort((a,b)=>b[1]-a[1]);
    const exp = records[i].label_slug;
    if (ranked[0]?.[0] === exp) t1++;
    if (ranked.slice(0,3).some(x=>x[0]===exp)) t3++;
    if (ranked.slice(0,5).some(x=>x[0]===exp)) t5++;
  }
  return { t1:t1/records.length, t3:t3/records.length, t5:t5/records.length };
}

const pct = x => (x*100).toFixed(1)+'%';
console.log('\n=== KNN ile seçilmiş feature set + scalar×2.5 ağırlık ===');
for (const k of [3,5,7]) {
  const r = evalKNN(k);
  console.log(`  k=${k}:  t1=${pct(r.t1)}  t3=${pct(r.t3)}  t5=${pct(r.t5)}`);
}
