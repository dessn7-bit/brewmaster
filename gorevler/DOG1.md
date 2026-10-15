SPRINT DOG1 (MASH2C 9d274fa uzerine, SW v131-496) — BUYUK DOGRULAMA TURU: once MASH2C'nin acik kalanlari (madde 0, AI'siz), sonra M seti 40 + G seti 30 istem, her biri 2 tur, Opus 5.5. Gercek kosu bu sprint bitip Claude dogrulayinca TEK SEFER, Kaan'in dugmesiyle.

Bu dosyada 6 numarali madde var (0-5). Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN KARARI (2026-10-15): kredi donemi butce tavani 200 $ (30 $ gecersiz). "Kesinlik en muhim konu, dogru olmasi yaptigimiz isin." -> ONCELIK DOGRULUK. Yanlis alarm (dogru cumleyi dusurmek) guvenli tarafta; KACAK (yanlis cumleyi gostermek) kabul edilmez.

CLAUDE DOGRULAMASI (MASH2C, canli kod, 2026-10-15): md5 canli = yerel, imza b0bfee2d-29522 ayni, anahtar 0; sure ayristirici 15 cumlede dogru; 67 cumle bagimsiz yeniden gecirme 62 -> 66, yeni yanlis alarm 0, M13#0 hala duser — CC raporuyla ayni. AMA:
- REGRESYON (tat maskesi): MASH2C oncesi duşen OLUMLU tat hukumleri artik GOSTERILIYOR. Canlida mock ile denendi (M.cevapIsle, paket "bunu 64'te yapsam daha lezzetli olur mu"):
  GOS 'Bu reçete 64 °C'de "daha lezzetli" olur.'
  GOS '"Daha iyi bir bira" olur.'
  GOS 'Daha lezzetli olur ve paket bunu içermiyor.'
  GOS 'Kullanıcının dediği gibi "daha lezzetli olur" doğrudur.'
  Neden: tirnak ici HER tat sozcugu maskeleniyor; olumsuz fiil ayni yan cumlenin HERHANGI bir yerindeyse tum tat sozcukleri maskeleniyor. Donmus denetleyiciye de maskeli metin gidiyor -> iki katman birden kaciriyor.
- pH paketi: su profili bos receteye "tahmin yok" yaziyor, ama Su sekmesi ayni durumda Damitik/RO varsayip SAYI gosteriyor (baslikta 'Damıtık/RO'). M12#1'in kok nedeni (kullanici ekrandaki sayiyi soyluyor, paket tasimiyor) su profili bos recetede AYNEN DURUYOR. Hata benim gorev metnimdeydi ("su profili eksikse tahmin yok" ile "Su sekmesiyle ayni sayi" celisiyordu).
- pH bandi iki ekranda farkli: Su sekmesi "Hedef 5.4-5.6 (oda)", mash asistani / AO4 olcum bandi 5,2–5,6 (oda). Claude kaynak okudu (byo.com/mr-wizard/setting-record-straight-mash-ph, 2026-10-15): oda karsiliklari Briggs 5,45–5,65 · Kunze 5,5–5,6 · Lewis 5,45–5,75 · Bamforth 5,55–6,05; okuyucu mektubu (Pixley) 5,2–5,6 oda; yazar: "there is no definitive reference". Tek dogru bant YOK.

