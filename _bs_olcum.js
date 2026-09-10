// ═══ SPRINT BS — TAHIL EKSENİ ÖLÇÜMÜ (eşik UYDURULMAZ, korpustan kalibre edilir) ═══
//
// SORU 1: grist'te buğday/çavdar/yulaf/mısır-pirinç VAR MI, oranı ne?
// SORU 2: hangi eşik gerçek tahıl stillerini arpa stillerinden AYIRIR?
//         (bilinen-etiket kalibrasyonu: eşik süpürülür, en yüksek uyum seçilir)
// SORU 3: kapsama — kaç kayıtta türetilebiliyor?
// SORU 4: isli (rauch/smoked) için YETERLİ veri var mı?
// SORU 5: 'ekmeksi' fallback'i tahıl-güdümlü biralardan ayrılınca HANGİ stiller değişir?
//
// Kullanım: node _bs_olcum.js
'use strict';
const fs = require('fs'), path = require('path'), readline = require('readline'), vm = require('vm');
const KOK = __dirname, W = path.join(KOK, 'working');
const TSV = path.join(W, '_compact3.tsv'), SLUG = path.join(W, 'slug2bjcp.json');
const HTML = path.join(KOK, 'Brewmaster_v2_79_10.html');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
if (!fs.existsSync(TSV)) abort('korpus yok');

