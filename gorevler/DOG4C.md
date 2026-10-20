SPRINT DOG4C (DOG4B 3cd36c4 uzerine, SW v131-505) — malzeme asistani soru cozumunde kalan yanlis cozumler. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4B, canli kod, 2026-10-21): md5 canli = yerel (8e52bbaf…), imza 2c9ebd9f-32461 sayfada, anahtar 0, bm-cache-v131-505. Senin 115 + 14 + benim 18 sorum dogru. C05 karari: "WY3068 yerine BB Alman Bugday" -> belirsiz KABUL (katalogda BB Alman Bugday No1/No2/No3; benim bb_wheat beklentim yanlisti).
HELD-OUT (Claude, senin gormedigin 48 soru, weizen / wbock / dubbel tabanlari, BM_AI4.cozumle): 36 dogru ya da kabul edilebilir belirsiz; AMA 9 YANLIS COZUM + 3 gereksiz belirsiz:
  YANLIS — degisiklik istegi "SORU (degisiklik yok)" (mod tat) oluyor:
    dubbel "Special B'yi ikiye katlasam" · "Special B'yi iki katı kullansam" · "Special B'yi dublesem" -> tat
    weizen "Hallertau'yu 30 dakikada atsam" · "hopu kaynamanın sonunda atsam" -> tat
    weizen "mayayı değiştirsem" -> tat (wy3068 hakkinda soru)
  YANLIS — eksik degistirme:
    dubbel "Styrian'ı kaldırıp Saaz koysam" -> CIKAR Styrian (Saaz yok sayildi)
  YANLIS — stil sorudan eziliyor:
    dubbel "pilsner yerine pale ale maltı kullansam" / "Pilsner yerine Pale Ale maltı kullansam" / "pilsner yerine pale ale kullansam" -> belirsiz "degisecek satir recetede bulunamadi" + stil "Lager / Pilsner" (stilKaynak soru). Recetede Pilsner malt satiri VAR. Kullanici belirsizden aday secerse paket YANLIS STILLE kurulur (opts.secim yolu coz.stil'i aynen tasir).
  YANLIS (hafif) — miktarsiz degisiklik bilgi oluyor:
    wbock "carafa'yı arttırsam renk ne olur" -> bilgi (ayni yapidaki "Special B'yi artırsam" dogru belirsiz)
  GEREKSIZ BELIRSIZ:
    weizen "buğday maltını yarım kilo azaltsam" · dubbel "candi'yi yarıya indirsem" · weizen "buğday maltını 2 kat yapsam"
Kok neden: tanimadigi degisiklik fiilinde (katla, duble, iki kati, at + zaman, degistir + Y yok) cozumleyici varsayilan olarak mod 'tat'a dusuyor. DOG4B ilkesi "emin degilse belirsiz" burada calismiyor. Ozet denetleyicisi bunu GOREMEZ (paket tutarli, yalniz soru yanlis anlasilmis); "Anladigim" satiri gosteriyor ama kullanici okumayabilir.

1. VARSAYILAN 'tat' DEGIL, 'belirsiz'
- mod 'tat' (SORU, degisiklik yok) yalniz su durumda: (a) kalem recetede YOK ve soru ekleme / kullanma / uyma sorusu ("ekler miyim", "koysam olur mu", "kullanilir mi", "uyar mi", "yakisir mi"), ya da (b) kalem recetede VAR ve cumlede degisiklik fiili YOK (yalniz degerlendirme: "olur mu", "uyar mi", "ne katar", "nasil").
- Kalem recetede VAR + cumlede taninmayan degisiklik fiili / yapisi (katla, duble, iki kati, at / ekle + zaman, degistir + Y yok, arttir / yukselt / azalt + miktar yok, kaldirip ... koy) -> mod 'belirsiz', belirsizTur 'islem', neden metni ne anlasilmadigini soyler. Fiil listesi ACIK UCLU kabul edilir: kural "recetedeki kaleme yonelik, belirtme ekli ("-i/-yi/-u/-yu...") ve dilek / sart kipli (-sam/-sem/-rsam/-rsem) fiil + soru degerlendirme isareti yok -> degisiklik istegi" bicimde, sozluk kovalamaca degil.
- Miktarsiz degisiklik + "ne olur / renk ne olur" -> bilgi DEGIL, belirsiz (ayni yapi "Special B'yi artirsam" ile tutarli).
- "mayayi / hopu / malti degistirsem" (Y yok) -> belirsiz, neden "neyle degistirilecegi soylenmedi".

2. CARPAN VE FARK MIKTARLARI (deterministik, "Anladigim" satiri eski -> yeni sayiyla gosterir)
- "iki katina / ikiye katla / iki kati / 2 kat(i/ina) / duble / ikiye katla" -> yeni = eski x 2. "yariya / yarisina / yari yariya" -> eski x 0,5. "uc katina" vb. sayi + kat -> eski x n.
- Eksiz miktar + azalt / dusur / indir / artir / arttir / yukselt / cogalt = FARK (Turkce: "500 g azalt" = 500 g kadar; "500 g'a azalt" = 500 g'a kadar, mevcut DOG4B kurali). yeni = eski -/+ X. Yeni <= 0 -> belirsiz. Birim donusumu kg <-> g.
- "yarim kilo" = 0,5 kg; "bir bucuk kilo" = 1,5 kg; "ceyrek kilo" = 0,25 kg (MASH ayristiricisinda benzer kod var — tek kaynak kullan, kopya yazma).
- "yuzde X yap" (tane payi) -> belirsiz KALIR (toplam mi korunur, digerleri mi degisir belirsiz).

3. "X'i KALDIRIP / CIKARIP Y KOYSAM / EKLESEM / KULLANSAM" = DEGISTIR X -> Y
- Tur tutarliligi (A4.ayniTurBul) aynen. Y katalogda yoksa ya da cok adayliysa belirsiz. Miktar verilmisse Y'nin miktari; verilmemisse "X yerine Y" ile ayni davranis.

4. STIL SORUDAN EZILMEZ
- Sorudaki sozcuk recete SATIRINA (ya da "yerine"nin iki yanindan birine, "malti / maltini" ekli, belirtme ekli) uyuyorsa o sozcuk KALEMDIR, stil DEGIL. Stil sorudan yalniz acik stil baglaminda alinir ("Tripel'e uyar mi", "... stilinde", "Saison icin"); recete stili bossa ve soru bir stil adi veriyorsa da alinir.
- "X yerine Y": X recetede satirsa (buyuk / kucuk harf, ek, "malti" sozcugu farketmez) eski = o satir; Y X'in turunde aranir ("pale ale" stil adi DEGIL, Pale Ale Malt).
- belirsiz -> kullanici secimi (opts.secim) yolunda stil, cozumle'nin stilKaynak'i "soru" ise ve bu madde kurallarina uymuyorsa RECETE STILI olur; test: Dubbel tabaninda belirsizden secim yapilinca paket stili Dubbel.

5. ZAMAN DEGISIKLIGI (hop eklenme dakikasi)
- Once KODDAN olc: A1.hukum / A1.cikarSema hop dakikasi degisikligini (ayni hop, farkli dk) hesaplayabiliyor mu? Kanitla (fonksiyon + satir) raporla.
- Hesaplayabiliyorsa: "X'i N dakikada atsam" -> yeni islem (ya da mevcut miktar/degistir yapisi) dk degisikligi, "kaynamanin sonunda / ates kapaninca / flameout" -> 0 dk, "dry hop / kuru hop" -> kuru; "Anladigim: ZAMAN DEGISIR — Hallertau 60 dk -> 30 dk".
- Hesaplayamiyorsa: belirsiz, neden "hop zamanini degistirmek bu asistanda hesaplanmiyor" — ASLA 'tat'. Hangisini sectigini gerekceyle yaz; yeni hesap kodu yazacaksan IBU yalniz uygulamanin mevcut Tinseth fonksiyonundan (yeni formul YOK).

6. TEST + DOGRULAMA + AKIS
- Yukaridaki 13 yanlis/gereksiz soru (metin AYNEN) beklenen sonucla case olur: katla/iki kati/duble -> MIKTAR Special B 60 -> 120 g; "yarim kilo azaltsam" -> Bugday Malti 1750 -> 1250 g; "yariya indirsem" -> Koyu Candi 100 -> 50 g; "2 kat yapsam" -> 1750 -> 3500 g; "Styrian'i kaldirip Saaz koysam" -> DEGISTIR styrian -> saaz; uc "pilsner yerine pale ale" -> DEGISTIR pilsner -> pale_ale, stil Dubbel; "carafa'yi arttirsam renk ne olur" -> belirsiz; "mayayi degistirsem" -> belirsiz; iki zaman sorusu -> madde 5 karari (asla tat).
- Dogru kalmasi gerekenler (AYNEN, degismemeli): "Special B koysam olur mu" tat · "Special B Dubbel'e uyar mi" tat stil Dubbel · "kisnis ekler miyim" tat · "Special B'yi CaraMunich ile degistirsem" degistir · "Special B'yi artirsam" / "special b'yi biraz azaltsam" / "Special B'yi azaltirsam ne olur" / "bugday maltinin oranini yukseltsem" / "bugday maltini yuzde 70 yapsam" belirsiz · "Hallertau'yu tamamen kaldirsam ne olur" cikar · "kisnisi 15 grama cikarsam" (recetede yok) ekle 15 g · "Westmalle mayasi kullansam" yok (bilinmeyen).
- Uretilmis set: madde 1-3 icin ek ve fiil cekimi tablosundan (unlu uyumu x kesme isaretli / kesmesiz x kucuk / buyuk harf) en az 60 soru; DOG4B'nin 115'i ile AYNI uretec ama YENI sutunlar; sozlugu okuyup ayni sozlukle uretme.
- DEGISMEMESI GEREKEN: tuzak seti v5 93 istemin cozumle ciktisi (mod, islem, eski, yeni, miktar, stil) parmak izi BIREBIR; DOG4B 115 + 18 + 14 BIREBIR (degisen olursa satir satir rapor + gerekce; gerekcesiz degisim = dur).
- KASITLI BOZMA: madde 1 (varsayilan tat'a geri) -> en az 3 kirmizi; madde 2 carpan kapali -> en az 1; madde 4 (stil sorudan) kapali -> en az 1.
- npm test TAM yesil. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). Puanlama metni (EK (vi) dahil) DEGISMEZ. Plan / tahmin (≈ 6,38 $ VARSAYIM, tavan 13,08 $) degismemeli — degisirse nedenini yaz.
- Canli curl, SW bump (v131-506), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK. Kaan'dan bir sey istenmez.
- Not: Claude dogrulamada bu dosyada OLMAYAN ucuncu bir held-out soru setiyle sinayacak.

RAPOR: madde 1-5 tablo (13 soru once/sonra, dogru kalmasi gerekenler, uretilmis set, 93 + 147 parmak izi), madde 5 karari + kod kaniti, kasitli bozmalar, imza, SUPHE (zorunlu).
