// ═══ SPRINT BT — ABV/GÜÇ + HOP KARAKTERİ ÖLÇÜMÜ (karar VERİYLE verilir) ═══
//
// SORU 1: ABV korpustan OG üzerinden türetilebilir mi? Kapsama ne? Bantlar
//         BJCP stil bantlarıyla doğrulanıyor mu?
// SORU 2: hop aroma karakteri türetilebilir mi? Katalogda alan var mı?
//         Kapsama RECETE düzeyinde ne, STİL düzeyinde ne? (ikisi farklı şey)
//
// Kullanım: node _bt_olcum.js
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
  dilim(/window\._BR_STILAD = \[[\s\S]*?\];/) + '\n' +
  dilim(/window\._PROFIL_STIL = \{[\s\S]*?\n\};/), ctx);
const BJCP = ctx.BJCP, HOPLAR = ctx.HOPLAR, STILAD = ctx.window._BR_STILAD, PS = ctx.window._PROFIL_STIL;
console.log('[dilim] BJCP=' + Object.keys(BJCP).length + ' HOPLAR=' + HOPLAR.length + ' matris-stil=' + STILAD.length);

// ── HOP AROMA SINIFLANDIRICI: kaynak = HOPLAR[].mo (uygulamanın kendi kürate
// ettiği aroma tanımı; üretici/YCH tanımlarından bu repoda derlenmiş).
// Anahtar kelimeler TANIM METNİNDEN gelir, uydurulmaz.
const AROMA_RE = {
  narenciye: /sitrus|limon|greyfurt|portakal|misket|lime|mandalina|bergamot|narenciye/i,
  tropik: /tropik|mango|passion|çarkıfelek|ananas|kavun|şeftali|guava|papaya|hindistan cevizi|armut|kayısı|üzüm|frenk üzümü|böğürtlen|karpuz|ç.rek otu|meyve/i,
  camsi: /çam|reçine|dank|katran|kozalak|iğne yaprak/i,
  cicek: /çiçek|floral|gül|lavanta|yasemin|hanımeli|parfüm/i,
  otsu: /bitkisel|otsu|toprak|çimen|çayır|herbal|saman|tütün|ahşap|odunsu|nane|çay|noble|asil/i,
  baharat: /baharat|biber|karanfil|anason|tarçın|zencefil|kekik|adaçayı|kimyon/i
};
const AROMA_SIRA = ['narenciye', 'tropik', 'camsi', 'cicek', 'otsu', 'baharat'];
// v1 ("en cok gecen kelime") DENENDI ve REDDEDILDI: 'cicek' 73 stilin
// 52'sinde baskin cikti = catch-all imzasi (BQ1 dersi). Sebep: 'cicek' hop
// tanimlarinda ikincil not olarak her yerde geciyor.
// v2: metinde ILK gecen tanimlayici kazanir — katalog yazari BIRINCIL notu
// basa yazar, yani siralamanin kendisi kaynagin bilgisidir. Uydurma yok.
function hopSinif(mo) {
  if (!mo) return null;
  var en = null, enIx = 1e9;
  AROMA_SIRA.forEach(function(c){ var m = String(mo).match(AROMA_RE[c]); if (m && m.index < enIx) { enIx = m.index; en = c; } });
  return en;
}
// hop adı → sınıf haritası (normalize edilmiş ad)
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
const HOP_SINIF = {}; const hopSinifSay = {};
let siniflanmayan = [];
HOPLAR.forEach(hp => {
  const c = hopSinif(hp.mo);
  if (c) { HOP_SINIF[norm(hp.ad)] = c; hopSinifSay[c] = (hopSinifSay[c] || 0) + 1; }
  else siniflanmayan.push(hp.ad);
});
console.log('\n== HOP KATALOĞU SINIFLANDIRMASI (kaynak: HOPLAR[].mo) ==');
console.log('  ' + HOPLAR.length + ' hoptan ' + Object.keys(HOP_SINIF).length + ' tanesi sınıflandı');
console.log('  dağılım: ' + JSON.stringify(hopSinifSay));
if (siniflanmayan.length) console.log('  sınıflanamayan: ' + siniflanmayan.join(' · '));
console.log('  örnek: ' + HOPLAR.slice(0, 8).map(x => x.ad + '→' + (HOP_SINIF[norm(x.ad)] || '-')).join(' · '));

const M = JSON.parse(fs.readFileSync(SLUG, 'utf8'));
const KATCH = new Set(M.katchall);

