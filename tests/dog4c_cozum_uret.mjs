#!/usr/bin/env node
// SPRINT DOG4C madde 6 — malzeme asistanı SORU ÇÖZÜMÜ ek test seti üreticisi (DOG4B üreteciyle AYNI yaklaşım, YENİ sütunlar).
// Beklenen çözüm BİÇİM TABLOSUNDAN gelir (hangi satır / hangi işlem / yeni miktar = eski × çarpan ya da eski ∓ fark), çözücünün sözlüğünden (A4.DEG_FIIL, A4.carpanOku, A4.farkYon) DEĞİL:
// tablo doğal Türkçe kalıplarla elle yazıldı; sözlükte olmayan doğal fiiller de (eksilt, böl, dengele, bırak…) bilerek var.
// Sütunlar: satır atıf biçimi (ünlü uyumu -ı/-i/-u/-ü/-yı/-yi/-yu/-yü/-nı/-ni × kesmeli / kesmesiz × küçük / BÜYÜK harf) × çarpan / fark / tanınmayan değişiklik / değerlendirme / "kaldırıp … koysam".
// Çıktı: tests/dog4c_cozum_seti.json  (node tests/dog4c_cozum_uret.mjs)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Claude held-out (DOG4C.md, metin AYNEN) — 14 soru: beklenen sonuç dosyadaki gibi (madde 5 kararı: hop zamanı → belirsiz)
const HELDOUT = [
  ['H01', 'dubbel', "Special B'yi ikiye katlasam", { islem: 'miktar', kalem: 'malt:3', miktar: 120, birim: 'g' }],
  ['H02', 'dubbel', "Special B'yi iki katı kullansam", { islem: 'miktar', kalem: 'malt:3', miktar: 120, birim: 'g' }],
  ['H03', 'dubbel', "Special B'yi dublesem", { islem: 'miktar', kalem: 'malt:3', miktar: 120, birim: 'g' }],
  ['H04', 'weizen', "Hallertau'yu 30 dakikada atsam", { belirsiz: true, neden: 'madde 5: hop zamanı hesaplanmıyor' }],
  ['H05', 'weizen', 'hopu kaynamanın sonunda atsam', { belirsiz: true, neden: 'madde 5: hop zamanı hesaplanmıyor' }],
  ['H06', 'weizen', 'mayayı değiştirsem', { belirsiz: true, neden: 'neyle değiştirileceği söylenmedi' }],
  ['H07', 'dubbel', "Styrian'ı kaldırıp Saaz koysam", { islem: 'degistir', kalem: 'hop:0', yeni: 'saaz' }],
  ['H08', 'dubbel', 'pilsner yerine pale ale maltı kullansam', { islem: 'degistir', kalem: 'malt:0', yeni: 'pale_ale', stil: 'Dubbel' }],
  ['H09', 'dubbel', 'Pilsner yerine Pale Ale maltı kullansam', { islem: 'degistir', kalem: 'malt:0', yeni: 'pale_ale', stil: 'Dubbel' }],
  ['H10', 'dubbel', 'pilsner yerine pale ale kullansam', { islem: 'degistir', kalem: 'malt:0', yeni: 'pale_ale', stil: 'Dubbel' }],
  ['H11', 'wbock', "carafa'yı arttırsam renk ne olur", { belirsiz: true }],
  ['H12', 'weizen', 'buğday maltını yarım kilo azaltsam', { islem: 'miktar', kalem: 'malt:0', miktar: 1250, birim: 'g' }],
  ['H13', 'dubbel', "candi'yi yarıya indirsem", { islem: 'miktar', kalem: 'katki:0', miktar: 50, birim: 'g' }],
  ['H14', 'weizen', 'buğday maltını 2 kat yapsam', { islem: 'miktar', kalem: 'malt:0', miktar: 3500, birim: 'g' }]
];
// doğru kalması gerekenler (DOG4C.md, metin AYNEN; taban satırın reçetede olup olmadığına göre)
const KORU = [
  ['R01', 'wbock', 'Special B koysam olur mu', { tat: true }],
  ['R02', 'dubbel', 'Special B koysam olur mu', { tat: true }],
  ['R03', 'wbock', "Special B Dubbel'e uyar mı", { tat: true, stil: 'Dubbel' }],
  ['R04', 'weizen', 'kişniş ekler miyim', { tat: true }],
  ['R05', 'dubbel', "Special B'yi CaraMunich ile değiştirsem", { islem: 'degistir', kalem: 'malt:3', yeni: 'cara_munich1' }],
  ['R06', 'dubbel', "Special B'yi artırsam", { belirsiz: true }],
  ['R07', 'dubbel', "special b'yi biraz azaltsam", { belirsiz: true }],
  ['R08', 'dubbel', "Special B'yi azaltırsam ne olur", { belirsiz: true }],
  ['R09', 'weizen', 'buğday maltının oranını yükseltsem', { belirsiz: true }],
  ['R10', 'weizen', 'buğday maltını yüzde 70 yapsam', { belirsiz: true }],
  ['R11', 'weizen', "Hallertau'yu tamamen kaldırsam ne olur", { islem: 'cikar', kalem: 'hop:0' }],
  ['R12', 'weizen', 'kişnişi 15 grama çıkarsam', { islem: 'ekle', yeni: 'kisnisch', miktar: 15, birim: 'g' }],
  ['R13', 'dubbel', 'Westmalle mayası kullansam', { yok: true }]
];

