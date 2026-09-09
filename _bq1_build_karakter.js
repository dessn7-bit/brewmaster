// ═══ SPRINT BQ1 — PROFİL SEÇİCİ KADEMELİ FİLTRE: KARAKTER TABLOSU ÜRETİCİSİ ═══
//
// NE YAPAR: Korpustan (working/_compact3.tsv, 376.809 reçete) her BJCP stili için
//   (a) MAYA KARAKTERİ  (temiz · esterli · fenolik · ekşi)
//   (b) MALT KARAKTERİ  (ekmeksi · tost · karamel · kavrulmuş · çikolata · isli)
// türetir ve HTML'e gömülecek STATİK tabloyu üretir. Runtime'da korpus YOK.
//
// SINIFLANDIRICILAR UYDURULMADI — Sprint BQ keşfinde ölçülmüş+doğrulanmış
// sürümlerin BİREBİR kopyası (working/_bq_sinif_maya.js, working/_bq_sinif_malt.js);
// dosyalar varsa metin karşılaştırmasıyla sürüklenme kontrol edilir (ABORT).
//   maya  : 18 yeast_* bayrağı + raw.yeast metni regex kurtarması (BQ Eksen 2)
//   malt  : kavrulmuş = p_roast+p_choc ≥ 3 · isli = p_smoked>5 veya k_smoke≥1 ·
//           karamel = p_crystal ≥ 8 · tost = p_munich+p_vienna+p_aromatic_abbey ≥ 20 ·
//           ekmeksi = kalan; ÖNCELİK kav > isli > kar > tost   (BQ wf1 ölçümü)
//           çikolata = 'kavrulmuş' içinde p_choc > p_roast olanlar (yeni EŞİK YOK,
//           yalnız iki mevcut sütunun hangisinin baskın olduğu)
//
// TABAN TABLOYA (window._PROFIL_STIL, 60 kova) DOKUNULMAZ — kova yeniden
// üretilmez, toplamlar değişmez (AK1/AM1/AM2/AV1 kilitleri kırılmaz). Kademeli
// filtre kovayı BÖLMEZ; sonuç LİSTESİNİ süzer.
//
// Kullanım: node _bq1_build_karakter.js [--json cikti.json]
'use strict';
const fs = require('fs'), path = require('path'), readline = require('readline'), vm = require('vm');

const KOK = __dirname;
const W = path.join(KOK, 'working');
const TSV = path.join(W, '_compact3.tsv');
const SLUG = path.join(W, 'slug2bjcp.json');
const HTML = path.join(KOK, 'Brewmaster_v2_79_10.html');

function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
if (!fs.existsSync(TSV)) abort('korpus yok: ' + TSV);
if (!fs.existsSync(SLUG)) abort('slug2bjcp yok: ' + SLUG);

