// SPRINT DOG1 madde 4 — ETİKET ŞABLONU (doğrulama turu sonucundan; AI çağrısı yok).
// Kullanım:
//   node tests/dog1_etiket_sablon.mjs <brewmaster_dog1_<kosuId>.json> [cikti.json]
//     → gösterilen cümlelerin TAMAMI + her cümlenin kaynak parçalarının metni + paket metni; etiket alanları BOŞ (sinif / kanit / not).
//       Claude ve CC aynı şablonu AYRI dosyalarda doldurur (…_claude.json / …_cc.json); düşen cümleler ayrı listede (içerik doğruluğu = yanlış alarm oranı).
//   node tests/dog1_etiket_sablon.mjs --karsilastir <claude.json> <cc.json>
//     → aynı cümlede farklı sınıf verilen satırlar + özellik başına (M / G) (b + c)/N iki etiketçiyle.
// sinif: 'dogru' | 'c' (gösterilende yanlış) | 'd' (doğrulanamadı) — düşenlerde: 'dogru_icerik' (yanlış alarm) | 'yanlis_icerik'.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const argv = process.argv.slice(2);
// paket metni "[id] başlık:\nmetin" blokları "\n\n" ile ayrılır (M ve G paketleri aynı biçim)
export function paketParcala(t) { const o = {}; String(t || '').split(/\n\n(?=\[[^\]]+\] )/).forEach(ch => { const m = ch.match(/^\[([^\]]+)\] ([^\n]*?):\n([\s\S]*)$/); if (m) o[m[1]] = m[3]; }); return o; }
// SPRINT DOG4 madde 5: malzeme asistanı (AI4) doğrulama turu dosyası (BREWMASTER-AI4DOG) — cümleler r.cumleTam (TAM metin), kaynak parçaları paket + TAM web alıntısı (r.webTam); set 'A'
export function sablonAI4(d) {
  const gos = [], dus = [], paketler = {};
  for (const key of d.sira) { const r = d.adim[key]; if (!r) continue; if (r.paket) paketler[key] = r.paket; const P = paketParcala(r.paket), W = Object.fromEntries((r.webTam || []).map(w => [w.id, 'WEB ' + w.url + (w.baslik ? ' — ' + w.baslik : '') + (w.ozgu ? ' [stile özgü]' : '') + ': "' + w.alinti + '"']));
    (r.cumleTam || []).forEach((x, i) => { const satir = { key, id: r.id, set: 'A', grup: r.grup, tip: r.tip || null, cift: r.cift || null, yonlendirici: !!r.yonlendirici, turNo: r.turNo, i, metin: x.metin, kaynaklar: x.kaynaklar || [], kaynakMetin: Object.fromEntries((x.kaynaklar || []).map(k => [k, P[k] != null ? P[k] : W[k] != null ? W[k] : '(pakette yok — bilinmeyen)'])), gorev: r.gorev || null, denetim: x.durum === 'ok' ? 'GOS' : 'DUS:' + x.tur + (x.sinif ? '/' + x.sinif : ''), sinif: null, kanit: '', not: '' };
      (x.durum === 'ok' ? gos : dus).push(satir); }); }
  return { tur: 'BREWMASTER-AI4DOG-ETIKET', surum: 1, kosuId: d.kosuId, tarih: d.tarih, model: d.model && d.model.id, denetleyici: d.denetleyici, mock: !!d.mock, puanlama: d.puanlama,
    sayim: { gosterilen: gos.length, dusen: dus.length, A: gos.length },
    talimat: 'Gösterilen cümlelerin TAMAMI etiketlenir: sinif dogru | c | sinirda | d + kanıt (paketteki parça / satır ya da web alıntısı); yalakalık / tat hükmü ayrıca not alanına. Düşenler: dogru_icerik | yanlis_icerik. Etiketçi kendi dosyasında; sonradan --karsilastir.', gosterilen: gos, dusen: dus, paketler };
}
export function sablon(d) {
  if (d && d.tur === 'BREWMASTER-AI4DOG') return sablonAI4(d);
  if (!d || d.tur !== 'BREWMASTER-DOG1') throw new Error('BREWMASTER-DOG1 / BREWMASTER-AI4DOG sonucu değil');
  const gos = [], dus = [], paketler = {};
  for (const key of d.sira) { const r = d.adim[key]; if (!r) continue; if (r.paket) paketler[key] = r.paket; const P = paketParcala(r.paket);
    (r.cumleler || []).forEach((x, i) => { const satir = { key, id: r.id, set: r.set, turNo: r.turNo, i, metin: x.metin, etiket: x.etiket || null, aday: x.aday || null, kaynaklar: x.kaynaklar || [], kaynakMetin: Object.fromEntries((x.kaynaklar || []).map(k => [k, P[k] != null ? P[k] : '(pakette yok — web / bilinmeyen)'])), denetim: x.durum === 'ok' ? 'GOS' : 'DUS:' + x.tur + (x.sinif ? '/' + x.sinif : ''), sinif: null, kanit: '', not: '' };
      (x.durum === 'ok' ? gos : dus).push(satir); }); }
  return { tur: 'BREWMASTER-DOG1-ETIKET', surum: 1, kosuId: d.kosuId, tarih: d.tarih, model: d.model && d.model.id, denetleyici: d.denetleyici, mock: !!d.mock, puanlama: d.puanlama,
    sayim: { gosterilen: gos.length, dusen: dus.length, M: gos.filter(x => x.set === 'M').length, G: gos.filter(x => x.set === 'G').length },
    talimat: 'Gösterilen cümlelerin TAMAMI etiketlenir: sinif dogru | c | d + kanıt (paketteki parça / satır). Düşenler: dogru_icerik | yanlis_icerik. Etiketçi kendi dosyasında; sonradan --karsilastir.', gosterilen: gos, dusen: dus, paketler };
}
export function karsilastir(a, b) {
  const k = x => x.key + '#' + x.i, B = new Map(b.gosterilen.map(x => [k(x), x])), fark = [];
  a.gosterilen.forEach(x => { const y = B.get(k(x)); if (!y || x.sinif !== y.sinif) fark.push({ cumle: k(x), a: x.sinif, b: y ? y.sinif : '(yok)', metin: x.metin }); });
  const oz = (e, s) => { const N = e.gosterilen.filter(x => x.set === s).length + e.dusen.filter(x => x.set === s).length, c = e.gosterilen.filter(x => x.set === s && x.sinif === 'c').length, sn = e.gosterilen.filter(x => x.set === s && x.sinif === 'sinirda').length, bb = e.dusen.filter(x => x.set === s && /\/b$/.test(x.denetim)).length; return { N, b: bb, c, sinirda: sn, oran: N ? (bb + c) / N : null, kati: N ? (bb + c + sn) / N : null }; };
  if (a.tur === 'BREWMASTER-AI4DOG-ETIKET') return { fark, A: { a: oz(a, 'A'), b: oz(b, 'A') } }; // DOG4: malzeme asistanı (tek set)
  return { fark, M: { a: oz(a, 'M'), b: oz(b, 'M') }, G: { a: oz(a, 'G'), b: oz(b, 'G') } };
}
if (argv.length && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (argv[0] === '--karsilastir') { const r = karsilastir(JSON.parse(fs.readFileSync(argv[1], 'utf8')), JSON.parse(fs.readFileSync(argv[2], 'utf8'))); console.log(JSON.stringify(r, null, 1)); }
  else { const d = JSON.parse(fs.readFileSync(argv[0], 'utf8')), s = sablon(d), out = argv[1] || argv[0].replace(/\.json$/, '') + '_etiket_sablon.json'; fs.writeFileSync(out, JSON.stringify(s, null, 1)); console.log('şablon: ' + out + ' · gösterilen ' + s.sayim.gosterilen + (s.sayim.A != null ? ' (malzeme asistanı)' : ' (M ' + s.sayim.M + ' · G ' + s.sayim.G + ')') + ' · düşen ' + s.sayim.dusen); }
}
