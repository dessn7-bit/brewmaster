SPRINT BUL2B (BUL2 8f942f5 uzerine, SW v131-483) — "Tarif et" tur 2: "gibi" yanlis ticari ad, BJCP ticari ornek listesi (kaynakli, AI'siz), acik "fenolik", ilk-5 cesitliligi, AI'ya giden istem sayisi. GERCEK KOSU BU SPRINT BITINCE TEK SEFER.

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN: Claude BUL2'yi canli kodda AI'siz denedi (2026-10-14, BM_BUL.coz + BM_BUL.ara, 32 tarif). Iyi: Pliny / Guinness / Aventinus / Hoegaarden klonlari ilk sirada; yaz = Lager, Table Saison, Light Lager, Grisette, Leichtes Weizen; anlasilmaz tarifte arama yok. Bulunan sorunlar asagida. Kaan'a BUL kosusuna HENUZ BASMAMASI soylendi: bu sprint AI'ya giden istem setini degistiriyor; kosu bir kez, bundan sonra yapilacak.

1. "GIBI" YANLIS TICARI AD (hata)
- Olculen: "bal gibi tatli bir bira" -> ticari ad "bal" (katalogda id "bal", ad "Bal", alias honey VAR); "muz gibi kokan bir bugday birasi" -> ticari ad "kokan"; "cikolata gibi koyu bir porter" -> "cikolata"; "kadifemsi gibi bir bira" -> "kadifemsi". Ticari kipte AI enum'u yalniz 240 stil (B.kodlar yalnizStil) -> bal / cikolata malzeme cipi AI ile de SECILEMEZ; kart "'bal' ornek verisinde yok (klonu bulunamadi)" der.
- Duzeltme: katalogdaki her urunun ad / id / alias'i (malt, hop, maya, katki; Turkce ek beyaz listesiyle) sozlukte DETERMINISTIK malzeme cipi olur ("ballı bir bira" -> malz bal; bugun AI'siz "anlayamadim"). Genel tek kelimeler (maya, seker, malt, hop...) mevcut acik listeden haric. Katalog adi olan kelime ASLA ticari ad sayilmaz.
- Ticari ad adayi yalniz katalog / sozluk disi kelimelerden; fiil ve sifat bicimleri (kokan, icilen, kadifemsi gibi -an/-en/-msi/-imsi bicimleri) aday olamaz — kuralini sen kur, ama asagidaki listenin tamaminda dogru sonuc vermeli ve test olarak girmeli:
  ticari DEGIL: "bal gibi tatli bir bira", "muz gibi kokan bir bugday birasi", "cikolata gibi koyu bir porter", "kadifemsi gibi bir bira", "kahve gibi kavrulmus bir stout", "Pale Ale gibi bir sey", "IPA gibi ama hafif"
  ticari: "Westmalle'nin koyusu gibi bir sey", "Sierra Nevada Pale Ale gibi", "Duvel gibi", "Efes gibi bir lager", "Orval tadinda", "Chimay mavi gibi", "Westvleteren 12 gibi bir sey"
- Raporda: ticari ad tespitinin bu 14 tarifte once/sonra tablosu.

