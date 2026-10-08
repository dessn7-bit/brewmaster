// ═══ SPRINT CC3 — K4 "📗 Topluluk reçetesi" TABLOSU (build-time) ═══
// Kaynak: 376K korpus (working/_step105_dataset_v8_clean.json) — yalnız rmwoods kayıtları, origin = brewersfriend | brewtoad.
// Kural:
//   • Eşleşme MEKANİK: _cc_k4_kural.js (beyan edilen stil etiketi birebir VEYA reçete adı stil kalıplarına uyar; birden çok
//     stile uyan = belirsiz = alınmaz).
//   • Yalnız K1+K2+K3 toplamı 3'ün altında kalan stillerde; stil başına en fazla 3, toplamı 3'e tamamlayacak kadar.
//   • Bekçiler: OG zorunlu ve stil bandında (±0,010; alkolsüzde OG ≤ 1,040); grist ≥1 kalem ve 0,04–0,8 kg/L; batch 3–250 L;
//     hop ≥1 (gruit/kvass/tepache hariç) ve kalem başına ≤30 g/L; IBU 0–150; ABV 0–16.
//   • Seçim deterministik: veri tamlığı (FG/IBU/SRM/maya) + OG bant içinde → OG bant merkezine yakınlık → küçük kaynak no.
//   • CC4 — HESAPLANMIŞ OG: ham OG yoksa reçetenin KENDİ verisinden hesaplanır: Σ (potansiyel−1)·1000 × kg·2,20462 × verim
//     (özüt/şeker/bal/şurupta verim uygulanmaz) ÷ (L/3,78541). Reçete verimi beyan edilmemişse ya da bir maltın potansiyeli
//     yoksa HESAPLANMAZ. Ayrı alan: ogH (og DEĞİL) — UI "≈ … (hesaplanmış, kaynakta yok)" der. Ham OG'li adaylar her zaman önce
//     gelir; hesaplanmış OG yalnız boşluğu doldurur. Yöntem ham OG'si bilinen adaylarda sınanır, sapma build çıktısında basılır.
//   • Yıl: korpusta tarif başına yıl alanı YOK → yil:null (UI "yıl kaynakta yok" der; uydurulmaz).
//   • Kişi adı (brewer) TABLOYA YAZILMAZ. Yasak dil listesi / küfür içeren ad atlanır.
// Kullanım: node _cc_build_k4.js <çıktı.txt> [aday-önbellek.jsonl]
'use strict';
const fs = require('fs'), path = require('path');
const { esles, KURAL, norm } = require('./_cc_k4_kural.js');
const [OUT, CACHE] = process.argv.slice(2);
const KORPUS = path.join(__dirname, 'working', '_step105_dataset_v8_clean.json');
const html = fs.readFileSync(path.join(__dirname, 'Brewmaster_v2_79_10.html'), 'utf8').replace(/\r\n/g, '\n');
// CC4: örnek tabloları ornek_veri.js'e taşındı → HTML + veri dosyası birlikte okunur
const _veriKaynak = html + '\n' + (fs.existsSync(path.join(__dirname, 'ornek_veri.js')) ? fs.readFileSync(path.join(__dirname, 'ornek_veri.js'), 'utf8').replace(/\r\n/g, '\n') : '');
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
// ── BJCP + mevcut örnek sayısı (UI ornekListe ile AYNI kural) ──
const bj = html.slice(html.indexOf('const BJCP = {') + 13); let d = 0, j = 0;
for (; j < bj.length; j++) { if (bj[j] === '{') d++; else if (bj[j] === '}') { d--; if (d === 0) break; } }
const BJCP = (new Function('return ' + bj.slice(0, j + 1)))();
const w = {}; _veriKaynak.split('\n').filter(l => /^window\.(_TOPLULUK_MADALYA|_NHC_MADALYA|_KAYNAKLI_ORNEK) = /.test(l)).forEach(l => (new Function('w', l.replace('window.', 'w.')))(w));
const A = w._TOPLULUK_MADALYA, N = w._NHC_MADALYA, K = w._KAYNAKLI_ORNEK;
const mevcut = st => { const nv = (N[st] && N[st][1]) || [], mv = (A[st] && A[st][1]) || [], kv = K[st] || [];
  return nv.length + mv.filter(o => !nv.some(n => n.yil === o.yil && o.og && n.og && Math.abs(n.og - o.og) <= 0.0015)).length + kv.length; };
