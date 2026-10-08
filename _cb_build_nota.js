// ═══ SPRINT CB2 — LEZZET NOTALARI TABLO ÜRETİCİSİ ═══
//
// NE YAPAR: Korpustan (working/_compact3.tsv) 73 stilin her biri için reçete-düzeyi PAYLARI
// hesaplar ve AÇIK KURALLARLA hangi stilin hangi notayı TAŞIDIĞINI belirler. Çıktı HTML'e gömülen
// statik window._CB_NOTA tablosudur; runtime'da korpus YOK.
//
// SINIFLANDIRICILAR UYDURULMADI: maya/malt _bq1_build_karakter.js'ten BİREBİR dilimlenir; acılık
// _bq1/_br'deki ACI (IBU/GU) ile aynı; hop sınıfı ve tahıl window._PROFIL_KARAKTER'den (BT/BS) okunur.
// TEK EŞİK: "taşır" = o stilin reçetelerinin ≥%40'ı (BQ1'in "baskınlık <40 = soluk ?" sınırı ile aynı).
// Çoğunluk kuralları (>%50) yalnız acılık yönünde.
//
// ADAY 10 NOTA → VERİNİN TAŞIDIĞI (kararlar ölçümle; gerekçe rapor + kod yorumunda):
//   ☕ Kahve & kavrulmuş   kavrulmuş malt (roast > choc) payı ≥40
//   🍫 Çikolata            çikolata malt (choc > roast) payı ≥40   — AYRI tutuldu: stout↔porter ayrışıyor
//   🍌 Muz & karanfil      ALMAN BUĞDAY MAYASI payı ≥40 (fenolik içinde Belçika/wit bayrağı OLMAYAN)
//   🍊 Narenciye & acı     baskın hop narenciye (≥40) VE reçetelerin >%50'si acı tarafta (hop/çok acı)
//   🥭 Tropikal            baskın hop tropik (≥40)               — "& yumuşak" DÜŞTÜ (ölçülmüyor)
//   🍋 Ekşi                ekşi maya/bakteri payı ≥40            — "& ferah" DÜŞTÜ (ölçülmüyor)
//   🔥 İsli                isli malt payı ≥40
//   🍯 Karamel & malt      karamel+tost malt payı ≥40 VE >%50 malt/dengeli tarafta VE ekşi payı <40
//   🌶️ Baharatlı           fenolik ≥40 VE Alman buğday mayası <40 (Belçika/çiftlik/wit) — "& kuru" DÜŞTÜ
//   🍞 Temiz & ekmeksi     temiz maya ≥40 VE ekmeksi malt ≥40 VE baskın hop narenciye/tropik DEĞİL
//   🍑 Meyvemsi (İngiliz)  esterli (İngiliz ale) maya payı ≥40 — CB2 kuralının AYNISI, ek istisna YOK (Kaan: Mild GEÇMELİ;
//                         'kavrulmuşu hariç tut' istisnası Mild'ı eliyordu → kaldırıldı). Stout/porter'lar da girer: veri bu.
// EKLENMEYENLER (veride yok): vanilya, meyve katkısı, laktoz/tatlı.
//
// KAPI: her notanın pozitif/negatif kontrolleri aşağıda; biri tutmazsa ABORT (tablo yazılmaz).
// Kullanım: node _cb_build_nota.js [cikti.js]
'use strict';
const fs = require('fs'), path = require('path'), readline = require('readline'), vm = require('vm');
const KOK = __dirname, W = path.join(KOK, 'working');
const TSV = path.join(W, '_compact3.tsv'), SLUG = path.join(W, 'slug2bjcp.json');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
if (!fs.existsSync(TSV)) abort('korpus yok: ' + TSV);

