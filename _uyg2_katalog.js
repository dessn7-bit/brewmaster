// ═══ SPRINT UYG2 — katalog düzeltmeleri (build-time, idempotent, ASSERT) ═══
//  3g: kaynaksız atanan GU değerleri için guTahmini bayrağı (Carafa Type 2 kabuklu, Dingemans debittered — UYG1).
//  4 : Kızıl Çavdar rengi — hititmalt.com/kizil-cavdar-malti-250-gr "EBC 490-500" (≈185–188 °L) → MALTLAR r:187 DOĞRU;
//      MUADIL metinlerindeki "~28°L" yanlıştı → kaynakla düzeltildi. Koyu candi açıklamasına Südzucker doğrulaması eklendi.
// Kullanım: node _uyg2_katalog.js --yaz
'use strict';
const fs = require('fs'), path = require('path');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html'), YAZ = process.argv.includes('--yaz');
let s = fs.readFileSync(HF, 'utf8'), n = 0;
function rep(ad, eski, yeni) { if (s.indexOf(yeni) >= 0) return; const k = s.split(eski).length - 1; if (k !== 1) { console.error('ABORT ' + ad + ': ' + k); process.exit(1); } s = s.split(eski).join(yeni); n++; }
const KZ = 'Kızıl Çavdar ~187°L (Hitit: EBC 490-500)';
rep('gu-carafa', '{id:"crf2_kabuklu",ad:"Carafa Type 2 (Weyermann, kabuklu)",gu:250,', '{id:"crf2_kabuklu",ad:"Carafa Type 2 (Weyermann, kabuklu)",gu:250,guTahmini:true,');
rep('gu-dingemans', '{id:"dingemans_black",ad:"Debittered Black Malt (Dingemans)",gu:250,', '{id:"dingemans_black",ad:"Debittered Black Malt (Dingemans)",gu:250,guTahmini:true,');
rep('sudzucker', '150–600 EBC (brouwland.com)', '150–600 EBC (brouwland.com/en/sugars/21016-sudzucker-candy-sugar-brown-25-kg.html — sayfa 2026-10-09\'da doğrulandı)');
rep('kz1', 'Normal Çavdar ~4°L sadece baharatlık. Kızıl Çavdar ~28°L baharatlık + amber renk.', 'Normal Çavdar ~4°L sadece baharatlık. ' + KZ + ' baharatlık + koyu kızıl/kahve renk (Hitit: amber biralarda %1–5). [UYG2 renk düzeltmesi]');
rep('kz2', 'Crystal 40 ~40°L saf karamel toffee. Kızıl Çavdar ~28°L daha açık ama çavdar baharatlığı. Rye IPA\'da baharatlık için Kızıl Çavdar. 1:1 gramaj,', 'Crystal 40 ~40°L saf karamel toffee. ' + KZ + ' çok daha koyu + çavdar baharatlığı — 1:1 kullanılırsa renk belirgin koyulaşır (Hitit: %1–5). Rye IPA\'da baharatlık için Kızıl Çavdar. [UYG2 renk düzeltmesi]');
rep('kz3', 'CaraMunich I ~40°L saf karamel. Kızıl Çavdar ~28°L çavdar baharatlığı + amber renk.', 'CaraMunich I ~40°L saf karamel. ' + KZ + ' çavdar baharatlığı + koyu kızıl/kahve renk (Hitit: %1–5). [UYG2 renk düzeltmesi]');
rep('kz4', 'detay:"Kızıl Çavdar ~28°L, amber/karamel + baharatlık.', 'detay:"' + KZ + ', koyu kızıl/kahve + baharatlık. [UYG2 renk düzeltmesi]');
rep('kz5', 'Kızıl Çavdar: çavdar baharatlığı + 28°L karamel. CaraMunich I: saf karamel, 40°L. CaraMunich I daha koyu ve daha belirgin karamel.', 'Kızıl Çavdar: çavdar baharatlığı + ~187°L (Hitit: EBC 490-500). CaraMunich I: saf karamel, ~35–40°L — Kızıl Çavdar çok daha koyu. [UYG2 renk düzeltmesi]');
if (/Kızıl Çavdar[^"]{0,12}28°L/.test(s)) { console.error('ABORT kalan 28°L'); process.exit(1); }
console.log('değişiklik ' + n);
if (YAZ) { fs.writeFileSync(HF, s); console.log('[yazıldı]'); }
