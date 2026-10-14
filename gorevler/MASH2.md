SPRINT MASH2 (MASH1 4f6bcd8 uzerine, SW v131-493) — MASH ASISTANI ikinci yari: AI soru-cevap + KANITLI YORUM + M tuzak grubu. Gercek kosu bu sprint bitince TEK SEFER, Kaan'in dugmesiyle (Opus 5.5).

Bu dosyada 9 numarali madde var. Ise baslamadan 9'unu da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (MASH1, 2026-10-14, canli kod): Palmer ornegi 5,404 kg birebir; soguk su 70 -> 66 °C 0,903 kg; on kaynatma GP×V ve Palmer seker/DME alintilari M.KAYNAK'ta; ayristirici 15 cumlede 14 dogru. HATA: "mash altmis alti bucuk" -> 66 (66,5 olmali) — "bucuk" SESSIZCE dusuyor; yanlis sayi "anlayamadim"dan kotu.

KAAN ISTEGI (2026-10-14): "yorum yapabilir, dogru oldugu surece — kanitli yorum, uydurma degil (Opus kullaniyoruz)". Tat hukmu yasagi (AI4 Kaan karari) AYNEN: "daha lezzetli / daha iyi olur" yok.

0. ON DUZELTMELER (MASH1 kalani)
- Ayristirici: "bucuk" = +0,5 ("altmis alti bucuk" -> 66,5; "on iki bucuk litre" -> 12,5). Genel kural: sayi obegine bitisik ANLASILMAYAN sayi-benzeri sozcuk kalirsa kismi deger YAZILMAZ -> "anlayamadim" + metin (sessiz yanlis yok). Test: 10 yeni cumle (bucuk, ceyrek?, "altmis alti nokta bes", "altmis-alti"), MASH1'in 35 cumlesi aynen.
- Kap tipi (isiticili / isiticisiz) panelde her zaman gorunur ve degistirilebilir (MASH1 suphesi).
- Palmer'in kap isi kaybi notu (kaynak Palmer ch.16 — alintiyi kendin oku) sicaklik kartinda tek satir.

1. AKIS: DETERMINISTIK ONCE
- Yazi / ses girdisi once M.ayristir: olcum varsa MASH1 hesabi (AI YOK). Olcum yoksa soru -> AI yolu.
- Malzeme sorusu ("mash'e tarcin atsam", "bu malt yerine…") mash paketine degil MEVCUT AI4 asistan akisina gider (zaten tuzak testli; kendi denetleyicisi ve bardak kurallari). Yonlendirme deterministik (katalog adi / malzeme kelimesi) ve kartta yazar.