// ── sınıflandırıcılar: _bq1_build_karakter.js'ten BİREBİR dilim ──
const bq1 = fs.readFileSync(path.join(KOK, '_bq1_build_karakter.js'), 'utf8');
const sl = (a, b) => { const i = bq1.indexOf(a), j = bq1.indexOf(b, i); if (i < 0 || j < 0) abort('dilim yok: ' + a); return bq1.slice(i, j); };
const sinifCtx = vm.createContext({});
vm.runInContext(sl('function MAYA(r) {', '\n// 5-sınıf malt') + '\n' + sl('const P_TUM', '\n// Sürüklenme kontrolü').replace('const P_TUM', 'var P_TUM'), sinifCtx);
const MAYA = sinifCtx.MAYA, MALT = sinifCtx.MALT;
if (typeof MAYA !== 'function' || typeof MALT !== 'function') abort('MAYA/MALT dilimlenemedi');
const ACI = (og, ibu) => { const b = ibu / (1000 * (og - 1)); return b < 0.35 ? 'malt' : b < 0.6 ? 'dengeli' : b < 0.9 ? 'hop' : 'cokaci'; };

// ── canlı HTML'den karakter tablosu (hop + tahıl) ──
const html = fs.readFileSync(path.join(KOK, 'Brewmaster_v2_79_10.html'), 'utf8');
const km = html.match(/window\._PROFIL_KARAKTER = \{[\s\S]*?\n\};/); if (!km) abort('_PROFIL_KARAKTER yok');
const kctx = vm.createContext({ window: {} }); vm.runInContext(km[0], kctx);
const KAR = kctx.window._PROFIL_KARAKTER;
if (Object.keys(KAR).length !== 73) abort('karakter tablosu 73 değil');

// ── korpus ──
const M = JSON.parse(fs.readFileSync(SLUG, 'utf8')); const KATCH = new Set(M.katchall);
const BEL = ['y_belgian', 'y_abbey', 'y_saison', 'y_witbier', 'y_wit'];
const WZ_RE = /weizen|weiss|hefe|wb-?06|\b3068\b|\b3638\b|\b3333\b|wlp300|wlp380|wlp351|\bw-?68\b|bavarian wheat/;
const S = new Map(); let hdr = null, ix = {}, gecerli = 0;
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
readline.createInterface({ input: fs.createReadStream(TSV) }).on('line', l => {
  const a = l.split('\t');
  if (!hdr) { hdr = a; hdr.forEach((h, i) => ix[h] = i); return; }
  const g = k => { const v = parseFloat(a[ix[k]]); return isFinite(v) ? v : 0; };
  const og = g('og'), slug = a[ix.slug];
  if (og < 1.005 || !slug || KATCH.has(slug)) return;
  const ad = M.slug2bjcp[slug]; if (!ad || !KAR[ad]) return;
  gecerli++;
  const r = {}; for (const k of ['yeast_str', 'k_smoke']) r[k] = a[ix[k]];
  for (const k of hdr) if (k[0] === 'y' && k[1] === '_') r[k] = a[ix[k]];
  for (const k of ['is_mixed_fermentation', 'has_brett', 'has_lacto', 'has_pedio']) r[k] = a[ix[k]];
  let v = S.get(ad); if (!v) { v = { n: 0, maya: {}, malt: {}, aci: {}, wz: 0 }; S.set(ad, v); }
  v.n++;
  const my = MAYA(r), ml = MALT(g, r);
  if (my) inc(v.maya, my); if (ml) inc(v.malt, ml);
  if (my === 'fenolik') {
    const ys = (r.yeast_str || '').toLowerCase();
    const bel = BEL.some(k => r[k] === '1');
    const wheatPhen = r.y_wheat_german === '1' && !/american wheat|\b1010\b|wlp320/.test(ys); // MAYA()'daki wheatPhen ile aynı
    if (!bel && (wheatPhen || WZ_RE.test(ys))) v.wz++;
  }
  const ibu = g('ibu'); if (ibu > 0) inc(v.aci, ACI(og, ibu));
}).on('close', bitir);

