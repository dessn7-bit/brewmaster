SPRINT DOG2 (DOG1B 9f68780 + kosu kaydi 61e153f uzerine, SW v131-498) — dogrulama turu sonucu: M kapisi GECTI (serit guncellenir), G kapisi KATI okumada GECEMEDI (sira nedeni hata sinifi) -> duzeltme + yalniz G icin taze kosu (Kaan'in dugmesiyle, sprint bitip Claude dogrulayinca).

Bu dosyada 7 numarali madde var. Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE BAGIMSIZ ETIKETI (2026-10-16, tests/fixtures/dog1_kosu_2026-10-15_etiket_claude.json): 779 gosterilen cumle 10 kor alt-etiketciye (CC etiketini gormeden) verildi, her sinirda/c ve CC ile her uyusmazlik Claude tarafindan paket metniyle tek tek karara baglandi. Stok kaynakli 12 cumle (Bal Tozu / Dekstroz / Nobet / Koyu Candi miktarlari, Karamela 585 g, Hallertau 100 g) yeniden kurulan pakette stok bos oldugu icin "yok" gorunuyordu: miktarlar katalog gu oranlariyla aritmetik dogrulandi (915 g D-90 @267 = 763 g Bal Tozu @320 = 698 g Dekstroz @350 = 636 g @384) + cumleler gosterildi -> donmus denetleyici sayiyi gercek pakette buldu -> dogru.
SONUC (yalakalik 0, tat 0, akis 80/80):
- M: N 411 · b 2 · c 0 · sinirda 5 (M2:M12#2, M2:M28#3 pH su varsayimi yonu; M2:M17#4 iki partinin FG'si tek partiye; M1:M18#5 ±2 °C kaydindan +3 °C'ye "benzer" disa kestirim; M2:M03#5 "fark esas olarak hacim/sure"). Kati okuma 7/411 = %1,70 (ust %3,18) -> KAPI GECTI.
- G: N 390 · b 4 · c 5 · sinirda 6. c: G1:G29#5 (puan "varsayim oldugundan" dustu), G1:G-saison-a#8, G2:G-saison-b#8, G1:G21#8 (stok durumu sira nedeni gibi), G1:G21#5 ("malzeme degismedigi icin" ilk sirada) — G.SIRA_FORMUL'de stok / malzeme / varsayim YOK. sinirda: G1:G-saison-b#8, G1:G14#8, G2:G14#8 (zayif kanit / notrlenmis 0/1 sira nedeni gibi), G1:G23#4 (zaten bant disindaki ABV neden sayildi), G2:G11#5 (n 6'da "zayif kanit"), G1:G-dubbel-a#1 (kilnli pay araliktayken "tahil paylari farkli"). Kesin 9/390 = %2,31 (ust %3,99); kati 15/390 = %3,85 (ust %5,86) -> KATI OKUMADA KAPI GECEMEDI. G cevaplarinin 10/60'inda en az bir sorunlu cumle var; 8'i SIRA / PUAN NEDENI anlatimi.
- CC ile uyusmayan 13 cumle (hepsi Claude daha kati). CC'nin c'leri (G29#5, M12, M28) Claude'da da c/sinirda.

1. SIRA / PUAN NEDENI HATA SINIFI (G, AI5) — kokten kapat
- Pakette her aday icin uygulamanin URETTIGI tek satir: "SIRA NEDENI (uygulama): grup <olculebilir|yan_etki|bant_disi|yalniz_yon> (<gerekce: hangi deger bandi asiyor / yan etki ne>); grup ici puan = <formulun sayisal acilimi>; stok, malzeme degisimi ve varsayim satiri siralamayi ETKILEMEZ."
- SISTEM_GELISTIR'e kural: siranin / puanin nedenini yalniz bu satirdan aktar; baska neden ekleme.
- AI5 ek katmani (donmus bolge DISI): siraya / puana neden baglayan yan cumle (sira|sirala|siralan|puan|onde|arkasinda + icin|nedeniyle|yuzunden|oldugundan|bu yuzden|bu nedenle) icinde stok / malzeme / varsayim / "zayif kanit" (aday N >= 5 iken) geciyorsa ya da gecen grup gerekcesi adayin gercek grubuyla uyusmuyorsa DUSER (tur 'sira').
- Test: bu kosunun 11 G cumlesi (5 c + 6 sinirda; metinler etiket dosyasinda) -> c'nin 5'i DUSER; sinirdalarin her birinin karari raporda. Kosunun gosterilen 384 G cumlesi yeniden gecirilir: yeni dusen her cumle tek tek listelenir (yanlis alarm sayisi). KASITLI: "stokta oldugu icin 1. sirada" DUSER; "yan etkisi oldugu icin arkasinda" GOSTERILIR.
- "zayif kanit" etiketi pakette yalniz N < 5'te yaziliyor; G2:G11 tipini (N 6) GOREV'de acikca yasakla ("zayif kanit" ifadesini yalniz pakette yaziyorsa kullan).

2. pH YONU AYRIK SATIR (M12 / M28 sinifi)
- hesap:phTahmin + olcum varken uygulama yonu kendisi yazar: olcum < tahmin -> "Olcum tahminden DUSUK: Damitik/RO varsayimi bu farki ACIKLAMAZ (gercek su alkaliyse tahmin YUKSELIR); fark tahmin payi (±0,1–0,2), olcum sicakligi referansi ya da suyun kalsiyum/magnezyumu kaynakli olabilir — bu partinin suyu bilinmiyor." Olcum > tahmin -> varsayim yon olarak tutarli satiri. Kalsiyum/magnezyumun pH'i dusurdugu iddiasi icin motorun RA formulunden alinti yap (RA = Alk − Ca/1,4 − Mg/1,7, satir ~16186) — kaynagini yaz, formul disi kimya ekleme.
- Test: M12 ve M28 paketlerinde satir var; olcum > tahmin fixture'inda dogru satir.

3. BILGI KAYDI METIN NETLIGI (yalniz metin, kaynakla)
- oran_sicaklikKaybi: "FG 1.011 vs 1.013" hangi partiye ait — Brulosophy BIAB vs no-sparge Vienna Lager (2018) sayfasini OKU, iki partinin FG'sini adlariyla yaz (bulamazsan "hangi partiye ait oldugu kaynakta dogrulanamadi" yaz). M2:M17#4 tipi birlestirme.
- G17 kanit metni "0/2 tanesi seker kullanmiyor" cift olumsuz -> "0/2 tanesi seker kullaniyor" (anlam ayni mi, kodda kontrol et).

4. G18 ADAY TEKRARI
- Kristal adayi ile "en koyu malt" adayi ayni malt satirini degistiriyorsa (Karamela 248 g / 251 g) tek aday kalir (puani yuksek olan); test G18 paketinde aday sayisi ve satir benzersizligi. Sira testi (G.siraGecerli) aynen.

5. DENETLEYICI YANLIS ALARMLARI (CC bulgusu; GUVENLI taraf ama kapinin (b) sayisini sisiriyor)
- Yon: "bandin altindaki farki azaltiyor" / "BJCP alt sinirina uzaklik azaliyor" gibi cumlelerde ozne fark/uzaklik iken FG yonu saniliyor (G21#4 haric — o gercekten ters). Donmus bolgede -> duzeltme + YENIDEN DONDURMA + geri oynatma: kosu #4 (1285), G 2026-10-14 (54), DOG1 G (390) — karar degisen her cumle listelenir, kacak (gercek ters yon gosterilen) 0 olmali; G21#4 ("FG ... 1,010'a ... cikiyor") DUSMEYE DEVAM etmeli.
- Oneri (mash ek katmani, donmus DISI): Palmer "heat the mash uniformly" alintisi isiticisiz kapta isitma onerisi saniliyor (M18 bir turda dustu, digerinde gosterildi). Kaynak alintisi icindeki eylem (tirnakli Palmer metni, kaynak:palmerKaristir atfi) oneri sayilmaz; isiticisiz kapta "isitarak getir" gibi dogrudan oneri yine DUSER (kasitli).

6. SERITLER + KAPI
- M: D.KAPI M gecti -> mash cevap karti ve Ayarlar satiri: "dogrulama turu 2026-10-15, Opus 5.5: yanlis 7/411 (ust %3,2; kati okuma), yalakalik 0, tat 0" — "erken test" kalkar. Kaynak: Claude etiket dosyasi (sayilar dosyadan okunur, elle yazilmaz; test).
- G: "erken test" KALIR; satir "dogrulama turu 2026-10-15: kati okuma 15/390 (ust %5,9) — sira nedeni duzeltmesi sonrasi yeniden olculecek".

7. YALNIZ G TAZE KOSU HAZIRLIGI + DOGRULAMA + AKIS
- '🔬 Dogrulama turu' G'yi tek basina kosabilsin (G1 -> G2; M kosulmaz); ayni 30 istem, ayni puanlama metni + EK (bu dosyadaki madde 1 kurali kosudan ONCE yazildi; kati okuma = sinirda yanlis sayilir; G kapisi kati okumayla). Tahmin olculenden (G 0,0293 $/cagri, n 60) VARSAYIM, tavan 2 kat + en kotu cagri.
- npm test yesil + madde 1-6 case'leri, en az 4 kasitli bozma kirmizi. BUL2C-ISTEK, AI5 G, MASH2/2B/2C, DOG1/DOG1B testleri aynen (degisenler satir satir).
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida dogrular; sonra Kaan'a tek cumle (yalniz G).

RAPOR: madde 1 tablo (11 cumle + 384 yeniden gecirme), madde 2 ornek satirlar, madde 3 kaynak alintisi, madde 4 G18 once/sonra, madde 5 yeni imza + geri oynatma tablosu (yoksa "dokunulmadi"), madde 6 seritler, maliyet tahmini, SUPHE (zorunlu).
