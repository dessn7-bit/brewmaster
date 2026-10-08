SPRINT ND1 (e1ee3d9 uzerine) — "Ne Demleyebilirim?" stil secme ekrani olur + malzemeye gore arama + ornek onizleme + stoga gore yapabilirlik

Bu dosyada 7 numarali madde var. Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN'IN ISTEGI (aynen): "Stil secimini Ne Demleyebilirim kismina alalim komple. Orada benim zaten recetede olan biralar degil, bu stil secme yeri olsun tamamen. Bir de sectigim ornegin onizlemesi olsun ve stoga gore gorebileyim hangisini yapabiliyorum hangisini yapamiyorum." + "Atiyorum hoplardan Aloha kullanmak istiyorum, ya da maltlardan suyu, ya da lavanta kullanmak istiyorum; sectigim malzemeye gore hangi receteler var onlari da bulabileyim. Stil secme kismini kaldirip ana ekrandaki Ne Demleyebilirim kismina tamamen tasiyacagiz."

1. EKRAN TASINMASI (TAMAMEN)
- Ana ekrandaki "🍺 NE DEMLEYEBILIRIM?" karti artik "Istedigin birayi tarif et" ekranini (window._brAc ile acilan ekran: stil arama + nota + eksenler + kaynakli ornekler) acar. Kartin alt yazisi yeni islevi anlatsin (ornek: "Stil ya da malzeme sec, ornek bak, stogunla neyi yapabilecegini gor").
- Bu ekranin TEK girisi bu kart olur. Editordeki "Stilin adini bilmiyorum — istedigim birayi tarif edeyim" girisi KALDIRILIR. Ekranda tek mod vardir: satirlarda "✨ Yeni recete" ve ornek eylemleri; acik receteyi dolduran "📋 Doldur" ve "🎯 Hedef yap" eylemleri bu ekrandan kalkar.
- Editordeki "🎯 Hedef Stil" acilir listesi ve yanindaki "📋 Iskeleti Doldur" KALIR: bunlar acik recetenin stil etiketini ve iskeletini belirler, Recete Doktoru / stil sinyali (Sprint Z) / AN bolumu buna bagli. Kaldirilan yalniz tarif-et ekraninin editor girisi.
- Kaldirilan giris ve eylemlere bagli olu kod kalirsa temizle (cagiran kalmayan fonksiyonlar); baska yerden cagrilan hicbir fonksiyonu silme, cagiran listesini raporla.
- Kartin eski icerigi (Kaan'in kendi recetelerinin hazir/az-eksik/cok-eksik listesi + alisveris listesi) bu karttan KALDIRILIR. window.bmDemlenebilirAnaliz ve stokYetersizTam SILINMEZ (baska yerler kullaniyorsa bozulmasin; hangi yerlerin kullandigini raporda listele). Kaan'in recetelerinin stok durumu editordeki 📦 rozetinde yasamaya devam eder.

2. MALZEMEYE GORE ARAMA
- Ekrana stil aramasinin yaninda "🧺 Malzeme" girisi: katalogdan (MALTLAR / HOPLAR / MAYALAR / KATKILAR) BV alias destekli arama ile bir ya da birden cok malzeme secilir (cip olarak). Ornek: Aloha (hop), bir malt, Lavanta (katki).
- Secili malzemelerin HEPSINI iceren kaynakli ornekler (K1-K4) listelenir (VE). Stil aramasi, nota ve eksenlerle birlikte de VE calisir. Sonuc satiri hangi stilin ornegi oldugunu ve 4. maddedeki yapilabilirlik rozetini gosterir.
- Eslesme: once 3. maddedeki kuru donusumun urettigi katalog kimligi (refId/id) ile; kimligi olmayan ham kalemlerde katalog kaydinin adi + alias + (katkilarda) tags alanlariyla metin eslesmesi (ornek: KATKILAR "lavanta" kaydi ornek verideki "dried lavender" / "lavender" kalemlerini bulmali). Bu esleme kurali tek yerde, testli; belirsizse eslesme sayilmaz.
- Sonuc yoksa durust mesaj. Secilen malzemenin MUADIL tablosunda karsiligi varsa ek satir: "X kullanan ornek yok; muadili Y kullanan N ornek var" (dokununca Y ile arar). Ornek: Aloha bir BiraBurada harmani — dunya kaynakli orneklerde gecmeyecek; muadil satiri bunun icin.
- Ayni secim ekraninda "Bu malzemeyle stil iskeleti" bilgisi: secili malzeme hangi stil iskeletlerinde (STIL_ISKELET) geciyorsa o stiller ayrica listelenir.
- Olcum (raporda): katalogdaki her malzeme icin kac ornek bulunuyor; hic ornegi olmayan katalog malzemesi sayisi; Aloha, Lavanta ve Kaan'in stogundaki her kalem icin sonuc sayisi.

3. ORNEK ICIN STOK ANALIZI (yeni hesap yazma, mevcut yolu kullan)
- Her kaynakli ornek (K1-K4) icin, "ornekten yeni recete" yolunun (window._bmKayYeniRecete ve K1 karsiligi) KULLANDIGI AYNI donusumle bellekte gecici bir recete nesnesi kur (KR'ye, LS'ye, IDB'ye, Firebase'e HICBIR SEY yazilmaz — kuru donusum). Sonra mevcut window.stokYetersizTam(tarif) ile stok kontrolu yap. Malt/hop/maya esleme, BV alias, maya kodu koprusu, refId, "miktar ?" (CA) kurallari aynen gecerli; yeni esleme mantigi yazma.
- Donusumde katalogla eslenemeyen kalemler (bugun nota dusenler) AYRI sayilir: "❔ eslenemedi". Eslenemeyen kalem asla "stokta" sayilmaz.
- Miktar, Kaan'in ekipman gercegiyle olceklenir (AV'nin kullandigi hacim/verim tasima kurali ile ayni kaynak). Kaynakta gramaji olmayan kalem (ornek: AHA hop gramajlari) icin "miktar bilinmiyor" — varlik kontrol edilir, yeterlilik iddia edilmez.
- Katki (ek) kalemleri: KATKILAR + stoktaki katki kalemleriyle ayni sekilde.
- Eksik ama MUADIL tablosunda stokta olan bir muadili varsa ayri durum: "🔁 muadili stokta" (yalniz MUADIL tablosu; tahmin yok).

