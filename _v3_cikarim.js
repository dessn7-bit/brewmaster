#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT AL — V3 ÇIKARIM: 376K korpustan iskelet üretimi (BUILD-TIME)
//
// AMAÇ: Sprint AK'nın yan çıktısı olan "n>=200, BJCP var, iskeleti YOK" adaylarını
// gerçek iskelete çevir → stilden-reçete kapsamasını %64'ten yukarı taşı; AK profil
// seçicisindeki "🎯 Hedef yap" satırları "📋 Doldur"a dönsün.
//
// BORU HATTI: Sprint V2'nin (_v2_parser.js) deterministik + maya-tip disiplinli
// hattı AYNEN kullanılır — require ile (V2'de require.main guard'ı var, CLI koşmaz).
// Alias tabloları, maya-tip sınıflandırıcı, aile konsolidasyonu, renk kalibrasyonu,
// intNudge ve tutarlılık kapısı YENİDEN YAZILMADI. V3'ün eklediği tek şey: farklı
// ve ÇOK daha büyük korpus (376.810 kayıt) + o korpusun sağladığı iki veri avantajı.
//
// VERİ AVANTAJI 1 — CRYSTAL SAYIYLA: korpusta malt satırlarının %88.6'sında `color`
//   (°L) dolu. V2'de crystal seçimi ad-regex'ine bağlıydı ve "caramel malt 40l" /
//   "2-row caramel malt 60l" / "carared" gibi varyantlar SESSİZCE düşüyordu
//   (V2 dersi: "unutulan alias = sessiz kayıp"). V3 crystal ailesini SAYIYLA çözer.
// VERİ AVANTAJI 2 — GERÇEK HACİM: korpusta `batch_size_l` var → aroma/kuru hop g/L
//   reçetenin KENDİ hacminden hesaplanır (V2'de 5-gal konvansiyonu varsayılıyordu).
//
// ÜÇ KATMANLI KORUMA (V2 ile aynı sıra; kapı maya-tip hatasını GÖRMEZ):
//   Katman 1 (ÖN-FİLTRE):  baskın maya-tipi tut, KNOWN-azınlığı havuzdan çıkar
//   Katman 2 (HOMOJENLİK): baskınlık >=%60 değilse ERTELE; n eşikleri (aşağıda)
//   Katman 3 (STİL-AİLE):  lager stili × ale maya (veya tersi) → DÜŞÜR
//   Son savunma (KAPI):    _stilIskeletHesap + hOG/hIBU/hSRM ∈ BJCP + ID canlı
//
// EŞİK GEREKÇESİ: V2'nin ESIK=5'i 817-reçetelik korpus içindi; 376K'da anlamsız
// düşük kalır. V3: ön-filtre SONRASI grist havuzu n>=40 VE baskın-tip kanıtı n>=20.
// Gerekçe: (a) aday şartı zaten n_ham>=200, (b) 40 örnek aile-medyanını kararlı
// kılar ve V2 eşiğinin 8 katıdır, (c) 20 baskın-KNOWN kanıtı maya modunu tek-iki
// reçetenin belirlemesini engeller. Eşikler yukarı çekildi çünkü veri BOL —
// az-ama-doğru tercih edilir (V1b dersi: ham aday != kullanılabilir).
//
// Kullanım: node _v3_cikarim.js   → rapor stdout + _v3_sonuc.json
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const P = require('./_v2_parser.js');
const { BJCP, SLUG_TO_BJCP, STIL_ISKELET, catIds, hopIds, mayaById, med, mayaTip, yeastId,
  sourMu, LAGER_STYLES, TIP_KANONIK, DOM_ORAN, FAM_MIN, HACIM, VERIM, ctx,
  renkKalibre, konsolideAile, intNudge, crystalYakin, DARK_FAM, CRYSTAL_FAM, KOYU_SMAX } = P;

const KORPUS = 'C:/Users/Kaan/brewmaster/working/_step105_dataset_v8_clean.json';
const TSV = process.env.AL_TSV || 'C:/Users/Kaan/AppData/Local/Temp/claude/C--Users-Kaan-brewmaster/d8e4ee1d-a59f-48d7-b117-131b5e07aded/scratchpad/compact.tsv';
const ADAY_MIN = 200;   // aday şartı (AK ile aynı)
const ESIK_V3 = 40;     // ön-filtre sonrası grist havuzu
const DOM_MIN = 20;     // baskın-tip (KNOWN) asgari kanıt

// ── AK ile AYNI slug→BJCP çözümü (katch-all + ek eşleme) ─────────────────────
const KATCHALL = new Set(['specialty_beer', 'experimental_beer', 'herb_and_spice_beer', 'fruit_beer',
  'wood_aged_beer', 'specialty_saison', 'specialty_smoked_beer', 'clone_beer',
  'mixed_style_beer', 'alternative_fermentables_beer', 'spice_herb_or_vegetable_beer']);
