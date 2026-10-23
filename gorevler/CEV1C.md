SPRINT CEV1C (CEV1B 5e0e629 uzerine, SW v131-515) — KUCUK DUZELTMELER, CEV GERCEK KOSUSUNDAN ONCE. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 5 numarali madde var. Ise baslamadan 5'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (CEV1B, canli kod, 2026-10-24): md5 canli = yerel (341787dc…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-515, APP_VERSION v2.79.10. tests/cev_seti.json'a dokunulmamis.
- YON: Claude held-out 35 yeni dogal istek (cok acı olmus, acısı yetersiz, hop acılıgını hafiflet, acılık eksik kalmıs, cok acık renkli oldu, koyulugu fazla, sulu olmus, cok agır icimli, gövdesi fazla, kurulugu azalsın, tatlılıgı artsın, fazla kuru …) -> YANLIS YON 0; belirsizler iki cip. KABUL.
- KURUM SAYIMI: admin.lallemandbrewing + lallemandbrewing = 1, blog.whitelabs + whitelabs = 1, OCB sozluk + OCB dergi = 1 (dogru). KABUL. Arastirma listesi 26. KABUL.
- KURAL KARTI: 12 sorunun kartları satır satır okundu; yeni yon maddeleri kaynakla uyumlu. AMA 3 kucuk dogruluk acigi (madde 1-3).
- TARAFSIZLASTIRMA: Claude held-out 12 yonlendirmeli sorudan 8'i dogru; 4 sızıntı (madde 4).
- NOT: Claude tests/cev_seti.json'da C32 etken metnini duzeltti (tek kaynakli iddia ayrıldı) ve yeniden imzaladı: beklenenImza 7f7e4ea1. CC bu dosyaya DOKUNMAZ.

1. C32 KOYU SEKER MADDESI (tek kaynaklı iddia "kaynaklara göre" diye sunuluyor)
- Kart: "kaynaklara göre Dubbel rengini çoğunlukla koyu candi şekerinden alır" — bunu YALNIZ Oxford Companion soyluyor; BJCP alıntısı ("others can rely on dark sugars for color and flavor") London Brown Ale bölümünden, genel cümle. Iki kaynagin ortak soyledigi: "koyu şeker rengi koyulaştırır".
- Duzelt: "Koyu şeker (candi) rengi koyulaştırır (Oxford Companion, BJCP). Oxford Companion'a göre Dubbel rengini çoğunlukla buradan alır." Guc "güçlü" yalnız ilk cumleye ait; ikinci cumle tek kaynak adıyla.
- GENEL KURAL (test): yon maddesi metninde "kaynaklara göre" diye sunulan her iddia, sayılan EN AZ IKI kurumun alıntısında bulunmalı; tek kurumun soyledigi ek bilgi o kurumun adıyla verilir. Yeni 10 kuralın hepsini bu gozle tara; bulunanı raporla.

2. C01/C05/C06 OG MADDESI ("bu yoldan ek adım gerekmiyor")
- Kart: "senin OG'in zaten 1,055, kaynağın eşiğinin (≈ 1,053) üstünde; bu yoldan ek adım gerekmiyor". Kaynaklar (Wyeast, Lallemand, OCB) OG arttıkca esterin arttıgını soyluyor; 13 °P esigi yalnız BSI'da. "Ek adım gerekmiyor" kaynakta yok — uygulamanın çıkarımı.
- Duzelt: "Başlangıç yoğunluğu (OG) yükseldikçe ester (muz) artar (Wyeast, Lallemand, Oxford Companion). Senin OG'in 1,055 — Weizen stil aralığının (BJCP 1,044–1,053) üstünde; daha yükseltmek stil dışına daha çok çıkar." (stil bandı uygulamanın BJCP tablosundan; stil yoksa bu yan cumle yok.)

3. C11 MAYA MADDESI (stokta aday yokken etken kayboluyor)
- 'maya' kuralı yalnız stokta aynı aileden daha yüksek attenüasyonlu maya varsa aday uretiyor; Claude'un mock'unda (bos stok) C11 kapsaması 3/4 (CC raporu 4/4 dedi — stoklu ortamda olcmus). Etken gercek kullanicida stoga bagli kaybolmamalı.
- Duzelt: aday uretilemezse yon maddesi: "Daha yüksek attenüasyonlu (şekeri daha çok tüketen) bir maya daha kuru bitirir — stokunda bu ailede daha yüksek attenüasyonlu maya yok" (kaynak: tests/cev_seti.json C11 Lallemand Winter Warmers + White Labs alıntıları, aynen).
- Kapsama olcumu BOS stokla da yapılır (iki satır: bos stok / fixture stok).

4. TARAFSIZLASTIRMA SIZINTILARI (Claude held-out, canli kod)
- "bence irish moss gereksiz, haksız mıyım" -> "irish moss gereksiz" (iddia kaldı; irish moss / whirlfloc / durultucu berraklık konusuna eşlenmiyor)
- "Herkes kapağı kapat diyor, doğru mu" -> "soru konusu belirsiz" (konu kayboldu; DMS olmalı: "kapak" + kaynatma)
- "biramdaki ekşilik normaldir herhalde değil mi" -> "biramdaki ekşilik normaldir herhalde" (ekşilik = 'eksilik' konu regex'ine uymuyor; "normaldir herhalde" iddiası kaldı)
- "şeker eklersem bira kesin daha güzel olur" -> "şeker eklersem bira" (kabul edilebilir, ama "sorulan: şeker" olmalı)
- Duzelt: KONULAR'a ekşilik/ekşimsi, irish moss/whirlfloc/durultucu/karragenan, "kapak" (kaynatma bağlamı); yonlendirme/kanaat sozcukleri (herhalde, galiba, sanırım, bence, doğru mu, normaldir, gereksiz, şart) konu metninden atılır; konu eşleşmezse ve iddia sıfatı kalırsa "sorulan:" bicimine (malzeme / sayı) indir.
- Test: bu 4 + CEV1B'nin 13 sorusu + Claude'un 8 dogru ornegi (jelatin kesin işe yarar değil mi, laktoz köpüğü artırır bence, sıcak mayalanma fusel yapmaz değil mi, karton tadı oksijenden değil bence, sülfat eklersem acılık daha iyi olur değil mi, soğuk bulanıklık için jelatin en iyisidir değil mi, mash 75 derece olsa daha iyi olur değil mi, weizen için 2 hacim karbonasyon yeter bence) -> konu metninde iddia fiili / kanaat sozcugu 0, konu bos degil.

5. DOGRULAMA + AKIS
- npm test TAM yesil. Imza 2c9ebd9f-32461 AYNI. Puanlama metinleri DEGISMEZ. tests/cev_seti.json'a DOKUNMA (beklenenImza 7f7e4ea1; kilit null kalmalı).
- CEV mock tam tur: kural yolu kapsaması bos stok + fixture stok; once/sonra madde metni farkları (yalnız 1-3).
- G seti hedef/aday/neden ve tuzak / DOG4B–H parmak izleri BIREBIR.
- Canli curl, SW bump (v131-516), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.

RAPOR: 1-4 once/sonra, madde 1 tarama sonucu (yeni kurallarda tek kaynaklı iddia listesi), kapsama (iki stok), parmak izleri, imza, SUPHE (zorunlu).