// ── 0. Canlı HTML'den otorite tabloları dilimle (V1b/AM deseni) ────────────
const html = fs.readFileSync(HTML, 'utf8');
function dilim(re) { const m = html.match(re); if (!m) abort('dilim yok: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(dilim(/const BJCP = \{[\s\S]*?\n\};/).replace('const ', '') + '\n' +
  dilim(/window\._PROFIL_STIL = \{[\s\S]*?\n\};/), ctx);
const BJCP = ctx.BJCP, PROFIL = ctx.window._PROFIL_STIL;
if (!BJCP || !PROFIL) abort('BJCP / _PROFIL_STIL dilimlenemedi');
if (Object.keys(PROFIL).length !== 60) abort('taban tablo 60 kova değil: ' + Object.keys(PROFIL).length);
const TABLO_STIL = new Set(); // taban tabloda geçen stiller (48 bekleniyor)
Object.keys(PROFIL).forEach(k => PROFIL[k][1].forEach(x => TABLO_STIL.add(x[0])));
console.log('[dilim] BJCP=' + Object.keys(BJCP).length + ' kova=' + Object.keys(PROFIL).length +
  ' tabloda-stil=' + TABLO_STIL.size);

// ── 1. Sınıflandırıcılar (BQ keşfinin doğrulanmış sürümleri, BİREBİR) ──────
function MAYA(r) {
  var f = function (k) { return r[k] === '1'; };
  var s = (r.yeast_str || '').toLowerCase();
  var realWild = /brett|brux|lambic|wild|funk|\bsour\b|trois|claus|anomal|lacto|pedio|bacteria|roeselare|flemish|blend|wlp6\d\d|\b644\b|\b(3110|3278|5112|5151|5526|5335|5733)\b/.test(s);
  var brettOK = f('y_brett') && !(/hothead|saisonstein|oyl-057|oyl-500/.test(s) && !realWild);
  if (brettOK || f('y_lacto') || f('y_sour_blend') || f('is_mixed_fermentation') || f('has_brett') || f('has_lacto') || f('has_pedio')) return 'eksi';
  var wheatPhen = f('y_wheat_german') && !/american wheat|\b1010\b|wlp320/.test(s);
  if (f('y_belgian') || f('y_abbey') || f('y_saison') || f('y_witbier') || f('y_wit') || wheatPhen) return 'fenolik';
  var engFalse = (f('y_kolsch') && /k.lsch|kolsch/.test(s)) || /bry-?\s?97/.test(s);
  if (f('y_english') && !engFalse) return 'esterli';
  if (f('y_american') || f('y_german_lager') || f('y_czech_lager') || f('y_american_lager') || f('y_kolsch') || f('y_altbier') || f('y_cal_common') || f('y_kveik') || f('y_wheat_german') || engFalse) return 'temiz';
  if (!s) return null;
  if (/brett|lacto|pedio|\bsour\b|lambic|roeselare|\bwild\b|funk|bacteria|kombucha|philly sour|bruxell/.test(s)) return 'eksi';
  if (/belgi|abbey|trappist|saison|farmhouse|monk|schelde|t-58|t58|\bwit\b|witbier|weizen|weiss|hefe|wheat|wb-06|wb06|biere de garde|\b(3944|3522|3787|1214|1762|3711|3724|3726|3068|3638|3333|3864|3538|3942|3463|3739)\b|wlp(400|410|500|510|515|530|540|545|550|565|566|568|570|575|590|300|351|380)/.test(s)) return 'fenolik';
  if (/lager|pils|bock|marzen|m.rzen|helles|kolsch|k.lsch|k-97|k97|german ale|\balt\b|altbier|kveik|voss|hornindal|hothead|lutra|w-34|34\/70|s-23|s-189|\b(2124|2278|2308|2206|2007|2035|2042|2112|2565|1007|2001|2000)\b|wlp0(29|36|80)|wlp(8|9)\d\d|american wheat|us-05|us05|1056|wlp001|chico|california ale|bry-?\s?97|1272|wlp051|west coast|american ale|safale american|workhorse|\bm42\b|\bm44\b|\bm10\b|a07 flagship|a01 house|a09 pub|a10 darkness|a20 citrus|a15 independence|\bclean\b|neutral/.test(s)) return 'temiz';
  if (/english|london|british|nottingham|windsor|s-04|s04|\besb\b|burton|yorkshire|whitbread|irish|scottish|edinburgh|newcastle|manchester|essex|thames|ringwood|fuller|vermont|conan|verdant|barbarian|juice|\bfog\b|dark ale|liberty bell|\bm36\b|\bm15\b|\bm07\b|\bm79\b|\b(1028|1084|1098|1099|1187|1318|1335|1469|1728|1768|1968|1275|1332|1450|9097|9093)\b|wlp0(02|04|05|06|07|08|13|22|23|26|37|39|41|45|085|095|099)|a04|a24|a38|a09|new england|northeast/.test(s)) return 'esterli';
  return null;
}
// 5-sınıf malt (BQ wf1 ölçülmüş eşikleri) + kavrulmuş içi roast/choc ayrımı
// DÜRÜSTLÜK: keşif sürümü HİÇ null dönmüyordu — 'ekmeksi' catch-all olduğu için
// grist verisi HİÇ OLMAYAN kayıt da 'ekmeksi' sayılıyordu (%100 "kapsama" yanıltıcı).
// Burada grist tamamen boşsa null döner (ölçüldü: 336.241 geçerli kayıtta 5 adet).
const P_TUM = ['p_crystal', 'p_wheat', 'p_oats', 'p_roast', 'p_choc', 'p_sugar', 'p_munich', 'p_vienna',
  'p_pilsner', 'p_pale_ale', 'p_rye', 'p_corn', 'p_rice', 'p_smoked', 'p_aromatic_abbey', 'p_sixrow', 'p_other'];
function MALT(g, r) {
  if (!(g('n_malt') > 0) && P_TUM.reduce((s, k) => s + g(k), 0) <= 0) return null; // grist YOK → uydurma yapma
  const roast = g('p_roast'), choc = g('p_choc');
  if (roast + choc >= 3) return choc > roast ? 'cikolata' : 'kavrulmus';
  if (g('p_smoked') > 5 || parseFloat(r.k_smoke) >= 1) return 'isli';
  if (g('p_crystal') >= 8) return 'karamel';
  if (g('p_munich') + g('p_vienna') + g('p_aromatic_abbey') >= 20) return 'tost';
  return 'ekmeksi';
}

// Sürüklenme kontrolü: keşif dosyaları duruyorsa regex gövdeleri aynı mı?
(function suruklenme() {
  const f = path.join(W, '_bq_sinif_maya.js');
  if (!fs.existsSync(f)) { console.log('[surukle] working/_bq_sinif_maya.js yok — karşılaştırma atlandı'); return; }
  const kaynak = fs.readFileSync(f, 'utf8');
  const benim = MAYA.toString();
  const imza = s => (s.match(/\/[^\n]*?\/\.test\(s\)/g) || []).map(x => x.replace(/\s+/g, ''));
  const a = imza(kaynak), b = imza(benim);
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) abort('MAYA sınıflandırıcısı keşif sürümünden SÜRÜKLENMİŞ (' + a.length + ' vs ' + b.length + ')');
  console.log('[surukle] MAYA sınıflandırıcı keşif sürümüyle birebir (' + a.length + ' regex)');
})();