4. YAPILABILIRLIK DURUMU (ornek bazinda, satirda rozet)
- ✅ Yapabilirsin: tum kalemler eslendi, hepsi stokta, miktari bilinen kalemlerde miktar yeterli.
- 🟡 Neredeyse: eksik yok ama miktari bilinmeyen / "miktar ?" kalem var, VEYA eksiklerin tamami muadil ile karsilanabiliyor, VEYA 1-2 kalem eksik.
- 🔴 Eksik: 3+ kalem eksik.
- Her durumda eslenemeyen kalem sayisi ayrica gosterilir ("❔ 2 kalem eslenemedi"); eslenemeyen kalemi olan ornek ✅ olamaz.
- Stil satirinda ozet: "✅ 2 · 🟡 3 · 🔴 5" (o stilin ornekleri). Ekranda filtre cipi: "Yalniz yapabileceklerim" (✅ + istege bagli 🟡). Arama + eksenler + nota ile birlikte (VE) calisir; bos sonucta durust mesaj.
- Stok degisince hesap yeniden yapilir (onbellek anahtari stok icerigi); ilk acilista ornek_veri.js yuklenene kadar bekleme durumu.

5. ONIZLEME (secilen ornek)
- Mevcut window._bmOrnekOnizle onizlemesine her malt/hop/maya/katki satirinin yanina stok durumu: ✓ stokta (stoktaki miktar / gereken) · 🔁 muadil (hangi muadil) · ✕ yok · ❔ eslenemedi · "miktar bilinmiyor".
- Onizlemenin ustunde tek satir ozet: durum rozeti + eksik sayisi.
- Eksik kalemler icin "🛒 Eksikler" listesi (salt gosterim; stoga yazma yok).
- "✨ Yeni recete olustur" aynen kalir; olusturulan recete bugunku yoldan gecer (kademe/kaynak notu, BH yas satiri, hesaplanmis-OG etiketi korunur).
- Kademe rozetleri (K1-K4) ve AN "tipiklik != iyilik" dili aynen.

6. MOBIL + PERFORMANS
- 390x844 ve 360x640'ta yatay tasma 0, dokunma hedefleri 44px (BJ2 standardi), sonuc listesi ilk ekranda gorunur kalmali (CB olcusuyle: 360'ta sonuc baslik y<=160px, nota paneli kapaliyken).
- Tum ornekler icin stok hesabinin suresini olc (gercek yedek fixture ile); 300 ms ustuyse tembel hesap (yalniz gorunen stil + acilan ornek) uygula ve raporla.

7. DOGRULAMA (3 katman)
- Statik: node --check tum inline bloklar + sw.js; kuru donusumde KR/LS/IDB/Firebase yazimi 0 (grep + runtime izleme).
- npm test: mevcut 265 yesil. Eski "Ne Demleyebilirim" kartini kilitleyen testler BILINCLI guncellenir (zayiflatilmaz; yeni sozlesmeyi kilitler). Yeni case'ler: editor girisi yok + ekranda Doldur/Hedef yap yok + Hedef Stil listesi ve Iskeleti Doldur editorde duruyor; malzeme aramasi (tek malzeme, iki malzeme VE, lavanta -> lavender ham kalem eslesmesi, sonuc yok + muadil satiri, Aloha); kuru donusum yazmaz, ✅/🟡/🔴 siniflamasi (sentetik stokla her biri), eslenemeyen kalem ✅ yapmaz, muadil durumu, miktar-bilinmiyor, filtre cipi, onizleme satir durumu, stok degisince yeniden hesap. En az 2 case kasitli bozmayla kirmizi.
- Gercek yedekle (Kaan'in stogu): kac ornek ✅ / 🟡 / 🔴, ilk 10 ✅ ornek listesi raporda. Coffee Stout orneklerinin durumu ayrica.
- 390 ve 360 ekran goruntusu: ana kart, ekran + filtre, malzeme aramasi (lavanta), bir ✅ ornek onizlemesi, bir 🔴 ornek onizlemesi.
- Canli curl: SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. ornek_veri.js degisirse CC5 builder yolunu kullan (elle ?v yazma).

RAPOR: Ne degisti (ekran gecisi, kaldirilan editor girisi ve olu kod), stok esleme orani (kalem bazinda eslendi/eslenemedi, kademe bazinda), Kaan'in stoguyla ✅/🟡/🔴 sayilari + ilk 10 ✅, bmDemlenebilirAnaliz'i kullanan yerler, malzeme aramasi olcumu, performans olcumu, SUPHE (zorunlu).
