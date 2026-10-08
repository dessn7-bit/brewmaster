SPRINT ND3 (4c101a9 uzerine) — hop esleme + muadil tablosu denetimi + "ne alirsam ne acilir" onerisi

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

DURUM (ND2 raporundan): Malt esleme %80'e cikti, ✅ hala 2/991. Darbogaz artik esleme degil, Kaan'in stogu: 64 kalemin yarisi yerel urun (Hitit, Thracian, BiraBurada) ve dunya orneklerinde gecmiyor; en sik eksikler Briess 2-Row (225 ornek), Cascade 149, EKG 147, Chocolate Malt 131. Bu sprint ekrani Kaan icin karar araci yapar: neyi alirsa neyin acildigini gosterir.

1. HOP ESLEME (ND2'nin "en ucuz kazanc" dedigi is)
- ND2 yontemiyle (BV kurali: ayni urun, ikame degil; yazim ornek verisinde gercekten geciyor) eslenemeyen hop yazimlarini bagla: "kent golding", "e.k. goldings", "hersbrucker", "mt. hood", "cluster" vb. Katalogda gercekten olmayan hop baska hopa BAGLANMAZ; listele.
- Black patent karari: BV red listesindeki "black patent" yalniz ornek verisinde (K1-K3) ve satirda renk yazmiyorsa ya da yazan renk >=400°L ise katalogdaki black malt kaydina baglanir; korpus (K4) icin red aynen kalir. Gerekce ve sayi raporda.
- Hedef ve olcum: K1-K3 hop esleme once/sonra.

2. MUADIL TABLOSU DENETIMI (stok karsiligi sayilan ✅ esdegerler)
- ND2 iki bosluk buldu: (a) Briess 2-Row'un hic ✅ esdegeri yok, (b) "misir -> yulaf" ✅ isaretli ve suphe uyandiriyor.
- Taban maltlar icin ✅ esdegerligi URETICI VERI SAYFASI ile kur: renk (°L/EBC) ve ekstrakt (%) farki kucukse ve kullanim ayniysa ✅ (ornek aday: Amerikan 2-row <-> pale ale malt; pilsner <-> 2-row icin renk/DMS farki nedeniyle ⚠️ kalmasi beklenir — veriye gore karar ver). Her ✅ degisikliginde iki veri sayfasinin degerleri ve linki raporda; kaynak bulamazsan "bulamadim" yaz, ✅ verme.
- "misir -> yulaf" kaydini kaynakla denetle; desteklenmiyorsa ⚠️'e indir.
- Stok analizinde en sik eksik 20 kalemin MUADIL kayitlarini ayni yontemle gozden gecir; degisen her satir gerekceli listede.
- Kapsam disi: tum MUADIL tablosunu bastan yazmak. Yalniz bu 20 kalem + iki bosluk.

3. "NE ALIRSAM NE ACILIR" ONERISI (yeni, salt hesap — stoga yazma yok)
- Ekranin ust kisminda tek kart: "Su malzemeyi alirsan N ornek daha yapilabilir hale gelir" — ilk 5 malzeme. Hesap: her aday malzeme icin, yalniz o malzemenin eklenmesiyle 🟡/🔴'den ✅'e gecen ornek sayisi (tek-malzeme, acgozlu; birlesik sepet hesabi kapsam disi). Miktar varsayimi: ornekteki gerekli miktar kadar.
- Ayrica "1 kalemle ✅ olacaklar" listesi: tam olarak 1 kalemi eksik ornekler, eksik kalemin adiyla. Dokununca o ornegin onizlemesi.
- Karta dokununca o malzeme ile malzeme aramasi (ND1) acilir.
- Kart, stil/nota/eksen/malzeme filtrelerine uyar (o anki gorunume gore hesaplar).
- Performans: ND1 tembel hesap duzenine uy; ilk acilista tum ornek hesabi arka planda parca parca, kart hazir olana kadar "hesaplaniyor".

4. DOGRULAMA
- npm test yesil + yeni case'ler: yeni hop alias'lari (en az 8 gercek yazim), black patent kurali (K1-K3 bagli, K4 bagli degil, renk <400 bagli degil), degisen MUADIL satirlari (✅/⚠️ etkisi stok durumunda), oneri karti (sentetik stokla: tek malzeme ekleyince beklenen ornek ✅ olur, sayi dogru), "1 kalemle ✅" listesi. En az 2 case kasitli bozmayla kirmizi.
- Canli stok (Firebase SALT OKUMA) ile: ✅/🟡/🔴 once/sonra, oneri kartinin ilk 5'i ve her birinin acacagi ornek sayisi, "1 kalemle ✅" sayisi, Coffee Stout icin ne alinmasi gerektigi.
- 390 ekran goruntusu: oneri karti + "1 kalemle ✅" listesi.
- ornek_veri.js degisirse CC5 builder yolu. Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma.

RAPOR: hop esleme once/sonra, MUADIL degisiklik listesi (kaynakli), canli stokla dagilim once/sonra, oneri ilk 5, SUPHE (zorunlu).
