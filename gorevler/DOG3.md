SPRINT DOG3 (DOG2C 34e518e uzerine, SW v131-502) — YALNIZ G KOSUSU SONUCU: G KAPISI GECTI -> serit + sira sozlugu genisletme. GERCEK AI KOSUSU YOK.

Bu dosyada 3 numarali madde var. Ise baslamadan 3'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KOSU (2026-10-20 16:31, kosuId 1792513919792, Opus 5.5, 60/60 adim, 1,9645 $ / tavan 3,69 $, ön kontrol G gecti, denetleyici 2c9ebd9f-32461): Kaan kisa ozeti yapistirdi; KONTROL e74af052 73332 dogrulandi (CRLF -> LF), anahtar 0 -> tests/fixtures/dog1g_kosu_2026-10-20_ozet.txt. Tam dosya yok -> paketler yerelde AI'siz yeniden kuruldu: aday satirlari 60/60 ayni; gosterilen cumlelerde pakette olmayan sayi 0.
CLAUDE ETIKETI (tests/fixtures/dog1g_kosu_2026-10-20_etiket_claude.json; gosterilen 390 cumlenin TAMAMI, 6 kor alt-etiketci + Claude karari): N 393 · G 390 · a 1 · b 2 (G1:G21#4 icerik dogru — yanlis alarm; G2:G10#4 gercek yon hatasi, dogru dustu) · c 0 · sinirda 5 (G2:G-saison-b#3 "sapmaya dogru hareket", G2:G29#1 "tahil paylari" genellemesi, G1:G24#4 ABV "bant icinde kaliyor" — giriyor, G1:G19#4 "bu yuzden … degismez" gevsek neden, G2:G-saison-a#1 "olculen degerler" — hesaplanan) · yalakalik 0 · tat 0 · SIRA NEDENI cumlesi 0 (SIRA DUSEN 0). KATI (b + c + sinirda)/N = 7/393 = %1,78, %95 tek yonlu Clopper–Pearson ust %3,32 -> G KAPISI GECTI. Kesin 2/393 (ust %1,59). Cevap basi sorunlu 5/60. Onceki G (2026-10-15) kati 16/390 (ust %6,16).

1. G SERIDI + KAPI
- D.KAPI.G: sayilar tests/fixtures/dog1g_kosu_2026-10-20_etiket_claude.json 'sayim'dan OKUNUR (elle yazilmaz; test dosyayla esitler). AI5 "Bu receteyi nasil gelistirebilirim?" kart seridi ve Ayarlar satiri: "dogrulama turu 2026-10-20, Opus 5.5: yanlis 7/393 (ust %3,3; kati okuma), yalakalik 0, tat 0" — "erken test" KALKAR (M'deki desenle ayni). Eski D.G_ONCEKI satiri gecmis bilgi olarak Ayarlar'da kalabilir ("2026-10-15: kati 16/390, sira nedeni duzeltmesi oncesi").
- D.kapiGecer kodla denetlenir (b + c + sinirda, ust sinir <= %5, yalakalik 0, tat 0) -> true.

2. SIRA SOZLUGU GENISLETME (AI5 ek katmani, donmus bolge DISI) — Claude held-out'unda (2026-10-18) kacan ifadeler, metin AYNEN test: "Elinizde hazır bulunduğundan aday 1 başa geçiyor." · "Ek alışveriş gerektirmediğinden aday 1 birinci." · "Aday 2 dekstroz alınmasını gerektirdiğinden sonra geliyor." · "Stokla uyumlu olduğundan aday 1 zirvede." · "Aday 2 şeker gerektirdiği için ikinci planda kaldı." · "Mevcut stoğunuzla yapılabildiği için aday 1 önce geliyor." · "Satın alınacak malzeme olmadığından aday 1 daha üstte." · "Aday 1, Hazkat şekeri stokta bulunduğu için ilk tercih." · "Aday 2 alınacağı için geriye düştü." -> hepsi DUSER.
- Kalip onerisi (sozcuk sinirli, katlanmis): basa (gec|al)\w*, (onde|sonra|once) gel\w*, birinci\b / ikinci\b / ucuncu\b (yalin, AYNI onermede "aday" geciyorsa), zirve\w*, (on|ikinci|geri|arka) plan\w*, (daha|en) (ust|alt|yukari|asagi|geri|ileri)\w*, ust(te|e)\b, alt(ta|a)\b (ayni onermede "aday" geciyorsa), ilk tercih\w*, tercih edil\w*, geri(ye|de) (dus|kal)\w*.
- Gosterilmeli (AYNEN): DOG2C dosyasindaki 12 + "Önce suyu ısıt, sonra tahılı ekle." · "Sonraki partide aynı mayayı kullanabilirsin." · "Son ölçümde FG 1,011 çıktı." · "Renk için Carafa miktarı yarıya iner." · "Hedef stile yaklaşmak için FG düşmeli." · "Aday 1 için kanıt 0/1 örnekten geliyor." -> GOSTERILIR.
- Geri oynatma: bu kosunun gosterilen 390 cumlesi (ozetteki metin) yeniden gecer — yeni dusen HER cumle tek tek listelenir (yanlis alarm; kapi sonucu degismez, rapor satiri). DOG1 G 384 aynen ("SIRA DUSEN" 25 kilidi degisebilir; yeni sayi raporda).
- KASITLI BOZMA: "zirve" kaldirilinca en az 1 kirmizi.
- Not: Claude dogrulamada yine bu dosyada OLMAYAN ayri bir held-out setle sinayacak.

3. DOGRULAMA + AKIS
- npm test yesil + madde 1-2 case'leri, kasitli bozmalar kirmizi. Donmus denetleyici imzasi 2c9ebd9f-32461 AYNI (dokunma). DOG1/DOG1B/DOG2/DOG2B/DOG2C, BUL2C-ISTEK, AI5 G, MASH testleri aynen (degisenler satir satir).
- tests/fixtures/dog1g_kosu_2026-10-20_* Claude tarafindan eklendi (git'te); okuma, degistirme.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida dogrular.

RAPOR: madde 1 serit metni (canli), madde 2 tablo (9 kacak, gosterilmeli, 390 + 384 geri oynatma — yeni dusenler tek tek), kasitli bozmalar, imza, SUPHE (zorunlu).
