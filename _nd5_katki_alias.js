// ═══ SPRINT ND5 — LEZZET KATKISI YAZIMLARI → KATKILAR alias'ı + eksik lezzet katkıları (build-time) ═══
// ALIAS = KİMLİK (BV kuralı): "bu ham yazım BU katalog kaydını adlandırır", ikame DEĞİL. Form farkı (tohum / ezilmiş / öğütülmüş,
// püre / bütün meyve, taze / kuru) aynı ürün sayılır — kaydın ADI o formu dışlamıyorsa. Ayrı ürünler bağlanmaz (tatlı portakal ≠
// turunç, vanilya çubuğu ≠ vanilya özü, kahve çekirdeği ≠ espresso/soğuk demleme, ardıç meyvesi ≠ ardıç dalı, çeşit bal ≠ çiçek balı).
// Genel yazım ("coffee", "honey", "oak", "candi syrup") katalogda o GENEL ürüne karşılık gelen tek kayıt yoksa bağlanmaz.
// Her alias örnek verisinde (ornek_veri.js) gerçekten geçen bir yazımın ÇEKİRDEĞİDİR — denetim sayfada yapılır
// (tests/regresyon.mjs ND5-ALIAS: her alias → _bmMetinCoz birebir o kayıt + gerçek satır kanıtı).
// Kullanım: node _nd5_katki_alias.js --yaz  (ASSERT; tek hata = yazım yok; idempotent)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html');
const YAZ = process.argv.includes('--yaz');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }

const ALIAS = {
  kisnisch: ['coriander seed', 'coriander', 'indian coriander', 'fine-ground indian coriander', 'cracked coriander'],
  rezene: ['fennel seed'],
  vanilya: ['vanilla bean', 'madagascar vanilla beans'],
  vanilla_oz: ['vanilla extract'],
  portakal_kabuk: ['sweet orange peel'],
  // Curaçao portakalı (laraha) bir BITTER orange'dır — Wikipedia "Laraha"; witbier'de geleneksel kabuk bitter orange'dır (CB&B "Orange Appeal")
  turunc_kabuk: ['bitter orange peel', 'curaçao orange peel'],
  zencefil: ['ginger root', 'fresh grated ginger'],
  kahve_cekirdek: ['coffee beans', 'ground sumatran coffee', 'ground kona coffee'],
  espresso: ['cold-brewed coffee', 'cold brew coffee'],
  bitter_cik: ['dark bittersweet chocolate', 'bittersweet chocolate', 'bittersweet chcolate', 'dark chocolate'],
  kakao: ['cocoa nibs', 'unsweetened cocoa nibs', 'unsweetened cacao nibs'],
  kakao_toz: ['cocoa powder'],
  visne: ['sour cherries', 'tart cherry puree', 'sweet cherry puree'],
  ahududu: ['raspberry puree', 'raspberries'],
  bogurtlen: ['blackberry puree'],
  yaban_mersini: ['blueberries'],
  cranberry: ['cranberries'],
  mango: ['mango puree'],
  passion_fruit: ['passion fruit puree', 'passion fruit pulp'],
  guava: ['pink guava puree'],
  cilek: ['strawberries', 'shuksan strawberries'],
  greyfurt_meyve: ['pink grapefruit'],
  hurma: ['macerated dates'],
  kuru_uzum: ['raisins', 'chopped raisins', 'blackened raisins'],
  tarcin: ['cinnamon sticks'],
  anason: ['anise seed'],
  defne: ['bay leaves'],
  limon_otu: ['lemon grass', 'lemongrass stalks'],
  hibiskus: ['hibiscus flowers'],
  yasemin: ['jasmine flowers'],
  yarrow: ['yarrow leaves'],
  heather: ['heather tips'],
  spruce_tip: ['colorado blue spruce tips'],
  ardic_dal: ['juniper branches', 'juniper twigs'],
  mese_cipsi: ['oak chips', 'french oak chips'],
  mese_spiral: ['french oak spiral'],
  demerera: ['turbinado sugar', 'turbnado sugar', 'demerara sugar'],
  // panela = rapadura (Brezilya) = piloncillo (Meksika): aynı rafine edilmemiş küp şeker — Wikipedia "Panela"
  piloncillo: ['piloncillo sugar', 'rapadura sugar'],
  candi_s: ['clear belgian candi sugar', 'belgian clear candi sugar', 'clear belgian candy sugar'],
  ham_bal: ['wildflower honey'], // wildflower (çok çiçekli) = çiçek balı; ÇEŞİT ballar (orange blossom, buckwheat, blackberry) bağlanmaz
  lak: ['lactose', 'lactose sugar', 'lactose powder', 'milk sugar'],
  corn_sugar: ['dextrose corn sugar', 'corn sugar/dextrose'],
  // kayıt açıklaması "İyotsuz mutfak tuzu veya kosher salt (NaCl)": deniz / kosher / iyotsuz NaCl aynı ürün; iyotu belirtilmeyen
  // "table salt" BAĞLANMAZ (ABD sofra tuzu çoğunlukla iyotlu; gose kaynakları iyotsuz ister — CB&B "Special Ingredient: Salt")
  tuz_kosher: ['sea salt', 'kosher salt', 'non-iodized sodium chloride'],
  kuru_lime: ['lime peel'],
  yuzu: ['yuzu peel'],
  irish_moss: ['iris moss'], // örnek verisindeki yazım hatası (proses yardımcısı)
  // yeni kayıtlar (aşağıda) — parantez içi İngilizce adlar zaten terim; burada yalnız ek yazımlar
  karaman_kimyon: ['caraway seeds'],
  mese_kup: ['american oak cubes', 'medium toast american oak cubes', 'medium toast french oak cubes', 'medium-toast oak cubes']
};

