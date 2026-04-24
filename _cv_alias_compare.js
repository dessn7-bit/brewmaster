// 5-fold CV alias-on vs alias-off — KNN+RF ensemble (w=0.4/0.6), no rule
// Purpose: measure top-1/3/5 gain from slug normalization
const fs = require('fs');

function run(dsPath, label) {
  const DS = JSON.parse(fs.readFileSync(__dirname + '/' + dsPath,'utf8'));
  const records = DS.records;
  const featureKeys = DS._meta.feature_keys;
  const stats = DS.feature_stats;

  function normalize(f) {
    const v = [];
    for (const k of featureKeys) {
      const s = stats[k];
      if (s.std < 0.001) { v.push(0); continue; }
      if (s.min === 0 && s.max === 1) { v.push(f[k]); continue; }
      v.push((f[k] - s.mean) / s.std);
    }
    return v;
  }
  const allVecs = records.map(r => normalize(r.features));
  const allLabels = records.map(r => r.label_slug);

  const KNN_WEIGHTS = featureKeys.map(k => {
    if (k.startsWith('yeast_')) return 2.0;
    if (k.startsWith('katki_')) return 5.0;
    if (k.startsWith('hop_'))   return 1.5;
    if (k.startsWith('pct_'))   return 1.2;
    if (['og','fg','abv','ibu','srm'].includes(k)) return 1.0;
    return 0.8;
  });
  function kDist(a,b){let s=0;for(let i=0;i<a.length;i++){const d=(a[i]-b[i])*KNN_WEIGHTS[i];s+=d*d;}return Math.sqrt(s);}
  function knnScores(q, trainIdx, k) {
    const dists = [];
    for (const i of trainIdx) dists.push({ i, d: kDist(q, allVecs[i]) });
    dists.sort((a,b)=>a.d-b.d);
    const top = dists.slice(0, k);
    const sc = {}; let tw=0;
    for (const {i,d} of top) { const w=1/(d+0.1); sc[allLabels[i]] = (sc[allLabels[i]]||0) + w; tw+=w; }
    for (const s in sc) sc[s] /= tw;
    return sc;
  }

  function gini(lbls){if(!lbls.length)return 0;const c={};for(const l of lbls)c[l]=(c[l]||0)+1;let g=1;const n=lbls.length;for(const v of Object.values(c))g-=(v/n)**2;return g;}
  function bestSplit(idxs, fc, feats, lbls, rfc) {
    let bg=Infinity, bf=-1, bt=0;
    const fi=[];
    if (rfc && rfc<fc){const pool=[...Array(fc).keys()];for(let i=0;i<rfc;i++){const k=Math.floor(Math.random()*pool.length);fi.push(pool.splice(k,1)[0]);}}
    else for(let i=0;i<fc;i++) fi.push(i);
    for (const f of fi) {
      const vs = new Set(); for (const i of idxs) vs.add(feats[i][f]);
      const sv = [...vs].sort((a,b)=>a-b);
      for (let ti=0; ti<sv.length-1; ti++) {
        const thr=(sv[ti]+sv[ti+1])/2;
        const L=[],R=[];
        for (const i of idxs) { if (feats[i][f]<=thr) L.push(lbls[i]); else R.push(lbls[i]); }
        if (!L.length||!R.length) continue;
        const wg=(L.length*gini(L)+R.length*gini(R))/idxs.length;
        if (wg<bg){bg=wg;bf=f;bt=thr;}
      }
    }
    return {feat:bf,thr:bt,gini:bg};
  }
  function majority(lbls){const c={};for(const l of lbls)c[l]=(c[l]||0)+1;return c;}
  function buildTree(idxs, feats, lbls, d, md, ms, rfc) {
    const nl = idxs.map(i=>lbls[i]);
    const cnt = majority(nl);
    if (d>=md || idxs.length<ms || Object.keys(cnt).length===1) return {leaf:true,counts:cnt};
    const s = bestSplit(idxs, feats[0].length, feats, lbls, rfc);
    if (s.feat<0 || s.gini>=gini(nl)) return {leaf:true,counts:cnt};
    const L=[],R=[];
    for (const i of idxs) { if (feats[i][s.feat]<=s.thr) L.push(i); else R.push(i); }
    if (!L.length||!R.length) return {leaf:true,counts:cnt};
    return {leaf:false,feat:s.feat,thr:s.thr,left:buildTree(L,feats,lbls,d+1,md,ms,rfc),right:buildTree(R,feats,lbls,d+1,md,ms,rfc)};
  }
  function predictTree(t,v){if(t.leaf)return t.counts;return predictTree(v[t.feat]<=t.thr?t.left:t.right,v);}
  function buildForest(feats, lbls, train, nTrees, md, ms, rfc) {
    const trees=[];
    for (let t=0;t<nTrees;t++) {
      const b=[];
      for (let i=0;i<train.length;i++) b.push(train[Math.floor(Math.random()*train.length)]);
      trees.push(buildTree(b,feats,lbls,0,md,ms,rfc));
    }
    return trees;
  }
  function rfScores(forest, vec) {
    const total={};
    for (const tree of forest) {
      const c = predictTree(tree,vec);
      const sum = Object.values(c).reduce((a,b)=>a+b,0);
      for (const [l,v] of Object.entries(c)) total[l]=(total[l]||0)+v/sum;
    }
    const sum = Object.values(total).reduce((a,b)=>a+b,0);
    if (sum>0) for (const s in total) total[s]/=sum;
    return total;
  }
  function mergeScores(arr, w) { const t={}; for (let i=0;i<arr.length;i++) for (const [s,v] of Object.entries(arr[i])) t[s]=(t[s]||0)+v*w[i]; return t; }

  // 5-fold stratified-ish CV
  const K = 5;
  const N = records.length;
  const order = [...Array(N).keys()];
  // Deterministic shuffle (seed)
  let seed = 42;
  function rand() { seed = (seed*1103515245 + 12345) & 0x7FFFFFFF; return seed/0x7FFFFFFF; }
  for (let i=N-1; i>0; i--) { const j=Math.floor(rand()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }

  let t1=0,t3=0,t5=0;
  const start = Date.now();
  for (let f=0; f<K; f++) {
    const testIdx = order.filter((_,idx)=>idx%K===f);
    const trainIdx = order.filter((_,idx)=>idx%K!==f);
    const forest = buildForest(allVecs, allLabels, trainIdx, 50, 15, 2, 10);
    for (const i of testIdx) {
      const knnS = knnScores(allVecs[i], trainIdx, 5);
      const rfS  = rfScores(forest, allVecs[i]);
      const total = mergeScores([knnS,rfS],[0.4,0.6]);
      const ranked = Object.entries(total).sort((a,b)=>b[1]-a[1]);
      const top1 = ranked[0]?.[0], top3 = ranked.slice(0,3).map(x=>x[0]), top5 = ranked.slice(0,5).map(x=>x[0]);
      const exp = allLabels[i];
      if (top1===exp) t1++;
      if (top3.includes(exp)) t3++;
      if (top5.includes(exp)) t5++;
    }
  }
  const dur = ((Date.now()-start)/1000).toFixed(0);
  const p = x=>(x/N*100).toFixed(1)+'%';
  console.log(`${label.padEnd(20)} | top1=${p(t1)}  top3=${p(t3)}  top5=${p(t5)}  N=${N} (${dur}s)`);
}

console.log('═══ 5-fold CV — alias-on vs alias-off ═══');
run('_ml_dataset.json', 'ALIAS OFF (baseline)');
run('_ml_dataset_normalized.json', 'ALIAS ON');
