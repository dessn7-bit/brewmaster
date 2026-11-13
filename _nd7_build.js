// ═══ SPRINT ND7 (5) + ND7B + ND7K — EŞLEME TABLOSU BUILDER ═══
// Gömülü tablolar YALNIZ bu betikle yazılır:
//   _ND7_TABLO  (HTML içinde /*ND7_TABLO_BAS*/ … /*ND7_TABLO_SON*/)   — ND7 tablosu; BM_ND7B + BM_ND7K bayrakları KAPALIYKEN üretilir (v131-544 ile birebir kalır)
//   _ND7B_TABLO (HTML içinde /*ND7B_TABLO_BAS*/ … /*ND7B_TABLO_SON*/) — ND7B katmanı: yalnız ND7 satırından FARKLI olan satırlar (fark işareti, denetim düzeltmeleri, taşınan satırlar);
//                                                                      BM_ND7K KAPALIYKEN üretilir (v131-545 ile birebir kalır) + _ND7B_MAYA_BOL (maya karışımı elle istisnaları)
//   _ND7K_TABLO (HTML içinde /*ND7K_TABLO_BAS*/ … /*ND7K_TABLO_SON*/) — ND7K katmanı: yalnız ND7B satırından FARKLI olan satırlar (ön adım kararları Ö1–Ö5, yeni katalog kaydına bağlanan satırlar: kural 'yeni_kayit')
//   node _nd7_build.js            → üret + HTML'e yaz + tests/nd7_esleme.json + tests/nd7k_aday.json
//   node _nd7_build.js --kontrol  → yalnız denetle (gömülü tablolar = yeniden üretilen tablolar mı); farkta çıkış kodu 1
// Yöntem: uygulama başsız açılır (ağ kapalı, stok YOK — kişisel veri kullanılmaz). Sözlüğün (ND7 öncesi kimlik çözücü) TANIMADIĞI her farklı yazım için
// uygulamanın kendi kuralı (BM_ND7.kuralCoz: okuyucu / renk / sınıf / maya kodu / katalog bekliyor) çalıştırılır; tests/nd7_elle.json kararları bunun ÜSTÜNE yazılır.
// ND7 satırı : yazım → [kod, hedef, kural, ek].                          kod: u ürün ('tip:id') · s sınıf · b katalog bekliyor (sınıf + ürün adı) · p proses · a artık
// ND7B / ND7K satırı: yazım → [kod, hedef, kural, ek, fark, farkNot, ekstra].   ek kod: t = yanlış listeye yazılmış gerçek malzeme (hedef 'hop:id'; ekstra { zaman, alfa })
//   fark: 'marka' | 'koken' | 'renk' | 'bicim' | '' — tarifin adlandırdığı ürün ile bağlanan katalog kaydı aynı üretici + aynı nominal ürün değilse dolu (BM_ND7.farkHesap).
//   Elle kararlar: tests/nd7_elle.json → "nd7b" / "nd7k": { malt / hop / maya / ek: [[kod, hedef, gerekçe, [yazımlar], { fark, farkNot, aday, zaman, alfa }]], mayaKarisim: { yazım: [parçalar] | false } }
//   "nd7k" bölümünde hedefi YENİ katalog kaydı (BM_ND7K.yeniIds) olan 'u' kararının kuralı 'yeni_kayit' olur; kural yolundan yeni kayda çözülen yazım da 'yeni_kayit'.
//   "nd7k".sozluk: [[hedef 'tip:id', gerekçe, [yazımlar]]] — bugün SÖZLÜKTEN (alias) başka kayda bağlanan yazımın yeni katalog kaydına yeniden bağlanması (tabloya 'yeni_kayit' satırı; örnek girişinde sözlükten ÖNCE okunur).
// Repo PUBLIC: tabloda yalnız örnek verisindeki malzeme YAZIMI (olgu) ve katalog kimliği var; tarif metni yok.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const KOK = __dirname, HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), EF = path.join(KOK, 'tests', 'nd7_elle.json'), OUT = path.join(KOK, 'tests', 'nd7_esleme.json'), ADAY = path.join(KOK, 'tests', 'nd7k_aday.json');
const KONTROL = process.argv.includes('--kontrol'), PORT = 8755, CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const BAS = '/*ND7_TABLO_BAS*/', SON = '/*ND7_TABLO_SON*/', BAS7 = '/*ND7B_TABLO_BAS*/', SON7 = '/*ND7B_TABLO_SON*/', BAS9 = '/*ND7K_TABLO_BAS*/', SON9 = '/*ND7K_TABLO_SON*/';