function bitir() {
  const pay = (o, k) => { const t = Object.values(o).reduce((s, x) => s + x, 0); return t ? Math.round(100 * (o[k] || 0) / t) : 0; };
  const P = {};
  S.forEach((v, ad) => {
    P[ad] = { n: v.n, kav: pay(v.malt, 'kavrulmus'), cik: pay(v.malt, 'cikolata'), isli: pay(v.malt, 'isli'),
      kar: pay(v.malt, 'karamel'), tost: pay(v.malt, 'tost'), ekm: pay(v.malt, 'ekmeksi'),
      fen: pay(v.maya, 'fenolik'), eksi: pay(v.maya, 'eksi'), temiz: pay(v.maya, 'temiz'), est: pay(v.maya, 'esterli'),
      wz: v.n ? Math.round(100 * v.wz / v.n) : 0,
      aciYuk: pay(v.aci, 'hop') + pay(v.aci, 'cokaci'), aciDus: pay(v.aci, 'malt') + pay(v.aci, 'dengeli'),
      hop: KAR[ad][8] || '', hopPay: KAR[ad][9] || 0 };
  });
  if (Object.keys(P).length !== 73) abort('korpusta 73 stil yok: ' + Object.keys(P).length);
  console.log('[korpus] gecerli=' + gecerli + ' stil=' + Object.keys(P).length);

  const E = 40;
  // [anahtar, etiket, ikon, uzun açıklama, kural(p) -> gösterilecek pay | null]
  const NOTA = [
    ['kahve', 'Kahve & kavrulmuş', '☕', 'Kavrulmuş malt baskın (roast > çikolata malt) reçete payı ≥%40', p => p.kav >= E ? p.kav : null],
    ['cikolata', 'Çikolata', '🍫', 'Çikolata maltı baskın (çikolata > roast) reçete payı ≥%40', p => p.cik >= E ? p.cik : null],
    ['muz', 'Muz & karanfil', '🍌', 'Alman buğday (weizen) mayası reçete payı ≥%40 — muz/karanfil bu mayanın imzası; Belçika/wit mayası sayılmaz', p => p.wz >= E ? p.wz : null],
    ['narenciye', 'Narenciye & acı', '🍊', 'Baskın hop aroması narenciye (≥%40) ve reçetelerin çoğu (>%50) acı tarafta', p => (p.hop === 'narenciye' && p.hopPay >= E && p.aciYuk > 50) ? p.hopPay : null],
    ['tropik', 'Tropikal', '🥭', 'Baskın hop aroması tropikal (≥%40)', p => (p.hop === 'tropik' && p.hopPay >= E) ? p.hopPay : null],
    ['eksi', 'Ekşi', '🍋', 'Ekşi/vahşi maya-bakteri reçete payı ≥%40', p => p.eksi >= E ? p.eksi : null],
    ['isli', 'İsli', '🔥', 'İsli malt reçete payı ≥%40', p => p.isli >= E ? p.isli : null],
    ['karamel', 'Karamel & malt', '🍯', 'Karamel+tost malt payı ≥%40, reçetelerin çoğu (>%50) malt/dengeli tarafta, ekşi değil', p => (p.kar + p.tost >= E && p.aciDus > 50 && p.eksi < E) ? (p.kar + p.tost) : null],
    ['baharat', 'Baharatlı', '🌶️', 'Fenolik (Belçika/çiftlik/wit) maya payı ≥%40, Alman buğday mayası değil', p => (p.fen >= E && p.wz < E) ? p.fen : null],
    ['meyvemsi', 'Meyvemsi (İngiliz mayası)', '🍑', 'İngiliz ale mayası (esterli — meyvemsi esterler) reçete payı ≥%40', p => p.est >= E ? p.est : null],
    ['temiz', 'Temiz & ekmeksi', '🍞', 'Temiz maya ≥%40 ve ekmeksi malt ≥%40; baskın hop narenciye/tropik değil', p => (p.temiz >= E && p.ekm >= E && p.hop !== 'narenciye' && p.hop !== 'tropik') ? Math.min(p.temiz, p.ekm) : null]
  ];
  const T = {};
  NOTA.forEach(n => {
    const stil = {};
    Object.keys(P).sort().forEach(ad => { const v = n[4](P[ad]); if (v != null) stil[ad] = v; });
    T[n[0]] = { et: n[1], ikon: n[2], uzun: n[3], stil };
  });

  // ── KAPI: pozitif / negatif kontroller ──
  const K = {
    kahve: { var: ['Dry Irish Stout', 'Foreign Extra Stout', 'American Stout', 'Imperial / Russian Imperial Stout'], yok: ['Robust Porter', 'Brown Porter', 'American IPA', 'Weizen / Weissbier'] },
    cikolata: { var: ['Robust Porter', 'Brown Porter', 'London Porter'], yok: ['Dry Irish Stout', 'Foreign Extra Stout', 'American IPA'] },
    muz: { var: ['Weizen / Weissbier', 'Dunkelweizen', 'Weizenbock'], yok: ['American IPA', 'Imperial IPA / DIPA', 'Witbier / Belgian White', 'Tripel', 'Saison / Farmhouse Ale', 'American Wheat Beer'] },
    narenciye: { var: ['American IPA', 'American Pale Ale', 'Imperial IPA / DIPA'], yok: ['German Pils', 'Dry Irish Stout', 'Weizen / Weissbier', 'NEIPA / Hazy IPA'] },
    tropik: { var: ['NEIPA / Hazy IPA'], yok: ['German Pils', 'American IPA', 'Dry Irish Stout'] },
    eksi: { var: ['Berliner Weisse', 'Lambic / Gueuze', 'Flanders Red Ale'], yok: ['American IPA', 'German Pils', 'Saison / Farmhouse Ale'] },
    isli: { var: ['Rauchbier / Bamberg Smoked'], yok: ['American IPA', 'Dry Irish Stout', 'German Pils'] },
    karamel: { var: ['Munich Märzen / Oktoberfest', 'Bock', 'Doppelbock'], yok: ['American IPA', 'Altbier / Düsseldorf Altbier', 'Flanders Red Ale', 'German Pils'] },
    baharat: { var: ['Tripel', 'Saison / Farmhouse Ale', 'Dubbel', 'Witbier / Belgian White'], yok: ['Weizen / Weissbier', 'American IPA', 'German Pils'] },
    meyvemsi: { var: ['Best Bitter', 'Strong Bitter / ESB', 'English Mild / Dark Mild', 'English Brown Ale', 'Session Ale / Ordinary Bitter', 'English IPA'], yok: ['Weizen / Weissbier', 'American IPA', 'German Pils', 'Tripel', 'Helles / Münchner Hell'] },
    temiz: { var: ['German Pils', 'Helles / Münchner Hell', 'Kölsch'], yok: ['American IPA', 'American Pale Ale', 'Weizen / Weissbier', 'Dry Irish Stout'] }
  };
  let kontrol = 0;
  Object.keys(K).forEach(k => {
    K[k].var.forEach(a => { if (!(a in T[k].stil)) abort('POZİTİF kontrol FAIL: ' + k + ' notası ' + a + ' içermiyor'); kontrol++; });
    K[k].yok.forEach(a => { if (a in T[k].stil) abort('NEGATİF kontrol FAIL: ' + k + ' notası ' + a + ' içeriyor'); kontrol++; });
    if (!Object.keys(T[k].stil).length) abort('boş nota: ' + k);
  });
  // "Muz & karanfil" içinde hiçbir IPA yok (genel kural, adla)
  if (Object.keys(T.muz.stil).some(a => /IPA/.test(a))) abort('muz notasında IPA var');
  console.log('[kapi] ' + kontrol + ' kontrol PASS');

  Object.keys(T).forEach(k => console.log('  ' + T[k].ikon + ' ' + T[k].et.padEnd(18) + Object.keys(T[k].stil).length + ' stil: ' + Object.keys(T[k].stil).map(a => a + ' ' + T[k].stil[a]).join(' · ')));
  const kapsanan = new Set(); Object.keys(T).forEach(k => Object.keys(T[k].stil).forEach(a => kapsanan.add(a)));
  console.log('[kapsam] en az bir notası olan stil: ' + kapsanan.size + '/73 · notasız: ' + Object.keys(P).filter(a => !kapsanan.has(a)).join(', '));

  const sira = NOTA.map(n => n[0]);
  const js = 'window._CB_NOTA_SIRA = ' + JSON.stringify(sira) + ';\nwindow._CB_NOTA = ' + JSON.stringify(T) + ';';
  if (process.argv[2]) { fs.writeFileSync(process.argv[2], js); console.log('[yaz] ' + process.argv[2] + ' (' + js.length + ' bayt)'); }
}
