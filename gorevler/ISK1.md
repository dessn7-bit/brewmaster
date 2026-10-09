SPRINT ISK1 (ND5 uzerine) — iskeleti ornek verisinden TURET: 42 elle yazilmis stil yerine veriyle buyuyen iskelet + kendini denetleme

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.
ON KOSUL: ND5 (gorevler/ND5.md) canlida olmali. git log'da ND5 sprint commit'i yoksa HICBIR SEY yapma, "ND5 yok" diye raporla ve dur.

NEDEN: STIL_ISKELET 42 stilde elle yazilmis, sabit. Kalan stillerde "Stil iskeletinden yeni recete" neredeyse bos recete aciyor (katman C: yalniz BJCP hedefi + maya). Kaan'in hedefi kendi kendine gelisen bir program: iskelet elle degil, ornek verisinden (K1 NHC madalya, K1 AHA, K2 odullu klon, K3 kaynakli, K4 topluluk; ornek_veri.js) hesaplanmali; veri buyudukce kendiliginden yeniden hesaplanmali; her sayi kaynagina izlenebilmeli. Uydurma YOK.

1. TURETME (build-time builder, ornegin _isk_build.js -> iskelet_veri.js)
- Girdi: ornek_veri.js'teki tum ornekler. Esleme UYGULAMANIN kurallariyla (_bmKatCoz / _bmMetinCoz / ND5 alias'lari) — builder icin ayri esleme tablosu YAZMA; ayni kodu paylas ya da headless uygulamada hesapla.
- Agirlik: K1/K2/K3 = 1, K4 = 0.3 (gerekce: K4 kalitesi bilinmiyor). Farkli agirlik denersen 3. maddedeki olcumle gerekcelendir.
- Grist: her malt satiri -> MALTLAR kaydi -> ROL (MALTLAR.g + renk r ile): baz · kristal/karamel acik (<40L) / orta (40-80L) / koyu (>80L) · ozel kilnli (munich/vienna/aromatic/melanoidin/biscuit vb.) · kavrulmus (>=300L) · bugday/yulaf/cavdar · adjunct · seker. Agirlik yuzdesi (AHA zaten %). Iskelete girer: agirlikli frekansi >=%50 olan roller; payi = agirlikli medyan (IQR da tutulur); paylar 100'e normalize. Rolun temsil malti = o roldeki en sik eslenen MALTLAR id'si.
- Hop: zaman sinifi — aci (>=45 dk), lezzet (10-44), aroma (0-9 / whirlpool), dry hop. Her sinif icin frekans, gramli kaynaklarda IBU payi (hIBU) ve aroma/dry icin g/L medyani (kaynak hacmine bolunmus). Cesit = sinifta en sik eslenen HOPLAR id'si. AHA (gramsiz) yalniz frekans/cesit sayimina girer.
- Maya: en sik eslenen MAYALAR id'si; agirlikli pay <%30 ise ilk 3 alternatif de tutulur.
- Lezzet katkisi (ND5 eslemesiyle): agirlikli frekansi >=%40 olan katki, YA DA stil adinin tanimladigi imza malzemesi (Coffee -> kahve, Pumpkin -> balkabagi, Chocolate, Honey, Smoked/Rauch -> isli malt vb.; stil adi <-> katalog eslemesini tek tabloda kur, testli). Miktar: katkisi olan orneklerin g/L medyani; hicbirinde kutle yoksa iskelette "miktar kaynakta yok — senin kararin" diye isaretli (UYDURMA).
- Hedef: OG / IBU / SRM / FG / mash = orneklerin agirlikli medyani, BJCP bandina kirpilmis; kirpma sayisi raporda.
- Kaynak izi: her iskelet satiri n, agirlikli frekans, kademe dagilimi (K1/K2/K3/K4) ve ornek referanslari tasir.
- Veri esigi: etkin n >= 3 -> "turetilmis"; 1-2 -> "zayif iskelet" etiketi; 0 -> STYLE_FAMILIES.json'da ayni ailedeki en yakin stilden "X stilinden odunc" etiketiyle; o da yoksa bugunku katman C.

