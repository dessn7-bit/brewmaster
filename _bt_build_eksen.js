// ═══ SPRINT BT — ABV/GÜÇ + HOP KARAKTERİ EKSENLERİ (tablo üreticisi) ═══
//
// Karakter satırı 6 → 10 alan:
//   [maya,%, malt,%, tahıl,%, abv,%, hop,%]
// maya/malt/tahıl sütunları BS'den AYNEN taşınır (yeniden türetilmez) — ABORT kapılı.
//
// ── ABV (BT1-1) ─────────────────────────────────────────────────────────
// FG KULLANILMAZ (dataset FG'sinin %91,9'u formülden türetilmiş = sahte).
// OG → ABV tek ve AÇIK varsayımla: %75 görünür attenuation
//   ABV ≈ (OG−1)×1000 × 0,0984      [(OG−FG)×131,25, FG=1+(OG−1)×0,25]
// Bantlar (brief): hafif <%4,5 · orta %4,5–6,5 · güçlü %6,5–9 · çok güçlü >%9
// DOĞRULAMA: her stilin korpus-medyan ABV'si BJCP'nin kendi ABV bandıyla
// ±0,7 toleransla örtüşmeli (ölçüldü: 71/73).
//
// ── HOP (BT1-2) ─────────────────────────────────────────────────────────
// Kaynak: HOPLAR[].mo — uygulamanın KENDİ kürate ettiği aroma tanımı.
// Sınıflandırıcı v1 ("en çok geçen kelime") DENENDİ ve REDDEDİLDİ: 'çiçek'
// 73 stilin 52'sinde baskın çıktı = catch-all imzası (BQ1 dersi).
// v2: metinde İLK geçen tanımlayıcı kazanır — katalog yazarı birincil notu
// başa yazar, sıralamanın kendisi kaynağın bilgisidir.
// DENETİM: v2'de 'otsu' sınıfına giren 12 hop tam olarak noble/İngiliz
// hoplarıdır (Saaz · Hallertau Mittelfrueh · Tettnanger · Spalt · Fuggles ·
// Lublin · Sterling · Spalter Select · Hallertau Tradition ...) — catch-all
// değil, gerçek bir aile. 'çamsı' 7 hop içeriyor (Columbus · Simcoe · Chinook
// · Warrior · Herkules · Target · Talus) ama HİÇBİR STİLDE baskın değil:
// çamsı hoplar acılık eklemesi olarak kullanılıyor, stilin tanımlayıcı
// aroması olmuyor. Bu yüzden 'camsi' çip listesine ALINMAZ (kalıcı ölü çip
// üretirdi); sınıf tabloda yaşamaya devam eder.
//
// ŞERH: hop ekseni diğer 5 eksenden BİR ADIM DAHA DOLAYLI — maya/malt/tahıl/ABV
// doğrudan sayısal alanlardan, hop ise kürate edilmiş PROZA metninden türüyor.
// Ekranda bu ayrım yazılır.
//
// Kullanım: node _bt_build_eksen.js [cikti.js]
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
vm.runInContext(
  dilim(/const BJCP = \{[\s\S]*?\n\};/).replace('const ', '') + '\n' +
  dilim(/const HOPLAR=\[[\s\S]*?\n\];/).replace('const ', '') + '\n' +
  dilim(/window\._PROFIL_STIL = \{[\s\S]*?\n\};/) + '\n' +
  dilim(/window\._PROFIL_KARAKTER = \{[\s\S]*?\n\};/) + '\n' +
  dilim(/window\._BR_STILAD = \[[\s\S]*?\];/), ctx);
const BJCP = ctx.BJCP, HOPLAR = ctx.HOPLAR, PS = ctx.window._PROFIL_STIL;
const KAR0 = ctx.window._PROFIL_KARAKTER, STILAD = ctx.window._BR_STILAD;
if (Object.keys(KAR0).length !== 73) abort('mevcut karakter tablosu 73 degil');
if (!Object.values(KAR0).every(v => v.length === 6)) abort('mevcut tablo 6 alanli degil');
console.log('[dilim] BJCP=' + Object.keys(BJCP).length + ' HOPLAR=' + HOPLAR.length + ' karakter=' + Object.keys(KAR0).length);

