// ═══ SPRINT CC — K1 (ödüllü ev reçetesi) TABLOLARININ YENİDEN ÜRETİMİ ═══
// AN (_TOPLULUK_MADALYA, AHA) ve AX (_NHC_MADALYA, NHC) tablolarını AYNI ŞEMAYLA yeniden üretir; iki fark:
//  1. Stil başına ≤3 değil ≤50 örnek (Kaan: "stil başına tüm mevcut örnekler, üst sınır 50").
//  2. Stil eşlemesi _bmOrnekStilCoz ile (HTML'den dilimlenir — runtime testleriyle AYNI kural):
//     AN eşlemesi GENEL AHA etiketlerini tek alt stile bağlıyordu (stout→American Stout, porter→London Porter,
//     pale_lager→International Pale Lager: Imperial Stout / Pilsner altınları yanlış stilde görünüyordu).
//     Artık: "with a X" > özel kategori+malzeme > stil adı olan kategori > kategori+reçete adı > ÖZGÜL etiket >
//     şemsiye (Stout / Porter · Lager / Pilsner · Barleywine) > GÖMÜLMEZ.
//  3. D-kapısı (yalnız _TOPLULUK_DAGILIM'daki 68 stil) KALDIRILDI: örnek bölümü artık her stilde çizilir.
// Telif/kişisel veri ilkeleri AN/AX ile AYNI: yalnız olgular; talimat düzyazısı, reçete adı, kişi adı GÖMÜLMEZ.
// Kullanım: node _cc_build_k1.js <nhc.db yolu> [çıktı-dizini] [--kuru]
//   Varsayılan: AHA + NHC tabloları ornek_veri.js'e yazılır + içerik özeti HTML ve sw.js'te güncellenir (_cc_veri_yaz.js — CC5).
//   --kuru: ornek_veri.js'e DOKUNMAZ (yalnız çıktı dizinine .txt + kapsam).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { DatabaseSync } = require('node:sqlite');
const KOK = __dirname;
function abort(m) { console.error('ABORT: ' + m); process.exit(1); }
const KURU = process.argv.includes('--kuru'), _arg = process.argv.slice(2).filter(a => a !== '--kuru');
const DB_YOL = _arg[0]; if (!DB_YOL || !fs.existsSync(DB_YOL)) abort('nhc.db yolu ver (github.com/thcipriani/nhc-homebrew-data)');
const CIKTI = _arg[1] || path.join(KOK, 'working');
const MAX = 50;

// ── HTML'den otorite tabloları + çözücü ──
const html = fs.readFileSync(path.join(KOK, 'Brewmaster_v2_79_10.html'), 'utf8').replace(/\r\n/g, '\n');
function dilim(re) { const m = html.match(re); if (!m) abort('dilim yok: ' + re); return m[0]; }
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(dilim(/const BJCP = \{[\s\S]*?\n\};/).replace('const ', 'var ') + '\n' + dilim(/const SLUG_TO_BJCP = \{[\s\S]*?\n\};/).replace('const ', 'var '), ctx);
const cb = html.indexOf('// ═══ SPRINT CC — ÖRNEK STİL ÇÖZÜCÜ (BAŞ)'), ce = html.indexOf('// ═══ SPRINT CC — ÖRNEK STİL ÇÖZÜCÜ (SON)');
if (cb < 0 || ce < cb) abort('çözücü işaretçileri yok');
vm.runInContext(html.slice(cb, ce), ctx);
const BJCP = ctx.BJCP, S2B = ctx.SLUG_TO_BJCP, W = ctx.window;
if (Object.keys(BJCP).length !== 239) abort('BJCP 239 değil');
if (typeof W._bmOrnekStilCoz !== 'function') abort('çözücü yüklenmedi');

