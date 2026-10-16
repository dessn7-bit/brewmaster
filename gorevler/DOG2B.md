SPRINT DOG2B (DOG2 132c1cd + 5ee8b23 uzerine, SW v131-500) — yalniz G kosusundan ONCE kucuk duzeltme. GERCEK AI KOSUSU YOK. Kaan'a "Yalniz G" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG2, canli kod, 2026-10-17): md5 canli = yerel, imza 2c9ebd9f-32461 sayfada, anahtar 0; pH yon satiri M12/M28/M25 paketlerinde dogru yonde. CC'nin yakaladigi G2:G09#4 ve G1:G23#4 ("FG 1,008'den 1,007'ye, ABV … cikiyor" — ortak yuklem FG'ye de baglanir) Claude etiketinde KACMISTI -> etiket duzeltildi (G kesin 11/390 ust %4,63; kati 16/390 ust %6,16). AMA:
- SIRA NEDENI DENETIMI DAR: canlida G.siraNedenDenetle ile 8 dogal yeniden yazim denendi, 7'si GECIYOR (yalniz "…bulunmadigindan … geride kaliyor" dustu):
  "Stok yeterli oldugundan bu aday one cikiyor." · "Malzeme stokta oldugu icin onerilen ilk aday budur." · "Bu aday ilk sirada, cunku stokta var." · "Stokta oldugu icin en ustte yer aliyor." · "Puani stok durumu yuzunden dusuk." · "Stokta olmadigi icin bu aday daha az oncelikli." · "Bu aday listede basta, cunku malzeme degismiyor."
  Neden: sira sozlugu (sira/onde/arkasinda/geride) ve neden sozlugu ("cunku", "zira", "sayesinde" yok) dar; "puan" yalniz sayi/dus/yuksel ile yakin.
- pH yon satiri M12'de fark -0,50 iken "fark tahmin payi (±0,1–0,2) … kaynakli olabilir" diyor: 0,50 payin 2,5 kati -> yanlis aciklama onerisi.

1. SIRA NEDENI DENETIMI GENIS (AI5 ek katmani, donmus bolge DISI)
- Sira sozlugu: sira*, onde, one (cik|gec)*, arka*, geride, ilk aday, ilk/birinci/ikinci/ucuncu/son (sira|aday), en ust*, basta, oncelik*, once gelir, sonra gelir, listede (ust|bas|son)*, puan* (her bicim).
- Neden sozlugu: icin, nedeniyle, yuzunden, dolayi, sayesinde, cunku, zira, -digi/-dugu/-digindan/-dugundan, bu yuzden, bu nedenle, dolayisiyla.
- Kural: ayni CUMLEDE (yan cumle degil) sira + neden sozcugu varsa ve stok / alinacak / satin / malzeme (degis|stok) / varsayim geciyorsa DUSER. Grup / zayif kanit / notr oran kontrolleri mevcut haliyle kalir.
- GOREV + SISTEM_GELISTIR'e: "Adaylarin sirasini ve nedenini KART gosteriyor; siranin nedenini yazma. Sira yalniz 'aday 1 / aday 2' diye anilabilir."
- Test: yukaridaki 7 + DOG2'nin 11 cumlesi + en az 30 uretilmis yeniden yazim (sira sozlugu × neden sozlugu × yasak neden) -> hepsi DUSER; mesru ornekler ("Yan etkisi oldugu icin temiz adaylarin arkasinda.", "Aday 1 mash sicakligini 65'ten 64'e indiriyor.", "Stokta 585 g var, yetmeyebilir.") GOSTERILIR. DOG1 G kosusunun gosterilen 384 cumlesi yeniden gecer: yeni dusen her cumle listelenir; yanlis alarm sayisi raporda (DOG2'de 373'te 0'di).
- KASITLI BOZMA: "cunku" kaldirilinca en az 1 test kirmizi.

2. pH YON SATIRI PAY ESIGI
- |olcum − tahmin| ≤ 0,2 -> mevcut "tahmin payi (±0,1–0,2) olabilir" ifadesi kalir. > 0,2 -> "fark tahmin payini (±0,1–0,2) ASIYOR; olcum sicakligi referansi ya da suyun kalsiyum / magnezyumu olasi; olcum esastir." (tahmin payini neden olarak SAYMA).
- Test: M12 (−0,50) payi asiyor satiri; M28 (−0,20) pay icinde; M25 (+0,22) asiyor.

3. ETIKET DUZELTMESI KAYDI (kod yok)
- tests/fixtures/dog1_kosu_2026-10-15_etiket_claude.json Claude tarafindan duzeltildi (G2:G09#4, G1:G23#4 -> c). G seridindeki DOG1 metni bu dosyadan okunuyorsa sayi 15/390 -> 16/390 (ust %6,2) olur; test ile esitle.

4. DOGRULAMA + AKIS
- npm test yesil + madde 1-2 case'leri, kasitli bozmalar kirmizi. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). DOG1/DOG1B/DOG2, BUL2C-ISTEK, AI5 G, MASH testleri aynen.
- G kosusu puanlama EK'i degismez; bu dosyanin madde 1 kurali kosudan ONCE yazildi.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida dogrular; sonra Kaan'a "Yalniz G" icin tek cumle.

RAPOR: madde 1 tablo (7 + 11 + uretilmis set + 384 yeniden gecirme, yanlis alarmlar tek tek), madde 2 uc satir, imza, SUPHE (zorunlu).
