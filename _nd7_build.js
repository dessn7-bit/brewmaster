// ═══ SPRINT ND7 (5) — EŞLEME TABLOSU BUILDER ═══
// Gömülü tablo (_ND7_TABLO, HTML içinde /*ND7_TABLO_BAS*/ … /*ND7_TABLO_SON*/ arası) YALNIZ bu betikle yazılır.
//   node _nd7_build.js            → üret + HTML'e yaz + tests/nd7_esleme.json + tests/nd7k_aday.json
//   node _nd7_build.js --kontrol  → yalnız denetle (gömülü tablo = yeniden üretilen tablo mu); farkta çıkış kodu 1
// Yöntem: uygulama başsız açılır (ağ kapalı, stok YOK — kişisel veri kullanılmaz). Sözlüğün (ND7 öncesi kimlik çözücü) TANIMADIĞI her farklı yazım için
// uygulamanın kendi kuralı (BM_ND7.kuralCoz: okuyucu / renk / sınıf / maya kodu / katalog bekliyor) çalıştırılır; tests/nd7_elle.json kararları bunun ÜSTÜNE yazılır.
// Tablo satırı: yazım → [kod, hedef, kural, ek]. kod: u ürün ('tip:id') · s sınıf · b katalog bekliyor (sınıf + ürün adı) · p proses · a artık.
// Repo PUBLIC: tabloda yalnız örnek verisindeki malzeme YAZIMI (olgu) ve katalog kimliği var; tarif metni yok.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const KOK = __dirname, HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), EF = path.join(KOK, 'tests', 'nd7_elle.json'), OUT = path.join(KOK, 'tests', 'nd7_esleme.json'), ADAY = path.join(KOK, 'tests', 'nd7k_aday.json');
const KONTROL = process.argv.includes('--kontrol'), PORT = 8755, CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const BAS = '/*ND7_TABLO_BAS*/', SON = '/*ND7_TABLO_SON*/';

function sayfada() {
  const N = window.BM_ND7, ac = ['okuyucu', 'sinif', 'maya', 'tablo'];
  ac.forEach(k => { N[k] = false; }); N.uygula(); // sözlüğün tanımadığı yazımlar (ND7 kapalı)
  const H = window._bmOrnekHepsi(), say = {}; // grup|yazım → satır sayısı
  H.forEach(e => { const r = window._bmOrnekKuru(e.kaynak, e.stil, e.idx); if (!r) return;
    const ekle = (g, k) => { if (k.id) return; const a = g + '|' + N.nrm(k.ham); say[a] = (say[a] || 0) + 1; };
    r.g.forEach(k => ekle('malt', k)); r.h.forEach(k => ekle('hop', k)); if (r.y) ekle('maya', r.y); r.ek.forEach(k => ekle('ek', k)); });
  ['okuyucu', 'sinif', 'maya'].forEach(k => { N[k] = true; }); N.uygula(); // kurallar açık, tablo KAPALI (kural çıktısı tablodan bağımsız üretilir)
  const out = []; Object.keys(say).forEach(a => { const g = a.slice(0, a.indexOf('|')), y = a.slice(a.indexOf('|') + 1), z = N.kuralCoz(g, y);
    out.push({ g, y, n: say[a], z: z ? { tip: z.tip || null, id: z.id || null, sinif: z.sinif || null, bekliyor: z.bekliyor || null, proses: !!z.proses, artik: !!z.artik, kural: z.kural, not: z.not || '' } : null }); });
  const kat = {}; [['malt', MALTLAR], ['hop', HOPLAR], ['maya', MAYALAR], ['katki', KATKILAR]].forEach(([t, L]) => { L.forEach(x => { kat[t + ':' + x.id] = x.ad; }); });
  const snf = {}; Object.keys(N.SINIF).forEach(k => { snf[k] = { ad: N.SINIF[k].ad, tip: N.SINIF[k].tip, bekliyor: !!N.SINIF[k].bekliyor, kural: N.SINIF[k].kural || '', uye: N.SINIF[k].uye().map(u => u.join(':')), kaynak: N.SINIF[k].kaynak || null }; });
  ac.forEach(k => { N[k] = true; }); N.uygula();
  return { out, kat, snf, ornek: H.length };
}

