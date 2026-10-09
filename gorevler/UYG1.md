SPRINT UYG1 (ND5 c015c0a uzerine) — "Stogumla olustur": ornegi tek tusla Kaan'in stoguna uyarla + satir degistirme onizlemesi + ND5 kalintilari

Bu dosyada 5 numarali madde var. Ise baslamadan 5'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN'IN ISTEGI (kendi sozleriyle ozet): Ornek onizlemesinde tek tusa basinca recete stoktaki malzemelerden kurulsun. Bende baska markada bir maya varsa en yakin muadili secip koysun. "Bunun yerine bunu koyarsan su degisir" diye detay versin.
NOT: gorevler/ISK1.md bu sprintin KAPSAMI DISINDA; ona dokunma (sonraki sprintte yeniden yazilacak).

1. ORTAK IKAME MOTORU (tek yer, testli; satir degistirme, "Stogumla olustur" ve ileride iskelet ayni motoru kullanir)
- Girdi: recete satiri (tip + katalog id + gereken miktar) + STOK. Cikti: stok adaylari, derece sirasiyla:
  1) aynen (stokta ayni kayit)
  2) ✅ muadil (MUADIL, fark "✅" ile baslayan — bugunku disiplin)
  3) ⚠️ muadil (MUADIL, fark "⚠️")
  4) ozellik benzeri — MUADIL kaydi yoksa YALNIZ malt/hop/maya icin katalog alanlarindan: malt = ayni kullanim grubu (MALTLAR.g) + renk yakinligi + ekstrakt; hop = ayni rol (aci/aroma) + alfa; maya = ayni tip (MAYALAR.tip) + attenuation araligi (atu) ortusmesi + sicaklik (sc) + karakter (e). Etiket: "ozellik benzerligi — dogrulanmis muadil degil" + farklar SAYIYLA (ornek "renk 120 °L -> 80 °L, ekstrakt %75 -> %77"). Lezzet katkisinda ozellik benzerligi YOK (lavanta <-> gul anlamsiz): yalniz aynen / MUADIL.
  5) yok
- Stok miktari: adayin stok miktari gereken miktari karsilamiyorsa aday "az var" isaretli (yine onerilir). "miktar ?" stok = dogrulanmadi (≈).
- ✅/🟡/🔴 durum hesabi DEGISMEZ (yalniz ✅ muadil sayilir). Motor yalniz recete KURMA ve onizleme icindir.
- Maya: coklu kod satiri ("WLP001 or Wyeast 1056") ND2 kurali aynen; hicbiri stokta yoksa motorla en yakin stok mayasi + Kaan'in maya kalibrasyonu (bm_maya_kalibrasyon) varsa beklenen FG o mayanin gercek attenuation'iyla.

