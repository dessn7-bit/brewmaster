SPRINT DOG4H (DOG4G abf671c uzerine, SW v131-510) — MAYA MIKTARI. COK KUCUK SPRINT. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 3 numarali madde var. Ise baslamadan 3'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4G, canli kod, 2026-10-23): md5 canli = yerel (817e5d8a…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-510. S1–S4 dogru; litre basina okuma (hacim 11 ile) dogru: "kişniş 0,5 g/lt" / "candiyi 10 g/L yapsam" 110 / "Hallertau'yu 1 g/L yapsam" 11 / "20 litreye 40 gram kişniş" 22, Anladigim satirinda hesap acik. E01 degisikligi ve dekstroz neden metni KABUL; katki <-> seker malti degistirme ayri is (simdilik iki adim KABUL).
HELD-OUT 7 (Claude, 30 yeni soru): 28'i dogru ya da guvenli belirsiz ("kaç gram azaltsam FG 1,010 olur", "Hallertau 20 g ile IBU kaç olur", "Special B 80 gram Dubbel'e uyar mı", "%3 oranını yapsam", "OG 1,060 olsun diye", "60 gram mı yoksa 40 mı", iki satirli istekler -> belirsiz; "3 g artırsam IBU kaç olur" 15; "1150 g'dan 1,5 kg'a" 1500). AMA 2 MAYA SORUSU:
  M1 SESSIZ YOK SAYMA: weizen "WY3068 yerine 22 gram WB-06 kullansam" -> "DEĞİŞTİR — WY3068 · 1 paket → WB-06 · 1 paket"; 22 g okunmus sayiliyor ama A1._degKur maya miktarini kullanmiyor (dogrusu belirsiz). Ayni yapi "3 paket WB-06" -> belirsiz (tutarsiz).
  M2 KIRIK AKIS: dubbel "mayayı 11 g kuru maya yapsam" -> cozumle 'ikame miktar' {kalem:'maya', miktar 11, birim g} ama A1.degisiklikKur ok:false "miktar değişikliği çözülemedi", Anladigim null — kartta ne gorundugunu olc; cozumle seviyesinde belirsiz olmali.

1. MAYA MIKTARI
- Maya satirina yonelik HER miktar (g, paket, adet, kesir, kat, fark) -> belirsiz/islem, sade neden: "Maya miktarı bu asistanda değiştirilmiyor — yalnız maya türü değiştirilebilir ("X yerine Y kullansam")." Degistir'de Y'ye yazilmis miktar ("22 gram WB-06", "2 paket WLP500") da ayni; miktarsiz "WY3068 yerine WB-06" DEGISTIR aynen.
- Genel koruma: cozumle 'ikame' dondurup A1.degisiklikKur ok:false verirse sarmalayici belirsiz/islem'e cevirir (neden degKur'un nedeni, sade dille). Bu durum mutasyon/uretilmis setlerde kac kez olusuyor OLC ve raporla (0 degilse liste).

2. TEST
- M1, M2 + "WY3068 yerine 3 paket WB-06", "mayayı iki katına çıkarsam", "maya miktarını yarıya indirsem", "WY3787 yerine 2 paket WLP500" (beklenen hepsi belirsiz) + "WY3068 yerine WB-06 kullansam" DEGISTIR aynen.
- DEGISMEMESI GEREKEN: tuzak v5 93 istem (cb74f605/11217), DOG4B (141: 3d8a0ef9/23172), DOG4C, DOG4D, DOG4E, DOG4F, DOG4G setleri BIREBIR; degisen her satir + gerekce.
- KASITLI BOZMA: madde 1 kapali -> M1 kirmizi; sarmalayici korumasi kapali -> M2 kirmizi.

3. DOGRULAMA + AKIS
- npm test TAM yesil. Imza 2c9ebd9f-32461 AYNI. Puanlama metni DEGISMEZ. Plan / tahmin (≈ 6,38 $ VARSAYIM, tavan 13,08 $) degismemeli.
- Canli curl, SW bump (v131-511), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Not: bu sprint sonrasi Claude yalniz M1/M2 sinifini kontrol eder; soru cozucu turlari KAPANIR, sira AI5D.

RAPOR: M1, M2 ve ek 5 soru once/sonra, madde 1 olcumu (ikame + degKur ok:false sayisi), parmak izleri, kasitli bozmalar, imza, SUPHE (zorunlu).
