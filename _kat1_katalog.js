// ═══ SPRINT KAT1 — MUADIL renk metinleri (üretici veri sayfasıyla) + hop MUADIL (kaynaklı) + doz düzeltmeleri (build-time, idempotent, ASSERT) ═══
// Renk çevirisi TEK formül: °L = (EBC × 0,508 + 0,76) / 1,3546 (Weyermann'ın kendi °L değerleriyle uyumlu; ör. 90 EBC → 34,3 °L,
// Weyermann CaraMunich I "80,0 – 100,0 EBC / 30.6 – 38.2 Lovibond"). Briess değerleri SRM = °L olarak doğrudan (Briess "60L" = "60 SRM").
// Kaynaklar (KAT1 raporunda alıntılı): weyermann.de ürün sayfaları (CaraMunich 1/2/3, CaraHell, CaraRed, Munich 1/2),
// brewingwithbriess.com Caramel 60L/80L PISB, dingemansmout.be (Special B, Aromatic), hititmalt.com (Karamela, Koyu Kahve,
// Koyu Kristal, Reddish, Münih). Her durumda KATALOG değeri veri sayfasıyla uyumlu, METİN yanlıştı → yalnız metin düzeltildi;
// yanlış renge dayanan iki ✅ gerekçesi ⚠️'e indirildi.
// Kullanım: node _kat1_katalog.js --yaz
'use strict';
const fs = require('fs'), path = require('path');
const HF = path.join(__dirname, 'Brewmaster_v2_79_10.html'), YAZ = process.argv.includes('--yaz');
let s = fs.readFileSync(HF, 'utf8'), n = 0;
// hepsi (kac adet bekleniyor) — yeni metin zaten varsa ve eski yoksa atla (idempotent)
function rep(ad, eski, yeni, kac) { if (eski === yeni || s.indexOf(yeni) >= 0) return; /* yeni metin zaten varsa (idempotent; yeni eskiyi önek içerse de) */ const k = s.split(eski).length - 1; if (k !== (kac || 1)) { console.error('ABORT ' + ad + ': ' + k + ' (beklenen ' + (kac || 1) + ')'); process.exit(1); } s = s.split(eski).join(yeni); n += k; }
const E = ' [KAT1 renk düzeltmesi]';
// 1) Crystal etiketlerinde yanlış eşitleme (CaraMunich I = 34 °L, CaraHell ≈ 10 °L — Weyermann)
rep('c60', 'Crystal 60 / CaraMunich I (GU 296, 60°L)', 'Crystal 60 (GU 296, 60°L)', 5);
rep('c80', 'Crystal 80 / CaraMunich I (GU 289, 80°L)', 'Crystal 80 (GU 289, 80°L)', 2);
rep('c20', 'Crystal 20 / CaraHell (GU 293, 20°L)', 'Crystal 20 (GU 293, 20°L)', 6);
// 2) Koyu Kristal ≠ CaraMunich II → ✅ gerekçesi yanlış renge dayanıyordu
rep('kk-fark', '{id:"cara_munich2",ad:"CaraMunich II (Weyermann)",fark:"✅ CaraMunich II ile özdeş profil.",detay:"Koyu Kristal EBC 60-80 = CaraMunich II (~60°L) aralığı.',
  '{id:"cara_munich2",ad:"CaraMunich II (Weyermann)",fark:"⚠️ CaraMunich II (110–130 EBC ≈ 46 °L, Weyermann) Koyu Kristal\'den (60–80 EBC ≈ 27 °L, Hitit) belirgin koyu — 1:1 renk koyulaşır.' + E + '",detay:"Koyu Kristal EBC 60-80 (≈27 °L, hititmalt.com) — CaraMunich II 110–130 EBC (≈46 °L, weyermann.de); renkçe CaraMunich I (80–100 EBC ≈ 34 °L) daha yakın.');