// ── 2. Taban kova tanımı — _bq_taban_kontrol.js / AK ile BİREBİR ──────────
const M = JSON.parse(fs.readFileSync(SLUG, 'utf8'));
const KATCH = new Set(M.katchall);
const RENK = s => s <= 6 ? 'acik' : s <= 12 ? 'altin' : s <= 20 ? 'amber' : s <= 35 ? 'koyu' : 'cokkoyu';
const ACI = (og, ibu) => { const b = ibu / (1000 * (og - 1)); return b < 0.35 ? 'malt' : b < 0.6 ? 'dengeli' : b < 0.9 ? 'hop' : 'cokaci'; };
const GOV = (g) => { const s = g('p_crystal') + g('p_oats') * 0.8 + g('p_wheat') * 0.5 + g('p_rye') * 0.5 - g('p_sugar') * 1.2; return s < 2 ? 'ince' : s < 8 ? 'orta' : 'dolgun'; };

// ── 3. Korpusu tara ───────────────────────────────────────────────────────
let hdr = null, ix = {}, n = 0, gecerli = 0, katch = 0, esl = 0, atl = 0;
let mayaNull = 0, maltNull = 0;
const stilM = new Map();   // ad -> {maya:{sinif:n}, malt:{sinif:n}, top, mayaBilinen, maltBilinen}
const kovaM = new Map();   // kovaKey -> {maya:{}, malt:{}, top}
const kovaStil = new Map();// kovaKey|ad -> {maya:{}, malt:{}, top}
const mayaGlobal = {}, maltGlobal = {};

function say(o, k) { o[k] = (o[k] || 0) + 1; }
function stilKaydi(ad) {
  let v = stilM.get(ad);
  if (!v) { v = { maya: {}, malt: {}, top: 0 }; stilM.set(ad, v); }
  return v;
}

