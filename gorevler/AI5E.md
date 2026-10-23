SPRINT AI5E (CEV1'DEN ONCE — GUNCELLEME 2026-10-23 15:20: CEV1 hic baslatilmamis (repoda CEV1 commit'i yok), sira AI5E → CEV1; AI5D 1c91076 uzerine) — gelistirme kartinda kalan dogruluk aciklari + katalog maya notlari. GERCEK AI KOSUSU YOK. Kaan'a "Malzeme asistani dogrulama turu" dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (AI5D, canli kod, 2026-10-23): md5 canli = yerel (52ff7929…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-512. Kaan'in cumlesi → hedef muz, 3 oneri, AI cagrisi 0; "banana daha çok" → muz; "daha fenolik" / "karanfil daha fazla olsun" → karanfil; tanimadigi tat istegi AI'ya gitmiyor. KABUL: Wyeast'in maya miktarini da soyledigi (4 kaynak), White Labs'in sicaklik yonunu yazmadigi, BSI'nin iki pitch araligi okumalari. ACIKLAR (asagidaki maddeler).

1. KATALOGDA TERS BILGI (Kaan'a GORUNEN yanlis — once bu)
- Katalog maya notlarinda 3 yerde "18°C = daha çok muz; 24°C = daha çok karanfil" yaziyor (BB Alman Bugday / WB-06 muadil metni ve digerleri — grep "daha çok karanfil"). Wyeast 3068 urun metni TERSINI soyluyor (Claude okudu 2026-10-23, saticinin aktardigi Wyeast metni themaltmiller.co.uk/product/wyeast-3068-weihenstephan-weizen/): "The balance can be manipulated towards ester production through increasing the fermentation temperature, increasing the wort density, and decreasing the pitch rate." · "Over pitching can result in a near complete loss of banana character." · "Decreasing the ester level will allow a higher clove character to be perceived." Yeni AI5D karti dogru yonu soyluyor, katalog tersini → ayni uygulamada iki celisen cumle.
- CC wyeastlab.com urun sayfasini KENDISI acar, alintiyi dogrular, ters notlari kaynakli cumleyle degistirir ("Daha sıcak mayalanma, daha az maya ve daha yüksek OG muzu artırır; muz azalınca karanfil öne çıkar (Wyeast)"). Kaynaksiz "18 °C / 24 °C" sayilari kalkar.
- TUM maya katalog notlarini tara: sicaklik ↔ muz/karanfil/ester yonu iddiasi ve aciklama metnindeki attenuation yuzdesi ↔ kaydin attenuation alani (bilinen: bb_wheat aciklama "%73" ↔ alan 84–89, Fermentis WB-06 sayfasi 86–90). Celisen her satir: uretici sayfasiyla duzelt ya da "bulamadım" → metinden kaldir. Rapor: satir satir once/sonra + kaynak.

2. TERS YON ISTEGI CEVAPLANIR (CEVAP ILKESI: kolay soru gecistirilmez)
- Canli: "daha az muz istiyorum", "muz aroması az olsun", "karanfil daha az olsun", "muz azalsın karanfil artsın" → hepsi "tanıyamadım". Kaynaklar iliskiyi IKI YONLU veriyor (Lallemand "Higher total ester levels are strongly associated with lower pitching rates"; Wyeast yukaridaki uc cumle). → "daha az muz" = ayni kurallarin ters yonu (daha fazla maya — uygulamanin hesabina kadar, daha serin mayalanma araligin alt tarafi); "karanfil daha az" = ferulik dinlenme kisalt/kaldir (olası) + "muz artınca karanfil geri planda kalır" (Wyeast, tek kaynak → olası); birlesik istek iki hedefi birlikte alir, celisen oneri cikmaz.
- Ters yon YALNIZ kaynak iliskiyi iliski olarak (korelasyon / "increase … decrease") veriyorsa; tek yonlu tavsiye cumlesinden ters yon CIKARILMAZ. Her ters kural icin alinti kod tablosunda.

3. ESKI 7 KURALIN KANIT GUCU (yanlis "olası")
- Canli: "daha kuru olsun" → "Mash sıcaklığını 67 °C yerine 64 °C yap — FG 1,014 → 1,013 (BYO, Brulosophy deneyi; olası — kör tadımda fark ayırt edilemedi)". IKI HATA: (a) iddia FG (olculen kuruluk); Brulosophy deneyi FG'yi OLCTU ve buyuk fark buldu (1,008 vs 1,023) — kor tadim notu ALGI icindir, olcum iddiasinin gucunu dusurmez; (b) ders kitabi kaynagi var: Palmer, How to Brew bl. 14 (howtobrew.com/section-3/chapter-14, Claude okudu 2026-10-23): "warmer temperatures will produce a more dextrinous wort, lower temperatures will make the wort more fermentable" · "A lower mash temperature, of 140-150°F (60-65°C), yields a lighter bodied, more attenuable beer."
- Kural: kor tadim "ayirt edilemedi" notu gucu YALNIZ iddia ALGI / AROMA iddiasiysa dusurur; olculebilir iddiada (FG, SRM, IBU) ayri cumle olarak yazilir ("tadımda fark: tek deneyde ayırt edilemedi").
- 7 kuralin her biri icin CC en az 2 bagimsiz kaynagi KENDISI acar (ders kitabi: Palmer How to Brew; uretici teknik belgesi; egitim kurumu; kontrollu deney) ve alintiyla tabloya ekler; bulamazsa "olası" kalir, raporda "bulamadım". Beklenen (dogrulanacak, varsayma): mash → güçlü; acı hop (Tinseth) / renk (Morey) hesap modelleri → güçlü degil "hesap modeli" ayri etiket (sade: "hesapla"); seker / kristal / maya / baz malt → kaynak sayisina gore.
- Mash ust satiri AI5C notunu kisa tasir: "hesap küçük gösteriyor; kaynaklara göre gerçek fark daha büyük olabilir" (MASH_NOT, Kaan karari 2026-10-14).

4. UST SATIRDA VARSAYIM SAYILARI ETIKETLI
- "21–22 °C" ve "≈ 111 milyar hücre / ≈ 1,1 paket" uygulama secimi; ust satirda kisa etiket: "(sayı uygulamanın seçimi — kaynaklar kaç derece / kaç hücre demiyor)". Kaynakli araliklar (maya katalog araligi ust ucu) varsa "aralığın üst ucu (22 °C)" bicimi tercih edilir.

5. TEST
- Bu dosyadaki tum canli cumleler (madde 2'nin 4'u, madde 3 "daha kuru olsun") metin AYNEN case; beklenen: ters yon hedefleri cevaplanir, AI cagrisi 0; mash satiri güçlü + ayri tadim notu + MASH_NOT.
- Katalog: "daha çok karanfil" + "18°C" ters iddiasi 0; attenuation metin ↔ alan celiskisi 0 (otomatik tarama testi).
- DEGISMEMESI GEREKEN: G seti 30 istem hedef/aday/sira/neden — guc sozcugu ve metin DISINDA birebir (4615b7b9/3414'un hedef/aday/sira kismi; degisen yalniz guc/metin satirlari listelenir). Tuzak v5 cb74f605/11217, DOG4B 141 3d8a0ef9/23172 birebir. G kapisi seridi 7/393 AYNEN.
- KASITLI BOZMA: ters notu geri koy → katalog testi kirmizi; kor tadim notunu olcum iddiasinda gucu dusurur hale getir → mash testi kirmizi; ters yon kurali alintisiz → kaynak kilidi kirmizi.

6. DOGRULAMA + AKIS
- npm test TAM yesil, imza 2c9ebd9f-32461 AYNI, puanlama metni DEGISMEZ, plan ≈ 6,38 $ / tavan 13,08 $ ayni. Canli curl, SW bump (v131-513), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma, TAM yedek, anahtar 0, gercek AI cagrisi YOK.

RAPOR: madde 1 satir satir (once/sonra/kaynak), madde 2–3 canli cumleler once/sonra, 7 kuralin yeni kaynak tablosu (alinti + guc), parmak izleri, kasitli bozmalar, imza, SUPHE (zorunlu).
