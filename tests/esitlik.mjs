#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER TARAYICI ↔ PYTHON EŞİTLİK TESTİ (ölçüm; düzeltme yapmaz)
//
// Soru: kullanıcının gördüğü stil tahmini, eğitimdeki modelle aynı mı?
//   1. Örneklem: v8 veri setinden kaynağı rmwoods OLMAYAN (V16) reçeteler, küme etiketine (label_v8) göre
//      katmanlı, seed sabit → ornek_liste.json. Python eğitim vektörü eğitim betiğinin KENDİ kodundan
//      (working/_step105_b1v8_retrain.py extract_new_20 + _step79 npy) → ornek_veri.json
//   2. Tarayıcı: production HTML (varsayılan git HEAD kopyası) headless Chromium'da DEĞİŞTİRİLMEDEN açılır;
//      model istekleri SHA'sı adında yazan YEREL dosyalara yönlendirilir, onnxruntime-web jsdelivr'den,
//      diğer tüm dış istekler kesilir. Her holdout reçetesi uygulamanın kendi ad→katalog eşleyicileriyle
//      (_bmKatCoz / _bmKalemCekirdek / _bmMetinCoz) editöre kurulur, render() → __lastV12Recipe →
//      buildFeatures / BM_B1.buildFeatures / predictSync / predictSlugSync / BM_B1.predictCluster / BM_STRATEGY_C.predict.
//      Ayrıca Python eğitim vektörü doğrudan JS çıkarım koduna verilir (özellik kurucudan bağımsız motor eşitliği).
//      Fixture'daki gerçek kullanıcı reçeteleri (tests/fixtures/brewmaster_yedek_2026-06-26.json, bm_v6) de koşulur.
//   3. Python: aynı model dosyaları (xgboost / lightgbm / onnxruntime / isotonic) eğitim ve tarayıcı vektörüyle.
//   4. Analiz + iddialar → rapor.json. Çıkış: 0 = FAIL yok, 1 = en az bir FAIL, 2 = SKIP (girdi eksik).
//
// Kullanım (depo kökünden; npm test'e BAĞLI DEĞİL):
//   node tests/esitlik.mjs                     → çıktı working/_esitlik/<YYYY-MM-DD>/ (gitignore'da)
//   node tests/esitlik.mjs --html=calisma      → git HEAD yerine çalışma kopyası HTML'i
//   node tests/esitlik.mjs --yeniden-ornekle   → örneklem / Python vektörü yeniden üretilir (varsayılan: varsa yeniden kullan)
//   node tests/esitlik.mjs --kume=15 --seed=20261026 --cikti=working/_esitlik/deneme
// Gerekenler: working/ altındaki veri + modeller (GitHub'da yok; Drive yedeği: Brewmaster_ML_Yedek_2026-10-26),
//   Python 3.12 + numpy, scikit-learn, xgboost, lightgbm, onnxruntime; node + puppeteer (devDependency).
// Süre: örneklem ≈ 1 dk (1,4 GB akış okuma, 3 geçiş) + tarayıcı ≈ 3-5 dk + Python ≈ 1 dk.
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, '..');
const W = path.join(KOK, 'working');
const HTML_AD = 'Brewmaster_v2_79_10.html';
const argv = process.argv.slice(2);
const arg = (ad, vars) => { const a = argv.find(x => x === '--' + ad || x.startsWith('--' + ad + '=')); return a ? (a.includes('=') ? a.split('=').slice(1).join('=') : true) : vars; };
const TARIH = new Date().toISOString().slice(0, 10);
const D = path.resolve(KOK, arg('cikti', path.join('working', '_esitlik', TARIH)));
const HTML_KAYNAK = arg('html', 'head');
const PY = process.env.PYTHON || 'python';
const ENV = { ...process.env, ESITLIK_DIR: D, ESITLIK_KUME: String(arg('kume', '15')), ESITLIK_SEED: String(arg('seed', '20261026')), PYTHONIOENCODING: 'utf-8' };

// ── girdi denetimi (eksikse SKIP)
const GEREKLI = ['_step105_dataset_v8_clean.json', '_step79_new_features_376k.npy', '_v19_v28j_a_label_encoder_14cat.json', '_step105_label_encoder_14cat.json',
  '_step105_b1v8_retrain.py', '_step105_b1v8_feature_list.json', '_step105_v12cv5/fold1.json', '_step105_v12cv5_label_encoder.json', '_step105_b1v8/fold1.model',
  '_step105_b1v8_fold1.onnx', '_step105_calibration/calibration_params.json', 'v12slug_v5_model_2df2431a.json', 'v12slug_v5_label_encoder_2df2431a.json', 'v20slug_v5_alpha030_40dcee6c.json'];
