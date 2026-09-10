// ═══ SPRINT BS — TAHIL EKSENİ + MALT KARAKTERİ DÜZELTMESİ (tablo üreticisi) ═══
//
// KAAN'IN TESPİTİ: "buğday" sınıfı yoktu, buğday biraları "ekmeksi"ye düşüyordu.
// Bu YANLIŞ KATEGORİ: "ekmeksi" bir TAT/KARAKTER, "buğday" bir TAHIL. Kullanıcı
// buğday birası aramak için "ekmeksi"ye tıklamak zorunda kalıyordu.
//
// ÇÖZÜM: iki AYRI boyut.
//   (a) TAHIL      : arpa · buğday · çavdar · yulaf      (grist'teki tahıl)
//   (b) MALT KARAK.: ekmeksi · tost · karamel · kavrulmuş · çikolata · isli
// ve "ekmeksi" artık YALNIZ arpa tabanlı + özel maltsız reçeteler için kullanılır
// → "ekmeksi" seçilince buğday birası GELMEZ (Kaan'ın istediği ayrım).
//
// ── EŞİKLER UYDURULMADI: HER TAHIL KENDİ EŞİĞİYLE KALİBRE EDİLDİ ───────────
// İlk denemede TEK global eşik süpürüldü (_bs_olcum.js): en iyi uyum T=%5..%9
// bandındaydı ama T=%7 Saison'u (n=13.001, medyan buğday %7,7) "buğday birası"
// yapıyordu — SEMANTİK OLARAK YANLIŞ. Kök neden: buğday %5-10 bandında YAYGIN
// bir KATKI (köpük tutuşu), yulaf ise %9'da bile TANIMLAYICI (Oatmeal Stout
// medyanı %9,16). Yani tahılların eşikleri aynı olamaz. Bu yüzden her tahıl
// kendi POZİTİF/NEGATİF etiket kümesine karşı ayrı süpürüldü; seçilen eşik,
// "tüm pozitifler geçer + tüm negatifler geçmez" bandının ORTASIDIR.
//
// Etiketler BJCP tanımlarından gelir (uydurma değil):
//   buğday: BJCP 10 (Weizen ≥%50 buğday), 24A Witbier, 23A Berliner, 23B Lambic
//           (%30-40 malt edilmemiş buğday), 1D American Wheat
//   çavdar: BJCP 6C Roggenbier (%20-50 çavdar)
//   yulaf : BJCP 16B Oatmeal Stout (yulaf tanımlayıcı bileşen)
//
// Kullanım: node _bs_build_tahil.js [cikti.js]
'use strict';
const fs = require('fs'), path = require('path'), readline = require('readline'), vm = require('vm');
const KOK = __dirname, W = path.join(KOK, 'working');
const TSV = path.join(W, '_compact3.tsv'), SLUG = path.join(W, 'slug2bjcp.json');
const HTML = path.join(KOK, 'Brewmaster_v2_79_10.html');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
if (!fs.existsSync(TSV)) abort('korpus yok: ' + TSV);

