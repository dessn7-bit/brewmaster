SPRINT CEV1D (CEV1C de471a5 uzerine, SW v131-516) — COK KUCUK DUZELTME, CEV GERCEK KOSUSUNDAN ONCE. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (CEV1C, canli kod, 2026-10-24): md5 canli = yerel (2876b1cb…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-516, tests/cev_seti.json degismedi (7f7e4ea1). Kural yolu 12 kartin maddeleri satir satir okundu: C32, OG maddesi (C01/C05/C06), C11 bos stok maya maddesi, POF / hop suresi / saglikli mayalanma kurum adlari DOGRU — KABUL. Bugday/yulaf (Palmer + Weyermann bugday, Palmer + Briess flakes) KABUL. mash_beta alintilari (Palmer bl.14 + Oxford "saccharification") KABUL. Tarafsizlastirma: Claude'un YENI 20 sorusundan 17'si dogru; 3 hata ayni sinif (madde 1).

1. "KAPAK" HER ZAMAN "kaynatmada kapak" ETIKETI ALIYOR
- "fermentörün kapağını kapalı tutmak şart mı" -> "sorulan: kaynatmada kapak" (YANLIS: fermentor kapagi)
- "şişe kapağı paslanırsa tat bozar mı" -> "sorulan: kaynatmada kapak" (YANLIS: sise kapagi)
- "mayalanma kovasının kapağı hava alsa DMS olur mu" -> "DMS — sorulan: kaynatmada kapak, oksijen" (konu DMS kullanici sordugu icin dogru, ama "kaynatmada kapak" YANLIS; mayalanma kabi kapagi)
- Duzelt: "sorulan" etiketi kapagin bagliyla: kaynatma / tencere / kazan + kapak -> "kaynatmada kapak"; fermentor / mayalanma kovasi / kova -> "mayalanma kabı kapağı"; şişe -> "şişe kapağı"; bagsiz "kapak" -> "kapak" (tahmin yok). DMS konusu yalniz kaynatma bagli ya da bagsiz "kapağı kapat" ile (CEV1C kurali aynen).
- Test: yukaridaki 3 + "kaynatırken tencere kapağını kapatsam sorun olur mu" (DMS, kaynatmada kapak — su an dogru, ayni kalmali) + "Herkes kapağı kapat diyor, doğru mu" (CEV1C, ayni kalmali) + "kapak açık kaynatmak gereksiz bence" (ayni kalmali).

2. KARTTA IC ANAHTAR: "(belcika)"
- C11 bos stok: "stokunda bu ailede (belcika) daha yüksek attenüasyonlu maya yok" — y.tip ham anahtari ekrana cikiyor. Uygulamada maya ailesi icin Turkce ad tablosu varsa onu kullan (ör. "Belçika"); yoksa ekle (tum tip degerleri, raporda liste). Ayni ham anahtar baska kart metninde var mi tara (maya tip, stil anahtari, kural id) -> raporla, duzelt.

3. INGILIZCE TERIM: "wort"
- C34: "kaynaklara göre beta-amilaz bu sıcaklıkta hızla bozulur — wort daha az fermente olur" -> "şıra daha az mayalanabilir olur". "beta-amilaz" ilk geciste kisa aciklamayla: "beta-amilaz (şekeri mayalanabilir hale getiren enzim)". Kural kartlarinin tamaminda (bos stok + fixture stok, 12 kart) Ingilizce terim taramasi: wort, mash disinda Ingilizce sozcuk (attenuation yazimi dahil — kartta "attenüasyon" mu "attenuasyon" mu, TEK yazim) -> raporla, duzelt. "mash" uygulamanin her yerinde kullanilan terim, kalir.

4. DOGRULAMA + AKIS
- npm test TAM yesil. Imza 2c9ebd9f-32461 AYNI. Puanlama metinleri DEGISMEZ. tests/cev_seti.json'a DOKUNMA (7f7e4ea1).
- CEV mock tam tur iki stok: yol degisimi 0, kapsama 32/32 iki stokta; once/sonra madde metni farklari (yalniz 2-3).
- G seti / tuzak / DOG4B-H parmak izleri BIREBIR.
- Canli curl, SW bump (v131-517), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Raporun sonunda CEV gercek kosusunun Opus 5.5 ile tahmini maliyeti + tavani (uygulamanin gosterecegi sayi; varsayim kalemleri ayri).

RAPOR: 1-3 once/sonra, tarama listeleri, parmak izleri, imza, maliyet, SUPHE (zorunlu).