// 3) CaraRed ≈ 19 °L (Weyermann 40–60 EBC); Crystal 60 ✅ gerekçesi yanlış renge dayanıyordu
rep('cr-fark', 'fark:"✅ Crystal 60 — CaraRed (~45°L) ile en yakın SRM match. Eşit gramaj."', 'fark:"⚠️ Crystal 60 (Briess 60 SRM) CaraRed\'den (Weyermann 40–60 EBC ≈ 19 °L) çok daha koyu — eşit gramajda renk koyulaşır.' + E + '"');
rep('cr-metin', 'CaraRed ~45°L', 'CaraRed ~19°L (Weyermann 40–60 EBC)', 2);
// 4) Special B 115 °L (Dingemans: "Colour EBC: 300", "Lovibond: 115,00")
rep('specb', 'Special B (~155°L): Belcika koyu karamel.', 'Special B (115°L; Dingemans 300 EBC): Belcika koyu karamel.' + E);
// 5) Aromatic 20 °L (Dingemans: "Colour EBC: 50", "Lovibond: 20,00")
rep('arom', 'Aromatic GU ~278, ~35°L.', 'Aromatic GU ~278, ~20°L (Dingemans 50 EBC).' + E);
rep('munich', 'Munich ~9°L', 'Munich ~6°L (Weyermann Type 1 12–18 EBC)', 2); // önce: aşağıdaki Dark Munich düzeltmesi bu deseni yeniden üretir
// 6) Dark Munich ≈ 9 °L (Weyermann Munich Type 2: "20,0 – 25,0 EBC 8.0 – 9.9 Lovibond")
rep('dmun', 'Dark Munich 25°L + ekmek/karamel.', 'Dark Munich ~9°L (Weyermann Munich Type 2: 20–25 EBC) + ekmek/karamel.' + E);
// 7) Reddish ≈ 12 °L (Hitit "Renk: 28-32 EBC"), Munich ≈ 6 °L (Weyermann Type 1 12–18 EBC; Hitit Münih 15–16 EBC)
rep('reddish', 'Reddish ~8°L', 'Reddish ~12°L (Hitit 28–32 EBC)', 6);

