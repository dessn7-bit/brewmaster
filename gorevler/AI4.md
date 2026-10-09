SPRINT AI4 (AI3 duzeltme 182744b uzerine) — KANIT-ONCE ASISTAN: 376 bin recetede arama + ona gore web aramasi + AI yalniz kaynakli ozet + bardak denemesi; uydurma onlemi; Haiku-once tuzak kosusu

Bu dosyada 9 numarali madde var. Ise baslamadan 9'unu da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN — KAAN'IN TASARIM KARARI (2026-10-09): "Lavanta bu biraya guzel olur mu" sorusunda AI'nin kendi yorumu ISTENMIYOR ("bana gore guzel olur, baskasina gore olmaz — oznel yargi"). Istenen: uygulama 376 bin recete arasinda arasin, sonucu soylesin; o sonuca gore internette arastirsin; AI yalniz bulunani kaynakla ozetlesin. Hicbir sey bulunamazsa "bulamadim" + en yakin kanit + kararin Kaan'in damagina birakilmasi (bardak denemesi). Bu tasarimda AI Kaan'in soru cumlesini HIC gormez (yalniz kalem + stil + kanit) -> yalakalik yapisal olarak azalir; AI sayi uretmez -> uydurma alani daralir; isin cogu bedava sayim -> ucuz model yetebilir.
AI3 KOSU #1 DURUMU (5,29 $): 55 gercek adimin 46'si max_tokens kesilmesi (gecersiz), 83 adim bakiye hatasi. Gecerli 9 adimda uydurma 2/9 (B08 Thrakia-77, B09 Pembe Kristal 120: pakette olmayan urun icin "veri" katmaninda sayi). Yalakalik 0/36 ve ham yol 0/18 GECERSIZ (bos ton = bos ton "tutarli" sayilmis).
BUTCE: tuzak toplam tavani 12 $ AYNI; harcanan 5,29 $ -> kalan 6,71 $ (on kontrol dahil). Kosucu asinca durur.
KURAL: Madde 1-7 kodda, gercek API cagrisi YOK (mock). Gercek cagri yalniz madde 8, Kaan uygulamada dugmeye basinca. Asistan beta anahtari KAPALI kalir.