// ── Hop sınıflandırıcı (v2: ILK gecen tanimlayici) ───────────────────────
const AROMA_RE = {
  narenciye: /sitrus|limon|greyfurt|portakal|misket|lime|mandalina|bergamot|narenciye/i,
  tropik: /tropik|mango|passion|çarkıfelek|ananas|kavun|şeftali|guava|papaya|hindistan cevizi|armut|kayısı|üzüm|frenk üzümü|böğürtlen|karpuz|ç.rek otu|meyve/i,
  camsi: /çam|reçine|dank|katran|kozalak|iğne yaprak/i,
  cicek: /çiçek|floral|gül|lavanta|yasemin|hanımeli|parfüm/i,
  otsu: /bitkisel|otsu|toprak|çimen|çayır|herbal|saman|tütün|ahşap|odunsu|nane|çay|noble|asil/i,
  baharat: /baharat|biber|karanfil|anason|tarçın|zencefil|kekik|adaçayı|kimyon/i
};
const AROMA_SIRA = ['narenciye', 'tropik', 'camsi', 'cicek', 'otsu', 'baharat'];
function hopSinif(mo) {
  if (!mo) return null;
  var en = null, ix = 1e9;
  AROMA_SIRA.forEach(function (c) { var m = String(mo).match(AROMA_RE[c]); if (m && m.index < ix) { ix = m.index; en = c; } });
  return en;
}
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
const HOP_SINIF = {}; const hopKatalogSay = {};
HOPLAR.forEach(h => { const c = hopSinif(h.mo); if (c) { HOP_SINIF[norm(h.ad)] = c; hopKatalogSay[c] = (hopKatalogSay[c] || 0) + 1; } });
console.log('[hop] katalog: ' + Object.keys(HOP_SINIF).length + '/' + HOPLAR.length + ' siniflandi ' + JSON.stringify(hopKatalogSay));
// KAPI: noble hoplar otsu olmali (siniflandirici denetimi)
[['saazczech', 'otsu'], ['hallertaumittelfrueh', 'otsu'], ['tettnanger', 'otsu'], ['fuggles', 'otsu'],
['citra', 'tropik'], ['cascade', 'narenciye'], ['chinook', 'camsi'], ['columbusctz', 'camsi']].forEach(p => {
  if (HOP_SINIF[p[0]] !== p[1]) abort('hop siniflandirici denetimi FAIL: ' + p[0] + ' -> ' + HOP_SINIF[p[0]] + ' (beklenen ' + p[1] + ')');
});
console.log('[hop] siniflandirici denetimi 8/8 PASS (noble->otsu, citra->tropik, chinook->camsi)');

// ── ABV ──────────────────────────────────────────────────────────────────
const ABV_BANT = [['hafif', 0, 4.5], ['orta', 4.5, 6.5], ['guclu', 6.5, 9], ['cokguclu', 9, 99]];
function abvBant(a) { for (const b of ABV_BANT) if (a >= b[1] && a < b[2]) return b[0]; return null; }
const OG2ABV = og => (og - 1) * 1000 * 0.0984;

const M = JSON.parse(fs.readFileSync(SLUG, 'utf8'));
const KATCH = new Set(M.katchall);
let hdr = null, ix = {}, n = 0, gecerli = 0, hopEslesen = 0;
const stil = new Map();
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
    let v = stil.get(ad);
    if (!v) { v = { n: 0, abv: [], hop: {}, hopOlan: 0 }; stil.set(ad, v); }
    v.n++;
    v.abv.push(OG2ABV(og));
    const kaynak = a[ix.hop_aroma] || a[ix.hop_all] || '';
    if (kaynak) {
      const say = {};
      kaynak.split(/[,;|]/).map(norm).filter(Boolean).forEach(p => {
        let c = HOP_SINIF[p];
        if (!c) { const k = Object.keys(HOP_SINIF).find(h => h.length > 3 && (p.indexOf(h) >= 0 || h.indexOf(p) >= 0)); if (k) c = HOP_SINIF[k]; }
        if (c) say[c] = (say[c] || 0) + 1;
      });
      const e = Object.entries(say).sort((x, y) => y[1] - x[1]);
      if (e.length) { hopEslesen++; v.hop[e[0][0]] = (v.hop[e[0][0]] || 0) + 1; v.hopOlan++; }
    }
  })
  .on('close', bitir);

