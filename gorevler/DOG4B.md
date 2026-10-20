SPRINT DOG4B (DOG4 2a81c01 uzerine, SW v131-504) — MALZEME ASISTANI SORU COZUMU (A4.cozumle) DOGAL TURKCEDE YANLIS. AI4 DOGRULAMA KOSUSUNDAN ONCE ZORUNLU. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4, canli, 2026-10-21): md5 canli = yerel (309eee6c…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-504. A bolumu KABUL (kapali sozluk acik). AMA canli BM_AI4.cozumle'ye 18 dogal soru verdim (set tabanlari weizen / dubbel / wbock), 10'u YANLIS ya da cozulemedi:
  1 "Weizen'de buğday maltını 2,5 kg yapsam ne olur?" -> ikame/EKLE flaked_wheat (dogru: miktar, malt satiri wheat 1,75 → 2,5 kg)
  2 "buğday maltını 2 kilo yapsam" -> mod tat, flaked_wheat, miktar YOK ("kilo" taninmiyor)
  3 "Hallertau'yu 20 grama çıkarsam" -> CIKAR (dogru: miktar 12 → 20 g; "X grama cikar" = miktari X'e yukselt)
  4 "mayayı BB Alman Weisbier ile değiştirsem" -> mod tat (dogru: degistir maya wy3068 → bb_wheat)
  5 "WY3068 yerine BB Alman Buğday kullansam" -> degistir, YENI = flaked_wheat MALT (dogru: maya bb_wheat — tur tutarliligi yok)
  6 "hopu tamamen çıkarsam ne olur" -> belirsiz (recetede tek hop satiri var → cikar hop:0)
  7 "Dubbel'de candi şekerini 300 g yapsam ne olur?" -> bilgi (dogru: miktar katki:0 koyu_candi_kaya 100 → 300 g)
  8 "koyu candi şekerini 300 g yapsam" -> EKLE yeni koyu_candy D-180 (dogru: recetedeki Hazkat satiri miktar)
  9 "candi'yi 200 grama indirsem" -> belirsiz (dogru: miktar katki:0 → 200 g)
  10 "Special B yerine Hitit Koyu Kristal maltı kullansam" -> mod yok / bilinmeyen (katalogda "Koyu Kristal Arpa Maltı (Hitit)" var)
  + "caramunich 2'yi 300 g yapsam" (wbock) -> belirsiz; "buğday maltı yerine pilsner kullansam" (wbock) -> belirsiz.
  Dogru cozulenler: "pilsner maltını azaltıp 900 g yapsam", "special b'yi çıkarsam", "munich maltını 600 g yapsam", "styrian golding yerine saaz kullansam", "munich'i 2 kg yapsam", "Carafa I'i çıkarsam".
EN TEHLIKELI SINIF: kendinden emin YANLIS cozum (1, 3, 5, 8). Ozet AI paketi dogru anlatsa bile cevap kullanicinin sorusuna degil BASKA bir degisiklige ait olur ve AI4 denetleyicisi bunu GOREMEZ. Kesinlik onceligi: yanlis cozum yerine "belirsiz → sor" her zaman tercih.
DOG4 raporunda CC de bunu gormus (SUPHE 2) ama K02/K13 istem metnini CALISAN YAZIMA cevirmisti — set dogal metne doner (DOG1B kurali: metni degil kodu duzelt).

1. ILKE: RECETE SATIRI ONCE, TUR TUTARLILIGI, EMIN DEGILSE SOR
- Soruda adi gecen kalem RECETEDE bir satirla eslesiyorsa (ad / id / alias / tur adi: "buğday maltı" → wheat; "candi" / "candi şekeri" / "koyu candi" → recetedeki candi katki satiri; "caramunich 2" → cara_munich2; "hop / hopu / şerbetçiotu" + recetede tek hop satiri → o satir) RECETE SATIRI secilir; katalogdan YENI kalem yalniz "ekle / koy / katsam" fiiliyle ya da "X yerine Y"nin Y'si icin aranir.
- "X yerine Y": Y once X ile AYNI tipte aranir (maya ↔ maya, malt ↔ malt, hop ↔ hop, katki ↔ katki/seker); farkli tipte tek eslesme varsa belirsiz.
- Miktar ifadesi: kg / kilo / kilogram / g / gr / gram / grama / gramlik / ml; "X grama / X kiloya cikar|cikarsam|yukselt|indir|dusur|azalt|artir|yap" = MIKTAR (cikar = kaldir YALNIZ miktar ifadesi yokken ya da "tamamen / hic / kaldir" varken).
- Turkce ekler: kesme isaretli ve isaretsiz iyelik / belirtme / yonelme ekleri (-ı/-i/-u/-ü, -yı/-yi, -nı/-ni, -ını/-ini, -a/-e, -ya/-ye) kokune indirilir ("candi'yi", "maltını", "Hallertau'yu", "hopu").
- Katalog adinin dogal kisa bicimleri (Hitit Koyu Kristal, BB Alman Weisbier, BB Alman Buğday, Thracian Dark Münih …): urun adindaki marka + ayirt edici sozcuk dizisiyle eslesme (sozcuk sirasi esnek, "maltı / mayası / arpa" dolgu); birden cok aday → belirsiz.
- Hicbir yolda tek ve tutarli cozum yoksa mod 'belirsiz' (mevcut "netlestir" akisi); ASLA tahminle kendinden emin cozum.
2. COZUM KULLANICIYA GORUNUR (onayli)
- Ozet AI cagrisindan ONCE kartta tek satir: "Anladığım: <islem> — <kalem adı> <önceki> → <yeni> (<tablo satırı>)" + [Değiştir] (mevcut netlestir/duzelt akisi). Koşucu bu satiri sonuca yazar. Bu satir zaten varsa yerini ve metnini raporla; yoksa ekle. Yeni AI cagrisi YOK.
3. TEST — DAIRESEL OLMAYAN
- Yukaridaki 18 soru (metin AYNEN, beklenen cozum yukarida) -> 18/18.
- Uretilmis set: CC, BICIM TABLOSUNDAN (sozlukten degil) en az 80 dogal soru yazar: 3 taban × {miktar, ekle, cikar, degistir} × {ekli/eksiz, kesmeli/kesmesiz, kilo/kg/gram/grama, buyuk/kucuk harf, "yapsam / olsa / koysam / indirsem / cikarsam(miktarli)"} — her biri beklenen cozumle. Sonuc tablosu raporda; yanlis cozum (kendinden emin ve yanlis) = 0 olmali, belirsiz sayisi ayri satir.
- Eski cozum testleri (A/C/T + mevcut 70 istemin cikarim alani) AYNEN gecer; degisen her biri satir satir.
- KASITLI BOZMA: (a) "recete satiri once" kapatilinca 1 ve 8 yine yanlis, (b) tur tutarliligi kapatilinca 5 yanlis, (c) "grama cikar = miktar" kapatilinca 3 yanlis.
- Not: Claude dogrulamada yine bu dosyada OLMAYAN ayri bir held-out soru setiyle sinayacak.
4. SET DOGAL METNE DONER + PUANLAMA EKI (kosudan ONCE, sonradan DEGISMEZ)
- tests/tuzak_seti.json K02 ve K13 Kaan'in dogal yazimiyla: K02 "Weizen'de WY3068 yerine kilerimdeki BB Alman Weisbier mayasını kullansam olur mu?" · K13 "Dubbel'de Special B yerine kilerimdeki Hitit Koyu Kristal maltını kullansam olur mu?"; K01a/b ve K15 aynen (artik dogru cozulmeli). Beklenen cikarim alanlari dogru (K02 yeni_kalem bb_wheat; K13 koyu_kristal; K15 katki:0). Set surumu 5; eski 70 BIREBIR.
- PUANLAMA EKI (puanlama metnine aynen, kod kilidiyle): "(vi) COZUM: her istemin uygulama cozumu set 'cikarim' alaniyla karsilastirilir (islem + kalem + yeni_kalem + miktar). Kendinden emin YANLIS cozum = 'cozum hatasi'; o istemin cumleleri cumle sayimina GIRMEZ, ayri satir; cozum hatasi > 0 ise KAPI GECEMEZ. Belirsiz → netlestirme beklenen istemde dogru sayilir; beklenmeyen istemde 'cozum eksigi' satiri (kapi degil)."
- Koşucu mock tam tur: 93 istemde cozum hatasi 0 (rapor tablosu).
5. A BOLUMU KUCUK DUZELTME (SN3)
- "aday üret-" (aday üretmedi / üretilmedi / üretemedi) kavram kullanimi, aday N degil → SN3 disi (DOG4 geri oynatmadaki 8 yanlis alarm). Geri oynatma 390 + 384: yeni dusen bu 8'i icermez, baska degisen satir satir. Kacak 36/36 aynen duser.
6. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler, kasitli bozmalar kirmizi. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). DOG / MASH / AI5 G / BUL2C-ISTEK testleri aynen (degisenler satir satir).
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida held-out ile dogrular; sonra Kaan'a dugme.

RAPOR: madde 1 kurallar, madde 2 kart satiri (ekran metni), madde 3 tablolar (18 + uretilmis ≥80 + eski testler + bozmalar), madde 4 set farki + puanlama eki metni + mock cozum tablosu, madde 5 geri oynatma, imza, SUPHE (zorunlu).
