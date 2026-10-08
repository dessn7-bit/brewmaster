// ═══ SPRINT CC3 — K4 "📗 Topluluk reçetesi" EŞLEŞME KURALLARI (mekanik, testli) ═══
// Korpus (working/_step105_dataset_v8_clean.json, rmwoods = Brewer's Friend + Brewtoad) reçetesi bir stile YALNIZ şu iki
// yoldan biriyle bağlanır:
//   (a) etiket: reçetenin BEYAN ettiği stil etiketi (sorte_raw) o stili birebir adlandıran listede
//   (b) ad    : reçete adı, stilin ad kalıplarının HEPSİNE uyuyor (AND) ve hariç kalıbına uymuyor
// Belirsizlik = koyma: bir reçete birden çok stilin kuralına uyuyorsa HİÇBİRİNE alınmaz; olumsuzlayan ad ("not a …",
// "fake …") ad yolunda reddedilir. Bu dosya hem builder (_cc_build_k4.js) hem regresyon testi tarafından kullanılır.
'use strict';
function norm(s) {
  return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[‘’´`]/g, "'").replace(/[^a-z0-9'\/\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const OLUMSUZ = /\b(not|no|non|anti|fake|faux|almost|kinda|sorta|kind of|sort of|wannabe|wanna be|pseudo|mock|ish)\b/;
const MEYVE = /\b(fruit|fruited|berry|berries|cherry|cherries|peach|mango|passion ?fruit|raspberr\w*|blackberr\w*|blueberr\w*|strawberr\w*|guava|pineapple|apricot|plum|grape|lime|lemon|orange|grapefruit|watermelon|kiwi)\b/;
// [stil, { ad: [kalıp…] (hepsi), haric: kalıp, etiket: [birebir sorte_raw…], hopsuz: true (gruit/kvass/tepache), olumsuzSerbest }]
const KURAL = [
  ['Czech Pale Lager', { etiket: ['czech pale lager'], ad: [/\bczech (pale|light) lager\b|\bsvetle\b|\bvycepni\b/] }],
  ['Sour Ale / Kettle Sour', { ad: [/\bkettle[- ]?sour(ed)?\b/], haric: new RegExp(/\b(gose|berliner|ipa)\b|/.source + MEYVE.source), etiketHaric: /berliner|gose|lambic|gueuze|fruit/ }],
  ['Belgian Amber Ale', { ad: [/\bbelgian amber\b/], haric: /\b(pale|dubbel|strong|tripel)\b/, etiketHaric: /strong|tripel|dubbel|quad|pale|garde/ }],
  ['Scottish Ale / 80 Shilling', { etiket: ['scottish export 80/-', 'scottish export'], ad: [/\b80 ?(\/-|\/|shilling)|\beighty shilling\b/] }],
  ['Kriek / Fruit Lambic', { ad: [/\bkriek\b/], etiketHaric: /saison|ipa|stout|porter|wheat|weiss|blond|pale|lager|pils|witbier|berliner|gose/ }],
  ['Framboise / Fruit Lambic', { ad: [/\bframboise\b|\bframbozen\b/], etiketHaric: /saison|ipa|stout|porter|wheat|weiss|blond|pale|lager|pils|witbier|berliner|gose/ }],
  ['Hazy Pale Ale', { ad: [/\bhazy pale\b|\bhazy apa\b/], haric: /\b(ipa|india)\b/ }],
  ['Milkshake IPA', { ad: [/\bmilkshake\b/, /\bipa\b/] }],
  ['New Zealand Pilsner', { ad: [/\b(new zealand|nz|kiwi) ?pils(ner|ener)?\b/] }],
  ['Trappist Single / Abbey Ale', { etiket: ['trappist single'], ad: [/\btrappist single\b|\bpatersbier\b|\babbey single\b|\bbelgian single\b|\benkel\b/] }],
  ['Rye Wine', { ad: [/\brye ?wine\b/] }],
  ['Lichtenhainer', { etiket: ['lichtenhainer'], ad: [/\blichtenhainer\b/] }],
  ['Dampfbier', { ad: [/\bdampf ?bier\b/] }],
  ['Kentucky Common', { etiket: ['kentucky common'], ad: [/\bkentucky common\b/] }],
  ['Gruit Ale', { ad: [/\bgruit\b/], hopsuz: true, hopYasak: true }],   // gruit tanımı gereği şerbetçiotsuz (CC2 K3 kararıyla aynı)
  ['Peanut Butter Stout', { ad: [/\bpeanut ?butter\b/, /\bstout\b/] }],
  ['Double Milk Stout', { ad: [/\bdouble (milk|cream) stout\b/] }],
  ['Imperial Milk Stout', { ad: [/\bimperial (milk|cream|sweet) stout\b/] }],
  ['Matcha / Green Tea Beer', { ad: [/\bmatcha\b|\bgreen tea\b/] }],
  ['Elderflower Saison', { ad: [/\belder ?flower\b/, /\bsaison\b/] }],
  ['Yuzu IPA / Japanese Hop Beer', { ad: [/\byuzu\b/, /\bipa\b|\bjapanese\b/] }],
  ['Mixed Berry Sour', { ad: [/\bmixed[- ]?berr(y|ies)\b|\bberry medley\b|\btriple[- ]?berry\b|\bbumbleberry\b/, /\bsour\b/] }],
  ['Lavender Saison', { ad: [/\blavender\b/, /\bsaison\b/] }],
  ['Steinbier / Caramel Ale', { ad: [/\bstein ?bier\b|\bstone beer\b|\bhot rocks?\b/] }],
  ['International Pale Lager', { etiket: ['international pale lager'] }],
  ['White IPA', { etiket: ['specialty ipa: white ipa'], ad: [/\bwhite ipa\b/] }],
  ['Brown IPA', { etiket: ['specialty ipa: brown ipa'], ad: [/\bbrown ipa\b|\bindia brown\b/] }],
  ['Smoothie Sour', { ad: [/\bsmoothie\b/, /\bsour\b/] }],
  ['Alternative Grain Beer', { etiket: ['alternative grain beer'] }],
  ['London Brown Ale', { etiket: ['london brown ale'], ad: [/\blondon brown\b/] }],
  ['Pre-Prohibition Porter', { etiket: ['pre-prohibition porter'], ad: [/\bpre-?prohibition porter\b/] }],
  ['Kristallweizen', { ad: [/\bkristall? ?weiz(en)?\b|\bkristallweizen\b|\bcrystal weizen\b/] }],
  ['Leichtes Weizen', { ad: [/\bleicht(es)? ?weiz(en)?\b|\blight weizen\b|\bweizen light\b/] }],
  ['Hoppy Hefeweizen', { ad: [/\bhoppy (hefe ?weizen|hefe|weizen)\b|\bhopfen ?weisse?\b/] }],
  ['Helles Weizenbock / Weizenbock Hell', { ad: [/\b(hell(es)?|pale|blonde?) weizen ?bock\b|\bweizen ?bock hell\b/] }],
  ['Spiced Witbier', { ad: [/\bspiced (wit|witbier|white)\b/] }],
  ['Spiced Wheat Beer', { ad: [/\bspiced wheat\b/] }],
  ['Herb Wheat Beer', { ad: [/\b(herb(al)?|lemon ?grass|basil|rosemary|chamomile|thyme|sage) wheat\b/] }],
  ['Australian Wheat Beer', { ad: [/\b(australian|aussie) wheat\b/] }],
  ['Blanche Sour / Sour Witbier', { ad: [/\bsour (wit|witbier|blanche)\b|\b(witbier|blanche) sour\b/] }],
  ['New England Pale Ale', { ad: [/\bnew england pale\b|\bne pale ale\b|\bneapa\b|\bnepa\b/], haric: /\b(ipa|india)\b/ }],
  ['Hazy Bitter', { ad: [/\bhazy bitter\b/] }],
  ['Farmhouse IPA', { ad: [/\bfarmhouse ipa\b|\bsaison ipa\b|\bipa saison\b|\bindia saison\b/] }],
  ['New Zealand Pale Ale', { ad: [/\b(new zealand|nz|kiwi) pale\b/] }],
  ['Thiolized IPA / Biotech IPA', { ad: [/\bthiol(ized|ised)?\b/] }],
  ['Fresh Hop IPA', { ad: [/\b(fresh|wet)[- ]?hop(ped)?\b/, /\bipa\b/] }],
  ['Hazy Lager', { ad: [/\bhazy lager\b|\bnew england lager\b|\bhazy pils(ner)?\b/] }],
  ['Franconian Rotbier', { ad: [/\brotbier\b|\bnuremberg red\b|\bnurnberger rot\b/] }],
  ['German Leichtbier', { etiket: ['german leichtbier'], ad: [/\bleicht ?bier\b/], haric: /\bweiz/ }],
  ['Mexican Light Lager', { ad: [/\bmexican (light|lite)\b|\blight mexican\b/], haric: /\bale\b/ }],
  ['Mexican Amber Lager', { ad: [/\bmexican (amber|vienna)\b|\bamber mexican\b/] }],
  ['Contemporary Gose', { ad: [/\bcontemporary gose\b|\bmodern gose\b/] }],
  ['Non-Alcoholic Beer', { ad: [/\bnon[- ]?alcoholic\b|\balcohol[- ]free\b|\bna beer\b|\bnab\b|\bnear beer\b/], olumsuzSerbest: true }],
  ['Oat Cream Lager', { ad: [/\boat cream lager\b/] }],
  ['Golden Stout', { ad: [/\b(golden|blonde?|white|pale) stout\b/] }],
  ['Nordic Pale Ale', { ad: [/\b(nordic|scandinavian) pale\b/] }],
  ['Pastry Sour', { ad: [/\bpastry sour\b/] }],
  ['Smoothie Stout', { ad: [/\bsmoothie stout\b/] }],
  ['Hazy Red IPA', { ad: [/\bhazy red\b|\bred neipa\b|\bred new england\b/] }],
  ['Dark NEIPA', { ad: [/\bdark (neipa|new england|hazy)\b|\bblack neipa\b/] }],
  ['Sour IPA', { ad: [/\bsour(ed)? ipa\b|\bsour india\b/], haric: MEYVE }],
  ['Hop Bursted IPA', { ad: [/\bhop ?burst(ed)?\b/, /\bipa\b/] }],
  ['Cryo Hop IPA', { ad: [/\bcryo\b/, /\bipa\b/] }],
  ['Ranch Water Lager', { ad: [/\branch water\b/] }],
  ['Zoigl Beer', { ad: [/\bzoigl\b/] }],
  ['Helles Naturtrüb', { ad: [/\bnaturtrub\b|\bunfiltered hell(es)?\b/], haric: /\bweiz|\bweiss|\bhefe|\bwheat/, etiketHaric: /weiss|weizen|wheat|wit/ }],
  ['Light Craft Lager', { ad: [/\b(craft light|light craft) lager\b/] }],
  ['Mexican Candy Gose', { ad: [/\bchamoy\b|\bmexican candy\b|\bmexican\b|\btamarind\b/, /\bgose\b/] }],
  ['Piña Colada Gose', { ad: [/\bpina colada\b/, /\bgose\b/] }],
  ['Cucumber Gose', { ad: [/\bcucumber\b/, /\bgose\b/] }],
  ['Session Sour', { ad: [/\bsession sour\b/] }],
  ['Pumpkin Stout', { ad: [/\bpumpkin\b/, /\bstout\b/] }],
  ['Maple Bourbon Stout', { ad: [/\bmaple\b/, /\bbourbon\b/, /\bstout\b/] }],
  ["S'mores Stout", { ad: [/\bs'?mores\b/, /\bstout\b/] }],
  ['Birthday Cake Stout', { ad: [/\bbirthday cake\b/, /\bstout\b/] }],
  ['Tepache Beer', { ad: [/\btepache\b/], hopsuz: true }],
  ['Hemp Beer / CBD Beer', { ad: [/\bhemp\b|\bcbd\b/] }],
  ['Agave Beer', { ad: [/\bagave\b/] }],
  ['Juicy Bitter', { ad: [/\bjuicy bitter\b/] }],
  ['Dry-Hopped Saison', { ad: [/\bdry[- ]?hop(ped)? saison\b/] }],
  ['Grisette', { ad: [/\bgrisette\b/] }],
  ['Table Saison', { ad: [/\btable saison\b|\bsaison de table\b/] }],
  ["Saison d'Hiver", { ad: [/\bsaison d'?hiver\b|\bwinter saison\b/] }],
  ['Tropical Saison', { ad: [/\btropical saison\b/] }],
  ['Provision Ale', { ad: [/\bprovision\b/], etiketHaric: /flanders|oud bru|lambic|red ale/ }],
  ['Modern Belgian Pale Ale', { ad: [/\bmodern belgian pale\b/] }],
  ['Barrel-Aged Belgian Quad', { ad: [/\b(barrel|bourbon|wine)[- ]aged\b|\bba\b/, /\bquad(rupel)?\b/] }],
  ['American Pilsner', { ad: [/\bamerican pils(ner|ener)?\b/], haric: /\b(classic|pre-?prohibition|cap)\b/, etiketHaric: /classic american pilsner|pre-prohibition/ }],
  ['Mexican Dark Lager', { ad: [/\bmexican dark\b|\bdark mexican\b|\bnegra modelo\b/] }],
  ['American Wheat IPA / Hoppy Wheat', { ad: [/\bwheat ipa\b|\bhoppy wheat\b|\bindia wheat\b/] }],
  ['Hoppy Porter', { ad: [/\bhoppy porter\b|\bindia porter\b/] }],
  ['Kvass', { ad: [/\bkvass?\b/], hopsuz: true }],
  ['Oat Cream IPA', { ad: [/\boat cream\b/, /\bipa\b/] }],
  ['Triple IPA', { ad: [/\btriple ipa\b|\btipa\b|\biiipa\b/] }]
];
const KURAL_MAP = new Map(KURAL);
// tek bir stile göre eşleşme: 'etiket' | 'ad' | null
function eslesStil(stil, ad, etiket) {
  const r = KURAL_MAP.get(stil); if (!r) return null;
  const e = norm(etiket), a = norm(ad);
  if (!r.olumsuzSerbest && OLUMSUZ.test(a)) return null;               // olumsuzlayan/kaçamak ad ("not a …", "sorta …") her iki yolda da reddedilir
  if (r.etiketHaric && r.etiketHaric.test(e)) return null;             // beyan edilen etiket komşu/çelişen stili söylüyorsa → koyma
  if (r.etiket && r.etiket.some(x => norm(x) === e)) return 'etiket';   // iki taraf da aynı normalleştirmeden geçer (':' vb.)
  if (!r.ad || !a) return null;
  if (!r.ad.every(k => k.test(a))) return null;
  if (r.haric && r.haric.test(a)) return null;
  return 'ad';
}
// tüm kurallar: TAM OLARAK bir stile uyarsa {stil, es}; hiç uymazsa ya da birden çok stile uyarsa null (belirsiz = koyma)
function esles(ad, etiket) {
  const L = [];
  for (const [stil] of KURAL) { const es = eslesStil(stil, ad, etiket); if (es) L.push({ stil, es }); }
  return L.length === 1 ? L[0] : null;
}
function eslesHepsi(ad, etiket) { const L = []; for (const [stil] of KURAL) { const es = eslesStil(stil, ad, etiket); if (es) L.push({ stil, es }); } return L; }
module.exports = { KURAL, norm, esles, eslesStil, eslesHepsi };
