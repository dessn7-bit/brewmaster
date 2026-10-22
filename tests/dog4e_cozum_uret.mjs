#!/usr/bin/env node
// SPRINT DOG4E madde 2 — KESİR YÖNÜ ek test seti üreticisi (DOG4B / DOG4C / DOG4D üreteçleriyle AYNI yaklaşım).
// Beklenen yeni miktar ELLE YAZILMIŞ tablodan hesaplanır: kesir k (pay / payda sayı olarak) × fiil sınıfı
//   bırak / kullan → eski × k · azalt / at → eski × (1 − k) · artır / daha ekle → eski × (1 + k) · yön belirsiz → belirsiz.
// Kesir yüzeyleri ("dörtte üçünü", "beşte biri kadar"), fiiller ve satır adları elle yazıldı; çözücünün sözlüğü (A4.FIIL, A4.kesirOku) OKUNMADI.
// k = 1/2 BİLEREK yok (k ile 1 − k aynı sonucu verir — DOG4D'nin kör noktası); DOG4D "yarısını" case'leri kendi setinde aynen koşar.
// Çıktı: tests/dog4e_cozum_seti.json  (node tests/dog4e_cozum_uret.mjs)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Claude held-out 4 (DOG4E.md, metin AYNEN) — 7 yanlış + 5 gereksiz belirsiz
const HELDOUT = [
  ['H01', 'dubbel', "Special B'nin dörtte birini çıkarsam", { islem: 'miktar', kalem: 'malt:3', miktar: 45, birim: 'g' }],
  ['H02', 'dubbel', "Special B'nin üçte birini atsam", { islem: 'miktar', kalem: 'malt:3', miktar: 40, birim: 'g' }],
  ['H03', 'dubbel', "Special B'nin dörtte birini azaltsam", { islem: 'miktar', kalem: 'malt:3', miktar: 45, birim: 'g' }],
  ['H04', 'wbock', 'munich maltının dörtte birini çıkarsam', { islem: 'miktar', kalem: 'malt:1', miktar: 1200, birim: 'g' }],
  ['H05', 'wbock', 'munich maltının dörtte birini eksiltsem', { islem: 'miktar', kalem: 'malt:1', miktar: 1200, birim: 'g' }],
  ['H06', 'weizen', "Hallertau'nun üçte birini kessem", { islem: 'miktar', kalem: 'hop:0', miktar: 8, birim: 'g' }],
  ['H07', 'dubbel', "Special B'nin dörtte birini daha eklesem", { islem: 'miktar', kalem: 'malt:3', miktar: 75, birim: 'g' }],
  // gereksiz belirsizler — beklenen: çözülürse doğru değer, belirsiz kalırsa da güvenli (DOG4E.md: "Yapmazsan belirsiz kalir")
  ['B01', 'dubbel', "Special B'den vazgeçsem", { islem: 'cikar', kalem: 'malt:3', belirsizKabul: true }],
  ['B02', 'dubbel', "Special B'yi hiç kullanmasam", { islem: 'cikar', kalem: 'malt:3', belirsizKabul: true }],
  ['B03', 'dubbel', "Special B'yi dörtte bir azaltsam", { islem: 'miktar', kalem: 'malt:3', miktar: 45, birim: 'g' }],
  ['B04', 'dubbel', "Special B'nin dörtte biri kadar koysam", { islem: 'miktar', kalem: 'malt:3', miktar: 15, birim: 'g' }],
  ['B05', 'dubbel', "candi'nin yarısı kadar daha koysam", { islem: 'miktar', kalem: 'katki:0', miktar: 150, birim: 'g' }]
];