function sayfada() {
  const N = window.BM_ND7, B = window.BM_ND7B, K = window.BM_ND7K, ac = ['okuyucu', 'sinif', 'maya', 'tablo'], bAd = Object.keys(B).filter(k => typeof B[k] === 'boolean'), kAd = Object.keys(K).filter(k => typeof K[k] === 'boolean');
  kAd.forEach(k => { K[k] = false; }); bAd.forEach(k => { B[k] = false; }); K.uygula(); B.uygula(); // ND7 tablosu: ND7B + ND7K kapalı
  ac.forEach(k => { N[k] = false; }); N.uygula(); // sözlüğün tanımadığı yazımlar (ND7 kapalı)
  const H = window._bmOrnekHepsi(), say = {}, mayaHam = {}, soz = {}; // grup|yazım → satır sayısı · soz: sözlükten tanınan yazım → { g, y, tip, id, n }
  H.forEach(e => { const r = window._bmOrnekKuru(e.kaynak, e.stil, e.idx); if (!r) return;
    const ekle = (g, k) => { if (k.id) { const a = g + '|' + N.nrm(k.ham) + '|' + k.tip + ':' + k.id; (soz[a] = soz[a] || { g, y: N.nrm(k.ham), tip: k.tip, id: k.id, n: 0 }).n++; return; } const a = g + '|' + N.nrm(k.ham); say[a] = (say[a] || 0) + 1; };
    r.g.forEach(k => ekle('malt', k)); r.h.forEach(k => ekle('hop', k)); if (r.y) { ekle('maya', r.y); mayaHam[N.nrm(r.y.ham)] = 1; } r.ek.forEach(k => ekle('ek', k)); });
  ['okuyucu', 'sinif', 'maya'].forEach(k => { N[k] = true; }); N.uygula(); // kurallar açık, tablo KAPALI (kural çıktısı tablodan bağımsız üretilir)
  const sade = z => z ? { tip: z.tip || null, id: z.id || null, sinif: z.sinif || null, bekliyor: z.bekliyor || null, proses: !!z.proses, artik: !!z.artik, kural: z.kural, not: z.not || '' } : null;
  const farkli = (x, z) => { const s = sade(z); if (s && z.fark) { s.fark = z.fark; s.farkNot = z.farkNot || ''; if (z.bicim) s.bicim = z.bicim; if (z.farkMarka) s.farkMarka = z.farkMarka; } if (s && s.id) s.urun = N.urunAdi(x.y); return s; };
  const out = []; Object.keys(say).forEach(a => { const g = a.slice(0, a.indexOf('|')), y = a.slice(a.indexOf('|') + 1); out.push({ g, y, n: say[a], z: sade(N.kuralCoz(g, y)) }); });
  // ND7B geçişi: ND7B bayrakları açık (katalog renk yaması + fark hesabı + W34/70), ND7K kapalı, tablo yine kapalı
  bAd.forEach(k => { B[k] = true; }); B.uygula();
  out.forEach(x => { x.z7 = farkli(x, N.kuralCoz(x.g, x.y)); });
  // ND7K geçişi: ND7K bayrakları da açık (Ö1 marka istisnası, yeni katalog kayıtları), tablo yine kapalı
  kAd.forEach(k => { K[k] = true; }); K.uygula();
  out.forEach(x => { x.z9 = farkli(x, N.kuralCoz(x.g, x.y)); });
  const sozL = Object.keys(soz).map(a => soz[a]), sozFark = []; sozL.forEach(q => { if (q.g !== 'malt' || q.tip !== 'malt') return; const f = N.aliasFark ? N.aliasFark(q.y, q.id) : null; if (f) sozFark.push({ y: q.y, id: q.id, n: q.n, farkNot: f.farkNot, urun: N.urunAdi(q.y) }); }); // Ö2: sözlük (alias) yolunda farklı üretici
  const kat = {}; [['malt', MALTLAR], ['hop', HOPLAR], ['maya', MAYALAR], ['katki', KATKILAR]].forEach(([t, L]) => { L.forEach(x => { kat[t + ':' + x.id] = x.ad; }); });
  const snf = {}; Object.keys(N.SINIF).forEach(k => { snf[k] = { ad: N.SINIF[k].ad, tip: N.SINIF[k].tip, bekliyor: !!N.SINIF[k].bekliyor, kural: N.SINIF[k].kural || '', uye: N.SINIF[k].uye().map(u => u.join(':')), kaynak: N.SINIF[k].kaynak || null }; });
  ac.forEach(k => { N[k] = true; }); N.uygula();
  return { out, kat, snf, ornek: H.length, mayaHam: Object.keys(mayaHam), renk: window._BM_ND7B_RENK || [], sozFark, soz: sozL.map(q => ({ g: q.g, y: q.y, hedef: q.tip + ':' + q.id, n: q.n })), yeni: (K.yeniIds ? K.yeniIds() : []) };
}
// elle 'u' kararlarının fark işareti (kural: BM_ND7.farkHesap) — ND7B bayrakları açık; kAcik: ND7K bayrakları açık / kapalı
function farklar(L, kAcik) { const N = window.BM_ND7, K = window.BM_ND7K, kAd = Object.keys(K).filter(k => typeof K[k] === 'boolean'); kAd.forEach(k => { K[k] = !!kAcik; }); K.uygula();
  const r = L.map(x => { const f = N.farkHesap(x.g, x.y, x.tip, x.id); return { fark: f ? f.fark : '', farkNot: f ? f.farkNot || '' : '', bicim: f ? f.bicim || null : null, farkMarka: f ? f.marka || null : null, urun: N.urunAdi(x.y) }; });
  kAd.forEach(k => { K[k] = true; }); K.uygula(); return r; }