readline.createInterface({ input: fs.createReadStream(TSV) })
  .on('line', l => {
    const a = l.split('\t');
    if (!hdr) { hdr = a; hdr.forEach((h, i) => ix[h] = i); return; }
    n++;
    const g = k => { const v = parseFloat(a[ix[k]]); return isFinite(v) ? v : 0; };
    const og = g('og'), slug = a[ix.slug];
    if (og < 1.005 || !slug) { atl++; return; }
    if (KATCH.has(slug)) { katch++; return; }
    const ad = M.slug2bjcp[slug]; if (!ad) { esl++; return; }
    gecerli++;

    const r = {}; for (const k of ['yeast_str', 'k_smoke']) r[k] = a[ix[k]];
    for (const k of hdr) if (k.charAt(0) === 'y' && k.charAt(1) === '_') r[k] = a[ix[k]];
    for (const k of ['is_mixed_fermentation', 'has_brett', 'has_lacto', 'has_pedio']) r[k] = a[ix[k]];

    const my = MAYA(r), ml = MALT(g, r);
    if (my == null) mayaNull++; else say(mayaGlobal, my);
    if (ml == null) maltNull++; else say(maltGlobal, ml);

    const sv = stilKaydi(ad); sv.top++;
    if (my) say(sv.maya, my);
    if (ml) say(sv.malt, ml);

    const key = RENK(g('srm')) + '|' + ACI(og, g('ibu')) + '|' + GOV(g);
    let kv = kovaM.get(key); if (!kv) { kv = { maya: {}, malt: {}, top: 0 }; kovaM.set(key, kv); }
    kv.top++; if (my) say(kv.maya, my); if (ml) say(kv.malt, ml);
    const kk = key + '' + ad;
    let ks = kovaStil.get(kk); if (!ks) { ks = { maya: {}, malt: {}, top: 0 }; kovaStil.set(kk, ks); }
    ks.top++; if (my) say(ks.maya, my); if (ml) say(ks.malt, ml);
  })
  .on('close', bitir);

function pay(o) { const t = Object.values(o).reduce((a, b) => a + b, 0); return t; }
function baskin(o) {
  const e = Object.entries(o).sort((a, b) => b[1] - a[1]);
  if (!e.length) return null;
  const t = pay(o);
  return { sinif: e[0][0], n: e[0][1], pay: e[0][1] / t, ikinci: e[1] ? e[1][0] : null, ikinciPay: e[1] ? e[1][1] / t : 0, siniflanan: t };
}