const eksik = GEREKLI.filter(f => !fs.existsSync(path.join(W, f)));
const FIX = path.join(KOK, 'tests/fixtures/brewmaster_yedek_2026-06-26.json');
const pyOk = cp.spawnSync(PY, ['-c', 'import numpy, sklearn, xgboost, lightgbm, onnxruntime'], { env: ENV }).status === 0;
if (eksik.length || !pyOk) { console.log('SKIP — eksik girdi:', eksik.join(', ') || '-', '| python kütüphaneleri:', pyOk ? 'tamam' : 'EKSİK'); process.exit(2); }
fs.mkdirSync(path.join(D, 'html'), { recursive: true });

// ── HTML kopyası (production'ı test etmek için varsayılan git HEAD; çalışma kopyası başka oturumca değiştirilebilir)
const htmlBuf = HTML_KAYNAK === 'calisma' ? fs.readFileSync(path.join(KOK, HTML_AD)) : cp.execSync('git show HEAD:' + HTML_AD, { cwd: KOK, maxBuffer: 64 << 20 });
fs.writeFileSync(path.join(D, 'html', HTML_AD), htmlBuf);
const htmlMd5 = crypto.createHash('md5').update(htmlBuf).digest('hex');
const head = cp.execSync('git rev-parse --short HEAD', { cwd: KOK }).toString().trim();
console.log(`HTML: ${HTML_KAYNAK === 'calisma' ? 'çalışma kopyası' : 'git HEAD ' + head} md5 ${htmlMd5} → ${D}`);

// ── canlı model adları HTML'den; her biri yerelde SHA8 = sha256(dosya)[0:8] doğrulanır
const MODEL = {
  'v12c_v5_model_14cat_d4cbc398.json': '_step105_v12cv5/fold1.json', 'v12c_v5_label_encoder_14cat_d4cbc398.json': '_step105_v12cv5_label_encoder.json',
  'v12slug_v5_model_2df2431a.json': 'v12slug_v5_model_2df2431a.json', 'v12slug_v5_label_encoder_2df2431a.json': 'v12slug_v5_label_encoder_2df2431a.json',
  'v20slug_v5_alpha030_40dcee6c.json': 'v20slug_v5_alpha030_40dcee6c.json', 'b1_v8_17484c93.onnx': '_step105_b1v8_fold1.onnx',
  'b1_v8_calibration_29744456.json': '_step105_calibration/calibration_params.json',
  'b1_v8_calibration_c60695de.json': '_step105_calibration/calibration_params_s2.json' }; // Sprint 2 (kusur 3): doğru 116 alanlık OOF'la yeniden uydurulan kalibrasyon
const html = htmlBuf.toString('utf8');
for (const m of html.matchAll(/'\/(v_cluster_[a-z_]+_[0-9a-f]{8}\.json)'/g)) MODEL[m[1]] = m[1];
// Sprint 2: Python tarafı (python_tahmin.py / analiz.py) HTML'in istediği kalibrasyon dosyasını kullanır (iki taraf aynı dosya)
const kalAd = (/(b1_v8_calibration_[0-9a-f]{8}\.json)/.exec(html) || [])[1];
if (kalAd && MODEL[kalAd]) ENV.ESITLIK_KAL = path.join(W, MODEL[kalAd]);
const istenen = new Set([...html.matchAll(/brewmaster-models\.dessn7\.workers\.dev\/([A-Za-z0-9_.]+\.(?:json|onnx))/g)].map(m => m[1]));
const b1sha = (/const B1_SHA8 = '([0-9a-f]{8})'/.exec(html) || [])[1]; if (b1sha) istenen.add('b1_v8_' + b1sha + '.onnx');
const shaHata = [];
for (const [ad, yer] of Object.entries(MODEL)) {
  const p = path.join(W, yer); if (!fs.existsSync(p)) { shaHata.push(ad + ' (yerelde yok)'); continue; }
  const s8 = (/_([0-9a-f]{8})\.(?:json|onnx)$/.exec(ad) || [])[1];
  if (s8 && !/label_encoder/.test(ad) && crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 8) !== s8) shaHata.push(ad + ' (SHA8 tutmuyor)');
}
const tanimsiz = [...istenen].filter(a => !MODEL[a]);
if (shaHata.length || tanimsiz.length) { console.log('SKIP — model dosyası:', shaHata.concat(tanimsiz.map(a => a + ' (HTML istiyor, eşlemesi yok)')).join('; ')); process.exit(2); }

