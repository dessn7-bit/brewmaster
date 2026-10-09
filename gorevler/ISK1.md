SPRINT ISK1 (KAT1 74a8e24 uzerine) — iskeleti ornek verisinden TURET + iskeletten stoguma uyarla + AHA ornekleri icin varsayimli hop gramaji

Bu dosyada 8 numarali madde var. Ise baslamadan 8'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN: STIL_ISKELET 42 stilde elle yazilmis ve sabit; kalan stillerde "Stil iskeletinden yeni recete" neredeyse bos recete aciyor (katman C). Kaan kendi kendine gelisen bir program istiyor: iskelet ornek verisinden (ornek_veri.js: K1 NHC madalya, K1 AHA, K2 odullu klon, K3 kaynakli, K4 topluluk) hesaplanmali, veri buyudukce kendiliginden yeniden hesaplanmali, her sayi kaynagina izlenebilmeli. Uydurma YOK.

1. TURETME (build-time builder, ornegin _isk_build.js -> iskelet_veri.js)
- Esleme UYGULAMANIN kurallariyla (_bmKatCoz / _bmMetinCoz / ND5-UYG2 alias ve sinif tablolari); builder icin ayri esleme tablosu YAZMA — ayni kodu paylas ya da headless uygulamada hesapla.
- Agirlik: K1/K2/K3 = 1, K4 = 0,3. Farkli agirlik denersen madde 3'un olcumuyle gerekcelendir.
- Grist: her malt satiri -> MALTLAR kaydi -> ROL. UYG2'deki tahil + islem sinifi tablosunu kullan (baz / kilnli / kristal-karamel acik <40 °L, orta 40-80, koyu >80 / kavrulmus / debittered / bugday-yulaf-cavdar / adjunct / seker). Agirlik yuzdesi (AHA zaten %). Iskelete girer: agirlikli frekansi >=%50 olan roller; pay = agirlikli medyan (IQR da tutulur); paylar 100'e normalize. Rolun temsil malti = o rolde en sik eslenen MALTLAR id'si.
- Hop: zaman sinifi — aci (>=30 dk ya da FWH; UYG1 kurali), lezzet (10-29), aroma (0-9 / whirlpool), dry hop. Her sinif: frekans, gramli kaynaklarda IBU payi (hIBU) ve aroma/dry icin g/L medyani (kaynak hacmine bolunmus). Cesit = sinifta en sik eslenen HOPLAR id'si. AHA (gramsiz) yalniz frekans/cesit sayimina girer.
- Maya: en sik eslenen MAYALAR id'si (ND2 coklu kod koprusuyle); agirlikli pay <%30 ise ilk 3 alternatif de tutulur.
- Lezzet katkisi: agirlikli frekansi >=%40 olan katki YA DA stil adinin tanimladigi imza malzemesi (Coffee -> kahve, Pumpkin -> balkabagi, Chocolate -> kakao/cikolata, Honey -> bal, Smoked/Rauch -> isli malt, Gose -> tuz + kisnis vb.; stil adi <-> katalog eslemesi tek tabloda, testli). Miktar: katkisi olan orneklerin g/L medyani (UYG1 oz<->g celiski kurali gecerli); hicbirinde kutle yoksa "miktar kaynakta yok — senin kararin" isaretli (UYDURMA). KAT1 doz alanlarini asan medyan uyari tasir.
- Hedef: OG / IBU / SRM / FG / mash = orneklerin agirlikli medyani, BJCP bandina kirpilmis; kirpma sayisi raporda.
- Kaynak izi: her iskelet satiri n, agirlikli frekans, kademe dagilimi (K1/K2/K3/K4) ve ornek referanslari tasir.
- Veri esigi: etkin n >= 3 -> "turetilmis"; 1-2 -> "zayif iskelet"; 0 -> STYLE_FAMILIES.json'da ayni ailedeki en yakin stilden "X stilinden odunc"; o da yoksa bugunku katman C.

2. 42 ELLE ISKELETLE KARSILASTIRMA
- 42 stilin her biri icin elle yazilmis ve turetilmis iskeleti madde 3'un olcutleriyle karsilastir; varsayilan olcumde iyi olan. Elle yazilmis tablo SILINMEZ, yedek kalir. Rapor: stil · elle vs turetilmis · kazanan · fark.

3. KENDINI DENETLEME
- Birini-disarida-birak: her ornek icin iskeleti o ornek OLMADAN turet, ornegin hacmine ve OG/IBU'suna olcekle; olc: SRM hatasi |tahmin - ornek| ve rol kapsamasi (ornekteki rollerle Jaccard). Stil basina ve genel medyan.
- Hakem: her iskeleti 11 L / %61 ile receteye cevir, uygulamanin canli stil motoruna ver; hedef stil top-1 / top-3'te mi? Motorun kapsamadigi stiller (Sprint Z kapsamda ayrimi) "hakem kapsam disi", isabete katilmaz.
- Totoloji uyarisi: motor K4 korpusuyla ortusen veriyle egitildi; hakem isabetini yalniz K1-K3'ten turetilmis iskeletle de olc, ikisini yan yana raporla.
- Basarisiz stiller (SRM hatasi yuksek ya da hakem top-3 disi) listede, olasi nedeniyle.