async function main() {
  const puppeteer = require('puppeteer');
  const srv = http.createServer((q, r) => { try { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/sw.js') { r.writeHead(404); return r.end(); }
    const p = path.join(KOK, u === '/' ? 'Brewmaster_v2_79_10.html' : u); if (!path.normalize(p).startsWith(path.normalize(KOK)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); r.end(fs.readFileSync(p)); } catch (e) { r.writeHead(500); r.end(); } });
  await new Promise(c => srv.listen(PORT, '127.0.0.1', c));
  const b = await puppeteer.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });
  let R;
  try { const pg = await b.newPage(); await pg.setRequestInterception(true);
    pg.on('request', q => (q.url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort()).catch(() => {})); // dış ağ YASAK
    await pg.goto('http://127.0.0.1:' + PORT + '/Brewmaster_v2_79_10.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForFunction(() => typeof render === 'function' && window.BM_ND7 && window._ndVeriVar && window._ndVeriVar() && !!window._ISKELET_TURETILMIS, { timeout: 60000 });
    R = await pg.evaluate(sayfada);
  } finally { await b.close().catch(() => {}); srv.close(); }

  // elle kararlar
  const E = JSON.parse(fs.readFileSync(EF, 'utf8')), elle = {};
  ['malt', 'hop', 'maya', 'ek'].forEach(g => (E[g] || []).forEach(k => k[3].forEach(y => { const a = g + '|' + y; if (elle[a]) throw new Error('elle kararı iki kez: ' + a); elle[a] = k; })));
  const T = { malt: {}, hop: {}, maya: {}, ek: {} }, denetim = [], aday = {}, kullanilan = {}, say = { u: 0, s: 0, b: 0, p: 0, a: 0, yok: 0 };
  const TUR = { snf_b_hop: 'hop', snf_b_maya: 'maya', snf_b_malt: 'malt', snf_b_ekstrakt: 'ekstrakt', snf_b_seker: 'şeker', snf_b_katki: 'katkı' };
  R.out.sort((a, b) => a.g < b.g ? -1 : a.g > b.g ? 1 : a.y < b.y ? -1 : 1).forEach(x => {
    const e = elle[x.g + '|' + x.y]; let row, gerekce = '';
    if (e) { kullanilan[x.g + '|' + x.y] = 1; gerekce = e[2] || '';
      if (e[0] === 'u') { if (!R.kat[e[1]]) throw new Error('elle: katalogda yok ' + e[1]); row = ['u', e[1], 'elle', gerekce]; }
      else if (e[0] === 's') { if (!R.snf[e[1]]) throw new Error('elle: sınıf yok ' + e[1]); row = ['s', e[1], 'elle', gerekce]; }
      else if (e[0] === 'b') { const p = e[1].split('|'); if (!R.snf[p[0]] || !R.snf[p[0]].bekliyor || !p[1]) throw new Error('elle: bekliyor hedefi ' + e[1]); row = ['b', p[0], 'elle', p[1]]; }
      else if (e[0] === 'a') row = ['a', '', 'elle', gerekce]; else throw new Error('elle: karar ' + e[0]);
    } else if (!x.z) row = null;
    else if (x.z.id) row = ['u', x.z.tip + ':' + x.z.id, x.z.kural, x.z.not];
    else if (x.z.proses) row = ['p', '', x.z.kural, '']; else if (x.z.artik) row = ['a', '', x.z.kural, ''];
    else if (x.z.bekliyor) row = ['b', x.z.sinif, x.z.kural, x.z.bekliyor];
    else if (x.z.sinif) row = ['s', x.z.sinif, x.z.kural, x.z.not];
    if (!row) { say.yok++; denetim.push({ grup: x.g, yazim: x.y, satir: x.n, hedef: null, kural: 'tanınmadı' }); return; }
    T[x.g][x.y] = row; say[row[0]]++;
    denetim.push({ grup: x.g, yazim: x.y, satir: x.n, karar: { u: 'ürün', s: 'sınıf', b: 'katalog_bekliyor', p: 'proses', a: 'artık' }[row[0]], hedef: row[0] === 'u' ? row[1] + ' (' + R.kat[row[1]] + ')' : (row[0] === 's' || row[0] === 'b') ? row[1] + ' (' + R.snf[row[1]].ad + ')' + (row[0] === 'b' ? ': ' + row[3] : '') : '', kural: row[2], not: row[0] === 'b' ? gerekce : row[3] });
    if (row[0] === 'b') { const tur = TUR[row[1]] || 'katkı', a = tur + '|' + row[3]; (aday[a] = aday[a] || { urun: row[3], tur, satir: 0, yazimlar: [] }); aday[a].satir += x.n; aday[a].yazimlar.push(x.y); }
  });
  const fazla = Object.keys(elle).filter(a => !kullanilan[a]);
  const tabloJs = BAS + 'var _ND7_TABLO = ' + JSON.stringify(T) + ';' + SON;
  let h = fs.readFileSync(HF, 'utf8'); const i = h.indexOf(BAS), j = h.indexOf(SON); if (i < 0 || j < i || h.indexOf(BAS, i + 1) >= 0) throw new Error('tablo işareti');
  const eskiBlok = h.slice(i, j + SON.length), ayni = eskiBlok === tabloJs;
  const A = Object.values(aday).sort((a, b) => a.tur < b.tur ? -1 : a.tur > b.tur ? 1 : b.satir - a.satir || (a.urun < b.urun ? -1 : 1)), turSay = {}; A.forEach(a => { turSay[a.tur] = turSay[a.tur] || { urun: 0, satir: 0 }; turSay[a.tur].urun++; turSay[a.tur].satir += a.satir; });
  console.log('[nd7] örnek ' + R.ornek + ' · sözlüğün tanımadığı farklı yazım ' + R.out.length + ' → ürün ' + say.u + ' · sınıf ' + say.s + ' · katalog bekliyor ' + say.b + ' · proses ' + say.p + ' · artık ' + say.a + ' · TANINMAYAN ' + say.yok + ' · elle karar ' + Object.keys(kullanilan).length + (fazla.length ? ' · kullanılmayan elle karar ' + fazla.length + ': ' + fazla.slice(0, 8).join(' ; ') : ''));
  console.log('[nd7] ND7K adayları: ' + Object.keys(turSay).map(t => t + ' ' + turSay[t].urun + ' ürün / ' + turSay[t].satir + ' satır').join(' · ') + ' · gömülü tablo ' + (ayni ? 'GÜNCEL' : 'FARKLI'));
  if (KONTROL) { process.exit(ayni ? 0 : 1); }
  if (!ayni) fs.writeFileSync(HF, h.slice(0, i) + tabloJs + h.slice(j + SON.length));
  const yaz = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1).split(LF).join(CR + LF) + CR + LF);
  yaz(OUT, { aciklama: 'SPRINT ND7 eşleme tablosu denetim dökümü (_nd7_build.js üretir; elle düzenleme tests/nd7_elle.json).', ozet: say, siniflar: R.snf, satirlar: denetim });
  yaz(ADAY, { aciklama: 'ND7K girdisi: örnek verisinde adı geçen ama katalogda olmayan ürünler (ND7\'de "katalog_bekliyor" sınıfına bağlandı). _nd7_build.js üretir.', ozet: turSay, adaylar: A });
  console.log('[nd7] yazıldı: ' + (ayni ? '' : 'HTML tablo · ') + 'tests/nd7_esleme.json · tests/nd7k_aday.json');
}
main().catch(e => { console.error(e); process.exit(1); });
