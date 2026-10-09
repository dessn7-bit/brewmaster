// ═══ SPRINT ISK1 — İSKELET BUILDER ═══
// iskelet_veri.js YALNIZ bu betikle yazılır. Uygulama başsız açılır; türetme uygulamanın kendi fonksiyonlarıyla (_bmIskTuret →
// _bmOrnekKuru / _bmKatCoz / _bmMaltSinif …) yapılır — ayrı eşleme tablosu yok. _cc_veri_yaz.js ornek_veri.js'i her yazdığında bunu çağırır.
//   node _isk_build.js            → türet + yaz + HTML/sw.js'teki ?v adresini eşitle
//   node _isk_build.js --kontrol  → yalnız denetle (kaynak özeti + ?v); uyuşmazlıkta çıkış kodu 1
// Seçim (elle yazılmış STIL_ISKELET'i olan stiller): her örnek için iskelet o örnek OLMADAN türetilir (birini-dışarıda-bırak), örneğin
// hacmine / OG / IBU'suna kurulur; ölçü = medyan rol kapsaması (Jaccard) − medyan |SRM hatası| / BJCP SRM bant genişliği. Elle iskelet
// aynı örneklerle aynı ölçüyle. Türetilmiş ≥ elle → türetilmiş; ölçülebilen örnek < 3 → elle kalır (yetersiz kanıt).
// Ödünç: türetilmiş iskeleti olmayan stil, STYLE_FAMILIES.json'da aynı ailedeki (SLUG_TO_BJCP üzerinden) BJCP hedef uzaklığı en küçük
// türetilmiş stilden ödünç alır. Repo PUBLIC: dosyada yalnız sayı + katalog id + örnek referansı (kaynak:idx) var, tarif metni yok.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const KOK = __dirname, HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), SF = path.join(KOK, 'sw.js'), VF = path.join(KOK, 'iskelet_veri.js'), OF = path.join(KOK, 'ornek_veri.js');
const TAG = /<script src="iskelet_veri\.js\?v=([0-9a-f]+)"><\/script>/g, SWU = /'\.\/iskelet_veri\.js\?v=([0-9a-f]+)'/g;
const ozet = t => crypto.createHash('sha256').update(t).digest('hex').slice(0, 10);
const ornekV = () => ozet(fs.readFileSync(OF, 'utf8').replace(/\r\n/g, '\n'));
function adresEsitle(veri) {
  const v = ozet(veri); let html = fs.readFileSync(HF, 'utf8'), sw = fs.readFileSync(SF, 'utf8');
  const t = [...html.matchAll(TAG)], u = [...sw.matchAll(SWU)];
  if (t.length > 1 || u.length > 1) throw new Error('iskelet_veri.js adresi birden çok kez var');
  if (!t.length) { const a = html.indexOf('<script src="ornek_veri.js?v='), e = html.indexOf('</script>', a) + 9; if (a < 0) throw new Error('ornek_veri etiketi yok'); html = html.slice(0, e) + '\n<script src="iskelet_veri.js?v=' + v + '"></script>' + html.slice(e); }
  else html = html.replace(TAG, () => '<script src="iskelet_veri.js?v=' + v + '"></script>');
  if (!u.length) { const a = sw.indexOf("'./ornek_veri.js?v="), e = sw.indexOf('\n', a); if (a < 0) throw new Error('sw.js ornek_veri satırı yok'); sw = sw.slice(0, e + 1) + "  './iskelet_veri.js?v=" + v + "',   // SPRINT ISK1: türetilmiş iskelet — HTML'deki <script src> ile BİREBİR aynı URL (test kilitli)\n" + sw.slice(e + 1); }
  else sw = sw.replace(SWU, () => "'./iskelet_veri.js?v=" + v + "'");
  const eskiH = fs.readFileSync(HF, 'utf8'), eskiS = fs.readFileSync(SF, 'utf8');
  if (html !== eskiH) fs.writeFileSync(HF, html); if (sw !== eskiS) fs.writeFileSync(SF, sw);
  return v;
}
// sayfada çalışır (puppeteer evaluate)
function sayfada() {
  const T = {}, K = {}, st = Object.keys(BJCP);
  // TUTARLILIK KAPISI (V-ISKELET-GATE ile aynı): 11 L / %61 kurulum → calc() OG / IBU / SRM BJCP bandında (koyu stil srm üst ≥30 serbest)
  const kapi = (s, isk) => { const bj = BJCP[s], r = window._stilIskeletHesap(s, 11, 61, null, isk); if (!r || !r.malts.length) return ['hesap yok'];
    yeniTarif(); S.hacim = 11; S.verim = 61; S.maltlar = r.malts; S.hoplar = r.hops; S.mayaId = r.mayaId; S.katkilar = r.katkilar || []; S.maya2Id = ''; S.ogManuel = null; S.fgManuel = null;
    const c = calc(), srm = c.srm != null ? +c.srm : hSRM(S.maltlar, S.katkilar, 11), f = [];
    if (!(c.og >= bj.og[0] && c.og <= bj.og[1])) f.push('OG ' + c.og.toFixed(3)); if (!(c.ibu >= bj.ibu[0] && c.ibu <= bj.ibu[1])) f.push('IBU ' + Math.round(c.ibu));
    if (!(srm >= bj.srm[0] && (bj.srm[1] >= 30 || srm <= bj.srm[1]))) f.push('SRM ' + (Math.round(srm * 10) / 10)); return f; };
  st.forEach(s => { const d = window._bmIskTuret(s, { kuru:K }); if (d && d.grist.length){ d.kapi = kapi(s, d); T[s] = d; } });
  const kiyas = {};
  Object.keys(STIL_ISKELET).forEach(s => {
    const d = T[s], B = BJCP[s]; if (!d || !B) return; const bw = Math.max(1, B.srm[1] - B.srm[0]);
    const md = [], me = [];
    window._bmOrnekListe(s).forEach(x => { const key = x.kaynak + ':' + x.idx, o = window._bmOrnekNesne(x.kaynak, s, x.idx); if (!o || !(+o.og > 1)) return;
      const dl = window._bmIskTuret(s, { haric:key, kuru:K }); if (!dl || !dl.grist.length) return;
      const a = window._bmIskOlc(s, dl, x.kaynak, x.idx), b = window._bmIskOlc(s, STIL_ISKELET[s], x.kaynak, x.idx); if (a && b) { md.push(a); me.push(b); } });
    const med = (L, f) => { const v = L.map(f).filter(x => x != null && isFinite(x)).sort((p, q) => p - q); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
    const ol = L => { const h = med(L, z => z.hata), j = med(L, z => z.jac); return { srm:h == null ? null : Math.round(h * 10) / 10, jac:j == null ? null : Math.round(j * 1000) / 1000, skor:(j == null ? 0 : j) - (h == null ? 0 : h / bw) }; };
    const A = ol(md), E = ol(me), n = md.length;
    const kp = d.kapi.length === 0, iy = A.skor >= E.skor - 1e-9, ek = kapi(s, STIL_ISKELET[s]), ekp = ek.length === 0;
    // VERI1: kapı önce — yalnız biri tutarlılık kapısından geçiyorsa (doğru BJCP bandıyla) o seçilir; ikisi de geçiyor / geçmiyorsa ölçü kuralı
    let secim, neden;
    if (n >= 3 && kp && !ekp) { secim = 'turetilmis'; neden = 'elle iskelet tutarlılık kapısından geçmiyor (' + ek.join(', ') + '), türetilmiş geçiyor'; }
    else if (!kp && ekp) { secim = 'elle'; neden = 'türetilmiş tutarlılık kapısından geçmedi (' + d.kapi.join(', ') + ')'; }
    else { secim = (n >= 3 && iy) ? 'turetilmis' : 'elle'; neden = n < 3 ? 'ölçülebilen örnek < 3' : !iy ? 'elle ölçüde daha iyi' : 'türetilmiş ölçüde daha iyi ya da eşit'; if (!kp && !ekp) neden += ' · ikisi de kapı dışı (türetilmiş ' + d.kapi.join(', ') + ' / elle ' + ek.join(', ') + ')'; }
    kiyas[s] = { n:n, d:{ srm:A.srm, jac:A.jac }, e:{ srm:E.srm, jac:E.jac }, ekapi:ek, secim:secim, neden:neden };
  });
  const orta = {}; st.forEach(s => { const B = BJCP[s]; orta[s] = { og:B.og, ibu:B.ibu, srm:B.srm }; });
  return { T, kiyas, orta, slug:window.SLUG_TO_BJCP || {}, elle:Object.keys(STIL_ISKELET) };
}
async function turet() {
  const puppeteer = require('puppeteer');
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/sw.js' || u === '/iskelet_veri.js') { r.writeHead(404); r.end(); return; } // türetme önceki çıktıdan BAĞIMSIZ
    const f = path.join(KOK, u); if (!f.startsWith(KOK) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' }); r.end(fs.readFileSync(f)); });
  await new Promise(c => srv.listen(0, '127.0.0.1', c));
  const br = await puppeteer.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });
  try {
    const pg = await br.newPage(); pg.on('pageerror', e => console.error('[sayfa hatası]', e.message));
    await pg.goto('http://127.0.0.1:' + srv.address().port + '/Brewmaster_v2_79_10.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForFunction(() => typeof window._bmIskTuret === 'function' && !!window._NHC_MADALYA && typeof STIL_ISKELET !== 'undefined', { timeout: 60000 });
    return await pg.evaluate(sayfada);
  } finally { await br.close(); srv.close(); }
}
function odunc(R) {
  const F = JSON.parse(fs.readFileSync(path.join(KOK, 'STYLE_FAMILIES.json'), 'utf8')).familyMap, aile = {};
  // BJCP adı → aile: (1) SLUG_TO_BJCP (canlı motorun eşlemesi) (2) STYLE_DEFINITIONS'ta adı/displayTR/bjcpName birebir aynı slug
  // (3) SUBSTYLE_VARIANTS'ta displayTR birebir aynı alt-stilin parentSlug'ı. Aile her durumda STYLE_FAMILIES.json familyMap'ten.
  Object.keys(R.slug).sort().forEach(sl => { const b = R.slug[sl]; if (b && F[sl] && !aile[b]) aile[b] = F[sl]; });
  const D = JSON.parse(fs.readFileSync(path.join(KOK, 'STYLE_DEFINITIONS.json'), 'utf8')), DS = D.styles || D;
  Object.keys(DS).sort().forEach(sl => { const o = DS[sl] || {}; [o.displayTR, o.name, o.bjcpName].forEach(n => { if (n && R.orta[n] && F[sl] && !aile[n]) aile[n] = F[sl]; }); });
  const SV = JSON.parse(fs.readFileSync(path.join(KOK, 'SUBSTYLE_VARIANTS.json'), 'utf8'));
  Object.keys(SV).sort().forEach(k => { const n = SV[k] && SV[k].displayTR, p = SV[k] && SV[k].parentSlug; if (n && R.orta[n] && p && F[p] && !aile[n]) aile[n] = F[p]; });
  const out = {}, uz = (a, b) => ['og', 'ibu', 'srm'].reduce((t, k) => { const A = R.orta[a][k], B = R.orta[b][k]; if (!A || !B) return t; const w = Math.max(1e-6, A[1] - A[0]); return t + Math.abs((A[0] + A[1]) / 2 - (B[0] + B[1]) / 2) / w; }, 0);
  Object.keys(R.orta).sort().forEach(s => {
    if (R.T[s] || R.elle.indexOf(s) >= 0 || !aile[s]) return;
    const ad = Object.keys(R.T).filter(k => R.T[k].durum === 'turetilmis' && aile[k] === aile[s]).sort();
    if (!ad.length) return; let b = ad[0]; ad.forEach(k => { if (uz(s, k) < uz(s, b) - 1e-12) b = k; });
    out[s] = { durum:'odunc', kaynakStil:b, aile:aile[s], mesafe:Math.round(uz(s, b) * 100) / 100 };
  });
  return { out, aileSay:Object.keys(aile).length };
}
async function main() {
  if (process.argv.includes('--kontrol')) {
    const v = fs.readFileSync(VF, 'utf8'), m = /"ornekV":"([0-9a-f]+)"/.exec(v), h = fs.readFileSync(HF, 'utf8'), s = fs.readFileSync(SF, 'utf8'), q = ozet(v);
    const ok = m && m[1] === ornekV() && h.indexOf('iskelet_veri.js?v=' + q + '"') >= 0 && s.indexOf("iskelet_veri.js?v=" + q + "'") >= 0;
    console.log((ok ? 'TAMAM' : 'UYUŞMAZLIK') + ' · ornek_veri ' + ornekV() + ' · iskelette ' + (m ? m[1] : '?') + ' · ?v ' + q); process.exit(ok ? 0 : 1);
  }
  const R = await turet(), O = odunc(R), stiller = {};
  Object.keys(R.T).sort().forEach(s => { stiller[s] = R.T[s]; if (R.kiyas[s]) { stiller[s].secim = R.kiyas[s].secim; stiller[s].kiyas = R.kiyas[s]; } });
  Object.keys(O.out).forEach(s => { stiller[s] = O.out[s]; });
  const sirali = {}; Object.keys(stiller).sort().forEach(s => { sirali[s] = stiller[s]; });
  const veri = 'window._ISKELET_TURETILMIS = ' + JSON.stringify({ surum:1, ornekV:ornekV(), agirlik:{ K1:1, K2:1, K3:1, K4:0.3 }, stiller:sirali }) + ';\n';
  const eski = fs.existsSync(VF) ? fs.readFileSync(VF, 'utf8') : null; if (eski !== veri) fs.writeFileSync(VF, veri);
  const v = adresEsitle(veri), say = { turetilmis:0, zayif:0, odunc:0 }; Object.keys(sirali).forEach(s => { say[sirali[s].durum]++; });
  const sec = Object.keys(R.kiyas).reduce((a, s) => { a[R.kiyas[s].secim]++; return a; }, { turetilmis:0, elle:0 });
  console.log('[iskelet_veri.js] ' + (eski === veri ? 'aynı' : 'yazıldı') + ' · ?v ' + v + ' · türetilmiş ' + say.turetilmis + ' · zayıf ' + say.zayif + ' · ödünç ' + say.odunc + ' · elle kıyası: türetilmiş ' + sec.turetilmis + ' / elle ' + sec.elle + ' · aile eşlenen BJCP ' + O.aileSay);
}
module.exports = { main, ornekV, ozet };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