const html = fs.readFileSync(HTML, 'utf8');
function dilim(re) { const m = html.match(re); if (!m) abort('dilim yok: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(dilim(/const BJCP = \{[\s\S]*?\n\};/).replace('const ', '') + '\n' +
  dilim(/window\._PROFIL_STIL = \{[\s\S]*?\n\};/) + '\n' +
  dilim(/window\._PROFIL_KARAKTER = \{[\s\S]*?\n\};/) + '\n' +
  dilim(/window\._BR_STILAD = \[[\s\S]*?\];/), ctx);
const BJCP = ctx.BJCP, PS = ctx.window._PROFIL_STIL, KAR0 = ctx.window._PROFIL_KARAKTER, STILAD = ctx.window._BR_STILAD;
if (Object.keys(KAR0).length !== 73) abort('mevcut karakter tablosu 73 degil: ' + Object.keys(KAR0).length);
console.log('[dilim] BJCP=' + Object.keys(BJCP).length + ' kova=' + Object.keys(PS).length +
  ' karakter=' + Object.keys(KAR0).length + ' matris-stil=' + STILAD.length);

const M = JSON.parse(fs.readFileSync(SLUG, 'utf8'));
const KATCH = new Set(M.katchall);

// ── BQ1 MAYA sınıflandırıcısı: DOKUNULMADI (BS3: altyapı korunur) ────────
// Maya sütunu bu betikte YENİDEN TÜRETİLMEZ; mevcut tablodan AYNEN taşınır.

// ── Grist sütunları ──────────────────────────────────────────────────────
const P_TUM = ['p_crystal', 'p_wheat', 'p_oats', 'p_roast', 'p_choc', 'p_sugar', 'p_munich', 'p_vienna',
  'p_pilsner', 'p_pale_ale', 'p_rye', 'p_corn', 'p_rice', 'p_smoked', 'p_aromatic_abbey', 'p_sixrow', 'p_other'];

// ── Kalibrasyon etiketleri (BJCP tanımlı) ────────────────────────────────
const ETIKET = {
  bugday: {
    poz: ['Weizen / Weissbier', 'Witbier / Belgian White', 'Dunkelweizen', 'Weizenbock',
      'Berliner Weisse', 'American Wheat Beer', 'Lambic / Gueuze'],
    neg: ['Saison / Farmhouse Ale', 'Brett Beer / Farmhouse Brett', 'American IPA', 'American Pale Ale',
      'German Pils', 'Kölsch', 'Tripel', 'Belgian Strong Golden Ale', 'Blonde Ale / Cream Ale',
      'NEIPA / Hazy IPA', 'American Amber Ale / Red Ale', 'Robust Porter']
  },
  cavdar: {
    poz: ['Roggenbier / Rye Beer'],
    neg: ['American IPA', 'American Pale Ale', 'Weizen / Weissbier', 'Robust Porter', 'German Pils', 'Best Bitter']
  },
  yulaf: {
    poz: ['Oatmeal Stout'],
    neg: ['Dry Irish Stout', 'Milk Stout / Sweet Stout', 'American Stout', 'Robust Porter',
      'Imperial / Russian Imperial Stout', 'Brown Porter', 'American IPA', 'German Pils']
  },
  adjunct: {
    poz: ['American Lager / Light Lager', 'Pre-Prohibition Lager', 'International Pale Lager'],
    neg: ['American IPA', 'German Pils', 'Kölsch', 'Munich Märzen / Oktoberfest', 'Bock']
  }
};
const ALAN = { bugday: 'w', cavdar: 'ry', yulaf: 'o', adjunct: 'adj' };
Object.keys(ETIKET).forEach(k => [].concat(ETIKET[k].poz, ETIKET[k].neg).forEach(a => { if (!BJCP[a]) abort('etiket BJCP\'de yok: ' + a); }));

// ── Korpusu tara ─────────────────────────────────────────────────────────
let hdr = null, ix = {}, n = 0, gecerli = 0, gristYok = 0;
const stil = new Map(); // ad -> { n, w[], ry[], o[], adj[], ozel[] }
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
    if (!(g('n_malt') > 0) && P_TUM.reduce((s, k) => s + g(k), 0) <= 0) { gristYok++; return; }
    let v = stil.get(ad);
    if (!v) { v = { n: 0, w: [], ry: [], o: [], adj: [], ozel: [] }; stil.set(ad, v); }
    v.n++;
    v.w.push(g('p_wheat')); v.ry.push(g('p_rye')); v.o.push(g('p_oats')); v.adj.push(g('p_corn') + g('p_rice'));
    // ÖZEL MALT sınıfı (BQ1 eşikleri BİREBİR; yalnız 'ekmeksi' fallback'i sonra ayrılır)
    const roast = g('p_roast'), choc = g('p_choc');
    let oz = '';
    if (roast + choc >= 3) oz = (choc > roast) ? 'cikolata' : 'kavrulmus';
    else if (g('p_smoked') > 5 || parseFloat(a[ix.k_smoke]) >= 1) oz = 'isli';
    else if (g('p_crystal') >= 8) oz = 'karamel';
    else if (g('p_munich') + g('p_vienna') + g('p_aromatic_abbey') >= 20) oz = 'tost';
    v.ozel.push(oz); // '' = özel malt eşiği geçilmedi
  })
  .on('close', bitir);

