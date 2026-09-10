// ═══ SPRINT BR — TAM KOVA MATRİSİ + GENİŞLETİLMİŞ KARAKTER TABLOSU ═══════════
//
// NEDEN: BR "bira tarif et" ekranında 5 eksenin HEPSİ İSTEĞE BAĞLI. Kullanıcı
// yalnız "koyu" seçtiğinde 12 kova birleşmeli. Mevcut _PROFIL_STIL her kovada
// yalnız TOP-6 tutuyor; top-6 listelerini toplamak YANLIŞ olurdu (her kovada
// 7. sırada olan bir stil hiç görünmez, sayılar da eksik çıkar). Bu yüzden
// burada kova × stil TAM matrisi (kırpma YOK) üretilir; kısmî seçim toplaması
// artık KESİN.
//
// TABAN TABLOYA (_PROFIL_STIL) DOKUNULMAZ. Bu betik onu yeniden üretmez, yalnız
// DOĞRULAR: tam matrise AK/AM'in kendi algoritması (MIN_N=25, MIN_PAY=1.5%,
// sıralama n×(iskelet?1.35:1), top-6) uygulanınca 60 kovanın top-6 AD+SIRA
// listesi birebir çıkmalı. Çıkmazsa ABORT (matris tabanla çelişiyor demektir).
//
// AYRICA: _PROFIL_KARAKTER 48 stille sınırlıydı (yalnız top-6'da görünenler).
// Tam matriste daha fazla stil var → karakter süzgeci onları "sınıfsız"
// bırakırdı. Karakter tablosu BQ1'in BİREBİR AYNI sınıflandırıcılarıyla tüm
// stiller için yeniden üretilir; mevcut 48 girişin DEĞİŞMEDİĞİ doğrulanır (ABORT).
//
// Kullanım: node _br_build_kova.js [cikti.js]
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

// ── 0. Canlı HTML'den otorite tabloları dilimle ───────────────────────────
const html = fs.readFileSync(HTML, 'utf8');
function dilim(re) { const m = html.match(re); if (!m) abort('dilim yok: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(
  dilim(/const BJCP = \{[\s\S]*?\n\};/).replace('const ', '') + '\n' +
  dilim(/const STIL_ISKELET = \{[\s\S]*?\n\};/).replace('const ', '') + '\n' +
  dilim(/window\._PROFIL_STIL = \{[\s\S]*?\n\};/) + '\n' +
  dilim(/window\._PROFIL_KARAKTER = \{[\s\S]*?\n\};/), ctx);
const BJCP = ctx.BJCP, ISK = ctx.STIL_ISKELET, PROFIL = ctx.window._PROFIL_STIL, KAR0 = ctx.window._PROFIL_KARAKTER;
if (Object.keys(PROFIL).length !== 60) abort('taban tablo 60 kova değil');
console.log('[dilim] BJCP=' + Object.keys(BJCP).length + ' ISKELET=' + Object.keys(ISK).length +
  ' kova=' + Object.keys(PROFIL).length + ' karakter=' + Object.keys(KAR0).length);

// ── 1. Sınıflandırıcılar — BQ1 (_bq1_build_karakter.js) ile BİREBİR ───────
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
const P_TUM = ['p_crystal', 'p_wheat', 'p_oats', 'p_roast', 'p_choc', 'p_sugar', 'p_munich', 'p_vienna',
  'p_pilsner', 'p_pale_ale', 'p_rye', 'p_corn', 'p_rice', 'p_smoked', 'p_aromatic_abbey', 'p_sixrow', 'p_other'];
function MALT(g, r) {
  if (!(g('n_malt') > 0) && P_TUM.reduce((s, k) => s + g(k), 0) <= 0) return null;
  const roast = g('p_roast'), choc = g('p_choc');
  if (roast + choc >= 3) return choc > roast ? 'cikolata' : 'kavrulmus';
  if (g('p_smoked') > 5 || parseFloat(r.k_smoke) >= 1) return 'isli';
  if (g('p_crystal') >= 8) return 'karamel';
  if (g('p_munich') + g('p_vienna') + g('p_aromatic_abbey') >= 20) return 'tost';
  return 'ekmeksi';
}
// Sürüklenme kapısı — BQ1 betiğinin kendi MAYA gövdesiyle karşılaştır
(function surukle() {
  const f = path.join(KOK, '_bq1_build_karakter.js');
  if (!fs.existsSync(f)) abort('_bq1_build_karakter.js yok — sınıflandırıcı karşılaştırılamıyor');
  const kaynak = fs.readFileSync(f, 'utf8');
  const imza = s => (s.match(/\/[^\n]*?\/\.test\(s\)/g) || []).map(x => x.replace(/\s+/g, ''));
  const a = imza(kaynak.slice(kaynak.indexOf('function MAYA'), kaynak.indexOf('const P_TUM'))), b = imza(MAYA.toString());
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) abort('MAYA siniflandirici BQ1 surumunden SURUKLENMIS (' + a.length + ' vs ' + b.length + ')');
  console.log('[surukle] MAYA siniflandirici BQ1 ile birebir (' + a.length + ' regex)');
})();