const EK_ESLEME = {
  american_wheat_ale: 'American Wheat Beer', american_cream_ale: 'Blonde Ale / Cream Ale',
  american_barley_wine_ale: 'American Barleywine', german_bock: 'Bock',
  flanders_red_ale: 'Flanders Red Ale', red_ipa: 'American Amber IPA / Red IPA',
  roggenbier: 'Roggenbier / Rye Beer', export_stout: 'Foreign Extra Stout'
};
Object.entries(EK_ESLEME).forEach(([s, a]) => { if (!BJCP[a]) { console.error('ABORT: EK_ESLEME hedefi BJCP\'de yok → ' + a); process.exit(1); } });
const adCoz = slug => EK_ESLEME[slug] || SLUG_TO_BJCP[slug];

// ── AL HOP ALİAS EKİ — korpusa özgü ad varyantları ───────────────────────────
// V2 dersi: unutulan alias = SESSİZ KAYIP. Aşağıdakiler korpusun en sık kullanılan
// ama V2 tablosunda bulunmayan yazımları. HEPSİ assert-once ile doğrulanır.
const HOP_EK = {
  'hallertauer': 'hrtau', 'hallertauer mittelfrueh': 'hrtau', 'hallertauer hersbrucker': 'hrtau',
  'german hallertauer': 'hrtau', 'us hallertau': 'hrtau', 'hersbrucker (ger)': 'hrtau',
  'saazer': 'saaz', 'czech saazer': 'saaz', 'saaz (cz)': 'saaz',
  'kent goldings': 'ekg', 'east kent golding': 'ekg', 'uk goldings': 'ekg', 'golding': 'ekg',
  'us goldings': 'ekg', 'styrian golding': 'styrian',
  'uk fuggles': 'fuggles', 'us fuggles': 'fuggles', 'fuggles (uk)': 'fuggles',
  'tettnanger': 'tettn', 'german tettnanger': 'tettn', 'us tettnanger': 'tettn',
  'northern brewer (ger)': 'nbrewer', 'german northern brewer': 'nbrewer', 'us northern brewer': 'nbrewer',
  'columbus/tomahawk/zeus': 'columbus', 'columbus (tomahawk)': 'columbus', 'zeus': 'columbus',
  'centennial (us)': 'centn', 'cascade (us)': 'cascade', 'willamette (us)': 'willamette',
  'perle (ger)': 'perle', 'magnum (ger)': 'magnum', 'us magnum': 'magnum',
  'spalter': 'spalt', 'spalt (ger)': 'spalt', 'chinook (us)': 'chinook',
  'simcoe (us)': 'simcoe', 'amarillo gold': 'amarillo', 'mosaic (hbc 369)': 'mosaic',
  'nugget (us)': 'nugget', 'warrior (us)': 'warrior', 'target (uk)': 'target',
  'challenger (uk)': 'challenger', 'nelson sauvin (nz)': 'nelson', 'galaxy (aus)': 'galaxy',
  // 2. tur — ölçülen bilinmeyenler. Katalogda karşılığı OLMAYANLAR null (reçete ATLANIR;
  // yanlış çeşide eşlemek YASAK — V2'nin 'aged hops' kararıyla aynı disiplin).
  'hallertauer mittelfrüh': 'hrtau', 'goldings, east kent': 'ekg', 'goldings, styrian': 'styrian',
  'summit': null, 'northdown': null, 'brewers gold': null, 'bramling cross': null,
  'horizon': null, 'glacier': null, 'first gold': null, 'palisade': null, 'admiral': null,
  "falconer's flight": null, 'pacific jade': null, 'millenium': null, 'pacific gem': null,
  'mandarina bavaria': null, 'polaris': null, 'huell melon': null
};
// ── AL MALT ALİAS EKİ — korpusun en sık ad varyantları ───────────────────────
const MALT_EK = {
  '2-row brewers malt': 'pale_ale', '2 row': 'pale_ale', 'two row': 'pale_ale',
  'pale malt (2 row)': 'pale_ale', 'american 2-row': 'pale_ale', 'brewers malt': 'pale_ale',
  'pale ale malt': 'pale_ale', 'us pale ale': 'pale_ale', 'pale 2-row': 'pale_ale',
  'maris otter pale': 'maris', 'maris otter malt': 'maris', 'pale maris otter': 'maris',
  'german pilsner': 'pilsner', 'pilsner (2 row)': 'pilsner', 'belgian pilsner': 'bel_pils',
  'château pilsen 2-row': 'pilsner', 'chateau pilsen 2-row': 'pilsner',
  'wheat malt, white': 'wheat', 'white wheat malt': 'wheat', 'german wheat': 'wheat',
  'wheat malt (white)': 'wheat', 'red wheat': 'wheat',
  'munich malt 10l': 'munich', 'munich malt (10l)': 'munich', 'german munich': 'munich',
  'munich 20l': 'dark_munich', 'munich malt 20l': 'dark_munich',
  'vienna malt': 'vienna', 'german vienna': 'vienna',
  'carapils malt': 'carapils', 'cara-pils/dextrine': 'carapils', 'victory malt': 'victory',
  'chateau biscuit': 'bisk', 'château biscuit': 'bisk',
  'british chocolate': 'choc', 'chocolate malt (uk)': 'choc', 'pale chocolate malt': 'pale_choc',
  'roasted barley (uk)': 'roast', 'black patent malt': 'black', 'blackprinz': 'black',
  'midnight wheat': 'midnight', 'special roast': 'victory',
  'honey malt (gambrinus)': 'hml', 'melanoidin malt': 'mel', 'aromatic malt': 'aromatic',
  'flaked oats (rolled)': 'oat', 'golden naked oats': 'oat', 'oat malt': 'oat',
  'flaked barley (uk)': 'fbar', 'rye malt (german)': 'rye', 'malted rye': 'rye',
  'acidulated malt': 'acid', 'sauermalz': 'acid', 'acid malt': 'acid',
  'table sugar (sucrose)': 'sek', 'corn sugar (dextrose)': 'dex', 'candi sugar clear': 'candy_clr',
  'belgian candi sugar - clear': 'candy_clr', 'belgian candi syrup - d2': 'candy_drk',
  // eşlenemez → reçete ATLANIR (kısmi eşleme YOK)
  'golden light lme': null, 'golden light dme': null, 'dry malt extract - light': null,
  'liquid malt extract': null, 'extra light dme': null, 'amber lme': null, 'pilsen lme': null,
  'wheat lme': null, 'munich lme': null, 'rice hulls': null, 'oak chips': null,
  // 2. tur — ilk koşuda ÖLÇÜLEN en sık bilinmeyenler (sessiz kayıp kapatma)
  'oat flakes': 'oat', 'rolled oats': 'oat', 'flaked oats (quaker)': 'oat',
  'pale malt, 2 row, us': 'pale_ale', 'rahr 2-row pale': 'pale_ale', '6-row brewers malt': 'pale_ale',
  'pale malt, 2 row, uk': 'maris', 'barley, flaked': 'fbar', 'flaked rye': 'flaked_rye',
  'midnight wheat malt': 'midnight', 'munich malt - 20l': 'dark_munich',
  'lactose (milk sugar)': 'lak', 'milk sugar (lactose)': 'lak',
  'liquid malt extract - light': null, 'liquid malt extract - dark': null,
  'sparkling amber lme': null, 'dark dry malt extract': null, 'bavarian wheat dme': null,
  'light dry malt extract': null, 'amber dry malt extract': null, 'pilsen dry malt extract': null
};