// ── ABV bantları (brief) ───────────────────────────────────────────────
const ABV_BANT = [['hafif', 0, 4.5], ['orta', 4.5, 6.5], ['guclu', 6.5, 9], ['cokguclu', 9, 99]];
function abvBant(a) { for (const b of ABV_BANT) if (a >= b[1] && a < b[2]) return b[0]; return null; }
// OG → ABV: FG KULLANILMAZ (dataset FG'sinin %91,9'u türetilmiş).
// Tek ve AÇIK varsayım: %75 görünür attenuation → ABV = (OG-1)*1000 * 0.0984
const OG2ABV = og => (og - 1) * 1000 * 0.0984;

let hdr = null, ix = {}, n = 0, gecerli = 0;
let ogYok = 0, abvKolonVar = 0, hopAromaVar = 0, hopAllVar = 0, hopEslesen = 0;
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
    if (!v) { v = { n: 0, abv: [], abvKolon: [], hopSay: {}, hopOlan: 0, hopAromaOlan: 0 }; stil.set(ad, v); }
    v.n++;
    if (!(og > 1.005)) ogYok++; else v.abv.push(OG2ABV(og));
    const ak = g('abv'); if (ak > 0) { abvKolonVar++; v.abvKolon.push(ak); }
    // HOP: once hop_aroma (aroma eklemesi), yoksa hop_all
    const ha = a[ix.hop_aroma] || '', hall = a[ix.hop_all] || '';
    if (ha) hopAromaVar++;
    if (hall) hopAllVar++;
    const kaynak = ha || hall;
    if (kaynak) {
      const parcalar = kaynak.split(/[,;|]/).map(x => norm(x)).filter(Boolean);
      const say = {};
      parcalar.forEach(p => {
        let c = HOP_SINIF[p];
        if (!c) { const k = Object.keys(HOP_SINIF).find(h => h.length > 3 && (p.indexOf(h) >= 0 || h.indexOf(p) >= 0)); if (k) c = HOP_SINIF[k]; }
        if (c) say[c] = (say[c] || 0) + 1;
      });
      const e = Object.entries(say).sort((x, y) => y[1] - x[1]);
      if (e.length) { hopEslesen++; v.hopSay[e[0][0]] = (v.hopSay[e[0][0]] || 0) + 1; v.hopOlan++; if (ha) v.hopAromaOlan++; }
    }
  })
  .on('close', bitir);

function med(arr) { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }
function baskin(o) { const e = Object.entries(o).sort((a, b) => b[1] - a[1]); if (!e.length) return null; const t = e.reduce((s, x) => s + x[1], 0); return { sinif: e[0][0], pay: Math.round(+(e[0][1] / t).toFixed(3) * 100) }; }

