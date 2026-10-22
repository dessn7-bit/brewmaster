#!/usr/bin/env node
// SPRINT DOG4D madde 4 — malzeme asistanı SORU ÇÖZÜMÜ ek test seti üreticisi (DOG4B / DOG4C üreteçleriyle AYNI yaklaşım, YENİ sütunlar).
// Beklenen çözüm ÇEKİM TABLOSUNDAN gelir (hangi satır / hangi işlem / yeni miktar = eski × çarpan), çözücünün sözlüğünden (A4.carpanOku, A4.TUR_BEL, A4.yapYerine) DEĞİL:
// tablo doğal Türkçe kalıplarla elle yazıldı (iyelik ünlü uyumu -nın/-nin/-nun/-ın/-in, -sız/-siz/-suz, olmadan / koymadan / kullanmadan, "X'i Y yapsam");
// sözlükte olmayan doğal kalıplar da (bir kısmını, birazını, çoğunu, "ile denesem") bilerek var.
// Beklenen alanlar: islem/kalem/yeni/miktar/birim (çözüm) · deg = A1._degKur sonrası satırın değeri (madde 1: birim çevirimi) · yok · belirsiz · tat.
// ekKatki: tabana eklenen SENTETİK katkı satırı (mL birimli; kişisel veri değil).
// Çıktı: tests/dog4d_cozum_seti.json  (node tests/dog4d_cozum_uret.mjs)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ML = { id: 'vanilla_oz', ad: 'Vanilya Özü (Saf Sıvı)', birim: 'mL', miktar: 30, zaman: 'Şişeleme' }; // sentetik mL satırı → katki:1 (Dubbel tabanında katki:0 candi)

// Claude held-out 3 (DOG4D.md, metin AYNEN) — Y1–Y4 + 4 gereksiz belirsiz + madde 1 testleri (DOG4D.md madde 1 "Test:" satırı, metin AYNEN)
const HELDOUT = [
  ['Y1a', 'dubbel', "candi'yi 0,3 kg yapsam", { islem: 'miktar', kalem: 'katki:0', deg: 300 }],
  ['Y1b', 'dubbel', 'candi şekerini 0,2 kiloya çıkarsam', { islem: 'miktar', kalem: 'katki:0', deg: 200 }],
  ['Y1c', 'dubbel', "Hazkat'ı 150 grama çıkarsam", { islem: 'miktar', kalem: 'katki:0', deg: 150 }],
  ['Y1d', 'dubbel', 'candiyi 50 g artırsam', { islem: 'miktar', kalem: 'katki:0', deg: 150 }],
  ['Y1e', 'dubbel', 'vanilya özünü 0,1 litre yapsam', { islem: 'miktar', kalem: 'katki:1', deg: 100 }, ML],
  ['Y2a', 'dubbel', 'mayayı WLP530 ile değiştirsem', { yok: true }],
  ['Y2b', 'dubbel', 'mayayı WLP500 ile değiştirsem', { islem: 'degistir', kalem: 'maya', yeni: 'wlp500' }],
  ['Y2c', 'dubbel', 'mayayı BE-256 ile değiştirsem', { islem: 'degistir', kalem: 'maya', yeni: 'be256' }],
  ['Y3a', 'weizen', 'mayayı WB-06 yapsam', { islem: 'degistir', kalem: 'maya', yeni: 'wb06' }],
  ['Y3b', 'weizen', "WY3068'i WB-06 yapsam", { islem: 'degistir', kalem: 'maya', yeni: 'wb06' }],
  ['Y4', 'dubbel', "special b'nin yarısını kullansam", { islem: 'miktar', kalem: 'malt:3', miktar: 30, birim: 'g' }],
  ['G1', 'dubbel', "Special B'yi tamamen atsam", { islem: 'cikar', kalem: 'malt:3' }],
  ['G2', 'dubbel', "special b'siz yapsam", { islem: 'cikar', kalem: 'malt:3' }],
  ['G3', 'dubbel', 'candi olmadan yapsam', { islem: 'cikar', kalem: 'katki:0' }]
];
// doğru kalması gerekenler (DOG4D.md madde 4, metin AYNEN)
const KORU = [
  ['R01', 'dubbel', 'dubbele kişniş uyar mı', { tat: true, stil: 'Dubbel' }],
  ['R02', 'dubbel', "Special B'yi biraz fazla koysam", { belirsiz: true }],
  ['R03', 'dubbel', "CaraMunich'i atıp Special B'yi artırsam", { belirsiz: true }],
  ['R04', 'dubbel', "Special B'yi çıkarıp yerine Carafa koysam", { belirsiz: true, neden: 'Carafa çok aday' }],
  ['R05', 'dubbel', 'Saaz yerine Styrian kullansam', { belirsiz: true, neden: "Dubbel'de Saaz yok" }],
  ['R06', 'dubbel', 'kuru hop eklesem', { belirsiz: true }],
  ['R07', 'weizen', "Hallertau'yu 10 dakika kaynatsam", { belirsiz: true }],
  ['R08', 'wbock', 'munich maltını 2 kilo azaltsam', { belirsiz: true, neden: '1600 g − 2000 g ≤ 0' }]
];