async function main() {
  const puppeteer = require('puppeteer');
  const srv = http.createServer((q, r) => { try { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/sw.js') { r.writeHead(404); return r.end(); }
    const p = path.join(KOK, u === '/' ? 'Brewmaster_v2_79_10.html' : u); if (!path.normalize(p).startsWith(path.normalize(KOK)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); r.end(fs.readFileSync(p)); } catch (e) { r.writeHead(500); r.end(); } });
  await new Promise(c => srv.listen(PORT, '127.0.0.1', c));
  const b = await puppeteer.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });
  // elle kararlar
  const E = JSON.parse(fs.readFileSync(EF, 'utf8')), elle = {}, elle7 = {}, elle9 = {}, E7 = E.nd7b || {}, E9 = E.nd7k || {};
  ['malt', 'hop', 'maya', 'ek'].forEach(g => (E[g] || []).forEach(k => k[3].forEach(y => { const a = g + '|' + y; if (elle[a]) throw new Error('elle kararı iki kez: ' + a); elle[a] = k; })));
  ['malt', 'hop', 'maya', 'ek'].forEach(g => (E7[g] || []).forEach(k => k[3].forEach(y => { const a = g + '|' + y; if (elle7[a]) throw new Error('ND7B elle kararı iki kez: ' + a); if (!k[2]) throw new Error('ND7B elle kararı gerekçesiz: ' + a); elle7[a] = k; })));
  ['malt', 'hop', 'maya', 'ek'].forEach(g => (E9[g] || []).forEach(k => k[3].forEach(y => { const a = g + '|' + y; if (elle9[a]) throw new Error('ND7K elle kararı iki kez: ' + a); if (!k[2]) throw new Error('ND7K elle kararı gerekçesiz: ' + a); elle9[a] = k; })));
  let R, F = {}, F9 = {};
  try { const pg = await b.newPage(); await pg.setRequestInterception(true);
    pg.on('request', q => (q.url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort()).catch(() => {})); // dış ağ YASAK
    await pg.goto('http://127.0.0.1:' + PORT + '/Brewmaster_v2_79_10.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForFunction(() => typeof render === 'function' && window.BM_ND7 && window.BM_ND7B && window.BM_ND7K && window._ndVeriVar && window._ndVeriVar() && !!window._ISKELET_TURETILMIS, { timeout: 60000 });
    R = await pg.evaluate(sayfada);
    const L = [], L9 = []; R.out.forEach(x => { const a = x.g + '|' + x.y, e = elle7[a] || elle[a], e9 = elle9[a] || e;
      if (e && e[0] === 'u') { const p = e[1].split(':'); L.push({ a, g: x.g, y: x.y, tip: p[0], id: p[1] }); }
      if (e9 && e9[0] === 'u') { const p = e9[1].split(':'); L9.push({ a, g: x.g, y: x.y, tip: p[0], id: p[1] }); } });
    const fr = await pg.evaluate(farklar, L, false); L.forEach((x, i) => { F[x.a] = fr[i]; });
    const fr9 = await pg.evaluate(farklar, L9, true); L9.forEach((x, i) => { F9[x.a] = fr9[i]; });
  } finally { await b.close().catch(() => {}); srv.close(); }

  const bos = () => ({ malt: {}, hop: {}, maya: {}, ek: {} });
  const T = bos(), T7 = bos(), T9 = bos(), denetim = [], aday = {}, kullanilan = {}, kullanilan7 = {}, kullanilan9 = {}, say = { u: 0, s: 0, b: 0, p: 0, a: 0, yok: 0 }, say7 = { u: 0, s: 0, b: 0, p: 0, a: 0, t: 0, yok: 0 }, say9 = { u: 0, s: 0, b: 0, p: 0, a: 0, t: 0, yok: 0 }, farkSay = { marka: 0, koken: 0, renk: 0, bicim: 0 }, farkSatir = { marka: 0, koken: 0, renk: 0, bicim: 0 };
  const TUR = { snf_b_hop: 'hop', snf_b_maya: 'maya', snf_b_malt: 'malt', snf_b_ekstrakt: 'ekstrakt', snf_b_seker: 'şeker', snf_b_katki: 'katkı' };
  const YENI = {}; (R.yeni || []).forEach(k => { YENI[k] = 1; }); let yeniSatir = 0, yeniYazim = 0; const yeniBag = {}; // yeni kayıt → { yazim, satir, farkKalkan }
  const elleSatir = (e, ad) => { // ND7 biçimi (4 öğe)
    const gerekce = e[2] || '';
    if (e[0] === 'u') { if (!R.kat[e[1]]) throw new Error(ad + ': katalogda yok ' + e[1]); return ['u', e[1], 'elle', gerekce]; }
    if (e[0] === 's') { if (!R.snf[e[1]]) throw new Error(ad + ': sınıf yok ' + e[1]); return ['s', e[1], 'elle', gerekce]; }
    if (e[0] === 'b') { const p = e[1].split('|'); if (!R.snf[p[0]] || !R.snf[p[0]].bekliyor || !p[1]) throw new Error(ad + ': bekliyor hedefi ' + e[1]); return ['b', p[0], 'elle', p[1]]; }
    if (e[0] === 'a') return ['a', '', 'elle', gerekce];
    if (e[0] === 't') { if (!R.kat[e[1]]) throw new Error(ad + ': katalogda yok ' + e[1]); return ['t', e[1], 'elle', gerekce]; }
    throw new Error(ad + ': karar ' + e[0]);
  };
  const kuralSatir = z => !z ? null : z.id ? ['u', z.tip + ':' + z.id, z.kural, z.not] : z.proses ? ['p', '', z.kural, ''] : z.artik ? ['a', '', z.kural, ''] : z.bekliyor ? ['b', z.sinif, z.kural, z.bekliyor] : z.sinif ? ['s', z.sinif, z.kural, z.not] : null;
  const kirp = r => { r = r.slice(0); while (r.length > 4 && (r[r.length - 1] === '' || r[r.length - 1] == null)) r.pop(); return r; };
  const KARAR = { u: 'ürün', s: 'sınıf', b: 'katalog_bekliyor', p: 'proses', a: 'artık', t: 'taşındı' };
  // elle kararından ND7B / ND7K biçimli satır (fark: seçenek > hesap)
  const elle7Satir = (ek, ad, f, kural) => { const o = (ek && ek[4]) || {}, gerekce = ek[2]; let r = elleSatir(ek, ad);
    if (ek[0] === 'u') { const fk = o.fark !== undefined ? o.fark : f.fark; r = ['u', ek[1], kural || 'elle', gerekce, fk || '', fk ? (o.farkNot || f.farkNot || '') : '', (fk === 'bicim' && (o.bicim || f.bicim)) ? { bicim: o.bicim || f.bicim } : '']; }
    if (ek[0] === 't') r = ['t', ek[1], 'elle', gerekce, '', '', { zaman: o.zaman || null, alfa: o.alfa || null }];
    return r; };
  R.out.sort((a, b) => a.g < b.g ? -1 : a.g > b.g ? 1 : a.y < b.y ? -1 : 1).forEach(x => {
    const a = x.g + '|' + x.y, e = elle[a], e7 = elle7[a], e9 = elle9[a]; let row, row7, row9, gerekce = '';
    // ── ND7 satırı (değişmez) ──
    if (e) { kullanilan[a] = 1; gerekce = e[2] || ''; if (e[0] === 't') throw new Error('elle: t kararı yalnız nd7b / nd7k bölümünde'); row = elleSatir(e, 'elle'); }
    else row = kuralSatir(x.z);
    if (row) { T[x.g][x.y] = row; say[row[0]]++; } else say.yok++;
    // ── ND7B satırı (BM_ND7K kapalı) ──
    if (e7) { kullanilan7[a] = 1; gerekce = e7[2]; row7 = elle7Satir(e7, 'nd7b elle', F[a] || {}); }
    else if (e) { row7 = row.slice(0); if (e[0] === 'u') { const f = F[a] || {}; if (f.fark) row7 = ['u', e[1], 'elle', gerekce, f.fark, f.farkNot, f.bicim ? { bicim: f.bicim } : '']; } }
    else { row7 = kuralSatir(x.z7); if (row7 && x.z7.id && x.z7.fark) row7 = row7.concat([x.z7.fark, x.z7.farkNot || '', x.z7.bicim ? { bicim: x.z7.bicim } : '']); }
    if (row7) { row7 = kirp(row7); say7[row7[0]]++; if (JSON.stringify(row7) !== JSON.stringify(row || null)) T7[x.g][x.y] = row7; } else say7.yok++;
    // ── ND7K satırı (BM_ND7K açık) ──
    let f9 = F9[a] || {}, o9 = {};
    if (e9) { kullanilan9[a] = 1; gerekce = e9[2]; o9 = e9[4] || {}; row9 = elle7Satir(e9, 'nd7k elle', f9, (e9[0] === 'u' && YENI[e9[1]]) ? 'yeni_kayit' : 'elle'); }
    else if (e7) { o9 = e7[4] || {}; row9 = elle7Satir(e7, 'nd7b elle', f9); }
    else if (e) { row9 = row.slice(0); if (e[0] === 'u' && f9.fark) row9 = ['u', e[1], 'elle', gerekce, f9.fark, f9.farkNot, f9.bicim ? { bicim: f9.bicim } : '']; }
    else { row9 = kuralSatir(x.z9); f9 = x.z9 || {}; if (row9 && x.z9.id && YENI[row9[1]]) row9[2] = 'yeni_kayit'; if (row9 && x.z9.id && x.z9.fark) row9 = row9.concat([x.z9.fark, x.z9.farkNot || '', x.z9.bicim ? { bicim: x.z9.bicim } : '']); }
    if (!row9) { say9.yok++; denetim.push({ grup: x.g, yazim: x.y, satir: x.n, hedef: null, kural: 'tanınmadı' }); return; }
    row9 = kirp(row9); say9[row9[0]]++;
    if (JSON.stringify(row9) !== JSON.stringify(row7 || null)) T9[x.g][x.y] = row9;
    if (row9[2] === 'yeni_kayit') { yeniYazim++; yeniSatir += x.n; const yb = yeniBag[row9[1]] = yeniBag[row9[1]] || { yazim: 0, satir: 0, farkKalkan: 0, bekliyordan: 0 }; yb.yazim++; yb.satir += x.n; if (row7 && row7[0] === 'u' && row7[4] && !row9[4]) yb.farkKalkan += x.n; if (row7 && row7[0] === 'b') yb.bekliyordan += x.n; }
    const fark = row9[0] === 'u' ? (row9[4] || '') : ''; if (fark) { farkSay[fark]++; farkSatir[fark] += x.n; }
    const d = { grup: x.g, yazim: x.y, satir: x.n, karar: KARAR[row9[0]], hedef: (row9[0] === 'u' || row9[0] === 't') ? row9[1] + ' (' + R.kat[row9[1]] + ')' : (row9[0] === 's' || row9[0] === 'b') ? row9[1] + ' (' + R.snf[row9[1]].ad + ')' + (row9[0] === 'b' ? ': ' + row9[3] : '') : '', kural: row9[2], not: row9[0] === 'b' ? gerekce : row9[3] };
    if (fark) { d.fark = fark; d.farkNot = row9[5] || ''; } if (row9[0] === 't') d.ekstra = row9[6];
    if (T7[x.g][x.y] || T9[x.g][x.y]) d.nd7b = true; // ND7 satırından farklı (ND7B / ND7K katmanında)
    if (T9[x.g][x.y]) { d.nd7k = true; d.onceki = row7 ? (row7[0] === 'u' ? row7[1] + (row7[4] ? ' (fark ' + row7[4] + ')' : '') : KARAR[row7[0]] + (row7[0] === 'b' ? ': ' + row7[3] : '')) : null; } // ND7B satırından farklı (ND7K katmanında)
    denetim.push(d);
    if (row9[0] === 'b') { const tur = TUR[row9[1]] || 'katkı', k = tur + '|' + row9[3]; (aday[k] = aday[k] || { urun: row9[3], tur, satir: 0, yazimlar: [] }); aday[k].satir += x.n; aday[k].yazimlar.push(x.y); }
    // ND7B (a): marka ürünü katalogda yok → satır geçici olarak aynı türden kayda bağlı (fark dolu); ürün aday listesine de girer. ND7K ürünü ekleyince satır yeniden bağlanır.
    if (row9[0] === 'u' && fark && /^malt:/.test(row9[1])) { const marka = f9.farkMarka, ad = o9.aday || ((marka && marka.length) ? f9.urun : null);
      if (ad) { const k = 'malt|' + ad; (aday[k] = aday[k] || { urun: ad, tur: 'malt', satir: 0, yazimlar: [], gecici: row9[1] }); aday[k].satir += x.n; aday[k].yazimlar.push(x.y); if (!aday[k].gecici) aday[k].gecici = row9[1]; d.aday = ad; } }
  });
  // ND7K sözlük yeniden bağlama: bugün sözlükten (alias) başka kayda bağlanan yazım → yeni katalog kaydı (tabloya 'yeni_kayit'; örnek girişinde sözlükten önce okunur)
  const sozIdx = {}; (R.soz || []).forEach(q => { (sozIdx[q.g + '|' + q.y] = sozIdx[q.g + '|' + q.y] || []).push(q); });
  const sozYeni = {}, sozKullan = [], sozDok = []; /* sözlük yeniden bağlamaları dökümde AYRI listede (satirlar = sözlüğün tanımadığı yazımlar) */ (E9.sozluk || []).forEach(k => { const hedef = k[0], gerekce = k[1]; if (!gerekce) throw new Error('ND7K sözlük kararı gerekçesiz: ' + hedef); if (!YENI[hedef]) throw new Error('ND7K sözlük kararı: hedef yeni katalog kaydı değil ' + hedef);
    const tip = hedef.split(':')[0], g = tip; (k[2] || []).forEach(y => { const q = sozIdx[g + '|' + y]; if (!q) { sozKullan.push(g + '|' + y); return; } if (T9[g][y] || T7[g][y] || T[g][y]) throw new Error('ND7K sözlük kararı: yazım zaten tabloda ' + y);
      const n = q.reduce((s, z) => s + z.n, 0); T9[g][y] = ['u', hedef, 'yeni_kayit', gerekce]; sozYeni[g + '|' + y] = hedef; yeniYazim++; yeniSatir += n;
      const yb = yeniBag[hedef] = yeniBag[hedef] || { yazim: 0, satir: 0, farkKalkan: 0, bekliyordan: 0 }; yb.yazim++; yb.satir += n; yb.sozlukten = (yb.sozlukten || 0) + n;
      sozDok.push({ grup: g, yazim: y, satir: n, karar: 'ürün', hedef: hedef + ' (' + R.kat[hedef] + ')', kural: 'yeni_kayit', not: gerekce, nd7b: true, nd7k: true, onceki: q.map(z => z.hedef).join(' / ') + ' (sözlük)' }); }); });
  // ND7K Ö2: sözlükten (alias) tanınan, kaydın üreticisinden farklı üretici adı taşıyan malt yazımları — fark 'marka' (çalışma anında N.aliasFark); ürün aday listesine "gecici" + "sozluk" işaretiyle girer
  const sozFark = (R.sozFark || []).filter(q => !sozYeni['malt|' + q.y]).sort((p, q) => q.n - p.n || (p.y < q.y ? -1 : 1)); let sozSatir = 0;
  sozFark.forEach(q => { sozSatir += q.n; const k = 'malt|' + q.urun; (aday[k] = aday[k] || { urun: q.urun, tur: 'malt', satir: 0, yazimlar: [], gecici: 'malt:' + q.id }); aday[k].satir += q.n; aday[k].yazimlar.push(q.y); if (!aday[k].gecici) aday[k].gecici = 'malt:' + q.id; aday[k].sozluk = true; });
  const fazla = Object.keys(elle).filter(a => !kullanilan[a]), fazla7 = Object.keys(elle7).filter(a => !kullanilan7[a]), fazla9 = Object.keys(elle9).filter(a => !kullanilan9[a]).concat(sozKullan);
  const MB = {}, mb = E7.mayaKarisim || {}, mbFazla = []; Object.keys(mb).forEach(k => { if (R.mayaHam.indexOf(k) < 0) mbFazla.push(k); MB[k] = mb[k]; });
  const tabloJs = BAS + 'var _ND7_TABLO = ' + JSON.stringify(T) + ';' + SON, tablo7Js = BAS7 + 'var _ND7B_TABLO = ' + JSON.stringify(T7) + ', _ND7B_MAYA_BOL = ' + JSON.stringify(MB) + ';' + SON7, tablo9Js = BAS9 + 'var _ND7K_TABLO = ' + JSON.stringify(T9) + ';' + SON9;
  let h = fs.readFileSync(HF, 'utf8'); const i = h.indexOf(BAS), j = h.indexOf(SON), i7 = h.indexOf(BAS7), j7 = h.indexOf(SON7), i9 = h.indexOf(BAS9), j9 = h.indexOf(SON9);
  if (i < 0 || j < i || h.indexOf(BAS, i + 1) >= 0 || i7 < 0 || j7 < i7 || h.indexOf(BAS7, i7 + 1) >= 0 || i9 < 0 || j9 < i9 || h.indexOf(BAS9, i9 + 1) >= 0) throw new Error('tablo işareti');
  const ayni = h.slice(i, j + SON.length) === tabloJs, ayni7 = h.slice(i7, j7 + SON7.length) === tablo7Js, ayni9 = h.slice(i9, j9 + SON9.length) === tablo9Js;
  const A = Object.values(aday).sort((a, b) => a.tur < b.tur ? -1 : a.tur > b.tur ? 1 : b.satir - a.satir || (a.urun < b.urun ? -1 : 1)), turSay = {}; A.forEach(a => { turSay[a.tur] = turSay[a.tur] || { urun: 0, satir: 0 }; turSay[a.tur].urun++; turSay[a.tur].satir += a.satir; });
  // tutarlılık: aynı ürün adı hem "geçici bağlı (fark)" hem "bekliyor" yolunda mı (ND7B (a): aynı ürünün tüm yazımları AYNI yoldan gider)
  const anah = s => String(s).toLowerCase().replace(/\btwo[- ]row\b/g, '2-row').replace(/\b2 row\b/g, '2-row').replace(/\bmalts?\b|(?<!black |roast |roasted )\bbarley\b|\bbrewer'?s\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(), yol = {};
  A.filter(a => a.tur === 'malt').forEach(a => { const k = anah(a.urun); (yol[k] = yol[k] || []).push((a.gecici ? 'geçici ' + a.gecici : 'bekliyor') + ' ← ' + a.urun); });
  const tutarsiz = Object.keys(yol).filter(k => yol[k].some(v => /^geçici/.test(v)) && yol[k].some(v => /^bekliyor/.test(v)));
  const n7 = Object.keys(T7).reduce((s, g) => s + Object.keys(T7[g]).length, 0), n9 = Object.keys(T9).reduce((s, g) => s + Object.keys(T9[g]).length, 0);
  console.log('[nd7] örnek ' + R.ornek + ' · sözlüğün tanımadığı farklı yazım ' + R.out.length + ' → ürün ' + say.u + ' · sınıf ' + say.s + ' · katalog bekliyor ' + say.b + ' · proses ' + say.p + ' · artık ' + say.a + ' · TANINMAYAN ' + say.yok + ' · elle karar ' + Object.keys(kullanilan).length + (fazla.length ? ' · kullanılmayan elle karar ' + fazla.length + ': ' + fazla.slice(0, 8).join(' ; ') : ''));
  console.log('[nd7b] ürün ' + say7.u + ' · sınıf ' + say7.s + ' · katalog bekliyor ' + say7.b + ' · proses ' + say7.p + ' · artık ' + say7.a + ' · taşınan ' + say7.t + ' · TANINMAYAN ' + say7.yok + ' · ND7B katmanı ' + n7 + ' satır · ND7B elle ' + Object.keys(kullanilan7).length + (fazla7.length ? ' · KULLANILMAYAN ND7B elle ' + fazla7.length + ': ' + fazla7.slice(0, 8).join(' ; ') : '') + (mbFazla.length ? ' · KULLANILMAYAN maya karışımı anahtarı: ' + mbFazla.join(' ; ') : ''));
  console.log('[nd7k] ürün ' + say9.u + ' · sınıf ' + say9.s + ' · katalog bekliyor ' + say9.b + ' · proses ' + say9.p + ' · artık ' + say9.a + ' · taşınan ' + say9.t + ' · TANINMAYAN ' + say9.yok + ' · ND7K katmanı ' + n9 + ' satır · ND7K elle ' + Object.keys(kullanilan9).length + ' · yeni kayda bağlı ' + yeniYazim + ' yazım / ' + yeniSatir + ' satır · yeni katalog kaydı ' + Object.keys(YENI).length + (fazla9.length ? ' · KULLANILMAYAN ND7K elle ' + fazla9.length + ': ' + fazla9.slice(0, 8).join(' ; ') : ''));
  console.log('[nd7k] fark (yazım / satır): marka ' + farkSay.marka + ' / ' + farkSatir.marka + ' · köken ' + farkSay.koken + ' / ' + farkSatir.koken + ' · renk ' + farkSay.renk + ' / ' + farkSatir.renk + ' · biçim ' + farkSay.bicim + ' / ' + farkSatir.bicim + ' · sözlük yolunda marka (Ö2) ' + sozFark.length + ' / ' + sozSatir + (tutarsiz.length ? ' · TUTARSIZ YOL ' + tutarsiz.length + ': ' + tutarsiz.map(k => yol[k].join(' | ')).join(' ;; ') : ' · tutarsız yol 0'));
  console.log('[nd7] ND7K adayları: ' + Object.keys(turSay).map(t => t + ' ' + turSay[t].urun + ' ürün / ' + turSay[t].satir + ' satır').join(' · ') + ' · gömülü tablo ' + (ayni ? 'GÜNCEL' : 'FARKLI') + ' · ND7B tablosu ' + (ayni7 ? 'GÜNCEL' : 'FARKLI') + ' · ND7K tablosu ' + (ayni9 ? 'GÜNCEL' : 'FARKLI'));
  if (KONTROL) { process.exit(ayni && ayni7 && ayni9 && !fazla7.length && !fazla9.length && !mbFazla.length ? 0 : 1); }
  if (!ayni) h = h.slice(0, i) + tabloJs + h.slice(j + SON.length);
  if (!ayni7) { const a7 = h.indexOf(BAS7), b7 = h.indexOf(SON7); h = h.slice(0, a7) + tablo7Js + h.slice(b7 + SON7.length); }
  if (!ayni9) { const a9 = h.indexOf(BAS9), b9 = h.indexOf(SON9); h = h.slice(0, a9) + tablo9Js + h.slice(b9 + SON9.length); }
  if (!ayni || !ayni7 || !ayni9) fs.writeFileSync(HF, h);
  const yaz = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1).split(LF).join(CR + LF) + CR + LF);
  yaz(OUT, { aciklama: 'SPRINT ND7 + ND7B + ND7K eşleme tablosu denetim dökümü (_nd7_build.js üretir; elle düzenleme tests/nd7_elle.json). Satırlar ND7B + ND7K bayrakları AÇIK hâli gösterir; "nd7b": true = ND7 (v131-544) satırından farklı; "nd7k": true = ND7B (v131-545) satırından farklı ("onceki" = ND7B hedefi).', ozet: say9, ozetNd7b: say7, ozetNd7: say, fark: { yazim: farkSay, satir: farkSatir, sozluk: { yazim: sozFark.length, satir: sozSatir } }, yeniKayit: { yazim: yeniYazim, satir: yeniSatir, urun: yeniBag }, katalogRenk: R.renk, mayaKarisimElle: MB, siniflar: R.snf, satirlar: denetim,
    sozlukYeniden: sozDok, sozlukFark: sozFark.map(q => ({ yazim: q.y, satir: q.n, hedef: 'malt:' + q.id + ' (' + R.kat['malt:' + q.id] + ')', fark: 'marka', farkNot: q.farkNot, aday: q.urun })) });
  yaz(ADAY, { aciklama: 'ND7K girdisi: örnek verisinde adı geçen ama katalogda olmayan ürünler. "gecici" alanı dolu olanlar ND7B (a) gereği geçici olarak aynı türden katalog kaydına fark işaretiyle bağlı (ürün eklenince yeniden bağlanır); "sozluk": true = satır sözlük (alias) yolundan tanınıyor (ND7K Ö2); öbürleri "katalog_bekliyor". _nd7_build.js üretir.', ozet: turSay, adaylar: A });
  console.log('[nd7] yazıldı: ' + (ayni ? '' : 'HTML tablo · ') + (ayni7 ? '' : 'HTML ND7B tablosu · ') + (ayni9 ? '' : 'HTML ND7K tablosu · ') + 'tests/nd7_esleme.json · tests/nd7k_aday.json');
}
main().catch(e => { console.error(e); process.exit(1); });