// ── BİÇİM TABLOSU ── satır: [anahtar, mevcut miktar (g), atıf biçimleri (belirtme ekli; kesmeli / kesmesiz / BÜYÜK)]
const SATIR = {
  weizen: [['malt:0', 1750, ['buğday maltını', "Buğday Maltı'nı", 'BUĞDAY MALTINI']], ['malt:1', 1150, ["pilsner'ı", 'Pilsner maltını']], ['hop:0', 12, ["Hallertau'yu", "HALLERTAU'YU", 'hallertauyu']]],
  dubbel: [['malt:3', 60, ["Special B'yi", "special b'yi", "SPECIAL B'Yİ"]], ['malt:1', 400, ["Munich'i", 'münih maltını']], ['malt:2', 150, ["CaraMunich I'i"]], ['katki:0', 100, ["candi'yi", 'candi şekerini', "koyu candi'yi"]], ['hop:0', 20, ["Styrian'ı", "Styrian Goldings'i"]]],
  wbock: [['malt:3', 30, ["Carafa'yı", "carafa I'i", "CARAFA'YI"]], ['malt:2', 150, ["caramunich 2'yi"]], ['malt:0', 2600, ['buğday maltını']], ['malt:1', 1600, ["munich'i"]], ['hop:0', 24, ["Hallertau'yu"]]]
};
// çarpan kalıpları: [metin, çarpan]
const CARPAN = [['iki katına çıkarsam', 2], ['ikiye katlasam', 2], ['iki katı kullansam', 2], ['2 katına yükseltsem', 2], ['üç katına çıkarsam', 3], ['üçe katlasam', 3],
  ['yarıya indirsem', 0.5], ['yarısına düşürsem', 0.5], ['yarı yarıya azaltsam', 0.5], ['dublesem', 2], ['duble yapsam', 2], ['2 kat yapsam ne olur', 2]];