// 8) EBC → °L çevirisi hataları (metin SRM'yi °L sanmıştı)
rep('kar1', 'Karamela Arpa EBC 265-310 (~145°L).', 'Karamela Arpa EBC 265-310 (≈100–117°L).' + E);
rep('kar2', 'Karamela Arpa EBC 265-310 (~135-158°L).', 'Karamela Arpa EBC 265-310 (≈100–117°L).' + E);
rep('kka', 'EBC 600-750 (~340°L)', 'EBC 600-750 (≈227–282°L)', 2);
// ── KAT1 4: katkı doz düzeltmeleri (açılan kaynak alıntıları KAT1 raporunda) ──
const D = ' [KAT1 doz]';
rep('d-lav', 'acik:"Saison ve witbier\\\'de egzotik Akdeniz karakteri. 1-3g/10L (BYO: 0.25-0.5 oz/5 gal). Çok az kullanın, hakimdir."', 'acik:"Saison ve witbier\\\'de egzotik Akdeniz karakteri. 0,05–1,5 g/L; tipik 0,3–0,75 g/L (BYO Hippie Farm: 1 g/19 L; AHA forumu: 0,25–1 oz/5 gal, en çok 1 oz/5 gal). Çok az kullanın, hakimdir.' + D + '"');
rep('d-lav2', '{id:"lavanta",ad:"Lavanta (Kuru Çiçek)",g:"Aroma",gu:0,fermente:false,ibu_dk60:0.01,srm:0,etki:"Çiçeksi, parfümsü, provançal aroma"', '{id:"lavanta",ad:"Lavanta (Kuru Çiçek)",g:"Aroma",gu:0,fermente:false,ibu_dk60:0.01,srm:0,etki:"Çiçeksi, parfümsü, provançal aroma"');
rep('d-lav3', 'tags:["Çiçek", "Lavender", "Saison", "Delicate"],varsayDozgL:1,maxDozgL:2,', 'tags:["Çiçek", "Lavender", "Saison", "Delicate"],varsayDozgL:0.5,maxDozgL:1.5,');
rep('d-vis', 'acik:"Viski aroması emdirilmiş. 5-10g/10L. 1-3 hafta soğukta."', 'acik:"Viski aroması emdirilmiş. 1,5–3 g/L (MoreBeer meşe cipsi: 1–2 oz/5 gal; viski fıçısı cipsi 2–4 oz/5 gal = 3–6 g/L). 1-3 hafta soğukta.' + D + '"');
rep('d-vis2', 'tags:["Meşe", "Viski", "Whisky", "Barrel"],varsayDozgL:3,maxDozgL:5,', 'tags:["Meşe", "Viski", "Whisky", "Barrel"],varsayDozgL:2,maxDozgL:5,');
rep('d-spi', 'acik:"Chip ve cubelara göre daha kolay dozaj. 3-8g/10L (1 küçük spiral ≈7g). American veya French oak seçin."', 'acik:"Chip ve cubelara göre daha kolay dozaj. Üreticiler ADET ile dozlar: 1 büyük spiral / ~11 L (Craft a Brew: 5–6 gal için 2 spiral), The Barrel Mill 9\\" spiral: 6 adet / 53 gal varil. Gram karşılığı kaynakta yok — g/L alanları doğrulanmadı. American veya French oak seçin.' + D + '"');
rep('d-spi2', '"Ahşap", "Strong"],varsayDozgL:0.1,maxDozgL:0.5,', '"Ahşap", "Strong"],varsayDozgL:0.1,maxDozgL:0.5,dozDogrulanmadi:true,');
rep('d-tam', 'acik:"Gose ve egzotik sour biralar için. 20-60g/10L (konsantre macun)."', 'acik:"Gose ve egzotik sour biralar için. Konsantre: ~4 g/L (Faculty Brewing: 5 oz / 10 gal); pulp/blok formu daha yüksek (AHA forumu: 5 g – 2 lb / 5 gal).' + D + '"');
rep('d-tam2', '"Sour", "Tropical"],varsayDozgL:15,maxDozgL:40,', '"Sour", "Tropical"],varsayDozgL:4,maxDozgL:8,');
rep('d-isi', 'acik:"Vegan değil. Çok etkili berraklaşma sağlar. 5-10 mL/10L (hazır finings sıvısı)."', 'acik:"Vegan değil. Çok etkili berraklaşma sağlar. Hazır (RFU) izinglas: 4–14 mL/L (Murphy & Son TDS; Lallemand: fıçı birası için 3–4 pint/varil ≈ 10–14 mL/L). Ev tipi konsantre ürünlerde doz çok daha düşüktür — paketteki dozu esas al; g/L alanları formu belirsiz olduğu için doğrulanmadı.' + D + '"');
rep('d-isi2', 'tags:["Berraklaştırıcı", "Fish", "Ale", "UK"],varsayDozgL:0.1,maxDozgL:0.5,', 'tags:["Berraklaştırıcı", "Fish", "Ale", "UK"],varsayDozgL:0.1,maxDozgL:0.5,dozDogrulanmadi:true,');
rep('d-gop', '1-2g/10L ezerek ekle. Kahve değirmeninde kabaca kırılır."', 'Çok güçlü: ~0,04–0,15 g/L (BYO Saison in Paradise klonu: 0,69 g / 19 L). Ezerek ekle; kahve değirmeninde kabaca kırılır.' + D + '"');
rep('d-gop2', 'tags:["Baharat", "Paradise", "Saison", "Pepper"],varsayDozgL:1.5,maxDozgL:3,', 'tags:["Baharat", "Paradise", "Saison", "Pepper"],varsayDozgL:0.1,maxDozgL:0.2,');
rep('d-faa2', 'tags:["Enzim", "Alfa Amilaz", "Brut", "Attenüasyon"],varsayDozgL:1,maxDozgL:3,', 'tags:["Enzim", "Alfa Amilaz", "Brut", "Attenüasyon"],varsayDozgL:0.03,maxDozgL:0.08,');
rep('d-faa', 'Doz: 0.5-2 mL/L sıvı veya 0.5-2 g/hL toz.', 'Doz: fermentasyonda 1–4 g/hL (1,2–4,8 mL/hL ≈ 0,012–0,048 mL/L; BSG Amylase Enzyme Formula), mayşede 0,2–1 g/kg tahıl (BSG); Lallemand Alphamylase FA: attenüasyon için 20–75 ppm. Eski metindeki 0.5-2 mL/L değeri ~50× yüksekti.' + D);

// kalıntı denetimi
['CaraMunich I (GU 296, 60°L)', 'CaraMunich I (GU 289, 80°L)', 'CaraHell (GU 293, 20°L)', 'CaraRed ~45°L', 'CaraRed (~45°L)', 'Special B (~155°L', '~35°L', 'Dark Munich 25°L', 'Reddish ~8°L', '(~145°L)', '(~340°L)']
  .forEach(k => { if (s.indexOf(k) >= 0 && k !== '~35°L') { console.error('ABORT kalan: ' + k); process.exit(1); } });
module.exports = {};
console.log('değişiklik ' + n);
if (YAZ) { fs.writeFileSync(HF, s); console.log('[yazıldı]'); }
