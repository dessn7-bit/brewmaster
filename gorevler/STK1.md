SPRINT STK1 — stok temizligi + "ustune ekleme" hatasi + 26 katki

Bu dosyada 5 numarali madde var. Ise baslamadan 5'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.
SIRA ONEMLI: once 1, sonra 2 (hata duzelip canliya cikmadan veri degistirme), sonra 3-4, en son 5.

KAAN'IN BEYANI: Elindeki maltlar asagidaki siparislerdekiler. Cope gidenleri uygulamada zaten silmis. "Guncelledigimde devamli ustune eklemis" diyor: bazi miktarlar siparisten buyuk, bazi kalemler cift.
Siparisler (ekran goruntusunden):
- Hitit (siparis 417EQ77330): Asit Malt 250 g x6 = 1,5 kg · Kizil Cavdar 250 g x4 = 1 kg · Kristal Arpa 1 kg · Reddish 1 kg · Viyana 2 kg · Bugday 1 kg x2 = 2 kg · Isli Malt 500 g x4 = 2 kg. (Liste ekranda kaydirmaliydi; arada gorunmeyen kalem olabilir.)
- BiraBurada: Weyermann Cavdar 1 kg x2 = 2 kg · Weyermann Carafa 3 Special 1 kg · Weyermann Abbey 1 kg · Viking Pilsner 5 kg · Best Chocolate 1 kg · Thracian Pale 5 kg · Thracian Melanoidin Ruby 1 kg · Weyermann CaraMunich Type 1 1 kg.

1. YEDEK
- Firebase'deki guncel STOK + KR'yi SALT OKUMA ile al, repo DISINA (scratchpad) tarihli dosyaya yaz. Repo public — yedek asla commit'lenmez. Kalem sayisi ve icerik ozetini raporla.

2. "USTUNE EKLEME" HATASI — ONCE TESHIS, SONRA DUZELT
- Kodda stok miktarinin degistigi TUM yollari bul (stok ekleme formu, miktar duzenleme, +/- dugmeleri, alisveris/BB akislari, sync merge'i syncAl icindeki STOK birlesimi, import). Su iki hipotezi kanitla ya da curut:
  (a) Ayni malzeme yeniden eklenince/guncellenince miktar eskisinin USTUNE toplaniyor (kullanici "yeni miktar" niyetindeyken).
  (b) Iki cihazda ayni malzeme farkli id ile duruyor; STOK birlesimi bunlari tek kaleme indirmek yerine yan yana tutuyor -> cift kayit (Isli Malt iki ayri 2 kg kaydi, Kizil Cavdar eski kopyasi, adsiz "Hitit"/"Weyermann" hayaletleri buna uyuyor mu?).
- Gercek yedekle Playwright'ta yeniden uret (repro). Kok neden kanitliysa duzelt: kullanici niyeti "miktari ayarla" ise toplama degil atama; ekleme formunda ayni kalem varsa kullaniciya "mevcut X kg — ustune ekle / miktari X yap" secimi (WebView'da native confirm KULLANMA, in-app). Sync tarafinda ayni refId'li iki kalem olusmasini engelle; mevcut ciftleri otomatik BIRLESTIRME (veri kaybi riski) — yalniz uyar.
- Testler + 3 katman dogrulama + deploy (SW bump, APP_VERSION 'v2.79.10' SABIT). Kok neden kanitlanamazsa duzeltme yapma, bulgulari raporla ve 3. maddeye gec.