2. 42 ELLE ISKELETLE KARSILASTIRMA
- 42 stilin her biri icin elle yazilmis ve turetilmis iskeleti 3. maddenin olcutleriyle karsilastir. Varsayilan, olcumde daha iyi olan. Elle yazilmis tablo SILINMEZ; yedek olarak kalir.
- Rapor: stil · elle vs turetilmis · kazanan · fark.

3. KENDINI DENETLEME (iskeletin gercekten o stili urettigini olc)
- Birini-disarida-birak: her ornek icin iskeleti o ornek OLMADAN turet, ornegin hacmine ve OG/IBU'suna olcekle; olc: SRM hatasi (|tahmin - ornek|) ve rol kapsamasi (ornekteki rollerle Jaccard). Stil basina ve genel medyan.
- Hakem: her iskeleti 11 L / verim 61 ile receteye cevir, UYGULAMANIN canli stil motoruna ver; hedef stil top-1 / top-3'te mi? Motorun kapsamadigi stiller (Sprint Z kapsamda ayrimi) "hakem kapsam disi" diye ayri sayilir, isabete katilmaz.
- Totoloji uyarisi: motor K4 korpusuyla ortusen veriyle egitildi; hakem isabetini yalniz K1-K3'ten turetilmis iskeletle de ayrica olc ve ikisini yan yana raporla.
- Basarisiz stiller (SRM hatasi yuksek ya da hakem top-3 disi) listede, olasi nedeniyle.

4. ARAYUZ
- "✨ Stil iskeletinden yeni recete", editordeki "Iskeleti Doldur" ve iskelete dusen "Bu ornekten yola cik" yolu ayni yeni kaynagi kullanir; hesap _stilIskeletHesap uzerinden (grist OG'ye, aci hop IBU'ya olcekleme mantigi aynen).
- Recete acilinca bildirimde kaynak: "N odullu/kaynakli ornekten turetildi" · "zayif iskelet (n=2)" · "X stilinden odunc".
- Recetenin notuna (S.notlar) kisa "Iskelet nereden geldi?" bolumu: her satir icin n ve frekans ("Kavrulmus arpa %9 — 11 ornegin 10'unda").
- Iskelet hic yoksa (katman C) dugme metni "Bos recete (yalniz stil hedefleri)" olur.
- Sprint Z kurali aynen: __stilSecKaynak = 'iskelet' -> stil ogrenme sinyali yazilmaz.

5. KENDILIGINDEN GUNCELLENME
- iskelet_veri.js yalniz builder ile yazilir; _cc_veri_yaz.js ornek_veri.js'i her yazdiginda iskeleti de yeniden uretir (?v icerik hash'i HTML + sw.js'te otomatik, CC5 deseni).
- iskelet_veri.js icinde kaynak ornek_veri hash'i saklanir; test hash'ler uyusmazsa kirmizi (bayat iskelet canliya cikamaz).
- Repo PUBLIC: iskelet yalniz sayi + katalog id + ornek referansi tasir; tarif metni gomulmez.

6. DOGRULAMA
- npm test yesil + yeni case'ler: rol siniflamasi (renk sinirlari), frekans esigi, agirlikli medyan, hop zaman siniflari, imza malzemesi kurali (Coffee Stout iskeletinde kahve VAR), zayif/odunc/C etiketleri, hash senkronu, dugme metni. En az 2 case kasitli bozmayla kirmizi.
- Olcum: iskeleti olan stil sayisi once/sonra (42 -> ?; turetilmis / zayif / odunc / C ayri); 3. maddenin LOO ve hakem sonuclari; 42 karsilastirma tablosu.
- Ornek ciktilar (gram gram, 11 L): Coffee Stout, Weizenbock, Dubbel, ve iskeleti olmayan bir trend stil — her birinin kaynak izi ile.
- 390 ve 360 ekran goruntusu: iskeletten acilan recete + kaynak bildirimi + not bolumu.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma.

RAPOR: kapsam once/sonra, LOO + hakem (K1-K3 ve tumu ayri), 42 karsilastirma, 4 ornek iskelet, basarisiz stiller, SUPHE (zorunlu).
