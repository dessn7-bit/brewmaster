SPRINT VERI1 (ISK2 b4c536b uzerine) — BJCP tablosu denetimi (otorite tablo) + AHA gercek hop gramlari + iskelet yeniden + ayni stok kalemi tek satir

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN: ISK2 raporu uygulamanin BJCP tablosunda (239 satir; stil secimi, uygunluk gostergesi, iskelet hedefi/kirpma ve yakinda AI hukmunun OTORITESI) birebir kopya satirlar buldu. Claude canli HTML'de dogruladi: German Pils = Dortmunder Export, Munich Dunkel = Schwarzbier, Belgian Blonde Ale = Saison / Farmhouse Ale, American Stout = American Porter, Cream Ale = American Wheat Beer (og/fg/ibu/srm/abv tamamen ayni). Ayrica ISK2: ham AHA verisinde madalyali hop satirlarinin %97,1'inde gram VAR; ISK1'in "varsayimli gram"i gereksiz yere kullaniliyor. AI1'den ONCE bunlar duzelmeli.

1. BJCP TABLOSU DENETIMI (239 satirin hepsi)
- Kaynak: repodaki BJCP_2021_Guidelines.pdf + BJCP_2021_styles.json (118 stil) ve BJCP disi stiller icin BA_2026_Guidelines.pdf + BA_2026_styles.json. Once JSON'larin PDF'le tutarliligini 10 rastgele stilde PDF sayfasindan alintiyla dogrula; sonra her tablo satirini kaynak stile esle (ad + kod) ve og/fg/ibu/srm/abv'yi karsilastir.
- Satir siniflari: (a) kaynakla birebir, (b) farkli -> kaynakla duzelt, (c) kaynak stil bulunamadi -> dokunma + "kaynak yok" listesi, (d) cok-guclu stiller (ornek BJCP 25B Saison: table/standard/super) -> hangi araligi neden sectigin yaz (uygulamanin stil adiyla tutarli olan; secenekleri raporla).
- Tum birebir kopya satir ciftlerini otomatik tara (yukaridaki 5 cift + baskalari), her biri (b) ya da (c)'ye dussun.
- ETKI OLCUMU (salt okuma): Kaan'in kayitli recetelerinde (KR, Firebase SALT OKUMA) "stile uygunluk" gostergesi degisecek olanlar: recete adi, stil, eski/yeni bant, artik bant disi/ici. Iskelet hedefleri ve kirpma sayisi once/sonra.
- Rapor: degisen satir tablosu (stil, alan, eski, yeni, kaynak sayfa/kod).

2. AHA GERCEK GRAMLARI
- Ham AHA verisinde (builder'in zaten okudugu yerel dosya; yeni kaziyma YOK) hop gramlari ve varsa batch hacmi + grist agirliklari var mi olc. Varsa builder'i (AHA yolu) gram + hacim tasiyacak sekilde guncelle; AHA satirlari K2/K3 gibi "gramli" olur. Yoksa bulunan alanlar kadarini tasi.
- ornek_veri.js yalniz _cc_veri_yaz.js ile (?v hash otomatik). Repo PUBLIC: yalniz olgu (ad + miktar + zaman), talimat metni YOK.
- ISK1 "varsayim — kaynakta gramaj yok" yolu yalniz gerçekten grami olmayan satirlar icin kalir.
- Olcum: AHA hop satirlarinda gramli oran once/sonra; "Stogumla olustur" ile uyarlanabilen ornek 132 -> ?; ND durum dagilimi (✅/🟡/🔴) once/sonra ve degisimin nedeni.

3. ISKELETI YENIDEN URET
- Madde 1 ve 2'den sonra iskelet builder'i kendiliginden yeniden kossun (hash zinciri). Olc: turetilmis / elle / zayif / odunc / yok; hakem ilk 1 / ilk 3; LOO SRM hatasi + Jaccard; kirpma sayisi — hepsi ISK2 degerleriyle yan yana.
- Elle-vs-turetilmis secimini yeni olcumle yeniden yap; degisen stilleri listele.

4. AYNI STOK KALEMI TEK SATIR
- Uyarlanan recetede ayni stok kalemi birden cok satira karsilik geliyorsa (ornek Weizenbock: Carafa III 83 g + 4 g): malt ve seker satirlari TEK satirda toplanir; hop satirlari yalniz ayni zaman ve kullanimdaysa birlesir; katki ayni asamadaysa birlesir. Notta "X ve Y satirlari tek satirda birlestirildi" yazar. Toplam stok kontrolu aynen.

5. RENK DUZELTMESININ ETKISI (ISK2'deki x1,3 hatasi)
- Kaan'in kayitli recetelerinden gramla girilmis renkli katki (candi, Hazkat vb.) icerenler: eski / yeni SRM listesi (SALT OKUMA; recetelere yazma YOK). Fark 1 SRM'den buyukse listede.

6. DOGRULAMA
- npm test yesil + yeni case'ler: BJCP kopya satir taramasi (bilinen 5 cift artik farkli ya da gerekceli), en az 10 stilin degerleri kaynak alintisiyla, AHA gramli okuma, varsayim yolunun yalniz gramsiz satirda calismasi, tek satir birlestirme, iskelet hash zinciri. En az 2 case kasitli bozmayla kirmizi.
- Ornek ciktilar (11 L / %61, canli stok, Iskeleti stogumla olustur): Saison, Dubbel, Weizen, Schwarzbier — yeni BJCP bandina gore uygunluk.
- 390 ve 360 ekran goruntusu: duzeltilmis bir stilin uygunluk gostergesi, birlestirilmis satir notu.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek.

RAPOR: BJCP degisiklik tablosu + kaynak, Kaan'in recetelerine etkisi, AHA gram olcumu, iskelet once/sonra, renk duzeltmesi etki listesi, SUPHE (zorunlu).