// fark kalıpları: [metin (malt / hop / katkı için ayrı), fark g] — sözcükle sayı (yarım / bir buçuk / çeyrek / iki yüz / yüz) da var
const FARK = {
  malt: [['yarım kilo azaltsam', -500], ['bir buçuk kilo artırsam', 1500], ['çeyrek kilo düşürsem', -250], ['iki yüz gram azaltsam', -200], ['100 g arttırsam', 100], ['300 gram eksiltsem', -300], ['yüz gram artırsam', 100], ['0,5 kg yükseltsem', 500]],
  hop: [['4 g azaltsam', -4], ['6 gram artırsam', 6], ['2 gr düşürsem', -2], ['5 g çoğaltsam', 5]],
  katki: [['30 g azaltsam', -30], ['50 gram artırsam', 50], ['20 gr eksiltsem', -20]]
};
// tanınmayan / eksik değişiklik isteği → BELİRSİZ (sözlükte olmayan doğal fiiller dahil)
const BELIRSIZ = [
  ['dubbel', "Special B'yi biraz daha koysam"], ['dubbel', "Special B'yi ikiye bölsem"], ['dubbel', "candi'yi şurupla değiştirsem"], ['dubbel', "Munich'i dengelesem"],
  ['dubbel', "Styrian'ı ilk kaynamada atsam"], ['dubbel', "SPECIAL B'Yİ ARTTIRSAM NE OLUR"], ['dubbel', "Special B'yi 100 g azaltsam"],
  ['weizen', "Hallertau'yu whirlpool'da kullansam"], ['weizen', 'hopu 15 dakikada atsam'], ['weizen', 'mayayı başka bir mayayla değiştirsem'], ['weizen', 'pilsner maltını azıcık eksiltsem'],
  ['weizen', 'buğday maltını biraz artırsam ne olur'], ['weizen', "Hallertau'yu 20 g azaltsam"], ['weizen', 'hopu değiştirsem'],
  ['wbock', "carafa'yı kaynatmada kullansam"], ['wbock', "caramunich 2'yi azaltsam renk ne olur"], ['wbock', "Hallertau'yu ateş kapanınca atsam"], ['wbock', "Carafa'yı bıraksam"]
];
// değerlendirme sorusu → TAT (değişiklik yok)
const TAT = [
  ['dubbel', "Special B Dubbel'e uyar mı", 'Dubbel'], ['dubbel', 'Special B ne katar'], ['dubbel', 'candi şekeri ne işe yarar'], ['dubbel', 'Styrian Goldings nasıl bir aroma verir'], ['dubbel', "Special B'yi kullansam olur mu"],
  ['weizen', 'Saaz koysam olur mu'], ['weizen', 'portakal kabuğu uyar mı'], ['weizen', "Hallertau Weizen'e yakışır mı", 'Weizen / Weissbier'], ['weizen', 'WY3068 nasıl bir aroma verir'],
  ['wbock', 'kahve çekirdeği kullanılır mı'], ['wbock', 'Carafa ne katar']
];
// "X'i kaldırıp / çıkarıp Y koysam / kullansam / eklesem" = DEĞİŞTİR X → Y
const KALDIRIP = [
  ['dubbel', "Styrian Goldings'i kaldırıp Fuggles koysam", { islem: 'degistir', kalem: 'hop:0', yeni: 'fuggles' }],
  ['dubbel', "WY3787'yi çıkarıp BB Abbaye kullansam", { islem: 'degistir', kalem: 'maya', yeni: 'bb_abbaye' }],
  ['dubbel', 'Munich maltını kaldırıp Vienna maltı kullansam', { islem: 'degistir', kalem: 'malt:1', yeni: 'vienna' }],
  ['dubbel', "Special B'yi çıkarıp 50 g Carafa Special III koysam", { islem: 'degistir', kalem: 'malt:3', yeni: 'crf3', miktar: 50, birim: 'g' }],
  ['weizen', "Hallertau'yu kaldırıp Saaz koysam", { islem: 'degistir', kalem: 'hop:0', yeni: 'saaz' }],
  ['weizen', 'mayayı çıkarıp US-05 kullansam', { islem: 'degistir', kalem: 'maya', yeni: 'us05' }],
  ['weizen', "Hallertau'yu kaldırıp Vienna maltı koysam", { belirsiz: true, neden: 'tür farkı (hop → malt)' }],
  ['wbock', "Carafa I'i kaldırıp Carafa Special III eklesem", { islem: 'degistir', kalem: 'malt:3', yeni: 'crf3' }],
  ['wbock', "munich'i çıkarıp Thracian Dark Münih maltı kullansam", { islem: 'degistir', kalem: 'malt:1', yeni: 'thracian_munich' }]
];