// ── ÇEKİM TABLOSU (madde 3) ── satır: [anahtar, mevcut miktar (g), iyelik (tamlayan) biçimleri]
const IYELIK = {
  weizen: [['malt:0', 1750, ['buğday maltının', "Buğday Maltı'nın"]], ['malt:1', 1150, ['Pilsner maltının', "pilsner'ın"]], ['hop:0', 12, ["Hallertau'nun", "HALLERTAU'NUN"]]],
  dubbel: [['malt:3', 60, ["Special B'nin", "SPECIAL B'NİN"]], ['malt:1', 400, ["Munich'in", 'münih maltının']], ['katki:0', 100, ["candi'nin", 'candi şekerinin']], ['hop:0', 20, ["Styrian'ın", "Styrian Goldings'in"]]],
  wbock: [['malt:3', 30, ["Carafa'nın"]], ['malt:2', 150, ["caramunich 2'nin"]], ['malt:0', 2600, ['buğday maltının']]]
};
// iyelikli çarpan: [kalıp, çarpan]
const IY_CARPAN = [['yarısını kullansam', 0.5], ['iki katını koysam', 2], ['üçte birini kullansam', 1 / 3], ['dörtte birini koysam', 0.25], ['yarısını koysam', 0.5],
  ['üç katını kullansam', 3], ['çeyreğini kullansam', 0.25], ['yarısını atsam', 0.5], ['iki katını kullansam', 2]];
// iyelikli ama ne yapılacağı belli değil → BELİRSİZ (asla tat)
const IY_BELIRSIZ = ['bir kısmını kullansam', 'birazını koysam', 'çoğunu kullansam', 'bir miktarını atsam'];
// -sız / -siz / -suz (kesmeli, ünlü uyumu elle) → ÇIKAR
const SIZ = [['weizen', "Hallertau'suz yapsam", 'hop:0'], ['weizen', "Pilsner'siz yapsam", 'malt:1'], ['dubbel', "Munich'siz yapsam", 'malt:1'], ['dubbel', "Styrian'sız yapsam", 'hop:0'],
  ['dubbel', "candi'siz yapsam", 'katki:0'], ['dubbel', "Special B'siz bir Dubbel yapsam", 'malt:3'], ['wbock', "Carafa'sız yapsam", 'malt:3'], ['wbock', "caramunich 2'siz yapsam", 'malt:2']];
// X olmadan / koymadan / kullanmadan → ÇIKAR
const OLMADAN = [['dubbel', 'Special B olmadan yapsam', 'malt:3'], ['dubbel', 'candi koymadan yapsam', 'katki:0'], ['dubbel', 'Styrian Goldings kullanmadan yapsam', 'hop:0'],
  ['weizen', 'Hallertau olmadan yapsam', 'hop:0'], ['weizen', 'pilsner maltı olmadan yapsam', 'malt:1'], ['wbock', 'Carafa koymadan yapsam', 'malt:3']];
