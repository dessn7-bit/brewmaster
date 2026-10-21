SPRINT DOG4D (DOG4C 7dfd2a5 uzerine, SW v131-506) — soru cozumunde kalan 4 yanlis cozum. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 5 numarali madde var. Ise baslamadan 5'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4C, canli kod, 2026-10-21): md5 canli = yerel (aa230864…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-506. Senin 14 + 79 sonucun dogru; hop zamani -> belirsiz karari KABUL (gerekce kodla kanitli).
HELD-OUT 3 (Claude, 40 yeni soru, BM_AI4.cozumle + A1.degisiklikKur + A4.anladigim): 31 dogru (carpan / fark / kg-g / yarim kilo / bir bucuk kilo / "X yerine Y" / "Y ile degistir" / sifir-eksi korumasi dahil), 5 gereksiz-ama-guvenli belirsiz, 4 YANLIS COZUM:
  Y1 — KATKI BIRIMI 1000 KAT HATA (senin SUPHE'de yazdigin acik; gercek kart satiri):
    dubbel "candi'yi 0,3 kg yapsam" -> "Anladigim: MIKTAR DEGISIR — Koyu Candi Sekeri (Kaya) — Hazkat 100,0 g → … 0,3 g"
    dubbel "candi şekerini 0,2 kiloya çıkarsam" -> "… 100,0 g → … 0,2 g"
    (gram ile yazilinca dogru: "Hazkat'ı 150 grama çıkarsam" -> 150 g; fark yolu dogru: "candiyi 50 g artırsam" -> 150 g)
  Y2 — KATALOGDA OLMAYAN MAYA RECETEDEKI MAYAYA ESLENIYOR:
    dubbel "mayayı WLP530 ile değiştirsem" -> "Anladigim: DEGISTIR — WY3787 Trappist High Grav → WY3787 Trappist High Grav (maya)". WLP530 katalogda kayit DEGIL (yalniz bonusMaya regex'lerinde gecer). Kendisiyle degistirme = yanlis cozum; dogrusu bilinmeyen "WLP530" -> yok/belirsiz (ayni yapi "WLP500" ve "BE-256" ile dogru calisiyor).
  Y3 — "X'I Y YAPSAM" DEGISTIR DEGIL 'tat':
    weizen "mayayı WB-06 yapsam" -> "Anladigim: SORU (degisiklik yok) — Fermentis WB-06" (ayni anlam "WY3068'i WB-06 yapsam" -> belirsiz).
  Y4 — "yarısını kullansam" 'tat':
    dubbel "special b'nin yarısını kullansam" -> "SORU (degisiklik yok) — Special B".
  Gereksiz belirsiz (guvenli, ama dogrusu belli): "Special B'yi tamamen atsam" (cikar), "special b'siz yapsam" (cikar), "candi olmadan yapsam" (cikar), "WY3068'i WB-06 yapsam" (degistir).
Kok neden: Y3/Y4 ayni sinif — DOG4C'nin "recetedeki kalem + taninmayan degisiklik -> belirsiz" kurali yalniz belirtme ekli kaleme bakiyor; "mayayi" (tur sozcugu) ve "-nin yarisini" (iyelik) kacti. Y1 A1._degKur'da katki satirinda birim yok sayiliyor. Y2 bilinmeyen urun adi atilip "mayayi" tur sozcugu tek basina recete mayasina cozuluyor.

1. KATKI BIRIMI (Y1)
- A1._degKur katki miktarinda v.birim'i satirin birimine cevirir (kg <-> g; ml/L ayni mantik; birim cevrilemiyorsa -> ok:false, neden "birim cevrilemedi" -> cozum belirsiz). Malt/hop yolunda ayni dogrulama zaten varsa aynen.
- Test: "candi'yi 0,3 kg yapsam" -> 300 g; "candi şekerini 0,2 kiloya çıkarsam" -> 200 g; "Hazkat'ı 150 grama çıkarsam" -> 150 g; "candiyi 50 g artırsam" -> 150 g; ml birimli bir katki satiri (sentetik) icin "0,1 litre" -> 100 ml.
- Bu acik onceki sprintlerin gercek kosularini etkilemis mi OLC: koşu #4 kaydinda ve tuzak seti v5 93 istemde katki satirina kg/L ile verilmis miktar var mi? Sayi + istem listesi raporda (yoksa "0").

2. BILINMEYEN URUN ADI KAYBOLMAZ (Y2)
- Soruda katalogda karsiligi olmayan urun-benzeri ad (buyuk harf/rakam kodu: WLP530, US-04, "Hitit Altin" gibi) varsa ve "yerine / ile degistir / yap" yapisinin Y'si oysa -> Y = bilinmeyen, mod 'yok' (bilinmeyen.ad) ya da belirsiz; ASLA recetedeki ayni turun satirina cozulmez. Genel kural: degistir'de eski.id === yeni.id -> cozum gecersiz (belirsiz, neden "ayni kalemle degistirme").
- Test: "mayayı WLP530 ile değiştirsem" -> yok/belirsiz (bilinmeyen WLP530); "mayayı WLP500 ile değiştirsem" ve "mayayı BE-256 ile değiştirsem" DEGISTIR aynen.

3. TUR SOZCUGU VE IYELIKLE DEGISIKLIK (Y3, Y4 + gereksiz belirsizler)
- "X'i Y yap(sam)" / "mayayı / hopu / maltı Y yapsam" = DEGISTIR X -> Y (tur tutarliligi aynen; Y miktar degilse). "WY3068'i WB-06 yapsam" ve "mayayı WB-06 yapsam" -> DEGISTIR wy3068 -> wb06.
- "X'in yarisini / iki katini / ucte birini kullansam / koysam / atsam" -> MIKTAR (carpan; DOG4C carpan tablosu, tek kaynak). "special b'nin yarısını kullansam" -> 60 -> 30 g.
- "X'siz / X olmadan / X koymadan yapsam" ve "X'i tamamen / hic atsam" -> CIKAR (recetede satir varsa; yoksa yok). "atsam" TEK BASINA belirsiz kalir (biracilikta "hop atmak" = eklemek).
- DOG4C'nin "recetedeki kalem + taninmayan degisiklik -> belirsiz" kurali belirtme ekine ek olarak IYELIK ekli kaleme ("-nin/-nın/-in/-ın … -ini/-sını") ve TUR SOZCUGUNE ("mayayi / hopu / malti / sekeri") de uygulanir. Kalem recetede VAR + -sam/-sem fiili + degerlendirme isareti ("olur mu", "uyar mi", "ne katar", "nasil", "iyi mi") YOK -> asla 'tat'.

4. TEST
- Y1–Y4 ve 4 gereksiz belirsiz (metin AYNEN, yukarida) case olur.
- Dogru kalmasi gerekenler (AYNEN): "dubbele kişniş uyar mı" tat stil Dubbel · "Special B'yi biraz fazla koysam" belirsiz · "CaraMunich'i atıp Special B'yi artırsam" belirsiz · "Special B'yi çıkarıp yerine Carafa koysam" belirsiz (Carafa cok aday) · "Saaz yerine Styrian kullansam" (Dubbel'de Saaz yok) belirsiz · "kuru hop eklesem" belirsiz · "Hallertau'yu 10 dakika kaynatsam" belirsiz · "munich maltını 2 kilo azaltsam" (wbock 1600 g) belirsiz · DOG4C 14 + 13 + 79 aynen.
- Uretilmis set: madde 3 icin iyelik / tur sozcugu / -siz / olmadan cekim tablosundan en az 40 YENI soru (sozlugu okuyup ayni sozlukle uretme).
- DEGISMEMESI GEREKEN: tuzak seti v5 93 istem parmak izi (cb74f605/11217) BIREBIR; DOG4B + DOG4C setleri birebir (degisen olursa satir satir + gerekce; gerekcesiz = dur).
- KASITLI BOZMA: madde 1 birim cevirimi kapali -> en az 2 kirmizi; madde 2 eski === yeni korumasi kapali -> en az 1; madde 3 iyelik/tur sozcugu kapali -> en az 2.

5. DOGRULAMA + AKIS
- npm test TAM yesil. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). Puanlama metni DEGISMEZ. Plan / tahmin (≈ 6,38 $ VARSAYIM, tavan 13,08 $) degismemeli — degisirse nedenini yaz.
- Canli curl, SW bump (v131-507), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Duzenlemeden once TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK. Kaan'dan bir sey istenmez.
- Not: Claude dogrulamada bu dosyada OLMAYAN dorduncu bir held-out setle sinayacak.

RAPOR: Y1–Y4 + gereksiz belirsizler once/sonra (Anladigim satiri metniyle), madde 1 olcumu (gecmis kosularda kg/L katki), dogru kalmasi gerekenler, uretilmis set, parmak izleri, kasitli bozmalar, imza, SUPHE (zorunlu).
