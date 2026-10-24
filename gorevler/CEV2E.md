SPRINT CEV2E (CEV2D 7177489 uzerine, SW v131-521) — KOSU KORUMASI, CEV GERCEK KOSUSU #2'DEN ONCE. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 0-5 numarali 6 madde var. Ise baslamadan 6'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN (Claude, 2026-10-25, canli kod okundu):
- Kaan'in indirdigi "tam sonuc" dosyasi 2026-10-24 kosusu #1 cikti (kosuId 1792848045701, md5 tests/fixtures/cev_kosu_2026-10-24.json ile AYNI). Indirme dugmesi hangi kosuyu indirdigini soylemiyor.
- C.kos sonucu YALNIZ kosu bitince yaziyor (bitir -> C.sonYaz). Kosu ortasinda sayfa yenilenirse / sekme kapanirsa / tarayici sekmeyi oldururse butun sonuc kaybolur, harcama kalir. Devam yok.
- C.sonYaz JSON 1 500 000 karakteri asarsa localStorage'a yalniz { kosuId, metrik, kirpildi } yazar. Kosu #1: 22 arastirma sorusu, soru basi ~19 KB (1 web cagrisi). Kosu #2: 43 arastirma sorusu x 4 web sinifi -> tahminen 2-4 MB -> sayfa yenilenince tam sonuc KAYBOLUR (yalniz bellekte C._son).
- SW otomatik yenileme (_devralindi / _guvenliMi, ~42145. satir): acik AI test kosusu "guvenli degil" sayilmiyor -> kosu surerken yeni surum yayinlanirsa sayfa KENDILIGINDEN YENILENEBILIR ve kosu kaybolur.

0. DOKUNULMAZLAR
- AI4 denetleyicisi 2c9ebd9f-32461, arastirma denetleyicisi 92f59a3c-5776 DEGISMEZ. tests/cev_seti.json (7befe7db), tests/cev_seti_heldout.json (f3853086, Claude'un dosyasi — ACMA / OKUMA / DEGISTIRME; testte yalniz imzayi ve soru sayisini kullanabilirsin), G seti, tuzak, DOG4B-H setleri ve puanlama metinleri DEGISMEZ. Kosu davranisi (yol, paket, sorgu, ozet, puan) DEGISMEZ — yalniz kayit / devam / koruma.

1. SW YENILEME KORUMASI
- _guvenliMi() acik AI test kosusu varken false dondurur: CEV (C._calisiyor) VE uygulamadaki diger butun AI test kosuculari (DOG1, AI4DOG, tuzak/T3, BUL, G, M — kodda calisiyor bayragi olan her kosucu; listeyi rapora yaz). Ortak bir yardimci (ornek window._bmAiKosuSuruyor()) yeterli.
- Kosu surerken banner cikar, otomatik yenileme olmaz. Test: kosu suruyor + _devralindi -> location.reload cagrilmaz (sahte reload ile say).

2. CEV TAM SONUCU INDEXEDDB'YE, HER SORUDAN SONRA
- DOG1'in IndexedDB deseni (BM_DOG1 idbYaz / idbOku) ile: kosu nesnesi her soru bittikten sonra IDB'ye yazilir (durum 'calisiyor'); localStorage'da yalniz kucuk dizin (kosuId, tarih, durum, soru sayisi, setler). 1,5 M karakter kirpmasi IDB'de YOK.
- IDB yazilamazsa kosu durmaz, panelde uyari; bellekten indirme yine calisir.
- Son 3 kosu IDB'de tutulur (eski kosu #1 dahil, gocle).

3. DEVAM
- Yarim kalan kosu (durum 'calisiyor' ya da 'durdu', sayfa yenilenmis) panelde gorunur: "Yarım koşu: <tarih>, N/55 soru bitti, harcanan $X" + [Devam] + [İndir].
- Devam yalniz BITMEMIS sorulari kosar; biten soru tekrar kosmaz, harcama iki kez sayilmaz; tavan yarim kosunun harcamasiyla birlikte uygulanir.
- Devam REDDEDILIR (nedeniyle): set imzasi (ana / held-out), denetleyici imzasi ya da arastirma denetleyici imzasi kosunun kaydindan farkliysa.
- Soru ortasinda kesilen (cagri yapilmis, sonuc yazilmamis) soru bitmemis sayilir ve yeniden kosar; bu durumda o sorunun onceki kismi harcamasi bilinmez -> panelde "en çok 1 sorunun harcaması iki kez olabilir" notu.

4. INDIRME HANGI KOSU
- Indirme dugmesinin yaninda: tarih + kosuId + durum (bitti / yarım) + soru sayisi + setler (ana 34 + heldout 21). Birden cok kosu varsa her biri ayri satir + kendi indir dugmesi. Dosya adi: brewmaster_cev_<kosuId>_<bitti|yarim>.json.

5. DOGRULAMA + AKIS
- Mock testleri: (a) 55 soruluk mock kosu ortasinda (ornek 20. soru) bellek sifirlanir (sayfa yenileme benzetimi) -> Devam -> 55/55, biten soru tekrar 0, maliyet toplami tek seferlik kosuyla AYNI; (b) soru basi >= 60 KB sentetik buyuk sonuc x 55 (toplam >= 3 MB) IDB'ye yazilir ve indirilen dosya byte byte ayni; (c) imza degisince Devam reddi; (d) madde 1 reload sayaci 0. Kasitli bozmalar kirmizi.
- npm test TAM yesil. Imzalar ve parmak izleri AYNI (madde 0). Mock kosunun cikti parmak izi (yol / konu / madde metinleri) CEV2E oncesiyle AYNI.
- Canli curl, SW bump (v131-522), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Maliyet satiri degismez — degisirse yaz.

RAPOR: 1-4 once/sonra + test sayilari, madde 1 kosucu listesi, imzalar, SUPHE (zorunlu).