// ── 2. Eksen tanımları — AK/AM/BQ1 ile BİREBİR ────────────────────────────
const M = JSON.parse(fs.readFileSync(SLUG, 'utf8'));
const KATCH = new Set(M.katchall);
const RENK_S = ['acik', 'altin', 'amber', 'koyu', 'cokkoyu'];
const ACI_S = ['malt', 'dengeli', 'hop', 'cokaci'];
const GOV_S = ['ince', 'orta', 'dolgun'];
const RENK = s => s <= 6 ? 'acik' : s <= 12 ? 'altin' : s <= 20 ? 'amber' : s <= 35 ? 'koyu' : 'cokkoyu';
const ACI = (og, ibu) => { const b = ibu / (1000 * (og - 1)); return b < 0.35 ? 'malt' : b < 0.6 ? 'dengeli' : b < 0.9 ? 'hop' : 'cokaci'; };
const GOV = g => { const s = g('p_crystal') + g('p_oats') * 0.8 + g('p_wheat') * 0.5 + g('p_rye') * 0.5 - g('p_sugar') * 1.2; return s < 2 ? 'ince' : s < 8 ? 'orta' : 'dolgun'; };

// ── 3. Korpusu tara ───────────────────────────────────────────────────────
let hdr = null, ix = {}, n = 0, gecerli = 0, katch = 0, esl = 0, atl = 0, mayaNull = 0, maltNull = 0;
const kova = new Map(), kovaTop = new Map(), stilM = new Map();
function say(o, k) { o[k] = (o[k] || 0) + 1; }

readline.createInterface({ input: fs.createReadStream(TSV) })
  .on('line', l => {
    const a = l.split('\t');
    if (!hdr) { hdr = a; hdr.forEach((h, i) => ix[h] = i); return; }
    n++;
    const g = k => { const v = parseFloat(a[ix[k]]); return isFinite(v) ? v : 0; };
    const og = g('og'), slug = a[ix.slug];
    if (og < 1.005 || !slug) { atl++; return; }
    if (KATCH.has(slug)) { katch++; return; }
    const ad = M.slug2bjcp[slug]; if (!ad || !BJCP[ad]) { esl++; return; }
    gecerli++;
    const r = {}; for (const k of ['yeast_str', 'k_smoke']) r[k] = a[ix[k]];
    for (const k of hdr) if (k.charAt(0) === 'y' && k.charAt(1) === '_') r[k] = a[ix[k]];
    for (const k of ['is_mixed_fermentation', 'has_brett', 'has_lacto', 'has_pedio']) r[k] = a[ix[k]];
    const my = MAYA(r), ml = MALT(g, r);
    if (my == null) mayaNull++;
    if (ml == null) maltNull++;
    let sv = stilM.get(ad); if (!sv) { sv = { maya: {}, malt: {}, top: 0 }; stilM.set(ad, sv); }
    sv.top++; if (my) say(sv.maya, my); if (ml) say(sv.malt, ml);
    const key = RENK(g('srm')) + '|' + ACI(og, g('ibu')) + '|' + GOV(g);
    if (!kova.has(key)) kova.set(key, new Map());
    const km = kova.get(key); km.set(ad, (km.get(ad) || 0) + 1);
    kovaTop.set(key, (kovaTop.get(key) || 0) + 1);
  })
  .on('close', bitir);