// Kaynak linkleri: rapor + test. Doz alanları örnek verisindeki gerçek reçetelerden (g/L, 19 L partilerde) — uydurma doz yok.
const YENI = [
  '{id:"ardic_meyve",ad:"Ardıç Meyvesi (Juniper Berries)",g:"Baharat",gu:0,fermente:false,ibu_dk60:0,srm:0,etki:"OG/SRM etkisiz. Reçineli-biberimsi, cin benzeri aroma.",acik:"Juniperus communis meyvesi (kuru). Ardıç DALI ile aynı ürün DEĞİL: dal daha odunsu/iğne yapraklı, meyve daha biberimsi (Brewing Nordic, BYO Gordon Strong Sahti). Örnek reçetelerde 0,7–4,2 g/L (sahti mash 4,2; gruit 0,7–1,5). Kaynak: brewingnordic.com/new-nordic-beer/brewing-with-juniper-spruce-fir-pine/",kullanim:"Mash veya kaynatma sonu",birim:"g",tags:["Baharat","Sahti","Gin","Nordic"],varsayDozgL:0.75,maxDozgL:4.2,maxUyari:"Keskin reçine/cin baskın",onerilenZaman:["Mash","Kaynatma sonu"],fiyat:"orta",alerjen:[]}',
  '{id:"meyan_koku",ad:"Meyan Kökü (Licorice Root)",g:"Baharat",gu:0,fermente:false,ibu_dk60:0,srm:0,etki:"OG/SRM etkisiz. Yumuşak meyan tatlılığı, renk vermez.",acik:"Glycyrrhiza glabra kökü (kuru, kıyılmış). Brewer\'s licorice (yoğunlaştırılmış meyan özü çubuğu) AYRI ürün — çok daha yoğun (CB&B Special Ingredient: Brewer\'s Licorice). Örnek reçetelerde 0,7–1,5 g/L. Kaynak: beerandbrewing.com/special-ingredient-brewers-licorice",kullanim:"Kaynatma (son 15 dk)",birim:"g",tags:["Baharat","Licorice Root","Stout","Dubbel"],varsayDozgL:0.75,maxDozgL:1.5,maxUyari:"Meyan baskın, tatlımsı",onerilenZaman:["Kaynatmada"],fiyat:"ucuz",alerjen:[]}',
  '{id:"sweet_gale",ad:"Bataklık Mersini (Sweet Gale / Bog Myrtle)",g:"Baharat",gu:0,fermente:false,ibu_dk60:0,srm:0,etki:"OG/SRM etkisiz. Reçineli, tatlımsı, muskat ipuçlu aroma; gruit\'in klasik otu.",acik:"Myrica gale yaprağı (kuru). Ortaçağ gruit\'inin temel otu (Wikipedia: Myrica gale). Türkçe yerleşik adını bulamadım — ad İngilizce bog myrtle\'ın çevirisi. Örnek reçetelerde 0,5 g/L. Hamilelikte kullanılmaması önerilir. Kaynak: en.wikipedia.org/wiki/Myrica_gale",kullanim:"Kaynatma sonu",birim:"g",tags:["Baharat","Gruit","Herbal","Myrica"],varsayDozgL:0.5,maxDozgL:1,maxUyari:"Reçine/acılık baskın",onerilenZaman:["Kaynatma sonu"],fiyat:"orta",alerjen:[]}',
  '{id:"karaman_kimyon",ad:"Karaman Kimyonu (Caraway)",g:"Baharat",gu:0,fermente:false,ibu_dk60:0,srm:0,etki:"OG/SRM etkisiz. Sıcak, anason-fındıksı baharat.",acik:"Carum carvi tohumu. Kimyon (cumin) ile AYNI ürün değil. Bira ve kvass baharatı (ICAR-IISR caraway). Örnek reçetelerde 0,5 g/L. Kaynak: spices.res.in/products/spices/caraway.html",kullanim:"Kaynatma sonu",birim:"g",tags:["Baharat","Caraway","Kvass","Rye"],varsayDozgL:0.5,maxDozgL:1,maxUyari:"Ekmeksi-kimyonumsu baskın",onerilenZaman:["Kaynatma sonu"],fiyat:"ucuz",alerjen:[]}',
  '{id:"mese_kup",ad:"Meşe Küpü (Oak Cubes)",g:"Meşe",gu:0,fermente:false,ibu_dk60:0,srm:0,etki:"Yavaş, kontrollü meşe/vanilya/tanen.",acik:"Kızartılmış meşe küpleri. Cips ile aynı ürün DEĞİL: yüzeyi az, aroma haftalar-aylar içinde gelir, çıkarması kolay (BYO Oak Alternatives). Örnek reçetelerde 1,5 g/L (ikincil). Kaynak: byo.com/articles/oak-alternatives-oaking-methods/",kullanim:"İkincil / olgunlaştırma",birim:"g",tags:["Meşe","Cubes","Ahşap","Barrel"],varsayDozgL:1.5,maxDozgL:3,maxUyari:"Aşırı tanen/odunsu",onerilenZaman:["Fermantasyon sonu"],fiyat:"orta",alerjen:[]}'
];
const YENI_ID = YENI.map(s => /id:"([^"]+)"/.exec(s)[1]);

