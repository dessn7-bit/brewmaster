#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT V1b — A KATMANI: dataset-medyan iskelet çıkarımı (BUILD-TIME script)
//
// _ground_truth_v2.json (199 katalog-eşlenmiş reçete) → verisi GÜÇLÜ slug'lar
// için medyan iskelet üretir, V1a STIL_ISKELET formatında STATİK tablo çıktılar.
// Sonuç HTML'e gömülür — runtime'da dataset YÜKLENMEZ (dataset deploy edilmiyor).
//
// VERİ-DÜRÜSTLÜK KURALLARI:
//  • EŞİK n>=5: medyanın çevresinde gerçek çoğunluk penceresi olsun; mod (maya/
//    hop) 2-2 bağları azalsın. n=1-2 çıkarımı = tek reçete kopyalamak, YASAK.
//  • KÜRATÖRLÜ KAZANIR: stil V1a STIL_ISKELET'te varsa atlanır (elle doğrulanmış
//    > otomatik medyan). V1b yalnız YENİ stil ekler.
//  • GRIST = percents uzmanlık-aile medyanları (>=%2 tutulur) + baz = 100-kalan.
//    DİKKAT: pilsnerPct TÜRETİLMİŞ ML özniteliği (pilsner+`0.8×base` hipotezi
//    yalnız 160/199 tutuyor) → KULLANILMAZ. maltIds HAM AD (katalog-ID değil,
//    285 benzersiz — V2 parser işi) → yalnız crystal lovibond + baz tipi için
//    hafif regex ile okunur.
//  • CRYSTAL temsilcisi: ham adlardan lovibond medyanı → en yakın canlı cXX.
//  • HOP: alias-normalize → en-sık = 'aci' 60dk; 2. en-sık (n>=2) = 'aroma' 10dk
//    (gL: ibuMid>=40 → 1.0, değilse 0.5). dhPer10L medyanı >0 ise 'kuru'.
//    Dataset zamanlama/gramaj taşımıyor → süreler konvansiyon (60/10/dry).
//  • MAYA: boş-olmayan mayaId modu. us05 JENERİK-KOVA artefaktı düzeltmesi:
//    _yeast_raw çoğunluğu (>=%60) İngiliz suşu gösteriyorsa → s04 (kanıt loglanır).
//  • MAYA-TİP KAPISI: mod mayanın katalog tip'i stil ailesiyle çelişirse
//    (lager maya × ale stili vb.) örneklem stil-temsili DEĞİL → slug DÜŞER.
//  • TUTARLILIK KAPISI: HTML'den dilimlenen GERÇEK hOG/hIBU/hSRM +
//    _stilIskeletHesap ile OG/IBU/SRM ∈ BJCP aralığı. Aralık-dışı → slug DÜŞER
//    (sahte iskelet commit'lenmez; medyan garanti değil, tek koruma bu kapı).
//
// Kullanım: node _v1b_cikarim.js   → rapor stdout + iskelet JS satırları
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const vm = require('vm');

const ESIK = 5;          // slug başına asgari reçete sayısı
const FAM_MIN = 2;       // uzmanlık ailesi asgari medyan % (altı gürültü/yuvarlama)
const HACIM = 11, VERIM = 61; // kapı koşulları (V1a gate ile aynı)