function med(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function baskin(o) { const e = Object.entries(o).sort((a, b) => b[1] - a[1]); if (!e.length) return null; const t = e.reduce((s, x) => s + x[1], 0); return { sinif: e[0][0], pay: Math.round(+(e[0][1] / t).toFixed(3) * 100) }; }

function bitir() {
  console.log('\n== KORPUS == gecerli=' + gecerli + ' hop-eslesen=' + hopEslesen + ' (%' + (100 * hopEslesen / gecerli).toFixed(1) + ')');

  const ABV_STIL = {}, HOP_STIL = {};
  stil.forEach((v, ad) => {
    if (v.abv.length) {
      const m = med(v.abv), b = abvBant(m);
      if (b) { let ay = 0; v.abv.forEach(x => { if (abvBant(x) === b) ay++; }); ABV_STIL[ad] = [b, Math.round(+(ay / v.abv.length).toFixed(3) * 100), +m.toFixed(2)]; }
    }
    const bh = baskin(v.hop);
    if (bh) HOP_STIL[ad] = [bh.sinif, bh.pay, v.hopOlan, v.n];
  });

  // KAPI 1: ABV kapsama + BJCP dogrulamasi
  const abvKapsam = STILAD.filter(a => ABV_STIL[a]).length;
  console.log('\n== KAPI 1 — ABV ==');
  console.log('  siniflanan stil: ' + abvKapsam + '/' + STILAD.length);
  if (abvKapsam !== STILAD.length) abort('ABV kapsama eksik');
  let icinde = 0, sapan = [];
  STILAD.forEach(ad => {
    const bj = BJCP[ad] && BJCP[ad].abv; if (!bj) return;
    const m = ABV_STIL[ad][2];
    if (m >= bj[0] - 0.7 && m <= bj[1] + 0.7) icinde++;
    else sapan.push(ad + ' korpus %' + m + ' vs BJCP %' + bj[0] + '-' + bj[1]);
  });
  console.log('  BJCP bandiyla ortusen: ' + icinde + '/' + (icinde + sapan.length));
  sapan.forEach(x => console.log('    SAPAN ' + x));
  if (icinde / (icinde + sapan.length) < 0.9) abort('ABV bantlari BJCP ile %90 altinda ortusuyor');
  const bantSay = {}; STILAD.forEach(a => { bantSay[ABV_STIL[a][0]] = (bantSay[ABV_STIL[a][0]] || 0) + 1; });
  console.log('  bant dagilimi: ' + JSON.stringify(bantSay));
  if (Object.keys(bantSay).length < 4) abort('4 ABV bandinin hepsi kullanilmiyor');

  // KAPI 2: HOP kapsama + olu sinif tespiti
  console.log('\n== KAPI 2 — HOP ==');
  const hopKapsam = STILAD.filter(a => HOP_STIL[a]).length;
  console.log('  siniflanan stil: ' + hopKapsam + '/' + STILAD.length);
  const hSay = {}; STILAD.forEach(a => { if (HOP_STIL[a]) hSay[HOP_STIL[a][0]] = (hSay[HOP_STIL[a][0]] || 0) + 1; });
  console.log('  sinif dagilimi (stil): ' + JSON.stringify(hSay));
  const oluSinif = AROMA_SIRA.filter(c => !hSay[c]);
  console.log('  HICBIR STILDE baskin olmayan sinif: ' + (oluSinif.join(', ') || 'yok') + '  -> cip listesine ALINMAZ');
  const enBuyuk = Math.max.apply(null, Object.values(hSay));
  console.log('  en buyuk sinifin payi: %' + Math.round(100 * enBuyuk / hopKapsam) + ' (>%70 olsaydi catch-all suphesi)');
  if (enBuyuk / hopKapsam > 0.7) abort('hop sinifi catch-all: tek sinif stillerin %70+i');
  const dusuk = STILAD.filter(a => HOP_STIL[a] && HOP_STIL[a][2] / HOP_STIL[a][3] < 0.4);
  console.log('  stil-ici recete kapsamasi <%40 olan stil: ' + dusuk.length + (dusuk.length ? ' -> ' + dusuk.join(' · ') : ''));

  // KAPI 3: BS sutunlari DEGISMEDI
  const KAR = {};
  STILAD.forEach(ad => {
    const k0 = KAR0[ad]; if (!k0) abort('BS tablosunda yok: ' + ad);
    const av = ABV_STIL[ad], hp = HOP_STIL[ad];
    KAR[ad] = [k0[0], k0[1], k0[2], k0[3], k0[4], k0[5], av ? av[0] : '', av ? av[1] : 0, hp ? hp[0] : '', hp ? hp[1] : 0];
  });
  let bsFark = 0;
  Object.keys(KAR).forEach(a => { for (let i = 0; i < 6; i++) if (KAR[a][i] !== KAR0[a][i]) bsFark++; });
  console.log('\n== KAPI 3 — BS/BQ1 SUTUNLARI ==');
  console.log('  maya/malt/tahil sutunlarinda degisiklik: ' + bsFark + ' (0 bekleniyor)');
  if (bsFark) abort('BS sutunlari degisti');

  // Ayirt edicilik
  let aA = 0, hA = 0;
  Object.keys(PS).forEach(k => {
    const sa = new Set(), sh = new Set();
    PS[k][1].forEach(x => { if (ABV_STIL[x[0]]) sa.add(ABV_STIL[x[0]][0]); if (HOP_STIL[x[0]]) sh.add(HOP_STIL[x[0]][0]); });
    if (sa.size >= 2) aA++; if (sh.size >= 2) hA++;
  });
  console.log('\n== AYIRT EDICILIK == ABV ' + aA + '/60 · HOP ' + hA + '/60  (maya 58, malt 46, tahil 18)');

  console.log('\n== ORNEKLER ==');
  ['Weizenbock', 'Tripel', 'Imperial / Russian Imperial Stout', 'Session Ale / Ordinary Bitter', 'Berliner Weisse',
    'American IPA', 'NEIPA / Hazy IPA', 'German Pils', 'Best Bitter', 'Weizen / Weissbier'].forEach(ad => {
      const k = KAR[ad]; if (!k) return;
      console.log('  ' + ad.padEnd(36) + 'abv=' + String(k[6]).padEnd(9) + '%' + String(k[7]).padEnd(4) + ' hop=' + String(k[8]).padEnd(10) + '%' + k[9]);
    });

  const satir = Object.keys(KAR).sort().map(a =>
    '  "' + a.replace(/"/g, '\\"') + '":["' + KAR[a][0] + '",' + KAR[a][1] + ',"' + KAR[a][2] + '",' + KAR[a][3] +
    ',"' + KAR[a][4] + '",' + KAR[a][5] + ',"' + KAR[a][6] + '",' + KAR[a][7] + ',"' + KAR[a][8] + '",' + KAR[a][9] + ']');
  const js = '// BT: [maya,%,malt,%,tahil,%,abv,%,hop,%] — abv OG-tabanli (%75 AA varsayimi), hop HOPLAR[].mo v2\n' +
    'window._PROFIL_KARAKTER = {\n' + satir.join(',\n') + '\n};\n' +
    '// HOP cip listesi: hicbir stilde baskin olmayan sinif(lar) DISARIDA: ' + (oluSinif.join(',') || 'yok') + '\n' +
    'window._BT_HOP_SIRA = ' + JSON.stringify(AROMA_SIRA.filter(c => hSay[c])) + ';\n';
  const cikti = process.argv[2] || path.join(KOK, '_bt_karakter_out.js');
  fs.writeFileSync(cikti, js, 'utf8');
  console.log('\n[yaz] ' + cikti + ' — ' + js.length + ' bayt, ' + satir.length + ' stil');
}
