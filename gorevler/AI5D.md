SPRINT AI5D (DOG4D SONRASI) — "Bu reçeteyi nasıl geliştirebilirim?" kutusunun tanımadığı istekte para harcayıp boş/alakasız sonuç vermesi. GERÇEK AI KOSUSU YOK.

Bu dosyada 7 numarali madde var. Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN'IN GERCEK DENEMESI (2026-10-22, telefon, MUZO receti, ekran goruntusu Claude'da): serbest metin "Daha muzlu süt tadı istiyorum" →
- "Hedef: Tadımdaki sorunu düzelt (ucuz model çip listesinden seçti)" — ama ayni kartta "bu reçetede tadım / off-flavor kaydı yok". G.hedefAI enum'una 'tadim' HER ZAMAN giriyor (G.HEDEFLER tam liste); cip ekranda gizli oldugu halde AI secebiliyor. YANLIS.
- 'tadim' hedefinin kaynakli kurali yok → aday 0 → kullanici "sonuç yok çözüm yok" gordu.
- Kıyas tablosu (OG, baz malt payi, seker payi) muz istegiyle ilgisiz ama tek cikti oldugu icin cevap sanildi.
- "İnternette de ara" ≈ $0,075: G.webSorgular sorguyu KULLANICININ ISTEGINDEN DEGIL stilden kurdu ("Weizen brewing tips") → 22 ham Ingilizce alinti (pilsner/bugday orani, rice hulls…), muzla ilgisiz, Turkce ozet yok. Kartin AI maliyeti $0,0771.
- "Neden? Kaynakli anlat" dugmesi Haiku 5.5 diyor; Kaan karari (2026-10-14) varsayilan Opus 5.5. A4.ozetModel cihazda Opus kullanilamazsa 'ucuz'a dusuyor — neden kartta YAZMIYOR.
Kaan: "hiç bişey anlamadım … ne oluyor burda".

1. TANINMAYAN ISTEK = DURUSTCE "TANIYAMADIM", PARA HARCAMA YOK
- G.hedefAI enum'u yalniz EKRANDA GOSTERILEN ciplerden kurulur ('tadim' yalniz tadim/off-flavor kaydi varsa). Test: tadim kaydi yokken enum'da 'tadim' YOK; varken VAR.
- AI 'yok' dondurur ya da deterministik eslesme yoksa ve istek bir TAT / AROMA istegiyse (muz, karanfil, vanilya, meyve, süt, kremsi, tatli tat… — sozluk + sozcuk siniri) → kart: "Bu istegi mevcut hedeflere ceviremedim: '<metin>'. <tat/aroma ise:> Aroma ve tat (muz, karanfil gibi) bu araçta hesaplanmıyor; X ile ilgili kaynaklı bilgi için malzeme / maya sorusu sorabilirsin." Kiyas tablosu bu durumda GOSTERILMEZ (cevap sanilmasin), web ve anlatim dugmeleri GIZLI.
- Test: "Daha muzlu süt tadı istiyorum", "karanfil daha az olsun", "daha meyvemsi" → taniyamadim (ya da madde 2 hedefi); mevcut 7 hedefin eslesmeleri AYNEN (G.ESLEME testleri degismez).

2. YENI HEDEF: "Daha muzlu (ester) / daha karanfilli (fenol)" — YALNIZ KAYNAKLI KURALLA
- Claude'un okudugu kaynaklar (2026-10-22, metin acildi):
  (a) Wyeast 3068 urun sayfasi (northernbrewer.com/wyeast-weihenstephan-wheat): "rich with clove, vanilla and banana"; "Best results are achieved when fermentations are held around 68° F"; optimum 64–75 °F (18–24 °C). Sayfa pitch/OG/oksijen hakkinda BIR SEY SOYLEMIYOR.
  (b) Brulosophy 2017-08-21 "Fermentation Temperature Pt. 9: WLP300" — 16 °C vs 22 °C, 32 tadimci 19 dogru, p = 0,002 (anlamli fark). Banana/clove YONU yalniz YAZARIN izlenimi: sicak = "more intense pome fruit and banana ester", soguk = "obvious phenols of clove". Tek parti.
  (c) Brulosophy 2019-06-17 ferulic rest — 43 °C 15 dk vs tek adim, 24 tadimci 6 dogru, p = 0,86 (ayirt EDILEMEDI); yazar: ikisinde de muz ve karanfil, "neither seemed to have more than the other".
- KURAL (yalniz bu kaynaklarla): hedef "daha muzlu" → aday "fermantasyon sıcaklığını maya aralığının üst tarafına al" (receteninfermSicaklik alani; mayanin katalog sc araligini ASMAZ; aralik yoksa aday YOK + "mayanın sıcaklık aralığı katalogda yok"). "daha karanfilli" → ters yon. Etiket: "yön tek deneyden (Brulosophy, yazar izlenimi) + üretici aralığı; büyüklük hesaplanmaz" → 'yalniz yon' grubu. Ferulic (46 °C) adimi icin aday URETILMEZ; bilgi satiri: "43 °C ferulik dinlenme tek deneyde ayırt edilemedi (6/24, p 0,86)".
- Pitch orani, OG, oksijen, acik fermantasyon: Claude KAYNAKLA DOGRULAMADI → kural YOK (CC birincil kaynak bulursa raporda listele, KODA EKLEME; karar Claude/Kaan).
- Kaynak alintilari G.KURALLAR'a kaynak + okuma tarihiyle; test kilidi (kaynaksiz kural girmez) aynen.

