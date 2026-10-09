// ═══ SPRINT AI2 1 + AI4 1 — TOPLULUK KULLANIM TABLOSU (build-time) ═══
// Kaynak: 376K korpus (working/_step105_dataset_v8_clean.json — Kaan'ın bilgisayarında; uygulamaya YÜKLENMEZ).
// Çıktı: korpus_kullanim.js → window._KORPUS_KULLANIM (YALNIZ toplu istatistik; tek reçete adı / metni / kişi adı GÖMÜLMEZ — repo public).
// Malzeme → katalog id: uygulamanın KENDİ çözücüsü (ND1 bloğu: _bmKatCoz = BV L2 ad/alias/kod; katkı _bmMetinCoz = tek kayda ait terim)
//   HTML'den dilimlenip node vm'de koşulur → uygulama ile build aynı kuralı kullanır.
// Geçerli reçete: bjcp_slug → SLUG_TO_BJCP ile BJCP anahtarına bağlanan (stil sayımı yalnız bunlardan) · batch 3–250 L (doz için).
// AI4 1 genişletme:
//   · malzeme × stil TAM sayım (seyrek: s = [stilNo, n, …]; stil no → m.stiller, stil toplamı m.stn → oran),
//   · stil ailesi (STYLE_FAMILIES.json familyMap, slug → aile; BJCP anahtarı → en sık slug'ının ailesi) → m.aile (aile toplamı uygulamada toplanır),
//   · katkılarda en sık birlikte kullanılan 5 katkı (b), stil başına kullanım zamanı (zs, stilde n ≥ 10),
//   · ödüllü alt küme: AHA madalyalı 539 reçetede görünüm (q, qs),
//   · miktar: korpusun ana kaynağı (rmwoods) katkı miktarını BİRİMSİZ tutuyor (alan yok: name/amount/use/time_min) → ÇEVRİLMEZ, "dc" sayılır;
//     AHA katkı metinlerinde ("1 oz. (28 g) crushed coriander @ knockout") KÜTLE birimi varsa uygulamanın _bmEkKutle kuralıyla gram
//     (parantezde metrik esas; oz↔g %10+ çelişki → bilinmiyor; hacim / adet → çevrilmez) → g/L.
//   Doz (g/L) yalnız miktarı ve batch hacmi olan satırlardan; aynı reçetede aynı kalem toplanır. Akıl dışı doz (malt > 800, hop > 60,
//   katkı > 200 g/L) dağılıma girmez (sayılır). Tipiklik ≠ iyilik: "iyi" sinyali yalnız madalya / kalite etiketi / kör tadım.
// Kullanım: node --max-old-space-size=8192 _korpus_build.js [--kuru]   (--kuru: dosya yazmaz, ölçüm basar)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const KOK = __dirname, HF = path.join(KOK, 'Brewmaster_v2_79_10.html'), SF = path.join(KOK, 'sw.js'), VF = path.join(KOK, 'korpus_kullanim.js');
const KORPUS = path.join(KOK, 'working', '_step105_dataset_v8_clean.json'), KURU = process.argv.includes('--kuru');
const TAG = /<script src="korpus_kullanim\.js\?v=([0-9a-f]+)"><\/script>/g, SWU = /'\.\/korpus_kullanim\.js\?v=([0-9a-f]+)'/g;
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
if (!fs.existsSync(KORPUS)) abort('korpus yok: ' + KORPUS);
const html = fs.readFileSync(HF, 'utf8').replace(/\r\n/g, '\n');
// dize-farkında parantez eşleme
function blok(bas, ac) {
  const i = html.indexOf(bas); if (i < 0) abort('dilim yok: ' + bas);
  let j = html.indexOf(ac, i), d = 0, q = null;
  for (let k = j; k < html.length; k++) { const c = html[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && html[k + 1] === '/') { k = html.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && html[k + 1] === '*') { k = html.indexOf('*/', k + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === ac) d++; else if (c === (ac === '[' ? ']' : '}')) { d--; if (d === 0) return html.slice(j, k + 1); } }
  abort('kapanmadı: ' + bas);
}
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(['MALTLAR', 'HOPLAR', 'MAYALAR', 'KATKILAR'].map(a => 'var ' + a + ' = ' + blok('const ' + a + '=[', '[') + ';').join('\n') +
  '\nvar BJCP = ' + blok('const BJCP = {', '{') + ';\nvar SLUG_TO_BJCP = ' + blok('const SLUG_TO_BJCP = {', '{') + ';', ctx);
const nb = html.indexOf('// ═══ SPRINT ND1 — ÖRNEK → KURU REÇETE'), ne = html.indexOf('\n})();', nb); if (nb < 0 || ne < 0) abort('ND1 bloğu yok');
vm.runInContext(html.slice(nb, ne + 6), ctx);
const W = ctx.window; if (typeof W._bmKatCoz !== 'function' || typeof W._bmMetinCoz !== 'function' || typeof W._bmEkKutle !== 'function') abort('çözücü yüklenmedi');
const BJCP = ctx.BJCP, S2B = ctx.SLUG_TO_BJCP; if (Object.keys(BJCP).length !== 240) abort('BJCP 240 değil');
const AILE = JSON.parse(fs.readFileSync(path.join(KOK, 'STYLE_FAMILIES.json'), 'utf8')).familyMap;

// ── kullanım zamanı sınıfları ──
function hopZaman(h) { const u = String(h.use || '').toLowerCase(), t = +h.time_min;
  if (/dry|kalt|trocken/.test(u)) return 'kuru hop'; if (/whirl|hopstand|stand|flame|steep/.test(u)) return 'whirlpool';
  if (/first|fwh|vorder/.test(u)) return 'FWH'; if (/mash|maisch/.test(u)) return 'mash';
  if (!isFinite(t)) return 'zaman yok'; return t >= 45 ? 'kaynatma ≥45 dk' : t >= 15 ? 'kaynatma 15–44 dk' : t > 0 ? 'kaynatma 1–14 dk' : 'kaynatma sonu (0 dk)'; }
// AI4: fermantasyon birincil / ikincil ayrı (bardak denemesi "fermantasyon SONRASI" ayrımı için)
function katkiZaman(u) { u = String(u || '').toLowerCase();
  if (/bottl|abfüll|prim(ing)?$|keg/.test(u)) return 'şişeleme / fıçı'; if (/second|condition|lager|dry/.test(u)) return 'ikincil / olgunlaştırma';
  if (/ferment|primary|gär/.test(u)) return 'birincil fermantasyon';
  if (/mash|maisch/.test(u)) return 'mash'; if (/knock|flame|whirl/.test(u)) return 'kaynatma sonu'; if (/boil|koch|\d+\s*min/.test(u)) return 'kaynatma'; return u ? 'diğer' : 'zaman yok'; }
const SINIR = { malt: 800, hop: 60, katki: 200, maya: Infinity };
// AHA katkı metni → çekirdek ad: baştaki miktar/birim/parantez + sondaki zaman/yer ifadeleri atılır (çözücü ham metne göre kurallı)
function ahaCekirdek(s) { return String(s).replace(/\([^)]*\)/g, ' ').replace(/^\s*[\d.\/\s]+\s*(oz|ounces?|lbs?|pounds?|g|grams?|kg|tsp|tbsp|tablespoons?|teaspoons?|cups?|ml|l|tabs?|tablets?)?\.?\s+(of\s+)?/i, ' ')
  .split(/\s(@|at|in|for|added|add|to|during|with)\s|[,;@]/i)[0].trim(); }

