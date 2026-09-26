// SPRINT BV — katalog alias alanını HTML'e göm + arama tüketicisini bağla (BUILD-TIME, tek seferlik).
// Girdi: working/_bv_alias_cikti.json (working/_bv_kapi.js'in PASS çıktısı; kaynak = _bv_alias_kaynak.js).
// ASSERT-ONCE: her hedef satır/desen TAM 1 kez eşleşmeli; tek FAIL = dosya YAZILMAZ.
'use strict';
const fs = require('fs'), vm = require('vm');
const DOSYA = __dirname + '/Brewmaster_v2_79_10.html';
const C = require('./working/_bv_alias_cikti.json');
let html = fs.readFileSync(DOSYA, 'utf8');
const hata = [];
const say = (s, alt) => s.split(alt).length - 1;

// ── 1. alias alanı: her katalog kaydının TEK satırına ,alias:[...] ekle ──
const BLOK = { malt: 'const MALTLAR=[', hop: 'const HOPLAR=[', maya: 'const MAYALAR=[' };
let eklenen = 0;
for (const tip of ['malt', 'hop', 'maya']) {
  const bas = html.indexOf(BLOK[tip]); if (bas < 0 || say(html, BLOK[tip]) !== 1) { hata.push(tip + ' blok başlangıcı 1 değil'); continue; }
  const son = html.indexOf('\n];', bas); if (son < 0) { hata.push(tip + ' blok sonu yok'); continue; }
  let blok = html.slice(bas, son);
  for (const [id, liste] of Object.entries(C[tip])) {
    const satirlar = blok.split('\n');
    const idx = satirlar.map((s, i) => s.includes('{id:"' + id + '",') ? i : -1).filter(i => i >= 0);
    if (idx.length !== 1) { hata.push(tip + ' ' + id + ': satır sayısı ' + idx.length); continue; }
    const s = satirlar[idx[0]];
    if (/\balias:/.test(s)) { hata.push(tip + ' ' + id + ': zaten alias var'); continue; }
    const m = /^(\s*)(\{id:"[^"]+",.*)\}(,?)(\s*(?:\/\/[^}]*)?)(\r?)$/.exec(s);
    if (!m) { hata.push(tip + ' ' + id + ': satır biçimi tanınmadı'); continue; }
    const yeni = m[1] + m[2] + ',alias:' + JSON.stringify(liste) + '}' + m[3] + m[4] + m[5];
    // doğrulama: yeni nesne ayrıştırılabiliyor, id aynı, alias aynı
    try {
      const o = vm.runInNewContext('(' + (m[2] + ',alias:' + JSON.stringify(liste) + '}') + ')');
      if (o.id !== id || JSON.stringify(o.alias) !== JSON.stringify(liste)) throw new Error('içerik');
    } catch (e) { hata.push(tip + ' ' + id + ': yeni nesne ayrıştırılamadı ' + e.message); continue; }
    satirlar[idx[0]] = yeni; blok = satirlar.join('\n'); eklenen++;
  }
  html = html.slice(0, bas) + blok + html.slice(son);
}

// ── 2. arama yardımcısı: MAYALAR bloğunun hemen ardına ──
const YARDIMCI_CAPA = 'const MAYALAR=[';
const capaI = html.indexOf(YARDIMCI_CAPA);
if (capaI < 0 || say(html, YARDIMCI_CAPA) !== 1) hata.push('yardımcı çapası 1 değil');
if (say(html, 'function _bmKatEsles(') !== 0) hata.push('_bmKatEsles zaten var (ikinci koşum?)');
const kapanis = html.indexOf('\n];', capaI);
const EOL = html.slice(kapanis - 1, kapanis) === '\r' ? '\r\n' : '\n';
const YARDIMCI = [
  '',
  '// ═══ SPRINT BV: katalog arama — ad + alias (KİMLİK eşanlamlıları) ═══',
  '// alias = "bu ham ad BU kaydı adlandırır" (ör. "hallertauer" → Hallertau Mittelfrueh). İKAME DEĞİL:',
  '// "liberty" Hallertau\'yu BULMAZ. Kaynak: _bv_alias_kaynak.js (V2/V3 tablolarının kimlik satırları +',
  '// 376K korpus frekansı, her satır korpusta görülmüş + renk/alfa/attenuation kapısından geçmiş).',
  '// ar: küçük harfe çevrilmiş arama terimi. Boş terim = eşleşir.',
  'function _bmKatEsles(x, ar){',
  '  if(!x) return false;',
  '  if(!ar) return true;',
  '  if(String(x.ad||\'\').toLowerCase().indexOf(ar)>=0) return true;',
  '  return Array.isArray(x.alias) && x.alias.some(function(a){ return a.indexOf(ar)>=0; });',
  '}'
].join(EOL);
if (!hata.length) {
  const sonNokta = kapanis + 3; // "\n];" sonrası
  html = html.slice(0, sonNokta) + YARDIMCI + html.slice(sonNokta);
}

// ── 3. arama noktaları (tam-ifade çapalı, her biri TAM 1 kez) ──
const DEGIS = [
  ['const hFlt=ar?HOPLAR.filter(h=>h.ad.toLowerCase().includes(ar)):HOPLAR;', 'const hFlt=ar?HOPLAR.filter(h=>_bmKatEsles(h,ar)):HOPLAR;'],
  ['const mFlt=ar?MALTLAR.filter(m=>m.ad.toLowerCase().includes(ar)):MALTLAR;', 'const mFlt=ar?MALTLAR.filter(m=>_bmKatEsles(m,ar)):MALTLAR;'],
  ['const myFlt=ar?MAYALAR.filter(m=>m.ad.toLowerCase().includes(ar)):MAYALAR;', 'const myFlt=ar?MAYALAR.filter(m=>_bmKatEsles(m,ar)):MAYALAR;'],
  ['const _hFlt=_sAr?HOPLAR.filter(h=>h.ad.toLowerCase().includes(_sAr)):HOPLAR;', 'const _hFlt=_sAr?HOPLAR.filter(h=>_bmKatEsles(h,_sAr)):HOPLAR;'],
  ['const _mFlt=_sAr?MALTLAR.filter(m=>m.ad.toLowerCase().includes(_sAr)):MALTLAR;', 'const _mFlt=_sAr?MALTLAR.filter(m=>_bmKatEsles(m,_sAr)):MALTLAR;'],
  ['const _myFlt=_sAr?MAYALAR.filter(m=>m.ad.toLowerCase().includes(_sAr)):MAYALAR;', 'const _myFlt=_sAr?MAYALAR.filter(m=>_bmKatEsles(m,_sAr)):MAYALAR;'],
  ['return ml&&ml.ad.toLowerCase().includes(arama);', 'return ml&&_bmKatEsles(ml,arama);'],
  ['return hp&&hp.ad.toLowerCase().includes(arama);', 'return hp&&_bmKatEsles(hp,arama);'],
  ['MAYALAR.filter(m=>m&&m.tip===tp&&(!myArama||m.ad.toLowerCase().includes(myArama)))', 'MAYALAR.filter(m=>m&&m.tip===tp&&(!myArama||_bmKatEsles(m,myArama)))'],
  ['return m&&m.tip===tip&&(!myArama||m.ad.toLowerCase().includes(myArama));', 'return m&&m.tip===tip&&(!myArama||_bmKatEsles(m,myArama));'],
  ["m&&(!mArama||((m.ad||'').toLowerCase().includes(mArama)||(m.mo||'').toLowerCase().includes(mArama)))&&", "m&&(!mArama||(_bmKatEsles(m,mArama)||(m.mo||'').toLowerCase().includes(mArama)))&&"],
  ['const _hFg=HOPLAR.filter(h=>h&&(!_hAr||h.ad.toLowerCase().includes(_hAr))&&(!_hKat||h.g===_hKat));', 'const _hFg=HOPLAR.filter(h=>h&&(!_hAr||_bmKatEsles(h,_hAr))&&(!_hKat||h.g===_hKat));'],
];
for (const [eski, yeni] of DEGIS) {
  const n = say(html, eski);
  if (n !== 1) { hata.push('arama noktası ' + n + ' kez: ' + eski.slice(0, 70)); continue; }
  html = html.replace(eski, () => yeni);
}

// ── 4. canlı type-ahead (_bmAramaCiz) + Enter kısayolları: ad eşleşmeleri ÖNCE (sc 0-2), alias SONRA (sc 3-5),
//       satırda "≈ eş ad" ipucu. _bmTrNorm (TR-normalize) ile aynı karşılaştırma.
const TRNORM_CAPA = 'function _bmTrNorm(s){';
const trI = html.indexOf(TRNORM_CAPA);
if (trI < 0 || say(html, TRNORM_CAPA) !== 1) hata.push('_bmTrNorm çapası 1 değil');
else {
  let trSon = html.indexOf('\n', trI);
  if (html[trSon - 1] === '\r') trSon--;           // satır sonunun ÖNÜNE ekle (CRLF korunur)
  const EK = [
    '',
    '// SPRINT BV: alias skoru (TR-normalize). Dönüş {sc,al} | null — sc 3 tam · 4 önek · 5 içerir (ad eşleşmesi 0-2 sonrası sıralanır).',
    'function _bmAliasSkor(x,nq){ if(!x||!nq||!Array.isArray(x.alias))return null; var best=null; for(var j=0;j<x.alias.length;j++){var a=x.alias[j];var na=_bmTrNorm(a);var s=na===nq?3:(na.indexOf(nq)===0?4:(na.indexOf(nq)>=0?5:-1));if(s>=0&&(!best||s<best.sc||(s===best.sc&&a.length<best.al.length)))best={sc:s,al:a};} return best; }',
    '// Enter kısayolu yedeği: ad eşleşmesi yoksa EN İYİ alias eşleşmesi (filtre opsiyonel).',
    'function _bmAliasIlk(liste,nq,filt){ var enI=null,enS=null; (liste||[]).forEach(function(x){ if(!x||(filt&&!filt(x)))return; var s=_bmAliasSkor(x,nq); if(s&&(!enS||s.sc<enS.sc||(s.sc===enS.sc&&s.al.length<enS.al.length))){enI=x;enS=s;} }); return enI; }'
  ].join(EOL);
  html = html.slice(0, trSon) + EK + html.slice(trSon);
}
const DEGIS2 = [
  ['var na=_bmTrNorm(nm);var sc=-1;if(na===nq)sc=0;else if(na.indexOf(nq)===0)sc=1;else if(na.indexOf(nq)>=0)sc=2;if(sc<0)continue;arr.push({it:it,sc:sc,len:na.length,nm:nm});}',
   'var na=_bmTrNorm(nm);var sc=-1,al=null;if(na===nq)sc=0;else if(na.indexOf(nq)===0)sc=1;else if(na.indexOf(nq)>=0)sc=2;if(sc<0){var _as=_bmAliasSkor(it,nq);if(_as){sc=_as.sc;al=_as.al;}}if(sc<0)continue;arr.push({it:it,sc:sc,len:na.length,nm:nm,al:al});}'],
  ["+cfg.sat(o.it)+'</div>';}).join('');",
   "+cfg.sat(o.it)+(o.al?'<span class=\"bm-arama-es\" style=\"flex-basis:100%;font-size:10px;line-height:1.2;color:var(--dim);margin-top:-4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">≈ '+esc(o.al)+'</span>':'')+'</div>';}).join('');"],
  // alias satırı: ipucu İKİNCİ satıra sarsın (aynı satırda ad'ı tek harfe indiriyordu — 360 px görsel denetimi);
  // ipucusuz satırların düzeni AYNEN (flex-wrap yalnız o.al varken)
  ['style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border-bottom:1px solid var(--bor)"',
   'style="display:flex;align-items:center;gap:8px;\'+(o.al?\'flex-wrap:wrap;\':\'\')+\'padding:7px 10px;cursor:pointer;border-bottom:1px solid var(--bor)"'],
  ['const _m=MALTLAR.find(x=>x&&_bmTrNorm(x.ad).includes(_nq));', 'const _m=MALTLAR.find(x=>x&&_bmTrNorm(x.ad).includes(_nq))||_bmAliasIlk(MALTLAR,_nq);'],
  ['const _m=MAYALAR.find(x=>x&&_bmTrNorm(x.ad).includes(_nq));', 'const _m=MAYALAR.find(x=>x&&_bmTrNorm(x.ad).includes(_nq))||_bmAliasIlk(MAYALAR,_nq);'],
  ['const _h=HOPLAR.find(x=>x&&x.ad.toLowerCase().includes(q)&&(!_k||x.g===_k));', 'const _h=HOPLAR.find(x=>x&&x.ad.toLowerCase().includes(q)&&(!_k||x.g===_k))||_bmAliasIlk(HOPLAR,_bmTrNorm(q),function(x){return !_k||x.g===_k;});'],
];
for (const [eski, yeni] of DEGIS2) {
  const n = say(html, eski);
  if (n !== 1) { hata.push('type-ahead noktası ' + n + ' kez: ' + eski.slice(0, 80)); continue; }
  html = html.replace(eski, () => yeni);
}

if (hata.length) { console.error('[BV ENJEKTE ABORT] ' + hata.length + ' hata — dosya YAZILMADI:\n  ' + hata.join('\n  ')); process.exit(1); }
fs.writeFileSync(DOSYA, html);
console.log('[BV ENJEKTE] alias eklenen kayıt=' + eklenen + ' (beklenen ' + (Object.keys(C.malt).length + Object.keys(C.hop).length + Object.keys(C.maya).length) + ') · filtre noktası=' + DEGIS.length + ' · type-ahead noktası=' + DEGIS2.length + ' · yardımcı=3');