2. BJCP 2021 TICARI ORNEK LISTESI -> KAYNAKLI STIL CIPI (AI yok, onay yok)
- BJCP_2021_raw.txt'te 126 "Commercial Examples:" satiri var (satir kirilmalari birlestirilmeli; ornek "Westmalle\nExtra"). Ornek: Duvel -> Belgian Golden Strong Ale; Westvleteren 12 / Chimay Blue / Rochefort 10 -> Belgian Dark Strong Ale; Westmalle Dubbel / Chimay Red -> Dubbel; Westmalle Tripel -> Tripel; Sierra Nevada Pale Ale -> American Pale Ale. Build-time indeks (_bul_build_etiket.js deseni, kaynak satir no'su ile).
- Siralama: (a) ornek verisinde klon (BUL2) > (b) BJCP ticari ornek listesi > (c) AI stil tahmini (BUL2, onayli). (b) cipi etiketi: "BJCP 2021 ticari ornek: <bira> -> <stil>" — kaynakli oldugu icin onay gerekmez, ama cip duzenlenebilir/silinebilir.
- Marka birden cok stilde geciyorsa (Westmalle: Extra / Dubbel / Tripel; Chimay: Gold / Red / Tripel / Blue): tarifin diger cipleri (renk, guc) tek stile indiriyorsa o stil ("Westmalle'nin koyusu" + renk:koyu -> Dubbel; BJCP'de Dubbel amber, Tripel pale — etiketlerden), indirmiyorsa iki-secenekli belirsiz cip (BUL1 kurali), tahmin yok. "Chimay mavi" -> "mavi" ceviri UYDURULMAZ; Chimay 4 stil belirsiz cip olarak gelir.
- Sepet / katch-all stiller (34A Commercial Specialty, 34B Mixed-Style; Orval ve La Chouffe 34A'da) cip URETMEZ: "BJCP bu birayi kendi stiline koymuyor" notu + (c) yolu.
- Bu kiyas B202'nin beklenen stilini kaynaga baglar: BJCP 2021 Westvleteren 12'yi Belgian Dark Strong Ale ornekleri arasinda sayiyor (satir 6907-6909). B202 "genel bilgi" notu bu kaynakla degistirilir (B2 henuz gercek kosuda kullanilmadi; eski 24 tarif yine DEGISMEZ).

3. ACIK "FENOLIK" + BAGLAM BAHARATI YUMUSAK
- Olculen: "Noel icin fenolik baharatli bira" -> cipler malzGrup:Baharat + stilSet:kis; kullanicinin acikca yazdigi "fenolik" kayboluyor (belirsiz cip baglamla baharata cevrilmis). Kural: "fenolik" kelimesi kendisi yaziliysa maya:fenolik her zaman kalir; baglam yalniz ciplak "baharatli"nin belirsizligini cozer.
- Baglamdan (kis) gelen baharat cipi SERT filtre degil YUMUSAK olsun (BJCP 30C baharati zorunlu tutmuyor — senin BUL2 raporundaki kendi notun). Olculen: "kisin icilecek bir bira" bugun 4 sonuc. Kullanici "baharatli" yazdiysa sert kalir.

4. ILK-5 CESITLILIGI (siralama)
- Olculen: esit/benzer puanda ilk 5 ayni stilden doluyor: "koyu, kadifemsi bir bira" -> 5 x English Mild (545 uyan); "fenolik bir Belcika birasi" -> 5 x Belgian Blonde; "Efes gibi bir lager" -> 5 x American Light Lager; "muz gibi kokan bir bugday birasi" -> Dunkelweizen + 4 x Roggenbier, Weissbier yok; "bal gibi tatli" -> Altbier (FG 1.02 — VERI2 listesindeki sapan ornek aha6) + 4 x American Barleywine.
- Kural: ilk 5'te ayni stilden en cok 2 ornek (klon / BJCP ticari ornek cipiyle sabitlenenler haric); esitlikte K1 > K2 > K3 > K4; VERI2 listesindeki (kendi BJCP bandindan belirgin sapan) ornek, sapan alan aranan cipse esitlikte sona. Kartta "N uyan ornek, farkli stillerden ilk 5" yazar.
- Eski 24 + B2 + madde 1'deki 14 tarif icin ilk-5 once/sonra (AI'siz, gercek kayittaki AI kodlari aynen): beklenen ornek orani dusmemeli; duserse nedeni.

5. AI'YA GIDEN ISTEM SAYISI (karsilastirmanin anlami)
- Madde 1-2'den sonra gercek kosuda AI'ya giden istemleri say. BUL2 raporundaki 7 zaten zayifti; muhtemelen azalacak. Yeni grup "B3": sozluk + klon + BJCP listesiyle cozulmeyen, AI gerektiren en az 10 tarif (dolayli / deyimsel anlatim, BJCP'de olmayan marka, malzeme + baglam karisimi). Her birinin beklenen sonucu veriden / BJCP metninden / kuraldan (kaynak alaninda); "genel bilgi" kabul edilmez — kaynak yoksa beklenen "AI tahmini + onay" ya da "anlayamadim" olur. Toplam AI'ya giden istem >= 15 olmali; degilse raporda say ve neden.
- Kosu plani maliyetini yeni istem sayisiyla yeniden hesapla (Opus dusunme 2000 token VARSAYIM etiketiyle; Haiku ve Opus ayri; 2x pay).

6. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler (madde 1-4 her biri; madde 1'in 14 tarifi test listesi), en az 2 kasitli bozma kirmizi.
- 390/360 ekran goruntusu: BJCP ticari ornek cipi (Duvel), belirsiz Chimay cipi, cesitli ilk-5 karti.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- AKIS: bitince Kaan'a tek cumle: "Ayarlar ▸ AI ▸ BUL setini calistir'a bas, onayda yazan tutari gor, bitince BUL sonucunu kopyala ile yapistir." Sonuc gelince tablo (model · cip isabeti · ilk-5 · uydurma · AI tahmini sayisi · cagri basi maliyet) ve model karari Kaan'da (BUL2 madde 6).

RAPOR: madde 1 tablosu (14 tarif), BJCP indeks boyutu (bira adi / stil sayisi, catch-all haric) + 5 ornek, fenolik/baharat once-sonra, ilk-5 once/sonra (tum set), AI'ya giden istem sayisi + B3 listesi + kaynaklari, yeni maliyet tahmini, SUPHE (zorunlu).