// satırlar: [taban, anahtar, mevcut miktar (g), tamlayan (iyelik) biçimleri, belirtme biçimleri] — kesmeli / kesmesiz / BÜYÜK harf elle
const SATIR = [
  ['weizen', 'malt:0', 1750, ['buğday maltının', "Buğday Maltı'nın", 'BUĞDAY MALTININ'], ['buğday maltını', "Buğday Maltı'nı"]],
  ['weizen', 'malt:1', 1150, ["Pilsner'ın", 'pilsner maltının'], ["Pilsner'ı", 'pilsner maltını']],
  ['weizen', 'hop:0', 12, ["Hallertau'nun", "HALLERTAU'NUN"], ["Hallertau'yu"]],
  ['dubbel', 'malt:3', 60, ["Special B'nin", "SPECIAL B'NİN", "special b'nin"], ["Special B'yi", "special b'yi"]],
  ['dubbel', 'malt:1', 400, ["Munich'in", 'münih maltının'], ["Munich'i", 'münih maltını']],
  ['dubbel', 'katki:0', 100, ["candi'nin", 'candi şekerinin'], ["candi'yi", 'candi şekerini']],
  ['dubbel', 'hop:0', 20, ["Styrian'ın", "Styrian Goldings'in"], ["Styrian'ı"]],
  ['wbock', 'malt:3', 30, ["Carafa'nın", "CARAFA'NIN"], ["Carafa'yı"]],
  ['wbock', 'malt:1', 1600, ['munich maltının', "Münih'in"], ['munich maltını']],
  ['wbock', 'malt:0', 2600, ['buğday maltının'], ['buğday maltını']]
];
// kesirler: k + yüzeyler (belirtme / yalın / eksiz / yönelme) — elle
const KESIR = [
  { k: 1 / 3, acc: 'üçte birini', nom: 'üçte biri', eksiz: 'üçte bir', dat: 'üçte birine' },
  { k: 1 / 4, acc: 'dörtte birini', nom: 'dörtte biri', eksiz: 'dörtte bir', dat: 'dörtte birine' },
  { k: 1 / 5, acc: 'beşte birini', nom: 'beşte biri', eksiz: 'beşte bir', dat: 'beşte birine' },
  { k: 2 / 3, acc: 'üçte ikisini', nom: 'üçte ikisi', eksiz: 'üçte iki', dat: 'üçte ikisine' },
  { k: 3 / 4, acc: 'dörtte üçünü', nom: 'dörtte üçü', eksiz: 'dörtte üç', dat: 'dörtte üçüne' }
];
// fiil sınıfları (doğal Türkçe, elle)
const BIRAK = ['kullansam', 'koysam', 'bıraksam', 'kullanırsam'];
const AZALT = ['çıkarsam', 'atsam', 'azaltsam', 'eksiltsem', 'kessem', 'düşürsem', 'indirsem', 'kaldırsam'];
const ARTIR = ['daha eklesem', 'daha koysam', 'artırsam', 'arttırsam', 'ekstra koysam', 'fazladan koysam'];
const YON_YOK = ['eklesem', 'kullanmasam', 'değiştirsem', 'denesem', 'ayarlasam'];