// ── 1. HTML'den canlı motor + katalog + otorite dilimle (vm sandbox) ──
const html = fs.readFileSync(__dirname + '/Brewmaster_v2_79_10.html', 'utf8');
function dilim(re) { const m = html.match(re); if (!m) throw new Error('dilim bulunamadı: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console, KATKILAR: [], BM_SIVI_GML: 1.3 });
let src = '';
// const → implicit global (ctx'ten erişilebilir + mutasyona açık)
[/const MALTLAR=\[[\s\S]*?\n\];/, /const HOPLAR=\[[\s\S]*?\n\];/, /const MAYALAR=\[[\s\S]*?\n\];/,
 /const BJCP = \{[\s\S]*?\n\};/, /const SLUG_TO_BJCP = \{[\s\S]*?\n\};/, /const STIL_ISKELET = \{[\s\S]*?\n\};/
].forEach(re => { src += dilim(re).replace('const ', '') + '\n'; });
[/function tin\([\s\S]*?\n\}/, /function whFaktor\([\s\S]*?\n\}/, /function hFormFaktor\([\s\S]*?\n\}/,
 /function hOG\(ml,v,katkilar,hacim\)\{[\s\S]*?\n\}/, /function hSRM\(ml,katkilar,hacim\)\{[\s\S]*?\n\}/,
 /function hIBU\(hl,og,hacim,katkilar\)\{[\s\S]*?\n\}/, /window\._stilIskeletHesap = function[\s\S]*?\n\};/
].forEach(re => { src += dilim(re) + '\n'; });
vm.runInContext(src, ctx);
const { MALTLAR, HOPLAR, MAYALAR, BJCP, SLUG_TO_BJCP, STIL_ISKELET } = ctx;
console.log('[dilim] MALT=' + MALTLAR.length + ' HOP=' + HOPLAR.length + ' MAYA=' + MAYALAR.length +
  ' BJCP=' + Object.keys(BJCP).length + ' kuratorlu=' + Object.keys(STIL_ISKELET).length);

// ── 2. Dataset yükle + slug grupla ──
const gt = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2.json', 'utf8')).records;
const bySlug = {};
gt.forEach(r => { (bySlug[r.expected_slug] = bySlug[r.expected_slug] || []).push(r); });
const tumSlug = Object.entries(bySlug).sort((a, b) => b[1].length - a[1].length);
const gecen = tumSlug.filter(([, v]) => v.length >= ESIK);
const altta = tumSlug.filter(([, v]) => v.length < ESIK);
console.log('[eşik n>=' + ESIK + '] geçen ' + gecen.length + ' slug: ' +
  gecen.map(([s, v]) => s + '(' + v.length + ')').join(', '));
console.log('[eşik-altı] ' + altta.length + ' slug (n=4: ' +
  altta.filter(([, v]) => v.length === 4).map(([s]) => s).join(', ') + ' | n<=3: ' +
  altta.filter(([, v]) => v.length <= 3).length + ' adet) → çıkarım YAPILMADI (C katmanı / ileride V2 parser)');

// ── 3. slug → BJCP adı çözümü ──
// SLUG_TO_BJCP (78 canlı tablo) öncelikli; v2-dataset'e özgü slug'lar için açık ek
// tablo (her giriş gerekçeli). Genel fallback: birebir ad eşleşmesi (case-insens).
const SLUG_EK = {
  // med OG 1.051 + IBU 39 → BJCP 'Czech Premium Pale Lager' aralığı (1.044-1.060, 30-45);
  // 'Czech Pale Lager' (session, OG<=1.044) verilere UYMAZ. BA 'Czech Pale Lager' adı = BJCP Premium.
  czech_pale_lager: 'Czech Premium Pale Lager',
  west_coast_india_pale_ale: 'West Coast IPA',
  american_barley_wine_ale: 'American Barleywine',
  english_brown_ale: 'English Brown Ale',
  sweet_stout_or_cream_stout: 'Milk Stout / Sweet Stout',
  pumpkin_squash_beer: null // BJCP'de jenerik pumpkin stili YOK (yalnız Pumpkin Stout) + katkı-tanımlı specialty → çıkarım temsil etmez
};
function bjcpAdi(slug) {
  if (SLUG_TO_BJCP[slug]) return SLUG_TO_BJCP[slug];
  if (slug in SLUG_EK) return SLUG_EK[slug];
  const norm = slug.replace(/_/g, ' ').toLowerCase();
  return Object.keys(BJCP).find(k => k.toLowerCase() === norm) || null;
}

// ── 4. hop alias → canlı katalog ID ──
const HOP_ALIAS = {
  tettnang: 'tettn', german_tettnang: 'tettn', hallertau: 'hrtau',
  hallertau_hersbrucker: 'hrtau', // Hallertau bölge ailesi; katalogda ayrı Hersbrucker çeşidi yok
  hallertau_mittelfrueh: 'mittelf', hallertau_tradition: 'tradition',
  northern_brewer: 'nbrewer', german_northern_brewer: 'nbrewer',
  centennial: 'centn', fuggle: 'fuggles', us_fuggles: 'fuggles', uk_fuggle: 'fuggles',
  goldings: 'ekg', golding: 'ekg', czech_saaz: 'saaz', german_magnum: 'magnum',
  german_perle: 'perle', mt_hood: null, mount_hood: null // katalogda yok
};
function hopId(ad) {
  const t = HOP_ALIAS.hasOwnProperty(ad) ? HOP_ALIAS[ad] : ad;
  return (t && HOPLAR.find(h => h && h.id === t)) ? t : null;
}
const hopToplamFrek = {}; // bağ-kırıcı: tüm dataset frekansı
gt.forEach(r => (r.recipe.hopIds || []).forEach(h => { const id = hopId(h); if (id) hopToplamFrek[id] = (hopToplamFrek[id] || 0) + 1; }));

// ── 5. uzmanlık aile → canlı katalog temsilci malt ──
const FAM_MAP = {
  munichPct: 'munich', viennaPct: 'vienna', wheatPct: 'wheat', oatsPct: 'oat',
  chocPct: 'choc', roastPct: 'roast', aromaticMunichPct: 'aromatic',
  aromaticAbbeyMunichPct: 'specb', crystalPct: 'CRYSTAL', // lovibond-medyanla çözülür
  smokedPct: null, ryePct: null, adjPct: null // temsilci eşleme yok → aile >=%2 ise slug düşer (uydurma yok)
};
const CRYSTAL_SECENEK = [10, 20, 40, 60, 80, 120]; // canlı c10..c120
function med(a) { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }

// İngiliz suşu jenerik-kova (us05) artefakt düzeltmesi kanıt regex'i.
// DİKKAT: suşlar TEK TEK sayılır — wy10\d\d gibi geniş desen WY1056'yı (Amerikan
// Chico) İngiliz sanır (ilk koşuda yakalanan gerçek hata). WY İngiliz aile:
// 1028 London, 1084 Irish, 1098 British, 1099 Whitbread, 1187 Ringwood,
// 1275 Thames, 1318 London III, 1469 West Yorkshire, 1968 London ESB.
const ENG_RE = /wy1(028|084|098|099|187|275|318|469|968)|wlp0(02|05|07|13|17|22|23|26)|s-04|whitbread|london|burton|english|irish ale|scottish|pub/i;

// ── 6. slug başına çıkarım ──
const adaylar = {}, dusen = [], kuratorKazandi = [];
gecen.forEach(([slug, rs]) => {
  const n = rs.length;
  const ad = bjcpAdi(slug);
  if (!ad || !BJCP[ad]) { dusen.push(slug + '(n=' + n + '): BJCP hedef stili yok'); return; }
  if (STIL_ISKELET[ad]) { kuratorKazandi.push(slug + ' → "' + ad + '" (n=' + n + ')'); return; }
  if (adaylar[ad]) { dusen.push(slug + ': "' + ad + '" başka slug\'dan zaten çıkarıldı'); return; }
  const bj = BJCP[ad];

  // 6a. MAYA: mod + İngiliz-artefakt düzeltmesi + tip kapısı
  const mf = {}; rs.forEach(r => { if (r.recipe.mayaId) mf[r.recipe.mayaId] = (mf[r.recipe.mayaId] || 0) + 1; });
  let mayaId = Object.entries(mf).sort((a, b) => b[1] - a[1]).map(([k]) => k)[0] || '';
  if (mayaId === 'us05') {
    const engN = rs.filter(r => ENG_RE.test(r.recipe._yeast_raw || '')).length;
    if (engN / n >= 0.6) {
      console.log('[maya-düzeltme] ' + slug + ': mod us05 jenerik-kova, _yeast_raw ' + engN + '/' + n + ' İngiliz suşu → s04');
      mayaId = 's04';
    }
  }
  const mayaObj = MAYALAR.find(m => m && m.id === mayaId);
  if (!mayaObj) { dusen.push(slug + ': maya modu katalogda yok (' + mayaId + ')'); return; }
  const lagerBekle = /lager|pils|bock|märzen|marzen|oktoberfest|festbier|schwarz|keller|dortmund|dunkel|rauch/i.test(ad);
  const hibrit = /kölsch|kolsch|altbier|california common|cream ale/i.test(ad);
  if (!hibrit) {
    if (lagerBekle && mayaObj.tip !== 'lager') { dusen.push(slug + ' → "' + ad + '": MAYA-TİP çelişkisi (lager stili × ' + mayaObj.tip + ' maya modu) → örneklem temsili değil'); return; }
    if (!lagerBekle && mayaObj.tip === 'lager') { dusen.push(slug + ' → "' + ad + '": MAYA-TİP çelişkisi (ale stili × lager maya modu ' + mayaId + ') → örneklem temsili değil'); return; }
  }

  // 6b. GRIST: uzmanlık aile medyanları
  const fam = {};
  Object.keys(FAM_MAP).forEach(f => { const m = med(rs.map(r => +(r.recipe.percents[f] || 0))); if (m >= FAM_MIN) fam[f] = m; });
  // adjPct = corn+rice+sugar toplamı (199/199 doğrulandı) — temsilcisiz aile varsa düş
  const eslenemez = Object.keys(fam).filter(f => !FAM_MAP[f]);
  if (eslenemez.length) { dusen.push(slug + ': temsilcisiz aile >= %' + FAM_MIN + ' (' + eslenemez.join(',') + ') — uydurma yok'); return; }
  // crystal lovibond medyanı ham adlardan
  let crystalId = null;
  if (fam.crystalPct) {
    const lovs = [];
    rs.forEach(r => (r.recipe.maltIds || []).forEach(mn => {
      const m = /(?:crystal|caramel|caramalt|cara)[^0-9]{0,12}(\d{2,3})\s*l?\b/i.exec(mn);
      if (m && !/carapils|caraf/i.test(mn)) lovs.push(+m[1]);
    }));
    const lv = lovs.length ? med(lovs) : 60; // ad parse edilemezse orta-bant konvansiyon
    crystalId = 'c' + CRYSTAL_SECENEK.reduce((a, b) => Math.abs(b - lv) < Math.abs(a - lv) ? b : a);
    console.log('[crystal] ' + slug + ': lovibond örnekleri [' + lovs.join(',') + '] → medyan ' + lv + ' → ' + crystalId);
  }
  // baz tipi: kayıtların çoğunda pilsner-adlı baz → pilsner; İngiliz stili → maris; değilse pale_ale
  const pilsN = rs.filter(r => (r.recipe.maltIds || []).some(mn => /pilsner|pilsen|\bpils\b/i.test(mn))).length;
  const bazId = (pilsN > n / 2) ? 'pilsner' : (/english|british|london|irish|scottish|bitter|\besb\b|mild/i.test(ad) ? 'maris' : 'pale_ale');
  const famPct = {}; let uzTop = 0;
  Object.entries(fam).forEach(([f, v]) => { const p = Math.round(v); famPct[f === 'crystalPct' ? crystalId : FAM_MAP[f]] = p; uzTop += p; });
  if (uzTop >= 60) { dusen.push(slug + ': uzmanlık aileleri %' + uzTop + ' — baz malt azınlıkta, çıkarım şüpheli'); return; }
  const grist = [[bazId, 100 - uzTop]].concat(Object.entries(famPct).sort((a, b) => b[1] - a[1]));

  // 6c. HOP: alias-normalize frekans; en-sık=aci, 2.(n>=2)=aroma, dh medyanı>0=kuru
  const hf = {};
  rs.forEach(r => { const seen = new Set(); (r.recipe.hopIds || []).forEach(h => { const id = hopId(h); if (id && !seen.has(id)) { seen.add(id); hf[id] = (hf[id] || 0) + 1; } }); });
  const sirali = Object.entries(hf).sort((a, b) => (b[1] - a[1]) || ((hopToplamFrek[b[0]] || 0) - (hopToplamFrek[a[0]] || 0)) || a[0].localeCompare(b[0]));
  if (!sirali.length) { dusen.push(slug + ': katalog-eşlenebilir hop yok'); return; }
  const ibuMid = (bj.ibu[0] + bj.ibu[1]) / 2;
  const hop = [{ id: sirali[0][0], dk: 60, rol: 'aci' }];
  if (sirali[1] && sirali[1][1] >= 2) hop.push({ id: sirali[1][0], dk: 10, rol: 'aroma', gL: ibuMid >= 40 ? 1 : 0.5 });
  const dhMed = med(rs.map(r => +(r.recipe.dhPer10L || 0)));
  if (dhMed > 0) hop.push({ id: (sirali[1] && sirali[1][1] >= 2 ? sirali[1][0] : sirali[0][0]), rol: 'kuru', gL: +(dhMed / 10).toFixed(1) });

  adaylar[ad] = { slug, n, entry: { grist, hop, mayaId, mashSc: 67, kaynak: 'cikarim', n } };
  console.log('[aday] ' + slug + ' → "' + ad + '" (n=' + n + '): baz=' + bazId + ' grist=' + JSON.stringify(grist) +
    ' hop=' + hop.map(h => h.id + '/' + h.rol).join(',') + ' maya=' + mayaId);
});

// ── 7. TUTARLILIK KAPISI: gerçek _stilIskeletHesap + hOG/hIBU/hSRM ──
const final = {};
Object.entries(adaylar).forEach(([ad, { slug, n, entry }]) => {
  ctx.STIL_ISKELET[ad] = entry; // geçici — gerçek motor bu tabloyu okur
  const r = ctx.window._stilIskeletHesap(ad, HACIM, VERIM);
  delete ctx.STIL_ISKELET[ad];
  if (!r || !r.malts || !r.malts.length) { dusen.push(slug + ' → "' + ad + '": _stilIskeletHesap null'); return; }
  const bj = BJCP[ad];
  const og = ctx.hOG(r.malts, VERIM, [], HACIM);
  const ibu = ctx.hIBU(r.hops, og, HACIM, []);
  const srm = ctx.hSRM(r.malts, [], HACIM);
  const hata = [];
  if (!(og >= bj.og[0] && og <= bj.og[1])) hata.push('OG=' + og.toFixed(3) + '∉[' + bj.og + ']');
  if (!(ibu >= bj.ibu[0] && ibu <= bj.ibu[1])) hata.push('IBU=' + Math.round(ibu) + '∉[' + bj.ibu + ']');
  if (!(srm >= bj.srm[0] && srm <= bj.srm[1])) hata.push('SRM=' + srm + '∉[' + bj.srm + ']');
  const pctSum = entry.grist.reduce((a, g) => a + g[1], 0);
  if (Math.abs(pctSum - 100) > 0.01) hata.push('grist%=' + pctSum);
  if (hata.length) { dusen.push(slug + ' → "' + ad + '" KAPI DÜŞTÜ: ' + hata.join(' ')); return; }
  final[ad] = { slug, n, entry, kanit: { og: +og.toFixed(3), ibu: Math.round(ibu), srm } };
  console.log('[KAPI PASS] "' + ad + '" (n=' + n + '): OG=' + og.toFixed(3) + '[' + bj.og + '] IBU=' + Math.round(ibu) + '[' + bj.ibu + '] SRM=' + srm + '[' + bj.srm + ']');
});

// ── 8. rapor + çıktı ──
console.log('\n════ SONUÇ ════');
console.log('küratörlü kazandı (V1a öncelik): ' + (kuratorKazandi.join(' | ') || 'yok'));
console.log('düşen: ' + (dusen.map(d => '\n  ✗ ' + d).join('') || 'yok'));
console.log('V1b eklenen: ' + Object.keys(final).length + ' stil → ' + Object.keys(final).map(a => '"' + a + '"(n=' + final[a].n + ')').join(', '));
// V1a satır formatında JS çıktısı
function jsSatir(ad, e) {
  const grist = '[' + e.grist.map(g => "['" + g[0] + "'," + g[1] + ']').join(',') + ']';
  const hop = '[' + e.hop.map(h => '{id:\'' + h.id + '\'' + (h.dk != null ? ',dk:' + h.dk : '') + ',rol:\'' + h.rol + '\'' + (h.gL != null ? ',gL:' + h.gL : '') + '}').join(',') + ']';
  return '  ' + (JSON.stringify(ad) + ':').padEnd(33) + '{grist:' + grist + ', hop:' + hop + ", mayaId:'" + e.mayaId + "', mashSc:" + e.mashSc + ", kaynak:'cikarim', n:" + e.n + '}';
}
const satirlar = Object.keys(final).map(ad => jsSatir(ad, final[ad].entry));
console.log('\n──── HTML STIL_ISKELET eki (V1b bloğu) ────');
console.log(satirlar.join(',\n'));
const out = { esik: ESIK, eklenen: Object.keys(final).map(ad => ({ ad, ...final[ad] })), dusen, kuratorKazandi, satirlar };
const outYol = process.env.V1B_OUT || (__dirname + '/_v1b_sonuc.json');
fs.writeFileSync(outYol, JSON.stringify(out, null, 1));
console.log('\n[yazıldı] ' + outYol);
