#!/usr/bin/env node
// SPRINT DOG4B madde 3 — malzeme asistanı SORU ÇÖZÜMÜ test seti üreticisi (DAİRESEL DEĞİL).
// Beklenen çözüm BİÇİM TABLOSUNDAN gelir (hangi reçete satırı / hangi işlem / hangi miktar), uygulamanın çözücüsünden ya da sözlüğünden DEĞİL.
// Soru metni = biçim tablosundaki doğal Türkçe kalıp × satıra atıf biçimi (ekli / eksiz, kesmeli / kesmesiz, büyük / küçük harf) × miktar biçimi (kg / kilo / gram / grama / gr).
// Çıktı: tests/dog4b_cozum_seti.json  (node tests/dog4b_cozum_uret.mjs)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Claude'un canlı denemesindeki 18 soru (DOG4B.md, metin AYNEN) — beklenen çözüm dosyadaki gibi
const CLAUDE18 = [
  ['C01', 'weizen', "Weizen'de buğday maltını 2,5 kg yapsam ne olur?", { islem: 'miktar', kalem: 'malt:0', miktar: 2.5, birim: 'kg' }],
  ['C02', 'weizen', 'buğday maltını 2 kilo yapsam', { islem: 'miktar', kalem: 'malt:0', miktar: 2, birim: 'kg' }],
  ['C03', 'weizen', "Hallertau'yu 20 grama çıkarsam", { islem: 'miktar', kalem: 'hop:0', miktar: 20, birim: 'g' }],
  ['C04', 'weizen', 'mayayı BB Alman Weisbier ile değiştirsem', { islem: 'degistir', kalem: 'maya', yeni: 'bb_wheat' }],
  ['C05', 'weizen', 'WY3068 yerine BB Alman Buğday kullansam', { islem: 'degistir', kalem: 'maya', yeni: 'bb_wheat', not: 'Claude beklentisi bb_wheat; katalogda "BB Alman Buğday No1 / No2 / No3" üç ayrı maya var (bb_alman_bugday1/2/3) — bb_wheat\'in adı "BiraBurada Maya Alman Weisbier"' }],
  ['C06', 'weizen', 'hopu tamamen çıkarsam ne olur', { islem: 'cikar', kalem: 'hop:0' }],
  ['C07', 'dubbel', "Dubbel'de candi şekerini 300 g yapsam ne olur?", { islem: 'miktar', kalem: 'katki:0', miktar: 300, birim: 'g' }],
  ['C08', 'dubbel', 'koyu candi şekerini 300 g yapsam', { islem: 'miktar', kalem: 'katki:0', miktar: 300, birim: 'g' }],
  ['C09', 'dubbel', "candi'yi 200 grama indirsem", { islem: 'miktar', kalem: 'katki:0', miktar: 200, birim: 'g' }],
  ['C10', 'dubbel', 'Special B yerine Hitit Koyu Kristal maltı kullansam', { islem: 'degistir', kalem: 'malt:3', yeni: 'koyu_kristal' }],
  ['C11', 'wbock', "caramunich 2'yi 300 g yapsam", { islem: 'miktar', kalem: 'malt:2', miktar: 300, birim: 'g' }],
  ['C12', 'wbock', 'buğday maltı yerine pilsner kullansam', { islem: 'degistir', kalem: 'malt:0', yeni: 'pilsner' }],
  ['C13', 'weizen', 'pilsner maltını azaltıp 900 g yapsam', { islem: 'miktar', kalem: 'malt:1', miktar: 900, birim: 'g' }],
  ['C14', 'dubbel', "special b'yi çıkarsam", { islem: 'cikar', kalem: 'malt:3' }],
  ['C15', 'dubbel', 'munich maltını 600 g yapsam', { islem: 'miktar', kalem: 'malt:1', miktar: 600, birim: 'g' }],
  ['C16', 'dubbel', 'styrian golding yerine saaz kullansam', { islem: 'degistir', kalem: 'hop:0', yeni: 'saaz' }],
  ['C17', 'wbock', "munich'i 2 kg yapsam", { islem: 'miktar', kalem: 'malt:1', miktar: 2, birim: 'kg' }],
  ['C18', 'wbock', "Carafa I'i çıkarsam", { islem: 'cikar', kalem: 'malt:3' }]
];