KURAL.forEach(([st]) => { if (!BJCP[st]) abort('kural stili BJCP-239 anahtarı değil: ' + st); });
// ── aday toplama (korpus tek geçiş; önbellek varsa ondan) ──
function aday(r) {
  if (r.source !== 'rmwoods') return null;
  const org = (r.raw && r.raw.origin) || r.origin; if (org !== 'brewersfriend' && org !== 'brewtoad') return null;
  const e = esles(r.name, r.sorte_raw); if (!e) return null;
  const raw = r.raw || {};
  return { stil: e.stil, es: e.es, id: r.source_id, org, ad: r.name, et: r.sorte_raw || '', br: norm(raw.brewer || ''),
    og: raw.og, fg: raw.fg, ib: raw.ibu, sr: raw.srm, ab: raw.abv, L: raw.batch_size_l, y: typeof raw.yeast === 'string' ? raw.yeast : '',
    eff: raw.mash_eff_pct, m: (raw.malts || []).map(x => [x.name, x.amount_kg, x.potential, x.type]), h: (raw.hops || []).map(x => [x.name, x.amount_g, x.time_min, x.use, x.alpha]),
    x: (raw.misc || []).map(x => [x.name, x.use, x.time_min]) };
}
function topla(cb) {
  // önbellek yalnız geliştirme hızı için: eşleşme GÜNCEL kurallarla yeniden hesaplanır (nihai üretim önbelleksiz tam geçiş)
  if (CACHE && fs.existsSync(CACHE)) { cb(fs.readFileSync(CACHE, 'utf8').split('\n').filter(Boolean).map(JSON.parse).map(a => { const e = esles(a.ad, a.et); return e ? Object.assign(a, { stil: e.stil, es: e.es }) : null; }).filter(Boolean)); return; }
  const L = []; let n = 0, fail = 0, buf = ''; const BOUND = '}, {"id": ';
  const rs = fs.createReadStream(KORPUS, { encoding: 'utf8', highWaterMark: 1 << 24 });
  const isle = t => { try { n++; const a = aday(JSON.parse(t)); if (a) L.push(a); } catch (e) { fail++; } };
  rs.on('data', ch => { buf += ch; const st = buf.indexOf('{"id": '); if (st < 0) return; buf = buf.slice(st); let i;
    while ((i = buf.indexOf(BOUND, 1)) >= 0) { isle(buf.slice(0, i + 1)); buf = buf.slice(i + 2); } if (buf.length > 50e6) { fail++; buf = ''; } });
  rs.on('end', () => { let last = buf; const c = last.lastIndexOf('}]}'); if (c > 0) last = last.slice(0, c + 1); isle(last);
    console.log('[korpus] ' + n + ' kayıt · ' + fail + ' ayrıştırılamadı · ' + L.length + ' kural-eşleşen aday');
    if (CACHE) fs.writeFileSync(CACHE, L.map(x => JSON.stringify(x)).join('\n'));
    cb(L); });
}
const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir', 'gereklidir', 'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
const KUFUR = /\b(fuck\w*|shit\w*|bitch\w*|cunt|dick|cock|pussy|nigg\w*|fag\w*|retard\w*|whore|slut|rape\w*|nazi|hitler)\b/i;
const SUREC = /irish moss|whirlfloc|nutrient|gypsum|calcium|chloride|campden|epsom|baking soda|chalk|magnesium|phosphoric|clarity|polyclar|gelatin|biofine|fermcap|antifoam|servomyces|super ?moss|isinglass|sparkolloid|five star|star ?san|pectic|amylase|koji|acid blend|ph 5\.2|5\.2 stabilizer|water|salt$|lactic acid|yeast/i;
const KULLANIM = { boil: 'kaynatma', mash: 'mayşe', secondary: 'ikincil', primary: 'birincil', bottling: 'şişeleme', whirlpool: 'whirlpool', flameout: 'ocak kapanınca', 'dry hop': 'kuru' };
const r1 = x => Math.round(x * 10) / 10;
function kontrol(a) {
  const b = BJCP[a.stil] || {}; const og = +a.og;
  if (!(og > 1)) return 'OG yok';
  const lo = a.stil === 'Non-Alcoholic Beer' ? 1.0 : (b.og ? b.og[0] - 0.010 : 1.0), hi = a.stil === 'Non-Alcoholic Beer' ? 1.040 : (b.og ? b.og[1] + 0.010 : 1.16);
  if (og < lo || og > hi) return 'OG bant dışı';
  if (a.stil === 'Non-Alcoholic Beer' && !(a.ab != null && +a.ab <= 1.0)) return 'alkolsüz: yazılı ABV ≤%1 yok (düşük OG tek başına alkolsüz demek değil)';
  const L = +a.L; if (!(L >= 3 && L <= 250)) return 'batch bant dışı';
  const m = a.m.filter(x => x[0] && +x[1] > 0); if (!m.length || m.length !== a.m.length) return 'grist eksik/sıfır kalem';
  const kgL = m.reduce((s, x) => s + +x[1], 0) / L; if (kgL < 0.04 || kgL > 0.8) return 'grist yoğunluğu tutarsız';
  const kr = KURAL.find(k => k[0] === a.stil)[1] || {};
  if (!kr.hopsuz && !a.h.length) return 'hop yok';
  if (kr.hopYasak && a.h.length) return 'şerbetçiotu var (stil tanımı gereği şerbetçiotsuz)';
  if (a.h.some(x => !(+x[1] > 0) || +x[1] / L > 30)) return 'hop miktarı bant dışı';
  if (a.ib != null && (+a.ib < 0 || +a.ib > 150)) return 'IBU bant dışı';
  if (a.ab != null && (+a.ab < 0 || +a.ab > 16)) return 'ABV bant dışı';
  const metin = (a.ad + ' ' + a.y + ' ' + a.m.map(x => x[0]).join(' ') + ' ' + a.h.map(x => x[0]).join(' ') + ' ' + a.x.map(x => x[0]).join(' ')).toLocaleLowerCase('tr-TR');
  if (YASAK.some(k => metin.includes(k))) return 'yasak dil listesindeki sözcük';
  if (KUFUR.test(metin)) return 'uygunsuz ad';
  return null;
}
function kayit(a) {
  const dk = h => h[3] === 'dry hop' ? 'kuru' : h[3] === 'whirlpool' ? 'wp' : h[3] === 'first wort' ? 'FWH' : h[3] === 'mash' ? 'mash' : (h[2] != null && +h[2] >= 0 ? Math.round(+h[2]) : null);
  const aa = v => v == null ? null : (+v < 1 ? r1(+v * 100) : r1(+v));
  const o = { k: 'K4', kay: { pub: a.org === 'brewtoad' ? 'Brewtoad' : "Brewer's Friend", u: null }, bira: String(a.ad).trim().slice(0, 70), et: String(a.et).slice(0, 60), es: a.es, yil: null,
    L: r1(+a.L) };
  if (a._ogH) o.ogH = Math.round(+a.og * 1000) / 1000; else o.og = Math.round(+a.og * 1000) / 1000;   // hesaplanmış OG ayrı alanda
  if (+a.fg > 0.98 && +a.fg < 1.06) o.fg = Math.round(+a.fg * 1000) / 1000;
  if (+a.ib > 0) o.ib = Math.round(+a.ib); if (+a.sr > 0) o.sr = r1(+a.sr); if (+a.ab > 0) o.ab = r1(+a.ab);
  o.g = a.m.map(x => [String(x[0]).slice(0, 60), Math.round(+x[1] * 1000)]);
  if (a.h.length) o.h = a.h.map(x => [String(x[0]).slice(0, 40), r1(+x[1]), dk(x), aa(x[4])]);
  if (a.y) o.y = String(a.y).slice(0, 90);
  const ek = a.x.filter(x => x[0] && String(x[0]).trim().length >= 4 && !SUREC.test(x[0])).map(x => [String(x[0]).slice(0, 50), [KULLANIM[x[1]] || x[1] || '', (x[1] === 'boil' && +x[2] > 0) ? x[2] + ' dk' : ''].filter(Boolean).join(' ') + ' (miktar birimi kaynakta yok)']);
  if (ek.length) o.ek = ek.slice(0, 8);
  return o;
}
const OZUT = /extract|sugar|honey|syrup|juice|candi|dextrose|lactose|maltodextrin|adjunct sugar/i;
function ogHesap(a) {
  const L = +a.L, eff = +a.eff; if (!(L > 0) || !(eff > 0 && eff <= 100) || !a.m.length) return null;
  let pts = 0;
  for (const x of a.m) { const pot = +x[2], kg = +x[1]; if (!(pot > 1 && pot < 1.05) || !(kg > 0)) return null; pts += (pot - 1) * 1000 * kg * 2.20462 * (OZUT.test(String(x[3] || '') + ' ' + String(x[0] || '')) ? 1 : eff / 100); }
  const og = 1 + pts / (L / 3.78541) / 1000;
  return og > 1.005 && og < 1.16 ? Math.round(og * 1000) / 1000 : null;
}
topla(L => {
  // yöntem sınaması: ham OG'si OLAN adaylarda hesaplanan OG ile fark
  // Korpusta potansiyel YALNIZ Brewtoad'da, ham OG YALNIZ Brewer's Friend'de → doğrudan sınama yok. DOLAYLI sınama: Brewtoad
  // maltlarından ad→ortanca potansiyel tablosu; ham OG'li Brewer's Friend reçetesinin OG'si bu tabloyla hesaplanıp kıyaslanır.
  const potL = {}; L.forEach(a => a.m.forEach(x => { if (+x[2] > 1 && +x[2] < 1.05) (potL[norm(x[0])] = potL[norm(x[0])] || []).push(+x[2]); }));
  const potMed = {}; Object.keys(potL).forEach(k => { const v = potL[k].sort((p, q) => p - q); potMed[k] = v[Math.floor(v.length / 2)]; });
  const fark = L.filter(a => +a.og > 1).map(a => {
    const m2 = a.m.map(x => [x[0], x[1], (+x[2] > 1) ? +x[2] : potMed[norm(x[0])], x[3]]);
    if (m2.some(x => !(x[2] > 1))) return null;
    const h = ogHesap(Object.assign({}, a, { m: m2 })); return h ? Math.abs(h - +a.og) : null;
  }).filter(x => x != null).sort((x, y) => x - y);
  const yuz = p => fark.length ? fark[Math.min(fark.length - 1, Math.floor(fark.length * p))].toFixed(4) : '—';
  console.log('[OG yöntem sınaması] ham OG’li ' + fark.length + ' adayda |hesap−ham|: ortanca ' + yuz(0.5) + ' · %90 ' + yuz(0.9) + ' · ±0,005 içinde %' + (fark.length ? Math.round(fark.filter(x => x <= 0.005).length / fark.length * 100) : 0));
  const SAPMA = { n: fark.length, ortanca: +yuz(0.5), p90: +yuz(0.9) };
  let hsay = 0; L.forEach(a => { if (!(+a.og > 1)) { const h = ogHesap(a); if (h) { a.og = h; a._ogH = true; hsay++; } } });
  console.log('[OG] ham OG’siz adaylardan hesaplanabilen: ' + hsay);
  const red = {}, R = (st, n) => { (red[st] = red[st] || {})[n] = ((red[st] || {})[n] || 0) + 1; };
  const gecen = {};
  L.forEach(a => { const n = kontrol(a); if (n) return R(a.stil, n); (gecen[a.stil] = gecen[a.stil] || []).push(a); });
  const T = {}, rapor = [];
  KURAL.forEach(([st]) => {
    const var_ = mevcut(st), gerek = Math.max(0, 3 - var_), b = BJCP[st] || {}, mer = b.og ? (b.og[0] + b.og[1]) / 2 : 1.05;
    const G = (gecen[st] || []).map(a => ({ a, puan: (a._ogH ? 0 : 10) + (+a.fg > 0.98 ? 1 : 0) + (+a.ib > 0 ? 1 : 0) + (+a.sr > 0 ? 1 : 0) + (a.y ? 1 : 0) + (b.og && +a.og >= b.og[0] && +a.og <= b.og[1] ? 2 : 0) }))
      .sort((x, y) => (y.puan - x.puan) || (Math.abs(+x.a.og - mer) - Math.abs(+y.a.og - mer)) || (+x.a.id - +y.a.id));
    const sec = [], adSet = new Set(), imzSet = new Set();
    for (const { a } of G) {
      if (sec.length >= gerek) break;
      const adk = norm(a.ad).replace(/[\s\-#(]*(v ?\d+(\.\d+)?|draft ?\d+|\d+(\.\d+)?)\)?$/, '').trim(), imz = a.m.map(x => Math.round(+x[1] * 100)).join(',') + '|' + Math.round(+a.og * 1000);
      if (adSet.has(adk) || imzSet.has(imz)) continue;
      const o = kayit(a), e2 = esles(o.bira, o.et);   // tabloya yazılan (kısaltılmış) ad+etiket ile eşleşme AYNI stile çıkmalı — test de bunu doğrular
      if (!e2 || e2.stil !== st || e2.es !== o.es) { R(st, 'kısaltılmış adla eşleşme değişti'); continue; }
      adSet.add(adk); imzSet.add(imz); sec.push(o);
    }
    if (sec.length) T[st] = sec;
    rapor.push([st, var_, gerek, (L.filter(a => a.stil === st)).length, (gecen[st] || []).length, sec.length]);
  });
  // kapılar
  const metin = JSON.stringify(T).toLocaleLowerCase('tr-TR'); const ih = YASAK.filter(k => metin.includes(k)); if (ih.length) abort('yasak kelime: ' + ih);
  Object.keys(T).forEach(st => { if (T[st].length > 3) abort('stil başına >3: ' + st); if (mevcut(st) + T[st].length > Math.max(3, mevcut(st))) abort('3’ü aşan dolgu: ' + st); });
  const satir = 'window._TOPLULUK_ORNEK = ' + JSON.stringify(T) + ';\nwindow._K4_OGH_SAPMA = ' + JSON.stringify(SAPMA) + ';';
  fs.writeFileSync(OUT, satir);
  let n = 0; Object.values(T).forEach(v => n += v.length);
  console.log('[KABUL] stil=' + Object.keys(T).length + ' K4=' + n + ' (' + (Buffer.byteLength(satir) / 1024).toFixed(1) + ' KB)');
  console.log('stil | mevcut K1-K3 | gereken | kural-eşleşen | bekçiden geçen | eklenen');
  rapor.forEach(r => console.log('  ' + r.join(' | ')));
  console.log('[RED nedenleri]'); Object.keys(red).sort().forEach(st => console.log('  ' + st + ': ' + JSON.stringify(red[st])));
});
