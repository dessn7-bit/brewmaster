SPRINT ND5 (STK2 uzerine) — lezzet katkilarini esle: kahve, meyve, baharat, tuz + adsiz ek kalemleri geri getir + ek kalem miktari

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

DURUM (spec yazilirken yerelde olculdu, ornek sayisi 1089 — sen kendi olcumunle teyit et):
- 279 ornekte ek kalem var; 613 ek satirin 223'u esleniyor. 138 ornekte eslenemeyen (proses yardimcisi olmayan) ek kalem var; 39 ornek YALNIZ bu yuzden ❔ ile ✅'den bloklu.
- Asil sorun katalog eksigi DEGIL, terim eksigi: KATKILAR'da Kisnis (kisnisch), Vanilya Cubugu (vanilya), Portakal Kabugu (portakal_kabuk), Turunc Kabugu (turunc_kabuk), Zencefil, Kahve Cekirdegi (kahve_cekirdek), Bitter Cikolata (bitter_cik), Kakao Niblari (kakao), Kakao Tozu, Visne/Kiraz, Ahududu, Bogurtlen, Yaban Mersini, Cranberry, Balkabagi vb. kayitlar VAR; ama ornek verisindeki Ingilizce yazimlar ("coriander seed" 16, "vanilla beans" 7, "sweet orange peel" 6, "bitter orange peel" 5, "ginger root" 5, "cocoa powder" 3, "raspberry puree", "ground sumatran coffee"...) _bmMetinCoz cekirdeginde hicbir terime esit degil.
- Katalogda gercekten olmayanlar: tuz (sea salt 7, kosher salt 4, table salt 2, non-iodized sodium chloride — Gose'nin imza malzemesi), ardic meyvesi (juniper berries 6; katalogda yalniz ardic DALI var), sweet gale 3, meyan koku (licorice root 2+) gibi.
- K1 (NHC madalya) orneklerinin 114'unde ek kalemlerin ADI YOK: _cc_build_k1.js satir 137-139 katki/taninmayan satiri yalniz sayiyor (ekN++), adini atiyor. Bu ornekler _bmOrnekStok'ta "kaynakta adi verilmeyen ek kalem" diye kalici ❔ — ama adlar builder'in zaten okudugu yerel ham veride duruyor.
- Ek kalem miktari hic okunmuyor: _bmOrnekKuru'da ek satirlari mik:null. Oysa veri "2 oz (57 g)", "0.25 oz (7 g)" gibi acik kutle iceriyor. Sonuc: lezzet katkisi stokta olsa bile yeterliligi olculemiyor (hep ≈) ve "Bu ornegin malzemeleriyle olustur" ek kalemli hicbir ornekte acilmiyor.
- Coffee Stout (3 ornek): K3 orneginde kahve ve cikolata satirlarinin dordu de eslenmiyor (+ "Debittered black malt (530 °L)"); AHA orneklerinde "bittersweet chcolate" (yazim hatasi, hop listesinde), "chit malt", "Weyermann Carafa II", "Mosaic Noble" eslenmiyor.

1. LEZZET KATKISI TERIMLERI (ND2/ND3 yontemi, KATKILAR alias)
- Eslenemeyen ek ve g/h satirlarindan lezzet katkisi olanlari (kahve, cikolata/kakao, meyve ve pureleri, narenciye kabugu, baharat, bitki, bal/seker/surup, mese/ahsap) frekans sirasiyla ele al; her biri icin katalogdaki kayda alias ekle.
- BV KURALI AYNEN: AYNI URUN, ikame DEGIL. Form farki (tohum/ezilmis/ogutulmus, taze/kuru, pure/butun meyve) ayni urun sayilir — katalog kaydinin adi o formu disliyorsa (ornek "Kahve Cekirdegi" vs "Espresso / Soguk Demleme") sayilmaz. Ayri urunler birbirine BAGLANMAZ: tatli portakal kabugu ≠ turunc (bitter orange) kabugu; vanilya cubugu ≠ vanilya ozu; ogutulmus kahve/cekirdek ≠ espresso/cold brew; ardic meyvesi ≠ ardic dali; cesitli bal ≠ cicek bali.
- Belirsiz genel yazim (sadece "coffee", sadece "honey", sadece "oak", sadece "candi syrup") katalogda o GENEL urune karsilik gelen tek kayit yoksa BAGLANMAZ; listele. "Curacao orange peel" gibi tartismali olanlarda karari kaynakla ver (ornek: bitter orange / laraha); kaynak yoksa "bulamadim", baglama.
- Ornek verisinde gercekten gecen yazim hatalari (ornek "chcolate") ayni urune baglanabilir; yalniz gercekte gecen yazimlar.
- Bir alias birden fazla kayda esitlenirse _bmMetinCoz null doner — yeni alias'larin bu cakismayi yaratmadigini test et.
- Hedef ve olcum: K1-K3 lezzet katkisi esleme orani once/sonra; eslenemeyen kalan yazimlar gerekceli liste.

2. KATALOGA EKSIK LEZZET KATKILARI
- Yalniz: katalogda karsiligi GERCEKTEN olmayan, ornek verisinde en az 2 kez gecen ya da bir stilin imza malzemesi olan gercek urunler. Beklenen adaylar: Tuz (NaCl; deniz/kaya/kosher — iyotlu sofra tuzunun ayni urun sayilip sayilmayacagini kaynakla karar ver), Ardic Meyvesi (Juniper Berries), Meyan Koku (Licorice Root), Sweet Gale (Bog Myrtle). Liste kesin degil; olcumune gore karar ver.
- Her yeni kayit: Turkce ad + Ingilizce ad parantezde, STK2 grup tablosuna gore dogru Kiler grubu (Tuz icin Baharat mi Proses mi: Gose'de lezzet verdigi icin PROSES YARDIMCISI DEGIL — _BM_PROSES yorumundaki karar aynen gecerli, listeye ekleme).
- Uydurma kayit yok: her yeni kaydin gercek bir urun oldugunu gosteren bir kaynak linki raporda.

3. K1 ADSIZ EK KALEMLERI GERI GETIR (CC5 builder yolu)
- _cc_build_k1.js: katki/taninmayan satirlari saymak yerine ek:[[ad, miktarMetni]] olarak tut (K2/K3'teki bicimle ayni). ekN yalniz gercekten adi cikarilamayan satir icin kalsin.
- Repo PUBLIC: yalniz malzeme adi + miktar metni (olgu) gomulur; tarif/yorum/talimat cumlesi GOMULMEZ. Yeni kaziyma YOK — yalniz builder'in zaten okudugu yerel ham veri.
- ornek_veri.js yalniz _cc_veri_yaz.js ile yazilir (?v hash otomatik).
- Olcum: ekAdsiz'li ornek sayisi once/sonra (114 -> ?); geri gelen adlarin 1. ve 2. maddeyle esleme orani.

4. EK KALEM MIKTARI
- _bmOrnekKuru: ek satirinin miktar metninde ACIK kutle varsa oku: "57 g", "1.5 kg", "2 oz" (oz -> g birim cevirisi kabul, 28.3495). Parantezli cift yazimda ("2 oz (57 g)") metrik deger esas. Hacim (tsp, tbsp, cup, mL) ve adet ("2 beans") -> mik null kalir (≈). Gramli kaynaklarda hop'larla AYNI hacim orani ile olcekle; AHA (gramsiz) kaynakta okuma yapma.
- Okunan miktar stokYetersizlikKontrol'e gercek miktar olarak gider; stok kaleminin birimi kutle degilse (adet, mL) karsilastirma yapilmaz, ≈ kalir.
- "Bu ornegin malzemeleriyle olustur": ek kalemin miktari biliniyorsa recetenin katki listesine o miktarla yazilir, kaynaktaki zamanlama metni ("0 min", "secondary") notta. Miktari bilinmeyen ek kalem varsa dugme ND2 kuralindaki gibi acilmaz. Proses yardimcisi miktari bilinmese de dugmeyi engellemez mi? — bugunku kurali OLC ve raporla; degistirme.

5. KAAN'IN STOGUNDAKI LEZZET KATKILARI
- Canli stokta (Firebase SALT OKUMA) lezzet katkisi kalemlerini listele: refId'li mi, degil mi.
- refId'siz olup katalogda TEK ve KESIN karsiligi olanlari STK1 yontemiyle bagla (once salt okuma yedek, repo DISINA; headless uygulama + gercek senkron odasi, uygulamanin kendi yazim yolu; Firebase'e ham yazma YOK).
- Belirsizler BAGLANMAZ, raporda "Kaan'a sorulacak" listesinde (ornek: "Kurutulmus portakal" kabuk mu dilim mi; "Antioksidasyon tuzu" ve "Mayse guclendirici" Kaan'in etiket teyidini bekliyor — DOKUNMA).

6. DOGRULAMA
- npm test yesil + yeni case'ler: en az 10 gercek yeni alias (form farki dahil), ayri-urun ayrimi (tatli portakal ≠ turunc, cubuk ≠ oz, cekirdek ≠ espresso, meyve ≠ dal) BAGLANMAZ, genel yazim ("coffee", "honey") baglanmaz, yeni katalog kayitlari, K1 ek adi geri geldi (ekAdsiz duser), kutle okuma ("2 oz (57 g)" -> 57 g, "0.5 oz" -> 14.2 g, "1 tsp" -> null) ve olcekleme, lezzet katkisi stokta + miktar yeterli -> satir 'stokta', yetersiz -> 'yetersiz' ("az var"). En az 2 case kasitli bozmayla kirmizi.
- Olcum (once/sonra): K1-K3 lezzet katkisi esleme; yalniz-ek-yuzunden-bloklu ornek sayisi (39 -> ?); ekAdsiz'li ornek; canli stokla ✅ (isaretsiz / 🔁 / ≈) / 🟡 / 🔴; sepet 5 adim; Coffee Stout'un 3 ornegi tek tek: durum + eksik kalemler (ne alinirsa ✅ olur).
- 390 ve 360 ekran goruntusu: kahveli/baharatli bir ornegin onizlemesi (lezzet katkisi satirlari eslenmis, miktarli) + malzeme aramasinda "kisnis" ve "kahve" sonuclari.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma.

RAPOR: esleme once/sonra + eklenen alias listesi (kayit -> yazimlar), baglanmayan yazimlar ve gerekcesi, yeni katalog kayitlari (kaynak linkli), K1 ek adlari once/sonra, kutle okuma kapsami, Kaan'in stogunda baglanan / sorulacak kalemler, yeni dagilim + Coffee Stout, SUPHE (zorunlu).