3. STOK DUZELTMESI (uygulamanin KENDI fonksiyonlariyla)
- YONTEM: Firebase'e ham yazma YOK. Uygulamayi headless tarayicida gercek senkron odasiyla ac (oda bilgisi Kaan'in yerel yedeginde/ayarinda var), uygulamanin kendi stok ekleme/silme/miktar fonksiyonlarini cagir; boylece localStorage + IDB + tombstone (Sprint CA) + Firebase senkronu normal calisir. Islem bitince Firebase'i yeniden okuyup dogrula.
- SIL (9 kayit): adi yalniz "Weyermann" olan 3 kayit · adi yalniz "Hitit" olan 4 kayit · Kizil Cavdar Malti (Hitit) eski kopyasi (02.06 tarihli) · Isli Malt (Hitit) ikinci 2 kg kaydi (Isli siparisi tek 2 kg; refId'li ve eski olani tut, digerini sil — hangisini sildigini raporla).
- MIKTAR DUZELT (siparis kaniti var): Bugday Malti (Hitit) 7 kg -> 2 kg · Cavdar Malti (Weyermann) 2,5 kg -> 2 kg.
- DOKUNMA (siparis listesinde gorunmuyor ama Kaan cope gidenleri zaten silmis; kaydirmali listede kalmis olabilir): Munich Malt (Hitit) 4 kg · Pilsner Malt 5 kg (07.04 kaydi) · Siyah Bugday 715 g · Karamela 585 g · Koyu Kristal 315 g · Cavdar (Hitit) 190 g · Bisküvi 275 g. Raporda "Kaan'in teyidi gereken" listesi olarak ayri goster.
- Hop/maya/katki kalemlerine bu maddede dokunma.
- Tombstone'larin Firebase'e yazildigini ve silinen kalemin bir senkron turundan sonra geri gelmedigini dogrula.

4. 26 KATKI EKLE (ayni yontem, uygulamanin kendi yolu)
Liste (Kaan'in adiyla): Yulaf ezmesi, Dekstroz, Laktoz, Bal tozu, Maltodekstrin, Antioksidasyon tuzu, Bira berraklastirici, Mayse guclendirici, Maya besini, Berraklastirici toz jelatin, Laktik asit, Epsom tuzu, Kalsiyum klorur, Gypsum tuzu, Kurutulmus lime, Kurutulmus portakal, Kakao nibs, Damla sakizi, Vanilya cubugu, Nobet sekeri, Limon otu, Mese cipsi, Viskide bekletilmis mese yongasi, Mavi kelebek cayi, Candi sekeri, CO2 gazlama sekeri (sivi).
- Miktar bilinmiyor: hepsi "miktar ?" (Sprint CA).
- Katalog eslemesi: kesin eslesme varsa refId bagla (AH1 deseni + BV alias, KATKILAR / MALTLAR). Belirsizse refId BOS, Kaan'in adiyla serbest metin. Tahminle esleme YOK. Ornekler: "Antioksidasyon tuzu" (metabisulfit mi askorbik asit mi belli degil) -> refId yok. "Mayse guclendirici" Tazemayse urunu; maltodekstrinle AYRI kalem, refId BAGLAMA (ayni urun degil). "Candi sekeri" rengi belli degil -> renk belirtilmemis kayda kesin eslesme yoksa refId yok.
- Stokta zaten varsa (ad/refId) ikinci kayit ACMA; raporda "zaten vardi" diye yaz.

5. DOGRULAMA + YENIDEN OLCUM
- Firebase'i yeniden oku: silinen 9 kayit yok ve tombstone'lu, 2 miktar dogru, 26 katki var (refId'li / serbest ayri sayi), baska kalem degismedi (once/sonra fark listesi).
- 2. maddenin testleri yesil; npm test tam paket yesil.
- ND4 olcumunu bu temiz stokla tekrarla: ✅ (isaretsiz / 🔁 / ≈) / 🟡 / 🔴, ✅ listesi, sepet 5 adim.
- Kaan'a telefonda yapacagi tek sey: uygulamayi acip Kiler'i kontrol etmek. Raporda bunu bir cumleyle yaz.

RAPOR: yedek dosya adi (yol), hatanin kok nedeni + duzeltme (ya da "kanitlanamadi"), silinen/duzeltilen/eklenen kalemler, Kaan'in teyidi gereken liste, yeni ND4 olcumu, SUPHE (zorunlu).
