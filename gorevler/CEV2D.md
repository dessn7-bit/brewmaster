SPRINT CEV2D (CEV2C f13b0ec uzerine, SW v131-520) — TEK MADDELIK KUCUK DUZELTME, CEV GERCEK KOSUSU #2'DEN ONCE. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 0-3 numarali 4 madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (CEV2C, canli kod, 2026-10-25): md5 canli = yerel (f5b13cdc…), bm-cache-v131-520, AI4 imza 2c9ebd9f-32461, arastirma denetleyicisi 92f59a3c-5776, anahtar 0, cev_seti 7befe7db.
- Ana set 34 sorunun konu metni satir satir: etiketli yonlendirmesiz sorularda etiket + soru (C24 "az kaldi", C18 "ne zaman", C30 "gecer mi", C15 "chill haze" korunuyor), yonlendirmeli C13 / C16 / C20 / C34 yalniz etiket + sorulan. "kuru hoptan sonra <olay>" artik '"kuru hop" — soru: "…"'. KABUL. SUPHE maddeleri (genis yonlendirme sozlugu → notr "olur mu" sorusu etiket-yalniz; soru metni ham Turkce gidiyor; test kapsami; (a) yapi geregi geciyor) KABUL.
- AMA ayni yapisal acik ETIKETSIZ dalda duruyor (madde 1).

0. DOKUNULMAZLAR
- AI4 denetleyicisi 2c9ebd9f-32461, arastirma denetleyicisi 92f59a3c-5776 DEGISMEZ. tests/cev_seti.json (7befe7db), G seti, tuzak, DOG4B-H setleri ve puanlama metinleri DEGISMEZ. Ana setin yolu (kural 12 / arastirma 22) ve 34 sorunun konu metni DEGISMEZ (hepsinde etiket ya da sorulan var).

1. ETIKETSIZ YONLENDIRMESIZ SORUDA SORU SOZCUKLERI SILINIYOR
- C.tarafsiz etiket de sorulan da bulamazsa eski temizleme yoluna gidiyor: "nasil / neden / niye / hangi / ne kadar / ne yapmaliyim" ve "mi/mu" siliniyor, kalan metin '"<kalan>" konusunu etkileyen etkenler' cercevesine konuyor. Sorunun ASIL sorusu kayboluyor ve cerceve anlami bozuyor. Ornekler (Claude'un uydurdugu, setlerde yok):
  - "sisedeki birayi ne kadar sure bekletmeliyim" -> "sisedeki birayi sure bekletmeliyim" konusunu etkileyen etkenler (SURE sorusu kayboldu)
  - "kaynatma neden en az 60 dakika olmali" -> "kaynatma en az 60 dakika olmali" konusunu etkileyen etkenler (NEDEN kayboldu; iddiaya donustu)
  - "biramin oksitlendigini nasil anlarim" -> "biramin oksitlendigini anlarim" konusunu etkileyen etkenler (NASIL kayboldu)
  - "hangi hop daha az acilik verir" -> "hop daha az acilik verir" konusunu etkileyen etkenler (karsilastirma sorusu iddiaya donustu)
- DUZELT (yapisal): etiket ve sorulan YOKSA ve soru yonlendirmesizse (C.yonlendirmeVar false) konu = 'soru: "<C.soruTemiz(soru)>"' — soru sozcukleri SILINMEZ, "konusunu etkileyen etkenler" cercevesi KULLANILMAZ. Yonlendirmeliyse BUGUNKU temizleme yolu aynen (yalakalik onlemi). Ayni konu metni C.SORGU_GOREV ve C.OZET_GOREV'e gider; "Anladigim" satiri: 'Anladigim: "<soru>" — kaynaklarda aradim.' (CEV2C bicimiyle uyumlu; ic etiket / jargon yok).
- Bos kalan soru (yalniz noktalama) eskisi gibi 'soru konusu belirsiz'.
- TEST:
  - (a) Yukaridaki 4 ornek + testin kendi urettigi >= 30 etiketsiz yonlendirmesiz soru (kalip: <ozne> + nasil / neden / niye / ne kadar / ne zaman / hangi / kac / ne yapmaliyim / -mali miyim / gerekir mi): konu metninde soru sozcugu ve icerik sozcuklerinin TAMAMI var, "konusunu etkileyen etkenler" 0.
  - (b) Yonlendirmeli etiketsiz sorular (bugunku CEV1B / CEV1C / CEV1D yonlendirmeli test sorulari) cikti AYNEN; yonlendirmeGitti false.
  - (c) Ana set 34 konu metni BIREBIR (parmak izi), yol 12 / 22, G seti 4615b7b9/3414, tuzak / DOG4B-H parmak izleri BIREBIR.
  - Kasitli bozma: eski temizleme yoluna donus -> (a) kirmizi; yonlendirmeli soruya da soru metni -> (b) kirmizi.

2. RAPOR TABLOSU
- (a)'daki 4 ornek + uretilmis sorulardan 10'u icin once / sonra konu metni ve Anladigim satiri (tam).

3. DOGRULAMA + AKIS
- npm test TAM yesil. Imzalar ve parmak izleri AYNI (madde 0).
- Canli curl, SW bump (v131-521), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Maliyet satiri degismez — degisirse yaz.

RAPOR: madde 1 once/sonra + test sayilari, madde 2 tablosu, imzalar, SUPHE (zorunlu).
