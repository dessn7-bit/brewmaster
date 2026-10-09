SPRINT AI1 (VERI1 8470537 uzerine) — AI receteci asistani: katmanli cevap, uydurma/yalakalik onlemleri, "yeni recete olarak ac" (canlida KAPALI, beta anahtariyla)

Bu dosyada 8 numarali madde var. Ise baslamadan 8'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN'IN ISTEGI VE KURALI: Onizlemede/recetede AI'ya "bunun yerine bunu koysam ne olur", "lavanta Dubbel'e ne kadar" diye sorabilsin; konustuklari receteyi "yeni recete olarak ac" diyebilsin. AMA: AI ona hak vermek icin cevap vermemeli ve uydurmamali — "yoksa recete cop olur". Tasarim ilkesi: AI'nin isini kucult. Sayilar ve "olur/olmaz" hukmu UYGULAMADAN gelir; AI yalniz aciklar ve yorumlar, her iddia etiketli.
KAPSAM DISI (AI2'de): korpus kullanim tablosu, web arama katmani, 60 soruluk tuzak seti. Gercek anahtarla test YOK (AI3).
MEVCUT ALTYAPI: window.BM_AI (Sprint BW: BYOK, dogrudan api.anthropic.com, model + max_tokens kodda sabit, retry yok, navigator.onLine kapisi, anahtar yedege/senkrona girmez, cikti asla otomatik uygulanmaz) ve BM_AI.sor({kullanim, baglam, soru, sema}) json_schema destekli. Bunlarin USTUNE kur; kurallari gevsetme.

1. SAISON 3 GUC (Kaan karari)
- BJCP 2021 25B'ye gore uc satir: "Saison (table)" ABV 3,5-5,0 · "Saison / Farmhouse Ale" (standard) 5,0-7,0 · "Saison (super)" 7,0-9,5; diger alanlar PDF'ten (repoda BJCP_2021_Guidelines.pdf). Renk acik+koyu 5-22 SRM (PDF'teki pale/dark araliklarinin birlesimi; satirda not). Kaynak sayfa yorumu satirin yaninda.
- Iskelet/ornek esleme: mevcut Saison ornekleri ABV'sine gore uygun guce dusurulur (ornek_veri degisirse _cc_veri_yaz yolu; iskelet hash zinciri).
- Kaan'in Saison recetesinin (OG 1.068, ABV 7,3) stili DEGISTIRILMEZ (recetelere yazma yok); raporda "super secersen uygunluk su olur" olcumu.

2. BILGI PAKETI (tek fonksiyon, testli)
- Soru baglamina gore AI'ya giden veri: (a) acik recete ya da ornek (satirlar, katalog id, miktar, uygulamanin OG/FG/IBU/SRM/ABV'si); (b) Kaan'in stok ozeti; (c) ilgili kalemlerin katalog kayitlari — kaynakli alanlar, "tahmini"/"dogrulanmadi" bayraklari, doz alanlari; (d) MUADIL fark/detay metinleri + kaynak linkleri; (e) stilin BJCP bandi; (f) iskelet kaynak izi (n, frekans); (g) madde 4'teki hesaplanmis farklar.
- Her veri parcasinin bir ID'si olur (ornek "kat:lavanta", "bjcp:Dubbel", "hes:srm_sonra"); AI iddialarinda bu ID'leri gosterir.
- Boyut tavani (token); asilirsa en az ilgili parcalar dusurulur, dusurulen raporlanir. Prompt onbellegi BW2 karariyla KAPALI kalir.

3. CIKTI SEMASI + SAYI DENETIMI
- json_schema: { iddialar: [ { metin, katman: "veri" | "hesap" | "yorum" | "bilmiyorum", dayanak_id?: string } ], oneri_taslak?: [...madde 6...], ton: "olumlu" | "olumsuz" | "notr" }.
- "hesap" katmani metninde sayi YAZILMAZ: yer tutucu kullanilir ({SRM_ONCE}, {SRM_SONRA}, {OG_SONRA} ...); uygulama doldurur. Yer tutucusu taninmayan iddia dusurulur.
- "veri" iddiasi dayanak_id tasimak zorunda; uygulama ID'nin pakette oldugunu ve metindeki sayilarin o veriyle tuttugunu kontrol eder (birim cevirisiyle); tutmazsa iddia ustu cizili + "AI yanlis deger soyledi".
- "yorum" serbest ama basinda "💬 Bu benim yorumum, dogrulanmadi" etiketiyle gosterilir; yorumdaki doz katalog maxDozgL'yi asarsa uyari; veriyle celisirse veri kazanir + uyari.
- "bilmiyorum" acikca serbest ve odullendirilir (sistem metninde).
- AN5-DIL yasak listesi "veri" ve "hesap" katmanlarinda aynen gecerli; "yorum" katmaninda deger ifadesi serbest (etiketli oldugu icin) — bunu testle kilitle.

4. TARAFSIZLASTIRMA + HUKUM UYGULAMADAN
- Kaan'in sorusu AI'ya ham haliyle gitmez: once ucuz model (BM_AI 'esleme' kullanimi) sorudan yapilandirilmis degisikligi cikarir ({islem: degistir|ekle|cikar|miktar, kalem, yeni_kalem?, miktar?}); ana cagriya "Secenek A / Secenek B" (biri mevcut, biri degisiklik; sira RASTGELE, hangisinin Kaan'in fikri oldugu YAZILMAZ) + "once riskleri sonra faydalari yaz" talimatiyla gider. Cikarma basarisizsa ham soru, acik yalakalik-karsiti talimatla gider (raporda oran).
- Degisikligin etkisini UYGULAMA hesaplar (UYG ikame motoru + dengeleme): OG/FG/ABV/SRM/IBU once/sonra + stil bandi icinde mi + muadil derecesi (✅/⚠️/ozellik/bilesik/yok). HUKUM bu kurallardan uretilir ve kartin basinda gosterilir; AI'dan gelmez.
- Celiski uyarisi: AI'nin "ton" alani ile hukum celisirse (ornek ton olumlu, hukum "bant disina cikar" ya da ⚠️) kartta "AI ile hesap celisiyor — hesap esas" uyarisi.

5. TUTARLILIK: COKLU ORNEKLEME + DENETIM
- Ana cagri paralel 3 kez yapilir (ayni paket). Iddialar katman + dayanak_id + anahtar sozcukle eslestirilir; 3'te tutarli olanlar gosterilir; 2/3 olanlar "kismen tutarli" isaretli; tutarsiz "veri"/"hesap" iddiasi gosterilmez; ana mesaj tutarsizsa kart "AI bu konuda emin degil" der.
- "Yeni recete olarak ac" oncesi ayri bir denetim cagrisi: yalniz iddialar + paket verilir, gorevi dayanaksiz iddia ve kullaniciya hak verme izi aramak; bulgular kartta.
- Maliyet: soru basina tahmini token/maliyet olcumu (mock'la) raporda; Ayarlar'daki AI maliyet sayacina islenir.

6. "YENI RECETE OLARAK AC"
- AI, istenirse oneri_taslak doner: yalniz katalog id + miktar + zaman + kullanim. Uygulama: her id'yi katalogda dogrular (yoksa "eslenemedi", uydurmaz), kendi hesabiyla OG/FG/IBU/SRM/ABV + stil uygunlugu cikarir, stok durumunu UYG motoruyla gosterir.
- Onizleme karti: uygulamanin sayilari + "AI onerisi" etiketi + denetim bulgulari. Dugmeye KAAN basar: her zaman YENI recete (_bmAcikIsiGuvenceyeAl ile acik is korunur, ustune yazma YOK), notta sohbetin kisa ozeti + "AI onerisiyle olusturuldu" + tarih. Recete "kaynak: ai" bayragi tasir (EVR1'de tadim karsilastirmasi icin). Sprint Z: stil ogrenme sinyali yazilmaz.

7. ARAYUZ VE ACILIS KURALI
- Soru kutusu: ornek onizlemesinde ve recete ekraninda. Cevap karti: Hukum (uygulama) · 🧮 Hesap · 📊 Veri · 💬 Yorum · ❔ Bilmiyorum bolumleri; her iddiada dayanak linki/etiketi; tahmini soru maliyeti.
- KAPALI ACILIS: tuzak testi (AI3) gecmeden kutu varsayilan olarak gorunmez. Ayarlar ▸ AI ozellikleri'nde "Beta: AI receteci (tuzak testi henuz yapilmadi)" anahtari; acilinca kartlarin ustunde kalici "beta — test edilmedi" seridi.
- 44 px dokunma, 390/360'ta tasma 0.

8. DOGRULAMA (gercek anahtar YOK; BM_AI cagrilari mock)
- npm test yesil + yeni case'ler: Saison 3 satir + kaynak; bilgi paketi ID'leri ve boyut tavani; yer tutucu doldurma ve taninmayan yer tutucunun dusmesi; yanlis sayili "veri" iddiasinin ustunun cizilmesi; AN5'in veri/hesapta gecerli yorumda serbest oldugu; tarafsizlastirmada sira rastgeleligi ve "Kaan'in fikri" bilgisinin pakette OLMADIGI; hukmun AI'dan bagimsiz oldugu (AI "olur" dese de hukum bant disi); celiski uyarisi; 3 ornekleme tutarlilik mantigi; gecersiz id'li taslagin "eslenemedi" olmasi; yeni recetenin ustune yazmadigi ve "kaynak: ai" bayragi; beta anahtari kapaliyken kutunun gorunmedigi. En az 2 case kasitli bozmayla kirmizi.
- Mock'la iki uctan uca senaryo ekran goruntusu (390/360): "Carafa yerine siyah bugday" ve "lavanta Dubbel'e ne kadar"; bir de "yeni recete olarak ac" onizlemesi.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek.

RAPOR: Saison olcumu, bilgi paketi icerigi + boyut, sema + denetim kurallari, tarafsizlastirma basari orani (mock), tahmini soru maliyeti, beta anahtari, SUPHE (zorunlu).