// AN'in ek eşlemesi (BİREBİR) + GENEL (alt stili söylemeyen) AHA etiketleri
const EK_ESLEME = { american_wheat_ale: 'American Wheat Beer', american_cream_ale: 'Blonde Ale / Cream Ale', american_barley_wine_ale: 'American Barleywine', german_bock: 'Bock',
  flanders_red_ale: 'Flanders Red Ale', red_ipa: 'American Amber IPA / Red IPA', roggenbier: 'Roggenbier / Rye Beer', export_stout: 'Foreign Extra Stout' };
const GENEL = new Set(['stout', 'porter', 'pale_lager', 'brown_ale', 'english_pale_ale', 'specialty_beer', 'experimental_beer', 'herb_and_spice_beer', 'fruit_beer',
  'wood_aged_beer', 'specialty_saison', 'specialty_smoked_beer', 'clone_beer', 'mixed_style_beer', 'alternative_fermentables_beer', 'spice_herb_or_vegetable_beer', 'winter_seasonal_beer']);
const OZEL_ETIKET = new Set(['specialty_beer', 'experimental_beer', 'herb_and_spice_beer', 'fruit_beer', 'wood_aged_beer', 'specialty_saison', 'specialty_smoked_beer',
  'spice_herb_or_vegetable_beer', 'alternative_fermentables_beer', 'winter_seasonal_beer']);
const etiketCoz = s => EK_ESLEME[s] || S2B[s] || null;

const say = {};
const inc = k => { say[k] = (say[k] || 0) + 1; };

