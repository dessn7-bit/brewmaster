// SPRINT BX — ikame paneli + muadilSec tek-yol düzenlemesi + BM_AI şema parametresi + BX4. ASSERT-ONCE; tek FAIL = yazım YOK.
// Kaynaklar: working/_bx_degistir.js (muadilSec dönüşüm bloğu), working/_bx_modul.js (ikame paneli).
'use strict';
const fs = require('fs');
const DOSYA = __dirname + '/Brewmaster_v2_79_10.html';
let html = fs.readFileSync(DOSYA, 'utf8');
const EOL = html.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const oku = f => fs.readFileSync(__dirname + '/working/' + f, 'utf8').replace(/\r?\n/g, EOL).replace(/\s+$/, '');
const hata = [];
const say = (s, a) => s.split(a).length - 1;
const L = (...satirlar) => satirlar.join(EOL);
function degis(ad, eski, yeni){ const n = say(html, eski); if (n !== 1) { hata.push(ad + ': çapa ' + n + ' kez'); return; } html = html.replace(eski, () => yeni); }
if (say(html, 'function _muadilDegistir(') !== 0) hata.push('BX zaten uygulanmış');

// 1. _muadilDegistir — muadilSec'in dönüşüm bloğu (aynen), "let _muadilSonDegis" satırının ÖNÜNE
degis('muadilDegistir', 'let _muadilSonDegis=null;', oku('_bx_degistir.js') + EOL + 'let _muadilSonDegis=null;');