// ── ASSERT-ONCE ID KİLİDİ (katalog-ID tuzağı 4. kez; V1a/V1b/V2 dersi) ───────
const idHata = [];
Object.entries(MALT_EK).forEach(([k, v]) => { if (v !== null && !catIds.has(v)) idHata.push('MALT_EK["' + k + '"]=' + v + ' katalogda YOK'); });
Object.entries(HOP_EK).forEach(([k, v]) => { if (v !== null && !hopIds.has(v)) idHata.push('HOP_EK["' + k + '"]=' + v + ' katalogda YOK'); });
if (idHata.length) { console.error('[ASSERT-ONCE HATA] uydurma-ID sızıntısı:\n  ' + idHata.join('\n  ')); process.exit(1); }
console.log('[assert-once] MALT_EK(' + Object.keys(MALT_EK).length + ') + HOP_EK(' + Object.keys(HOP_EK).length + ') tüm değerler canlı katalogda ✓ (uydurma-ID=0)');

// ── AD NORMALİZASYONU (ölçülmüş sessiz-kayıp sınıfı) ────────────────────────
// Korpus ticari-marka sembolünden SONRA U+00A0 (kırılmaz boşluk) kullanıyor:
// "carapils® malt" — düz boşluklu alias ASLA eşleşmiyordu (4.448 satır tek
// bu addan). Tekil alias eklemek yerine SINIFI kapat: ®/™/© at, NBSP ailesini
// düz boşluğa çevir, çoklu boşluğu daralt. Bu, ölçülmemiş varyantları da çözer.
function norm(s) {
  return String(s == null ? '' : s).toLowerCase()
    .replace(/[\u00ae\u2122\u00a9]/g, '')                        // ® ™ ©
    .replace(/[\u00a0\u2007\u202f\u2009\u200a]/g, ' ')          // NBSP ailesi -> duz bosluk
    .replace(/\s+/g, ' ').trim();
}