const out = [];
HELDOUT.forEach(([id, taban, soru, b]) => out.push({ id, grup: 'heldout', taban, soru, beklenen: b }));
KORU.forEach(([id, taban, soru, b]) => out.push({ id, grup: 'koru', taban, soru, beklenen: b }));
let n = 0; const id = () => 'V' + String(++n).padStart(3, '0'), r1 = x => Math.round(x * 10) / 10;
let ci = 0, fi = 0;
for (const taban of ['weizen', 'dubbel', 'wbock']) {
  SATIR[taban].forEach(([key, g, bic]) => {
    const tip = key.split(':')[0];
    bic.forEach((b, i) => { // çarpan: her atıf biçimi bir kalıpla (kalıp sırası dönerek)
      const [m, c] = CARPAN[ci++ % CARPAN.length]; out.push({ id: id(), grup: 'uretilmis', bicim: 'carpan', taban, soru: `${b} ${m}`, beklenen: { islem: 'miktar', kalem: key, miktar: r1(g * c), birim: 'g' } });
      if (i === 0) { const L = FARK[tip]; const [fm, d] = L[fi++ % L.length]; const y = r1(g + d);
        out.push({ id: id(), grup: 'uretilmis', bicim: 'fark', taban, soru: `${b} ${fm}`, beklenen: y > 0 ? { islem: 'miktar', kalem: key, miktar: y, birim: 'g' } : { belirsiz: true, neden: 'yeni miktar ≤ 0' } }); }
    });
  });
}
// sırayla dönen fark kalıbı "eksilt"i yalnız eksiye düşen satıra denk getirdi (V020) → pozitif sonuçlu iki satır elle eklendi (ilk koşuda çözücü "eksilt"i fark saymıyordu — bulgu)
[['weizen', 'malt:0', 'buğday maltını 300 gram eksiltsem', 1450], ['dubbel', 'katki:0', "candi'yi 20 gr eksiltsem", 80]].forEach(([taban, key, s, y]) => out.push({ id: id(), grup: 'uretilmis', bicim: 'fark', taban, soru: s, beklenen: { islem: 'miktar', kalem: key, miktar: y, birim: 'g' } }));
BELIRSIZ.forEach(([taban, s]) => out.push({ id: id(), grup: 'uretilmis', bicim: 'belirsiz', taban, soru: s, beklenen: { belirsiz: true } }));
TAT.forEach(([taban, s, stil]) => out.push({ id: id(), grup: 'uretilmis', bicim: 'tat', taban, soru: s, beklenen: stil ? { tat: true, stil } : { tat: true } }));
KALDIRIP.forEach(([taban, s, b]) => out.push({ id: id(), grup: 'uretilmis', bicim: 'kaldirip', taban, soru: s, beklenen: b }));
const nU = out.filter(x => x.grup === 'uretilmis').length;
const doc = { tur: 'BREWMASTER-DOG4C-COZUM-SETI', surum: 1, uretildi: '2026-10-21', kaynak: 'tests/dog4c_cozum_uret.mjs — beklenen çözüm biçim tablosundan (dairesel değil; çözücü sözlüğü okunmadı); tabanlar tests/tuzak_seti.json',
  sayim: { heldout: HELDOUT.length, koru: KORU.length, uretilmis: nU }, istemler: out };
fs.writeFileSync(path.join(KOK, 'tests', 'dog4c_cozum_seti.json'), JSON.stringify(doc, null, 1) + '\n');
console.log('heldout', HELDOUT.length, 'koru', KORU.length, 'uretilmis', nU);