// ══════════ AHA (AN şeması) ══════════
const mraw = JSON.parse(fs.readFileSync(path.join(KOK, 'working', '_an_madalya.json'), 'utf8'));
function htmlGuvenli(s) { return String(s || '').replace(/[<>&"'`]/g, ' '); }
function maltAdSadelestir(s) { return htmlGuvenli(s).replace(/\s*\((malt|grain|adjunct)\)\s*/ig, '').replace(/\s+/g, ' ').trim().slice(0, 34); }
function hopAdSadelestir(s) {
  return htmlGuvenli(s).split(',')[0].split('@')[0].split('(')[0].replace(/\s+[\d.]+\s*%?\s*a\.?\s*a\.?\s*$/i, '')
    .replace(/\s+(whole|leaf|plug|pellet|pelet)?\s*hops?\s*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 26);
}
function mayaSadelestir(s) { let t = htmlGuvenli(s).split('|')[0]; t = t.replace(/^\s*[\d.]+\s*(L|l|liter|qt|gal)\s*starter\s*/i, '').replace(/\s+/g, ' ').trim(); return t.slice(0, 48); }
function gristOzet(m) {
  const tot = (m.malts || []).reduce((s, x) => s + (+x.amount_kg || 0), 0); if (!(tot > 0)) return [];
  return (m.malts || []).map(x => ({ ad: maltAdSadelestir(x.name), pct: Math.round(100 * (+x.amount_kg || 0) / tot) })).filter(x => x.ad && x.pct >= 1)
    .sort((a, b) => b.pct - a.pct).slice(0, 5).map(x => [x.ad, x.pct]);
}
function hopOzet(m) {
  return (m.hops || []).filter(x => x && (x.alpha != null || x.time_min != null || x.use))
    .map(x => ({ ad: hopAdSadelestir(x.name), dk: (x.time_min == null ? null : Math.round(x.time_min)), use: String(x.use || '') }))
    .filter(x => x.ad && x.ad.length <= 24).slice(0, 4)
    .map(x => [x.ad, x.dk, x.use === 'dry_hop' ? 'kuru' : (x.use === 'whirlpool' ? 'whirlpool' : (x.use === 'first_wort' ? 'ilk şıra' : ''))]);
}
function introTemiz(m) { return String((m.aha_extra && m.aha_extra.introduction) || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '); }
function metinBilgi(t) {
  const yil = (t.match(/\b(19|20)\d{2}\b/) || [null])[0];
  const ent = (t.match(/out of\s+([\d,]+)\s+entr/i) || [])[1];
  const kat = (t.match(/Category\s*#?\s*\d+\s*[:\-]\s*([^.]*?)(?=\s+(?:with an?|during|in the|at the)\b|\.|$)/i) || [])[1];
  const ifade = (t.match(/\bwith an?\s+(.+?)(?=\s+(?:during|in the|at the)\b|\.|$)/i) || [])[1];
  return { yil: yil ? +yil : null, entries: ent ? +String(ent).replace(/,/g, '') : null, kat: kat ? kat.trim() : '', ifade: ifade ? ifade.trim() : '' };
}
const ahaByStil = new Map(), ahaYol = {};
mraw.forEach(m => {
  if (m.medal == null || !m.slug) { inc('aha_medalsiz'); return; }
  const t = introTemiz(m), mb = metinBilgi(t);
  // "with a X" yalnız stil adına benziyorsa (ör. "with a nice floral aroma" gibi düzyazıyı ele: çözücü bulamazsa ifade boş sayılır)
  const ifade = mb.ifade && W._bmOrnekAdBul(mb.ifade) ? mb.ifade : (mb.ifade && /\bwith\b/i.test(mb.ifade) ? mb.ifade : '');
  const ad = String(m.id || '').replace(/^aha_/, '').replace(/-/g, ' ');
  const malzeme = [].concat((m.malts || []).map(x => x.name), (m.hops || []).map(x => x.name), (m.misc || []).map(x => (x && (x.name || x)) || ''), [m.yeast || '']).join(' | ');
  const es = W._bmOrnekStilCoz({ kategori: mb.kat, ifade: ifade, ad: ad, malzeme: malzeme, etiketStil: etiketCoz(m.slug), etiketGenel: GENEL.has(m.slug), ozel: OZEL_ETIKET.has(m.slug) });
  if (!es || !BJCP[es.stil]) { inc('aha_eslesmedi'); return; }
  inc('aha_yol_' + es.yol);
  if (!ahaByStil.has(es.stil)) ahaByStil.set(es.stil, []);
  ahaByStil.get(es.stil).push({ m, mb, yol: es.yol });
});
const AHA = {};
[...ahaByStil.keys()].sort().forEach(ad => {
  const L = ahaByStil.get(ad);
  const sirali = L.slice().sort((a, b) => {
    const ma = +a.m.medal || 9, mb2 = +b.m.medal || 9; if (ma !== mb2) return ma - mb2;
    const tam = x => ((x.m.malts || []).length ? 1 : 0) + ((x.m.hops || []).length ? 1 : 0) + (x.m.yeast ? 1 : 0) + (x.m.ibu ? 1 : 0);
    if (tam(a) !== tam(b)) return tam(b) - tam(a);
    // AN sıralaması BİREBİR (altın → veri tamlığı → id): mevcut ilk örnekler ve indeksleri korunur, yeni kayıtlar arkaya eklenir
    return String(a.m.id).localeCompare(String(b.m.id));
  });
  const sec = sirali.filter(x => (x.m.malts || []).length).slice(0, MAX);
  if (!sec.length) return;
  const sayim = { 1: 0, 2: 0, 3: 0 }; L.forEach(x => { const k = +x.m.medal; if (sayim[k] != null) sayim[k]++; });
  AHA[ad] = [[L.length, sayim[1], sayim[2], sayim[3]], sec.map(x => {
    const o = { m: +x.m.medal, og: x.m.og || null, ib: x.m.ibu || null, sr: x.m.srm || null, ab: x.m.abv || null, g: gristOzet(x.m), h: hopOzet(x.m), y: mayaSadelestir(x.m.yeast), yil: x.mb.yil, e: x.mb.entries };
    if (x.yol !== 'etiket') o.es = x.yol; // stil eşleme yolu (etiket dışı: ifade/ozel/kategori/ad/semsiye) — şeffaflık
    return o;
  })];
});

// ══════════ NHC (AX şeması) ══════════
const ax = fs.readFileSync(path.join(KOK, 'working', '_ax_build_nhc.js'), 'utf8');
const axSl = (a, b) => { const i = ax.indexOf(a), j = ax.indexOf(b, i); if (i < 0 || j < 0) abort('AX dilim: ' + a); return ax.slice(i, j); };
// AX'in satır ayrıştırıcıları BİREBİR (deterministik birim çevirisi + kapılar)
const axCtx = vm.createContext({ Buffer, console });
vm.runInContext(axSl('const moj = ', '\n// ── 1. STİL EŞLEME') + '\n' + axSl('// ── 2. SATIR SINIFLANDIRMA', '\n// ── 3. TARAMA'), axCtx);
const AXE = vm.runInContext('({moj, temiz, satirlar, mayaMu, hopMu, katkiMu, fermMu, hopCoz, gristCoz, mayaCoz, specsCoz, mashCoz})', axCtx);
// AX'in alt-kategori eşleme tablosu (özgül etiketler) BİREBİR
const axEsl = vm.runInContext('(' + axSl('const STIL_ESLEME = {', '\n// hedeflerin hepsi').replace('const STIL_ESLEME = ', '').replace(/;\s*$/, '') + ')', vm.createContext({}));
// SPRINT ND5: katkı / tanınmayan satır SAYILMAZ, [ad, miktarMetni] olarak tutulur (K2/K3 biçimi). Yalnız OLGU: malzeme adı +
// kaynaktaki miktar metni. Talimat/yorum cümlesi GÖMÜLMEZ → adı çıkarılamayan satır ekN'de kalır. Su satırları (şebeke / RO /
// "filtered St. Paul water"…) malzeme kalemi değil, su profili notu → ne ek ne ekN (sayaç: su_satiri).
const EK_ENT = s => String(s || '').replace(/&#39;/g, "'").replace(/&#34;|&quot;/g, '"').replace(/&amp;/g, '&');
const EK_MIK = /^((?:\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:fl\.?\s*oz\.?|oz\.?|ounces?|lbs?\.?|pounds?|kg|g|grams?|ml|l|liters?|litres?|tsp\.?|tsb\.?|tbsp\.?|tbs\.?|t\.|cups?|c\.|qt|quarts?|gal\.?|gallons?|inch(?:es)?|tablets?|tabs?|capsules?|packets?|cans?|drops|cc|pinch(?:es)?)?(?:\s*\(\s*\d+(?:\.\d+)?\s*(?:kg|g|ml|l|liters?)\s*\))?)\s+(?=\S)/i;
const EK_SON_MIK = /\s*\(\s*(\d+(?:\.\d+)?\s*(?:kg|g|ml|l|liters?))\s*\)\s*$/i;
function ekSatirCoz(l) {
  const t = EK_ENT(l).replace(/\s+/g, ' ').trim();
  if (/\bwater\b/i.test(t) && !/\bin water\b/i.test(t)) return { su: true };
  if (/\bmicron\b|^forced co/i.test(t)) return { su: true }; // filtrasyon / zorla gazlama: malzeme değil, işlem notu
  let mik = '', ad = t; const m = EK_MIK.exec(t);
  if (m && !/^\d+(\.\d+)?%/.test(t)) { mik = m[1].trim(); ad = t.slice(m[0].length); }
  const s = EK_SON_MIK.exec(ad); if (s) { mik = (mik ? mik + ' ' : '') + '(' + s[1] + ')'; ad = ad.slice(0, s.index); }
  ad = htmlGuvenli(ad).replace(/\s+to (clarify|calrify)\b.*$/i, '').replace(/[,;.\s]+$/, '').replace(/\s+/g, ' ').trim();
  mik = htmlGuvenli(mik).replace(/\s+/g, ' ').trim();
  // cümle / talimat / yalnız oran ("4.1% a.a.") → ad çıkarılamaz
  if (!ad || ad.length > 80 || mik.length > 30 || /\.\s+[A-Z]/.test(ad) || /\b(until|about \d+ days)\b/i.test(ad) || /^(treat|use|add|forced|see)\b/i.test(ad) || !/[a-z]{3}/i.test(ad) || /^[\d.]+%/.test(ad)) return null;
  return [ad, mik];
}
// SPRINT ISK2 4: AX ayrıştırıcısının (BİREBİR alınır) kaçırdığı zaman yazımları — AYNI ham satırdan, yeni kazıma yok:
// "(60 min.)" / ", 0 min" / "(60)" / "(dry)" / "(steep)" / "(hop back)" / "(1st wort)" / "(mash hop)". Hiçbiri yoksa zaman null kalır (varsayım YOK).
function zamanEk(l, hp) {
  if (!hp || hp[2] != null) return hp; const s = String(l).toLowerCase(); let d = null;
  if (/1st wort|first wort|\bfwh\b/.test(s)) d = 'FWH';
  else if (/\bdry\b/.test(s)) d = 'kuru';
  else if (/hop ?back|\bsteep|whirl|flame ?out|knock ?out|hop ?stand/.test(s)) d = 'wp';
  else if (/\bmash\b/.test(s)) d = 'mash';
  else { const m = /(\d+(?:\.\d+)?)\s*min/.exec(s); if (m) d = Math.round(parseFloat(m[1])); else { const p = /\(\s*(\d{1,3})\s*\)\s*$/.exec(s); if (p) d = +p[1]; } }
  if (d == null) { inc('nhc_hop_zamansiz'); return hp; }
  inc('nhc_hop_zaman_ek_' + (typeof d === 'number' ? 'dk' : d)); hp = hp.slice(); hp[2] = d; return hp;
}
const db = new DatabaseSync(DB_YOL, { readOnly: true });
const rows = db.prepare('select * from recipes order by year desc, id').all();
const nhcByStil = new Map();
rows.forEach(r => {
  const stilHam = AXE.temiz(AXE.moj(r.style));
  if (!(stilHam in axEsl)) { inc('nhc_mead_cider_vb'); return; }
  const etiket = axEsl[stilHam];
  const ingTxt = AXE.moj(r.ingredients || '');
  const es = W._bmOrnekStilCoz({ kategori: stilHam, ad: AXE.moj(r.name || ''), malzeme: ingTxt, etiketStil: etiket, etiketGenel: !etiket });
  if (!es || !BJCP[es.stil]) { inc('nhc_eslesmedi'); return; }
  const sp = AXE.specsCoz(r.specs);
  const vmL = /\(([\d.]+)\s*L\)/i.exec(String(r.vol || ''));
  const L = vmL ? Math.round(parseFloat(vmL[1]) * 10) / 10 : null;
  if (!sp.og || !L) { inc('nhc_olcu_yok'); return; }
  const g = [], h = [], ek = []; let y = null, ekN = 0, dusur = false;
  const ekle = l => { const e = ekSatirCoz(l); if (e && e.su) { inc('nhc_su_satiri'); return; } if (e) { ek.push(e); inc('nhc_ek_adli'); } else { ekN++; inc('nhc_ek_adsiz'); } };
  AXE.satirlar(r.ingredients).forEach(l => {
    if (AXE.mayaMu(l)) { if (!y) y = AXE.mayaCoz(l); return; }
    if (AXE.hopMu(l)) { const hp = zamanEk(l, AXE.hopCoz(l)); if (hp) h.push(hp); else dusur = true; return; }
    if (AXE.katkiMu(l)) { ekle(l); return; }
    if (AXE.fermMu(l)) { const gr = AXE.gristCoz(l); if (gr) g.push(gr); else dusur = true; return; }
    ekle(l);
  });
  if (dusur || !g.length) { inc('nhc_kirpik'); return; }
  const kgL = g.reduce((a, x) => a + x[1], 0) / 1000 / L;
  if (kgL < 0.08 || kgL > 0.75) { inc('nhc_tutarsiz'); return; }
  const ms = AXE.mashCoz(r.instructions);
  const k = { yil: +r.year, L: L, og: sp.og };
  if (sp.fg) k.fg = sp.fg; if (sp.ab) k.ab = sp.ab; if (sp.ib) k.ib = sp.ib; if (sp.sr) k.sr = sp.sr;
  if (ms) k.ms = ms; k.g = g; if (h.length) k.h = h; if (y) k.y = y; if (ek.length) k.ek = ek; if (ekN) k.ekN = ekN;
  if (es.yol !== 'etiket') k.es = es.yol;
  inc('nhc_yol_' + es.yol);
  (nhcByStil.get(es.stil) || nhcByStil.set(es.stil, []).get(es.stil)).push(k);
});
const NHC = {};
[...nhcByStil.keys()].sort().forEach(bj => { const hepsi = nhcByStil.get(bj).sort((a, b) => b.yil - a.yil); NHC[bj] = [hepsi.length, hepsi.slice(0, MAX)]; });

// ══════════ KAPILAR ══════════
const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalisin', 'yapmalı', 'hatalı', 'hatali', 'yanlış', 'yanlis', 'olmalı', 'olmali', 'gerekir', 'gereklidir',
  'tavsiye', 'öneriyoruz', 'düzelt', 'duzelt', 'kötü', 'kotu', 'başarılı', 'basarili', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'dogrusu', 'eksik'];
[['AHA', AHA], ['NHC', NHC]].forEach(([ad, T]) => {
  const metin = JSON.stringify(T).toLocaleLowerCase('tr-TR');
  const ih = YASAK.filter(k => metin.includes(k)); if (ih.length) abort(ad + ' yasak kelime: ' + ih);
  let uzun = 0, kalip = 0;
  JSON.stringify(T, (kk, vv) => { if (typeof vv === 'string') { if (vv.length > 90) uzun++; if (/\b(ferment at|mash at|boil for|sparge with|rack to|pitch the)\b/i.test(vv)) kalip++; } return vv; });
  if (uzun || kalip) abort(ad + ' düzyazı sızıntısı: uzun ' + uzun + ' kalıp ' + kalip);
  const kNok = Object.keys(T).filter(k => !BJCP[k]); if (kNok.length) abort(ad + ' BJCP dışı anahtar: ' + kNok);
  if (Object.values(T).some(v => v[1].length > MAX || v[1].length < 1 || v[0] < v[1].length)) abort(ad + ' sayım/üst sınır tutarsız');
});
Object.values(AHA).forEach(v => { if (v[0][0] !== v[0][1] + v[0][2] + v[0][3]) abort('AHA madalya toplamı tutarsız'); });

// ══════════ ÇIKTI + ÖZET ══════════
const ahaJs = 'window._TOPLULUK_MADALYA = ' + JSON.stringify(AHA) + ';', nhcJs = 'window._NHC_MADALYA = ' + JSON.stringify(NHC) + ';';
fs.writeFileSync(path.join(CIKTI, '_cc_aha.js.txt'), ahaJs); fs.writeFileSync(path.join(CIKTI, '_cc_nhc.js.txt'), nhcJs);
if (!KURU) require('./_cc_veri_yaz.js').yaz([ahaJs, nhcJs]); else console.log('[--kuru] ornek_veri.js değiştirilmedi');
const kap = new Set([...Object.keys(AHA), ...Object.keys(NHC)]);
console.log('[sayaç]', JSON.stringify(say));
console.log('[AHA] stil=' + Object.keys(AHA).length + ' gömülü=' + Object.values(AHA).reduce((a, v) => a + v[1].length, 0) + ' (' + (ahaJs.length / 1024).toFixed(1) + ' KB)');
console.log('[NHC] stil=' + Object.keys(NHC).length + ' gömülü=' + Object.values(NHC).reduce((a, v) => a + v[1].length, 0) + ' (' + (nhcJs.length / 1024).toFixed(1) + ' KB)');
console.log('[K1 kapsam] ' + kap.size + '/239 stil');
fs.writeFileSync(path.join(CIKTI, '_cc_k1_kapsam.json'), JSON.stringify([...kap].sort()));
