// ═══ SPRINT ND7K — KAYNAKLI YENİ KATALOG KAYITLARI BUILDER ═══
// HTML'deki /*ND7K_URUN_BAS*/ … /*ND7K_URUN_SON*/ bloğu (window._BM_ND7K_URUN) YALNIZ bu betikle yazılır. Kaynak: tests/nd7k_urun.json (elle / araştırmayla doldurulur).
//   node _nd7k_urun_build.js            → denetle + HTML'e yaz
//   node _nd7k_urun_build.js --kontrol  → yalnız denetle (gömülü blok = yeniden üretilen blok mu); farkta çıkış kodu 1
// Denetim (hata varsa yazmaz): her kayıtta kimlik benzersiz ve katalogda yok · her SAYISAL alanın kaynağı var (url https + en çok 15 sözcük alıntı) · alıntıdaki sayılar alan değerini içeriyor ·
//   türetilen alanlar (aa / r / gu / sc / ideal) kaynaklı alandan yeniden hesaplanınca aynı · MUADIL anahtarı / ✅ yok.
// Katalog kaydına giren alanlar: uygulamanın mevcut kayıt biçimi + kaynaklı ek alanlar + nd7k:true + kaynak:[{alan,url,alinti}].
// Repo PUBLIC: yalnız ürün verisi ve ≤ 15 sözcük alıntı.
'use strict';
const fs = require('fs'), path = require('path');
const KOK = __dirname, HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), UF = path.join(KOK, 'tests', 'nd7k_urun.json'), KONTROL = process.argv.includes('--kontrol');
const BAS = '/*ND7K_URUN_BAS*/', SON = '/*ND7K_URUN_SON*/';
const D = JSON.parse(fs.readFileSync(UF, 'utf8')), hata = [], U = { malt: [], hop: [], maya: [], katki: [] };
let h = fs.readFileSync(HF, 'utf8');
const dizi = { malt: 'const MALTLAR=[', hop: 'const HOPLAR=[', maya: 'const MAYALAR=[', katki: 'const KATKILAR=[' }, bolge = {};
Object.keys(dizi).forEach(t => { const a = h.indexOf(dizi[t]); if (a < 0) throw new Error('katalog dizisi bulunamadı: ' + t); const sir = Object.values(dizi).map(x => h.indexOf(x)).filter(i => i > a).sort((p, q) => p - q)[0] || (a + 600000); bolge[t] = h.slice(a, sir); });
const sozcuk = s => String(s).trim().split(/\s+/).length, r1 = x => Math.round(x * 10 + 1e-9) / 10, orta = a => (a[0] + a[1]) / 2;
const sayilar = s => (String(s).replace(/(\d),(\d)/g, '$1.$2').match(/\d+(?:\.\d+)?/g) || []).map(Number);
const SAY = { hop: { alfa: 'alfa', beta: 'beta', yag: 'yag' }, maya: { zayiflama: 'atu', sicaklik: 'scF' }, malt: { renk: 'renkAr', ekstrakt: 'ekstrakt', maxOran: 'maxOran', nem: 'nem' } };
const gor = {};
D.urunler.forEach(p => { const k = p.kayit, ad = p.tur + ':' + p.id;
  if (!U[p.tur]) return hata.push(ad + ' tür'); if (gor[ad]) hata.push(ad + ' iki kez'); gor[ad] = 1; if (k.id !== p.id) hata.push(ad + ' kimlik ≠ kayit.id');
  if (new RegExp('\\{id:"' + p.id.replace(/[^a-z0-9_]/g, '') + '"').test(bolge[p.tur])) hata.push(ad + ' katalogda zaten var');
  if (!Array.isArray(p.kaynak) || !p.kaynak.length) hata.push(ad + ' kaynak yok');
  (p.kaynak || []).forEach(q => { if (!/^https:\/\/[a-z0-9.-]+\//i.test(q.url)) hata.push(ad + ' url ' + q.url); if (!q.alinti || sozcuk(q.alinti) > 15) hata.push(ad + ' alıntı (> 15 sözcük / boş): ' + q.alinti); });
  const alanlar = (p.kaynak || []).map(q => String(q.alan).split(',').map(x => x.trim()));
  Object.keys(SAY[p.tur]).forEach(a => { const v = k[SAY[p.tur][a]]; if (v == null) return; const kay = (p.kaynak || []).filter((q, i) => alanlar[i].some(x => x === a || x === a + '2' || (a === 'renk' && x === 'renk2')));
    if (!kay.length) return hata.push(ad + ' kaynaksız sayısal alan: ' + a);
    const deger = (Array.isArray(v) ? v : [v]).filter(x => x != null), tum = [].concat(...kay.map(q => sayilar(q.alinti)));
    deger.forEach(x => { if (!tum.some(y => Math.abs(y - x) < 1e-9)) hata.push(ad + ' ' + a + ' değeri ' + x + ' alıntılarda geçmiyor: ' + kay.map(q => q.alinti).join(' ¦ ')); }); });
  // türetilen alanlar
  if (p.tur === 'hop') { if (!(k.aa > 0) || Math.abs(k.aa - r1(orta(k.alfa))) > 1e-9) hata.push(ad + ' aa ≠ alfa orta noktası'); }
  if (p.tur === 'maya') { const sc = k.scF.map(f => Math.round((f - 32) / 1.8)); if (k.sc[0] !== sc[0] || k.sc[1] !== sc[1] || k.ideal !== Math.round(orta(sc))) hata.push(ad + ' sc / ideal ≠ °F çevrimi'); if (!(k.atu[0] > 0 && k.atu[1] >= k.atu[0])) hata.push(ad + ' atu'); if (['ale', 'lager', 'belcika', 'saison', 'sour', 'wheat', 'wit', 'kveik'].indexOf(k.tip) < 0) hata.push(ad + ' tip'); }
  if (p.tur === 'malt') { if (k.gu !== Math.round(k.ekstrakt * 3.84)) hata.push(ad + ' gu ≠ ekstrakt × 3,84'); if (Math.abs(k.r - r1(orta(k.renkAr))) > 1e-9) hata.push(ad + ' r ≠ renk orta noktası'); }
  if (/✅/.test(JSON.stringify(p))) hata.push(ad + ' ✅ içeriyor');
  U[p.tur].push(Object.assign({}, k, { nd7k: true, uretici: p.uretici, kaynak: p.kaynak.map(q => ({ alan: q.alan, url: q.url, alinti: q.alinti })) }));
});
// MUADIL'e yeni kimlik yazılmadı (anahtar olarak)
const mu = h.indexOf('const MUADIL'), muSon = mu >= 0 ? h.indexOf('\n};', mu) : -1, muB = mu >= 0 ? h.slice(mu, muSon > 0 ? muSon : mu + 2000000) : '';
D.urunler.forEach(p => { if (new RegExp('(^|[\\s{,])"?' + p.id + '"?\\s*:\\s*\\[', 'm').test(muB) || new RegExp('\\{id:"' + p.id + '"').test(muB)) hata.push(p.tur + ':' + p.id + ' MUADIL tablosunda geçiyor'); });
console.log('[nd7k-urun] kayıt ' + D.urunler.length + ' (malt ' + U.malt.length + ' · hop ' + U.hop.length + ' · maya ' + U.maya.length + ' · katkı ' + U.katki.length + ') · eklenemedi ' + (D.eklenemedi || []).length + ' · sırada ' + (D.sirada || []).length + ' · denetim hatası ' + hata.length);
hata.slice(0, 40).forEach(x => console.log('  ! ' + x));
if (hata.length) process.exit(1);
const blok = BAS + 'window._BM_ND7K_URUN = ' + JSON.stringify(U) + ';' + SON, i = h.indexOf(BAS), j = h.indexOf(SON);
if (i < 0 || j < i || h.indexOf(BAS, i + 1) >= 0) throw new Error('ND7K_URUN işareti');
const ayni = h.slice(i, j + SON.length) === blok;
console.log('[nd7k-urun] gömülü blok ' + (ayni ? 'GÜNCEL' : 'FARKLI'));
if (KONTROL) process.exit(ayni ? 0 : 1);
if (!ayni) { h = h.slice(0, i) + blok + h.slice(j + SON.length); fs.writeFileSync(HF, h); console.log('[nd7k-urun] yazıldı: HTML _BM_ND7K_URUN'); }