// CC ek denemeleri (aynı sınıf: kesir + çıkar; yüzde ve kısmi değiştirme ESKİ koddan kalma hataydı — "%25'ini çıkarsam" satırı TAMAMEN çıkarıyordu). Dairesel olabilir (çözücüyü yazan yazdı).
const EK = [
  ['dubbel', "candi'nin %25'ini çıkarsam", { islem: 'miktar', kalem: 'katki:0', miktar: 75, birim: 'g' }, 0.25],
  ['dubbel', "Special B'nin yüzde 30'unu atsam", { islem: 'miktar', kalem: 'malt:3', miktar: 42, birim: 'g' }, 0.3],
  ['dubbel', "Special B'yi %20 azaltsam", { islem: 'miktar', kalem: 'malt:3', miktar: 48, birim: 'g' }, 0.2],
  ['dubbel', "Special B'yi %20 artırsam", { islem: 'miktar', kalem: 'malt:3', miktar: 72, birim: 'g' }, 0.2],
  ['dubbel', "Special B'nin dörtte birini Carafa ile değiştirsem", { belirsiz: true }, 0.25],
  ['dubbel', "Special B'nin dörtte birini çıkarıp artırsam", { belirsiz: true }, 0.25],
  ['dubbel', "Special B'nin iki katı kadar daha koysam", { belirsiz: true }, 2],
  ['dubbel', "Special B'nin dörtte birini kullanmasam", { belirsiz: true }, 0.25]
];
const out = [];
HELDOUT.forEach(([id, taban, soru, b]) => out.push({ id, grup: 'heldout', taban, soru, beklenen: b }));
let n = 0; const id = () => 'E' + String(++n).padStart(3, '0'), r1 = x => Math.round(x * 10) / 10;
const U = (bicim, taban, soru, beklenen, k) => out.push({ id: id(), grup: 'uretilmis', bicim, k: Math.round(k * 1000) / 1000, taban, soru, beklenen });
let si = 0, vi = 0; const sat = () => SATIR[si++ % SATIR.length], sec = (L, i) => L[i % L.length];
const mik = (key, g, c) => ({ islem: 'miktar', kalem: key, miktar: r1(g * c), birim: 'g' });
KESIR.forEach((q, qi) => {
  // iyelik + azalt / at → × (1 − k): 4 / kesir
  for (let j = 0; j < 4; j++) { const [t, key, g, gen] = sat(); U('iyelik-azalt', t, `${sec(gen, vi)} ${q.acc} ${sec(AZALT, vi++)}`, mik(key, g, 1 - q.k), q.k); }
  // iyelik + bırak / kullan → × k: 2 / kesir
  for (let j = 0; j < 2; j++) { const [t, key, g, gen] = sat(); U('iyelik-birak', t, `${sec(gen, vi)} ${q.acc} ${sec(BIRAK, vi++)}`, mik(key, g, q.k), q.k); }
  // iyelik + artır / daha → × (1 + k): 2 / kesir
  for (let j = 0; j < 2; j++) { const [t, key, g, gen] = sat(); U('iyelik-artir', t, `${sec(gen, vi)} ${q.acc} ${sec(ARTIR, vi++)}`, mik(key, g, 1 + q.k), q.k); }
  // iyelik + yönü belli olmayan fiil → belirsiz: 1 / kesir
  { const [t, , , gen] = sat(); U('iyelik-yon-yok', t, `${sec(gen, vi)} ${q.acc} ${sec(YON_YOK, qi)}`, { belirsiz: true }, q.k); vi++; }
  // yalın + "kadar" → bırak × k / "kadar daha" × (1 + k)
  { const [t, key, g, gen] = sat(); U('kadar-birak', t, `${sec(gen, vi++)} ${q.nom} kadar koysam`, mik(key, g, q.k), q.k); }
  { const [t, key, g, gen] = sat(); U('kadar-daha', t, `${sec(gen, vi++)} ${q.nom} kadar daha koysam`, mik(key, g, 1 + q.k), q.k); }
  // eksiz kesir + fark fiili: "X'i dörtte bir azaltsam" × (1 − k) · "üçte bir artırsam" × (1 + k)
  { const [t, key, g, , acc] = sat(); U('eksiz-azalt', t, `${sec(acc, vi++)} ${q.eksiz} ${sec(['azaltsam', 'düşürsem', 'eksiltsem'], qi)}`, mik(key, g, 1 - q.k), q.k); }
  { const [t, key, g, , acc] = sat(); U('eksiz-artir', t, `${sec(acc, vi++)} ${q.eksiz} ${sec(['artırsam', 'arttırsam', 'yükseltsem'], qi)}`, mik(key, g, 1 + q.k), q.k); }
  // yönelme hâli = hedef: "X'i dörtte birine indirsem" × k
  { const [t, key, g, , acc] = sat(); U('yonelme-hedef', t, `${sec(acc, vi++)} ${q.dat} ${sec(['indirsem', 'düşürsem', 'azaltsam'], qi)}`, mik(key, g, q.k), q.k); }
});
EK.forEach(([t, soru, b, k]) => U('ek', t, soru, b, k));
const doc = { tur: 'BREWMASTER-DOG4E-COZUM-SETI', surum: 1, uretildi: '2026-10-22', kaynak: 'tests/dog4e_cozum_uret.mjs — beklenen miktar elle yazılmış kesir × fiil sınıfı tablosundan (dairesel değil; çözücü sözlüğü okunmadı); tabanlar tests/tuzak_seti.json',
  sayim: { heldout: HELDOUT.length, uretilmis: out.filter(x => x.grup === 'uretilmis' && x.bicim !== 'ek').length, ek: EK.length }, istemler: out };
fs.writeFileSync(path.join(KOK, 'tests', 'dog4e_cozum_seti.json'), JSON.stringify(doc, null, 1) + '\n');
console.log('heldout', HELDOUT.length, 'uretilmis', doc.sayim.uretilmis, 'ek', EK.length);