// ── tek geçiş ──
const T = new Map(); // 'tip:id' → { n, st:Map, d:[], z:Map, zs:Map(stil→Map), dis, dc, q, qs:Map, b:Map }
const STN = new Map(), QSTN = new Map(), STSLUG = new Map(); // stil toplamı · madalyalı stil toplamı · BJCP → slug sayımı (aile için)
const say = { kayit: 0, ayristirilamadi: 0, gecerli: 0, hacimli: 0, madalya: 0, madalyaGecerli: 0, satir: { malt: 0, hop: 0, katki: 0, maya: 0 }, eslesen: { malt: 0, hop: 0, katki: 0, maya: 0 },
  katkiSatir: 0, katkiBirimsiz: 0, katkiKutle: 0, katkiKutleCelisik: 0, katkiHacimAdet: 0, ahaKatki: 0, ahaKatkiEslesen: 0 };
const cache = { malt: new Map(), hop: new Map(), katki: new Map(), maya: new Map() };
function coz(tip, ham) { const c = cache[tip]; if (c.has(ham)) return c.get(ham); let id = null;
  try { id = tip === 'katki' ? W._bmMetinCoz('katki', ham) : (W._bmKatCoz(tip, ham) || W._bmMetinCoz(tip, ham)); } catch (e) { id = null; }
  c.set(ham, id || null); return id || null; }
