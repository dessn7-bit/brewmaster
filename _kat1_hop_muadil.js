// ═══ SPRINT KAT1 1b — KAYNAKLI HOP MUADIL (build-time, idempotent, ASSERT) ═══
// Yalnız birincil tedarikçi/üretici ikame listeleri: Hopsteiner çeşit veri sayfaları (pim.hopsteiner.de .../<kod>.pdf, "SUBSTITUTES")
// ve Charles Faram ürün sayfaları ("Substitutions"; site 522 verdiği için Wayback 2022 kopyaları). YCH "Similar varieties" karuseli
// ikame listesi DEĞİL → kullanılmadı. Kural (ND3 ile aynı): ✅ = birincil listede + alfa aralıkları örtüşür; listede ama alfa
// örtüşmüyor / çekinceli ("difficult… you could try") / yalnız ters yönde listeleniyorsa ⚠️. Kaynaksız giriş YOK; her giriş
// kaynak:{url, alinti} taşır (test: boş olamaz). Var olan girişte yalnız fark güncellenir + kaynak eklenir (detay korunur).
// Kullanım: node _kat1_hop_muadil.js --yaz
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html'), YAZ = process.argv.includes('--yaz');
const HS = k => 'https://pim.hopsteiner.de/api/v1/en/varieties/' + k + '.pdf';
const CF = (ts, slug) => 'https://web.archive.org/web/' + ts + '/https://www.charlesfaram.co.uk/product/' + slug + '/';
const T = '[KAT1 hop kaynak]';
// [hedef, ikame, işaret, gerekçe (alfa), url, alıntı]
const G = [
  ['cascade', 'centn', '⚠️', 'Hopsteiner ve Charles Faram Cascade ikamesi olarak Centennial\'ı listeler; alfa örtüşmez (Cascade %4,5–7 ↔ Centennial %9,5–11,5) — acılık satırında gram IBU ile ayarlanır.', HS('cas'), 'SUBSTITUTES BREWHOUSE Centennial Lemondrop · DRY HOPPING Centennial Lemondrop'],
  ['cascade', 'amarillo', '✅', 'Charles Faram iki yönde listeler (Cascade → Centennial, Amarillo; Amarillo → Cascade); alfa örtüşür (%5–9 ↔ %7–11).', CF('20220529082741', 'cascade'), 'Substitutions Centennial, Amarillo'],
  ['amarillo', 'cascade', '✅', 'Charles Faram Amarillo ikamesi olarak ilk sırada Cascade\'i listeler; alfa örtüşür (%7–11 ↔ %5–9).', CF('20220630023200', 'amarillo'), 'Substitutions Cascade, Admiral, Summit, Galena'],
  ['cascade', 'mandarina', '⚠️', 'Yalnız TERS yönde listelenir (Mandarina Bavaria sayfaları ikame olarak Cascade\'i verir); Cascade sayfaları Mandarina\'yı listelemez.', HS('mba'), 'SUBSTITUTES BREWHOUSE Cascade Lemondrop Perle Hallertauer Tradition (Mandarina Bavaria veri sayfası)'],
  ['cascade', 'huell_m', '⚠️', 'Yalnız TERS yönde ve çekinceli: Charles Faram Huell Melon için "kolay değil, Cascade denenebilir" der.', CF('20220630022029', 'huell-melon'), 'Substitutions Not easy to substitute, however, you can try Cascade'],
  ['willamette', 'fuggles', '✅', 'Hopsteiner ve Charles Faram Willamette ikamesi olarak Fuggle\'ı listeler; alfa örtüşür (%4,5–7 ↔ %3–6).', HS('wil'), 'SUBSTITUTES BREWHOUSE Fuggle Tettnanger Delta Bobek Contessa'],
  ['willamette', 'tettn', '✅', 'Hopsteiner ve Charles Faram Willamette ikamesi olarak Tettnanger\'ı listeler; alfa örtüşür (Willamette %4–7; Tettnanger katalog %4,5).', CF('20220528021836', 'willamette'), 'Substitutions Fuggles, Tettnang'],
  ['fuggles', 'willamette', '✅', 'Hopsteiner ve Charles Faram Fuggle ikamesi olarak Willamette\'i listeler; alfa örtüşür (%3–6 ↔ %4,5–7).', HS('fug'), 'SUBSTITUTES BREWHOUSE Styrian Golding (Celeia) Willamette Delta · DRY HOPPING Delta Willamette'],
  ['fuggles', 'styrian', '✅', 'Charles Faram Fuggle ikameleri arasında Styrian Golding\'i listeler; alfa örtüşür (%4–7 ↔ %2–4 Savinjski üst sınırda değil — Hopsteiner Savinjski %2,5–6).', CF('20200924021616', 'fuggles'), 'Substitutions French Fuggle, US Fuggle, Progress, Sovereign, Styrian Golding, Willamette'],
  ['fuggles', 'progress', '✅', 'Charles Faram Fuggle ikameleri arasında Progress\'i listeler; alfa örtüşür (Fuggle %4–7; Progress katalog %6,5).', CF('20200924021616', 'fuggles'), 'Substitutions French Fuggle, US Fuggle, Progress, Sovereign, Styrian Golding, Willamette'],
  ['styrian', 'fuggles', '✅', 'Hopsteiner (Styrian Savinjski Golding) ve Charles Faram ikame olarak Fuggle\'ı listeler; alfa örtüşür (%2,5–6 ↔ %3–6).', HS('ssg'), 'SUBSTITUTES BREWHOUSE Fuggle Styrian Golding (Celeia) · DRY HOPPING Fuggle Styrian Golding (Celeia)'],
  ['styrian', 'willamette', '✅', 'Charles Faram Savinjski Golding ikamesi olarak Willamette\'i listeler; alfa örtüşür (Hopsteiner Savinjski %2,5–6 ↔ Willamette %4,5–7).', CF('20220630010739', 'savinjski-golding'), 'Substitutions Fuggle, Willamette, Styrian Golding (Bobek)'],
  ['challenger', 'nbrewer', '✅', 'Charles Faram Challenger ikamesi olarak Northern Brewer\'ı listeler; alfa örtüşür (Challenger %5–9; Northern Brewer katalog %9).', CF('20220528022049', 'challenger'), 'Substitutions Northern Brewer, First Gold, Perle'],
  ['challenger', 'perle', '✅', 'Charles Faram Challenger ikamesi olarak Perle\'i listeler; alfa örtüşür (Challenger %5–9; Perle katalog %8).', CF('20220528022049', 'challenger'), 'Substitutions Northern Brewer, First Gold, Perle'],
  ['mosaic', 'citra', '✅', 'Charles Faram Mosaic ikamesi olarak Citra\'yı listeler (ND3\'te yalnız YCH "benzer" olduğu için ⚠️ idi — artık birincil ikame listesi var); alfa örtüşür (%10–14 ↔ Citra katalog %12).', CF('20220528015949', 'mosaic%C2%99'), 'Substitutions Citra'],
  ['galaxy', 'citra', '⚠️', 'Charles Faram çekinceyle listeler ("ikamesi zor, denenebilir").', CF('20220528011753', 'galaxy'), 'Substitutions Difficult to substitute, but you could try Citra®, Amarillo®, Centennial'],
  ['galaxy', 'amarillo', '⚠️', 'Charles Faram çekinceyle listeler ("ikamesi zor, denenebilir"); alfa örtüşmez (%13–15 ↔ %7–11).', CF('20220528011753', 'galaxy'), 'Substitutions Difficult to substitute, but you could try Citra®, Amarillo®, Centennial'],
  ['galaxy', 'centn', '⚠️', 'Charles Faram çekinceyle listeler ("ikamesi zor, denenebilir"); alfa örtüşmez (%13–15 ↔ %9,5–11,5).', CF('20220528011753', 'galaxy'), 'Substitutions Difficult to substitute, but you could try Citra®, Amarillo®, Centennial'],
  ['motueka', 'saaz', '⚠️', 'Charles Faram Motueka ikamesi olarak Saaz\'ı listeler (Motueka Saaz soyundan); alfa örtüşmez (%5–8 ↔ Saaz %2,5–3,5).', CF('20220528001316', 'motueka'), 'Substitutions Saaz'],
  ['idaho7', 'eldorado', '⚠️', 'Charles Faram Idaho 7 ikamesi olarak El Dorado\'yu listeler; alfa örtüşmez (%9–12 ↔ %13–17).', CF('20220627075242', 'idaho7'), 'Substitutions Calypso™, El Dorado®'],
  ['idaho7', 'calypso', '✅', 'Charles Faram Idaho 7 ikamesi olarak ilk sırada Calypso\'yu listeler; alfa örtüşür (%9–12 ↔ Calypso katalog %12).', CF('20220627075242', 'idaho7'), 'Substitutions Calypso™, El Dorado®'],
  ['waimea', 'columbus', '⚠️', 'Charles Faram Waimea ikamesi olarak Columbus\'u listeler; alfa katalog değeriyle örtüşmez (%16–19 ↔ Columbus %15).', CF('20220529085837', 'waimea'), 'Substitutions Columbus, NZ Pacific Jade™'],
  ['pac_gem', 'columbus', '✅', 'Charles Faram Pacific Gem ikamesi olarak Columbus\'u listeler; alfa örtüşür (%13–15 ↔ Columbus katalog %15).', CF('20220528011827', 'pacific-gem'), 'Substitutions Columbus, Fuggles'],
  ['pac_gem', 'fuggles', '⚠️', 'Charles Faram Pacific Gem ikamesi olarak Fuggles\'ı listeler; alfa örtüşmez (%13–15 ↔ %4–7).', CF('20220528011827', 'pacific-gem'), 'Substitutions Columbus, Fuggles']
];
module.exports = { G };
if (require.main === module) {
  let s = fs.readFileSync(HF, 'utf8'); const eol = s.indexOf('\r\n', s.indexOf('const MUADIL={')) === s.indexOf('\n', s.indexOf('const MUADIL={')) - 1 ? '\r\n' : '\n';
  const hb = s.indexOf('const HOPLAR=['); let d = 0, j = hb + 13; for (; j < s.length; j++) { if (s[j] === '[') d++; else if (s[j] === ']') { d--; if (!d) break; } }
  const H = vm.runInNewContext('(' + s.slice(hb + 13, j + 1) + ')'); const had = id => { const x = H.find(a => a && a.id === id); if (!x) { console.error('ABORT hop yok ' + id); process.exit(1); } return x.ad; };
  const q = v => JSON.stringify(v);
  let n = 0;
  G.forEach(([k, sub, isr, ger, url, al]) => {
    had(k); const ad = had(sub);
    const fark = isr + ' ' + ger + ' ' + T, kay = 'kaynak:{url:' + q(url) + ',alinti:' + q(al) + '}';
    const kb = s.indexOf('\n  "' + k + '":[', s.indexOf('const MUADIL={')); // yalnız MUADIL içinde (öncesinde aynı biçimli başka tablolar var)
    if (kb < 0) { // anahtar yoksa MUADIL başına ekle
      const m = s.indexOf('const MUADIL={') + 'const MUADIL={'.length;
      s = s.slice(0, m) + eol + '  "' + k + '":[' + eol + '    {id:"' + sub + '",ad:' + q(ad) + ',fark:' + q(fark) + ',detay:' + q(ger) + ',' + kay + '}' + eol + '  ],' + s.slice(m); n++; return;
    }
    // dizi ve giriş sınırları dize-duyarlı parantez eşlemesiyle (tek satırlık "k":[{...}] anahtarları da var)
    const esle = (p, ac, kp) => { let d = 0, str = false; for (let x = p; x < s.length; x++) { const c = s[x]; if (str) { if (c === '\\') x++; else if (c === '"') str = false; continue; } if (c === '"') str = true; else if (c === ac) d++; else if (c === kp) { d--; if (!d) return x; } } return -1; };
    const as = s.indexOf('[', kb), ae = esle(as, '[', ']'); if (ae < 0) { console.error('ABORT dizi sonu ' + k); process.exit(1); }
    const li = s.slice(as, ae).indexOf('{id:"' + sub + '",');
    if (li >= 0) {
      const a = as + li, b = esle(a, '{', '}'); let ent = s.slice(a, b + 1);
      if (ent.indexOf('kaynak:{url:') >= 0) return; // idempotent
      const fm = /fark:"((?:[^"\\]|\\.)*)"/.exec(ent); if (!fm) { console.error('ABORT fark yok ' + k + '→' + sub); process.exit(1); }
      ent = ent.replace(fm[0], () => 'fark:' + q(fark)); ent = ent.slice(0, -1) + ',' + kay + '}';
      s = s.slice(0, a) + ent + s.slice(b + 1); n++;
    } else {
      // dizinin SONUNA eklenir: mevcut (küratörlü) sıra aynı derecede önceliği korur — başa eklemek Cascade'in varsayılanını Centennial'dan Huell Melon'a çeviriyordu
      const yeniG = '{id:"' + sub + '",ad:' + q(ad) + ',fark:' + q(fark) + ',detay:' + q(ger) + ',' + kay + '}';
      let z = ae - 1; while (/\s/.test(s[z])) z--; const cok = /\n/.test(s.slice(z, ae));
      const ek = (s[z] === ',' ? '' : ',') + (cok ? eol + '    ' : '') + yeniG;
      s = s.slice(0, z + 1) + ek + s.slice(z + 1); n++;
    }
  });
  // doğrulama: MUADIL değerlendirilebilir, her G çifti kaynaklı tek giriş
  const mb = s.indexOf('const MUADIL={'); let dd = 0, jj = mb + 13; for (; jj < s.length; jj++) { if (s[jj] === '{') dd++; else if (s[jj] === '}') { dd--; if (!dd) break; } }
  const MU = vm.runInNewContext('(' + s.slice(mb + 13, jj + 1) + ')');
  G.forEach(([k, sub, isr]) => { const L = (MU[k] || []).filter(e => e.id === sub); if (L.length !== 1 || !L[0].kaynak || !L[0].kaynak.url || !L[0].kaynak.alinti || String(L[0].fark).trim().indexOf(isr) !== 0) { console.error('ABORT doğrulama ' + k + '→' + sub + ' ' + L.length); process.exit(1); } });
  console.log('değişiklik ' + n + ' / ' + G.length + ' çift');
  if (YAZ) { fs.writeFileSync(HF, s); console.log('[yazıldı]'); }
}