3. WEB SORGUSU ISTEKTEN KURULUR + TURKCE OZET
- G.webSorgular: hedef serbest metinden geldiyse sorgu hedefin Ingilizce karsiligi + stil ("hefeweizen banana ester fermentation temperature" gibi; sozluk tablosu, AI yok); "<stil> brewing tips" genel sorgusu KALDIRILIR.
- Ham alintilar varsayilan KATLI ("22 alıntı — kaynakları göster"); ustte Turkce kisa ozet yalniz alintilardan (mevcut ozet modeli + AI4 denetleyicisi AYNEN, imza 2c9ebd9f-32461 DEGISMEZ). Ozet yoksa "web özeti yok — yalnız kaynak listesi".
- Istekle ilgisiz alinti (hedef anahtar sozcugu + stil birlikte gecmiyorsa) ozete girmez; sayisi yazilir ("22 alıntının 3'ü isteğinle ilgili").

4. MODEL DUSMESI GORUNUR
- Anlatim dugmesi Opus yerine Haiku diyorsa altinda tek satir neden ("Bu cihazda Opus denetimi yapılmamış — Ayarlar ▸ AI ▸ Model denetimi" ya da gercek neden A4.modelKullanilir'dan). Kaan karari degismez (varsayilan Opus).

5. TEST
- Kaan'in ekranindaki durum fixture olarak (MUZO benzeri SENTETIK recete: bugday + pilsner, kademeli 46/67/72/76, BB Alman Bugday No1, tadim kaydi YOK; kisisel veri koyma): "Daha muzlu süt tadı istiyorum" → madde 2 hedefi (ferm sicakligi adayi) ya da madde 1 taniyamadim; ASLA 'tadim'.
- G hedef seti (tests/ai5_g_seti.json v2) 30 istemin hedef/aday ciktilari BIREBIR (parmak izi); degisen olursa dur + rapor.
- KASITLI BOZMA: enum'a 'tadim' geri → kirmizi; webSorgular eski haline → kirmizi; kaynaksiz kural (ornegin pitch) eklenince test kilidi kirmizi.

6. DOGRULAMA + AKIS
- npm test TAM yesil. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI. G kapisi seridi (7/393) DEGISMEZ — bu sprint G setinin ciktisini degistirmemeli; degistirirse dur.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Duzenlemeden once TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK. Kaan'dan bir sey istenmez.

7. SADE GORUNUM (Kaan 2026-10-22: "Burası çok karışık, ne dediğini bile anlamadım")
- Kartin ust kismi YALNIZ uc sey gosterir, sade Turkce, jargon YOK (p10–p90, n, iskelet izi, grist, kiyas:bjcp etiketi, "ödüllü örnekler (grist ≥ %80 eşlenen)" GORUNMEZ):
  (a) "Anladığım: daha muzlu bir bira istiyorsun." (ya da "Bunu anlayamadım: '<metin>'")
  (b) En cok 3 oneri, her biri TEK cumle: ne yapilacak + ne degisir + kaynak adi. Ornek bicim: "Mayalanmayı 20 °C yerine 22 °C'de yap — muz aroması artar (Wyeast, Brulosophy deneyi; tek deney)."
  (c) Oneri yoksa tek cumle neden: "Bu istek için kaynaklı bir öneri bulamadım."
- Geri kalan her sey (kiyas tablosu, kisisel gecmis, kaynakli anlatim, web alintilari, model/maliyet, dogrulama turu seridi "yanlış 7/393 …") TEK katli bolumde: "▸ Ayrıntılar ve kaynaklar". Varsayilan KAPALI.
- Kiyas tablosu Ayrintilar'da kalirken bile satirlar duz cumle: "Şeker oranın benzer ödüllü biralardan yüksek (%12,5; onlarda %0)." — sayi + karsilastirma, istatistik terimi yok; ornek sayisi < 5 ise "az örnek, zayıf kanıt" sozcukleriyle.
- AI anlatimi (kaynakli) sade Turkce talimatiyla: kisa cumle, yabanci terim yok ya da parantezde aciklamali (OG → "başlangıç yoğunluğu (OG)"). Denetleyici AYNEN.
- Telefon olcusunde (360 px) ust kisim tek ekrana sigar; Playwright ekran goruntusu raporda (once/sonra, Kaan'in MUZO benzeri sentetik recetesiyle).
- Ayni sadelestirme AI4 malzeme asistani kartinda da ayni ilkeyle mi gerekiyor: OLC ve raporla (kodlama bu sprintte yalniz AI5 karti).
- AYRICA OLC: Kaan'in kartinda "baz malt payı %27,7" (bugday birasinda bugday malti baz sayiliyor mu?) ve "şeker payı %12,5" (MUZO'da hangi kalem seker sayildi?) — tanimlar dogru mu, ekran yaniltiyor mu; raporla, karar Claude.

RAPOR: madde 1-4 once/sonra (Kaan'in cumlesiyle kart metni), kaynak kontrolu (CC'nin buldugu ek kaynaklar ayri liste, koda girmedi), parmak izi, kasitli bozmalar, imza, SUPHE (zorunlu).