function kayit(r) {
  say.kayit++; const raw = r.raw || {}, ax = raw.aha_extra || null, madalya = !!(ax && ax.medal_placement); if (madalya) say.madalya++;
  const stil = r.bjcp_slug && S2B[r.bjcp_slug] && BJCP[S2B[r.bjcp_slug]] ? S2B[r.bjcp_slug] : null;
  if (!stil) return; say.gecerli++; if (madalya) { say.madalyaGecerli++; QSTN.set(stil, (QSTN.get(stil) || 0) + 1); }
  STN.set(stil, (STN.get(stil) || 0) + 1); let sm = STSLUG.get(stil); if (!sm) STSLUG.set(stil, sm = new Map()); sm.set(r.bjcp_slug, (sm.get(r.bjcp_slug) || 0) + 1);
  const L = +raw.batch_size_l, hacim = L >= 3 && L <= 250; if (hacim) say.hacimli++;
  const rec = new Map(); // 'tip:id' → { g, gv, z:Set, dc }
  const ekle = (tip, ham, g, z, dc) => { say.satir[tip]++; const id = ham ? coz(tip, String(ham)) : null; if (!id) return null; say.eslesen[tip]++;
    const k = tip + ':' + id; let e = rec.get(k); if (!e) { e = { g: 0, gv: false, z: new Set(), dc: 0 }; rec.set(k, e); } if (g > 0) { e.g += g; e.gv = true; } if (z) e.z.add(z); if (dc) e.dc++; return id; };
  (Array.isArray(raw.malts) ? raw.malts : []).forEach(m => m && ekle('malt', m.name, (+m.amount_kg || 0) * 1000, null));
  (Array.isArray(raw.hops) ? raw.hops : []).forEach(h => h && ekle('hop', h.name, +h.amount_g || 0, hopZaman(h)));
  (Array.isArray(raw.misc) ? raw.misc : []).forEach(x => { if (!x) return; say.katkiSatir++; const ad = typeof x === 'string' ? x : x.name;
    const birimsiz = typeof x === 'object' && typeof x.amount === 'number' && x.amount > 0; if (birimsiz) say.katkiBirimsiz++; // rmwoods: miktar var, birim YOK → çevrilmez
    ekle('katki', ad, 0, typeof x === 'object' ? katkiZaman(x.use) : 'zaman yok', birimsiz); });
  if (ax && Array.isArray(ax.misc)) ax.misc.forEach(s => { if (typeof s !== 'string' || !s.trim()) return; say.katkiSatir++; say.ahaKatki++;
    const id = coz('katki', s) || coz('katki', ahaCekirdek(s)); if (!id) { say.satir.katki++; return; }
    const low = s.toLowerCase(), kutleYazili = /\d\s*(oz|ounces?|lbs?|pounds?|g|grams?|kg)\b\.?/.test(low) && !/fl\.?\s*oz/.test(low), g = W._bmEkKutle(s);
    if (g > 0) say.katkiKutle++; else if (kutleYazili) say.katkiKutleCelisik++; else if (/\d/.test(low)) say.katkiHacimAdet++;
    say.ahaKatkiEslesen++; say.satir.katki++; say.eslesen.katki++;
    const k = 'katki:' + id; let e = rec.get(k); if (!e) { e = { g: 0, gv: false, z: new Set(), dc: 0 }; rec.set(k, e); }
    if (g > 0) { e.g += g; e.gv = true; } else if (/\d/.test(low)) e.dc++; e.z.add(katkiZaman(low.replace(/^[^@]*@/, '@ ').replace(/.*\b(secondary|primary|knockout|flame ?out|whirlpool|mash|keg|bottl\w*)\b.*/, '$1').replace(/.*\b(\d+)\s*min.*/, '$1 min'))); });
  const y = typeof raw.yeast === 'string' ? raw.yeast : (raw.yeast && raw.yeast.name) || ''; if (y) ekle('maya', y, 0, null);
  const katkilar = [...rec.keys()].filter(k => k.startsWith('katki:'));
  rec.forEach((e, k) => { let t = T.get(k); if (!t) { t = { n: 0, st: new Map(), d: [], z: new Map(), zs: new Map(), dis: 0, dc: 0, q: 0, qs: new Map(), b: new Map() }; T.set(k, t); }
    t.n++; t.st.set(stil, (t.st.get(stil) || 0) + 1); e.z.forEach(z => t.z.set(z, (t.z.get(z) || 0) + 1));
    if (madalya) { t.q++; t.qs.set(stil, (t.qs.get(stil) || 0) + 1); }
    if (k.startsWith('katki:')) { let zm = t.zs.get(stil); if (!zm) t.zs.set(stil, zm = new Map()); e.z.forEach(z => zm.set(z, (zm.get(z) || 0) + 1));
      katkilar.forEach(o => { if (o !== k) t.b.set(o, (t.b.get(o) || 0) + 1); }); if (e.dc) t.dc++; }
    if (hacim && e.gv) { const gL = e.g / L, tip = k.split(':')[0]; if (gL > 0 && gL <= SINIR[tip]) t.d.push(gL); else t.dis++; } });
}
const rs = fs.createReadStream(KORPUS, { encoding: 'utf8', highWaterMark: 1 << 24 }); let buf = ''; const BOUND = '}, {"id": ';
const isle = t => { try { kayit(JSON.parse(t)); } catch (e) { say.ayristirilamadi++; } };
rs.on('data', ch => { buf += ch; const st = buf.indexOf('{"id": '); if (st < 0) return; buf = buf.slice(st); let i;
  while ((i = buf.indexOf(BOUND, 1)) >= 0) { isle(buf.slice(0, i + 1)); buf = buf.slice(i + 2); } if (buf.length > 50e6) { say.ayristirilamadi++; buf = ''; } });