2. "📦 STOGUMLA OLUSTUR" (ornek onizlemesinde yeni dugme)
- Her satir motorun en iyi adayiyla kurulur (Kaan madde 3'te baska aday sectiyse o).
- Yeniden dengeleme (uygulamanin kendi hesaplariyla, yeni formul yazma): grist orani korunarak Kaan'in hacim + verimiyle hedef OG'yi tutacak sekilde olceklenir (hOG); aci hoplar stoktaki hopun alfa degeriyle (stok kaleminde varsa o, yoksa katalog) hedef IBU'yu tutacak sekilde olceklenir (hIBU); aroma/dry hop g/L korunur. Hedef: ornegin OG/IBU'su (yoksa BJCP orta noktasi).
- Renk kendiliginden duzeltilmez; SRM once/sonra gosterilir, BJCP bandindan cikarsa ya da %15'ten fazla kayarsa uyari.
- Karsiligi olmayan kalem recetede KALIR, "alinacak" isaretli (alisveris listesine YAZILMAZ). Eslenemeyen ama kutlesi bilinen lezzet kalemi (ornek Dubbel'deki kimyon) recetede OZEL KATKI olarak ad + miktarla yer alir — sessizce dusmez (ND5 SUPHE 4'u bu kapatir).
- Her zaman YENI recete; acik is _bmAcikIsiGuvenceyeAl ile korunur; ad "<ornek adi> — stoguma uyarlandi". Sprint Z: stil ogrenme sinyali yazilmaz (iskelet yoluyla ayni niyet bayragi).
- Recete notuna "Uyarlamalar" bolumu: her degisen satir "X yerine Y (✅ / ⚠️ / ozellik benzerligi) — fark notu"; alinacaklar listesi; SRM uyarisi varsa.
- Mevcut "Bu ornegin malzemeleriyle olustur" dugmesi kalir (birebir ornek). Iki dugmenin farki onizlemede tek satirla yazar.

3. SATIR DEGISTIRME ONIZLEMESI ("bunun yerine bunu koyarsan ne degisir")
- Onizlemede her malt/hop/maya/katki satirina dokununca: motorun stok adaylari dereceleriyle + "aynen kalsin".
- Aday secilince ANINDA, yapay zeka OLMADAN: OG, FG, ABV, SRM, IBU once/sonra (madde 2'nin dengelemesi uygulanmis haliyle). Lezzet/karakter farki yalniz kaynakli metinden: MUADIL fark/detay alani; ozellik benzerinde sayisal farklar. Kaynagi olmayan lezzet yorumu YAZILMAZ.
- Secimler onizleme durumunda tutulur, "Stogumla olustur" bunlarla kurar; onizleme kapaninca sifirlanir. S'e dokunmaz.
- 44 px dokunma, 390/360'ta tasma 0.

4. ND5 KALINTILARI
- Coffee Stout'un kalan ❔'leri: "Weyermann Carafa II", "chit malt", "Debittered black malt (530 °L)", "Unsweetened chocolate baking nibs", "Mosaic Noble", "RVA132 Manchester Ale". BV kurali (ayni urun) ile katalogdaki kayda bagla; katalogda yoksa ve gercek urunse kaynakli kayit ac; belirsizse listele. Her karar gerekceli.
- "fresh"/"dried" atilmasi: katalog taze ile kuruyu AYIRAN kayitlar icin (ornek Kuru Portakal Kabugu vs taze kabuk) bu sozcukler cekirdekten atilmasin; etkilenen satirlari say.
- Kesik parantez: kapanmayan "(" sonrasi cekirdekten atilsin (ND5 SUPHE 6).
- oz <-> g celiskisi: ayni miktar metninde iki birim %10'dan fazla celisirse (ornek "dried lavender 1/2 oz. (56 g)": 1/2 oz = 14,2 g) miktar BILINMIYOR sayilir. Etkilenen satir sayisi + liste.
- ND5 SUPHE 7: yeni katalog kayitlarinin (ardic meyvesi, meyan koku, sweet gale, karaman kimyonu, mese kupu) ve Curacao / rapadura-panela / tuz kararlarinin kaynak sayfalarini GERCEKTEN ac ve oku; raporda her biri icin dayanak cumlesini alintila. Sayfa kararı desteklemiyorsa geri al.
- Kaan'in cevaplari (2026-10-09):
  a) Stoktaki "Candi sekeri" = Hazkat Profesyonel "Brewing Dark Candi Sugar" 250 g, KOYU KAYA (kati) seker — sirup DEGIL, D-180 kayitlarina BAGLANMAZ. Yeni KATKILAR kaydi ac: "Koyu Candi Sekeri (Kaya) — Hazkat", grup Seker, fermente, renk 360 EBC = srm 183, TAHMINI. Dayanak (aciklamaya yaz): Castle "Candy sugar dark (pieces)" 250-450 EBC (https://www.castlemalting.com/Publications/SugarProducts/SucreCandiBrunFT_en.pdf) ve Sudzucker "candy sugar brown crushed" 150-600 EBC (https://brouwland.com/en/sugars/21016-sudzucker-candy-sugar-brown-25-kg.html) orta noktalarinin ortalamasi; ureticisi bilinmiyor, gercek aralik 150-600 EBC. Kayda "renk tahmini" bayragi koy; bu kalemi iceren recetede SRM degerinin yaninda "tahmini renk" isareti gorunsun (tek yer, testli). Diger alanlar (gu, doz) mevcut koyu candi kayitlarindan KOPYALANMAZ: kaynak bulursan doldur, bulamazsan gerekceyle raporla. Sonra Kaan'in stok kalemini bu kayda bagla (STK1 yontemi: once salt okuma yedek repo DISINA, headless uygulama + gercek senkron odasi, uygulamanin kendi yazim yolu, Firebase'e ham yazma YOK).
  b) "Kurutulmus portakal" = DILIM. Katalogdaki portakal_kabuk kabuk kaydidir, ayni urun degil -> BAGLAMA, serbest metin kalir.
  c) "Antioksidasyon tuzu" ve "Mayse guclendirici": DOKUNMA (etiket teyidi bekleniyor).

5. DOGRULAMA
- npm test yesil + yeni case'ler: motor dereceleri (aynen > ✅ > ⚠️ > ozellik > yok), lezzet katkisinda ozellik benzeri YOK, "az var", ✅/🟡/🔴 durumu degismedi (eski case'ler aynen), dengeleme sonrasi OG ±0,002 ve IBU ±2 tutuyor, SRM uyarisi, alinacak kalem recetede kaliyor, eslenemeyen kutleli lezzet kalemi ozel katki olarak giriyor, yeni recete ustune yazmiyor, stil sinyali yazilmiyor, satir degistirme deltasi elle hesaplanan beklentiyle esit, oz/g celiskisi -> bilinmiyor. En az 2 case kasitli bozmayla kirmizi.
- Canli stokla (Firebase SALT OKUMA) olcum: tum ornekler icinde "Stogumla olustur" ile alinacaksiz kurulabilen ornek sayisi — yalniz aynen/✅ ile / ⚠️ dahil / ozellik benzeri dahil; alinacak sayisina gore dagilim.
- Ornek cikti (gram gram, Kaan'in hacmi/verimi): Founders Breakfast Stout klonu ve bir Weizenbock ornegi stoguma uyarlanmis hali + Uyarlamalar notu + SRM once/sonra.
- 390 ve 360 ekran goruntusu: satir degistirme listesi + delta, "Stogumla olustur" sonrasi recete ve notu.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. ornek_veri.js degisirse _cc_veri_yaz.js yolu.

RAPOR: motor kurallari + ozellik benzerligi agirliklari, "Stogumla olustur" olcumu, 2 ornek cikti, ND5 kalintilari (kaynak alintilariyla), SUPHE (zorunlu).
