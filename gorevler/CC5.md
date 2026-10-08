SPRINT CC5 (5f2d6c7 uzerine) — son 12 bos stil + ozet otomasyonu

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.

EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.
ARAMA BUTCESI: Bu oturumun web arama butcesinin tamami 1. maddeye ayrilmistir.

1. HEDEFLI ARASTIRMA
Yalniz su 12 stil: Hazy Bitter, Hazy Lager, Oat Cream Lager, Pastry Sour, Smoothie Stout, Hazy Red IPA, Ranch Water Lager, Mexican Candy Gose, Pina Colada Gose, Juicy Bitter, Modern Belgian Pale Ale, Oat Cream IPA.
Sira K1 > K2 > K3. K3 kaynak listesi genisledi: onceki BYO / AHA acik sayfalar / Craft Beer & Brewing'e ek olarak Brulosophy, Scott Janish, The Mad Fermentationist ve bira fabrikalarinin kendi yayinladigi homebrew receteleri.
Ayni bekciler gecerli: parti hacmi + OG zorunlu (OG yoksa CC4 hesaplanmis-OG kurali ve etiketi), stil bandi, birim celiski kontrolu, yalniz olgular, talimat duzyazisi yok, her ornekte kademe + kaynak + yil.
Stil adi eslesmesi acik olmali: kaynak o stil adini acikca kullanmali (ornek: "pastry sour" demeyen bir meyveli sour alinmaz).

2. STIL BASINA 3
Bulunanlar stil basina en fazla 3. Bulunamayan her stil icin arama izi (bakilan kaynak + sorgu) raporda.

3. OZET OTOMASYONU
Builder'lar (_cc_build_*.js) ornek_veri.js'i yazdiktan sonra icerik ozetini hesaplayip HTML ve sw.js'teki ?v= adresini kendileri guncellesin. Tek komutla calissin, elle adim kalmasin. CC6 testi kapi olarak aynen kalsin.

4. DOGRULAMA
- npm test yesil.
- Ozet otomasyonunu kasitli bozmayla goster: veri degisir + builder calismazsa CC6 kirmizi; builder calisinca yesil.
- Bulunan her yeni ornek kaynaga karsi yeniden teyit (OG + malzeme adlari).
- 390 px ekran goruntusu: yeni dolan bir stil.
- Canli curl: SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma.

RAPOR
Dolan stiller (kademe + kaynak), hala bos stiller + arama izi, kullanilan arama sayisi, SUPHE (zorunlu).