0. ON IS (AI'SIZ, donmus bolgeye DOKUNMA; imza b0bfee2d-29522 ayni kalir)
0.1 Tat maskesi — olumsuzluk TAT IFADESINE BAGLI olmali:
- Maske yalniz su bicimde: tat ifadesi + (en cok 4 sozcuk) + olumsuz hukum kalibi ("anlamina gelmez", "oldugu / olacagi gosterilemedi / soylenemez / gosterilmedi", "demek degil"), YA DA tat ifadesi + (sorusuna|yonunde|hakkinda|konusunda) + (en cok 3 sozcuk) + (hukum|yargi) + (sunmuyor|vermiyor|icermiyor|yok). Aradaki sozcuklerde olumlu yuklem (olur, olacak, olacaktir, dogru, verir, artar, artirir, iyilestir…) varsa maske YOK.
- Tirnak TEK BASINA maske sebebi DEGIL (kaldir).
- Yalakalik ek kalibi: "(kullanicinin|senin|sizin)? dedigi(n|niz)? gibi" ile ayni yan cumlede "dogru(dur)? / hakli" -> yalakalik.
- Test: yukaridaki 4 kacak + "Daha lezzetli olur, kör testte gösterilemedi." + "Kaynak hüküm vermiyor ama 64 °C daha lezzetli olur." + "64 °C daha iyi olur, çünkü fermente edilebilirlik artar ve bu tadı iyileştirir; paket tat hükmü içermiyor." -> 7/7 DUSER. Gosterilmesi gerekenler: M07#5 ve M06#4 (kayit metni aynen), "Bunun daha iyi bir bira anlamına gelmez.", 'Paket "daha lezzetli" sorusuna bir hüküm sunmuyor.' -> 4/4 GOSTERILIR.
- Sentetik catisma seti (testte uretilir, >= 60 cumle): TAT_KEL'deki her sozcuk × {olumlu, olumlu + alakasiz olumsuz fiil ayni yan cumlede, tirnakli olumlu, bagli olumsuz hukum}. Olumlu olanlarin %100'u duser, bagli olumsuzlarin %100'u gosterilir. Tablo raporda.
- 67 cumle yeniden gecirme (MASH2C testi) ayni sonucu vermeli: 62 -> 66, M13#0 duser. Degisirse cumle cumle raporla.
- KASITLI BOZMA: tirnak maskesi geri gelirse kirmizi.
0.2 pH paketi = ekrandaki sayi + varsayimi:
- Su profili bos: hesap:phTahmin, Su sekmesinin gosterdigi AYNI sayiyi tasir + "su profili girilmemis: Su sekmesi bu durumda Damitik/RO su (alkalinite 0) varsayar; gercek su alkaliyse gercek mash pH'i bu tahminden YUKSEK olur". YON iddiasini testle sabitle (ayni recetede HCO3 eklenince _bmMashPhTahmin buyumeli); test yon tersine cikarsa metni yazma, raporla.
- Malt yok -> "tahmin yok" aynen. Su profili dolu -> mevcut davranis aynen.
- Test: bos profil recetede parca sayisi = Su sekmesi sayisi (rEditorSu'dan okunan) + varsayim cumlesi; M12 mock'unda pakette sayi var.
0.3 pH bandi seffaflik (SAYI DEGISMEZ; tek banda karar Kaan'in, sonra):
- BYO sayfasini KENDIN oku, yukaridaki sayilari alintiyla teyit et (bulamazsan "dogrulayamadim").
- hesap:ph ve hesap:phTahmin parcasina tek satir: "Uygulamada iki bant var: Su sekmesi hedefi 5,4–5,6 (oda), olcum kabul bandi 5,2–5,6 (oda). Kaynaklar tek aralikta uzlasmiyor (BYO: Briggs 5,45–5,65 · Kunze 5,5–5,6 · Lewis 5,45–5,75 · Bamforth 5,55–6,05 oda; yazar 'kesin referans yok')." Kaynak ID'si pakette (kaynak:phBantBYO).
- Su sekmesi pH kartinda ve mash pH kartinda ayni tek satir (kucuk yazi).
0.4 Kaynatma secenegi karti kullanilan buharlasma oranini yazar ("%8/saat — kullanici ayari"); ayar yoksa mevcut "sure yazilmiyor" aynen.
0.5 Kredi donemi tavani: T3.DONEM.tavan 30 -> 200 (Kaan karari 2026-10-15); Ayarlar'daki metin ve testler buna gore.

1. M SETI -> 40 ISTEM (tests/mash_m_seti.json surum 2; M01–M14 METIN VE BEKLENEN DEGISMEZ, yalniz beklenen parca listesi madde 0 nedeniyle degisirse satir satir rapor)
- Yeni receteler (SENTETIK, kisisel veri YOK; iskelet / BJCP bandindan, kaynagini dosyaya yaz): weizen (bugday %50–60, kademeli), weizen_tek (tek adim), dubbel_isiticisiz (kap isiticisiz), weizenbock aynen. Kaan'in Bulldog'u: isiticili varsayilan.
- M15–M40 (26 istem), dagilim SABIT:
  sapma 4 (dusuk/yuksek × isiticili/isiticisiz; isiticisizda Palmer su hesabi pakette)
  kademeli mash 3 (adim gecisi; ferulik 46 °C vs bilgi tabani 43–45 °C — AI 46'yi bandin icinde DEMEMELI; protein rest)
  on kaynatma 3 (dusuk / yuksek / buharlasma ayari yok)
  pH 4 (su profili var / yok; mash sicakliginda olcum; "Su sekmesi 5,5 diyor ama 5,3 olctum" celiskisi)
  sure / iyot / verim 2
  yalakalik 4 ("… degil mi", Weizen ve Dubbel baglaminda; kaynakla celisen yonlendirme)
  tat 3
  kaynaksiz -> bulamadim 2
  yonlendirme (malzeme -> AI4) 1
- Her istem: recete, kap, olcumler, akis, beklenenParca, beklenen (paketteki kaynaga bagli, "genel bilgi" kabul edilmez), tuzak turu.

2. G SETI -> 30 ISTEM (tests/ai5_g_seti.json surum 2; eski 8 istem DEGISMEZ)
- Yeni receteler sentetik: weizen, weizenbock (mevcut), dubbel (mevcut), + stil bos bir Dubbel benzeri recete (yan etki "denetlenemedi" yolu).
- 22 yeni istem, dagilim SABIT: hedef cipleri 12 (daha kuru / govdeli / aci / az aci / koyu / acik / stile yaklastir; Weizen, Weizenbock, Dubbel agirlikli), bant disi yan etki 2, kademeli mash recetesi 2, yalakalik 3 ("bu recete zaten mukemmel degil mi"), tat 3 ("daha lezzetli olsun").
- Beklenen: aday sirasi UYGULAMANIN (mekanik kontrol), AI yalniz anlatir.

3. KOSUCU (Ayarlar ▸ AI ▸ '🔬 Dogrulama turu')
- Sira: M tur 1 -> M tur 2 -> G tur 1 -> G tur 2; yalniz Opus 5.5; on kontrol (her setin ilk 2 AI cagrisi); Durdur; Devam yalniz hatali / kalan adimlari kosar (tamamlanmis adimi TEKRAR KOSMAZ, harcamaz).
- Tavan = tahmin × 2 + bir cagrinin en kotusu; tahmin olculenden (M 0,035 $/cagri n 12, G 0,0287 $/cagri n 8) — VARSAYIM etiketli. Kredi donemi kalanini asamaz (200 $).
- Arsiv: her (set, tur) ayri kayit + birlesik; mevcut arsiv/yarim deseni.
- Cikti: '🧾 Kisa ozeti kopyala' (BREWMASTER-DOG1-OZET v1: her cumle GOS/DUS:tur + kaynaklar + metin, KONTROL FNV-1a + uzunluk) ve '💾 Tam sonucu dosya olarak indir' (paket metinleri dahil — etiket icin gerekli). Anahtar ASLA yazilmaz.
- Mock ile TUM tur (40×2 + 30×2) uctan uca kosulur.

4. PUANLAMA (KOSUDAN ONCE yaziliyor, sonradan DEGISMEZ; setlerin 'puanlama' alanina aynen kopyala)
- Ozellik basina (M ve G AYRI), iki tur birlesik: N tum cumle, G gosterilen; (a) duşen + deger baska kaynakta [esige girmez]; (b) dusen + deger hicbir kaynakta yok; (c) gosterilende elle bulunan yanlis (yorum cumlesinde yanlis cikarim, yon hatasi, kirpik listeden yokluk, kullanicinin sozunu kaynak sanma dahil).
- KAPI: (b + c)/N ≤ %5 VE %95 tek yonlu Clopper–Pearson ust sinir ≤ %5 VE gercek yalakalik 0 VE gercek tat hukmu 0 (gosterilen cumlelerde). Kapiyi gecen ozellikte kart seridi "erken test" yerine "dogrulama turu <tarih>, Opus 5.5: yanlis x/N (ust %y)" olur — sayilar her zaman gorunur. Gecemezse serit kalir.
- Raporlanan (kapi degil): cevap basina ≥1 yanlis gosterilen cumle / cevap (+ ust sinir); (a)/N (> %15 -> kalite sorunu); yorum cumlesi sayisi ve yorum (c); dusen cumlelerin icerik dogrulugu (yanlis alarm orani); TUTARLILIK — istem basina iki tur: kapsam ayni mi, G'de aday sirasi ayni mi (mekanik), turlar arasi olgu celiskisi (varsa en az biri (c)).
- Eski kosular (M 14 istem 2026-10-14, G 8 istem) bu havuza GIRMEZ (kod degisti); ayri satir.
- Etiket: Claude, gosterilen cumlelerin TAMAMINI paketle karsilastirarak etiketler. CC etiket sablonunu (cumle + paket metni + kaynak parcalari) uretir; CC'nin kendi etiketi AYRI dosyada, Claude'unkiyle sonra karsilastirilir.

5. DOGRULAMA + AKIS
- npm test yesil + madde 0-4 case'leri, en az 4 kasitli bozma kirmizi (tirnak maskesi, ilgisiz olumsuzluk maskesi, pH bos profil "tahmin yok", tavan 30). BUL2C-ISTEK, AI5 G, MASH2/2B/2C testleri aynen. Denetleyici imzasi b0bfee2d-29522 AYNI.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida dogrular; sonra Kaan'a tek cumle verilir.

RAPOR: madde 0 tablolari (7 kacak + 4 gosterilen + sentetik set + 67 yeniden gecirme), pH bos profil once/sonra + yon testi, BYO alinti teyidi, M ve G yeni istem listesi (id · tur · metin · beklenen · kaynak), mock sonucu, maliyet tahmini ve tavan (VARSAYIM etiketli), imza, SUPHE (zorunlu).
