SPRINT DOG4G (DOG4F 411db5b uzerine, SW v131-509) — tuketim korumasi yalniz "ikame" sonucunda calisiyor; soru/bilgi modunda sayi sessizce atiliyor. KUCUK SPRINT. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4F, canli kod, 2026-10-22): md5 canli = yerel (86ca3963…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-509. Y1–Y9 ve G1–G7 dogru; mutasyon tablosu, DOG4B E06 degisikligi (madde 2 geregi) KABUL.
HELD-OUT 6 (Claude, 40 yeni soru): 38'i dogru ya da guvenli belirsiz (otuz beş grama, on gram eksik, %50 azalt 30, yüzde elli artır 90, %80'ini 48, 0.5 kg / 1.5 kg / 1500gr / 1,5kg, 100 gr'dan 150 gr'a, Styrian yerine 25 g Saaz → 25 g, "20 gram koysam olur mu" → 20, iki paket / kuru hop / 30 dakika / ikiye bölsem → belirsiz). AMA 2 SESSIZ YOK SAYMA:
  S1 dubbel "Special B 60 değil 40 olsun" -> mod 'tat' — "SORU (değişiklik yok)"; 60 ve 40 sessizce atildi. Kok neden: koruma yalniz ikame sonucuna bakiyor (DOG4F madde 1 ifadesi buydu — benim gorev metnim dardi). Ayni sinif senin SUPHE'ndeki "%10 buğday maltının yarısını kullansam" -> tat.
  S2 dubbel "kişniş 2 gram/litre eklesem" -> EKLE Kişniş 2,0 g; "/litre" sessizce atildi (dogrusu 2 g/L × partinin hacmi ya da belirsiz).
  Gereksiz belirsiz (guvenli, bu sprintte zorunlu degil): "60 yerine 80 gram koysam", "1750'den 2000'e çıkarsam" ("100 gr'dan 150 gr'a" calisiyor — tutarsiz), "12 değil 15 gram koysam", "iki misli koysam", "2 paket WLP500".
  Kusurlu neden metni: "candi yerine 150 gram dekstroz koysam" -> belirsiz, neden '"150" bir katki değil (malt: Dekstroz…)' — sayi urun adi gibi yaziliyor. DOG4B notuna gore katki <-> seker grubundaki malt aranmali; neden calismadigini olc.

1. KORUMA TUM MODLARDA
- Tuketim korumasi cozumle'nin HER sonucuna uygulanir: tat / bilgi / yok / ikame. Soruda tuketilmemis miktar parcasi varsa ve mod tat / bilgi / yok ise -> belirsiz/islem, ayni sade neden ("Sorunun şu kısmını hesaba katamadım: '60 değil 40'…").
- Istisna (sayi tuketilmis sayilir): kalem adinin icindeki rakam (DOG4F kurali aynen); recetedeki satirin MEVCUT miktarina esit sayi yalniz "X g Special B Dubbel'e uyar mı" gibi degerlendirme sorusunda (tat kalir).
- DOG4B E01 ("Special B'yi 2 katına çıkarsam", wbock'ta Special B yok, beklenen degisiklikYok) belirsiz olursa KABUL — ikisi de degisiklik yapmaz; satir + gerekce raporda.

2. HACIM BASINA BIRIM
- "g/L, gram/litre, gr/lt, litre başına N g, litreye N gram, N g/L" parcasi miktar parcasi sayilir. Recetenin parti hacmi varsa yeni = N × hacim, "Anladığım" satirinda hesap acik: "Kişniş 2 g/L × 11 L = 22,0 g (yeni satır)". Hacim yoksa belirsiz.
- Ters yon ("litreye 2 gram" / "2 gram/litre" ayni); "10 litreye 20 gram" -> 2 g/L × parti hacmi (orani acik yaz) ya da belirsiz — hangisini sectigini gerekceyle yaz.

3. TEST
- S1, S2, "%10 buğday maltının yarısını kullansam" ve dekstroz sorusu (metin AYNEN) case olur.
- MUTASYON TESTINE yeni sinif: tat / bilgi / yok sonucu veren BUTUN sorulara ayni 8 ek parca ("20 gram daha", "yarısını", "15 dakikada", "%10", "0,5 kat", "biraz", "tamamen", "iki tane") + "/litre" + "60 değil 40". Kural DOG4F ile ayni: eski sonuc aynen = sessiz yok sayma = kirmizi, 0 olmali. Rapor: tat/bilgi/yok tabanli varyant sayisi + dagilim.
- DEGISMEMESI GEREKEN: tuzak v5 93 istem (cb74f605/11217), DOG4B (07bae582/23218), DOG4C, DOG4D, DOG4E, DOG4F setleri BIREBIR; degisen her satir + gerekce (E01 bekleniyor); gerekcesiz degisim = dur.
- KASITLI BOZMA: koruma tat/bilgi'ye uygulanmazsa S1 + mutasyon tat sinifinda en az 20 kirmizi; hacim basina kapali -> S2 kirmizi.

4. DOGRULAMA + AKIS
- npm test TAM yesil. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI. Puanlama metni DEGISMEZ. Plan / tahmin (≈ 6,38 $ VARSAYIM, tavan 13,08 $) degismemeli (93 istemin cozumu birebir oldugu surece).
- Canli curl, SW bump (v131-510), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Duzenlemeden once TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK. Kaan'dan bir sey istenmez.
- Not: Claude S1/S2 sinifini ve kucuk bir yedinci held-out setini sinayacak; sessiz yok sayma 0 cikarsa cozucu turlari kapanir, sira AI5D'ye gecer.

RAPOR: S1, S2, %10 sorusu, dekstroz once/sonra (Anladigim / neden metniyle), dekstroz kok nedeni, mutasyon tablosu (tat/bilgi/yok sinifi ayri), parmak izleri + degisen satirlar, kasitli bozmalar, imza, SUPHE (zorunlu).