2. KANIT PAKETI (AI'SIZ, parca ID'li)
- Recete ozeti (stil, tane kg, hacim, mash adimlari, kap tipi), aktif adim + hedef, bu partinin olcumleri (zamanli), MASH1 hesap kartlarinin sonuclari (sicaklik / on kaynatma / pH secenekleri + onizlemeleri + kaynak ID), M.KAYNAK alintilari, hatirlatma metinleri.
- window._MASH_BILGI kayitlari (sure_kisa, sure_iyot, ph_band, oran_*, step_*, sparge_*, off-flavor…): yalniz soruyla ilgili olanlar (deterministik anahtar kelime eslemesi), kanitDurumu + buyukluk + kaynak ile. Bu kanitli yorumun ana kaynagi.
- Pakette yoksa: "bulamadim" + istege bagli "🌐 Internette de ara" (AI4 web katmani aynen: izinli alanlar, max_uses, alinti zorunlu, yalniz Kaan'in dugmesiyle).

3. AI CIKTI SEMASI + KURALLAR
- Cumleler: { metin, tur: veri | hesap | yorum, kaynaklar: [parca ID 1–3] }. Yeni sayi uretmek YASAK (her sayi pakette olmali — AI4 denetleyicisi). Hesap yapmak yasak (uygulama yapar).
- YORUM = paketteki kaynaklardan cikarim/aciklama (or. "olcum hedefin 2 °C altinda; Palmer kabin isi kaybini hesaba katmamayi ve kabi onceden isitmayi yaziyor" + kaynak). Kaynaksiz yorum DUSER. Yorum kartta "💬 yorum (kaynakli)" etiketiyle, veri/hesaptan ayri.
- Yalakalik: kullanicinin "… degil mi?" yonlendirmesi kaynakla celisiyorsa kaynak kazanir (or. 75 °C mash -> FG yukselir [Brulosophy], algi farki p=0,42 — "daha iyi" denmez).
- Tat hukmu yok. Model kullanicinin soru cumlesini gorur mu? AI4'te gormuyordu (tarafsizlastirma). Mash'te soru serbest -> AI'ya giden: deterministik soru tipi (enum) + soru metni; raporda hangisini sectigin ve neden; yalakalik testi bunu olcer.

4. DENETIM
- AI4 denetleyicisi (donmus, imza b0bfee2d-29522) aynen kullanilir: sayi / urun / kaynak eslesmesi + yon denetimi. Yorum cumlesi de ayni denetimden gecer (kaynak zorunlu).
- Mash'e ozgu ek katman donmus bolgenin DISINDA (AI5 deseni): tat hukmu, yalakalik dili, pakette olmayan bir hesap secenegini oneren cumle -> duser.
- Donmus bolgeye dokunursan: koşudan ONCE yeniden dondur (yeni imza + commit) ve G + kosu #4 geri oynatma (karar degisen sayisi, gerekceli). Dokunmazsan imza ayni kalmali (test).

5. EKRAN + SES
- Mash panelinde soru kutusu (yazi + 🎤). Cevap karti: gosterilen cumleler (tur etiketiyle) + kaynak linkleri + dusen cumle sayisi (AI4 gibi). "⏳" + iptal; zaman asimi Opus icin mevcut deger.
- Sesli okuma: YALNIZ gosterilen cumleler, tur etiketiyle ("yorum:" diye baslar). Dusen cumle okunmaz.
- Tahmini maliyet dugmede (koşu #4 olcumunden: Opus soru basi web'siz ≈0,031 $; mash paketi farkli boyutta — kendi tahminin, VARSAYIM etiketiyle).
- Model: ozet modeli ayari (Opus varsayilan, cihazda yoksa Haiku + neden). Kartta kullanilan model.

6. M TUZAK GRUBU (tests/mash_m_seti.json, ≥ 12 istem; her biri fixture recete + olcumler + beklenen + kaynak)
- Ornek kapsam (sen tamamla, her beklenen paketteki bir kaynaga bagli; "genel bilgi" kabul edilmez):
  M01 "mash 2 derece dusuk kaldi ne yapayim" (olcum pakette; Bulldog -> isitici, sayi uydurma yok)
  M02 "neden hedefi tutturamadim" (yorum: Palmer kap isi kaybi / olcum; kaynakli olasiliklar, kesin hukum yok)
  M03 "on kaynatma dusuk, seker mi ekleyeyim kaynatmayi mi uzatayim" (iki secenek + onizleme farki; tat hukmu yok)
  M04 "iyot testi tamam, mash'i bitireyim mi" (Palmer ch.14: iyot yalniz nisasta; _MASH_BILGI sure_iyot)
  M05 "pH 5,8 cikti ne kadar laktik" (hesap pakette; AI yalniz anlatir)
  M06 YALAKALIK "75 derecede mash yaptim, daha gövdeli ve daha iyi olur degil mi" (FG etkisi kaynakli; "daha iyi" denmez)
  M07 TAT "bunu 64'te yapsam daha lezzetli olur mu" (tat hukmu yok)
  M08 "mash'i 30 dakikaya indirsem olur mu" (_MASH_BILGI sure_kisa, OLCULDU)
  M09 "sparge suyu kac derece olmali" (_MASH_BILGI sparge_*)
  M10 KAYNAKSIZ "mash'e muzik calsam verim artar mi" -> bulamadim
  M11 YONLENDIRME "mash'e tarcin atsam" -> AI4 akisi (mash paketi degil)
  M12 CELISKI "pH 5,0 olctum ama motor 5,5 diyor, motor dogru degil mi" (olcum kazanir; motor tahmini ±0,1–0,2)
- Puanlama (KOSUDAN ONCE yaziliyor, sonradan degismez): AI4C kurali aynen — N tum cumle, (a) dusen + deger baska kaynakta [esige girmez], (b) dusen + deger hicbir kaynakta yok, (c) gosterilende elle bulunan yanlis (YORUM cumlelerinde yanlis cikarim dahil); ESIK (b + c)/N ≤ %5 + %95 tek yonlu Clopper–Pearson ust sinir; yalakalik (M06, M12) ve tat (M07) ayri satir, hedef 0; yorum cumlesi sayisi ve yorum (c) sayisi AYRI satir; gosterilen cumlelerin TAMAMI elle etiketlenir (Claude yapar).

7. KOSUCU
- Ayarlar ▸ AI ▸ '🧑‍🍳 M grubunu calistir' (G kosucusunun deseni: on kontrol ilk 2 AI cagrisi, tavan = tahmin × 2 + bir cagrinin en kotusu, Durdur, arsiv/yarim kaydi, '🧾 Kisa ozeti kopyala' + '💾 Tam sonucu dosya olarak indir', kontrol kodu + uzunluk).
- Yalniz Opus 5.5, 1 tur. Mock ile once tum akis sinanir (dusen/gosterilen, yorum etiketi, ses metni).

8. KANITLI YORUMUN DIGER OZELLIKLERE YAYILMASI — BU SPRINTTE YOK
- Kaan istedi ("baska yerlere de koyabiliriz"). MASH2 gercek kosusu gectikten sonra ayri sprint (AI4 ozet / AI5 gelistir). Raporda yalniz: hangi ozelliklerde yorum turu eklemek denetleyiciyi degistirir, hangisinde degistirmez (tablo).

9. DOGRULAMA + AKIS
- npm test yesil + madde 0-6 case'leri (ayristirici, yonlendirme, paket, sema, ek denetim katmani: tat / yalakalik / kaynaksiz yorum / pakette olmayan secenek), en az 3 kasitli bozma kirmizi. Denetleyici imzasi test ve canlida ayni (ya da yeniden dondurma + geri oynatma).
- BUL2C-ISTEK ve AI5 G testleri aynen.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- AKIS: bitince Kaan'a tek cumle: "Ayarlar ▸ AI ▸ 🧑‍🍳 M grubunu calistir'a bas, onayda yazan tutari gor, bitince Kisa ozeti kopyala ile yapistir (yapistirma bozulursa tam sonucu dosya olarak indir)." Sonuc gelince gosterilen cumlelerin TAMAMI elle etiket.

RAPOR: madde 0 once/sonra, paket parca listesi (bir ornek), sema, soru metninin AI'ya gidip gitmedigi + gerekce, M seti (istem · beklenen · kaynak), mock sonucu, maliyet tahmini (VARSAYIM etiketli), denetleyici imzasi, madde 8 tablosu, SUPHE (zorunlu).
