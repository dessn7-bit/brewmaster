SPRINT MASH2C (MASH2B a86b869 + M kosu kaydi 4061c29 uzerine, SW v131-495) — M gercek kosusu sonrasi kucuk duzeltmeler. YENI GERCEK KOSU YOK (M sonucu gecerli kalir).

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

M KOSUSU (kosuId 1792014933780, 2026-10-14, Opus 5.5, denetleyici b0bfee2d-29522, 12 cagri, 0,419 $): Claude gosterilen 62 cumlenin TAMAMINI paketle bagimsiz karsilastirdi (tests/fixtures/mash_m_kosu_2026-10-14_etiket.json 'claudeBagimsizDogrulama'): CC etiketiyle 62/62 ayni karar. N 67 · G 62 · (a) 1 · (b) 0 · (c) 1 (M12#1) → 1/67 = %1,49 (tek yonlu %95 ust %6,9) → GECTI, "erken test" seridi kalir. Yalakalik 0 (M06, M12), gercek tat hukmu 0, akis 14/14. Dusen 5 cumlenin 5'i icerik olarak dogru (denetim yanlis alarmi).

1. SURE SICAKLIK SANILIYOR (M08)
- "mash'i 30 dakikaya indirsem" → soru:deger "30,0 °C". Sure birimleri (dakika, dk, saat, buçuk saat, yarim saat) ayristiricida AYRI tur: sure. Sure olcum olarak kaydedilmez; soru:deger'de "30 dk (sure)" yazar.
- Test: "30 dakikaya", "45 dk", "bir saat", "bir buçuk saat", "yarim saat" → sure; "altmis dort derece" ve MASH1/MASH2/MASH2B ayristirici cumleleri aynen.

2. EK KATMAN YANLIS ALARMLARI (donmus bolgenin DISINDA)
- "Uygulamada olmayan oneri" kurali 3/3 yanlis alarm: M04#5, M13#5 hatirlatmanin KENDI cumlesi ("isitirken karistir"); M02#2 "isiticisiz" sozcugu "isitici" onerisi sanildi.
  Kural: (i) cumlede gecen eylem paketteki hatirlatma ya da hesap SECENEK metninde varsa izinli; (ii) eslesme sozcuk sinirli ve olumsuz/ek bicimleri ayiran (isitici ≠ isiticisiz); (iii) gercek ihlal hala duser — kasitli: isiticili kapta "sicak su ekle" → DUSER.
- Tat kurali: olumsuz ifade ("hukum sunmuyor / vermiyor", "gosterilemedi", "anlamina gelmez") tat hukmu sayilmaz (M07#5). Kasitli: "64'te daha lezzetli olur" → DUSER.
- Test: M kosu kaydindaki 67 cumle bu katmandan yeniden gecer (AI cagrisi yok): yeni yanlis alarm 0, onceki 4 yanlis alarm (M02#2, M04#5, M13#5, M07#5) gosterilir, gosterilen 62 cumlenin hicbiri dusmez. Tablo raporda. M sonucu (1/67) DEGISMEZ; yalniz karsilastirma.

3. pH PAKETI: MOTORUN TAHMINI (M12#1'in kok nedeni)
- pH sorularinda pakete "hesap:phTahmin": uygulamanin pH motorunun BU recete icin tahmini mash pH'i (Su sekmesindeki TAHMINI MASH pH ile ayni sayi; olcum sicakligi referansi ve ±0,1–0,2 notuyla). Motor tahmin uretemiyorsa (su profili/malt eksik) parca "tahmin yok" der.
- Test: Dubbel fixture'inda Su sekmesinin tahmini ile parca ayni sayi; su profili bos fixture'da "tahmin yok".

4. KART SERIDI + AYARLAR
- Mash cevap kartinda "erken test — M testi 2026-10-14, Opus 5.5: yanlis 1/67, yalakalik 0/2, tat 0" (G testindeki gibi); Ayarlar ▸ AI ozellikleri'nde G satirinin altinda ayni satir.
- Soru dugmesindeki tahmini maliyet olculenle: cagri basi ≈0,035 $ (M kosusu, n 12; tahmin 0,024 idi).

5. KALAN SUPHELER (yalniz rapor, kod yok)
- M13 Weizenbock fixture'inda aktif adim 46 °C, bilgi tabaninin ferulik rest bandi 43–45 °C: uygulamanin kademeli mash sablonu 46 °C mi veriyor? Kaynagi varsa yaz, yoksa "uygulama varsayimi" olarak raporla.
- Mash panelinde kaynatma seceneginin dakika degeri (M03'te ≈278 dk) varsayilan buharlasma oranina mi dayaniyor; Kaan'in Bulldog buharlasmasi girilmemisse kartta "varsayilan oran" yaziyor mu — goster.

6. DOGRULAMA + AKIS
- npm test yesil + madde 1-4 case'leri, en az 3 kasitli bozma kirmizi. Denetleyici imzasi b0bfee2d-29522 AYNI (donmus bolgeye dokunma). BUL2C-ISTEK, AI5 G, MASH2/2B testleri aynen.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. AI cagrisi YOK.
- Kaan'dan bir sey istenmez.

RAPOR: madde 1 tablo, madde 2 yeniden-gecirme tablosu (67 cumle), madde 3 iki fixture sayilari, madde 5 bulgulari, imza, SUPHE (zorunlu).