4. ARAYUZ
- "✨ Stil iskeletinden yeni recete", editordeki "Iskeleti Doldur" ve iskelete dusen ornek yolu ayni yeni kaynagi kullanir; hesap _stilIskeletHesap uzerinden (grist OG'ye, aci hop IBU'ya olcekleme aynen).
- YENI: iskeletin yaninda "📦 Iskeleti stogumla olustur" — UYG1/UYG2/KAT1 ikame motoru (aynen > ✅ > ⚠️ > ozellik benzeri [hop aroma satirinda varsayilan degil] > bilesik > alinacak), renk-esdeger miktar, dengeleme, Uyarlamalar notu: ornek onizlemesindeki "Stogumla olustur" ile AYNI kod yolu.
- Bildirimde kaynak: "N odullu/kaynakli ornekten turetildi" · "zayif iskelet (n=2)" · "X stilinden odunc". Recete notuna "Iskelet nereden geldi?" bolumu (satir basina n ve frekans, ornek "Kavrulmus arpa %9 — 11 ornegin 10'unda").
- Iskelet hic yoksa dugme metni "Bos recete (yalniz stil hedefleri)".
- Sprint Z: iskelet ve stoguma uyarlanmis iskelet = NIYET, stil ogrenme sinyali yazilmaz.

5. AHA ORNEKLERI ICIN VARSAYIMLI HOP GRAMAJI (Stogumla olustur kapsamini acar; UYG1'de 991 ornegin yalniz 99'u uyarlanabiliyordu)
- AHA orneklerinde hop zamani ve toplam IBU var, gram yok. Kural: aci sinifi hoplar ornegin IBU'sunu tutacak sekilde hIBU ile; birden fazla aci eklemesi varsa IBU esit bolunur (varsayim, notta yazar); lezzet/aroma/dry hop satirlari ayni stilin turetilmis iskeletindeki sinif g/L medyaniyla. Iskelette o sinifin g/L'si yoksa satir miktarsiz kalir (bugunku gibi dugmeyi engeller).
- Her varsayimli miktar recetede ve onizlemede "varsayim — kaynakta gramaj yok" etiketli; ornegin kendi verisi (kaynak) ile karistirilmaz.
- Olcum: "Stogumla olustur" ile uyarlanabilen ornek sayisi 99 -> ?.

6. KENDILIGINDEN GUNCELLENME
- iskelet_veri.js yalniz builder ile yazilir; _cc_veri_yaz.js ornek_veri.js'i her yazdiginda iskeleti de yeniden uretir (?v icerik hash'i HTML + sw.js'te otomatik, CC5 deseni).
- iskelet_veri.js icinde kaynak ornek_veri hash'i saklanir; hash uyusmazsa test kirmizi (bayat iskelet canliya cikamaz).
- Repo PUBLIC: iskelet yalniz sayi + katalog id + ornek referansi tasir; tarif metni gomulmez.

7. HOP ✅ ESIGI (KAT1 takibi)
- KAT1'de bazi hop ciftleri yalniz Charles Faram'in 2022 arsiv listesine dayanarak ✅ oldu (ornek Amarillo <-> Cascade, Mosaic -> Citra ⚠️'den ✅'e). Kaan'in dogrulama kurali: tek kaynak yetmez, ideal 2-3 kaynak. Kural: ✅ icin yetistirici/uretici veri sayfasi (Hopsteiner, YCH, BarthHaas, Yakima Chief) YA DA en az 2 bagimsiz kaynak. Tek tuccar listesine dayanan ✅'ler ikinci kaynak bulunamazsa ⚠️'e iner. Liste + karar + alinti raporda.

8. DOGRULAMA
- npm test yesil + yeni case'ler: rol siniflamasi, frekans esigi, agirlikli medyan, hop zaman siniflari, imza malzemesi kurali (Coffee Stout iskeletinde kahve VAR), zayif/odunc/C etiketleri, hash senkronu, dugme metni, iskeletten stoguma uyarla (ornek yoluyla ayni kod), AHA varsayimli gram etiketi ve IBU tutmasi, hop ✅ esigi. En az 2 case kasitli bozmayla kirmizi.
- Olcum: iskeleti olan stil sayisi once/sonra (42 -> ?; turetilmis / zayif / odunc / C ayri); madde 3 LOO + hakem (K1-K3 ve tumu ayri); 42 karsilastirma tablosu; uyarlanabilir ornek 99 -> ?; canli stokla ✅/🟡/🔴 (degismemeli, degisirse neden).
- Ornek ciktilar (gram gram, 11 L / %61, Kaan'in canli stogu ile "Iskeleti stogumla olustur"): Coffee Stout, Weizenbock, Dubbel ve iskeleti olmayan bir trend stil — her biri kaynak iziyle.
- 390 ve 360 ekran goruntusu: iskeletten acilan recete + kaynak bildirimi + not bolumu + "Iskeleti stogumla olustur".
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek (KAT1'deki kaza dersi).

RAPOR: kapsam once/sonra, LOO + hakem, 42 karsilastirma, 4 ornek cikti, AHA varsayimli gram olcumu, hop ✅ esigi kararlari, basarisiz stiller, SUPHE (zorunlu).
