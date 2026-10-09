// ═══ SPRINT CC5 — ÖRNEK VERİSİ YAZICI + ÖZET OTOMASYONU ═══
// Builder'lar (_cc_build_k1/_kay/_k4.js) tablo satırlarını bu modülle ornek_veri.js'e yazar; modül ardından içerik özetini
// (sha256, ilk 10 hex) hesaplayıp HTML'deki <script src="ornek_veri.js?v=…"> ve sw.js kurulum listesindeki './ornek_veri.js?v=…'
// adresini KENDİSİ günceller. Elle adım yok. CC6 testi kapı olarak kalır (özet/adres uyuşmazlığı = kırmızı).
//   require('./_cc_veri_yaz.js').yaz(['window._KAYNAKLI_ORNEK = {...};'])   → { v, eskiV, degisen }
//   node _cc_veri_yaz.js            → veri değişmeden yalnız özet + adresleri eşitle (elle düzenleme sonrası onarım)
//   node _cc_veri_yaz.js --kontrol  → yalnız denetle; uyuşmazlıkta çıkış kodu 1 (ISK1: iskelet_veri.js kaynak özeti de)
// ISK1: her yazımdan sonra _isk_build.js çalışır → iskelet_veri.js örnek verisiyle aynı anda yenilenir.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const KOK = __dirname;
const VF = path.join(KOK, 'ornek_veri.js'), HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), SF = path.join(KOK, 'sw.js');
const TAG = /<script src="ornek_veri\.js\?v=([0-9a-f]+)"><\/script>/g, SWU = /'\.\/ornek_veri\.js\?v=([0-9a-f]+)'/g;
const ozet = icerik => crypto.createHash('sha256').update(icerik).digest('hex').slice(0, 10);
function hata(m) { throw new Error('[_cc_veri_yaz] ' + m); }
// SPRINT ISK1 6: örnek verisi her yazıldığında türetilmiş iskelet de yeniden üretilir (iskelet_veri.js + ?v; _isk_build.js başsız uygulamada)
function iskeletYenile(kontrol) {
  const r = require('child_process').spawnSync(process.execPath, [path.join(KOK, '_isk_build.js')].concat(kontrol ? ['--kontrol'] : []), { stdio: 'inherit' });
  if (r.status !== 0) { if (kontrol) return false; hata('iskelet builder başarısız (çıkış ' + r.status + ')'); } return true;
}
function oku() {
  const veri = fs.readFileSync(VF, 'utf8').replace(/\r\n/g, '\n'), html = fs.readFileSync(HF, 'utf8'), sw = fs.readFileSync(SF, 'utf8');
  const t = [...html.matchAll(TAG)], s = [...sw.matchAll(SWU)];
  if (t.length !== 1) hata('HTML’de tek ornek_veri.js etiketi bekleniyordu, bulunan: ' + t.length);
  if (s.length !== 1) hata('sw.js’te tek ornek_veri.js adresi bekleniyordu, bulunan: ' + s.length);
  return { veri, html, sw, htmlV: t[0][1], swV: s[0][1] };
}
// özet + adresleri eşitle (veri metni verilirse önce onu yazar)
function esitle(yeniVeri) {
  const d = oku();
  const veri = yeniVeri == null ? d.veri : yeniVeri;
  if (!/\n$/.test(veri)) hata('veri dosyası satır sonuyla bitmeli');
  const v = ozet(veri);
  if (yeniVeri != null && yeniVeri !== d.veri) fs.writeFileSync(VF, veri);   // LF (bkz. .gitattributes)
  if (d.htmlV !== v) fs.writeFileSync(HF, d.html.replace(TAG, () => '<script src="ornek_veri.js?v=' + v + '"></script>'));
  if (d.swV !== v) fs.writeFileSync(SF, d.sw.replace(SWU, () => "'./ornek_veri.js?v=" + v + "'"));
  return { v, eskiV: d.htmlV, swEski: d.swV, degisti: d.htmlV !== v || d.swV !== v };
}
// tablo satırlarını değiştir (yoksa sona ekle) + eşitle
function yaz(satirlar) {
  if (!Array.isArray(satirlar) || !satirlar.length) hata('satır listesi boş');
  let veri = oku().veri; const degisen = [];
  for (const sat of satirlar) {
    const m = /^window\.([A-Za-z0-9_]+) = /.exec(sat); if (!m || sat.includes('\n')) hata('tek satırlık "window.X = …;" bekleniyordu');
    const L = veri.split('\n'), i = L.findIndex(l => l.startsWith('window.' + m[1] + ' = '));
    if (L.filter(l => l.startsWith('window.' + m[1] + ' = ')).length > 1) hata(m[1] + ' veri dosyasında birden çok kez var');
    if (i >= 0) { if (L[i] !== sat) { L[i] = sat; degisen.push(m[1]); } }
    else { L.splice(L.length - 1, 0, sat); degisen.push(m[1] + ' (yeni)'); }
    veri = L.join('\n');
  }
  const r = esitle(veri); r.degisen = degisen; iskeletYenile(false);
  console.log('[ornek_veri.js] ' + (degisen.length ? 'güncellenen: ' + degisen.join(', ') : 'tablolar aynı') + ' · ?v ' + r.eskiV + ' → ' + r.v + (r.degisti ? ' (HTML + sw.js güncellendi)' : ' (değişmedi)'));
  return r;
}
module.exports = { yaz, esitle, ozet, oku, iskeletYenile };
if (require.main === module) {
  if (process.argv.includes('--kontrol')) {
    const d = oku(), v = ozet(d.veri);
    const ok = d.htmlV === v && d.swV === v;
    console.log((ok ? 'TAMAM' : 'UYUŞMAZLIK') + ' · içerik ' + v + ' · HTML ' + d.htmlV + ' · sw.js ' + d.swV);
    const isk = iskeletYenile(true);
    process.exit(ok && isk ? 0 : 1);
  }
  const r = esitle(); iskeletYenile(false); console.log('?v ' + r.eskiV + ' → ' + r.v + (r.degisti ? ' (HTML + sw.js güncellendi)' : ' (zaten eşit)'));
}
