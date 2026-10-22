SPRINT DOG4F (DOG4E a1b6e88 uzerine, SW v131-508) — soru cozumunde "okunmayan miktar sessizce yok sayiliyor" sinifi. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 5 numarali madde var. Ise baslamadan 5'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4E, canli kod, 2026-10-22): md5 canli = yerel (bf975a9b…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-508. Senin 12 sorun dogru; ek iki duzeltme (%25'ini, dortte birini Y ile degistir) ve "beste" bulgusu KABUL; SUPHE'deki "kullanmasam olur mu" -> cikar KABUL.
HELD-OUT 5 (Claude, 40 yeni soru): kesir yonu dogru (ucte ikisini atsam 20, dortte ucunu kullansam 45, beste birini 48, onda birini 2565, %20'sini 48, ucte birine indirsem 4, uc katina 36). AMA 9 YANLIS COZUM — hepsi ayni kok: soruda okunmayan bir miktar / niteleyici var, cozucu onu sessizce atip kendinden emin bir sonuc veriyor:
  Y1 dubbel "candi'nin yüzde yirmi beşini çıkarsam" -> CIKAR (tum satir silinir; dogrusu 75 g ya da belirsiz)
  Y2 wbock "munich maltının 400 gramını çıkarsam" -> CIKAR (tum satir; dogrusu 1600 - 400 = 1200 g)
  Y3 wbock "munich maltının yarım kilosunu çıkarsam" -> CIKAR (dogrusu 1100 g)
  Y4 dubbel "Special B'nin dörtte birinden vazgeçsem" -> CIKAR (dogrusu 45 g)
  Y5 dubbel "Special B'yi 20 gram daha koysam" -> 60 → 20 g ("daha" atildi; dogrusu 80)
  Y6 weizen "Hallertau'dan 4 g az koysam" -> 12 → 4 g (dogrusu 8)
  Y7 weizen "Hallertau'yu 4 g fazla koysam" -> 12 → 4 g (dogrusu 16)
  Y8 dubbel "Special B'yi 0,5 kat artırsam" -> 60 → 300 g ("0,5" 5 okundu; dogrusu 90 ya da belirsiz)
  Y9 dubbel "Styrian'ın dörtte birini 15 dakikada atsam" -> 20 → 15 g, zaman atildi (dogrusu belirsiz — hop zamani hesaplanmiyor, DOG4C karari)
  Gereksiz belirsiz (guvenli, istege bagli): "Special B'nin tamamını atsam" (cikar), "candi'yi 100 g'dan 80 g'a düşürsem" (80), "Special B'yi dörtte bire düşürsem" (15), "Special B'nin dörtte biri kalsın" (15), "carafa'nın üçte biri kadar daha eklesem" (40; "yarisi kadar daha koysam" 150 veriyor — tutarsiz), "Special B'ye 20 gram eklesem" (80), "candiyi 1/4 azaltsam" (75).
Kok neden: her sprintte yeni bir kalip ekleniyor, ama kalibin TUKETMEDIGI miktar sozcukleri denetlenmiyor. Bes held-out turunun hepsinde yanlislarin cogu bu sinif. Sozluk kovalamaca yerine YAPISAL KORUMA istiyorum.

1. TUKETIM KORUMASI (yapisal, ana madde)
- cozumle sonucu "ikame" (miktar / cikar / degistir / ekle) ise, sorudaki MIKTAR TASIYAN her parca secilen yorum tarafindan HESABA KATILMIS olmali; katilmamis biri kaldiysa sonuc belirsiz/islem, neden metni: "şu kısmı hesaba katamadım: '<parça>'" (kullanici ne anlasilmadigini gorur).
- Miktar tasiyan parca siniflari (KAPALI liste, genis tutulur — koruma oldugu icin fazlasi guvenli): rakamli sayi (ondalik dahil "0,5", "1/4"), yaziyla sayi (BM_MASH.sozcukSayi tek kaynak: bir, iki, yirmi beş, yarım, çeyrek, buçuk…), birim (g, gr, gram, kg, kilo, ml, l, litre, paket, %), yüzde, kat / katı / katına, kesir sozcukleri (A4.kesirOku), "daha / az / fazla / eksik / ekstra / tamam(ı) / hepsi", zaman (dakika, dk, saat, sn — ve "N dakikada"), "kalsın / kalsa".
- Her cozum yolu kullandigi parcalarin konumunu (indeks araligi) isaretler; koruma kalanlara bakar. Kalem adinin icindeki rakam (WY3068, CaraMunich 2, D-180, "No1") parca SAYILMAZ (ad olarak tuketilmis).
- CIKAR yalniz cumlede tuketilmemis miktar parcasi YOKKEN verilir ("tamamen / hic / tamami / hepsi / -siz / olmadan" disinda).
- Bayrak A4.COZ.tuketim (yalniz kasitli bozma icin).

2. HEDEFLI DUZELTMELER (koruma sonrasi, emin olunanlar)
- "X'in N gramını / N kilosunu / yarım kilosunu çıkarsam / atsam / eksiltsem" -> eski − N (birim cevirisi A1.birimCevir); yeni ≤ 0 -> belirsiz. "N gramını kullansam / bıraksam" -> N.
- "X'i N g daha / fazla / ekstra koysam" -> eski + N; "X'den N g az / eksik koysam" -> eski − N. "X'e N g eklesem" -> eski + N (recetede satir varsa).
- Ondalik carpan: "0,5 kat / 1,5 katı / 2,5 katına" ondalik dogru okunur; "0,5 kat artırsam" anlami belirsiz (× 1,5 mi × 0,5 mi) -> belirsiz; "1,5 katına çıkarsam" -> × 1,5.
- Yaziyla yuzde ("yüzde yirmi beşini") -> rakamli yuzdeyle ayni yol (sozcukSayi).
- Kesir + "vazgeçsem" -> azaltma yonu (× (1 − k)); kesirsiz "vazgeçsem" cikar aynen.
- Kesir / miktar + zaman ("15 dakikada", "kaynamanın sonunda", "kuru hop") -> belirsiz (hop zamani hesaplanmiyor).
- "X'in tamamını / hepsini atsam" -> CIKAR. "kadar daha" kesirde tutarli: "üçte biri kadar daha" = "yarısı kadar daha" ile ayni kural (× (1 + k)).
- Istege bagli: "100 g'dan 80 g'a düşürsem" -> 80 (kaynak miktar recetedekiyle uyusmazsa belirsiz).

3. TEST (dairesel olmayan)
- Y1–Y9 + gereksiz belirsizler (metin AYNEN) case olur; beklenen degerler yukarida.
- MUTASYON TESTI (ana kanit, tuketim korumasi icin): BUTUN mevcut dogru cozumlu sorulara (tuzak 93, DOG4B 147, DOG4C 106, DOG4D 97, DOG4E 78 + Claude held-out 1–5'in dogru olanlari) sabit bir ek listesinden miktar parcasi eklenir ("20 gram daha", "yarısını", "15 dakikada", "%10", "0,5 kat", "biraz", "tamamen", "iki tane") — basa, sona ve kalemden sonra. Kural: sonuc YA belirsiz YA DA ek parcayi gercekten hesaba katmis (eski sonuctan farkli ve dogru) olmali; ek parcaya ragmen ESKI SONUCUN AYNISI = SESSIZ YOK SAYMA = KIRMIZI. Rapor: mutasyon sayisi, belirsiz / dogru hesap / sessiz yok sayma dagilimi; sessiz yok sayma 0 olmali (aksi dur + rapor).
- DEGISMEMESI GEREKEN: tuzak v5 93 istem (cb74f605/11217), DOG4B, DOG4C, DOG4D, DOG4E setleri BIREBIR (degisen olursa satir satir + gerekce; gerekcesiz = dur). Tuketim korumasi yalniz gercekten okunmamis parca varken devreye girer; mevcut dogru sorularda degisim beklenmez.
- KASITLI BOZMA: tuketim korumasi kapali -> mutasyon testinde en az 20 sessiz yok sayma kirmizi + Y1–Y4 kirmizi.

4. GORUNUM
- belirsiz nedeni karttaki "Anladığım" yerine sade cumle: "Sorunun şu kısmını hesaba katamadım: '20 gram daha'. Daha açık yazar mısın? (ör. 'Special B'yi 80 grama çıkarsam')". Jargon yok (CEVAP ILKESI).

5. DOGRULAMA + AKIS
- npm test TAM yesil. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). Puanlama metni DEGISMEZ. Plan / tahmin (≈ 6,38 $ VARSAYIM, tavan 13,08 $) degismemeli.
- Canli curl, SW bump (v131-509), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Duzenlemeden once TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK. Kaan'dan bir sey istenmez.
- Not: Claude dogrulamada bu dosyada OLMAYAN altinci bir held-out setle sinayacak; bu tur sessiz yok sayma 0 cikarsa cozucu turlari kapanir, sira AI5D'ye gecer.

RAPOR: Y1–Y9 + gereksiz belirsizler once/sonra (Anladigim / belirsiz neden metniyle), mutasyon testi tablosu, parmak izleri, kasitli bozma, imza, SUPHE (zorunlu).