function bitir() {
  console.log('\n== KORPUS ==');
  console.log('okunan=' + n + ' gecerli=' + gecerli + ' katchall=' + katch + ' eslesmeyen=' + esl + ' atlanan=' + atl);
  console.log('MAYA siniflandi %' + (100 * (gecerli - mayaNull) / gecerli).toFixed(2) + ' - MALT siniflandi %' + (100 * (gecerli - maltNull) / gecerli).toFixed(2));

  const TUM_KOVA = [];
  for (const rk of RENK_S) for (const ac of ACI_S) for (const gv of GOV_S) TUM_KOVA.push(rk + '|' + ac + '|' + gv);
  const stiller = [...new Set([].concat(...TUM_KOVA.map(k => [...(kova.get(k) || new Map()).keys()])))].sort();
  let hucre = 0; TUM_KOVA.forEach(k => hucre += (kova.get(k) || new Map()).size);
  console.log('matris: ' + TUM_KOVA.length + ' kova x ' + stiller.length + ' stil = ' + hucre + ' dolu hucre');

  // ── 4. KAPI 1: tam matris tabanı ÜRETİYOR mu? (AK/AM algoritması birebir) ──
  const MIN_N = 25, MIN_PAY = 0.015, MAX_ONERI = 6;
  let adFark = 0, nFark = 0, ornek = [];
  TUM_KOVA.forEach(k => {
    const m = kova.get(k) || new Map(), tot = kovaTop.get(k) || 1;
    const liste = [...m.entries()].filter(p => p[1] >= MIN_N && p[1] / tot >= MIN_PAY)
      .map(p => ({ ad: p[0], n: p[1], isk: !!ISK[p[0]] }));
    liste.sort((a, b) => (b.n * (b.isk ? 1.35 : 1)) - (a.n * (a.isk ? 1.35 : 1)));
    const yeni = liste.slice(0, MAX_ONERI);
    const tabAd = PROFIL[k][1].map(x => x[0]), yeniAd = yeni.map(x => x.ad);
    if (JSON.stringify(tabAd) !== JSON.stringify(yeniAd)) { adFark++; if (ornek.length < 6) ornek.push(k + '\n     TABLO:' + JSON.stringify(tabAd) + '\n     YENI :' + JSON.stringify(yeniAd)); }
    else if (JSON.stringify(PROFIL[k][1].map(x => x[1])) !== JSON.stringify(yeni.map(x => x.n))) nFark++;
  });
  console.log('\n== KAPI 1 - tam matris TABANI URETIYOR mu ==');
  console.log('top-6 AD+SIRA farkli kova: ' + adFark + '/60 (0 bekleniyor)');
  console.log('top-6 yalniz SAYI farkli kova: ' + nFark + '/60 (korpus tazeligi)');
  ornek.forEach(x => console.log('  ' + x));
  if (adFark) abort('tam matris taban tabloyu URETMIYOR - eksen/esleme suruklenmesi var');
  let topSap = 0, maxSap = 0;
  TUM_KOVA.forEach(k => { const d = Math.abs((kovaTop.get(k) || 0) - PROFIL[k][0]); topSap += d; if (d > maxSap) maxSap = d; });
  console.log('kova toplami sapmasi: toplam ' + topSap + ' kayit, en buyuk tek kova ' + maxSap +
    ' (%' + (100 * topSap / gecerli).toFixed(3) + ') - BR kova TOPLAMINI _PROFIL_STIL\'den okur');
  if (100 * topSap / gecerli > 0.5) abort('korpus sapmasi %0.5 ustu');

  // ── 5. Karakter tablosu (TÜM stiller) ─────────────────────────────────
  function baskin(o) { const e = Object.entries(o).sort((a, b) => b[1] - a[1]); if (!e.length) return null; const t = e.reduce((s, x) => s + x[1], 0); return { sinif: e[0][0], pay: e[0][1] / t }; }
  const KAR = {}; const sinifsiz = [];
  stiller.forEach(ad => {
    const v = stilM.get(ad); if (!v) { sinifsiz.push(ad + '(korpusta yok)'); return; }
    const bm = baskin(v.maya), bl = baskin(v.malt);
    if (!bm || !bl) { sinifsiz.push(ad + '(n=' + v.top + ', sinif yok)'); return; }
    if (v.top < MIN_N) { sinifsiz.push(ad + '(n=' + v.top + ' < ' + MIN_N + ')'); return; }
    // Yuvarlama BQ1 ile BİREBİR: BQ1 önce pay'ı toFixed(3) ile dondurup sonra
    // ×100 yuvarlıyordu (çift yuvarlama). Aynısı yapılmazsa 7 giriş 1 puan
    // kayar ve "sınıflandırıcı sürüklendi" gibi görünür — sürüklenme YOK.
    KAR[ad] = [bm.sinif, Math.round(+bm.pay.toFixed(3) * 100), bl.sinif, Math.round(+bl.pay.toFixed(3) * 100)];
  });
  console.log('\n== KAPI 2 - karakter tablosu ==');
  console.log('siniflanan stil: ' + Object.keys(KAR).length + '/' + stiller.length + ' - sinifsiz: ' + (sinifsiz.join(' - ') || 'YOK'));
  const eskiler = Object.keys(KAR0);
  let degisen = [], kayip = [];
  eskiler.forEach(ad => {
    if (!KAR[ad]) { kayip.push(ad); return; }
    if (JSON.stringify(KAR[ad]) !== JSON.stringify(KAR0[ad])) degisen.push(ad + ': ' + JSON.stringify(KAR0[ad]) + ' -> ' + JSON.stringify(KAR[ad]));
  });
  console.log('mevcut 48 giristen DEGISEN: ' + degisen.length + (degisen.length ? '\n  ' + degisen.join('\n  ') : ' (0 - BQ1 tablosu aynen yeniden uretildi)'));
  console.log('mevcut 48 giristen KAYBOLAN: ' + (kayip.join(' - ') || 'YOK'));
  if (degisen.length) abort('BQ1 karakter tablosu YENIDEN URETILEMEDI - siniflandirici suruklenmesi');
  if (kayip.length) abort('mevcut karakter girisi kayboldu');
  const yeniStil = Object.keys(KAR).filter(a => !KAR0[a]);
  console.log('YENI eklenen stil (' + yeniStil.length + '): ' + (yeniStil.join(' - ') || 'yok'));

  // ── 6. ÖLÇÜM — kova patlaması ─────────────────────────────────────────
  const MY_S = ['temiz', 'esterli', 'fenolik', 'eksi'], ML_S = ['ekmeksi', 'tost', 'karamel', 'kavrulmus', 'cikolata', 'isli'];
  function toplaKova(f) {
    const m = new Map(); let tot = 0;
    TUM_KOVA.forEach(k => {
      const p = k.split('|');
      if (f.renk && p[0] !== f.renk) return;
      if (f.aci && p[1] !== f.aci) return;
      if (f.govde && p[2] !== f.govde) return;
      tot += PROFIL[k][0];
      (kova.get(k) || new Map()).forEach((v, ad) => m.set(ad, (m.get(ad) || 0) + v));
    });
    return { m, tot };
  }
  function sonuc(f) {
    const r = toplaKova(f);
    let liste = [...r.m.entries()].filter(p => p[1] >= MIN_N);
    if (f.maya) liste = liste.filter(p => KAR[p[0]] && KAR[p[0]][0] === f.maya);
    if (f.malt) liste = liste.filter(p => KAR[p[0]] && KAR[p[0]][2] === f.malt);
    if (!f.maya && !f.malt) liste = liste.filter(p => p[1] / (r.tot || 1) >= MIN_PAY);
    liste.sort((a, b) => (b[1] * (ISK[b[0]] ? 1.35 : 1)) - (a[1] * (ISK[a[0]] ? 1.35 : 1)));
    return { liste, tot: r.tot };
  }
  console.log('\n== OLCUM - KOVA PATLAMASI (5 eksen ZORUNLU olsaydi) ==');
  let bos5 = 0, tek5 = 0, tum5 = 0, dolu5 = 0;
  RENK_S.forEach(r => ACI_S.forEach(a => GOV_S.forEach(gv => MY_S.forEach(my => ML_S.forEach(ml => {
    tum5++;
    const s = sonuc({ renk: r, aci: a, govde: gv, maya: my, malt: ml });
    if (!s.liste.length) bos5++; else if (s.liste.length === 1) tek5++;
    dolu5 += s.liste.length;
  })))));
  console.log('5 eksen tam secili kombinasyon: ' + tum5 + ' - BOS: ' + bos5 + ' (%' + (100 * bos5 / tum5).toFixed(1) +
    ') - tek stil: ' + tek5 + ' (%' + (100 * tek5 / tum5).toFixed(1) + ') - ortalama stil ' + (dolu5 / tum5).toFixed(2));

  console.log('\n== OLCUM - ISTEGE BAGLI EKSEN (BR tasarimi) ==');
  const EKS = [['renk', RENK_S], ['aci', ACI_S], ['govde', GOV_S], ['maya', MY_S], ['malt', ML_S]];
  for (let k = 0; k <= 5; k++) {
    let toplam = 0, bos = 0, azlar = 0, ortStil = 0;
    const komb = (i, secili) => {
      if (Object.keys(secili).length === k) {
        const s = sonuc(secili); toplam++;
        if (!s.liste.length) bos++;
        if (s.liste.length < 3) azlar++;
        ortStil += Math.min(s.liste.length, MAX_ONERI);
        return;
      }
      if (i >= EKS.length) return;
      if (EKS.length - i < k - Object.keys(secili).length) return;
      EKS[i][1].forEach(v => { const c = Object.assign({}, secili); c[EKS[i][0]] = v; komb(i + 1, c); });
      komb(i + 1, secili);
    };
    komb(0, {});
    console.log('  ' + k + ' eksen secili: ' + toplam + ' kombinasyon - BOS ' + bos + ' (%' + (100 * bos / toplam).toFixed(1) +
      ') - <3 stil ' + azlar + ' (%' + (100 * azlar / toplam).toFixed(1) + ') - ort. gosterilen ' + (ortStil / toplam).toFixed(2) + '/6');
  }

  console.log('\n== KAAN VAKASI: amber + malt + dolgun (+ fenolik) ==');
  const k1 = sonuc({ renk: 'amber', aci: 'malt', govde: 'dolgun' });
  console.log('  suzgecsiz (top-6): ' + k1.liste.slice(0, 6).map(x => x[0] + '(' + x[1] + ')').join(' - '));
  const k2 = sonuc({ renk: 'amber', aci: 'malt', govde: 'dolgun', maya: 'fenolik' });
  console.log('  + fenolik: ' + k2.liste.length + ' stil, toplam ' + k2.liste.reduce((a, b) => a + b[1], 0) + ' recete');
  console.log('    ' + k2.liste.slice(0, 8).map(x => x[0] + '(' + x[1] + ')').join(' - '));
  const k3 = sonuc({ renk: 'amber', aci: 'malt', govde: 'dolgun', maya: 'fenolik', malt: 'karamel' });
  console.log('  + fenolik + karamel: ' + k3.liste.length + ' stil - ' + k3.liste.slice(0, 6).map(x => x[0]).join(' - '));
  const k4 = sonuc({});
  console.log('  hic secim yok: toplam ' + k4.tot + ' recete, ' + k4.liste.length + ' stil, top-6: ' + k4.liste.slice(0, 6).map(x => x[0] + '(' + x[1] + ')').join(' - '));
  const k5 = sonuc({ renk: 'koyu' });
  console.log('  yalniz koyu: ' + k5.tot + ' recete, ' + k5.liste.length + ' stil, top-6: ' + k5.liste.slice(0, 6).map(x => x[0]).join(' - '));
  const k6 = sonuc({ maya: 'eksi' });
  console.log('  yalniz eksi maya: ' + k6.liste.length + ' stil, top-6: ' + k6.liste.slice(0, 6).map(x => x[0] + '(' + x[1] + ')').join(' - '));

  // ── 7. Statik JS üret ─────────────────────────────────────────────────
  const ixOf = {}; stiller.forEach((a, i) => ixOf[a] = i);
  const satir = TUM_KOVA.map(k => {
    const m = kova.get(k) || new Map();
    const cift = [...m.entries()].sort((a, b) => b[1] - a[1]).map(p => ixOf[p[0]] + ':' + p[1]).join(',');
    return "  '" + k + "':'" + cift + "'";
  });
  const karSatir = Object.keys(KAR).sort().map(a => '  "' + a.replace(/"/g, '\\"') + '":["' + KAR[a][0] + '",' + KAR[a][1] + ',"' + KAR[a][2] + '",' + KAR[a][3] + ']');
  const matrisJs = 'window._BR_KOVA = {\n' + satir.join(',\n') + '\n};';
  const karJs = 'window._PROFIL_KARAKTER = {\n' + karSatir.join(',\n') + '\n};';
  const adJs = 'window._BR_STILAD = ' + JSON.stringify(stiller) + ';';
  const js = adJs + '\n' + matrisJs + '\n\n' + karJs + '\n';
  const cikti = process.argv[2] || path.join(KOK, '_br_kova_out.js');
  fs.writeFileSync(cikti, js, 'utf8');
  console.log('\n[yaz] ' + cikti + ' - ' + js.length + ' bayt (matris ' + matrisJs.length + ' + adlar ' + adJs.length + ' + karakter ' + karJs.length + ')');
}