// 2. muadilSec: dönüşüm bloğu → _muadilDegistir(S, …, el.dataset.idx) çağrısı (davranış aynı + isteğe bağlı satır indeksi)
const m2 = /(window\.muadilSec=function\(el\)\{\r?\n[^\n]*\r?\n[^\n]*\r?\n[^\n]*\r?\n  let ok=false, adi='';\r?\n  try \{\r?\n)    if\(kat==='malt'\)\{[\s\S]*?\r?\n(  \} catch\(e\)\{ console\.error\('muadilSec',e\); \})/;
const e2 = html.match(new RegExp(m2.source, 'g')) || [];
if (e2.length !== 1) hata.push('muadilSec gövdesi ' + e2.length + ' kez');
else html = html.replace(m2, (x, bas, son) => bas + L(
  "    // SPRINT BX: dönüşüm _muadilDegistir'de (ikame önizlemesi AYNI fonksiyonu S'nin klonunda çağırır)",
  "    const _d=_muadilDegistir(S,kat,src,tgt,mik,birim,el.dataset.idx);",
  "    if(_d.ok){ _muadilSonDegis=_d.kayit; adi=_d.adi; ok=true; }") + EOL + son);

// 3. ikame paneli modülü — muadilGeriAl'ın ardına
degis('geriAlSonu', L("    flash('↶ Önceki hale dönüldü','ok');", "    render();", "  } catch(e){ flash('⚠️ Geri alınamadı','err'); }", "};"),
  L("    flash('↶ Önceki hale dönüldü','ok');", "    render();", "  } catch(e){ flash('⚠️ Geri alınamadı','err'); }", "};") + EOL + oku('_bx_modul.js'));

// 4. editör satırları: "↔ Muadil:" etiketi → görünür "🔁 Yoksa ne kullanırım?" düğmesi (HER satırda, aday olmasa da);
//    çipler toast yerine paneli o adayın önizlemesiyle açar
for (const [tip, dz, ix] of [['malt', '_muadilM', 'm'], ['hop', '_muadilH', 'h']]) {
  const eski = L(
    '      ${' + dz + '.length>0?`<div class="bm-muadil-inline" data-bm-muadil-' + tip + '="${esc(' + ix + '.id)}">',
    '        <span class="bm-muadil-inline-label">↔ Muadil:</span>',
    '        ${' + dz + ".map(mu=>`<span class=\"bm-muadil-inline-chip\" data-muadil-id=\"${esc(mu.id)}\" onclick=\"bmToast(this.dataset.muadilTip,'info')\"");
  const yeni = L(
    '      ${`<div class="bm-muadil-inline" data-bm-muadil-' + tip + '="${esc(' + ix + '.id)}">',
    "        <button type=\"button\" class=\"bm-ikame-btn\" data-kat=\"" + tip + "\" onclick=\"bmIkameAc('" + tip + "',${i})\">🔁 Yoksa ne kullanırım?</button>",
    '        ${' + dz + ".map(mu=>`<span class=\"bm-muadil-inline-chip\" data-muadil-id=\"${esc(mu.id)}\" onclick=\"bmIkameAc('" + tip + "',${i},this.dataset.muadilId)\"");
  const n = say(html, eski);
  if (n !== 1) { hata.push(tip + ' satır bloğu ' + n + ' kez'); continue; }
  const bas = html.indexOf(eski);
  const kap = html.indexOf(EOL + '      </div>`:\'\'}', bas);
  if (kap < 0 || kap - bas > 1200) { hata.push(tip + ' blok kapanışı bulunamadı'); continue; }
  html = html.slice(0, bas) + yeni + html.slice(bas + eski.length, kap) + EOL + '      </div>`}' + html.slice(kap + (EOL + '      </div>`:\'\'}').length);
}

// 5. maya sekmesi: seçili maya kartının başlığına düğme
degis('maya', L(
  '      <div style="font-size:15px;font-weight:700;color:var(--kahve)">${maya.ad}</div>',
  '      <span style="font-size:var(--fs-xs);background:${mayaRenk(maya.tip)}22;color:${mayaRenk(maya.tip)};padding:2px 7px;border-radius:3px;font-weight:700;letter-spacing:.4px">${mayaKisaTip(maya.tip)}</span>'),
  L(
  '      <div style="font-size:15px;font-weight:700;color:var(--kahve)">${maya.ad}</div>',
  '      <span style="font-size:var(--fs-xs);background:${mayaRenk(maya.tip)}22;color:${mayaRenk(maya.tip)};padding:2px 7px;border-radius:3px;font-weight:700;letter-spacing:.4px">${mayaKisaTip(maya.tip)}</span>',
  "      <button type=\"button\" class=\"bm-ikame-btn\" data-kat=\"maya1\" onclick=\"bmIkameAc('maya1',0)\" style=\"margin-left:auto\">🔁 Yoksa ne kullanırım?</button>"));

// 6. CSS: düğme (44 px dokunma hedefi — BJ1/BJ2 kuralı)
degis('css', '.bm-muadil-inline-chip:hover{background:var(--kahve-light);border-color:var(--vintage)}',
  '.bm-muadil-inline-chip:hover{background:var(--kahve-light);border-color:var(--vintage)}' + EOL +
  '.bm-ikame-btn{min-height:44px;padding:6px 12px;border-radius:22px;border:1.5px solid var(--bakir);background:var(--bg-card);color:var(--bakir);font-weight:700;font-size:12px;cursor:pointer;font-family:var(--font-body);white-space:nowrap}' + EOL +
  '.bm-ikame-btn:hover{background:var(--kahve-bg)}');

// 7. BM_AI: kullanım başına yanıt şeması + yapılandırılmış veri (veri) + yasak taraması TÜM metin alanlarında
degis('istekKur', 'function istekKur(kullanim, baglam, soru){', 'function istekKur(kullanim, baglam, soru, sema){');
degis('format', "messages: [{ role: 'user', content: String(soru || '') }], output_config: { format: SEMA } } };",
  "messages: [{ role: 'user', content: String(soru || '') }], output_config: { format: sema || SEMA } } };");
degis('sorIstek', 'try { ist = istekKur(p.kullanim, p.baglam, p.soru); }', 'try { ist = istekKur(p.kullanim, p.baglam, p.soru, p.sema); }');
degis('ikameMax', "ikame:  { model: 'ucuz',    maxTokens: 800,  onbellek: false },",
  "ikame:  { model: 'ucuz',    maxTokens: 1200, onbellek: false }, // BX: en çok 7 aday × 1-2 cümle; kesilen JSON = kaynaksız cevap");
degis('cevapCozParse', L(
  "    try { var o = JSON.parse(metin); cevap = String(o.cevap || ''); kaynak = (o.kaynak === 'tablo' || o.kaynak === 'genel') ? o.kaynak : null; }",
  "    catch(e){ cevap = metin; }"), L(
  "    var veri = null;",
  "    try { veri = JSON.parse(metin); cevap = String(veri.cevap || veri.not || ''); kaynak = (veri.kaynak === 'tablo' || veri.kaynak === 'genel') ? veri.kaynak : null; }",
  "    catch(e){ veri = null; cevap = metin; }"));
degis('cevapCozYasak', '    var y = yasakTara(cevap);',
  "    var y = yasakTara(veri ? dizeler(veri).join(' \\n ') : cevap); // BX: şemalı yanıtta TÜM metin alanları (neden, not…) taranır");
degis('cevapCozDonus', '    return { cevap: cevap, kaynak: kaynak, bayraklar: bayrak };',
  '    return { cevap: cevap, kaynak: kaynak, bayraklar: bayrak, veri: veri };');
degis('dizeler', '  function yasakTara(metin){',
  "  function dizeler(o){ var out = []; (function gez(x, k){ if (typeof x === 'string') { if (k !== 'kaynak' && k !== 'id') out.push(x); } else if (Array.isArray(x)) x.forEach(function(v){ gez(v, k); }); else if (x && typeof x === 'object') Object.keys(x).forEach(function(kk){ gez(x[kk], kk); }); })(o, ''); return out; }" + EOL +
  '  function yasakTara(metin){');
degis('sorVeri', "          return { ok: true, cevap: c.cevap, kaynak: c.kaynak, bayraklar: c.bayraklar,",
  "          return { ok: true, cevap: c.cevap, kaynak: c.kaynak, bayraklar: c.bayraklar, veri: c.veri,");

// 8. BX4: bağlantı testi başarılı → durum satırı YERİNDE "✓ doğrulandı" (render yok: sonuç kutusu korunur)
degis('bx4kart', "((d && d.durum === 'ok') ? ' · son istek başarılı' : ' · henüz doğrulanmadı — bağlantı testini çalıştır')",
  "((d && d.durum === 'ok') ? ' · ✓ doğrulandı' : ' · henüz doğrulanmadı — bağlantı testini çalıştır')");
degis('bx4test', '    var m = r.maliyet;' + EOL + '    var bayrakHTML',
  "    var _ds = document.querySelector('#bm-ai-kart .bm-ai-durum'); // BX4: eski \"henüz doğrulanmadı\" metni kalmasın" + EOL +
  "    if (_ds) { _ds.dataset.durum = 'ok'; _ds.textContent = '🔑 Anahtar kayıtlı: ' + window.BM_AI.sonDort(window.BM_AI.anahtarAl()) + ' · ✓ doğrulandı'; }" + EOL +
  '    var m = r.maliyet;' + EOL + '    var bayrakHTML');

if (hata.length) { console.error('[BX ENJEKTE ABORT] dosya YAZILMADI:\n  ' + hata.join('\n  ')); process.exit(1); }
fs.writeFileSync(DOSYA, html);
console.log('[BX ENJEKTE] tamam');