// ── GRIST AİLELERİ + AİLE-TOPLAMI MEDYANI (V1b yapısı) ─────────────────────
// NEDEN ID-BAŞINA MEDYAN DEĞİL: 376K korpusta stil havuzu 500-2500 reçete ve
// malt seçimi çok çeşitli. Bir ID (ör. c60) reçetelerin %30'unda kullanılsa bile
// MEDYANI 0 çıkar → grist ~%100 baz malta çöker, SRM tabana yapışır ve kapı
// düşürür (ilk koşuda 16 düşenin 11'i bu yüzden SRM'den düştü, 2'si "grist
// medyanı boş" dedi). V1b bunu zaten çözmüştü: UZMANLIK AİLESİ toplamının
// medyanı + BAZ = 100 − kalan. V2 aynı fikri konsolideAile ile kısmen uygular
// ama yalnız medyanı zaten eşiği geçmiş ID'ler üzerinde — bu ölçekte hiçbiri
// geçmediği için devreye girmiyordu. V3 aile-toplamını DOĞRUDAN hesaplar.
// Temsilci = ailede EN ÇOK REÇETEDE görülen üye (bağ: toplam %) — V2'nin
// konsolideAile mode seçimiyle aynı kural.
const gGrup = {}; P.MALTLAR.filter(m => m).forEach(m => { gGrup[m.id] = m.g || ''; });
const AILE_TANIM = [
  ['crystal', id => CRYSTAL_FAM.has(id)],
  ['koyu',    id => DARK_FAM.has(id) || gGrup[id] === 'Koyu'],
  ['seker',   id => gGrup[id] === 'Şeker'],
  ['munich',  id => id === 'munich' || id === 'dark_munich' || id === 'munich_light'],
  ['vienna',  id => id === 'vienna'],
  ['bugday',  id => /^(wheat|dark_wheat|rwh|flaked_wheat|torr_wh|spelt)$/.test(id)],
  ['yulaf',   id => /^(oat|oat_malt|fawcett_oat|raw_oat)$/.test(id)],
  ['cavdar',  id => /^(rye|flaked_rye)$/.test(id)],
  ['nisasta', id => /^(corn|corn_grits|rice|rice_flaked|fbar)$/.test(id)],
  ['dumanli', id => /^(smoked|smoked_oak|smoked_peat)$/.test(id)],
  // Özel grubu + renk taşıyan Base maltları (aromatic r20) — baza karışmasın
  ['ozel',    id => gGrup[id] === 'Özel' || (gGrup[id] === 'Base' && (P.maltRById[id] || 0) >= 15)],
  ['adjunct', id => gGrup[id] === 'Adjunct'],
  ['baz',     () => true]
];
function aileAdi(id) { for (const [ad, f] of AILE_TANIM) if (f(id)) return ad; return 'baz'; }
const UZ_TAVAN = 65; // uzmanlık toplamı bunun üstündeyse baz azınlıkta → çıkarım şüpheli (V1b: 60)
// Tek başına grist'in çoğunluğu OLABİLEN aileler: Munich Dunkel'de munich, Vienna
// Lager'da vienna, Weizen'de buğday BAZ maltıdır. Tavan kontrolü bunları dışlamazsa
// otantik stiller "baz azınlıkta" diye YANLIŞ düşer (Munich Dunkel %66.2 ile düştü).
// Grist bileşimi DEĞİŞMEZ — yalnız tavan kontrolünün paydası düzelir.
const BAZ_YETKIN = new Set(['munich', 'vienna', 'bugday']);

function gristTuret(temiz) {
  const uyeSay = {}, uyeTop = {};
  temiz.forEach(r => Object.entries(r.grist).forEach(([id, p]) => {
    const a = aileAdi(id);
    if (!uyeSay[a]) { uyeSay[a] = {}; uyeTop[a] = {}; }
    uyeSay[a][id] = (uyeSay[a][id] || 0) + 1;
    uyeTop[a][id] = (uyeTop[a][id] || 0) + p;
  }));
  const adlar = Object.keys(uyeSay);
  const famMed = {}, temsil = {};
  adlar.forEach(a => {
    const uyeler = new Set(Object.keys(uyeSay[a]));
    famMed[a] = med(temiz.map(r => Object.entries(r.grist).reduce((x, [id, p]) => x + (uyeler.has(id) ? p : 0), 0)));
    temsil[a] = Object.keys(uyeSay[a]).sort((x, y) =>
      (uyeSay[a][y] - uyeSay[a][x]) || (uyeTop[a][y] - uyeTop[a][x]) || x.localeCompare(y))[0];
  });
  if (!temsil.baz) return { hata: 'baz malt ailesi yok' };
  const uz = adlar.filter(a => a !== 'baz' && famMed[a] >= FAM_MIN).sort((a, b) => famMed[b] - famMed[a]);
  const uzTop = uz.reduce((x, a) => x + famMed[a], 0);
  const tavanPay = uz.filter(a => !BAZ_YETKIN.has(a)).reduce((x, a) => x + famMed[a], 0);
  if (tavanPay >= UZ_TAVAN) return { hata: 'baz-dışı uzmanlık %' + tavanPay.toFixed(1) + ' (>= ' + UZ_TAVAN + ') — baz azınlıkta, çıkarım şüpheli' };
  if (100 - uzTop < 5) return { hata: 'baz payı %' + (100 - uzTop).toFixed(1) + ' — grist toplamı tutmuyor' };
  const gr = [[temsil.baz, 100 - uzTop]].concat(uz.map(a => [temsil[a], famMed[a]]));
  return { gr, ozet: uz.map(a => a + ':' + temsil[a] + '=' + famMed[a].toFixed(1)).join(' ') };
}