const html = fs.readFileSync(HTML, 'utf8');
function dilim(re) { const m = html.match(re); if (!m) abort('dilim yok: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(dilim(/const BJCP = \{[\s\S]*?\n\};/).replace('const ', '') + '\n' +
  dilim(/window\._PROFIL_KARAKTER = \{[\s\S]*?\n\};/) + '\n' +
  dilim(/window\._BR_STILAD = \[[\s\S]*?\];/), ctx);
const BJCP = ctx.BJCP, KAR0 = ctx.window._PROFIL_KARAKTER, STILAD = ctx.window._BR_STILAD;
console.log('[dilim] BJCP=' + Object.keys(BJCP).length + ' karakter=' + Object.keys(KAR0).length + ' matris-stil=' + STILAD.length);

const M = JSON.parse(fs.readFileSync(SLUG, 'utf8'));
const KATCH = new Set(M.katchall);

// ── BQ1 malt sınıflandırıcısı (BİREBİR, referans) ────────────────────────
const P_TUM = ['p_crystal', 'p_wheat', 'p_oats', 'p_roast', 'p_choc', 'p_sugar', 'p_munich', 'p_vienna',
  'p_pilsner', 'p_pale_ale', 'p_rye', 'p_corn', 'p_rice', 'p_smoked', 'p_aromatic_abbey', 'p_sixrow', 'p_other'];
function MALT_BQ1(g, r) {
  if (!(g('n_malt') > 0) && P_TUM.reduce((s, k) => s + g(k), 0) <= 0) return null;
  const roast = g('p_roast'), choc = g('p_choc');
  if (roast + choc >= 3) return choc > roast ? 'cikolata' : 'kavrulmus';
  if (g('p_smoked') > 5 || parseFloat(r.k_smoke) >= 1) return 'isli';
  if (g('p_crystal') >= 8) return 'karamel';
  if (g('p_munich') + g('p_vienna') + g('p_aromatic_abbey') >= 20) return 'tost';
  return 'ekmeksi';
}

// ── Bilinen etiketler (kalibrasyon hedefi) ───────────────────────────────
const ETIKET = {
  bugday: ['Weizen / Weissbier', 'Witbier / Belgian White', 'Dunkelweizen', 'Weizenbock', 'Berliner Weisse', 'American Wheat Beer'],
  cavdar: ['Roggenbier / Rye Beer'],
  yulaf: ['Oatmeal Stout'],
  adjunct: ['American Lager / Light Lager', 'Pre-Prohibition Lager', 'International Pale Lager'],
  arpa: ['American IPA', 'American Pale Ale', 'German Pils', 'Robust Porter', 'Dry Irish Stout',
    'Munich Märzen / Oktoberfest', 'Kölsch', 'Bock', 'Doppelbock', 'American Amber Ale / Red Ale',
    'Best Bitter', 'Tripel', 'Belgian Strong Golden Ale', 'Baltic Porter', 'Schwarzbier']
};
const ETIKET_HEPSI = {};
Object.keys(ETIKET).forEach(k => ETIKET[k].forEach(a => { ETIKET_HEPSI[a] = k; }));
Object.keys(ETIKET_HEPSI).forEach(a => { if (!BJCP[a]) abort('etiket BJCP\'de yok: ' + a); });

// ── Korpusu tara: ham oranları stil bazında topla ────────────────────────
let hdr = null, ix = {}, n = 0, gecerli = 0, gristYok = 0;
const stil = new Map();   // ad -> { n, oran:{wheat:[],rye:[],oats:[],adj:[]}, isli:0, smokedN:0, kayit:[] }
const dagilim = { wheat: {}, rye: {}, oats: {}, adj: {}, smoked: {} };
function kova10(v) { return Math.min(10, Math.floor(v / 10)) * 10; }

readline.createInterface({ input: fs.createReadStream(TSV) })
  .on('line', l => {
    const a = l.split('\t');
    if (!hdr) { hdr = a; hdr.forEach((h, i) => ix[h] = i); return; }
    n++;
    const g = k => { const v = parseFloat(a[ix[k]]); return isFinite(v) ? v : 0; };
    const og = g('og'), slug = a[ix.slug];
    if (og < 1.005 || !slug || KATCH.has(slug)) return;
    const ad = M.slug2bjcp[slug]; if (!ad || !BJCP[ad]) return;
    gecerli++;
    const gristVar = (g('n_malt') > 0) || P_TUM.reduce((s, k) => s + g(k), 0) > 0;
    if (!gristVar) { gristYok++; return; }
    let v = stil.get(ad);
    if (!v) { v = { n: 0, w: [], ry: [], o: [], adj: [], smoked: 0, ksmoke: 0, maltBQ1: {} }; stil.set(ad, v); }
    v.n++;
    const w = g('p_wheat'), ry = g('p_rye'), o = g('p_oats'), adj = g('p_corn') + g('p_rice'), sm = g('p_smoked');
    v.w.push(w); v.ry.push(ry); v.o.push(o); v.adj.push(adj);
    if (sm > 5 || parseFloat(a[ix.k_smoke]) >= 1) v.smoked++;
    if (sm > 0) v.ksmoke++;
    dagilim.wheat[kova10(w)] = (dagilim.wheat[kova10(w)] || 0) + 1;
    dagilim.rye[kova10(ry)] = (dagilim.rye[kova10(ry)] || 0) + 1;
    dagilim.oats[kova10(o)] = (dagilim.oats[kova10(o)] || 0) + 1;
    dagilim.adj[kova10(adj)] = (dagilim.adj[kova10(adj)] || 0) + 1;
    if (sm > 0) dagilim.smoked[kova10(sm)] = (dagilim.smoked[kova10(sm)] || 0) + 1;
    const r = { k_smoke: a[ix.k_smoke] };
    const mb = MALT_BQ1(g, r); if (mb) v.maltBQ1[mb] = (v.maltBQ1[mb] || 0) + 1;
  })
  .on('close', bitir);

function med(arr) { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }
function yuzde(arr, p) { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }

function bitir() {
  console.log('\n== KORPUS ==');
  console.log('okunan=' + n + ' gecerli=' + gecerli + ' grist-YOK=' + gristYok +
    ' (%' + (100 * gristYok / gecerli).toFixed(3) + ') -> grist kapsama %' + (100 * (gecerli - gristYok) / gecerli).toFixed(2));

  console.log('\n== SORU 1: TAHIL ORANI DAGILIMI (grist olan ' + (gecerli - gristYok) + ' kayit) ==');
  ['wheat', 'rye', 'oats', 'adj'].forEach(k => {
    const d = dagilim[k], tot = Object.values(d).reduce((a, b) => a + b, 0);
    const sat = Object.keys(d).map(Number).sort((a, b) => a - b)
      .map(x => '%' + x + '-' + (x + 9) + ':' + (100 * d[x] / tot).toFixed(1) + '%').join('  ');
    console.log('  ' + k.padEnd(6) + ' ' + sat);
  });
  console.log('  smoked>0 olan kayit: ' + Object.values(dagilim.smoked).reduce((a, b) => a + b, 0));

  console.log('\n== SORU 2: ESIK SUPURMESI (bilinen etiket uyumu) ==');
  // Tahıl sınıflandırıcı: en büyük özel tahıl eşiği geçerse o sınıf, yoksa arpa
  function TAHIL(w, ry, o, adj, T) {
    const c = [['bugday', w], ['cavdar', ry], ['yulaf', o], ['adjunct', adj]].filter(x => x[1] >= T);
    if (!c.length) return 'arpa';
    c.sort((a, b) => b[1] - a[1]);
    return c[0][0];
  }
  const adaylar = [];
  for (let T = 5; T <= 40; T += 1) {
    let dogru = 0, toplam = 0, hata = [];
    Object.keys(ETIKET_HEPSI).forEach(ad => {
      const v = stil.get(ad); if (!v) return;
      const say = {};
      for (let i = 0; i < v.n; i++) { const c = TAHIL(v.w[i], v.ry[i], v.o[i], v.adj[i], T); say[c] = (say[c] || 0) + 1; }
      const bask = Object.entries(say).sort((a, b) => b[1] - a[1])[0];
      toplam++;
      if (bask && bask[0] === ETIKET_HEPSI[ad]) dogru++; else hata.push(ad + '→' + (bask ? bask[0] : '-') + '(beklenen ' + ETIKET_HEPSI[ad] + ')');
    });
    adaylar.push({ T, dogru, toplam, hata });
  }
  adaylar.forEach(x => console.log('  T=%' + String(x.T).padStart(2) + '  uyum ' + x.dogru + '/' + x.toplam +
    (x.hata.length && x.hata.length <= 4 ? '   hata: ' + x.hata.join(' , ') : (x.hata.length ? '   ' + x.hata.length + ' hata' : ''))));
  const enIyi = adaylar.filter(x => x.dogru === Math.max(...adaylar.map(y => y.dogru)));
  const T = enIyi[Math.floor(enIyi.length / 2)].T; // en iyi uyum bandinin ORTASI (kenar degil)
  console.log('  -> en yuksek uyum ' + enIyi[0].dogru + '/' + enIyi[0].toplam +
    ', band T=%' + enIyi[0].T + '..%' + enIyi[enIyi.length - 1].T + ' ; SECILEN T=%' + T + ' (bandin ortasi)');

  console.log('\n== SORU 3: TAHIL KAPSAMA + STIL BAZINDA BASKIN SINIF (T=%' + T + ') ==');
  const TAHIL_STIL = {};
  const rapor = [];
  stil.forEach((v, ad) => {
    const say = {};
    for (let i = 0; i < v.n; i++) { const c = TAHIL(v.w[i], v.ry[i], v.o[i], v.adj[i], T); say[c] = (say[c] || 0) + 1; }
    const e = Object.entries(say).sort((a, b) => b[1] - a[1]);
    const tot = e.reduce((s, x) => s + x[1], 0);
    TAHIL_STIL[ad] = { sinif: e[0][0], pay: Math.round(+(e[0][1] / tot).toFixed(3) * 100), n: v.n };
    rapor.push([ad, e[0][0], TAHIL_STIL[ad].pay, v.n, med(v.w), med(v.ry), med(v.o), med(v.adj)]);
  });
  const sinifSay = {};
  Object.keys(TAHIL_STIL).forEach(a => { const c = TAHIL_STIL[a].sinif; sinifSay[c] = (sinifSay[c] || 0) + 1; });
  console.log('  matristeki stil sayisi: ' + STILAD.length + ' ; siniflanan: ' + STILAD.filter(a => TAHIL_STIL[a]).length);
  console.log('  sinif dagilimi (stil): ' + JSON.stringify(sinifSay));
  console.log('  ARPA DISI stiller:');
  rapor.filter(x => x[1] !== 'arpa').sort((a, b) => b[3] - a[3]).forEach(x =>
    console.log('    ' + x[0].padEnd(38) + x[1].padEnd(9) + '%' + String(x[2]).padStart(3) + '  n=' + String(x[3]).padStart(6) +
      '  med w/ry/o/adj = ' + x[4] + '/' + x[5] + '/' + x[6] + '/' + x[7]));
  console.log('  KONTROL — bilinen etiketler:');
  Object.keys(ETIKET_HEPSI).forEach(ad => {
    const t = TAHIL_STIL[ad];
    const ok = t && t.sinif === ETIKET_HEPSI[ad];
    console.log('    ' + (ok ? 'PASS' : 'FAIL') + ' ' + ad.padEnd(38) + (t ? t.sinif + ' %' + t.pay : 'YOK') + '  (beklenen ' + ETIKET_HEPSI[ad] + ')');
  });

  console.log('\n== SORU 4: ISLI (rauch/smoked) VERI YETERLI Mi ==');
  let smokedKayit = 0, ksmokeKayit = 0;
  stil.forEach(v => { smokedKayit += v.smoked; ksmokeKayit += v.ksmoke; });
  console.log('  BQ1 isli esigini gecen kayit: ' + smokedKayit + ' (%' + (100 * smokedKayit / (gecerli - gristYok)).toFixed(3) + ')');
  console.log('  p_smoked>0 olan kayit: ' + ksmokeKayit);
  const isliStil = [];
  stil.forEach((v, ad) => { if (v.smoked >= 1) isliStil.push([ad, v.smoked, v.n, (100 * v.smoked / v.n).toFixed(1)]); });
  isliStil.sort((a, b) => b[1] - a[1]);
  console.log('  isli kaydi olan stil: ' + isliStil.length + ' ; ilk 12:');
  isliStil.slice(0, 12).forEach(x => console.log('    ' + x[0].padEnd(38) + 'isli ' + String(x[1]).padStart(5) + '/' + String(x[2]).padStart(6) + ' = %' + x[3]));
  const isliBaskin = Object.keys(KAR0).filter(a => KAR0[a][2] === 'isli');
  console.log('  BQ1 tablosunda baskin sinifi ISLI olan stil: ' + (isliBaskin.join(' · ') || 'YOK'));

  console.log('\n== SORU 5: EKMEKSI FALLBACK AYRIMI — HANGI STILLER DEGISIR ==');
  // Yeni kural: ozel malt esigi gecilmediyse VE tahil arpa DEGILSE -> malt sinifi YOK (null)
  const degisen = [];
  stil.forEach((v, ad) => {
    if (!KAR0[ad]) return;
    const eskiMalt = KAR0[ad][2];
    const t = TAHIL_STIL[ad];
    if (eskiMalt === 'ekmeksi' && t && t.sinif !== 'arpa') degisen.push([ad, eskiMalt, t.sinif, t.pay, v.n]);
  });
  console.log('  "ekmeksi" iken tahil-gudumlu oldugu icin ekmeksi\'den CIKACAK stil: ' + degisen.length);
  degisen.sort((a, b) => b[4] - a[4]).forEach(x =>
    console.log('    ' + x[0].padEnd(38) + 'ekmeksi -> (tahil: ' + x[2] + ' %' + x[3] + ')  n=' + x[4]));
  const ekmeksiKalan = Object.keys(KAR0).filter(a => KAR0[a][2] === 'ekmeksi' && !degisen.some(d => d[0] === a));
  console.log('  ekmeksi olarak KALAN stil: ' + ekmeksiKalan.length);

  console.log('\n== SORU 6: TAHIL EKSENI AYIRT EDICILIGI (60 kova) ==');
  const ctx2 = vm.createContext({ window: {} });
  vm.runInContext(dilim(/window\._PROFIL_STIL = \{[\s\S]*?\n\};/), ctx2);
  const PS = ctx2.window._PROFIL_STIL;
  let ayiran = 0;
  Object.keys(PS).forEach(k => {
    const s = new Set();
    PS[k][1].forEach(x => { const t = TAHIL_STIL[x[0]]; if (t) s.add(t.sinif); });
    if (s.size >= 2) ayiran++;
  });
  console.log('  tahil >=2 sinif ayiran kova: ' + ayiran + '/60 (BQ1 olcumu: maya 58/60, malt 46/60)');

  fs.writeFileSync(path.join(KOK, '_bs_tahil_out.json'), JSON.stringify({ T, TAHIL_STIL }, null, 0), 'utf8');
  console.log('\n[yaz] _bs_tahil_out.json (T=%' + T + ', ' + Object.keys(TAHIL_STIL).length + ' stil)');
}