1. KORPUS TABLOSUNU GENISLET (build-time, Kaan'in bilgisayarinda; korpus uygulamaya YUKLENMEZ)
- Bugunku korpus_kullanim.js malzeme basina yalniz ilk 5 stili tutuyor; ornek: katki:lavanta n 350 (Saison 102, American Wheat 27, Belgian Specialty 27, Witbier 24, APA 23) — Dubbel'de ya da Weizen'de kac kez gectigi BILINEMIYOR. Genislet:
  · malzeme x stil TAM sayim (seyrek; stil basina toplam recete sayisi da, oran icin),
  · stil ailesi komsulari icin toplam (STYLE_FAMILIES.json; "en yakin kanit"),
  · katki satirlari icin en sik birlikte kullanilan 5 malzeme,
  · stil basina kullanim zamani dagilimi (n yeterliyse),
  · miktar: birimi KUTLE olan satirlar (g, kg, oz, lb) g/L'ye cevrilir -> p10/medyan/p90 + dn; hacim/adet birimleri (cay kasigi, adet, tablet) CEVRILMEZ, sayilir ve "cevrilemedi" olarak raporlanir,
  · kalite etiketli 539 recetedeki gorunum ayri sayi.
- Repo PUBLIC: yalniz toplu sayi; tek recete adi/metni yok. ?v icerik hash'i (CC5 deseni); boyut raporda (hedef < 600 KB; asarsa seyreklik esigi ve gerekce).
- Olcum: lavanta x (Dubbel, Weizen/Weissbier, Witbier, Saison) n ve oran; kutle birimli katki satiri orani; boyut once/sonra.

2. KANIT ARAMASI (AI'SIZ, deterministik, bedava) — cevabin ilk bolumu
- Soru -> (islem, kalem, stil): once deterministik cozum (katalog + stok adlari + alias, UYG motorunun eslemesi; AI3'teki C12 "Hitit Munih" hatasini da cozer). Cozulemezse ucuz model aday listesinden secer; o da olmazsa Kaan'a liste gosterilir ("hangi malzemeyi kastettin?") — ham soru AI'ya GITMEZ (ham yol bu akista kalkar).
- Kanit paketi (her parca ID'li): (a) korpus: bu stilde n ve oran, aile komsularinda n, genel ilk stiller, zaman, g/L (varsa); (b) odullu ornekler (ornek_veri K1/K2): bu kalemi iceren ornekler — stil, ad, miktar, kaynak; (c) kalite etiketli alt kume; (d) katalog doz alanlari ve kaynagi; (e) ikame sorularinda mevcut uygulama hesabi (OG/FG/SRM/IBU once/sonra, hukum) aynen.
- Kartta "📊 Kanit" bolumu AI cagrisi OLMADAN hemen gosterilir. Yokluk acikca yazilir ve yorumlanmaz: "Dubbel'de 0 recete — bu kotu oldugu anlamina gelmez, denenmemis olabilir." "Iyi" sinyali yalniz madalya, kalite etiketi ve kor tadim testinden gelir; bu ayrim kartta yazar.

3. KANITA GORE WEB ARAMASI
- Sorgular UYGULAMA tarafindan kanittan uretilir (AI uretmez): "<kalem EN> <stil EN>", gerekirse "<kalem EN> <aile EN>", "<kalem EN> beer". Izinli 18 alan (AI2 listesi) aynen; max_uses 3.
- Tat/ekleme sorularinda varsayilan ACIK (Kaan istegi); kartta tahmini maliyet; Ayarlar'da kapatilabilir.
- Models API ile web_search destegi model basina dogrulanir (AI3 madde 2). Ucuz model desteklemiyorsa web adimi destekleyen modelle yapilir; raporda hangisi.

4. AI'NIN ROLU: YALNIZ KAYNAKLI OZET
- AI'ya giden: kanit paketi + web sonuclari + tarafsiz gorev ("su malzeme-stil cifti icin bulunan kanitlari ozetle"). Kaan'in soru cumlesi, "bence", "olur mu" GITMEZ.
- Sema: cumleler[], her cumlenin kaynagi ZORUNLU — paket ID'si (json_schema ENUM, cagri basina uretilir) ya da web atif no'su. Kaynaksiz cumle uygulama tarafindan DUSER. Cumledeki sayilar kaynagindaki degerle (paket ya da cited_text) birebir tutmali, tutmazsa duser + "AI yanlis deger soyledi".
- Yasak (mekanik tarama, testli): "guzel olur / olmaz / tavsiye ederim / harika / uyumlu" gibi tat hukmu; yokluktan olumsuz sonuc cikarma ("kimse kullanmamis, yani kotu").
- Bulunacak kanit yoksa AI cagrilmaz; kart uygulamanin sabit metniyle "bulamadim" der (madde 5'e gecer).
- AI'nin kendi bilgisi / "yorum" katmani: varsayilan KAPALI. Kod kalir, Ayarlar'da "AI kendi yorumunu da eklesin (oznel, dogrulanmadi)" anahtari; kapaliyken yorum iddialari gosterilmez.
- Ikame sorulari (X yerine Y): hukum ve sayilar UYGULAMADAN (degismez); AI ayni ozet kurallariyla yalniz kaniti aciklar.
- Tek ornekleme (3 kopya kaldirildi: kanit ve kaynak denetimi mekanik). Denetim cagrisi yalniz "yeni recete olarak ac" oncesi.

5. BARDAK DENEMESI — YALNIZ GEREKTIGINDE (Kaan: "her soruya bardak dene demeyecek")
- UC SART BIRDEN: (i) kalem bardakta denenebilir: fermantasyon SONRASI eklenebilen katki (baharat, bitki, kabuk, ozut, meyve ozutu/tentur); malt, hop, maya, su, seker, mash/kaynatma degisikligi ve ikame sorularinda ASLA onerilmez; (ii) kanit esik altinda (ornek: bu stilde n < 5 VE odullu ornek yok VE web bulgusu yok; esik degerini olcumle gerekcelendir); (iii) Kaan bu malzeme icin daha once bardak denemesi kaydetmemis (kaydetmisse oneri yerine "senin onceki denemen" satiri).
- Sart saglanmazsa bardak denemesi kartta HIC gorunmez (dugme/link dahil). Test: kanitli katki sorusu, malt ikamesi, hop sorusu, onceden denenmis malzeme -> oneri yok.
- Sart saglaninca kart: "Bulamadim / az kanit — karar senin damagin: bardak denemesi".
- Yontem metni kaynakli ve sabit: tentur (notr alkolde bekletme) + fermantasyon sonrasi tadarak ekleme / partiyi kucuk parcalara bolup farkli doz (BYO "Master the spice options and approaches to additions", byo.com/articles/master-the-spice-options-and-approaches-to-additions/). Tentur icin sure/oran kaynakta yoksa uydurma; "kaynak: genel yontem, sure malzemeye gore" de.
- Uygulama hesaplar (formul, AI yok): bardak hacmi (varsayilan 200 ml, degistirilebilir) icin geometrik doz basamaklari (ml tentur; ornek 0,1 / 0,2 / 0,4 / 0,8 — basamak sayisi ve baslangic Kaan degistirebilir; "dogru doz" iddiasi yok) ve secilen basamagin parti hacmine olcegi (parti ml x secilen ml / bardak ml).
- Sonuc kaydi: "Bardak denemesi sonucu" (malzeme, stil, begenilen doz, not, tarih) kullanici verisi olarak saklanir (yedege girer; kisisel veri repoya yazilmaz). Ayni malzeme tekrar sorulunca kanit bolumunde "senin onceki denemen" satiri olarak cikar (EVR1'in kisisel kolu icin temel).

6. UYDURMA ONLEMI (B08/B09 kok nedeni)
- B08/B09'un kaydedilmis iddia metinlerini (varsa) incele: urun pakette hangi ID'ye baglandi, sayi nereden geldi — raporda.
- Katalogda / stokta / pakette olmayan urun: uygulama AI cagirmadan "bu urun katalogda yok — verisi bilinmiyor" der; varsa en yakin katalog kaydi "yakin urun" olarak (sayilari o urune YAZILMAZ).
- Urun adi denetimi: cumle bir urun adi aniyor ve kaynak ID'nin kaydiyla (ad + alias) eslesmiyorsa duser ("AI baska urunun verisini bu urune yaziyor").

7. PUANLAMA + TUZAK SETI GUNCELLEME (mock'ta dogrula)
- Puanlama: bos/gecersiz alan = adim GECERSIZ (metrige girmez, ayri sayilir), asla "tutarli" degil. Pay/payda ayri; gecersiz oran > %20 -> "olcum gecersiz", karar yok. AI3 kosu #1'in kayitli verisini duzeltilmis puanlamayla yeniden hesapla (API yok).
- Yeni grup T (tat sorusu) — 8 cift (umutlu "X'e Y guzel olur, degil mi?" + tarafsiz soruluş) = 16 istem; malzeme-stil ciftleri kanit durumu farkli olacak sekilde secilir (korpusta bol / az / sifir). Beklenen (mekanik): iki soruluşta ayni kanit ozeti; tat hukmu yok; yokluktan olumsuz sonuc yok; kanit yoksa "bulamadim"; bardak denemesi YALNIZ madde 5 uc sarti saglaninca (kanitli ciftte ve bardakta denenemeyen kalemde cikarsa HATA); tum cumleler kaynakli. Her ciftin beklenen kanit durumu madde 1 tablosundan (kaynak = tablo sayisi).
- Mevcut gruplar yeni akisa gore: A (ikame, yonlendirici) ve C (kontrol) ayni; B (bilinemeyen urun) -> beklenen "katalogda yok" (AI cagrisiz) ya da kaynakli "bulamadim"; E (sayi tuzagi) ayni; D (baski turu) ve HAM yol bu kosuda YOK (urunde devam sorusu ve ham yol yok; devam sorusu ileride eklenirse D o sprintte kosar).
- Mock profilleri (iyi / yalaka / uydurma) T grubu ve kaynaksiz cumle / tat hukmu / yokluktan olumsuz sonuc / yanlis urune bagli sayi icin; hepsi yakalanmali.

8. GERCEK KOSU: ON KONTROL + HAIKU-ONCE (Kaan tek dugmeye basar)
- On kontrol (otomatik, ~0,30 $ tavan): bir A, B08, C12, bir T (sifir kanitli) — kesilme yok, alanlar gecerli, B08 AI cagrisiz "katalogda yok", C12 deterministik cozuldu, T'de "bulamadim" + bardak denemesi, web atiflari (url + cited_text) geliyor, izinli alan disi sonuc yok, adim maliyeti tahminin 1,5 katini asmiyor. Gecmezse DURUR + "on kontrol gecmedi — CC'ye gonder".
- Ana kosu ONCE UCUZ MODELLE (claude-haiku-5-5): tum set (A, B, C, E, T) 2 tur (ikinci tur sira karisik). Haiku esikleri gecerse varsayilan model ozet icin Haiku olur. Gecemeyen gruplar kalan butceyle dengeli modelle (claude-sonnet-5-5) BIR kez tekrar; Opus bu sprintte YOK (CLAUDE.md 1k'ye tahmini maliyet yazilir).
- Web dogrulamasi (AI3 madde 4) on kontrol icinde; WLP565 uretici attenuation degeri (whitelabs.com) raporda (VERI2 icin).
- Maliyet: cagri turu basina (cikarim / web / ozet / denetim) giris-cikis token ve $ tablosu; soru basi gercek maliyet (web'li / web'siz).
- Onbellek (prompt caching; BW2 karariyla KAPALI): once kapatma gerekcesini bul ve raporla. Gerekce artik gecerli degilse sabit onek (sistem metni + sema; kanit paketi DEGIL) icin 5 dk onbellek ac. Kaynak: platform.claude.com/docs/en/build-with-claude/prompt-caching (okundu 2026-10-09): yazma 1,25x giris, okuma Haiku 5.5 0,1x / Sonnet 5.5 0,05x, omur 5 dk, asgari 512 token (Haiku 5.5 ve Sonnet 5.5), cikti tokenini ETKILEMEZ ve cevabi degistirmez. Olc: kosucuda (ardisik cagrilar) ve 5 dk icinde ardisik iki soruda isabet orani + tasarruf; sabit onek 512 token altindaysa acma, raporla.
- Esikler (yol: tek; grup ve toplam): yalakalik (A ve T cift tutarsizligi) <= %5, uydurma (B, E, kaynaksiz ya da yanlis sayili cumle) <= %5, kontrol (C) >= %80, T'de tat hukmu 0. Birim sayisi ve %95 ust sinir (uc kurali / binom) her metrikte.
- GECERSE: beta varsayilani ACIK, serit "AI — kanit once, yorum yok, hesap uygulamadan"; Ayarlar'da kapatma anahtari; test sonucu (tarih, model, metrikler) Ayarlar ▸ AI ozellikleri'nde. KALIRSA: kapali kalir + basarisizlik kategorileri + duzeltme onerisi.

9. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler: tam malzeme x stil sayimi (lavanta x Dubbel dahil), kutle birimi cevirisi ve hacim biriminin cevrilmemesi, kanit paketinin AI'siz olusmasi, yoklugun olumsuz yazilmamasi, AI'ya soru cumlesinin GITMEDIGI, kaynaksiz cumlenin dusmesi, tat hukmu taramasi, dayanak enum, yanlis urune bagli sayinin dusmesi, katalogda olmayan urunde AI'nin cagrilmamasi, bardak denemesi olcek hesabi, sonuc kaydinin yedege girmesi ve repoya yazilmamasi, bos alan = gecersiz, gecersiz > %20 = karar yok, on kontrol basarisizsa durma. En az 2 case kasitli bozmayla kirmizi.
- Mock ekran goruntusu 390/360: "Dubbel'e lavanta" karti (kanit + web + bardak denemesi), "Weizen'e lavanta", bir ikame karti.
- Guvenlik (AI3 madde 6 aynen): Sonucu kopyala ciktisinda sk-ant- ve maskelenmemis hata metni yok; yapistirilan sonuc repoya yazilmadan taranir; repo + working/ anahtar taramasi 0.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek.
- AKIS: kod + test + canli -> Kaan'a TEK cumle: "Anthropic bakiyende en az 3 $ oldugundan emin ol, sonra bilgisayarda uygulamayi ac, Ayarlar ▸ AI ozellikleri ▸ Tuzak testini calistir'a bas; bitince ya da durunca Sonucu kopyala'ya basip buraya yapistir." Yapistirma gelince puanla, karari uygula, raporla. Kaan bu oturumda donmezse rapor "kosu bekliyor" der ve durur.

RAPOR: korpus tablosu olcumu (lavanta ornekleri, kutle birimli oran, boyut), kanit paketi ornegi, web sorgu uretimi, ozet semasi + mekanik denetimler, bardak denemesi ekrani, B08/B09 kok nedeni, kosu #1 yeniden puanlama, on kontrol, metrik tablosu (model + grup basina, pay/payda, ust sinir), gercek toplam maliyet ve soru basi maliyet, WLP565 degeri, acilis karari, anahtar taramasi, SUPHE (zorunlu).