// ── V3 çözücüler: V2 önce, sonra AL eki, crystal SAYIYLA ────────────────────
const CARA_RE = /crystal|caramel|cara(?!pils|foam|fa)/i;
function v3MaltId(row) {
  const ham = norm(row.name);
  const v2 = P.maltId(ham);
  if (v2 !== undefined) return v2;                       // V2 deterministik (null dahil = eşlenemez)
  if (MALT_EK.hasOwnProperty(ham)) return MALT_EK[ham];  // AL eki
  // VERİ AVANTAJI 1: crystal/caramel ailesi → lovibond SAYISI ile çöz (ad-regex değil)
  if (CARA_RE.test(ham) && typeof row.color === 'number' && row.color > 0 && row.color <= 200) return crystalYakin(row.color);
  return undefined;
}
function v3HopId(ad) {
  const ham = norm(ad);
  const v2 = P.hopIdAlias(ham);
  if (v2 !== undefined) return v2;
  if (HOP_EK.hasOwnProperty(ham)) return HOP_EK[ham];
  return undefined;
}

// ── 1. ADAY LİSTESİ (compact.tsv üzerinden hızlı sayım — AK ile aynı mantık) ─
const tsv = fs.readFileSync(TSV, 'utf8').split('\n');
const hdr = tsv[0].split('\t'); const ti = {}; hdr.forEach((x, i) => ti[x] = i);
const adSayim = new Map(), slugSayim = new Map();
for (let i = 1; i < tsv.length; i++) {
  const l = tsv[i]; if (!l) continue;
  const a = l.split('\t');
  const slug = a[1]; if (!slug || KATCHALL.has(slug)) continue;
  const og = parseFloat(a[ti.og]); if (!(og > 1.005)) continue;
  const ad = adCoz(slug); if (!ad || !BJCP[ad]) continue;
  adSayim.set(ad, (adSayim.get(ad) || 0) + 1);
  if (!slugSayim.has(ad)) slugSayim.set(ad, {});
  const m = slugSayim.get(ad); m[slug] = (m[slug] || 0) + 1;
}
const elenen = [];
const adaylar = [...adSayim.entries()].filter(([ad, n]) => {
  if (n < ADAY_MIN) return false;
  if (STIL_ISKELET[ad]) { elenen.push({ ad, n, sebep: 'MEVCUT-KAZANIR (küratör/V1b/V2 iskeleti var)' }); return false; }
  const sluglar = Object.keys(slugSayim.get(ad) || {});
  if (sluglar.every(sourMu)) { elenen.push({ ad, n, sebep: 'SOUR/WILD ERTELE (blend-maya şeması yok — V2 kararı sürüyor)' }); return false; }
  return true;
}).sort((a, b) => b[1] - a[1]);
console.log('[aday] BJCP-eşlenen stil=' + adSayim.size + ' | n>=' + ADAY_MIN + ' & iskeletsiz & sour-değil = ' + adaylar.length + ' aday');
console.log('  ' + adaylar.map(([ad, n]) => ad + '(' + n + ')').join(' · '));
const adaySet = new Set(adaylar.map(a => a[0]));

// ── 2. KORPUS TARAMASI: yalnız aday stillerin ham malzemesi ─────────────────
const sayac = { gorulen: 0, adayKayit: 0, maltAtla: 0, hopAtla: 0, hopYok: 0, parseOk: 0, uydurmaId: 0 };
const bilinmeyenMalt = new Map(), bilinmeyenHop = new Map();
const havuz = {};   // bjcpAd → [rec]
function ekle(rec) {
  const ad = adCoz(rec.bjcp_slug); if (!ad || !adaySet.has(ad)) return;
  sayac.adayKayit++;
  const raw = rec.raw || {};
  const malts = raw.malts || [];
  if (!malts.length) { sayac.maltAtla++; return; }
  const toplamKg = malts.reduce((a, m) => a + (+m.amount_kg || 0), 0);
  if (!(toplamKg > 0)) { sayac.maltAtla++; return; }
  const grist = {};
  for (const m of malts) {
    const id = v3MaltId(m);
    if (id === undefined) { bilinmeyenMalt.set(String(m.name).toLowerCase(), (bilinmeyenMalt.get(String(m.name).toLowerCase()) || 0) + 1); sayac.maltAtla++; return; }
    if (id === null) { sayac.maltAtla++; return; }               // fermentable karşılığı yok → ATLA
    if (!catIds.has(id)) { sayac.uydurmaId++; return; }           // assert-once ikinci hat
    grist[id] = (grist[id] || 0) + (+m.amount_kg || 0) * 100 / toplamKg;
  }
  const hops = [];
  const hacimL = (+raw.batch_size_l > 0 && +raw.batch_size_l < 1000) ? +raw.batch_size_l : 0;
  for (const h of (raw.hops || [])) {
    const id = v3HopId(h.name);
    if (id === undefined) { bilinmeyenHop.set(String(h.name).toLowerCase().slice(0, 40), (bilinmeyenHop.get(String(h.name).toLowerCase().slice(0, 40)) || 0) + 1); sayac.hopAtla++; return; }
    if (id === null) { sayac.hopAtla++; return; }
    if (!hopIds.has(id)) { sayac.uydurmaId++; return; }
    hops.push({ id, t: +h.time_min || 0, use: String(h.use || '').toLowerCase(), gL: hacimL ? (+h.amount_g || 0) / hacimL : 0 });
  }
  if (!hops.length) { sayac.hopYok++; return; }
  sayac.parseOk++;
  (havuz[ad] = havuz[ad] || []).push({ grist, hops, yTip: mayaTip(raw.yeast), yId: yeastId(raw.yeast) });
}