function bitir() {
  console.log('\n══ KAPSAMA (korpus düzeyi) ══');
  console.log('okunan=' + n + ' geçerli=' + gecerli + ' katchall=' + katch + ' eşleşmeyen=' + esl + ' atlanan=' + atl);
  const mk = 100 * (gecerli - mayaNull) / gecerli, ml = 100 * (gecerli - maltNull) / gecerli;
  console.log('MAYA sınıflandı: ' + (gecerli - mayaNull) + '/' + gecerli + ' = %' + mk.toFixed(2) + '  (bilinmiyor ' + mayaNull + ')');
  console.log('MALT sınıflandı: ' + (gecerli - maltNull) + '/' + gecerli + ' = %' + ml.toFixed(2) + '  (bilinmiyor ' + maltNull + ')');
  const gp = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(x => x[0] + ' %' + (100 * x[1] / gecerli).toFixed(1)).join(' · ');
  console.log('maya dağılım: ' + gp(mayaGlobal));
  console.log('malt dağılım: ' + gp(maltGlobal));

  // ── Stil düzeyi baskın sınıf ──
  console.log('\n══ TABLO STİLLERİ (taban tabloda geçen ' + TABLO_STIL.size + ') ══');
  const kart = {};
  const satir = [];
  for (const ad of [...TABLO_STIL].sort()) {
    const v = stilM.get(ad);
    if (!v) { satir.push([ad, 'KORPUSTA YOK', '', 0]); continue; }
    const bm = baskin(v.maya), bl = baskin(v.malt);
    kart[ad] = {
      n: v.top,
      maya: bm ? bm.sinif : null, mayaPay: bm ? +bm.pay.toFixed(3) : 0,
      malt: bl ? bl.sinif : null, maltPay: bl ? +bl.pay.toFixed(3) : 0,
      mayaKapsam: bm ? +(bm.siniflanan / v.top).toFixed(3) : 0,
      mayaIkinci: bm ? bm.ikinci : null, mayaIkinciPay: bm ? +bm.ikinciPay.toFixed(3) : 0,
      maltIkinci: bl ? bl.ikinci : null, maltIkinciPay: bl ? +bl.ikinciPay.toFixed(3) : 0
    };
    satir.push([ad, (bm ? bm.sinif + ' %' + Math.round(bm.pay * 100) : '—'), (bl ? bl.sinif + ' %' + Math.round(bl.pay * 100) : '—'), v.top]);
  }
  satir.sort((a, b) => b[3] - a[3]).forEach(s => console.log('  ' + s[0].padEnd(38) + ' n=' + String(s[3]).padStart(6) + '  maya=' + s[1].padEnd(16) + ' malt=' + s[2]));

  // düşük güvenli olanlar
  const zayifM = satir.filter(s => { const k = kart[s[0]]; return k && k.mayaPay < 0.5; });
  const zayifL = satir.filter(s => { const k = kart[s[0]]; return k && k.maltPay < 0.5; });
  console.log('\nmaya baskınlığı <%50 olan stiller: ' + (zayifM.length ? zayifM.map(s => s[0] + '(' + s[1] + ')').join(' · ') : 'YOK'));
  console.log('malt baskınlığı <%50 olan stiller: ' + (zayifL.length ? zayifL.map(s => s[0] + '(' + s[1] + ')').join(' · ') : 'YOK'));

  // ── Kova düzeyinde AYIRT EDİCİLİK: her kovada kaç farklı sınıf var? ──
  console.log('\n══ FİLTRE AYIRT EDİCİLİĞİ (60 kova × top-6 liste) ══');
  let mayaAyiran = 0, maltAyiran = 0, hicAyirmayan = 0;
  const dagilim = { maya: {}, malt: {} };
  const bosKombin = [];
  const kovaRapor = [];
  for (const key of Object.keys(PROFIL)) {
    const liste = PROFIL[key][1];
    const my = new Set(), ml = new Set();
    liste.forEach(x => { const k = kart[x[0]]; if (k && k.maya) my.add(k.maya); if (k && k.malt) ml.add(k.malt); });
    say(dagilim.maya, my.size); say(dagilim.malt, ml.size);
    if (my.size >= 2) mayaAyiran++;
    if (ml.size >= 2) maltAyiran++;
    if (my.size < 2 && ml.size < 2) hicAyirmayan++;
    kovaRapor.push({ key, maya: [...my], malt: [...ml] });
    // boş kesişim arayışı (test (d) için)
    for (const a of my) for (const b of ml) {
      if (!liste.some(x => { const k = kart[x[0]]; return k && k.maya === a && k.malt === b; })) bosKombin.push(key + ' :: ' + a + ' × ' + b);
    }
  }
  console.log('maya ≥2 sınıf ayıran kova: ' + mayaAyiran + '/60 · malt ≥2 sınıf ayıran kova: ' + maltAyiran + '/60 · hiçbiri ayırmıyor: ' + hicAyirmayan);
  console.log('kovadaki farklı maya sınıfı sayısı dağılımı: ' + JSON.stringify(dagilim.maya));
  console.log('kovadaki farklı malt sınıfı sayısı dağılımı: ' + JSON.stringify(dagilim.malt));
  console.log('boş kesişim (maya×malt) örnekleri: ' + bosKombin.length + ' adet' + (bosKombin.length ? ' — ilk 3: ' + bosKombin.slice(0, 3).join(' | ') : ''));

  // Kaan'ın kovası
  ['amber|malt|dolgun', 'acik|malt|dolgun', 'altin|malt|ince', 'koyu|dengeli|dolgun'].forEach(key => {
    console.log('\n[' + key + ']');
    PROFIL[key][1].forEach(x => {
      const k = kart[x[0]];
      console.log('   ' + x[0].padEnd(38) + ' n=' + String(x[1]).padStart(5) + '  maya=' + (k ? k.maya + '(%' + Math.round(k.mayaPay * 100) + ')' : '—').padEnd(18) + ' malt=' + (k ? k.malt + '(%' + Math.round(k.maltPay * 100) + ')' : '—'));
    });
  });

  // ── tost'un katkısı: tost sınıfı olmadan kaç kova ayrımı kaybolur? ──
  let maltAyiranTostsuz = 0;
  for (const key of Object.keys(PROFIL)) {
    const s = new Set();
    PROFIL[key][1].forEach(x => { const k = kart[x[0]]; if (k && k.malt) s.add(k.malt === 'tost' ? 'ekmeksi' : k.malt); });
    if (s.size >= 2) maltAyiranTostsuz++;
  }
  console.log('\n[tost testi] malt ayıran kova: tost SINIFIYLA ' + maltAyiran + '/60 · tost EKMEKSİYE katılırsa ' + maltAyiranTostsuz + '/60');
  const tostStil = Object.keys(kart).filter(a => kart[a].malt === 'tost');
  console.log('[tost testi] baskın sınıfı tost olan tablo stilleri: ' + (tostStil.join(' · ') || 'YOK'));
  const isliStil = Object.keys(kart).filter(a => kart[a].malt === 'isli');
  console.log('[isli testi] baskın sınıfı isli olan tablo stilleri: ' + (isliStil.join(' · ') || 'YOK'));
  const cikStil = Object.keys(kart).filter(a => kart[a].malt === 'cikolata');
  console.log('[çikolata testi] baskın sınıfı çikolata olan tablo stilleri: ' + (cikStil.join(' · ') || 'YOK'));

  // ── FİLTRE ETKİSİ: tek çip seçilince liste kaç stile iner? ──
  console.log('\n══ FİLTRE ETKİSİ (tek çip → kalan stil sayısı) ══');
  let topluMaya = [], topluMalt = [];
  for (const key of Object.keys(PROFIL)) {
    const liste = PROFIL[key][1];
    const myS = new Set(), mlS = new Set();
    liste.forEach(x => { const k = kart[x[0]]; if (k) { myS.add(k.maya); mlS.add(k.malt); } });
    myS.forEach(c => topluMaya.push(liste.filter(x => kart[x[0]] && kart[x[0]].maya === c).length));
    mlS.forEach(c => topluMalt.push(liste.filter(x => kart[x[0]] && kart[x[0]].malt === c).length));
  }
  const ort = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  console.log('maya çipi: ' + topluMaya.length + ' (kova×sınıf) kombinasyon, ortalama kalan stil ' + ort(topluMaya) + '/6 · tek stile inen ' + topluMaya.filter(x => x === 1).length);
  console.log('malt çipi: ' + topluMalt.length + ' (kova×sınıf) kombinasyon, ortalama kalan stil ' + ort(topluMalt) + '/6 · tek stile inen ' + topluMalt.filter(x => x === 1).length);

  // ── ABORT KAPILARI ────────────────────────────────────────────────────
  const eksikK = [...TABLO_STIL].filter(a => !kart[a] || !kart[a].maya || !kart[a].malt);
  if (eksikK.length) abort('tablo stillerinin ' + eksikK.length + ' tanesi sınıflanamadı: ' + eksikK.join(' · '));
  const disari = Object.keys(kart).filter(a => !TABLO_STIL.has(a));
  if (disari.length) abort('karakter tablosunda taban tabloda OLMAYAN stil var: ' + disari.join(' · '));
  const bozukAd = Object.keys(kart).filter(a => !BJCP[a]);
  if (bozukAd.length) abort('BJCP anahtarında olmayan ad: ' + bozukAd.join(' · '));
  console.log('\n[kapı] ' + Object.keys(kart).length + ' stilin hepsi sınıflandı · hepsi BJCP\'de · taban tablo dışı ad YOK');

  // ── HTML'e gömülecek statik tablo ─────────────────────────────────────
  const adlar = Object.keys(kart).sort();
  const satirlarJS = adlar.map(a => {
    const k = kart[a];
    return '  ' + JSON.stringify(a) + ':["' + k.maya + '",' + Math.round(k.mayaPay * 100) + ',"' + k.malt + '",' + Math.round(k.maltPay * 100) + ']';
  }).join(',\n');
  const blok = 'window._PROFIL_KARAKTER = {\n' + satirlarJS + '\n};\n';
  const bDosya = path.join(W, '_bq1_karakter_tablo.js');
  fs.writeFileSync(bDosya, blok);
  console.log('[tablo] ' + bDosya + ' — ' + adlar.length + ' stil, ' + (Buffer.byteLength(blok, 'utf8') / 1024).toFixed(1) + ' KB');

  const ciktiDosya = process.argv.indexOf('--json') >= 0 ? process.argv[process.argv.indexOf('--json') + 1] : path.join(W, '_bq1_karakter.json');
  fs.writeFileSync(ciktiDosya, JSON.stringify({
    uretim: new Date().toISOString().slice(0, 10), gecerli, mayaKapsam: +mk.toFixed(2), maltKapsam: +ml.toFixed(2),
    mayaGlobal, maltGlobal, kart, kovaRapor, bosKombin: bosKombin.slice(0, 40)
  }, null, 1));
  console.log('\n[yaz] ' + ciktiDosya + ' (' + (fs.statSync(ciktiDosya).size / 1024).toFixed(1) + ' KB)');
}