module.exports = { ALIAS, YENI_ID };
if (require.main === module) main();
function main() {
const html = fs.readFileSync(HF, 'utf8');
const L = html.split('\n');
const bas = L.findIndex(l => l.includes('const KATKILAR=['));
let son = -1; for (let j = bas; j < L.length; j++) if (/^\];/.test(L[j])) { son = j; break; }
if (bas < 0 || son < 0) abort('KATKILAR bloğu yok');
// ── yeni kayıtlar (yoksa) ──
const varMi = id => { for (let j = bas; j < son; j++) if (L[j].includes('{id:"' + id + '",')) return true; return false; };
const ekle = YENI.filter((s, i) => !varMi(YENI_ID[i]));
if (ekle.length && ekle.length !== YENI.length) abort('yeni kayıtların bir kısmı var, bir kısmı yok');
if (ekle.length) {
  const onc = L[son - 1]; if (!/\}\s*\r?$/.test(onc)) abort('son kayıt biçimi');
  const cr = onc.endsWith('\r') ? '\r' : '';
  L[son - 1] = onc.replace(/\}(\s*)(\r?)$/, '},$1$2');
  L.splice(son, 0, '  // ═══ SPRINT ND5 — örnek verisinde ≥2 kez geçen / stil imzası olup katalogda karşılığı OLMAYAN lezzet katkıları ═══' + cr,
    ...ekle.map((s, i) => '  ' + s + (i < ekle.length - 1 ? ',' : '') + cr));
  son += ekle.length + 1;
}
// ── alias ──
let degisen = 0;
for (const id of Object.keys(ALIAS)) {
  let i = -1; for (let j = bas; j < son; j++) if (L[j].includes('{id:"' + id + '",')) { if (i >= 0) abort('çift satır ' + id); i = j; }
  if (i < 0) abort('satır yok ' + id);
  const satir = L[i], ek = ALIAS[id].slice().sort();
  const am = /alias:\[([^\]]*)\]/.exec(satir); let yeniS;
  if (am) { const eski = JSON.parse('[' + am[1] + ']'); const birlesik = eski.concat(ek.filter(a => eski.indexOf(a) < 0)); if (birlesik.length === eski.length) continue; yeniS = satir.replace(am[0], () => 'alias:' + JSON.stringify(birlesik)); }
  else { const m = /^(\s*\{id:"[^"]+",.*)\}(,?)(\s*)(\r?)$/.exec(satir); if (!m) abort('biçim ' + id); yeniS = m[1] + ',alias:' + JSON.stringify(ek) + '}' + m[2] + m[3] + m[4]; }
  const obj = vm.runInNewContext('(' + yeniS.trim().replace(/,\s*$/, '') + ')');
  if (obj.id !== id || !ek.every(a => obj.alias.indexOf(a) >= 0)) abort('doğrulama ' + id);
  L[i] = yeniS; degisen++;
}
// blok bütün olarak değerlendirilebilmeli
const blok = L.slice(bas, son + 1).join('\n').replace('const KATKILAR=', '(').replace(/\];\s*$/, '])');
const K = vm.runInNewContext(blok);
const ids = new Set(); K.forEach(x => { if (ids.has(x.id)) abort('çift id ' + x.id); ids.add(x.id); });
YENI_ID.forEach(id => { if (!ids.has(id)) abort('yeni kayıt yok ' + id); });
console.log('KATKILAR ' + K.length + ' kayıt · yeni ' + ekle.length + ' · alias eklenen satır ' + degisen + ' · alias toplam ' + Object.values(ALIAS).reduce((a, v) => a + v.length, 0));
if (YAZ) { fs.writeFileSync(HF, L.join('\n')); console.log('[yazıldı]'); } else console.log('[kuru] --yaz ile yazılır');
}