// X'i tamamen atsam → ÇIKAR · X'i atsam (tek başına) → BELİRSİZ ("hop atmak" = eklemek)
const TAMAMEN = [['dubbel', "Styrian'ı tamamen atsam", 'hop:0'], ['dubbel', "candi'yi tamamen atsam", 'katki:0'], ['weizen', "Hallertau'yu tamamen atsam", 'hop:0'], ['wbock', "Carafa'yı tamamen atsam", 'malt:3']];
const ATSAM = [['dubbel', "Styrian'ı atsam"], ['weizen', "Hallertau'yu atsam"]];
// reçetede olmayan kalem + -siz / olmadan → BELİRSİZ (çıkarılacak satır yok)
const YOK_SATIR = [['weizen', 'kişniş olmadan yapsam'], ['dubbel', "Saaz'sız yapsam"]];
// "X'i Y yapsam" / "mayayı Y yapsam" (Y ürün) → DEĞİŞTİR; Y bilinmeyen ürün → yok; Y miktar / sıfat → değiştir DEĞİL
const YAP = [
  ['weizen', 'mayayı US-05 yapsam', { islem: 'degistir', kalem: 'maya', yeni: 'us05' }],
  ['weizen', "Hallertau'yu Saaz yapsam", { islem: 'degistir', kalem: 'hop:0', yeni: 'saaz' }],
  ['weizen', 'hopu Saaz yapsam', { islem: 'degistir', kalem: 'hop:0', yeni: 'saaz' }],
  ['dubbel', "Styrian'ı Fuggles yapsam", { islem: 'degistir', kalem: 'hop:0', yeni: 'fuggles' }],
  ['dubbel', "Munich'i Vienna maltı yapsam", { islem: 'degistir', kalem: 'malt:1', yeni: 'vienna' }],
  ['dubbel', 'mayayı BE-256 yapsam', { islem: 'degistir', kalem: 'maya', yeni: 'be256' }],
  ['dubbel', "WY3787'yi WLP500 yapsam", { islem: 'degistir', kalem: 'maya', yeni: 'wlp500' }],
  ['wbock', "WY3068'i WB-06 yapsam", { islem: 'degistir', kalem: 'maya', yeni: 'wb06' }],
  ['dubbel', 'mayayı WLP530 yapsam', { yok: true }],
  ['dubbel', 'mayayı Thrakia-77 yapsam', { yok: true }],
  ['weizen', "Hallertau'yu Hitit Altın yapsam", { yok: true }],
  ['dubbel', "Special B'yi daha az yapsam", { belirsiz: true }],
  ['weizen', 'buğday maltını 2 kilo yapsam', { islem: 'miktar', kalem: 'malt:0', miktar: 2, birim: 'kg' }]
];
// tür sözcüğü (belirtme ekli) + reçete dışı ürün + bilinmeyen fiil + değerlendirme yok → BELİRSİZ (asla tat) · değerlendirme varsa TAT
const TUR = [['weizen', 'mayayı WB-06 ile denesem', { belirsiz: true }], ['dubbel', "hopu Saaz'la denesem", { belirsiz: true }],
  ['weizen', 'WB-06 kullansam olur mu', { tat: true }], ['dubbel', "Special B'nin yarısı kadar Carafa eklesem", { belirsiz: true }]];
