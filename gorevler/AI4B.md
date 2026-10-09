SPRINT AI4B (AI4 0b94f9b + ec51cfa uzerine) — denetleyiciyi GERCEK cevaplarla dogrula, sonra dondur, sonra yalniz Haiku ile taze dogrulama kosusu

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

DURUM (AI4 kosu #2, 2,15 $; tuzak toplami 7,44 $, kalan 4,56 $): Haiku uydurma 13/138 = %9,4 -> KALDI, asistan KAPALI. CC incelemesi: 13'un 4'u "gercek deger, eksik kaynak" (iki urun tek cumlede, tek kaynak), 8'i denetleyici hatasi (TR/EN ad, genel kelime, "yokluk" yanlis alarmi, urun adindaki rakam), 1 dogrulanamadi (T06a %6,5 — alinti kaydedilmemis). Bardak denemesi / "bulamadim" gercek kosuda HIC cikmadi: web her ciftte genel yazilar buldu.
CLAUDE DEGERLENDIRMESI: CC'nin 7 duzeltme onerisi KABUL — ama asil sorun denetleyicinin gercek cevaplarla hic sinanmamis olmasi. Duzeltme denetleyiciyi GEVSETIYOR (coklu kaynak, genel kelime haric); yalniz yanlis alarmlari degil KACAN uydurmalari da olcmeden canliya cikmaz. Ayrica sonucu gordukten sonra denetleyiciyi ayarlayip ayni sonucu yeniden puanlamak "gecti"yi kanitlamaz -> taze kosu sart, denetleyici kosudan ONCE dondurulur.
KURAL: Madde 1-4 bedava (API yok). Madde 5 Kaan'in dugmesiyle. Asistan beta anahtari KAPALI kalir.

1. CC'NIN 7 ONERISI — su degisikliklerle
- (1) Coklu kaynak (1-3) KABUL, ama baglama kurali: cumlede adi gecen her katalog urunu icin kaynaklardan biri O URUNUN kaydi olmali; her sayi, cumlede kendisine en yakin adi gecen urunun kaynaginda (ya da o urune bagli web alintisinda) bulunmali. "WY3068 %73-77" sayisi WLP300'un kaynagindan gecerse DUSER. Sistem talimatina "her cumlede tek urun" tercihi eklenir.
- (2) Urun adindaki rakam: yalniz token katalogdaki bir urun adi/alias'inin parcasiysa sayi sayilmaz ("Crystal 40", "WY3068"). Ama ad ile kaynak urunu eslesmeli ("Crystal 60" yazip Crystal 40 kaynagi gostermek DUSER).
- (3) TR/EN ad eslemesi katalog alias'larindan; genel kelime listesi (bugday, malt, maya, hop, seker...) ACIK liste, testli.
- (4) "Yokluktan olumsuz sonuc" kurali daralt; "birimsiz, bu yuzden cevrilemedi" turu cumleler test case olarak gecmeli; "kimse kullanmamis, yani kotu" turu dusmeli.
- (5) Web bulgusu: alintida malzeme VE (stil ya da aile) birlikte geciyorsa (TR/EN alias) "stile ozgu kanit" — esige yalniz bunlar sayilir. Digerleri kartta ayri ve altta: "genel kaynak — <stil>'e ozgu degil". Kabul: korpusta sifir + stile ozgu web alintisi yoksa "bulamadim" + (AI4 madde 5 uc sarti saglaniyorsa) bardak denemesi CIKAR.
- (6) Ozet max_tokens 2000.
- (7) Her adimda (yalniz dusenler degil) tum cumleler + kaynak ID'leri + web cited_text + url sonuca yazilir (working/, anahtarsiz, kisisel veri yok).

2. DENETLEYICI DOGRULAMA SETI (gercek cevaplardan, bedava)
- working/tuzak_sonuc_gercek_2.json'daki gercek cumlelerden: 13 duseni + rastgele (tohum yazili) en az 40 gecen cumle. Gecenlerin tam metni kayitli degilse bunu raporla ve madde 5'te kaydedilecek veriyle ayni isi yap.
- Her cumle ELLE etiketlenir: dogru / yanlis (uydurma) / kaynak eksik — her etikette kanit (paketteki deger ya da alinti). T06a %6,5 dogrulanamazsa "dogrulanamadi" kalir, dogru sayilmaz.
- Duzeltilmis denetleyici bu etiketlerle karsilastirilir: yanlis alarm sayisi VE kacan uydurma sayisi ayri raporlanir. Kacan uydurma 0 olmali; olmuyorsa nedeni + duzeltme.

3. MUTASYON TESTI (denetleyicinin uydurmayi yakaladigini kanitla)
- Gercek gecen en az 30 cumleden otomatik bozuk kopyalar: sayiyi degistir (+-%20 ve rastgele), urun adini baska katalog urunuyle degistir, kaynak ID'sini baska ID ile degistir, iki urunlu cumlede sayilari yer degistir, stile ozgu olmayan web alintisini stile ozgu gibi bagla.
- Her bozuk kopya DUSMELI. Tur basina yakalama orani raporda; hedef sayi ve urun bozmalarinda %100. Bu set tests/ altina (kisisel veri yok) kalici regresyon testi olarak girer.

4. DONDUR
- Madde 1-3 yesil olunca denetleyici kodu commit edilir; commit hash'i kosucu sonucuna yazilir. Kosudan SONRA denetleyici degistirilmez; sonucu yorumlamak icin degisiklik gerekirse bu bir sonraki sprint olur ve yeni taze kosu ister.

5. TAZE DOGRULAMA KOSUSU (Kaan'in dugmesi; yalniz Haiku)
- On kontrol (AI4 deseni) + tum set A, B, C, E, T, 1 tur, yalniz claude-haiku-5-5. Sonnet bu kosuda YOK. Tahmini maliyet raporda; tavan kalan butce (4,56 $).
- Esikler AI4 madde 8 ile ayni. Ham (denetleyicinin olctugu) sayilar raporlanir; sonradan elle yorum ayri satirda ve sonucu DEGISTIRMEZ.
- Dusen her cumle icin madde 2 bicimiyle elle etiket (kanitli) — denetleyicinin taze veride yanlis alarm / kacan uydurma orani.
- GECERSE: AI4 madde 8 (beta acik, "erken test" notu, varsayilan ozet modeli Haiku). KALIRSA: kapali + kategori + oneri; yeni harcama Kaan onayina bagli.

6. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler: madde 1'in her alt kurali, dogrulama seti uyumu, mutasyon seti, dondurma (sonuc dosyasinda hash). En az 2 case kasitli bozmayla kirmizi.
- Mock ekran goruntusu 390/360: "Dubbel'e lavanta" (stile ozgu kanit yoksa bulamadim + bardak denemesi; genel kaynaklar altta ayri), "Saison'a lavanta" (kanitli, bardak denemesi YOK).
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- AKIS: madde 1-4 + canli -> Kaan'a TEK cumle (bakiye kontrolu + dugme + Sonucu kopyala). Yapistirma gelince puanla, etiketle, karari uygula, raporla.

RAPOR: 7 duzeltme (once/sonra davranis), dogrulama seti (etiket dagilimi, yanlis alarm, kacan uydurma), mutasyon yakalama tablosu, dondurma hash'i, taze kosu metrikleri + elle etiket ozeti, maliyet, karar, SUPHE (zorunlu).
