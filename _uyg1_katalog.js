// ═══ SPRINT UYG1 — ND5 KALINTILARI: katalog kayıtları + alias + MUADIL (build-time, idempotent, ASSERT) ═══
// Kaynaklar (açılıp okundu, rapor UYG1):
//  Carafa Type 2 (kabuklu): weyermann.de/en-gb/product/weyermann-carafa-type-2/ "1100 – 1200 EBC / 415.2 – 452.9 Lovibond";
//    Special Type 2 sayfası "made from dehusked barley" → katalogdaki crf2 (alias "carafa special ii") AYRI ürün.
//  Debittered Black (Dingemans): byo.com/articles/debittered-black-malt/ "rated at 525–600 °L"; craftabrew.com "488~562ºL".
//  Chit Malt (BestMalz): bestmalz.de "EBC 2.0 to 3.0", "Extract 50.0 % minimum (dry substance)", kullanım %15.
//  RVA 132 Manchester Ale: scottjanish.com (RVA listesini aktarır) "70-75%", "65-72F", "Boddington".
//  "Unsweetened chocolate baking nibs" = kakao nibs: Merriam-Webster cacao nib tanımı + aynı klonun diğer sürümleri "cacao/cocoa nibs".
//  Koyu Candi Şekeri (Kaya) — Kaan'ın stoğu (Hazkat): Castle "Candy sugar dark (pieces)" 250–450 EBC, sükroz ≥%99,5 (kuru madde);
//    Südzucker "candy sugar brown crushed" 150–600 EBC (Kaan'ın verdiği; sayfa 403 — açılamadı). Renk 360 EBC = 183 SRM TAHMİNİ.
// Kullanım: node _uyg1_katalog.js --yaz
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html'), YAZ = process.argv.includes('--yaz');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
const YENI = {
  MALTLAR: [
    '{id:"crf2_kabuklu",ad:"Carafa Type 2 (Weyermann, kabuklu)",gu:250,r:434,g:"Koyu",mo:"Weyermann",phc:"chocolate",/* kayn: weyermann.de 1100–1200 EBC / 415–453 °L (orta 434); ekstrakt üretici sayfasında YOK → kabuksuz eşi crf2 ile aynı gu (≤%5 kullanım) */alias:["weyermann carafa ii"]}',
    '{id:"dingemans_black",ad:"Debittered Black Malt (Dingemans)",gu:250,r:545,g:"Koyu",mo:"Dingemans",/* kayn: BYO 525–600 °L, CraftaBrew 488–562 °L → örtüşme ortası 545; ekstrakt açılabilen sayfada YOK → kabuksuz siyah maltların katalog değeri 250 */alias:["debittered black malt (530 °l)"]}',
    '{id:"chit",ad:"Chit Malt (BestMalz)",gu:192,r:1.4,g:"Özel",mo:"BestMalz",/* kayn: bestmalz.de EBC 2.0–3.0 (1.2–1.6 °L), ekstrakt ≥%50 kuru → 0,50×384; köpük stabilitesi, ~%15 */alias:["chit malt"]}'
  ],
  MAYALAR: [
    '{id:"wlp380",ad:"WLP380 Hefeweizen IV",atu:[73,80],sc:[19,21],ideal:20,e:"Muskat, karanfil, baharat baskın; muz/sakız geride",tip:"wheat",ek:"dolap",tol:10,/* kayn: whitelabs.com WLP380 — 73-80%, 19-21 °C, flokülasyon düşük, alkol orta (5-10%) */alias:["wlp380","wlp380 hefeweizen iv ale yeast (2 vials)"]}',
    '{id:"wy3333",ad:"WY3333 German Wheat",atu:[70,76],sc:[17,24],ideal:20,e:"Muz esteri + karanfil fenolü dengeli; yüksek çökelme (Kristallweizen)",tip:"wheat",ek:"dolap",tol:10,/* kayn: wyeastlab.com 3333-PC — 70-76%, 63-75°F (17-24°C), flokülasyon yüksek, %10 */alias:["wyeast 3333","wyeast 3333 german wheat ale yeast (big slurry)"]}',
    '{id:"rva132",ad:"RVA 132 Manchester Ale",atu:[70,75],sc:[18,22],ideal:20,e:"İngiliz ale (Boddington soyu; RVA tat tanımı kaynakta yok)",tip:"ale",ek:"dolap",/* kayn: scottjanish.com RVA tablosu — 70-75%, 65-72F, flokülasyon yüksek */alias:["rva132 manchester ale"]}'
  ],
  KATKILAR: [
    '{id:"koyu_candi_kaya",ad:"Koyu Candi Şekeri (Kaya) — Hazkat",g:"Şeker",gu:384,fermente:true,ibu_dk60:0,srm:183,renkTahmini:true,etki:"OG artar, tamamen fermente olur. Koyu renk + karamel.",acik:"Hazkat Profesyonel \\"Brewing Dark Candi Sugar\\" — koyu KAYA (katı) candi şekeri, şurup DEĞİL (D-180 kayıtları ayrı ürün). Renk TAHMİNİ: 360 EBC ≈ 183 SRM — üreticisi bilinmiyor; Castle \\"Candy sugar dark (pieces)\\" 250–450 EBC (castlemalting.com/Publications/SugarProducts/SucreCandiBrunFT_en.pdf) ve Südzucker \\"candy sugar brown crushed\\" 150–600 EBC (brouwland.com) orta noktalarının ortalaması; gerçek aralık 150–600 EBC. Potansiyel: Castle sükroz ≥%99,5 (kuru madde) → katalogdaki sükroz değeri 384 GU (Nöbet Şekeri ile aynı esas). Doz için kaynak bulunamadı — alan boş.",kullanim:"Kaynatmada",birim:"g",tags:["Şeker","Candi","Kaya","Hazkat"],onerilenZaman:["Kaynatmada"],alerjen:[]}'
  ]
};
const ALIAS_EK = { KATKILAR: { kakao: ['unsweetened chocolate baking nibs'] } };
const ACIK_DUZELT = { // ND5 SUPHE 7: ICAR-IISR sayfası bira/kvass DEMİYOR → atıf düzeltildi
  eski: 'acik:"Carum carvi tohumu. Kimyon (cumin) ile AYNI ürün değil. Bira ve kvass baharatı (ICAR-IISR caraway). Örnek reçetelerde 0,5 g/L. Kaynak: spices.res.in/products/spices/caraway.html"',
  yeni: 'acik:"Carum carvi L. tohumu (ICAR-IISR: çavdar ekmeği, Aquavit/Kümmel çeşnisi). Kimyon (cumin) AYRI bitki. Örnek reçetelerde 0,5 g/L (gruit, kvass). Kaynak: spices.res.in/products/spices/caraway.html"'
};
const MUADIL_EK = {
  crf2_kabuklu: '{id:"crf2",ad:"Carafa II (Debittered)",fark:"⚠️ Aynı renk (Weyermann: ikisi de 1100–1200 EBC) ama Special kabuksuz — kabuklu Type 2 daha buruk/kavrulmuş. [UYG1 kaynak: weyermann.de]",detay:"Carafa Type 2 (kabuklu, 415–453 °L) ↔ Carafa Special Type 2 (\\"made from dehusked barley\\", 415–453 °L). Renk aynı; kabuk çıkarıldığı için Special\'da acı/burukluk azalır."}',
  crf2: '{id:"crf2_kabuklu",ad:"Carafa Type 2 (Weyermann, kabuklu)",fark:"⚠️ Aynı renk (Weyermann: ikisi de 1100–1200 EBC) ama kabuklu — daha buruk/kavrulmuş. [UYG1 kaynak: weyermann.de]",detay:"Carafa Special Type 2 kabuksuz arpadan; Type 2 kabuklu. Renk aynı (415–453 °L)."}'
};
let s = fs.readFileSync(HF, 'utf8'); const L = s.split('\n');
const blok = ad => { const b = L.findIndex(l => l.includes('const ' + ad + '=[')); let e = b; while (e < L.length && !/^\];/.test(L[e])) e++; if (b < 0 || e >= L.length) abort('blok ' + ad); return [b, e]; };
const idVar = (ad, id) => { const [b, e] = blok(ad); for (let j = b; j < e; j++) if (L[j].includes('{id:"' + id + '",')) return j; return -1; };
let n = 0;
for (const ad of Object.keys(YENI)) {
  const ekle = YENI[ad].filter(r => idVar(ad, /id:"([^"]+)"/.exec(r)[1]) < 0);
  if (!ekle.length) continue;
  const [, e] = blok(ad); const onc = L[e - 1], cr = onc.endsWith('\r') ? '\r' : '';
  if (!/\}\s*,?\s*\r?$/.test(onc)) abort('son kayıt biçimi ' + ad);
  if (!/,\s*\r?$/.test(onc)) L[e - 1] = onc.replace(/\}(\s*)(\r?)$/, '},$1$2');
  L.splice(e, 0, '  // ═══ SPRINT UYG1 — ND5 kalıntıları / Kaan\'ın stoğu (kaynaklar _uyg1_katalog.js başlığında) ═══' + cr, ...ekle.map((r, i) => '  ' + r + (i < ekle.length - 1 ? ',' : '') + cr));
  n += ekle.length;
}
for (const ad of Object.keys(ALIAS_EK)) for (const id of Object.keys(ALIAS_EK[ad])) {
  const j = idVar(ad, id); if (j < 0) abort('alias satırı ' + id);
  const am = /alias:\[([^\]]*)\]/.exec(L[j]); const eski = am ? JSON.parse('[' + am[1] + ']') : [];
  const yeni = eski.concat(ALIAS_EK[ad][id].filter(a => eski.indexOf(a) < 0)); if (yeni.length === eski.length) continue;
  L[j] = am ? L[j].replace(am[0], () => 'alias:' + JSON.stringify(yeni)) : L[j].replace(/\}(,?)(\s*)(\r?)$/, (m, a, b, c) => ',alias:' + JSON.stringify(yeni) + '}' + a + b + c); n++;
}
let t = L.join('\n');
if (t.indexOf(ACIK_DUZELT.eski) >= 0) { if (t.split(ACIK_DUZELT.eski).length !== 2) abort('açıklama çoklu'); t = t.split(ACIK_DUZELT.eski).join(ACIK_DUZELT.yeni); n++; }
else if (t.indexOf(ACIK_DUZELT.yeni) < 0) abort('karaman açıklaması bulunamadı');
// MUADIL: crf2_kabuklu anahtarı (yoksa) + crf2 listesine giriş (yoksa)
if (t.indexOf('"crf2_kabuklu":[') < 0) { const a = 'const MUADIL={'; if (t.split(a).length !== 2) abort('MUADIL'); t = t.split(a).join(a + '\n  "crf2_kabuklu":[\n    ' + MUADIL_EK.crf2_kabuklu + '\n  ],'); n++; }
const crf2Bas = t.indexOf('  "crf2":['); if (crf2Bas < 0) abort('MUADIL crf2');
const crf2Son = t.indexOf('\n  ]', crf2Bas);
if (t.slice(crf2Bas, crf2Son).indexOf('{id:"crf2_kabuklu"') < 0) { const satirSon = t.indexOf('\n', crf2Bas); t = t.slice(0, satirSon + 1) + '    ' + MUADIL_EK.crf2 + ',\n' + t.slice(satirSon + 1); n++; }
// doğrulama: bloklar değerlendirilebilir, id tekil
const L2 = t.split('\n');
for (const ad of ['MALTLAR', 'MAYALAR', 'KATKILAR']) {
  const b = L2.findIndex(l => l.includes('const ' + ad + '=[')); let e = b; while (!/^\];/.test(L2[e])) e++;
  const K = vm.runInNewContext(L2.slice(b, e + 1).join('\n').replace('const ' + ad + '=', '(').replace(/\];\s*$/, '])'));
  if (new Set(K.map(x => x.id)).size !== K.length) abort('çift id ' + ad);
  console.log(ad, K.length);
}
const mb = t.indexOf('const MUADIL={'); let d = 0, j = mb + 13; for (; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}') { d--; if (!d) break; } }
const MU = vm.runInNewContext('(' + t.slice(mb + 13, j + 1) + ')'); if (!MU.crf2_kabuklu || !MU.crf2.some(x => x.id === 'crf2_kabuklu')) abort('MUADIL doğrulama');
console.log('değişiklik ' + n);
if (YAZ) { fs.writeFileSync(HF, t); console.log('[yazıldı]'); }
