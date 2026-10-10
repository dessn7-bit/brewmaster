SPRINT BUL1 (AI4 uzerine) — "Tarif et, uygulama bulsun": serbest tarif -> gorunur filtre cipleri -> odullu orneklerde arama -> tek tusla stoguma uyarla

Bu dosyada 7 numarali madde var. Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN'IN ISTEGI (2026-10-09, "kesinlikle istiyorum"): "Kuru, baharatli, koyu bir Belcika birasi istiyorum" gibi bir tarif yazayim; uygulama odullu ornekler arasindan en yakinlari bulsun, tek tusla stoguma uyarlansin. AI4 ilkesi: AI yalniz tarifi aranabilir ozelliklere cevirir; arama, siralama ve sonuc UYGULAMADAN. Sonuclar gercek ornekler -> uydurma recete yok.

1. GIRIS
- Ornekler ekraninda "🔎 Tarif et" kutusu (serbest metin, TR ve EN). Ayrica bos reçete ekranindan erisim.
- Anahtar yoksa ya da AI kapaliysa da CALISIR (madde 2'nin sozluk yolu; AI yalniz sozlugun cozemedigi kisim icin).

2. TARIF -> FILTRE CIPLERI (once deterministik, sonra AI)
- Sozluk tablosu (tek tablo, testli, TR+EN es anlamlilar): renk (acik/altin/amber/kahverengi/koyu/siyah -> SRM araligi), guc (hafif/sessionable/guclu/imperial -> ABV araligi), kuruluk (kuru/orta/tatli -> gorunur attenuasyon ya da FG araligi), aci (az/dengeli/aci -> BU:GU ya da IBU araligi), maya karakteri (fenolik-baharatli / meyvemsi ester / temiz / kveik / Brett ...), koken/aile (Belcika, Alman, Ingiliz, Amerikan...), malzeme iceren/icermeyen (katalog id), stil adi gecerse stil.
- Esik degerleri kaynakli: SRM renk adlari ve stil aileleri icin BJCP 2021 (repodaki PDF) ya da kaynakli tablo; kaynagi bulunamayan esik "uygulama varsayimi" etiketli ve Ayarlar'da gorunur. Raporda tablo + kaynaklar.
- PARA HARCAMA YOK (Kaan karari 2026-10-10): bu sprintte hicbir gercek API cagrisi yapilmaz. Ozellik varsayilan olarak YALNIZ SOZLUKLE calisir; cozulemeyen kelime kullaniciya gosterilir ("bunu anlayamadim: ...") ve cip elle secilir. AI yolu yalniz AI beta anahtari aciksa devreye girer (su an KAPALI) ve yalniz mock ile sinanir: sozlugun cozemedigi kelimeler varsa ucuz model (claude-haiku-5-5) json_schema ENUM'larla (stil adlari = BJCP 240, maya aileleri, katalog id'leri, sabit aralik kodlari) cip SECER; enum disi deger duser. Model "cozemedim" diyebilir.
- Belirsiz kelime kurali: "baharatli" hem maya fenolu hem baharat katkisi olabilir -> iki secenekli cip ("maya baharati" / "baharat katkisi"), varsayilan maya baharati; Kaan degistirir. Celiski ("cok acik renkli koyu stout") -> uygulama tahmin ETMEZ, celiskiyi gosterip sorar.
- Cipler aramadan ONCE ekranda: "Soyle anladim: SRM 17–35 · kuru · Belcika maya (fenolik) · ABV 6–8". Her cip silinebilir/duzenlenebilir; arama ciplerden yapilir, metinden degil.

3. ARAMA (AI'SIZ)
- Kapsam: ornek_veri (K1–K4) + istege bagli "benim recetelerim" (salt okuma). Varsayilan sira: K1/K2 (odullu) once.
- Sert filtreler: icermeli/icermemeli malzeme, maya ailesi (cip secildiyse). Yumusak: SRM, ABV, kuruluk, aci — normalize uzaklik; her sonuc icin cip basina "uyuyor / yakin / uymuyor" isareti.
- Ornegin sayisi alani yoksa (ornek FG yok) o cip icin "bilinmiyor" yazar; tahminle doldurmaz (hesaplanmis deger varsa "hesaplanmis" etiketli).
- Ek cikti: ciplere uyan BJCP stilleri (bant kesisimi) — "bu tarif su stillere duser".
- "Stoğumla yapabileceklerimi one al" anahtari: mevcut ND/UYG durumu (✅/🟡/🔴) ikinci siralama olcutu.

4. SONUC KARTI
- En fazla 5 ornek: ad, stil, kademe (K1–K4) + kaynak, cip uyum isaretleri, OG/FG/ABV/SRM/IBU, stok durumu; "📦 Stoğumla olustur" (mevcut UYG akisi) ve "Onizle".
- Uyan yoksa: "bu tarife tam uyan ornek bulamadim" + en yakin 3 ve hangi cipte ayrildiklari + gevsetilebilecek cip onerisi (uygulama hesaplar). Uydurma recete YOK; AI recete URETMEZ.
- AI ozet yazmaz (gerek yok); kart tamamen uygulama verisi.

5. MALIYET + GIZLILIK
- Sozluk yolu bedava ve VARSAYILAN. AI yolu yalniz beta acikken (su an kapali): tek Haiku cagrisi; tahmini maliyet kartta/Ayarlar sayacinda.
- AI'ya giden yalniz tarif metni + enum listeleri; stok/recete verisi GITMEZ.

6. TEST SETI (mock + gercek)
- tests/bul_seti.json: 24 tarif (repoda, kisisel veri yok): 12 sozlukle cozulen, 6 AI gerektiren (deyimsel / dolayli: "yazin terasta icilecek hafif bir sey", "Westmalle'nin koyusu gibi"), 3 celiskili, 3 uydurma malzeme/stil iceren ("Pembe Kristal 120 iceren", "Anadolu Imperial Gose" — enum disi -> dusmeli, uydurmamali).
- Her tarifin beklenen cipleri ve beklenen ilk-5 icinde olmasi gereken en az bir ornek (ya da "bulunamadi") — beklenen cip sozluk tablosundan ve ornek verisinden (kaynak = tablo/ornek id).
- Metrikler: cip isabeti (beklenen ciplerin bulunma orani), enum disi uydurma 0, celiskide soru sorma orani, beklenen ornegin ilk-5'te olma orani.
- Gercek kosu YOK (Kaan: para harcanmayacak). Test seti sozluk yoluyla ve AI yolu mock ile kosar. Sozlugun 24 tarifin kacini AI'siz cozdugu raporda ana metrik; cozulemeyenler sozluge eklenecek aday listesi olarak raporlanir.

7. DOGRULAMA
- npm test yesil + yeni case'ler: sozluk esleme (TR+EN), belirsiz "baharatli" iki secenek, celiskide soru, enum disi cipin dusmesi, AI'ya stok/recete gitmemesi, sert/yumusak filtre, "bilinmiyor" alan, bulunamadi yolu + gevsetme onerisi, stoga uygunluk siralamasi, anahtarsiz calisma. En az 2 case kasitli bozmayla kirmizi.
- Ornek ciktilar (canli veri): "kuru, baharatli, koyu bir Belcika birasi", "muzlu karanfilli guclu bir bugday birasi", "hafif, acik renkli, az aci yaz birasi", "kahveli tatli bir stout".
- 390/360 ekran goruntusu: cip satiri + sonuc karti + bulunamadi karti.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.

RAPOR: sozluk tablosu + esik kaynaklari, 4 ornek cikti, test metrikleri (mock + gercek), gercek maliyet, SUPHE (zorunlu).
