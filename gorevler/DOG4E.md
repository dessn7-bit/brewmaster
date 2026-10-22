SPRINT DOG4E (DOG4D 581e3c8 uzerine, SW v131-507) — iyelikli kesir + azaltma fiili TERS hesaplaniyor. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG4D, canli kod, 2026-10-22): md5 canli = yerel (4dac7e2f…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-507. Senin raporundaki tum satirlar dogru; SAPMA 1-4 KABUL (hop birimi, recetede olmayan kalem -> belirsiz, genis kural, test ciktisi).
HELD-OUT 4 (Claude, 40 + 12 yeni soru, BM_AI4.cozumle + A1.degisiklikKur + A4.anladigim): birim cevirimi (0,025 kilo / yuz elli gram / 1,2 kiloya / iki yuz gram / 400 gram azalt / 0,15 kg azalt -> belirsiz) DOGRU; bilinmeyen urun (XQ77, Westmalle mayasi, "abbaye") DOGRU; "X'i Y yapsam", -siz / kullanmadan / koymadan DOGRU; "5 l su eklesem" belirsiz, "Pils'in rengini koyulastirsam" belirsiz DOGRU. AMA 1 SINIF YANLIS COZUM (7 soru):
  IYELIKLI KESIR + AZALTMA FIILI = KALAN MIKTAR TERS (atilacak kisim birakilacak kisim saniliyor):
    dubbel "Special B'nin dörtte birini çıkarsam" -> "Special B 60 g → 15 g" (dogrusu 45 g)
    dubbel "Special B'nin üçte birini atsam" -> 60 → 20 g (dogrusu 40)
    dubbel "Special B'nin dörtte birini azaltsam" -> 60 → 15 g (dogrusu 45)
    wbock "munich maltının dörtte birini çıkarsam" -> 1600 → 400 g (dogrusu 1200)
    wbock "munich maltının dörtte birini eksiltsem" -> 1600 → 400 g (dogrusu 1200)
    weizen "Hallertau'nun üçte birini kessem" -> 12 → 4 g (dogrusu 8)
  IYELIKLI KESIR + "DAHA EKLE" = ARTIS TERS:
    dubbel "Special B'nin dörtte birini daha eklesem" -> 60 → 15 g (dogrusu 75 ya da belirsiz)
  Kor nokta: uretilmis setinde bu yapi yalniz "yarısını atsam" ile vardi — k = 1/2'de k ve 1 − k ayni sonucu verir, hata gorunmez.
  Gereksiz belirsiz (guvenli): "Special B'den vazgeçsem", "Special B'yi hiç kullanmasam", "Special B'yi dörtte bir azaltsam", "Special B'nin dörtte biri kadar koysam", "candi'nin yarısı kadar daha koysam".
  Not (hata degil): "Weizenbock'ta carafa yerine Sinamar kullansam" -> DEGISTIR Carafa I 30 g → Sinamar 30 g (katalogda Sinamar malt grubunda; ayni kutle — hukum katmaninin konusu, bu sprintte degismez).

1. KESIR YONU (tek kural, sozluk kovalamaca degil)
- Iyelikli kesir k (yarisi / ucte biri / dortte biri / ceyregi / N'de biri) + fiilin YONU:
  * birakma / kullanma ("kullansam / koysam / bıraksam / kalsa") -> yeni = eski × k
  * azaltma / atma ("atsam / çıkarsam [belirtme ekli, -e/-a yönelme eki YOK] / azaltsam / eksiltsem / kessem / düşürsem / indirsem / kaldırsam") -> yeni = eski × (1 − k)
  * artirma ("daha eklesem / daha koysam / artırsam / arttırsam / ekstra") -> yeni = eski × (1 + k)
  * yon belirsizse -> belirsiz/islem (asla tahmin).
- Eksiz kesir + fark fiili ("X'i dörtte bir azaltsam", "üçte bir artırsam") -> ayni tablo (1 − k / 1 + k).
- "X'in N katı kadar daha" / "yarısı kadar daha" -> eski × (1 + k) ya da belirsiz (hangisini sectigini gerekceyle yaz).
- Fiil siniflari A4.farkYon / A4.carpanOku ile TEK KAYNAK (kopya sozluk yazma).
- Istege bagli (guvenli taraf, istersen): "X'den vazgeçsem", "X'i hiç kullanmasam / kullanmazsam" -> CIKAR. Yapmazsan belirsiz kalir, sorun degil.

2. TEST
- Yukaridaki 7 yanlis + 5 gereksiz belirsiz (metin AYNEN) case olur; beklenen degerler yukarida.
- Uretilmis set: k ∈ {1/3, 1/4, 1/5, 2/3, 3/4} (k = 1/2 TEK BASINA yeterli degil) × fiil sinifi (birak / azalt / artir / belirsiz) × iyelik / eksiz × kesmeli / kesmesiz × kucuk / buyuk harf, en az 60 YENI soru; her case'te beklenen sayi hesapla (eski × k / 1 − k / 1 + k), sozlugu okuyup ayni sozlukle uretme.
- DOG4D'nin "yarısını" case'leri (k = 1/2) aynen gecmeli.
- DEGISMEMESI GEREKEN: tuzak v5 93 istem (cb74f605/11217), DOG4B (e67bdfc1/23304), DOG4C (63030f24/12289), DOG4D seti BIREBIR (degisen olursa satir satir + gerekce; gerekcesiz = dur).
- KASITLI BOZMA: yon kurali kapali (hep eski × k) -> en az 6 kirmizi; artirma yonu kapali -> en az 1.

3. KESIR CEVIRISI GORUNUR
- "Anladığım" satiri kesirli cozumlerde hesabi da yazar: "Special B 60 g → 45 g (dörtte biri çıkarıldı)" / "(dörtte biri bırakıldı)" — kullanici yonun dogru anlasildigini gorebilsin. Yalniz gorunum; cozum ciktisi (mod, islem, eski, yeni, miktar, stil) parmak izine girmez.

4. DOGRULAMA + AKIS
- npm test TAM yesil. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). Puanlama metni DEGISMEZ. Plan / tahmin (≈ 6,38 $ VARSAYIM, tavan 13,08 $) degismemeli.
- Canli curl, SW bump (v131-508), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Duzenlemeden once TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK. Kaan'dan bir sey istenmez.
- Not: Claude dogrulamada bu dosyada OLMAYAN besinci bir held-out setle sinayacak.

RAPOR: 7 + 5 soru once/sonra (Anladigim satiri metniyle), uretilmis set (k dagilimi + sonuc), parmak izleri, kasitli bozmalar, imza, SUPHE (zorunlu).