const rs = fs.createReadStream(KORPUS, { encoding: 'utf8', highWaterMark: 1 << 24 });
let buf = '';
const BOUND = '}, {"id": ';
rs.on('data', chunk => {
  buf += chunk;
  const st = buf.indexOf('{"id": '); if (st < 0) return;
  buf = buf.slice(st);
  let idx;
  while ((idx = buf.indexOf(BOUND, 1)) >= 0) {
    const t = buf.slice(0, idx + 1); buf = buf.slice(idx + 2);
    sayac.gorulen++;
    try { ekle(JSON.parse(t)); } catch (e) {}
  }
  if (buf.length > 50e6) buf = '';
});
rs.on('end', () => {
  let last = buf; const cut = last.lastIndexOf('}]}'); if (cut > 0) last = last.slice(0, cut + 1);
  try { sayac.gorulen++; ekle(JSON.parse(last)); } catch (e) {}
  console.log('[tara] görülen=' + sayac.gorulen + ' aday-kayıt=' + sayac.adayKayit +
    ' → parse-OK=' + sayac.parseOk + ' | atlandı: malt-eşlenemez=' + sayac.maltAtla +
    ' hop-eşlenemez=' + sayac.hopAtla + ' hop-yok=' + sayac.hopYok + ' | UYDURMA-ID=' + sayac.uydurmaId + ' (0 olmalı)');
  const bm = [...bilinmeyenMalt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const bh = [...bilinmeyenHop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('[bilinmeyen malt ilk15] ' + (bm.map(x => x[0] + '=' + x[1]).join(' · ') || 'yok'));
  console.log('[bilinmeyen hop ilk15]  ' + (bh.map(x => x[0] + '=' + x[1]).join(' · ') || 'yok'));
  turet();
});

// ── 3. STİL BAŞINA TÜRETME (V2 ile aynı 3 katman + kapı) ───────────────────
function turet() {
  const dusen = [], uretilen = {};
  adaylar.forEach(([ad, hamN]) => {
    const recs = havuz[ad] || [];
    const et = ad + ' [ham ' + hamN + ' → parse ' + recs.length + ']';
    if (recs.length < ESIK_V3) { dusen.push(et + ': parse sonrası havuz n=' + recs.length + '<' + ESIK_V3 + ' → DÜŞÜR'); return; }
    const bj = BJCP[ad];

    // KATMAN 1 — maya-tip ön-filtresi (baskın tipi tut)
    const tf = {}; recs.forEach(r => { if (r.yTip !== 'unknown') tf[r.yTip] = (tf[r.yTip] || 0) + 1; });
    const tSir = Object.entries(tf).sort((a, b) => b[1] - a[1]);
    if (!tSir.length) { dusen.push(et + ': hiçbir reçetede maya tipi tanınmadı → DÜŞÜR'); return; }
    const [baskinTip, baskinN] = tSir[0];
    const knownTop = tSir.reduce((a, x) => a + x[1], 0);
    const oran = baskinN / knownTop;
    if (oran < DOM_ORAN) { dusen.push(et + ': maya-tip BELİRSİZ (' + tSir.map(x => x[0] + ':' + x[1]).join(' ') + ' → baskınlık %' + Math.round(100 * oran) + ' < %' + Math.round(100 * DOM_ORAN) + ') → ERTELE'); return; }
    if (baskinTip === 'sour') { dusen.push(et + ': baskın maya-tip SOUR → blend-maya şeması yok, ERTELE'); return; }
    const domRecs = recs.filter(r => r.yTip === baskinTip);
    const temiz = recs.filter(r => r.yTip === baskinTip || r.yTip === 'unknown');
    const cikanKnown = recs.length - temiz.length;

    // KATMAN 3 — stil-aile tutarlılığı
    const lagerBekle = LAGER_STYLES.has(ad) || /lager|pils|bock|märzen|marzen|oktoberfest|festbier|schwarz|keller|dortmund|dunkel|rauchbier/i.test(ad);
    const hibrit = /kölsch|kolsch|altbier|california common|steam|cream ale/i.test(ad);
    if (!hibrit) {
      if (lagerBekle && baskinTip !== 'lager') { dusen.push(et + ': STİL-AİLE çelişki (lager stili × baskın ' + baskinTip + ' maya) → DÜŞÜR'); return; }
      if (!lagerBekle && baskinTip === 'lager') { dusen.push(et + ': STİL-AİLE çelişki (ale stili × lager baskın maya) → DÜŞÜR'); return; }
    }

    // KATMAN 2 — homojenlik/n eşikleri
    if (domRecs.length < DOM_MIN) { dusen.push(et + ': baskın-tip kanıtı zayıf (' + baskinTip + '=' + domRecs.length + '<' + DOM_MIN + ') → DÜŞÜR'); return; }
    if (temiz.length < ESIK_V3) { dusen.push(et + ': ön-filtre sonrası havuz n=' + temiz.length + '<' + ESIK_V3 + ' (' + cikanKnown + ' known-atipik çıkarıldı) → DÜŞÜR'); return; }

    // GRIST: aile-toplamı medyanı + baz = 100 − uzmanlık (V1b yapısı, yukarıda gerekçeli)
    const gt = gristTuret(temiz);
    if (gt.hata) { dusen.push(et + ': ' + gt.hata); return; }
    const gSum0 = gt.gr.reduce((x, g) => x + g[1], 0);
    const grF = gt.gr.map(g => [g[0], g[1] * 100 / gSum0]);

    // HOP (V2 rol şeması; g/L reçetenin GERÇEK hacminden)
    function modHop(f) {
      const fr = {};
      temiz.forEach(r => { const s = new Set(); r.hops.filter(f).forEach(h => { if (!s.has(h.id)) { s.add(h.id); fr[h.id] = (fr[h.id] || 0) + 1; } }); });
      return Object.entries(fr).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
    }
    const aci = modHop(h => h.t >= 25 && !/dry/.test(h.use));
    const gec = modHop(h => h.t < 25 && !/dry/.test(h.use));
    const kuru = modHop(h => /dry/.test(h.use));
    if (!aci.length && !gec.length) { dusen.push(et + ': katalog-eşlenebilir kaynatma hop yok'); return; }
    const hop = [{ id: (aci[0] || gec[0])[0], dk: 60, rol: 'aci' }];
    function gLmed(id, f, lo, hi, dv) {
      const v = [];
      temiz.forEach(r => { const h = r.hops.find(x => x.id === id && f(x)); if (h && h.gL > 0) v.push(h.gL); });
      return Math.min(hi, Math.max(lo, v.length ? +med(v).toFixed(1) : dv));
    }
    const ARO_MIN = Math.max(2, Math.round(temiz.length * 0.15));  // rol eşiği havuzla ölçekli (V2: sabit 2)
    if (gec.length && gec[0][1] >= ARO_MIN) hop.push({ id: gec[0][0], dk: 10, rol: 'aroma', gL: gLmed(gec[0][0], x => x.t < 25 && !/dry/.test(x.use), 0.3, 4, 1) });
    if (kuru.length && kuru[0][1] >= ARO_MIN) hop.push({ id: kuru[0][0], rol: 'kuru', gL: gLmed(kuru[0][0], x => /dry/.test(x.use), 0.5, 8, 2) });

    // MAYA: baskın tip içinde mode katalog-ID
    const mf = {}; temiz.forEach(r => { if (r.yId && mayaById[r.yId] && mayaById[r.yId].tip === baskinTip) mf[r.yId] = (mf[r.yId] || 0) + 1; });
    const mSir = Object.entries(mf).sort((a, b) => b[1] - a[1]);
    const mayaId = (mSir[0] && mSir[0][0]) || TIP_KANONIK[baskinTip] || 'us05';
    if (!mayaById[mayaId]) { dusen.push(et + ': maya ID katalogda yok (' + mayaId + ')'); return; }

    // RENK KALİBRASYONU (V2 fonksiyonu) + yuvarlama + nudge
    const kal = renkKalibre(ad, grF, hop, mayaId);
    if (kal.motorNull) { dusen.push(et + ': motor hedefi null'); return; }
    if (kal.tooHot) { dusen.push(et + ': motor-renk çok sıcak (SRM~' + Math.round(kal.srm0) + ' > 1.9×BJCP-max ' + bj.srm[1] + ') → DÜŞÜR'); return; }
    let gr = kal.gr.map(g => [g[0], Math.round(g[1])]).filter(g => g[1] > 0);
    gr.sort((a, b) => b[1] - a[1]);
    gr[0][1] += 100 - gr.reduce((a, g) => a + g[1], 0);
    gr = gr.filter(g => g[1] > 0);
    gr = intNudge(ad, gr, hop, mayaId);

    uretilen[ad] = {
      hamN, parseN: recs.length, n: temiz.length, domN: domRecs.length, baskinTip, cikanKnown,
      srm0: kal.srm0, srmKal: kal.srm, gristOzet: gt.ozet,
      entry: { grist: gr, hop, mayaId, mashSc: 67, kaynak: 'cikarim_v3', n: temiz.length, maya: baskinTip }
    };
  });

  // ── 4. TUTARLILIK KAPISI (son savunma) ──────────────────────────────────
  const final = {};
  Object.entries(uretilen).forEach(([ad, a]) => {
    const idBad = a.entry.grist.filter(g => !catIds.has(g[0])).map(g => g[0])
      .concat(a.entry.hop.filter(h => !hopIds.has(h.id)).map(h => h.id));
    if (idBad.length) { dusen.push('"' + ad + '" KAPI: katalog-dışı ID ' + idBad.join(',')); return; }
    if (!mayaById[a.entry.mayaId]) { dusen.push('"' + ad + '" KAPI: katalog-dışı maya ' + a.entry.mayaId); return; }
    ctx.STIL_ISKELET[ad] = a.entry;
    const r = ctx.window._stilIskeletHesap(ad, HACIM, VERIM);
    delete ctx.STIL_ISKELET[ad];
    if (!r || !r.malts || !r.malts.length) { dusen.push('"' + ad + '" KAPI: _stilIskeletHesap null'); return; }
    const bj = BJCP[ad];
    const og = ctx.hOG(r.malts, VERIM, [], HACIM);
    const ibu = ctx.hIBU(r.hops, og, HACIM, []);
    const srm = ctx.hSRM(r.malts, [], HACIM);
    const h = [];
    if (!(og >= bj.og[0] && og <= bj.og[1])) h.push('OG=' + og.toFixed(3) + '∉[' + bj.og + ']');
    if (!(ibu >= bj.ibu[0] && ibu <= bj.ibu[1])) h.push('IBU=' + Math.round(ibu) + '∉[' + bj.ibu + ']');
    if (!(srm >= bj.srm[0] && (bj.srm[1] >= KOYU_SMAX || srm <= bj.srm[1]))) h.push('SRM=' + srm + '∉[' + bj.srm + ']');
    const pct = a.entry.grist.reduce((s, g) => s + g[1], 0);
    if (Math.abs(pct - 100) > 0.01) h.push('grist%=' + pct);
    if (h.length) { dusen.push('"' + ad + '" KAPI DÜŞTÜ: ' + h.join(' ')); return; }
    final[ad] = { ...a, kanit: { og: +og.toFixed(3), ibu: Math.round(ibu), srm } };
    console.log('[KAPI PASS] "' + ad + '" n=' + a.n + ' maya=' + a.baskinTip + ': OG=' + og.toFixed(3) + '[' + bj.og + '] IBU=' + Math.round(ibu) + '[' + bj.ibu + '] SRM=' + srm + '[' + bj.srm + '] renk ' + (a.srm0 || 0).toFixed(1) + '→' + (a.srmKal || 0).toFixed(1));
  });

  // ── 5. RAPOR + ÇIKTI ────────────────────────────────────────────────────
  console.log('\n════════ SONUÇ ════════');
  console.log('aday: ' + adaylar.length + ' | üretilen (3 katman geçen): ' + Object.keys(uretilen).length + ' | KAPI PASS: ' + Object.keys(final).length);
  console.log('\nMEVCUT-KAZANIR + SOUR-ERTELE (aday listesine hiç girmedi): ' + elenen.length);
  elenen.forEach(e => console.log('  – ' + e.ad + ' (n=' + e.n + '): ' + e.sebep));
  console.log('\nDÜŞEN (aday olup geçemeyen): ' + dusen.length);
  dusen.forEach(d => console.log('  ✗ ' + d));
  console.log('\nEKLENEN ' + Object.keys(final).length + ' STİL:');
  Object.entries(final).forEach(([ad, a]) => console.log('  ✓ "' + ad + '" n=' + a.n + ' (ham ' + a.hamN + ', baskın ' + a.baskinTip + '=' + a.domN + ', ' + a.cikanKnown + ' atipik çıkarıldı)'));

  function jsSatir(ad, e) {
    const grist = '[' + e.grist.map(g => "['" + g[0] + "'," + g[1] + ']').join(',') + ']';
    const hop = '[' + e.hop.map(h => '{id:\'' + h.id + '\'' + (h.dk != null ? ',dk:' + h.dk : '') + ',rol:\'' + h.rol + '\'' + (h.gL != null ? ',gL:' + h.gL : '') + '}').join(',') + ']';
    return '  ' + (JSON.stringify(ad) + ':').padEnd(38) + '{grist:' + grist + ', hop:' + hop +
      ", mayaId:'" + e.mayaId + "', mashSc:" + e.mashSc + ", kaynak:'cikarim_v3', n:" + e.n + ", maya:'" + e.maya + "'}";
  }
  const satirlar = Object.keys(final).sort().map(ad => jsSatir(ad, final[ad].entry));
  console.log('\n──── HTML STIL_ISKELET eki (V3 bloğu) ────');
  console.log(satirlar.join(',\n'));
  fs.writeFileSync(__dirname + '/_v3_sonuc.json', JSON.stringify({
    esik: { ADAY_MIN, ESIK_V3, DOM_MIN, DOM_ORAN }, sayac,
    aday: adaylar.map(([ad, n]) => ({ ad, n })), elenen, dusen,
    eklenen: Object.keys(final).map(ad => ({ ad, ...final[ad] })), satirlar
  }, null, 1));
  console.log('\n[yazıldı] _v3_sonuc.json');
}
