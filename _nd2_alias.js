// ═══ SPRINT ND2 — ÖRNEK VERİSİNDEKİ DERGİ YAZIMLARI → KATALOG ALIAS'I (BV kuralıyla, build-time) ═══
// ALIAS = "bu ham ad BU katalog kaydını adlandırır" (BV: urun / jenerik / yazim). İKAME DEĞİL.
// Girdi: ornek_veri.js (K1-K4 örnek kalemleri) + HTML katalog (MALTLAR / MAYALAR / KATKILAR).
// Yöntem: BV L2 çözücüsüyle eşlenemeyen malt / özüt satırlarının HAM ADI (örnek verisinde birebir geçen yazım) sıralı kural
// tablosuyla bir katalog kaydına aday yapılır; KAPI:
//   K1 hedef katalogda var · K2 ham ad başka kaydın ad'ı ya da alias'ı değil · K3 RENK: adda °L/L/EBC sayısı varsa katalog
//   r ile tutarlı (kristal/karamel: |N−r| ≤ 2, sayı yoksa BAĞLANMAZ; diğerleri: |N−r| ≤ max(3, r·%25)) · K4 ham ad örnek
//   verisinde görülmüş (yapı gereği). Kural tablosu "aynı ürün / jenerik sınıf temsilcisi" ilkesini izler (BV emsali:
//   'crisp pale ale malt' → pale_ale); katalogda karşılığı OLMAYAN ürün (CaraVienne, Carastan, chit, red wheat…) bağlanmaz,
//   rapora "katalogda yok" olarak yazılır. Belirsiz ad (sayısız "crystal malt", "caramunich malt") BAĞLANMAZ.
// Kullanım: node _nd2_alias.js            → rapor (yazma yok)
//           node _nd2_alias.js --yaz      → kapıdan geçen alias'ları HTML katalog satırlarına ekler (ASSERT; tek hata = yazım yok)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html'), VF = path.join(__dirname, 'ornek_veri.js');
const YAZ = process.argv.includes('--yaz');
let html = fs.readFileSync(HF, 'utf8');
function blokAl(ad) { const i = html.indexOf('const ' + ad + '=['); let d = 0, j = i + ad.length + 7; for (; j < html.length; j++) { if (html[j] === '[') d++; else if (html[j] === ']') { d--; if (d === 0) break; } } return vm.runInNewContext('(' + html.slice(i + ad.length + 7, j + 1) + ')'); }
const KAT = { malt: blokAl('MALTLAR'), maya: blokAl('MAYALAR'), katki: blokAl('KATKILAR') };
const w = {}; fs.readFileSync(VF, 'utf8').split('\n').filter(l => /^window\.(_TOPLULUK_MADALYA|_NHC_MADALYA|_KAYNAKLI_ORNEK|_TOPLULUK_ORNEK) = /.test(l)).forEach(l => vm.runInNewContext(l, { window: w }));
// ── BV L2 (runtime _bmKatCoz ile aynı: ad + alias tam eşitlik) ──
const bvNorm = s => String(s == null ? '' : s).toLowerCase().replace(/[®™©]/g, '').replace(/[     ]/g, ' ').replace(/\s+/g, ' ').trim();
function sozluk(L) { const ad = new Map(); L.forEach(x => { if (!x) return; ad.set(bvNorm(x.ad), x.id); (x.alias || []).forEach(a => ad.set(bvNorm(a), x.id)); }); return ad; }
const SOZ = { malt: sozluk(KAT.malt), katki: sozluk(KAT.katki) };
// ── örnek verisindeki grist / ek ham adları (frekanslı, kademe bilgisiyle) ──
const ham = new Map(); // norm → {n, kademe:{K1..}, ornek}
function ekle(ad, k) { const n = bvNorm(ad); if (!n) return; const e = ham.get(n) || { n: 0, k: {}, ornek: ad }; e.n++; e.k[k] = (e.k[k] || 0) + 1; ham.set(n, e); }
[['_NHC_MADALYA', 'K1', true], ['_TOPLULUK_MADALYA', 'K1', true]].forEach(([t, k]) => Object.values(w[t] || {}).forEach(v => (v[1] || []).forEach(o => (o.g || []).forEach(g => ekle(g[0], k)))));
[['_KAYNAKLI_ORNEK'], ['_TOPLULUK_ORNEK']].forEach(([t]) => Object.values(w[t] || {}).forEach(v => v.forEach(o => (o.g || []).forEach(g => ekle(g[0], o.k)))));
// ── renk ayrıştırma: "(60 °l)", "60° l", "60°l", "60l", "60 l", "120 ebc" ──
function renk(n) {
  n = n.replace(/˚/g, '°');
  if (/\d\s*°\s*f\b/.test(n)) return -1; // °F yazım hatası → renk okunamaz, kristal BAĞLANMAZ
  const c = /\b(?:crystal|caramel)[ -]?(\d{2,3})\b(?!\s*(?:°|ebc|%))/.exec(n); if (c) return +c[1]; // "crystal 60" = 60 °L
  let m = /(\d{1,3}(?:\.\d)?)\s*(?:°\s*)?ebc\b/.exec(n); if (m) return +m[1] / 1.97;
  m = /(\d{1,3}(?:\.\d)?)\s*°\s*l\b|(\d{1,3}(?:\.\d)?)\s*°(?!\s*[cf])|(\d{1,3})\s*l\b|\bl\s*(\d{1,3})\b/.exec(n);
  return m ? +(m[1] || m[2] || m[3] || m[4]) : null;
}
// ── kural tablosu: [desen, hedef id | (renk)=>id, tür, renk modu] — İLK eşleşen kazanır; 'kristal' modunda sayı ZORUNLU ──
const KRISTAL = [[10, 'c10'], [20, 'c20'], [40, 'c40'], [60, 'c60'], [80, 'c80'], [120, 'c120'], [150, 'c150']];
const kristalSec = N => { if (N == null || N < 0) return null; const k = KRISTAL.find(([r]) => Math.abs(r - N) <= 2); return k ? k[1] : null; };
const KURAL = [
  // malthanenin kendi ürün kaydı (jenerik kayda gitmeden önce)
  [/\b(castle|ch[aâ]teau)\b.*\bspecial b/, 'chateau_specb', 'urun', 'renk'], [/\b(castle|ch[aâ]teau)\b.*\bblack\b/, 'chateau_black', 'urun', 'renk'], [/\b(castle|ch[aâ]teau)\b.*\bchocolat/, 'chateau_choc', 'urun', 'renk'],
  [/\b(castle|ch[aâ]teau)\b.*\bbiscuit\b/, 'chateau_biscuit', 'urun', 'renk'], [/\b(castle|ch[aâ]teau)\b.*\babbey\b/, 'chateau_abbey', 'urun', 'renk'], [/\b(castle|ch[aâ]teau)\b.*\bmunich\b(?!.*light)/, 'chateau_munich', 'urun', 'renk'],
  [/\b(castle|ch[aâ]teau)\b.*\bvienna\b/, 'chateau_vienna', 'urun', 'renk'], [/\b(castle|ch[aâ]teau)\b.*\bpils/, 'chateau_pils', 'urun', 'renk'], [/\b(castle|ch[aâ]teau)\b.*\bpale ale\b/, 'chateau_bld', 'urun', 'renk'],
  [/\bsimpson'?s\b.*\bchocolate\b(?!.*\bpale\b)/, 'pale_choc2', 'urun', 'renk'],
  [/\bbest(?: ?m[aä]lz)?\b.*\bcaramel pils/, 'best_caramel_p', 'urun', 'renk'], [/\bbest ?m[aä]lz\b.*\bpils|\bbest\b.*\bpils/, 'best_pils', 'urun', 'renk'], [/\bbest ?m[aä]lz\b.*\bpale ale\b/, 'best_pale', 'urun', 'renk'], [/\bbest ?m[aä]lz\b.*\bwheat\b/, 'best_wheat', 'urun', 'renk'],
  // özel ürünler (marka/ürün adı)
  // Carafa: katalogdaki crf1-3 = Carafa SPECIAL (kabuksuz). Düz "carafa ii" = kabuklu AYRI ürün → bağlanmaz (BV REDDET)
  [/\bcarafa\b(?=.*\b(special|spezial|dehusked|de-husked|debittered)\b).*\b(iii|3)\b/, 'crf3', 'urun', 'renk'], [/\bcarafa\b(?=.*\b(special|spezial|dehusked|de-husked|debittered)\b).*\b(ii|2)\b/, 'crf2', 'urun', 'renk'], [/\bcarafa\b(?=.*\b(special|spezial|dehusked|de-husked|debittered)\b).*\b(i|1)\b/, 'crf1', 'urun', 'renk'],
  [/\b(cara[- ]?munich|caramel[- ]munich)\b.*\b(iii|3)\b/, 'cara_munich3', 'urun', 'renk'], [/\b(cara[- ]?munich|caramel[- ]munich)\b.*\b(ii|2)\b/, 'cara_munich2', 'urun', 'renk'], [/\b(cara[- ]?munich|caramel[- ]munich)\b.*\b(i|1)\b/, 'cara_munich1', 'urun', 'renk'],
  [/\bcara ?aroma\b/, 'cara_aroma', 'urun', 'renk'], [/\bcara ?red\b/, 'cara_red', 'urun', 'renk'], [/\bcara ?hell\b/, 'cara_hell', 'urun', 'renk'], [/\bcara ?foam\b/, 'cara_foam', 'urun', 'renk'],
  [/\bcara ?belge\b/, 'cara_belge', 'urun', 'renk'], [/\bcara ?wheat\b/, 'cara_wheat', 'urun', 'renk'], [/\bcara ?rye\b/, 'cara_rye', 'urun', 'renk'], [/\bcara ?bohemian\b/, 'cara_dark', 'urun', 'renk'],
  [/\bweyermann\b.*\bcara ?pils\b/, 'cara_pils_w', 'urun', 'renk'],
  [/\bcara-?pils\b|\bdextrine? malt\b|\bcarapils\b/, 'carapils', 'jenerik', 'renk'],
  [/\bspecial b\b/, 'specb', 'urun', 'renk'], [/\bbest\b.*\baromatic\b/, 'best_aromatic', 'urun', 'renk'], [/\baromatic\b/, 'aromatic', 'jenerik', 'renk'],
  [/\bbiscuit\b/, 'bisk', 'jenerik', 'renk'], [/\bspecial roast\b/, 'briess_sroast', 'urun', 'renk'], [/\bvictory\b/, 'victory', 'urun', 'renk'],
  [/\bbest\b.*\bmelanoidin\b/, 'best_melano', 'urun', 'renk'], [/\bmelanoidin\b/, 'mel', 'jenerik', 'renk'], [/\bhoney malt\b/, 'hml', 'urun', 'renk'],
  [/\bbest\b.*\bacid/, 'best_acid', 'urun', 'renk'], [/\bacidulated\b|\bacid malt\b|\bsauermalz\b/, 'acid', 'jenerik', 'renk'],
  [/\bmidnight wheat\b/, 'midnight', 'urun', 'renk'], [/\bchocolate wheat\b|\broasted wheat\b/, 'roast_wheat', 'jenerik', 'renk'],
  [/\b(pale|light) chocolate\b/, 'pale_choc', 'jenerik', 'renk'], [/\bchocolate\b(?!.*\b(rye|wheat|oat)\b)/, 'choc', 'jenerik', 'renk'],
  [/\bblack patent\b|^(black malt|black)$|\bblack malt\b(?!.*debitter)/, 'black', 'jenerik', 'renk'],
  [/\broast(ed)? barley\b/, 'roast', 'jenerik', 'renk'],
  [/\bextra dark crystal\b|\bcrystal extra dark\b/, 'crystal_extra', 'urun', 'kristal'],
  // kristal / karamel: yalnız sayıyla, katalogdaki jenerik °L kaydına birebir (±2); munich/vienna/wheat/rye karamelleri hariç
  [/\b(crystal|caramel)\b(?!.*\b(munich|vienna|wheat|rye|amber|pils)\b)/, kristalSec, 'jenerik', 'kristal'],
  // baz maltlar
  [/\bmaris otter\b.*\bextra pale\b/, 'maris_extra', 'urun', 'renk'], [/\bmaris otter\b/, 'maris', 'jenerik', 'renk'],
  [/\bgolden promise\b/, 'golden_promise', 'urun', 'renk'], [/\bpearl\b/, 'pearl', 'urun', 'renk'], [/\bhalcyon\b/, 'halcyon', 'urun', 'renk'],
  [/\bbest(malz)?\b.*\bmunich\b.*\bdark\b/, 'best_munich_dark', 'urun', 'renk'], [/\bbest(malz)?\b.*\bmunich\b/, 'best_munich', 'urun', 'renk'], [/\bbest(malz)?\b.*\bvienna\b/, 'best_vienna', 'urun', 'renk'],
  [/\bmunich\b.*\b(ii|2|dark|10 ?°? ?l)\b|\bdark munich\b|\b10 ?° ?l munich\b/, 'dark_munich', 'jenerik', 'renk'],
  [/\bmunich\b.*\b(i|1|light)\b|\blight munich\b/, 'munich_light', 'jenerik', 'renk'],
  [/\bmunich\b(?!.*\bcara|.*caramel)/, 'munich', 'jenerik', 'renk'],
  [/\bvienna\b(?!.*\bcara|.*caramel)/, 'vienna', 'jenerik', 'renk'],
  [/\bbarke\b/, 'barke', 'urun', 'renk'], [/\bfloor-?malted bohemian\b/, 'bohemian', 'urun', 'renk'], [/\bbohemian pils/, 'bohem_pils', 'urun', 'renk'],
  [/\bbelgian\b.*\bpils|\bdingemans\b.*\bpils/, 'bel_pils', 'jenerik', 'renk'],
  [/\b(german|weyermann|durst|avangard|best(malz)?)\b.*\bpils|^pils(ner|ener|en)? malt$|^pilsner$|^pils malt$|\bpilsner \(weyermann\)/, 'pilsner', 'jenerik', 'renk'],
  [/\b(6|six)[- ]?row\b/, 'briess_6row', 'jenerik', 'renk'],
  [/\b(2|two)[- ]?row\b(?!.*\b(caramel|crystal)\b)/, 'briess_pale', 'jenerik', 'renk'],
  [/\b(british|english|uk|u\.k\.)(?=\W|$).*\bpale( ale)? malt\b|\bpale( ale)? malt \(u\.k\.\)/, 'pale_ale', 'jenerik', 'renk'],
  [/\bflaked\b.*\bwheat\b|\bwheat flakes\b/, 'flaked_wheat', 'jenerik', 'renk'], [/\bunmalted wheat\b|\braw (white )?wheat\b/, 'rwh', 'jenerik', 'renk'], [/\btorrified wheat\b/, 'torr_wh', 'jenerik', 'renk'],
  [/\boak[- ]smoked wheat\b/, 'smoked_oak', 'urun', 'renk'], [/\bdark wheat\b/, 'dark_wheat', 'jenerik', 'renk'],
  [/\b(white|pale|german|weyermann|belgian|durst|american)\b.*\bwheat malt\b|^wheat malt$|^wheat$/, 'wheat', 'jenerik', 'renk'],
  [/\bflaked (maize|corn)\b|\bmaize, flaked\b/, 'corn', 'jenerik', 'renk'], [/\bcorn grits\b/, 'corn_grits', 'jenerik', 'renk'],
  [/\bflaked oats?\b|\brolled oats\b|\boats, flaked\b/, 'oat', 'jenerik', 'renk'], [/\boat malt\b/, 'oat_malt', 'jenerik', 'renk'],
  [/\bflaked barley\b/, 'fbar', 'jenerik', 'renk'], [/\bflaked rice\b/, 'rice_flaked', 'jenerik', 'renk'], [/\bflaked rye\b/, 'flaked_rye', 'jenerik', 'renk'],
  [/\brice hulls\b/, 'rice_hulls', 'jenerik', 'yok'],
  [/\bpeat(ed)?[- ]smoked\b|\bpeated\b/, 'smoked_peat', 'jenerik', 'renk'], [/\b(beech(wood)?[- ]smoked|rauch|smoked) malt\b/, 'smoked', 'jenerik', 'renk'],
  [/^rye malt$|\b(german|weyermann)\b.*\brye malt\b/, 'rye', 'jenerik', 'renk'],
  [/\bamber malt\b/, 'amber', 'jenerik', 'renk'], [/\bmalted oats\b/, 'oat_malt', 'jenerik', 'renk'], [/\brauchmalz\b/, 'smoked', 'yazim', 'renk'],
  [/\bcorn sugar\b|\bdextrose\b/, 'dex', 'jenerik', 'yok'], [/^sucrose$|\btable sugar\b|\bcane sugar\b/, 'sek', 'jenerik', 'yok'], [/\bturbinado\b/, 'turbinado', 'jenerik', 'yok'],
  [/\blight brown sugar\b/, 'light_brown', 'jenerik', 'yok'], [/\bdark brown sugar\b/, 'dark_brown', 'jenerik', 'yok'], [/\bmolasses\b/, 'molasses', 'jenerik', 'yok'], [/^lactose$|\blactose \(milk sugar\)/, 'lak', 'jenerik', 'yok'], [/\bbrown malt\b/, 'brown', 'jenerik', 'renk'], [/\babbey malt\b/, 'abbey_malt', 'urun', 'renk']
];
// özüt / şeker → KATKILAR (alias alanı terimler kuralına girer)
const HARIC = {
  munich: /cara|caramel|crystal|extract|dme|munich \d/, dark_munich: /cara|caramel|crystal|extract|dme/, munich_light: /cara|caramel|crystal|extract|dme/,
  vienna: /cara|caramel|crystal|extract|dme/, wheat: /cara|caramel|chocolate|roast|dark|midnight|smoked|flake|unmalted|raw|extract|dme|red/,
  amber: /cara|caramel|extract|dme/, black: /debitter|dehusk/, smoked: /cherry|apple|oak|alder|mesquite|hickory|peat|briess/,
  sek: /caramel/, choc: /wheat|rye|oat|extract/, pilsner: /extract|dme|cara|caramel/, briess_pale: /extract|dme|cara|caramel|crystal/
};
const ALTERNATIF = /\bor\b|\/|\band\/or\b/;
// BV REDDET listesi (kimlik DEĞİL diye bilinçli reddedilen adlar) — aynen uygulanır
const BV_RED = require('./_bv_alias_kaynak.js').REDDET;
// K5 MALTHANE KAPISI (BV ilkesi: "rahr 2-row pale ≠ Briess — farklı malthane"): hedef kayıt markalıysa ham adda BAŞKA malthane
// geçmesi = farklı ürün → bağlanmaz. Ham adın malthanesinin katalogda kendi kaydı varsa (ör. "chateau special b" → chateau_specb)
// jenerik/başka kayda bağlanmaz. Jenerik (markasız) katalog kaydına markalı ham ad bağlanabilir (BV emsali: crisp pale ale malt → pale_ale).
const MALTHANE = [['briess', /\bbriess|breiss\b/], ['weyermann', /\bwe[yi]e?rm[ae]n+'?s?\b|\bwayermann\b|\bweyerman\b/], ['dingemans', /\bding[e]?man'?s?\b|\bdinegmans\b|\bdmc\b/],
  ['castle', /\bcastle\b|\bch[aâ]teau\b/], ['simpsons', /\bsimpson'?s\b/], ['crisp', /\bcrisp\b/], ['fawcett', /\bfawcett'?s?\b|\bthomas fawcett\b|\btf\b/], ['bestmalz', /\bbest ?m[aä]lz\b|\bbest\b/],
  ['viking', /\bviking\b/], ['thracian', /\bthracian\b/], ['hitit', /\bhitit\b/], ['muntons', /\bmunton'?s?\b|\bmunton s\b/], ['rahr', /\brahr\b/], ['great western', /\bgreat western\b/],
  ['durst', /\bdurst\b/], ['avangard', /\bavangard\b/], ['gambrinus', /\bgambrinus\b/], ['ireks', /\birek'?s\b/], ['mecca', /\bmecca\b/], ['proximity', /\bproximity\b/],
  ['dewolf', /\bdwc\b|\bde ?wolf\b/], ['baird', /\bbaird'?s?\b/], ['warminster', /\bwarminster\b/], ['swaen', /\bswaen\b/], ['cargill', /\bcargill\b/], ['joe white', /\bjoe white\b/], ['malteurop', /\bmalteurop\b/], ['pauls', /\bpauls\b/]];
const markaAl = t => MALTHANE.filter(([, re]) => re.test(t)).map(([m]) => m);
function malthaneKapisi(temiz, tip, id) {
  if (tip !== 'malt') return null;
  const x = KAT.malt.find(a => a.id === id); const hedefM = markaAl(bvNorm(x.ad)), hamM = markaAl(temiz);
  if (!hamM.length) return null;
  if (hedefM.length && !hamM.some(m => hedefM.indexOf(m) >= 0)) return 'farklı malthane (' + hamM.join('+') + ' ≠ ' + hedefM.join('+') + ')';
  return null; // malthanenin KENDİ ürün kaydı olan durumlar kural tablosunun başında açıkça (Castle / Simpsons / BestMalz)
} // "X or Y" = hangisi olduğu belirsiz → BAĞLANMAZ
const KURAL_KATKI = [
  [/\bdri?e?d? malt extract\b.*\b(light|extra light|pilsen|pilsner)\b|\b(light|extra[- ]light|pale|pilsen|pilsner|golden light)\b.*\bdried malt extract\b|\bextra light dried malt\b|\b(light|extra light|pale|pilsen|pilsner|golden light)\b.*\bdry malt extract\b|\b(light|extra light|pilsen|pilsner)\b.*\bdme\b|^dry malt extract$|^dme$/, 'dme'],
  [/\bliquid malt extract\b.*\b(light|extra light|pilsen|pilsner)\b|\b(light|extra light|pale|pilsen|pilsner|golden light)\b.*\bliquid malt extract\b|^liquid malt extract$|\b(light|pale)\b.*\blme\b/, 'lme_ekstra']
];
const OZUT_DISI = /munich|wheat|weizen|dark|amber|rye/; // yalnız soluk özüt katalogda
const KATKI_DISI = /\b(dry|dried|dme)\b/; // katı özüt sıvıya bağlanmaz
// ND2: formu yazmayan "light malt extract" kuru mu sıvı mı BELİRSİZ → LME'ye bağlanmaz (yalnız "liquid" / "lme" açıkça geçerse)
// ── aday + kapı ──
const sonuc = [], red = [], yokKat = new Map();
const adSahibi = (tip, n) => SOZ[tip].get(n);
for (const [n, e] of ham) {
  if (SOZ.malt.get(n) || SOZ.katki.get(n)) continue; // zaten eşleniyor
  const temiz = n.replace(/\([^)]*\)/g, m => /°|\bl\b|ebc/.test(m) ? m : ' ').replace(/\s+/g, ' ').trim();
  const N = renk(n);
  let hedef = null, tur = null, mod = null, tip = 'malt';
  if (ALTERNATIF.test(temiz)) { red.push([n, e.n, 'alternatifli ad ("or" / "/") — belirsiz']); continue; }
  // "bkz. …" gerekçeli BV kaydı kimlik REDDİ değil ("ad eşleşmesi yakalar" varsayımı; çözücü tam eşitlik olduğu için yakalamıyordu)
  if (BV_RED.malt[n] && !/^bkz\./.test(BV_RED.malt[n])) { red.push([n, e.n, 'BV REDDET: ' + BV_RED.malt[n]]); continue; }
  for (const [re, id, t, md] of KURAL) { if (re.test(temiz)) { const h = typeof id === 'function' ? id(N) : id; if (h && HARIC[h] && HARIC[h].test(temiz)) continue; hedef = h; tur = t; mod = md; break; } }
  if (!hedef) for (const [re, id] of KURAL_KATKI) { if (re.test(temiz) && !OZUT_DISI.test(temiz) && !(id === 'lme_ekstra' && KATKI_DISI.test(temiz))) { hedef = id; tur = 'jenerik'; mod = 'yok'; tip = 'katki'; break; } }
  if (!hedef) { if (mod === 'kristal') red.push([n, e.n, 'kristal: sayı yok ya da katalogda bu °L kaydı yok (N=' + N + ')']); else yokKat.set(n, e); continue; }
  const x = KAT[tip].find(a => a.id === hedef);
  if (!x) { red.push([n, e.n, 'K1 hedef yok: ' + hedef]); continue; }
  const sahip = adSahibi(tip, n); if (sahip && sahip !== hedef) { red.push([n, e.n, 'K2 başka kaydın adı/alias: ' + sahip]); continue; }
  const mk = malthaneKapisi(temiz, tip, hedef); if (mk) { red.push([n, e.n, 'K5 ' + mk]); continue; }
  if (mod === 'kristal' && (N == null || N < 0)) { red.push([n, e.n, 'kristal: renk sayısı yok']); continue; }
  if (mod !== 'yok' && N != null && tip === 'malt') {
    const r = +x.r, tol = mod === 'kristal' ? 2 : Math.max(3, r * 0.25);
    if (Math.abs(N - r) > tol) { red.push([n, e.n, 'K3 renk uyuşmaz: adda ' + N + '°L, katalog ' + hedef + ' r' + r]); continue; }
  }
  sonuc.push({ n, id: hedef, tip, tur, frek: e.n, k: e.k });
}
// ── MAYA: örnekte birebir geçen TAM ürün adı yazımları (kod köprüsü çözücüde; burada yalnız adı katalogdaki ürünü söyleyenler) ──
const SOZ_MAYA = sozluk(KAT.maya), mayaHam = new Map();
[['_NHC_MADALYA'], ['_TOPLULUK_MADALYA']].forEach(([t]) => Object.values(w[t] || {}).forEach(v => (v[1] || []).forEach(o => { if (o.y) { const n = bvNorm(o.y); mayaHam.set(n, (mayaHam.get(n) || 0) + 1); } })));
[['_KAYNAKLI_ORNEK'], ['_TOPLULUK_ORNEK']].forEach(([t]) => Object.values(w[t] || {}).forEach(v => v.forEach(o => { if (o.y) { const n = bvNorm(o.y); mayaHam.set(n, (mayaHam.get(n) || 0) + 1); } })));
const KURAL_MAYA = [[/^(lallemand )?wild ?brew philly sour$/, 'la_philly'], [/^lallemand diamond( lager)?$/, 'la_diamond'], [/^lallemand (lalbrew )?nottingham( ale)?$/, 'nottm'], [/^lallemand (lalbrew )?windsor( ale)?$/, 'la_windsor'], [/^lallemand (lalbrew )?belle saison$/, 'la_belle']];
for (const [n, f] of mayaHam) {
  if (SOZ_MAYA.get(n)) continue;
  const k = KURAL_MAYA.find(([re]) => re.test(n)); if (!k) continue;
  if (!KAT.maya.find(a => a.id === k[1])) { red.push([n, f, 'K1 maya hedef yok: ' + k[1]]); continue; }
  sonuc.push({ n, id: k[1], tip: 'maya', tur: 'urun', frek: f, k: {} });
}
// ── kapsama ölçümü (K1-K3 malt satırı) ──
let top = 0, once = 0, sonra = 0; const yeni = new Map(sonuc.map(s => [s.n, s]));
for (const [n, e] of ham) { const k13 = (e.k.K1 || 0) + (e.k.K2 || 0) + (e.k.K3 || 0); top += k13; if (SOZ.malt.get(n) || SOZ.katki.get(n)) { once += k13; sonra += k13; } else if (yeni.has(n)) sonra += k13; }
console.log('[ND2 alias] aday ' + sonuc.length + ' · red ' + red.length + ' · katalog-karşılıksız ad ' + yokKat.size);
console.log('[kapsama K1-K3 grist satırı · ham-ad bazında] önce %' + (100 * once / top).toFixed(1) + ' (' + once + '/' + top + ') → sonra %' + (100 * sonra / top).toFixed(1) + ' (' + sonra + '/' + top + ')');
const yokL = [...yokKat.entries()].sort((a, b) => b[1].n - a[1].n);
console.log('[katalogda karşılığı OLMAYAN en sık 40 ad]'); yokL.slice(0, 40).forEach(([n, e]) => console.log('  ' + e.n + '× ' + n));
console.log('[red (kapı) en sık 25]'); red.sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(r => console.log('  ' + r[1] + '× ' + r[0] + ' — ' + r[2]));
if (process.argv.includes('--liste')) { console.log('[eklenecek alias]'); sonuc.sort((a, b) => b.frek - a.frek).forEach(s => console.log('  ' + s.frek + '× ' + s.n + ' → ' + s.id + ' (' + s.tur + ')')); }
fs.writeFileSync(path.join(__dirname, 'working', '_nd2_alias_rapor.json'), JSON.stringify({ sonuc, red, yok: yokL.map(([n, e]) => [n, e.n]) }, null, 1));
// ── yazım: katalog satırına alias ekle (ASSERT) ──
if (YAZ) {
  const grup = {}; sonuc.forEach(s => { (grup[s.tip + ':' + s.id] = grup[s.tip + ':' + s.id] || []).push(s.n); });
  const L = html.split('\n'); let degisen = 0;
  for (const key of Object.keys(grup)) {
    const [tip, id] = key.split(':'); const bas = L.findIndex(l => l.includes('const ' + (tip === 'malt' ? 'MALTLAR' : tip === 'maya' ? 'MAYALAR' : 'KATKILAR') + '=['));
    let i = -1; for (let j = bas; j < L.length && j < bas + 400; j++) { if (L[j].includes('{id:"' + id + '",')) { if (i >= 0) { console.error('ABORT çift satır ' + id); process.exit(1); } i = j; } if (/^\];/.test(L[j])) break; }
    if (i < 0) { console.error('ABORT satır yok ' + id); process.exit(1); }
    const satir = L[i];
    const ekle_ = grup[key].sort();
    let yeniS;
    const am = /alias:\[([^\]]*)\]/.exec(satir);
    if (am) { const eski = JSON.parse('[' + am[1] + ']'); const birlesik = eski.concat(ekle_.filter(a => eski.indexOf(a) < 0)); yeniS = satir.replace(am[0], () => 'alias:' + JSON.stringify(birlesik)); }
    else { const m = /^(\s*\{id:"[^"]+",.*)\}(,?)(\s*(?:\/\/.*)?)(\r?)$/.exec(satir); if (!m) { console.error('ABORT biçim ' + id); process.exit(1); } yeniS = m[1] + ',alias:' + JSON.stringify(ekle_) + '}' + m[2] + m[3] + m[4]; }
    const obj = vm.runInNewContext('(' + yeniS.trim().replace(/,\s*(\/\/.*)?\r?$/, '').replace(/\/\/.*$/, '') + ')');
    if (obj.id !== id || !ekle_.every(a => obj.alias.indexOf(a) >= 0)) { console.error('ABORT doğrulama ' + id); process.exit(1); }
    L[i] = yeniS; degisen++;
  }
  fs.writeFileSync(HF, L.join('\n')); console.log('[yazıldı] ' + degisen + ' katalog satırı, ' + sonuc.length + ' alias');
}
