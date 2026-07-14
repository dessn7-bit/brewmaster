#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// SPRINT V2 — BATCH PARSER: stilden-reçete A katmanı derinleştirme (BUILD-TIME)
//
// _ground_truth_v2_batch1-8.json (910 ham reçete, 817 grist-parse-edilebilir) →
// DETERMİNİSTİK alias tablosuyla canlı katalog ID'lerine eşle → n>=5 + tek-maya-
// tip homojen slug'lar için medyan iskelet üret → STIL_ISKELET_V2 statik tablo.
// Çıktı HTML'e gömülür — runtime'da ham veri YÜKLENMEZ (dataset deploy edilmiyor).
//
// STRATEJİ (b) — deterministik, maya-tip DİSİPLİNLİ. (a) tam-otomatik ve (c) yapma
// REDDEDİLDİ. En kritik güvenlik bulgusu: TUTARLILIK KAPISI (calc OG/IBU/SRM ∈
// BJCP) MAYA-TİP HATASINI YAKALAMAZ (West Coast IPA'nın Cold-IPA lager-maya örneği
// BJCP-içinde kalır). Bu yüzden maya-tip koruması kapıdan AYRI, ÜÇ katmanda:
//   Katman 1 (ÖN-FİLTRE):  slug havuzunu maya-tipe göre grupla, BASKIN tipi tut,
//                          azınlık/atipik tipli reçeteleri havuzdan ÇIKAR.
//   Katman 2 (HOMOJENLİK): baskınlık NET (>=%60) değilse → ERTELE; ön-filtre
//                          sonrası n<5 → DÜŞÜR (tek-tip homojenlik garanti).
//   Katman 3 (STİL-AİLE):  baskın maya-tip stil ailesiyle çelişirse (lager stili ×
//                          ale maya / ale stili × lager maya) → DÜŞÜR (v1b kapısı).
//   Son savunma (KAPI):    _stilIskeletHesap + hOG/hIBU/hSRM ∈ BJCP + ID katalogda.
//
// ASSERT-ONCE ID KİLİDİ: alias tablosunun HER değeri build-time'da canlı katalogda
// doğrulanır (uydurma-ID=0 hedefi). Eşlenemeyen malt/hop'lu reçete ATLANIR — kısmi
// eşleme kabul EDİLMEZ (katalog-ID tuzağı 3. kez çıktı; deterministik + assert şart).
//
// DEDUP: aynı BJCP hedefine düşen alias slug'lar BİRLEŞTİRİLİR (Imperial Stout ×3 →
// tek hedef). Küratörlü (V1a) + V1b ile çakışan stil ATLANIR — elle/önceki kazanır.
// SOUR/WILD (lambik/gueuze/gose/berliner/flanders/brett/wild): blend-maya şeması yok
// → V2 KAPSAM DIŞI, ertele.
//
// Kullanım: node _v2_parser.js   → rapor stdout + STIL_ISKELET_V2 JS satırları
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const vm = require('vm');

const ESIK = 5;          // slug/havuz başına asgari (ön-filtre SONRASI) reçete sayısı
const FAM_MIN = 2;       // grist ID asgari medyan % (altı gürültü/yuvarlama)
const DOM_ORAN = 0.60;   // baskın maya-tip asgari oranı (altı = belirsiz → ertele)
const HACIM = 11, VERIM = 61;  // kapı koşulları (V1a/V1b gate ile aynı)
const BATCH_L = 18.93;   // BYO/klon reçete konvansiyonu 5 gal = 18.93 L (aroma/kuru gL için)