// ── BİÇİM TABLOSU ──
// Satıra atıf biçimleri: [belirtme (-ı/-i/-yı, kesmeli ya da kesmesiz), yalın, etiket]. Taban reçeteleri tests/tuzak_seti.json'dakiyle aynı (weizen / dubbel / wbock).
const SATIR = {
  weizen: [
    { key: 'malt:0', bel: ['buğday maltını', "Buğday Maltı'nı", 'BUĞDAY MALTINI'], yal: ['buğday maltı', 'Buğday Maltı'], tip: 'malt' },
    { key: 'malt:1', bel: ['pilsner maltını', "Pilsner'ı", 'pilsneri'], yal: ['pilsner maltı'], tip: 'malt' },
    { key: 'hop:0', bel: ["Hallertau'yu", 'hallertauyu', 'hopu'], yal: ['Hallertau'], tip: 'hop' },
    { key: 'maya', bel: ['mayayı', "WY3068'i"], yal: ['WY3068'], tip: 'maya' }],
  dubbel: [
    { key: 'malt:1', bel: ['Munich maltını', "munich'i", 'münih maltını'], yal: ['Munich maltı'], tip: 'malt' },
    { key: 'malt:2', bel: ["CaraMunich I'i", "caramunich 1'i"], yal: ['CaraMunich I'], tip: 'malt' },
    { key: 'malt:3', bel: ["Special B'yi", "special b'yi", 'SPECIAL B\'Yİ'], yal: ['Special B'], tip: 'malt' },
    { key: 'hop:0', bel: ["Styrian Goldings'i", 'hopu'], yal: ['Styrian Goldings'], tip: 'hop' },
    { key: 'katki:0', bel: ['candi şekerini', "candi'yi", 'candiyi', 'koyu candi şekerini', "Hazkat candi'yi", 'CANDİ ŞEKERİNİ'], yal: ['candi şekeri', 'koyu candi'], tip: 'katki' },
    { key: 'maya', bel: ['mayayı', "WY3787'yi"], yal: ['WY3787'], tip: 'maya' }],
  wbock: [
    { key: 'malt:0', bel: ['buğday maltını', "Buğday Maltı'nı"], yal: ['buğday maltı'], tip: 'malt' },
    { key: 'malt:1', bel: ["munich'i", 'Münih maltını'], yal: ['Munich maltı'], tip: 'malt' },
    { key: 'malt:2', bel: ["caramunich 2'yi", "CaraMunich II'yi"], yal: ['CaraMunich II'], tip: 'malt' },
    { key: 'malt:3', bel: ["Carafa I'i", "carafa 1'i"], yal: ['Carafa I'], tip: 'malt' },
    { key: 'hop:0', bel: ["Hallertau'yu", 'hopu'], yal: ['Hallertau'], tip: 'hop' },
    { key: 'maya', bel: ['mayayı'], yal: ['WY3068'], tip: 'maya' }]
};
// miktar biçimleri × fiil kalıbı → { metin, miktar, birim }  (yön: yapsam / olsa / koysam / indirsem / yükseltsem / çıkarsam (miktarlı))
const MIKTAR = [
  (r, m) => ({ s: `${r.bel} ${m.kg} kg yapsam ne olur?`, v: m.kgV, b: 'kg' }),
  (r, m) => ({ s: `${r.bel} ${m.kilo} kilo yapsam`, v: m.kiloV, b: 'kg' }),
  (r, m) => ({ s: `${r.bel} ${m.g} gram yapsam ne olur`, v: m.gV, b: 'g' }),
  (r, m) => ({ s: `${r.bel} ${m.g} grama indirsem`, v: m.gV, b: 'g' }),
  (r, m) => ({ s: `${r.bel} ${m.g2} grama çıkarsam`, v: m.g2V, b: 'g' }),
  (r, m) => ({ s: `${r.yal} ${m.g} gr olsa ne olur?`, v: m.gV, b: 'g' }),
  (r, m) => ({ s: `${r.bel} ${m.g2} grama yükseltsem`, v: m.g2V, b: 'g' }),
  (r, m) => ({ s: `${r.bel} azaltıp ${m.g} g yapsam`, v: m.gV, b: 'g' })
];
// satır türüne göre makul miktarlar (kg biçimi yalnız malt)
const MK = { malt: { kg: '2,5', kgV: 2.5, kilo: '2', kiloV: 2, g: '300', gV: 300, g2: '500', g2V: 500 }, hop: { g: '8', gV: 8, g2: '20', g2V: 20 }, katki: { g: '200', gV: 200, g2: '300', g2V: 300 } };
const CIKAR = [r => `${r.bel} çıkarsam ne olur?`, r => `${r.bel} tamamen çıkarsam`, r => `${r.bel} kaldırsam`];
// değiştir: Y aynı türde (beklenen id tablodan); iki kalıp: "X yerine Y kullansam/koysam" ve "X'i Y ile değiştirsem"
const DEGISTIR = {
  weizen: [{ key: 'maya', x: 'WY3068', xb: 'mayayı', y: 'US-05', yeni: 'us05' }, { key: 'maya', x: 'WY3068', xb: "WY3068'i", y: 'BB Alman Weisbier', yeni: 'bb_wheat' }, { key: 'hop:0', x: 'Hallertau', xb: "Hallertau'yu", y: 'Tettnanger', yeni: 'tettn' }, { key: 'malt:1', x: 'pilsner maltı', xb: 'pilsner maltını', y: 'Vienna maltı', yeni: 'vienna' }],
  dubbel: [{ key: 'malt:3', x: 'Special B', xb: "Special B'yi", y: 'Hitit Koyu Kristal maltı', yeni: 'koyu_kristal' }, { key: 'hop:0', x: 'Styrian Goldings', xb: "Styrian Goldings'i", y: 'Fuggles', yeni: 'fuggles' }, { key: 'maya', x: 'WY3787', xb: 'mayayı', y: 'BB Abbaye', yeni: 'bb_abbaye' }, { key: 'malt:1', x: 'Munich maltı', xb: 'Munich maltını', y: 'Vienna maltı', yeni: 'vienna' }],
  wbock: [{ key: 'malt:1', x: 'Munich maltı', xb: "munich'i", y: 'Thracian Dark Münih maltı', yeni: 'thracian_munich' }, { key: 'malt:0', x: 'buğday maltı', xb: 'buğday maltını', y: 'pilsner', yeni: 'pilsner' }, { key: 'hop:0', x: 'Hallertau', xb: 'hopu', y: 'Saaz', yeni: 'saaz' }, { key: 'malt:3', x: 'Carafa I', xb: "Carafa I'i", y: 'Carafa Special III', yeni: 'crf3' }]
};
// ekle: reçetede OLMAYAN kalem + ekle / kat / koy fiili
const EKLE = {
  weizen: [["Weizen'e 10 g kişniş eklesem ne olur?", 'kisnisch', 10, 'g'], ['15 gr portakal kabuğu katsam', 'portakal_kabuk', 15, 'g'], ['weizene 50 g carafa special III koysam', 'crf3', 50, 'g']],
  dubbel: [["Dubbel'e 200 g kuru incir eklesem", 'kuru_incir', 200, 'g'], ['150 gram kuru incir koysam ne olur', 'kuru_incir', 150, 'g'], ['DUBBEL\'E 40 G CARAFA SPECIAL III EKLESEM', 'crf3', 40, 'g']],
  wbock: [["Weizenbock'a 100 g Carafa Special III eklesem", 'crf3', 100, 'g'], ['weizenbocka 1 kilo pilsner maltı eklesem', 'pilsner', 1, 'kg'], ['20 g kişniş katsam ne olur?', 'kisnisch', 20, 'g']]
};
// BELİRSİZ BEKLENEN (doğru cevap "sor"): reçetede birden çok aynı tür satır + türsüz atıf / katalogda birden çok aday
const BELIRSIZ = [
  ['dubbel', 'maltı 2 kg yapsam ne olur?', 'dört malt satırı var, hangisi belli değil'],
  ['weizen', 'maltı azaltıp 1 kilo yapsam', 'iki malt satırı'],
  ['wbock', 'malt miktarını 300 grama indirsem', 'dört malt satırı'],
  ['weizen', 'WY3068 yerine BB Alman Buğday kullansam ne olur', 'katalogda BB Alman Buğday No1 / No2 / No3'],
  ['dubbel', "candi'yi D-180 ile değiştirsem", 'katalogda iki D-180 (Candi Şurup Dark, Koyu Candi)'],
  ['dubbel', 'Special B yerine kristal malt kullansam', '"kristal" birden çok malta uyuyor']
];