function bitir() {
  console.log('\n== KORPUS ==');
  console.log('okunan=' + n + ' gecerli=' + gecerli);

  // ── ABV ───────────────────────────────────────────────────────────────
  console.log('\n== ABV KAPSAMA ==');
  console.log('  OG tabanli turetilebilen: ' + (gecerli - ogYok) + '/' + gecerli + ' = %' + (100 * (gecerli - ogYok) / gecerli).toFixed(2));
  console.log('  korpusun kendi abv kolonu dolu: ' + abvKolonVar + ' = %' + (100 * abvKolonVar / gecerli).toFixed(2) + ' (BILGI: bu kolon FG turevi, KULLANILMIYOR)');
  const ABV_STIL = {}; let bantSay = {};
  stil.forEach((v, ad) => {
    if (!v.abv.length) return;
    const m = med(v.abv), b = abvBant(m);
    if (!b) return;
    // baskinlik: recetelerinin yuzde kaci ayni bantta
    let ayni = 0; v.abv.forEach(x => { if (abvBant(x) === b) ayni++; });
    ABV_STIL[ad] = [b, Math.round(+(ayni / v.abv.length).toFixed(3) * 100), +m.toFixed(2)];
    bantSay[b] = (bantSay[b] || 0) + 1;
  });
  console.log('  siniflanan stil: ' + Object.keys(ABV_STIL).filter(a => STILAD.indexOf(a) >= 0).length + '/' + STILAD.length);
  console.log('  bant dagilimi (stil): ' + JSON.stringify(bantSay));

  console.log('\n== ABV BANTLARININ BJCP ILE DOGRULANMASI ==');
  // KAPI: stilin korpus-medyan ABV'si BJCP'nin kendi ABV bandiyla ORTUSMELI
  let icinde = 0, disinda = [], bjcpYok = 0;
  STILAD.forEach(ad => {
    const t = ABV_STIL[ad]; if (!t) return;
    const bj = BJCP[ad] && BJCP[ad].abv;
    if (!bj) { bjcpYok++; return; }
    const m = t[2];
    if (m >= bj[0] - 0.7 && m <= bj[1] + 0.7) icinde++;
    else disinda.push(ad + ': korpus %' + m + ' vs BJCP %' + bj[0] + '-' + bj[1] + ' (bant: ' + t[0] + ')');
  });
  console.log('  BJCP bandiyla ortusen (±0,7 tolerans): ' + icinde + '/' + (icinde + disinda.length));
  disinda.forEach(x => console.log('    SAPAN ' + x));
  console.log('\n  ORNEK STILLER:');
  ['Weizenbock', 'Tripel', 'Imperial / Russian Imperial Stout', 'American Barleywine', 'Belgian Quadrupel / Abt',
    'Session Ale / Ordinary Bitter', 'Berliner Weisse', 'American Lager / Light Lager', 'English Mild / Dark Mild',
    'American IPA', 'American Pale Ale', 'Weizen / Weissbier'].forEach(ad => {
      const t = ABV_STIL[ad], bj = BJCP[ad] && BJCP[ad].abv;
      console.log('    ' + ad.padEnd(38) + (t ? (t[0] + ' (medyan %' + t[2] + ', baskinlik %' + t[1] + ')').padEnd(42) : 'YOK'.padEnd(42)) + (bj ? 'BJCP %' + bj[0] + '-' + bj[1] : ''));
    });

  // ── HOP ───────────────────────────────────────────────────────────────
  console.log('\n== HOP KAPSAMA (RECETE duzeyi) ==');
  console.log('  hop_aroma alani dolu: ' + hopAromaVar + ' = %' + (100 * hopAromaVar / gecerli).toFixed(1));
  console.log('  hop_all alani dolu:   ' + hopAllVar + ' = %' + (100 * hopAllVar / gecerli).toFixed(1));
  console.log('  hop adi KATALOGLA eslesip siniflanan: ' + hopEslesen + ' = %' + (100 * hopEslesen / gecerli).toFixed(1));

  const HOP_STIL = {}; let hopBantSay = {}, dusukKapsam = [];
  stil.forEach((v, ad) => {
    const b = baskin(v.hopSay);
    if (!b) return;
    HOP_STIL[ad] = [b.sinif, b.pay, v.hopOlan, v.n];
    hopBantSay[b.sinif] = (hopBantSay[b.sinif] || 0) + 1;
    if (v.hopOlan / v.n < 0.4) dusukKapsam.push(ad + ' (%' + Math.round(100 * v.hopOlan / v.n) + ')');
  });
  console.log('\n== HOP KAPSAMA (STIL duzeyi — suzgec BU duzeyde calisir) ==');
  const stilKapsanan = STILAD.filter(a => HOP_STIL[a]);
  console.log('  siniflanan stil: ' + stilKapsanan.length + '/' + STILAD.length + ' = %' + (100 * stilKapsanan.length / STILAD.length).toFixed(1));
  console.log('  sinif dagilimi: ' + JSON.stringify(hopBantSay));
  console.log('  stil-ici recete kapsamasi <%40 olan: ' + dusukKapsam.length + (dusukKapsam.length ? ' -> ' + dusukKapsam.slice(0, 10).join(' · ') : ''));
  console.log('\n  ORNEK STILLER (beklenen aroma):');
  ['American IPA', 'NEIPA / Hazy IPA', 'German Pils', 'Kölsch', 'Best Bitter', 'Saison / Farmhouse Ale',
    'Czech Premium Pale Lager', 'English IPA', 'Weizen / Weissbier', 'Imperial IPA / DIPA'].forEach(ad => {
      const t = HOP_STIL[ad];
      console.log('    ' + ad.padEnd(38) + (t ? t[0] + ' %' + t[1] + '  (stilin %' + Math.round(100 * t[2] / t[3]) + "'inde hop verisi)" : 'VERI YOK'));
    });
  // AYIRT EDICILIK
  let hAyiran = 0, aAyiran = 0;
  Object.keys(PS).forEach(k => {
    const sh = new Set(), sa = new Set();
    PS[k][1].forEach(x => { if (HOP_STIL[x[0]]) sh.add(HOP_STIL[x[0]][0]); if (ABV_STIL[x[0]]) sa.add(ABV_STIL[x[0]][0]); });
    if (sh.size >= 2) hAyiran++;
    if (sa.size >= 2) aAyiran++;
  });
  console.log('\n== AYIRT EDICILIK (60 kova top-6) ==');
  console.log('  ABV >=2 sinif ayiran kova: ' + aAyiran + '/60');
  console.log('  HOP >=2 sinif ayiran kova: ' + hAyiran + '/60   (emsal: maya 58, malt 46, tahil 18)');

  fs.writeFileSync(path.join(KOK, '_bt_olcum_out.json'),
    JSON.stringify({ ABV_STIL, HOP_STIL, hopEslesenOran: hopEslesen / gecerli }, null, 0), 'utf8');
  console.log('\n[yaz] _bt_olcum_out.json');
}