// madde 1 / 2 ek denemeleri (CC; aynı tablo mantığı)
const EK = [
  ['dubbel', "Styrian'ı 0,03 kg yapsam", { islem: 'miktar', kalem: 'hop:0', deg: 30 }],
  ['dubbel', 'candiyi 0,15 kg yapsam', { islem: 'miktar', kalem: 'katki:0', deg: 150 }],
  ['dubbel', 'vanilya özünü 20 ml artırsam', { islem: 'miktar', kalem: 'katki:1', miktar: 50, birim: 'mL' }, ML],
  ['dubbel', 'vanilya özünü 50 g yapsam', { belirsiz: true, neden: 'g → mL çevrilemez' }, ML],
  ['dubbel', "candi'yi 1 litre yapsam", { belirsiz: true, neden: 'L → g çevrilemez' }],
  ['dubbel', 'WY3787 yerine WLP530 kullansam', { yok: true }],
  ['weizen', 'Hallertau yerine Hitit Altın kullansam', { yok: true }],
  ['dubbel', 'mayayı WY3787 ile değiştirsem', { belirsiz: true, neden: 'aynı kalem' }],
  ['dubbel', 'Special B yerine Special B kullansam', { belirsiz: true, neden: 'aynı kalem' }]
];

const out = [];
HELDOUT.forEach(([id, taban, soru, b, ek]) => out.push(Object.assign({ id, grup: 'heldout', taban, soru, beklenen: b }, ek ? { ekKatki: ek } : {})));
KORU.forEach(([id, taban, soru, b]) => out.push({ id, grup: 'koru', taban, soru, beklenen: b }));
let n = 0, ci = 0, bi = 0; const id = () => 'D' + String(++n).padStart(3, '0'), r1 = x => Math.round(x * 10) / 10;
const U = (bicim, taban, soru, beklenen, ek) => out.push(Object.assign({ id: id(), grup: 'uretilmis', bicim, taban, soru, beklenen }, ek ? { ekKatki: ek } : {}));
for (const taban of ['weizen', 'dubbel', 'wbock']) IYELIK[taban].forEach(([key, g, bic], si) => {
  bic.forEach(b => { const [m, c] = IY_CARPAN[ci++ % IY_CARPAN.length]; U('iyelik-carpan', taban, `${b} ${m}`, { islem: 'miktar', kalem: key, miktar: r1(g * c), birim: 'g' }); });
  U('iyelik-belirsiz', taban, `${bic[0]} ${IY_BELIRSIZ[bi++ % IY_BELIRSIZ.length]}`, { belirsiz: true });
});
SIZ.forEach(([t, s, k]) => U('siz', t, s, { islem: 'cikar', kalem: k }));
OLMADAN.forEach(([t, s, k]) => U('olmadan', t, s, { islem: 'cikar', kalem: k }));
TAMAMEN.forEach(([t, s, k]) => U('tamamen-at', t, s, { islem: 'cikar', kalem: k }));
ATSAM.forEach(([t, s]) => U('atsam-yalniz', t, s, { belirsiz: true }));
YOK_SATIR.forEach(([t, s]) => U('siz-satir-yok', t, s, { belirsiz: true }));
YAP.forEach(([t, s, b]) => U('yap', t, s, b));
TUR.forEach(([t, s, b]) => U('tur-sozcugu', t, s, b));
const nM3 = out.filter(x => x.grup === 'uretilmis').length;
EK.forEach(([t, s, b, ek]) => U('madde1-2-ek', t, s, b, ek));
const doc = { tur: 'BREWMASTER-DOG4D-COZUM-SETI', surum: 1, uretildi: '2026-10-22', kaynak: 'tests/dog4d_cozum_uret.mjs — beklenen çözüm çekim tablosundan (dairesel değil; çözücü sözlüğü okunmadı); tabanlar tests/tuzak_seti.json (+ ekKatki sentetik mL satırı)',
  sayim: { heldout: HELDOUT.length, koru: KORU.length, uretilmis_madde3: nM3, ek_madde12: EK.length }, istemler: out };
fs.writeFileSync(path.join(KOK, 'tests', 'dog4d_cozum_seti.json'), JSON.stringify(doc, null, 1) + '\n');
console.log('heldout', HELDOUT.length, 'koru', KORU.length, 'uretilmis madde 3', nM3, 'ek', EK.length);