// CC EK DENEMELERİ — çözücü yazılırken bulunan tehlikeli sınıflar (fark / hedef miktar, "katına çıkar", var olan satıra ekleme). Çözücüyle birlikte yazıldı → DAİRESEL OLABİLİR, raporda ayrı satır.
const EK = [
  ['wbock', "Special B'yi 2 katına çıkarsam", null, 'reçetede Special B yok (wbock) — kalem yok'],
  // DOG4C madde 2 (2026-10-21): çarpan ve fark artık deterministik hesaplanıyor → E02–E05 beklentisi belirsiz → MİKTAR (eski beklenti notta)
  ['dubbel', "Special B'yi 2 katına çıkarsam", { islem: 'miktar', kalem: 'malt:3', miktar: 120, birim: 'g' }, '"katına çıkar" = kaldırma değil; DOG4C: × 2 → 60 → 120 g (DOG4B: belirsiz)'],
  ['dubbel', "Special B'yi yarıya indirsem", { islem: 'miktar', kalem: 'malt:3', miktar: 30, birim: 'g' }, 'DOG4C: × 0,5 → 60 → 30 g (DOG4B: belirsiz)'],
  ['weizen', "pilsner'ı 1 kg azaltsam", { islem: 'miktar', kalem: 'malt:1', miktar: 150, birim: 'g' }, '"1 kg azalt" = 1 kg eksilt (fark): DOG4C 1150 − 1000 = 150 g (DOG4B: belirsiz)'],
  ['weizen', "Hallertau'yu 5 g artırsam", { islem: 'miktar', kalem: 'hop:0', miktar: 17, birim: 'g' }, 'fark: DOG4C 12 + 5 = 17 g (DOG4B: belirsiz)'],
  ['weizen', "Hallertau'ya 5 g daha eklesem", { belirsiz: true }, 'var olan satıra ekleme: toplam mı üstüne mi'],
  ['weizen', "buğday maltını 1,5 kiloya düşürsem", { islem: 'miktar', kalem: 'malt:0', miktar: 1.5, birim: 'kg' }, 'yönelme ekli hedef'],
  ['weizen', "buğday maltını 2 kg'a çıkarsam", { islem: 'miktar', kalem: 'malt:0', miktar: 2, birim: 'kg' }, "kesmeli yönelme 'a"],
  ['dubbel', "Dubbel'deki Special B'yi 100 g yapsam", { islem: 'miktar', kalem: 'malt:3', miktar: 100, birim: 'g' }, ''],
  ['dubbel', "CaraMunich'i çıkarsam", { islem: 'cikar', kalem: 'malt:2' }, 'tek CaraMunich satırı'],
  ['wbock', "Carafa'yı çıkarsam", { islem: 'cikar', kalem: 'malt:3' }, 'tek Carafa satırı'],
  ['dubbel', 'Munich yerine Vienna koysam', { islem: 'degistir', kalem: 'malt:1', yeni: 'vienna' }, ''],
  ['dubbel', 'WY3787 yerine BB Abbaye mayası kullansam', { islem: 'degistir', kalem: 'maya', yeni: 'bb_abbaye' }, ''],
  ['weizen', "Hallertau'yu Saaz ile değiştirsem", { islem: 'degistir', kalem: 'hop:0', yeni: 'saaz' }, '']
];
const out = [];
CLAUDE18.forEach(([id, taban, soru, b]) => out.push({ id, grup: 'claude18', taban, soru, beklenen: b }));
let n = 0; const id = () => 'U' + String(++n).padStart(3, '0');
for (const taban of ['weizen', 'dubbel', 'wbock']) {
  SATIR[taban].forEach(r => {
    if (r.tip !== 'maya') { // miktar: her satırda her atıf biçimi bir kalıpla (kalıp sırası dönerek → kalıp × biçim çaprazı)
      r.bel.forEach((bel, i) => { const k = (i + r.key.length + taban.length) % MIKTAR.length; let f = MIKTAR[k], mm = MK[r.tip];
        if (!mm.kg && (k === 0 || k === 1)) f = MIKTAR[2 + (i % 6)];
        const x = f({ bel, yal: r.yal[i % r.yal.length] }, mm); out.push({ id: id(), grup: 'uretilmis', bicim: 'miktar', taban, soru: x.s, beklenen: { islem: 'miktar', kalem: r.key, miktar: x.v, birim: x.b } }); });
      // ikinci kalıp: büyük harf / yalın atıf
      const f2 = MIKTAR[(r.key.length + 3) % MIKTAR.length], x2 = f2({ bel: r.bel[0], yal: r.yal[0] }, MK[r.tip]);
      if (MK[r.tip].kg || !/ kg | kilo /.test(x2.s)) out.push({ id: id(), grup: 'uretilmis', bicim: 'miktar', taban, soru: x2.s, beklenen: { islem: 'miktar', kalem: r.key, miktar: x2.v, birim: x2.b } });
    }
    // çıkar: her satır, atıf biçimleri dönerek
    r.bel.slice(0, 2).forEach((bel, i) => out.push({ id: id(), grup: 'uretilmis', bicim: 'cikar', taban, soru: CIKAR[(i + r.key.length) % CIKAR.length]({ bel }), beklenen: { islem: 'cikar', kalem: r.key } }));
  });
  DEGISTIR[taban].forEach((d, i) => {
    out.push({ id: id(), grup: 'uretilmis', bicim: 'degistir', taban, soru: `${d.x} yerine ${d.y} ${i % 2 ? 'koysam' : 'kullansam'} ne olur?`, beklenen: { islem: 'degistir', kalem: d.key, yeni: d.yeni } });
    out.push({ id: id(), grup: 'uretilmis', bicim: 'degistir', taban, soru: `${d.xb} ${d.y} ile değiştirsem`, beklenen: { islem: 'degistir', kalem: d.key, yeni: d.yeni } });
  });
  EKLE[taban].forEach(([s, y, v, b]) => out.push({ id: id(), grup: 'uretilmis', bicim: 'ekle', taban, soru: s, beklenen: { islem: 'ekle', yeni: y, miktar: v, birim: b } }));
}
BELIRSIZ.forEach(([taban, s, neden]) => out.push({ id: id(), grup: 'uretilmis', bicim: 'belirsiz', taban, soru: s, beklenen: { belirsiz: true, neden } }));
const nU = out.length - CLAUDE18.length;
EK.forEach(([taban, s, b, not], i) => out.push({ id: 'E' + String(i + 1).padStart(2, '0'), grup: 'ek', taban, soru: s, beklenen: b || { degisiklikYok: true }, not }));

const doc = { tur: 'BREWMASTER-DOG4B-COZUM-SETI', surum: 1, uretildi: '2026-10-21', kaynak: 'tests/dog4b_cozum_uret.mjs — beklenen çözüm biçim tablosundan (dairesel değil); tabanlar tests/tuzak_seti.json; ek grubu çözücüyle birlikte yazıldı (dairesel olabilir)',
  sayim: { claude18: CLAUDE18.length, uretilmis: nU, ek: EK.length }, istemler: out };
fs.writeFileSync(path.join(KOK, 'tests', 'dog4b_cozum_seti.json'), JSON.stringify(doc, null, 1) + '\n');
console.log('claude18', CLAUDE18.length, 'uretilmis', nU, 'ek', EK.length);