// ── 1. HTML'den canlı motor + katalog + otorite dilimle (vm sandbox) ──
const html = fs.readFileSync(__dirname + '/Brewmaster_v2_79_10.html', 'utf8');
function dilim(re) { const m = html.match(re); if (!m) throw new Error('dilim bulunamadı: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console, KATKILAR: [], BM_SIVI_GML: 1.3 });
let src = '';
[/const MALTLAR=\[[\s\S]*?\n\];/, /const HOPLAR=\[[\s\S]*?\n\];/, /const MAYALAR=\[[\s\S]*?\n\];/,
 /const BJCP = \{[\s\S]*?\n\};/, /const SLUG_TO_BJCP = \{[\s\S]*?\n\};/, /const STIL_ISKELET = \{[\s\S]*?\n\};/
].forEach(re => { src += dilim(re).replace('const ', '') + '\n'; });
[/function tin\([\s\S]*?\n\}/, /function whFaktor\([\s\S]*?\n\}/, /function hFormFaktor\([\s\S]*?\n\}/,
 /function hOG\(ml,v,katkilar,hacim\)\{[\s\S]*?\n\}/, /function hSRM\(ml,katkilar,hacim\)\{[\s\S]*?\n\}/,
 /function hIBU\(hl,og,hacim,katkilar\)\{[\s\S]*?\n\}/, /window\._stilIskeletHesap = function[\s\S]*?\n\};/
].forEach(re => { src += dilim(re) + '\n'; });
vm.runInContext(src, ctx);
const { MALTLAR, HOPLAR, MAYALAR, BJCP, SLUG_TO_BJCP, STIL_ISKELET } = ctx;
const catIds = new Set(MALTLAR.filter(m => m).map(m => m.id));
const hopIds = new Set(HOPLAR.filter(h => h).map(h => h.id));
const mayaById = {}; MAYALAR.filter(m => m).forEach(m => mayaById[m.id] = m);
console.log('[dilim] MALT=' + catIds.size + ' HOP=' + hopIds.size + ' MAYA=' + Object.keys(mayaById).length +
  ' BJCP=' + Object.keys(BJCP).length + ' STIL_ISKELET(kurator+v1b)=' + Object.keys(STIL_ISKELET).length);

// ── 2. DETERMİNİSTİK MALT ALİAS (ham ad → canlı katalog ID) ──
// Her değer aşağıda catIds'e karşı ASSERT edilir. crystal/caramel "NNL" ayrı ele
// alınır (sayı parse → en yakın canlı cXX). null = katalogda fermentable karşılığı
// YOK (meyve/kabak/kakao/proprietary) → reçete atlanır (kısmi eşleme yok).
const MALT_ALIAS = {
  'pilsner':'pilsner','pilsner malt':'pilsner','pilsen':'pilsner','moravian pilsner':'pilsner',
  'pilsner (organic)':'pilsner','bohemian pilsner':'pilsner',
  'munich':'munich','munich malt':'munich','munich i':'munich','munich light':'munich',
  'munich ii':'dark_munich','dark munich':'dark_munich','munich dark':'dark_munich',
  'vienna':'vienna','wheat':'wheat','wheat malt':'wheat','malted wheat':'wheat','white wheat':'wheat',
  'pale wheat malt':'wheat','pale wheat':'wheat','wheat (organic)':'wheat',
  'dark wheat':'dark_wheat','raw wheat':'rwh','wheat (raw)':'rwh',
  'flaked wheat':'flaked_wheat','torrefied wheat':'torr_wh','torrified wheat':'torr_wh',
  '2-row':'pale_ale','2-row malt':'pale_ale','pale malt':'pale_ale','pale ale':'pale_ale',
  '6-row':'pale_ale','golden promise':'golden_promise',
  'maris otter':'maris','marris otter':'maris',
  'special b':'specb','special b malt':'specb',
  'chocolate':'choc','chocolate malt':'choc','pale chocolate':'pale_choc','chocolate wheat':'roast_wheat',
  'chocolate rye':'choc','roasted barley':'roast','black malt':'black','black patent':'black','black':'black',
  'brown malt':'brown','brown':'brown','nut brown malt':'brown',
  'carafa':'crf2','carafa i':'crf1','carafa ii':'crf2','carafa iii':'crf3',
  'carafa special iii':'crf3','carafa iii dehusked':'crf3','dehusked black malt':'dehusked_black',
  'flaked oats':'oat','oats':'oat','raw oats':'raw_oat',
  'corn':'corn','flaked corn':'corn','corn grits':'corn_grits',
  'rice':'rice_flaked','flaked rice':'rice_flaked',
  'acidulated':'acid','lactic sour':'acid',
  'carapils':'carapils','carafoam':'carapils','dextrin':'carapils',
  'special b malt':'specb','melanoidin':'mel','amber malt':'amber','biscuit':'bisk','victory':'victory',
  'honey malt':'hml','caraaroma':'cara_aroma','caramunich':'cara_munich2','caramunich ii':'cara_munich2',
  'caramunich iii':'cara_munich3','carastan':'c40','caravienna':'c20',
  'lactose':'lak','honey':'bal','rye malt':'rye','rye':'rye','flaked barley':'fbar',
  'spelt':'spelt','spelt malt':'spelt','smoked malt':'smoked','beech-smoked malt':'smoked',
  'smoked malt (beech)':'smoked','beech-smoked munich':'smoked','beech-smoked pilsner':'smoked',
  'smoked malt (alder)':'smoked','smoked wheat':'smoked_oak','oak-smoked wheat':'smoked_oak',
  'oak-smoked malt':'smoked_oak',
  // şeker ailesi
  'white candi sugar':'candy_clr','dark candi syrup':'candy_drk',
  'white sugar':'sek','sugar':'sek','cane sugar':'sek',
  'corn sugar':'dex','sugar (corn)':'dex','dextrose':'dex',
  'brown sugar':'light_brown','dark brown sugar':'dark_brown','dark sugar':'dark_brown',
  'invert sugar':'invert2','dark invert sugar':'invert3','treacle':'treacle',
  'maple syrup':'maple','molasses':'molasses','buckwheat malt':'buckwheat','sorghum extract':'sorghum',
  // eşlenemez (fermentable karşılığı YOK) → reçete atlanır
  'pumpkin puree':null,'pumpkin':null,'cocoa':null,'cocoa powder':null,'cocoa nibs':null,'cacao nibs':null,
  'cherry puree':null,'grape must':null,'cranberry':null,'raisin extract':null,'nut brown extract':null,
  'proprietary':null,'proprietary rogue malt':null,'millet malt':null,'sorghum extract (gf)':null,
  'corn syrup':null,'invert sugar (unspec)':null
};
// crystal/caramel "NNL" → en yakın canlı cXX
const CRYSTAL_LIVE = [10, 20, 40, 60, 80, 120, 150];
function crystalYakin(lov) { return 'c' + CRYSTAL_LIVE.reduce((a, b) => Math.abs(b - lov) < Math.abs(a - lov) ? b : a); }
function maltId(rawAd) {
  const s = String(rawAd).trim().toLowerCase();
  // crystal/caramel sayısı
  const cm = /^(?:crystal|caramel)\s*(\d{1,3})\s*l?\b/.exec(s);
  if (cm) return crystalYakin(+cm[1]);
  if (s === 'crystal' || s === 'caramel') return 'c60'; // sayısız → orta-bant
  if (MALT_ALIAS.hasOwnProperty(s)) return MALT_ALIAS[s];
  if (catIds.has(s)) return s;   // ham ad zaten canlı ID ise
  return undefined;              // BİLİNMEYEN (alias tablosunda yok) → reçete atlanır
}

// ── 3. DETERMİNİSTİK HOP ALİAS (ham ad → canlı katalog ID) ──
// Noble Hallertau-ailesi Amerikan/Avrupa türevleri (Liberty/Mt Hood/Vanguard/
// Hersbrucker/Strisselspalt) → hrtau (hortikültürel olarak Hallertau Mittelfrüh
// ikamesi; aroma yaklaşımı ŞÜPHE'de). "Aged hops" = oksitlenmiş fonksiyonel (taze
// çeşide EŞLENMEZ) → null. Gerçekten ayrı çeşitler (Cluster/Galena/Apollo) → null.
const HOP_ALIAS = {
  'hallertau':'hrtau','hallertau mittelfrüh':'hrtau','hallertau mittelfruh':'hrtau','hersbrucker':'hrtau',
  'mittelfrueh':'hrtau','liberty':'hrtau','mt hood':'hrtau','mount hood':'hrtau','vanguard':'hrtau',
  'strisselspalt':'hrtau',
  'saaz':'saaz','czech saaz':'saaz','styrian goldings':'styrian','styrian':'styrian',
  'magnum':'magnum','german magnum':'magnum','citra':'citra','citra cryo':'cc',
  'cascade':'cascade','centennial':'centn','simcoe':'simcoe','fuggle':'fuggles','fuggles':'fuggles',
  'goldings':'ekg','east kent goldings':'ekg','ekg':'ekg','amarillo':'amarillo','mosaic':'mosaic',
  'tettnang':'tettn','tettnanger':'tettn','columbus':'columbus','ctz':'columbus','tomahawk':'columbus',
  'chinook':'chinook','willamette':'willamette','spalt':'spalt','spalt select':'spalt_sel',
  'spalter select':'spalt_sel','warrior':'warrior','nugget':'nugget','target':'target',
  'northern brewer':'nbrewer','galaxy':'galaxy','perle':'perle','nelson sauvin':'nelson',
  'challenger':'challenger','el dorado':'eldorado','sterling':'sterling','saphir':'saphir',
  'tradition':'tradition','hallertau tradition':'tradition','lublin':'lublin','motueka':'motueka',
  'sabro':'sabro','riwaka':'riwaka','wakatu':'wakatu','lemondrop':'lemondrop','equinox':'ekuanot',
  // eşlenemez (katalogda karşılığı yok / fonksiyonel oksit) → reçete atlanır
  'aged hops':null,'aged saaz':null,'cluster':null,'galena':null,'apollo':null,'bravo':null,
  'ahtanum':null,'sorachi ace':null,'pilgrim':null,'pride of ringwood':null,'tsingtao hops':null,
  'crystal':null,'progress':null,'vic secret':null,'victoria secret':null
};
function hopIdAlias(rawAd) {
  const s = String(rawAd).trim().toLowerCase();
  if (HOP_ALIAS.hasOwnProperty(s)) return HOP_ALIAS[s];
  if (hopIds.has(s)) return s;
  return undefined;
}

// ── ASSERT-ONCE: alias tablolarının HER (null-olmayan) değeri canlı katalogda mı? ──
const idHata = [];
Object.entries(MALT_ALIAS).forEach(([k, v]) => { if (v !== null && !catIds.has(v)) idHata.push('MALT_ALIAS["' + k + '"]=' + v + ' katalogda YOK'); });
Object.entries(HOP_ALIAS).forEach(([k, v]) => { if (v !== null && !hopIds.has(v)) idHata.push('HOP_ALIAS["' + k + '"]=' + v + ' katalogda YOK'); });
CRYSTAL_LIVE.forEach(n => { if (!catIds.has('c' + n)) idHata.push('crystal c' + n + ' katalogda YOK'); });
if (idHata.length) { console.error('[ASSERT-ONCE HATA] uydurma-ID sızıntısı:\n  ' + idHata.join('\n  ')); process.exit(1); }
console.log('[assert-once] MALT_ALIAS(' + Object.keys(MALT_ALIAS).length + ') + HOP_ALIAS(' + Object.keys(HOP_ALIAS).length + ') tüm değerler canlı katalogda ✓ (uydurma-ID=0)');

// ── 4. MAYA-TİP SINIFLANDIRICI (ham serbest-metin → tip) ──
// Öncelik sırası önemli: sour > kveik > wit > wheat > saison > belcika > lager > ale.
function mayaTip(raw) {
  const s = String(raw || '').toLowerCase();
  if (/brett|lacto|pedio|\bsour\b|lambic|gueuze|geuze|coolship|spontaneous|dregs|mixed culture|wild|philly|lachancea|funk|roeselare|3763|3278|5335|5733|3191/.test(s)) return 'sour';
  if (/kveik|voss|hornindal|oslo|hothead|lutra|espe|3333 ?kveik/.test(s)) return 'kveik';
  if (/\bwit\b|witbier|blanche|3944|belgian wit|wlp400/.test(s)) return 'wit';
  if (/weizen|weihenstephan|hefe|weiss|3068|3638|3333|wb-?06|bavarian wheat|munich classic|wlp300|wlp380|m20|weissbier|dunkelweizen/.test(s)) return 'wheat';
  if (/saison|3711|3724|3726|belle saison|farmhouse|dupont|m29|wlp565|wlp585|wlp590|wlp670|be-?134|565|585|670/.test(s)) return 'saison';
  if (/trappist|abbey|abbaye|belgian|ardennes|3787|3522|1388|wlp500|wlp510|wlp530|wlp540|wlp550|wlp570|t-?58|be-?256|chimay|westmalle|rochefort|duvel|tripel|dubbel|golden strong|m31|m47|s-?33|3763b/.test(s)) return 'belcika';
  if (/lager|pils|urquell|w-?34\/?70|34\/70|w34|s-?189|s-?23|2124|2206|2308|2001|2112|2007|diamond|830|833|838|800|801|820|940|bohemian|münchner|munich lager|mexican lager|california common|california lager|steam|maibock|m54|m76|m84|imp l0|imp_l|augustiner/.test(s)) return 'lager';
  if (/us-?05|s-?04|1056|1272|1275|1318|1028|1084|1728|1968|1469|nottingham|windsor|london|irish|scottish|chico|american ale|english ale|wlp001|wlp002|wlp004|wlp007|wlp013|wlp017|wlp023|wlp029|wlp036|bry-?97|verdant|k-?97|conan|a01|a04|a09|a10|a15|a24|a38|oyl|ringwood|thames|yorkshire|whitbread|esb|west coast|dry english/.test(s)) return 'ale';
  return 'unknown';
}
// ham metin → belirgin katalog maya ID (mode için). Yoksa null.
const YEAST_ID_RE = [
  [/us-?05|1056|chico|bry-?97|wlp001|american ale\b/, 'us05'], [/s-?04|1084 ?irish|wlp004|nottingham|1968|london esb|1028|wlp002|wlp007|windsor|english ale/, 's04'],
  [/1318|london ale iii|verdant/, 'wy1318'], [/1272/, 'wy1272'], [/1728|scottish/, 'wy1728'],
  [/w-?34\/?70|34\/70|w34|saflager|diamond/, 'w3470'], [/s-?189/, 's189'], [/2124|bohemian lager|urquell|2001/, 'wy2124'],
  [/2206|bavarian lager/, 'wy2206'], [/2308|munich lager/, 'wy2308'], [/s-?23|s23/, 's23'],
  [/3068|weihenstephan|hefeweizen|wlp300/, 'wy3068'], [/3638|bavarian wheat/, 'wy3638'], [/wb-?06|munich classic/, 'wb06'],
  [/3944|belgian wit|wit\b/, 'wy3944'], [/3787|trappist|westmalle|rochefort|chimay|high grav/, 'wy3787'],
  [/3522|ardennes/, 'wy3522'], [/1388|belgian strong/, 'wy1388'], [/be-?256|abbey|abbaye|wlp530|wlp500/, 'be256'],
  [/t-?58/, 't58'], [/3711|french saison|belle saison|farmhouse/, 'wy3711'], [/3724|belgian saison|dupont/, 'wy3724'],
  [/be-?134/, 'be134'], [/kveik|voss/, 'kveikv'], [/hornindal/, 'kveik_fg'], [/oslo/, 'kveiko'],
  [/köln|koln|kölsch|kolsch|wlp029|k-?97/, 'la_koln']
];
function yeastId(raw) {
  const s = String(raw || '').toLowerCase();
  for (const [re, id] of YEAST_ID_RE) if (re.test(s)) return mayaById[id] ? id : null;
  return null;
}
const TIP_KANONIK = { ale: 'us05', lager: 'w3470', wheat: 'wy3068', wit: 'wy3944', belcika: 'wy3787', saison: 'wy3711', kveik: 'kveikv' };
function med(a) { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; }

// ── RENK ALTYAPISI: aile konsolidasyonu + motor-renk kalibrasyonu ──
// Uygulamanın hSRM'i KOYU stiller için "sıcak" (gerçek SRM araçlarından ~+10..+25),
// AÇIK için "soğuk" (Vienna −4) çalışır (motor içsel-tutarlı; V1a küratörü elle
// telafi etti: "koyu çıktı → koyu malt %'si kısıldı"). V2 iskeletlerini AYNI
// standartta üretmek için: (1) yığılmış alternatif koyu/crystal maltları TEK mode
// temsilciye indir (gerçek gristler tek kavurma kullanır), (2) motor-SRM'i BJCP
// aralığına DETERMİNİSTİK ölçekle (Morey üsteli 0.6859 ile hedefe, delta baz malta).
const maltRById = {}; MALTLAR.filter(m => m).forEach(m => maltRById[m.id] = +m.r || 0);
const DARK_FAM = new Set(['roast', 'choc', 'pale_choc', 'pale_choc2', 'black', 'midnight', 'crf1', 'crf2', 'crf3', 'dehusked_black', 'roast_wheat']);
const CRYSTAL_FAM = new Set(['c10', 'c20', 'c40', 'c60', 'c80', 'c120', 'c150']);
// delta'yı emen açık baz maltlar (renksiz backbone); munich/vienna renk taşır → emici DEĞİL
const BAZ_EMICI = new Set(['pilsner', 'pale_ale', 'maris', 'bel_pils', 'golden_promise', 'wheat', 'rwh', 'oat', 'corn', 'rice_flaked', 'flaked_wheat', 'torr_wh', 'fbar']);
const RENK_ESIK = 20; // r>=20 = kalibre edilebilir renk malt (crystal/caramunich/roast/specialty)
const KOYU_SMAX = 30; // X2 (design_srm_motor_teshis): BJCP srm-tavanı >=30 = siyah/opak görsel bandı. Tavan GÖRSEL
// konvansiyon, hesap-SRM değil (otantik RIS hesabı 60-90). Bu stillerde SRM ÜST-yönü serbest: üst-yön kalibrasyon +
// tooHot + kapı-üst kontrolü devre dışı; ALT kontrol ve OG/IBU (sayısal-anlamlı) AYNEN. DİKKAT: gelecek koşuda koyu
// stil medyan gristi trimlenmeden geçer — GT koyu srm/grist alanları şişik olabilir, koşu öncesi göz-kontrolü şart.

// aile konsolidasyonu: yığılmış alternatifleri (temiz reçetelerden) TEK mode temsilciye
// indir; temsilcinin %'si = reçete-başı-aile-toplamının medyanı. gerçek gristler tek
// kavurma + tek-iki crystal kullanır; medyan-yığılması bunu bozar, konsolidasyon düzeltir.
function konsolideAile(medians, temiz, FAM) {
  const uyeler = Object.keys(medians).filter(id => FAM.has(id));
  if (uyeler.length < 2) return; // 0-1 üye: indirilecek yığılma yok
  const famMed = med(temiz.map(r => uyeler.reduce((a, id) => a + (r.grist[id] || 0), 0)));
  uyeler.forEach(id => delete medians[id]);
  if (famMed >= FAM_MIN) {
    const pres = {}, tot = {};
    uyeler.forEach(id => { pres[id] = temiz.filter(r => (r.grist[id] || 0) > 0).length; tot[id] = temiz.reduce((a, r) => a + (r.grist[id] || 0), 0); });
    const mode = uyeler.filter(id => pres[id] > 0).sort((a, b) => (pres[b] - pres[a]) || (tot[b] - tot[a]) || a.localeCompare(b))[0];
    if (mode) medians[mode] = famMed;
  }
}
// motor hedefi (SRM/OG/IBU) — geçici enjekte + _stilIskeletHesap oku (SRM hop'tan bağımsız)
function motorHedef(ad, grFloat, hop, mayaId) {
  ctx.STIL_ISKELET[ad] = { grist: grFloat, hop: hop || [], mayaId: mayaId || 'us05', mashSc: 67 };
  const r = ctx.window._stilIskeletHesap(ad, HACIM, VERIM);
  delete ctx.STIL_ISKELET[ad];
  return r ? { srm: r.hedef.srm, og: r.hedef.og, ibu: r.hedef.ibu } : null;
}
// motor-renk kalibrasyonu: SRM'i BJCP aralığına (üst-orta hedef, koyu karakter korunur)
// DETERMİNİSTİK ölçekle. Morey üsteli 0.6859 ile ilk adım hedefe yakın; motorla 6 iter
// yakınsa. Renk malt %'sini (r>=RENK_ESIK) ölçekler, delta'yı en büyük açık baz malta
// taşır (V1a küratörünün elle "koyu malt kısıldı" işleminin otomatik + tersinir hali).
function renkKalibre(ad, grFloat, hop, mayaId) {
  const bj = BJCP[ad], smin = bj.srm[0], smax = bj.srm[1], koyu = smax >= KOYU_SMAX;
  const hed0 = motorHedef(ad, grFloat, hop, mayaId);
  if (!hed0) return { gr: grFloat, srm: null, motorNull: true };
  const srm0 = hed0.srm;
  if (!koyu && srm0 > 1.9 * smax) return { gr: grFloat, srm: srm0, srm0, tooHot: true }; // >1.9×max: koyu karakteri BJCP'ye sığdırmak stili gutlar → DÜŞÜR (gerçek RIS ~2× BJCP-max koyu, defining kavurma kaybolur)
  // İÇ-BANT: yalnız sınıra yakın/dışında olanları düzelt; comfortably-içerideki grist KORUNUR
  // (DIPA 7.1 SRM pale kalmalı, mid'e koyulaştırılmamalı). Sınır düzeltmesinde YAKIN kenara
  // niş — koyu stiller koyu ucta, açık stiller açık ucta; tam-sayı yuvarlamasına tampon.
  let margin = Math.max(0.6, 0.12 * (smax - smin));
  let safeLo = smin + margin, safeHi = koyu ? Infinity : smax - margin; // koyu: üst-yön kalibrasyon YOK (gutlama önlenir)
  if (safeLo >= safeHi) { safeLo = smin; safeHi = smax; } // dar aralık: iç-bant yok
  let gr = grFloat.map(g => [g[0], g[1]]);
  const target = (srm0 < safeLo) ? safeLo : (srm0 > safeHi ? safeHi : srm0); // içerideyse target=srm0 (kullanılmaz, döngü girmez)
  let srm = srm0, iter = 0;
  for (; iter < 6 && !(srm >= safeLo && srm <= safeHi); iter++) {
    const calibSum = gr.filter(g => maltRById[g[0]] >= RENK_ESIK).reduce((a, g) => a + g[1], 0);
    if (calibSum <= 0.001) break; // renk malt yok → ayarlanamaz (gate düşürür)
    let bi = gr.map((g, i) => BAZ_EMICI.has(g[0]) ? i : -1).filter(i => i >= 0).sort((a, b) => gr[b][1] - gr[a][1])[0];
    if (bi == null) bi = gr.map((g, i) => maltRById[g[0]] < RENK_ESIK ? i : -1).filter(i => i >= 0).sort((a, b) => gr[b][1] - gr[a][1])[0];
    if (bi == null) break; // emici baz yok
    const bVal = gr[bi][1];
    let newSum = Math.min(60, Math.max(0.001, calibSum * Math.pow(target / Math.max(0.5, srm), 1 / 0.6859)));
    let delta = calibSum - newSum;                         // + renk azalt(base'e) / − renk artır(base'den)
    if (delta < 0) delta = Math.max(delta, -(bVal - 1));   // base'i 1'in altına indirme
    const scaleC = (calibSum - delta) / calibSum;
    gr = gr.map(g => maltRById[g[0]] >= RENK_ESIK ? [g[0], g[1] * scaleC] : [g[0], g[1]]);
    gr[bi][1] += delta;
    gr = gr.filter(g => g[1] > 0.01);
    const hed = motorHedef(ad, gr, hop, mayaId); if (!hed) break; srm = hed.srm;
  }
  return { gr, srm, srm0, target, iter };
}
// tam-sayı ince-ayar: float-kalibrasyon+yuvarlama sonrası kalan ±SRM taşmasını (yüksek-gravite
// koyu stilde 1 renk-malt ±%1 ≈ ±2 SRM) GERÇEK tam-sayı gristte düzelt. En büyük renk maltı ±1,
// en büyük baz malt ∓1 (toplam 100 korunur). Motorla doğrula; 5 adımda yakınsamazsa gate düşürür.
function intNudge(ad, gr, hop, mayaId) {
  const bj = BJCP[ad], smin = bj.srm[0], smax = (bj.srm[1] >= KOYU_SMAX ? Infinity : bj.srm[1]); // koyu: üst-nudge yok
  for (let k = 0; k < 6; k++) {
    const h = motorHedef(ad, gr, hop, mayaId);
    if (!h || (h.srm >= smin && h.srm <= smax)) break;
    const ci = gr.map((g, i) => maltRById[g[0]] >= RENK_ESIK ? i : -1).filter(i => i >= 0).sort((a, b) => gr[b][1] - gr[a][1])[0];
    const bi = gr.map((g, i) => BAZ_EMICI.has(g[0]) ? i : -1).filter(i => i >= 0).sort((a, b) => gr[b][1] - gr[a][1])[0];
    if (ci == null || bi == null) break;
    if (h.srm > smax) { if (gr[ci][1] <= 1) break; gr[ci][1] -= 1; gr[bi][1] += 1; }   // renk azalt
    else { if (gr[bi][1] <= 1) break; gr[ci][1] += 1; gr[bi][1] -= 1; }                 // renk artır
  }
  return gr.filter(g => g[1] > 0);
}

// ── 5. slug → BJCP çözümü (SLUG_TO_BJCP + açık EK) ──
const SLUG_EK = {
  international_pale_lager: 'International Pale Lager',
  sweet_stout_or_cream_stout: 'Milk Stout / Sweet Stout',
  belgian_strong_blonde_ale: 'Belgian Strong Golden Ale',
  belgian_pale_ale: 'Belgian Pale Ale',
  czech_dark_lager: 'Czech Dark Lager',
  session_india_pale_ale: 'Session IPA',
  british_imperial_stout: 'Imperial / Russian Imperial Stout',
  mexican_amber_lager: 'Mexican Amber Lager',
  doppelbock: 'Doppelbock'
};
function bjcpAdi(slug) {
  if (SLUG_TO_BJCP[slug]) return SLUG_TO_BJCP[slug];
  if (slug in SLUG_EK) return SLUG_EK[slug];
  const norm = slug.replace(/_/g, ' ').toLowerCase();
  return Object.keys(BJCP).find(k => k.toLowerCase() === norm) || null;
}
// SOUR/WILD (blend-maya şeması yok) — V2 KAPSAM DIŞI, ertele.
// NOT: _ ile birleşik slug'da \b işe yaramaz (_ word-char) → (^|_)wild(_|$) kullan.
function sourMu(slug) { return /lambic|gueuze|geuze|gose|berliner|flanders|(?:^|_)wild(?:_|$)|brett|_sour|^sour|oud_bruin|lichtenhainer/.test(slug); }
// Stil-aile lager beklentisi (katman 3). Açık liste — regex-tahmin değil.
const LAGER_STYLES = new Set([
  'International Pale Lager', 'American Lager / Light Lager', 'Vienna Lager', 'Dortmunder Export',
  'Schwarzbier', 'Czech Dark Lager', 'Mexican Amber Lager', 'Doppelbock', 'Baltic Porter',
  'Czech Premium Pale Lager', 'International Amber Lager', 'Munich Dunkel'
]);

// Test/başka modüller için dışa aç (assert-once + alias tabloları + motor)
module.exports = { maltId, hopIdAlias, mayaTip, yeastId, bjcpAdi, sourMu, med, TIP_KANONIK,
  LAGER_STYLES, MALT_ALIAS, HOP_ALIAS, catIds, hopIds, mayaById, MALTLAR, HOPLAR, MAYALAR,
  BJCP, SLUG_TO_BJCP, STIL_ISKELET, ctx, HACIM, VERIM, ESIK, DOM_ORAN, FAM_MIN };
if (require.main !== module) return; // require ile yüklenince yalnız tablo/fonksiyon; CLI çalışmaz

// ── 6. HAM VERİ: 817 parse-edilebilir reçete → deterministik parse ──
let ham = [];
for (let b = 1; b <= 8; b++) {
  const j = JSON.parse(fs.readFileSync(__dirname + '/_ground_truth_v2_batch' + b + '.json', 'utf8'));
  (j.recipes || []).forEach(r => { r._batch = b; ham.push(r); });
}
const parseEdilebilir = ham.filter(r => r.malt_profile && r.malt_profile.length);
let sayac = { toplam: ham.length, parseEdilebilir: parseEdilebilir.length, maltAtla: 0, hopAtla: 0, uydurmaId: 0, parseOk: 0 };

function parseRecete(r) {
  // malt: hepsi eşlenmeli; herhangi biri undefined(bilinmeyen)/null(fermentable-yok) → reçete ATLA
  const grist = {};
  for (const m of r.malt_profile) {
    const id = maltId(m.name);
    if (id === undefined || id === null) { sayac.maltAtla++; return null; }
    if (!catIds.has(id)) { sayac.uydurmaId++; return null; } // assert-once ikinci hat (asla tetiklenmemeli)
    grist[id] = (grist[id] || 0) + (+m.pct || 0);
  }
  // hop: hepsi eşlenmeli
  const hops = [];
  for (const h of (r.hop_profile || [])) {
    const id = hopIdAlias(h.name);
    if (id === undefined || id === null) { sayac.hopAtla++; return null; }
    if (!hopIds.has(id)) { sayac.uydurmaId++; return null; }
    hops.push({ id, t: +h.time_min || 0, use: String(h.use || '').toLowerCase(), oz: +h.amount_oz || 0 });
  }
  sayac.parseOk++;
  return { slug: r.correct_style_slug, grist, hops, yTip: mayaTip(r.yeast), yId: yeastId(r.yeast), yRaw: r.yeast, srm: r.srm };
}
const parsed = parseEdilebilir.map(parseRecete).filter(Boolean);
console.log('[parse] ham=' + sayac.toplam + ' parse-edilebilir=' + sayac.parseEdilebilir +
  ' → parse-OK=' + sayac.parseOk + ' | atlandı: malt-eşlenemez=' + sayac.maltAtla + ' hop-eşlenemez=' + sayac.hopAtla +
  ' | UYDURMA-ID=' + sayac.uydurmaId + ' (assert-once, 0 olmalı)');

// ── 7. slug → BJCP hedefe grupla + DEDUP (alias birleştirme) ──
const bySlug = {}; parsed.forEach(r => { (bySlug[r.slug] = bySlug[r.slug] || []).push(r); });
// BJCP hedef → birleşik havuz (ana slug = en çok örnekli)
const havuz = {}; // bjcpAd → { recs:[], sluglar:{slug:n} }
const atla = [];
Object.entries(bySlug).sort((a, b) => b[1].length - a[1].length).forEach(([slug, rs]) => {
  if (sourMu(slug)) { atla.push('SOUR-ERTELE ' + slug + ' (n=' + rs.length + '): blend-maya şeması yok → V2 kapsam dışı'); return; }
  const ad = bjcpAdi(slug);
  if (!ad || !BJCP[ad]) { atla.push('BJCP-YOK ' + slug + ' (n=' + rs.length + ')'); return; }
  if (STIL_ISKELET[ad]) { atla.push('KÜRATÖR/V1b-KAZANIR "' + ad + '" ← ' + slug + ' (n=' + rs.length + ')'); return; }
  if (!havuz[ad]) havuz[ad] = { recs: [], sluglar: {} };
  havuz[ad].recs.push(...rs); havuz[ad].sluglar[slug] = rs.length;
});

// ── 8. her BJCP havuzu: 3-katman maya-tip disiplini + türetme ──
const adaylar = {}, dusen = [];
Object.entries(havuz).forEach(([ad, { recs, sluglar }]) => {
  const bj = BJCP[ad];
  const etiket = Object.entries(sluglar).map(([s, n]) => s + '(' + n + ')').join('+');

  // KATMAN 1 — maya-tip ön-filtre: baskın tip + belirsizlik ertelemesi
  const tf = {}; recs.forEach(r => { if (r.yTip !== 'unknown') tf[r.yTip] = (tf[r.yTip] || 0) + 1; });
  const tSirali = Object.entries(tf).sort((a, b) => b[1] - a[1]);
  if (!tSirali.length) { dusen.push('"' + ad + '" [' + etiket + ']: maya-tip sınıflanamadı (hepsi unknown)'); return; }
  const [baskinTip, baskinN] = tSirali[0];
  const sinifliToplam = tSirali.reduce((a, [, n]) => a + n, 0);
  if (baskinN / sinifliToplam < DOM_ORAN) {
    dusen.push('"' + ad + '" [' + etiket + ']: maya-tip BELİRSİZ (' + tSirali.map(([t, n]) => t + ':' + n).join(', ') + ', baskın %' + Math.round(100 * baskinN / sinifliToplam) + '<%' + Math.round(100 * DOM_ORAN) + ') → ERTELE');
    return;
  }
  // baskın tip SOUR/wild ise blend-maya şeması gerekir → V2 kapsam dışı (slug adı ne olursa
  // olsun kategorik net; sourMu slug-regex kaçağını yakalar, örn. american_wild_ale)
  if (baskinTip === 'sour') { dusen.push('"' + ad + '" [' + etiket + ']: baskın maya-tip SOUR (blend-maya şeması yok) → V2 kapsam dışı, ertele'); return; }
  // KNOWN-azınlık (atipik) tipli reçeteleri ÇIKAR — Cold-IPA lager kirliliği BURADA elenir.
  // UNKNOWN (yeast-metni tanınmayan) ≠ atipik: rakip bilinen tip değil, yalnızca grist katkısı;
  // maya SADECE baskın-KNOWN tipten türetilir → maya-tip krizi korunur, grist havuzu açlıktan kurtulur.
  const domRecs = recs.filter(r => r.yTip === baskinTip);           // maya kanıtı (yalnız baskın known)
  const temiz = recs.filter(r => r.yTip === baskinTip || r.yTip === 'unknown'); // grist havuzu (+unknown)
  const cikanKnown = recs.length - temiz.length;                    // yalnız KNOWN-azınlık çıkarıldı
  const unkN = temiz.length - domRecs.length;

  // KATMAN 3 — stil-aile tutarlılığı (baskın tip stil ailesiyle çelişemez)
  const lagerBekle = LAGER_STYLES.has(ad);
  if (lagerBekle && baskinTip !== 'lager') { dusen.push('"' + ad + '" [' + etiket + ']: STİL-AİLE çelişki (lager stili × baskın ' + baskinTip + ' maya) → örneklem temsili değil'); return; }
  if (!lagerBekle && baskinTip === 'lager') { dusen.push('"' + ad + '" [' + etiket + ']: STİL-AİLE çelişki (ale-ailesi stili × lager baskın maya) → örneklem temsili değil'); return; }

  // KATMAN 2 — homojenlik eşiği: baskın-KNOWN kanıtı >=3 VE grist havuzu (baskın+unknown) >=ESIK
  if (domRecs.length < 3) { dusen.push('"' + ad + '" [' + etiket + ']: baskın-tip kanıtı zayıf (sınıflı ' + baskinTip + '=' + domRecs.length + '<3) → DÜŞÜR'); return; }
  if (temiz.length < ESIK) { dusen.push('"' + ad + '" [' + etiket + ']: ön-filtre sonrası havuz n=' + temiz.length + '<' + ESIK + ' (baskın ' + baskinTip + '=' + domRecs.length + '+unknown ' + unkN + ', ' + cikanKnown + ' known-atipik çıkarıldı) → DÜŞÜR'); return; }

  // 8a. GRIST medyanı (per katalog ID, yoksa=0; medyan>=FAM_MIN) + aile konsolidasyonu.
  // FLOAT tutulur — yuvarlama renk-kalibrasyonundan SONRA (8d) yapılır.
  const idSet = new Set(); temiz.forEach(r => Object.keys(r.grist).forEach(id => idSet.add(id)));
  const medians = {};
  idSet.forEach(id => { const m = med(temiz.map(r => r.grist[id] || 0)); if (m >= FAM_MIN) medians[id] = m; });
  konsolideAile(medians, temiz, DARK_FAM);      // yığılmış kavurma → tek mode temsilci
  konsolideAile(medians, temiz, CRYSTAL_FAM);   // yığılmış crystal → tek mode temsilci
  let gEnt = Object.entries(medians);
  if (!gEnt.length) { dusen.push('"' + ad + '" [' + etiket + ']: grist medyanı boş (>= %' + FAM_MIN + ' ID yok)'); return; }
  const gSum = gEnt.reduce((a, [, m]) => a + m, 0);
  let grF = gEnt.map(([id, m]) => [id, m * 100 / gSum]);  // float, 100'e normalize

  // 8b. HOP: aci=en-sık kaynatma>=25dk; aroma=en-sık geç(<25); kuru=en-sık dry-hop(>=2)
  function modHop(filtre) {
    const f = {};
    temiz.forEach(r => { const seen = new Set(); r.hops.filter(filtre).forEach(h => { if (!seen.has(h.id)) { seen.add(h.id); f[h.id] = (f[h.id] || 0) + 1; } }); });
    return Object.entries(f).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  }
  const aci = modHop(h => h.t >= 25 && !/dry/.test(h.use));
  const gec = modHop(h => h.t < 25 && !/dry/.test(h.use));
  const kuru = modHop(h => /dry/.test(h.use));
  if (!aci.length && !gec.length) { dusen.push('"' + ad + '" [' + etiket + ']: katalog-eşlenebilir kaynatma hop yok'); return; }
  const aciId = (aci[0] || gec[0])[0];
  const hop = [{ id: aciId, dk: 60, rol: 'aci' }];
  // aroma gL: 5-gal konvansiyonu ile veriden (clamp)
  function gLhesap(id, filtre, lo, hi, dv) {
    const ozs = [];
    temiz.forEach(r => { const h = r.hops.find(x => x.id === id && filtre(x)); if (h && h.oz > 0) ozs.push(h.oz * 28.3495 / BATCH_L); });
    const v = ozs.length ? +med(ozs).toFixed(1) : dv;
    return Math.min(hi, Math.max(lo, v));
  }
  if (gec.length && gec[0][1] >= 2) {
    const arId = gec[0][0];
    hop.push({ id: arId, dk: 10, rol: 'aroma', gL: gLhesap(arId, x => x.t < 25 && !/dry/.test(x.use), 0.3, 4, 1) });
  }
  if (kuru.length && kuru[0][1] >= 2) {
    const kuId = kuru[0][0];
    hop.push({ id: kuId, rol: 'kuru', gL: gLhesap(kuId, x => /dry/.test(x.use), 0.5, 8, 2) });
  }

  // 8c. MAYA: baskın-tip içinde mode katalog-ID; yoksa tip-kanonik
  const mf = {}; temiz.forEach(r => { if (r.yId && mayaById[r.yId] && mayaById[r.yId].tip === baskinTip) mf[r.yId] = (mf[r.yId] || 0) + 1; });
  const mSir = Object.entries(mf).sort((a, b) => b[1] - a[1]);
  const mayaId = (mSir[0] && mSir[0][0]) || TIP_KANONIK[baskinTip] || 'us05';
  if (!mayaById[mayaId]) { dusen.push('"' + ad + '" [' + etiket + ']: maya ID katalogda yok (' + mayaId + ')'); return; }

  // 8d. RENK KALİBRASYONU (motor-SRM → BJCP) + tam-sayıya yuvarla + 100'e sabitle
  const kal = renkKalibre(ad, grF, hop, mayaId);
  if (kal.tooHot) { dusen.push('"' + ad + '" [' + etiket + ']: motor-renk çok sıcak (SRM~' + Math.round(kal.srm0) + ' > 2×BJCP-max ' + bj.srm[1] + ') — kalibrasyon stili gutlar → DÜŞÜR (motor bu stili barındıramaz)'); return; }
  let gr = kal.gr.map(g => [g[0], Math.round(g[1])]).filter(g => g[1] > 0);
  gr.sort((a, b) => b[1] - a[1]);
  gr[0][1] += 100 - gr.reduce((a, g) => a + g[1], 0); // yuvarlama artığı → en büyük (baz) malta
  gr = gr.filter(g => g[1] > 0);
  gr = intNudge(ad, gr, hop, mayaId); // tam-sayı yuvarlama taşmasını gerçek gristte düzelt

  adaylar[ad] = {
    etiket, n: temiz.length, baskinTip, cikanKnown, unkN, domN: domRecs.length, srm0: kal.srm0,
    entry: { grist: gr, hop, mayaId, mashSc: 67, kaynak: 'cikarim_v2', n: temiz.length, maya: baskinTip }
  };
  console.log('[aday] "' + ad + '" [' + etiket + '] n=' + temiz.length + ' (baskın ' + baskinTip + '=' + domRecs.length + '+unk ' + unkN + ', ' + cikanKnown + ' known-atipik çıkarıldı) grist=' +
    JSON.stringify(gr) + ' hop=' + hop.map(h => h.id + '/' + h.rol).join(',') + ' maya=' + mayaId + ' (renk ' + (kal.srm0 != null ? kal.srm0.toFixed(1) : '?') + '→' + (kal.srm != null ? kal.srm.toFixed(1) : '?') + ')');
});

// ── 9. TUTARLILIK KAPISI (son savunma): calc ∈ BJCP + tüm ID canlı ──
const final = {};
Object.entries(adaylar).forEach(([ad, a]) => {
  // ID canlılığı (üçüncü hat)
  const idBad = a.entry.grist.filter(g => !catIds.has(g[0])).map(g => g[0])
    .concat(a.entry.hop.filter(h => !hopIds.has(h.id)).map(h => h.id));
  if (idBad.length) { dusen.push('"' + ad + '" KAPI: katalog-dışı ID ' + idBad.join(',')); return; }
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
  if (h.length) { dusen.push('"' + ad + '" [' + a.etiket + '] KAPI DÜŞTÜ: ' + h.join(' ')); return; }
  final[ad] = { ...a, kanit: { og: +og.toFixed(3), ibu: Math.round(ibu), srm } };
  console.log('[KAPI PASS] "' + ad + '" n=' + a.n + ' maya=' + a.baskinTip + ': OG=' + og.toFixed(3) + '[' + bj.og + '] IBU=' + Math.round(ibu) + '[' + bj.ibu + '] SRM=' + srm + '[' + bj.srm + ']');
});

// ── 10. rapor + STIL_ISKELET_V2 JS satırları ──
console.log('\n════════ SONUÇ ════════');
console.log('parse-OK reçete: ' + sayac.parseOk + '/' + sayac.parseEdilebilir + ' | UYDURMA-ID: ' + sayac.uydurmaId);
console.log('\nATLANAN slug (dedup/kurator/sour/bjcp-yok):' + (atla.map(d => '\n  · ' + d).join('') || ' yok'));
console.log('\nDÜŞEN havuz (maya-tip/homojenlik/grist/kapı):' + (dusen.map(d => '\n  ✗ ' + d).join('') || ' yok'));
const kabul = Object.keys(final);
console.log('\n>>> V2 EKLENEN: ' + kabul.length + ' YENİ iskelet');
kabul.forEach(ad => { const f = final[ad]; console.log('    "' + ad + '" n=' + f.n + ' maya=' + f.baskinTip + ' (kaynak: ' + f.etiket + ')  → OG ' + f.kanit.og + ' IBU ' + f.kanit.ibu + ' SRM ' + f.kanit.srm); });

function jsSatir(ad, e) {
  const grist = '[' + e.grist.map(g => "['" + g[0] + "'," + g[1] + ']').join(',') + ']';
  const hop = '[' + e.hop.map(h => '{id:\'' + h.id + '\'' + (h.dk != null ? ',dk:' + h.dk : '') + ',rol:\'' + h.rol + '\'' + (h.gL != null ? ',gL:' + h.gL : '') + '}').join(',') + ']';
  return '  ' + (JSON.stringify(ad) + ':').padEnd(34) + '{grist:' + grist + ', hop:' + hop +
    ", mayaId:'" + e.mayaId + "', mashSc:" + e.mashSc + ", kaynak:'cikarim_v2', n:" + e.n + ", maya:'" + e.maya + "'}";
}
const satirlar = kabul.map(ad => jsSatir(ad, final[ad].entry));
console.log('\n──── HTML STIL_ISKELET eki (V2 bloğu) ────');
console.log(satirlar.join(',\n'));

const out = {
  esik: ESIK, domOran: DOM_ORAN, sayac,
  eklenen: kabul.map(ad => ({ ad, ...final[ad] })), dusen, atla, satirlar
};
fs.writeFileSync(process.env.V2_OUT || (__dirname + '/_v2_sonuc.json'), JSON.stringify(out, null, 1));
console.log('\n[yazıldı] ' + (process.env.V2_OUT || (__dirname + '/_v2_sonuc.json')));