function med(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function baskin(say) {
  const e = Object.entries(say).sort((a, b) => b[1] - a[1]);
  if (!e.length) return null;
  const tot = e.reduce((s, x) => s + x[1], 0);
  return { sinif: e[0][0], pay: Math.round(+(e[0][1] / tot).toFixed(3) * 100), kapsam: tot };
}

function bitir() {
  console.log('\n== KORPUS ==');
  console.log('okunan=' + n + ' gecerli=' + gecerli + ' grist-YOK=' + gristYok +
    ' -> GRIST KAPSAMA %' + (100 * (gecerli - gristYok) / gecerli).toFixed(2));

  // ── 1. HER TAHIL İÇİN AYRI EŞİK SÜPÜRMESİ ─────────────────────────────
  console.log('\n== ESIK KALIBRASYONU (tahil basina, POZ gecmeli / NEG gecmemeli) ==');
  const ESIK = {};
  const BIRAK = [];
  Object.keys(ETIKET).forEach(sinif => {
    const alan = ALAN[sinif], E = ETIKET[sinif];
    // "stil bu tahılın stili mi": reçetelerinin çoğunluğu eşiği geçiyor mu
    const gecer = (ad, T) => {
      const v = stil.get(ad); if (!v) return null;
      let c = 0; for (let i = 0; i < v.n; i++) if (v[alan][i] >= T) c++;
      return c / v.n;
    };
    const band = [];
    for (let T = 1; T <= 60; T++) {
      const pozOk = E.poz.every(a => { const r = gecer(a, T); return r !== null && r > 0.5; });
      const negOk = E.neg.every(a => { const r = gecer(a, T); return r === null || r <= 0.5; });
      if (pozOk && negOk) band.push(T);
    }
    const pozMed = E.poz.map(a => { const v = stil.get(a); return a.split(' ')[0] + ':' + (v ? med(v[alan]).toFixed(1) : '-'); }).join(' ');
    const negMed = E.neg.slice(0, 5).map(a => { const v = stil.get(a); return a.split(' ')[0] + ':' + (v ? med(v[alan]).toFixed(1) : '-'); }).join(' ');
    console.log('  ' + sinif.toUpperCase());
    console.log('    POZ medyan: ' + pozMed);
    console.log('    NEG medyan: ' + negMed + ' ...');
    if (!band.length) {
      console.log('    -> GECERLI ESIK BANDI YOK (poz+neg birlikte saglanamadi) -> SINIF DUSURULUYOR');
      BIRAK.push(sinif);
      return;
    }
    const T = band[Math.floor(band.length / 2)];
    ESIK[sinif] = T;
    console.log('    -> gecerli band T=%' + band[0] + '..%' + band[band.length - 1] + ' (' + band.length + ' deger) ; SECILEN T=%' + T + ' (ortanca)');
  });
  if (BIRAK.length) console.log('  DUSURULEN SINIF(lar): ' + BIRAK.join(', ') + ' — korpus desteklemiyor, UYDURULMADI');
  if (!ESIK.bugday) abort('bugday esigi bulunamadi — sprintin cekirdegi');

  // ── 2. Tahıl sınıflandırıcı (oran = deger/esik; en yuksek oran kazanir) ─
  function TAHIL(w, ry, o, adj) {
    const c = [];
    if (ESIK.bugday && w >= ESIK.bugday) c.push(['bugday', w / ESIK.bugday]);
    if (ESIK.cavdar && ry >= ESIK.cavdar) c.push(['cavdar', ry / ESIK.cavdar]);
    if (ESIK.yulaf && o >= ESIK.yulaf) c.push(['yulaf', o / ESIK.yulaf]);
    if (ESIK.adjunct && adj >= ESIK.adjunct) c.push(['adjunct', adj / ESIK.adjunct]);
    if (!c.length) return 'arpa';
    c.sort((a, b) => b[1] - a[1]);
    return c[0][0];
  }

  // ── 3. Stil bazında tahıl + YENİ malt karakteri ────────────────────────
  // MALT DEĞİŞİKLİĞİ (BS2/(d)) — MÜMKÜN OLAN EN DAR KURAL:
  // Reçete düzeyi BQ1 ile BİREBİR AYNI kalır ('ekmeksi' herkese fallback).
  // Ayrım STİL düzeyinde yapılır: bir stilin baskın malt sınıfı 'ekmeksi' İSE
  // ve baskın tahılı 'arpa' DEĞİLSE, o stilin malt karakteri YOK sayılır —
  // çünkü onu tanımlayan şey özel malt değil TAHIL'dır (tahıl ekseni söylüyor).
  // Böylece "ekmeksi" seçilince buğday birası GELMEZ (Kaan'ın istediği ayrım)
  // ve arpa tabanlı hiçbir stil ETKİLENMEZ (yan etki yok — ABORT kapısıyla kanıtlı).
  // İLK DENENEN kural (reçete düzeyinde oy vermeme) REDDEDİLDİ: tahılı karışık
  // stillerde (Oud Bruin, Mixed Fermentation Sour) oy dağılımını kaydırıp ARPA
  // tabanlı stillerin sınıfını da değiştiriyordu — ölçüldü, kapı yakaladı.
  const TAHIL_STIL = {}, MALT_STIL = {};
  stil.forEach((v, ad) => {
    const tSay = {}, mSay = {};
    for (let i = 0; i < v.n; i++) {
      const t = TAHIL(v.w[i], v.ry[i], v.o[i], v.adj[i]);
      tSay[t] = (tSay[t] || 0) + 1;
      const m = v.ozel[i] || 'ekmeksi';   // BQ1 ile BİREBİR
      mSay[m] = (mSay[m] || 0) + 1;
    }
    const bt = baskin(tSay); TAHIL_STIL[ad] = bt ? [bt.sinif, bt.pay] : null;
    const bm = baskin(mSay);
    const tahilSinif = bt ? bt.sinif : 'arpa';
    MALT_STIL[ad] = (bm && !(bm.sinif === 'ekmeksi' && tahilSinif !== 'arpa')) ? [bm.sinif, bm.pay] : null;
  });

  console.log('\n== TAHIL: STIL BAZINDA BASKIN SINIF ==');
  const sinifSay = {};
  STILAD.forEach(a => { const t = TAHIL_STIL[a]; if (t) sinifSay[t[0]] = (sinifSay[t[0]] || 0) + 1; });
  console.log('  matris stili: ' + STILAD.length + ' ; siniflanan: ' + STILAD.filter(a => TAHIL_STIL[a]).length +
    ' ; dagilim: ' + JSON.stringify(sinifSay));
  console.log('  ARPA DISI stiller:');
  STILAD.filter(a => TAHIL_STIL[a] && TAHIL_STIL[a][0] !== 'arpa')
    .map(a => [a, TAHIL_STIL[a][0], TAHIL_STIL[a][1], stil.get(a).n, med(stil.get(a).w), med(stil.get(a).ry), med(stil.get(a).o)])
    .sort((a, b) => b[3] - a[3])
    .forEach(x => console.log('    ' + x[0].padEnd(38) + x[1].padEnd(8) + '%' + String(x[2]).padStart(3) +
      '  n=' + String(x[3]).padStart(6) + '  medyan w/ry/o = ' + x[4].toFixed(1) + '/' + x[5].toFixed(1) + '/' + x[6].toFixed(1)));

  console.log('\n  KONTROL (kalibrasyon etiketleri):');
  let kotu = 0;
  Object.keys(ETIKET).forEach(sinif => {
    if (BIRAK.indexOf(sinif) >= 0) return;
    ETIKET[sinif].poz.forEach(ad => {
      const t = TAHIL_STIL[ad], ok = t && t[0] === sinif;
      if (!ok) kotu++;
      console.log('    ' + (ok ? 'PASS' : 'FAIL') + ' POZ ' + ad.padEnd(38) + (t ? t[0] + ' %' + t[1] : 'YOK'));
    });
    ETIKET[sinif].neg.forEach(ad => {
      const t = TAHIL_STIL[ad], ok = !t || t[0] !== sinif;
      if (!ok) kotu++;
      console.log('    ' + (ok ? 'PASS' : 'FAIL') + ' NEG ' + ad.padEnd(38) + (t ? t[0] + ' %' + t[1] : 'YOK') + ' (≠' + sinif + ')');
    });
  });
  if (kotu) abort(kotu + ' kalibrasyon kontrolu FAIL');

  // ── 4. Malt karakteri: ne değişti? ────────────────────────────────────
  console.log('\n== MALT KARAKTERI: BQ1 -> BS DEGISIMI ==');
  const degisen = [], ayni = [];
  STILAD.forEach(ad => {
    const eski = KAR0[ad] ? KAR0[ad][2] : null;
    const yeni = MALT_STIL[ad] ? MALT_STIL[ad][0] : null;
    if (eski !== yeni) degisen.push([ad, eski, yeni, TAHIL_STIL[ad] ? TAHIL_STIL[ad][0] : '-', stil.get(ad) ? stil.get(ad).n : 0]);
    else ayni.push(ad);
  });
  console.log('  DEGISMEYEN: ' + ayni.length + '/' + STILAD.length);
  console.log('  DEGISEN: ' + degisen.length);
  degisen.sort((a, b) => b[4] - a[4]).forEach(x =>
    console.log('    ' + x[0].padEnd(38) + (x[1] || 'null') + ' -> ' + (x[2] || 'YOK') + '   (tahil: ' + x[3] + ', n=' + x[4] + ')'));
  // KAPI: DEGISEN kume TAM OLARAK {malt=='ekmeksi' && tahil!='arpa'} olmali.
  // Baska tek bir stil bile degisirse kural yan etki uretiyor demektir -> ABORT.
  const beklenen = STILAD.filter(a => KAR0[a] && KAR0[a][2] === 'ekmeksi' && TAHIL_STIL[a] && TAHIL_STIL[a][0] !== 'arpa');
  const fazla = degisen.filter(x => beklenen.indexOf(x[0]) < 0);
  const eksik = beklenen.filter(a => !degisen.some(x => x[0] === a));
  console.log('  beklenen degisim kumesi (ekmeksi + tahil!=arpa): ' + beklenen.length);
  if (fazla.length) { fazla.forEach(x => console.log('     FAZLA: ' + x[0] + ': ' + x[1] + ' -> ' + x[2] + ' (tahil ' + x[3] + ')')); abort('kural YAN ETKI uretti'); }
  if (eksik.length) { console.log('     EKSIK: ' + eksik.join(', ')); abort('beklenen degisim gerceklesmedi'); }
  const yeniNull = degisen.filter(x => x[2] === null || x[2] === undefined);
  if (yeniNull.length !== degisen.length) abort('degisen stillerin hepsi YOK olmaliydi');
  // 'ekmeksi' seçilince buğday birası gelmemeli
  const ekmeksiKalan = STILAD.filter(a => MALT_STIL[a] && MALT_STIL[a][0] === 'ekmeksi');
  const sizinti = ekmeksiKalan.filter(a => TAHIL_STIL[a] && TAHIL_STIL[a][0] !== 'arpa');
  console.log('  ekmeksi sinifinda kalan stil: ' + ekmeksiKalan.length + ' ; bunlardan tahil-gudumlu olan: ' + sizinti.length);
  if (sizinti.length) abort('ekmeksi sinifinda tahil-gudumlu stil kaldi: ' + sizinti.join(', '));

  // ── 5. İSLİ verisi yeterli mi ─────────────────────────────────────────
  const isliStil = STILAD.filter(a => MALT_STIL[a] && MALT_STIL[a][0] === 'isli');
  console.log('\n== ISLI (rauch/smoked) ==');
  console.log('  baskin sinifi isli olan stil: ' + isliStil.length + ' -> ' + (isliStil.join(' · ') || 'YOK'));
  isliStil.forEach(a => console.log('    ' + a.padEnd(38) + 'baskinlik %' + MALT_STIL[a][1] + ' , korpus n=' + stil.get(a).n));

  // ── 6. Ayırt edicilik ─────────────────────────────────────────────────
  let tAyiran = 0, mAyiran = 0;
  Object.keys(PS).forEach(k => {
    const st = new Set(), sm = new Set();
    PS[k][1].forEach(x => { if (TAHIL_STIL[x[0]]) st.add(TAHIL_STIL[x[0]][0]); if (MALT_STIL[x[0]]) sm.add(MALT_STIL[x[0]][0]); });
    if (st.size >= 2) tAyiran++;
    if (sm.size >= 2) mAyiran++;
  });
  console.log('\n== AYIRT EDICILIK (60 kova top-6) ==');
  console.log('  tahil >=2 sinif ayiran kova: ' + tAyiran + '/60');
  console.log('  malt  >=2 sinif ayiran kova: ' + mAyiran + '/60  (BQ1 olcumu 46/60)');

  // ── 7. Tablo üret: [maya, mayaPay, malt, maltPay, tahil, tahilPay] ────
  // maya sutunu BQ1'den AYNEN tasinir (BS3: yeniden turetilmez).
  const KAR = {};
  let mayaKayip = 0;
  STILAD.forEach(ad => {
    const k0 = KAR0[ad]; if (!k0) { mayaKayip++; return; }
    const m = MALT_STIL[ad], t = TAHIL_STIL[ad];
    KAR[ad] = [k0[0], k0[1], m ? m[0] : '', m ? m[1] : 0, t ? t[0] : '', t ? t[1] : 0];
  });
  if (mayaKayip) abort('maya sutunu tasinamadi: ' + mayaKayip + ' stil');
  let mayaFark = 0;
  Object.keys(KAR).forEach(a => { if (KAR[a][0] !== KAR0[a][0] || KAR[a][1] !== KAR0[a][1]) mayaFark++; });
  if (mayaFark) abort('MAYA sutunu degisti (' + mayaFark + ') — BS3 ihlali');
  console.log('\n[kapi] maya sutunu 73/73 AYNEN tasindi (BS3: BQ1 altyapisi korunur)');

  const satir = Object.keys(KAR).sort().map(a =>
    '  "' + a.replace(/"/g, '\\"') + '":["' + KAR[a][0] + '",' + KAR[a][1] + ',"' + KAR[a][2] + '",' + KAR[a][3] + ',"' + KAR[a][4] + '",' + KAR[a][5] + ']');
  const js = '// ESIKLER (kalibre): ' + JSON.stringify(ESIK) + (BIRAK.length ? ' ; DUSURULEN: ' + BIRAK.join(',') : '') + '\n' +
    'window._PROFIL_KARAKTER = {\n' + satir.join(',\n') + '\n};\n';
  const cikti = process.argv[2] || path.join(KOK, '_bs_karakter_out.js');
  fs.writeFileSync(cikti, js, 'utf8');
  console.log('[yaz] ' + cikti + ' — ' + js.length + ' bayt, ' + satir.length + ' stil, esikler ' + JSON.stringify(ESIK));
}