const kos = (betik) => { const r = cp.spawnSync(PY, [path.join(KOK, 'tests/esitlik', betik)], { cwd: KOK, env: ENV, stdio: 'inherit' }); return r.status; };
if (arg('yeniden-ornekle', false) || !fs.existsSync(path.join(D, 'ornek_veri.json'))) { if (kos('ornekle.py') !== 0) { console.log('FAIL — örneklem betiği'); process.exit(1); } }
const veri = JSON.parse(fs.readFileSync(path.join(D, 'ornek_veri.json'), 'utf8'));
const fix = fs.existsSync(FIX) ? JSON.parse(fs.readFileSync(FIX, 'utf8')) : null;
const KR_SEED = fix && fix.data && fix.data.bm_v6 ? fix.data.bm_v6 : '[]';
const KAAN_IDS = JSON.parse(KR_SEED).map(r => r.id);

// ── tarayıcı
const istekLog = { yerel: 0, model: {}, cdn: {}, kesilen: {} };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/sw.js') { res.writeHead(404); return res.end(); }
  const p = (u === '/' || u === '/' + HTML_AD) ? path.join(D, 'html', HTML_AD) : path.join(KOK, u);
  if (!path.normalize(p).startsWith(path.normalize(KOK)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  istekLog.yerel++; const b = fs.readFileSync(p);
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream', 'Content-Length': b.length, 'Cache-Control': 'no-store' });
  res.end(b);
});
const PORT = await new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 1800000 });
const page = await browser.newPage(); page.setDefaultTimeout(600000);
const sayfaHata = []; page.on('pageerror', e => sayfaHata.push(String(e && e.message || e).slice(0, 300)));
await page.setRequestInterception(true);
page.on('request', req => {
  const url = req.url();
  if (url.startsWith('http://127.0.0.1:' + PORT)) return req.continue();
  const m = /^https:\/\/brewmaster-models\.dessn7\.workers\.dev\/([^?]+)/.exec(url);
  if (m && MODEL[m[1]]) { istekLog.model[m[1]] = (istekLog.model[m[1]] || 0) + 1; return req.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: m[1].endsWith('.onnx') ? 'application/octet-stream' : 'application/json', body: fs.readFileSync(path.join(W, MODEL[m[1]])) }); }
  if (/^https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web@1\.21\.0\//.test(url)) { istekLog.cdn[url] = (istekLog.cdn[url] || 0) + 1; return req.continue(); }
  if (/^(data|blob):/.test(url)) return req.continue();
  const h = (() => { try { return new URL(url).host; } catch (e) { return url.slice(0, 60); } })(); istekLog.kesilen[h] = (istekLog.kesilen[h] || 0) + 1; return req.abort();
});
await page.evaluateOnNewDocument((kr) => { try { if (!localStorage.getItem('__esitlik_seed')) { localStorage.setItem('bm_v6', kr); localStorage.setItem('__esitlik_seed', '1'); } } catch (e) {} }, KR_SEED);
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load' });
await page.waitForFunction(() => window.BM_V12 && window.BM_B1 && window.BM_STRATEGY_C && typeof yeniTarif === 'function' && window._bmKatCoz, { timeout: 120000 });
const hazir = await page.evaluate(async () => {
  await BM_V12.preload(); await BM_V12.preloadSlug(); await BM_B1.preload();
  if (window.BM_V20 && BM_V20.preloadSlug) { try { await BM_V20.preloadSlug(); } catch (e) {} }
  const cl = Object.keys(BM_STRATEGY_C.URLS); for (const c of cl) await BM_STRATEGY_C.loadVCluster(c);
  const vcSinif = {}; cl.forEach(c => { const e = BM_STRATEGY_C.cache.get(c); vcSinif[c] = { inline: (BM_STRATEGY_C.CLASSES[c] || null), cache: e && e.classes }; });
  return { v20: !!(window.BM_V20 && BM_V20.isSlugReady && BM_V20.isSlugReady()), kumeler: cl, vcSinif, featListEsit: JSON.stringify(__bmGetV12ClusterLabels().feature_list) === JSON.stringify(__bmGetV12SlugLabels().feature_list) };
});
await page.evaluate(() => {
  window.__ES = {
    async olc() {
      window.__bmB1InFlight = true; // dispatcher'ın paralel B1 çağrısı kapalı (tek ONNX oturumu; eşzamanlı run hata verir). predictCluster bu bayrağa bakmaz.
      window.__lastV12Recipe = null; window.__lastV12ClusterResult = null;
      sekme = 'genel'; ekran = 'editor'; render();
      const rec = window.__lastV12Recipe; if (!rec) return { hata: '__lastV12Recipe yok (dispatcher koşmadı)' };
      const fo = __bmBuildFeaturesV12(rec), FL = __bmGetV12ClusterLabels().feature_list, v89 = FL.map(f => fo[f] || 0);
      const b1In = Object.assign({}, rec, { hoplar: S.hoplar || [], maltlar: S.maltlar || [], katkilar: S.katkilar || [], hacim: S.hacim || 0, og: rec._og, mash_steps: ((S.mashAdimlar || []).length || 1), verim: (S.verim || 0) }); // = dispatcher _b1Input
      const v116 = Array.from(BM_B1.buildFeatures(b1In)), c = BM_V12.predictSync(rec), SL = __bmGetV12SlugLabels();
      const sRaw = __bmPredictRawWith(__bmGetV12SlugModel(), SL.feature_list.map(f => fo[f] || 0)), sFin = BM_V12.predictSlugSync(rec);
      const b1 = await BM_B1.predictCluster(b1In);
      let stc = null, stcHata = null; try { stc = await BM_STRATEGY_C.predict(b1In); } catch (e) { stcHata = String(e && e.message); }
      const vc = {}; Object.keys(BM_STRATEGY_C.URLS).forEach(k => { vc[k] = __bmPredictRawWith(BM_STRATEGY_C.cache.get(k).model, v89); });
      return { fo, v89, v116, og: rec._og, fg: rec._fg, srm: rec._srm, ibu: rec._ibu, abv: rec._abv, mayaTip: rec._mayaTip, v12c: c && c.probs, v12sRaw: sRaw, v12sFinTop: sFin && sFin.top3 && sFin.top3[0] && sFin.top3[0].slug,
        b1Raw: b1 && b1.raw_probs, b1Cal: b1 && b1.probs, b1Top: b1 && b1.topCluster, b1Override: b1 && (b1._smokeOverride || b1._fruitWheatOverride || null), b1CalDurum: b1 && b1._meta && b1._meta.calibration, stcTop: stc && stc.topSlug, stcCluster: stc && stc.cluster, stcHata, vc };
    },
    async motor(v116) {
      const v89 = v116.slice(0, 89), sess = await BM_B1.preload();
      const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', Float32Array.from(v116), [1, 116]) });
      const key = sess.outputNames.find(n => out[n] && out[n].dims && out[n].dims.length === 2 && out[n].dims[1] === 14) || sess.outputNames[sess.outputNames.length - 1];
      const vc = {}; Object.keys(BM_STRATEGY_C.URLS).forEach(k => { vc[k] = __bmPredictRawWith(BM_STRATEGY_C.cache.get(k).model, v89); });
      return { v12c: __bmPredictRawWith(__bmGetV12ClusterModel(), v89), v12s: __bmPredictRawWith(__bmGetV12SlugModel(), v89), b1Onnx: Array.from(out[key].data), vc };
    },
    kur(raw, ad) { // DÖNÜŞTÜRME (test yapıtı; production yolu değil): ham ad → katalog id, uygulamanın kendi eşleyicileriyle
      const coz = (tip, ham) => { const c = window._bmKalemCekirdek ? _bmKalemCekirdek(ham) : ham;
        let id = _bmKatCoz(tip, ham) || (c && c !== ham ? _bmKatCoz(tip, c) : null), t = tip;
        if (!id && tip === 'malt') id = window._bmOrnekBlackPatent ? _bmOrnekBlackPatent(ham, 'nhc') : null;
        if (!id && tip !== 'maya') { const k = window._bmMetinCoz ? _bmMetinCoz('katki', ham) : null; if (k) { id = k; t = 'katki'; } }
        return id ? { tip: t, id } : null; };
      yeniTarif(); S.biraAd = ad || ''; const es = { malt: [], hop: [], maya: null };
      if (+raw.batch_size_l > 0) S.hacim = +raw.batch_size_l; if (+raw.mash_eff_pct > 0) S.verim = +raw.mash_eff_pct;
      S.maltlar = []; S.hoplar = []; S.katkilar = [];
      (raw.malts || []).forEach(m => { const c = coz('malt', m.name); es.malt.push({ ham: m.name, kg: m.amount_kg, id: c && c.id, tip: c && c.tip }); if (!c) return;
        if (c.tip === 'malt') S.maltlar.push({ id: c.id, kg: +m.amount_kg || 0 }); else S.katkilar.push({ id: c.id, g: (+m.amount_kg || 0) * 1000 }); });
      (raw.hops || []).forEach(h => { const c = coz('hop', h.name); es.hop.push({ ham: h.name, id: c && c.id, tip: c && c.tip, use: h.use, t: h.time_min }); if (!c) return;
        if (c.tip !== 'hop') { S.katkilar.push({ id: c.id, g: +h.amount_g || 0 }); return; }
        const dry = /dry/i.test(h.use || ''), wp = /whirl|hop ?stand/i.test(h.use || '');
        // Sprint 2: ÜRETİM nesnesi — editör kuru hop'u tur 'dry_hop' + dk 0 + dryDays (gün) olarak tutar (seçenek / kayıt / eski yazım çevirisi 'dry' / 'dryhop' → 'dry_hop');
        //   ham BeerXML kuru hop time_min = gün × 1440 → dryDays = time_min / 1440 (yoksa ya da 0 ise editör varsayılanı 5 — dönüştürme kaybı). Ham alfa → cAA (kullanıcının girdiği AA).
        const tm = h.time_min == null ? null : +h.time_min, hb = { id: c.id, g: +h.amount_g || 0, dk: dry ? 0 : (tm == null ? 60 : tm), tur: dry ? 'dry_hop' : (wp ? 'whirlpool' : 'boil') };
        if (dry) hb.dryDays = tm >= 1440 ? tm / 1440 : 5; if (+h.alpha > 0) hb.cAA = +h.alpha; S.hoplar.push(hb); });
      if (raw.yeast) { const y = coz('maya', String(raw.yeast)); es.maya = { ham: String(raw.yeast).slice(0, 120), id: y && y.id }; if (y) S.mayaId = y.id; }
      const ms = +raw.mash_steps; if (ms >= 1) S.mashAdimlar = Array.from({ length: ms }, () => ({ sc: S.mashSc || 66, dk: 60 }));
      return es;
    }
  };
});
const sonuc = { htmlMd5, htmlKaynak: HTML_KAYNAK, head, hazir, holdout: {}, kaan: {}, motor: {}, tekrar: 0 };
const tekrar = async (f, a) => { for (let k = 0; k < 3; k++) { try { return await page.evaluate(f, a); } catch (e) { if (k === 2) throw e; sonuc.tekrar++; await new Promise(z => setTimeout(z, 500)); } } };
let n = 0;
for (const r of veri.veri) {
  const es = await page.evaluate((raw, ad) => __ES.kur(raw, ad), r.raw, r.name);
  const o = await tekrar(() => __ES.olc()); const m = await tekrar(v => __ES.motor(v), r.v116);
  sonuc.holdout[r.id] = { eslesme: es, ...o }; sonuc.motor[r.id] = m;
  if (++n % 50 === 0) console.log('tarayıcı:', n, '/', veri.veri.length);
}
for (const id of KAAN_IDS) sonuc.kaan[id] = await page.evaluate(async (rid) => { if (!KR.find(x => x && x.id === rid)) return { hata: 'KR yok' }; tarifAc(rid); const z = await __ES.olc(); z.ad = S.biraAd; z.katki = (S.katkilar || []).map(k => k.id); z.mayaId = S.mayaId; return z; }, id);
sonuc.istekLog = istekLog; sonuc.konsolHata = sayfaHata.slice(0, 50);
await browser.close(); srv.close();
fs.writeFileSync(path.join(D, 'tarayici_sonuc.json'), JSON.stringify(sonuc));
const tv = {}; for (const [id, o] of Object.entries(sonuc.holdout)) if (o.v116) tv[id] = { v116: o.v116 }; for (const [id, o] of Object.entries(sonuc.kaan)) if (o.v116) tv['KAAN:' + id] = { v116: o.v116 };
fs.writeFileSync(path.join(D, 'tarayici_ozellik.json'), JSON.stringify(tv));
console.log(`tarayıcı bitti: holdout ${n}, gerçek reçete ${KAAN_IDS.length}, sayfa hatası ${sayfaHata.length}, model isteği ${Object.keys(istekLog.model).length}, kesilen ${JSON.stringify(istekLog.kesilen)}`);
if (kos('python_tahmin.py') !== 0) { console.log('FAIL — python tahmin'); process.exit(1); }
process.exit(kos('analiz.py'));