rs.on('end', () => { let last = buf; const c = last.lastIndexOf('}]}'); if (c > 0) last = last.slice(0, c + 1); isle(last); bitir(); });

function yuzde(a, p) { const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); }
const yuv = v => v >= 10 ? Math.round(v * 10) / 10 : v >= 1 ? Math.round(v * 100) / 100 : Math.round(v * 1000) / 1000;
const sirala = m => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
function bitir() {
  const ASGARI = 5, ZS_ASGARI = 10; // 5'ten az reçetede geçen kalem yazılmaz (gürültü); stil-zamanı yalnız stilde ≥ 10 reçetede
  const stiller = [...STN.keys()].sort(), si = new Map(stiller.map((s, i) => [s, i]));
  // aile: stilin korpustaki slug'larından aileli olan en sığı; korpusta hiç slug'ı yoksa SLUG_TO_BJCP'deki aileli slug (240 anahtarın hepsi için)
  const aileOf = s => { const sm = STSLUG.get(s); if (sm) { const a = sirala(sm).find(([sl]) => AILE[sl]); if (a) return AILE[a[0]]; }
    const sl = Object.keys(S2B).filter(x => S2B[x] === s && AILE[x]).sort()[0]; return sl ? AILE[sl] : null; };
  const aile = stiller.map(aileOf), aileTum = {}; Object.keys(BJCP).forEach(s => { const a = aileOf(s); if (a) aileTum[s] = a; });
  // AI4: uygulamanın 240 BJCP anahtarının 167'si korpusta YOK (korpus slug'ları 73 anahtara bağlanıyor). "Yakın korpus stili" YALNIZ ad örtüşmesiyle:
  //   korpus anahtarının ' / ' parçalarından biri (≥ 4 harf) uygulama anahtarında geçiyorsa, en uzun parça kazanır ("Saison (super)" → "Saison / Farmhouse Ale").
  //   Sayısal profil yakınlığı DENENDİ ve REDDEDİLDİ (Gose → American Lager, Trappist Single → German Pils: aynı OG/IBU ≠ aynı bira).
  //   Ad örtüşmesinin yanılttığı 3 anahtar elle dışarıda (renk/asitlik ailesi farklı): Flanders Red Ale, Sour Red Ale ("Red Ale" ≠ American Amber),
  //   American Imperial Porter ("Imperial" ≠ Imperial Stout). Kartta "aynı stil değil, ad olarak en yakın korpus etiketi" yazılır.
  const YAKIN_DISI = new Set(['Flanders Red Ale', 'Sour Red Ale', 'American Imperial Porter']);
  const yakin = {}, yakinYol = { ad: 0, yok: 0, disarida: 0 };
  Object.keys(BJCP).forEach(a => { if (si.has(a)) return; if (YAKIN_DISI.has(a)) { yakinYol.disarida++; return; } const al = a.toLowerCase();
    let en = null, enL = 0; stiller.forEach(c => c.split(' / ').forEach(p => { const pl = p.toLowerCase().trim(); if (pl.length >= 4 && al.includes(pl) && pl.length > enL) { en = c; enL = pl.length; } }));
    if (en) { yakin[a] = si.get(en); yakinYol.ad++; } else yakinYol.yok++; });
  if (process.argv.includes('--yakin')) Object.keys(yakin).forEach(a => console.log('  yakın: ' + a + ' → ' + stiller[yakin[a]]));
  console.log('[yakın stil] korpusta olmayan anahtar ' + Object.keys(BJCP).filter(a => !si.has(a)).length + ' · ' + JSON.stringify(yakinYol));
  const ZAD = [], zi = z => { let i = ZAD.indexOf(z); if (i < 0) { ZAD.push(z); i = ZAD.length - 1; } return i; };
  const k = {};
  [...T.keys()].sort().forEach(key => { const t = T.get(key); if (t.n < ASGARI) return;
    const o = { n: t.n, s: [].concat(...sirala(t.st).map(([s, n]) => [si.get(s), n])) };
    if (t.d.length >= ASGARI) { const d = t.d.sort((a, b) => a - b); o.d = [yuv(yuzde(d, 0.1)), yuv(yuzde(d, 0.5)), yuv(yuzde(d, 0.9))]; o.dn = d.length; }
    else o.dn = t.d.length;
    if (t.z.size) o.z = sirala(t.z).slice(0, 4);
    if (key.startsWith('katki:')) {
      o.dc = t.dc;
      const zs = []; sirala(t.st).forEach(([s, n]) => { if (n < ZS_ASGARI || !t.zs.get(s)) return; zs.push(si.get(s), [].concat(...sirala(t.zs.get(s)).slice(0, 3).map(([z, m]) => [zi(z), m]))); });
      if (zs.length) o.zs = zs;
      const b = sirala(t.b).filter(([x]) => (T.get(x) || { n: 0 }).n >= ASGARI).slice(0, 5).map(([x, n]) => [x.split(':')[1], n]); if (b.length) o.b = b;
    }
    if (t.q) { o.q = t.q; o.qs = [].concat(...sirala(t.qs).slice(0, 5).map(([s, n]) => [si.get(s), n])); }
    k[key] = o; });
  const meta = { kaynak: 'Brewmaster korpusu (working/_step105_dataset_v8_clean.json; rmwoods/brewersfriend/brewtoad/braureka/recipator… derlemesi)', kayit: say.kayit, gecerli: say.gecerli,
    hacimli: say.hacimli, kaliteEtiketli: say.madalya, kaliteEtiketliStilli: say.madalyaGecerli, kaliteNot: 'kalite etiketi = AHA NHC / Pro-Am madalyası (altın/gümüş/bronz)', asgari: ASGARI, zsAsgari: ZS_ASGARI,
    katkiSatir: say.katkiSatir, katkiBirimsiz: say.katkiBirimsiz, katkiKutle: say.katkiKutle, katkiKutleCelisik: say.katkiKutleCelisik, katkiHacimAdet: say.katkiHacimAdet,
    katkiMiktarBirim: 'korpusun ana kaynağında (rmwoods) katkı miktarı BİRİMSİZ (alan yok) → çevrilmez; yalnız AHA madalyalı reçete metinlerinde kütle birimi (g, kg, oz, lb) olan satırlar g/L\'ye çevrildi',
    stiller, stn: stiller.map(s => STN.get(s)), qstn: stiller.map(s => QSTN.get(s) || 0), aile, aileTum, yakin, zad: ZAD,
    not: 'Topluluk böyle yapmış — kalite ölçüsü değil. Doz g/L = reçete toplamı ÷ batch hacmi; p10 / medyan / p90. s = [stil no, reçete sayısı, …] (stil no → stiller; oran = n / stn).' };
  const metin = 'window._KORPUS_KULLANIM = ' + JSON.stringify({ m: meta, k }) + ';\n';
  const kap = { malt: 0, hop: 0, katki: 0, maya: 0 }; Object.keys(k).forEach(x => kap[x.split(':')[0]]++);
  const dozlu = { malt: 0, hop: 0, katki: 0 }; Object.keys(k).forEach(x => { const tp = x.split(':')[0]; if (k[x].d && dozlu[tp] != null) dozlu[tp]++; });
  console.log('[korpus] kayıt ' + say.kayit + ' · ayrıştırılamadı ' + say.ayristirilamadi + ' · geçerli (BJCP stiline bağlı) ' + say.gecerli + ' · hacimli ' + say.hacimli + ' · madalyalı ' + say.madalya + ' (stilli ' + say.madalyaGecerli + ')');
  console.log('[satır] ' + JSON.stringify(say.satir) + ' · eşleşen ' + JSON.stringify(say.eslesen));
  console.log('[katkı miktar] satır ' + say.katkiSatir + ' · birimsiz (çevrilmez) ' + say.katkiBirimsiz + ' · KÜTLE birimli çevrilen ' + say.katkiKutle + ' (%' + (100 * say.katkiKutle / say.katkiSatir).toFixed(3) + ') · kütle yazılı ama çelişik/okunamaz ' + say.katkiKutleCelisik + ' · hacim/adet (çevrilmez) ' + say.katkiHacimAdet + ' · AHA katkı ' + say.ahaKatki + ' eşleşen ' + say.ahaKatkiEslesen);
  console.log('[tablo] kalem ' + Object.keys(k).length + ' ' + JSON.stringify(kap) + ' · dozlu ' + JSON.stringify(dozlu) + ' · stil ' + stiller.length + ' (aileli ' + aile.filter(Boolean).length + ' · 240 anahtarda aileli ' + Object.keys(aileTum).length + ') · ' + (Buffer.byteLength(metin) / 1024).toFixed(1) + ' KB');
  const lv = k['katki:lavanta'];
  if (lv) { const m = new Map(); for (let i = 0; i < lv.s.length; i += 2) m.set(stiller[lv.s[i]], lv.s[i + 1]);
    ['Dubbel', 'Weizen / Weissbier', 'Witbier / Belgian White', 'Saison / Farmhouse Ale', 'Belgian Specialty Ale', 'Herb & Spice Beer'].forEach(s => { if (!si.has(s)) return; const n = m.get(s) || 0, N = STN.get(s); console.log('  lavanta × ' + s + ': ' + n + ' / ' + N + ' (%' + (100 * n / N).toFixed(2) + ') · aile ' + aile[si.get(s)]); });
    console.log('  lavanta: n ' + lv.n + ' · q ' + (lv.q || 0) + ' · dn ' + lv.dn + ' · dc ' + lv.dc + ' · b ' + JSON.stringify(lv.b) + ' · z ' + JSON.stringify(lv.z)); }
  ['malt:crf3', 'hop:saaz', 'katki:kisnisch', 'katki:portakal_kabuk'].forEach(x => console.log('  ' + x + ' n ' + (k[x] || {}).n + ' · stil sayısı ' + ((k[x] || { s: [] }).s.length / 2) + ' · d ' + JSON.stringify((k[x] || {}).d) + ' dn ' + (k[x] || {}).dn + ' q ' + (k[x] || {}).q));
  if (process.argv.includes('--stiller')) console.log(stiller.map((s, i) => s + ' ' + STN.get(s) + ' ' + aile[i]).join(' | '));
  if (KURU) return;
  fs.writeFileSync(VF, metin);
  const v = crypto.createHash('sha256').update(metin).digest('hex').slice(0, 10);
  let h = fs.readFileSync(HF, 'utf8'), sw = fs.readFileSync(SF, 'utf8');
  const t = [...h.matchAll(TAG)], u = [...sw.matchAll(SWU)]; if (t.length > 1 || u.length > 1) abort('korpus_kullanim.js adresi birden çok kez var');
  const nl = h.includes('\r\n') ? '\r\n' : '\n';
  if (!t.length) { const a = h.indexOf('<script src="iskelet_veri.js?v='), e = h.indexOf('</script>', a) + 9; if (a < 0) abort('iskelet_veri etiketi yok'); h = h.slice(0, e) + nl + '<script src="korpus_kullanim.js?v=' + v + '"></script>' + h.slice(e); }
  else h = h.replace(TAG, () => '<script src="korpus_kullanim.js?v=' + v + '"></script>');
  if (!u.length) { const a = sw.indexOf("'./iskelet_veri.js?v="), e = sw.indexOf('\n', a); if (a < 0) abort('sw.js iskelet_veri satırı yok'); sw = sw.slice(0, e + 1) + "  './korpus_kullanim.js?v=" + v + "',   // SPRINT AI2: topluluk kullanım tablosu — HTML'deki <script src> ile BİREBİR aynı URL (test kilitli)" + (sw.includes('\r\n') ? '\r\n' : '\n') + sw.slice(e + 1); }
  else sw = sw.replace(SWU, () => "'./korpus_kullanim.js?v=" + v + "'");
  fs.writeFileSync(HF, h); fs.writeFileSync(SF, sw);
  console.log('[korpus_kullanim.js] yazıldı · ?v ' + v);
}
