SPRINT CEV2B (CEV2 3556ee7 uzerine, SW v131-518) — CEV GERCEK KOSUSU #2'DEN ONCE KUCUK DUZELTMELER. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 0-7 numarali 8 madde var. Ise baslamadan 8'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (CEV2, canli kod, 2026-10-24): md5 canli = yerel (1832f5de…), bm-cache-v131-518, AI4 imza 2c9ebd9f-32461, arastirma denetleyicisi 92f59a3c-5776, anahtar 0.
- KABUL: stilsiz sorgu + sorguTemizle (yinelenen ve site:/tirnakli sorgu atiliyor), 4 sinif web, sinif listeleri 26 alan kesisimsiz, arastirma denetleyicisi (olmayan kod WLP099 dusuyor, dogrudan cevaptaki alintida olmayan sayi dusuyor), dogrudan cevap + "iki bagimsiz kaynakla desteklenen etken bulamadim" cumlesi, BE-256 82-86, coklu set kilidi.
- KABUL (SUPHE maddeleri): sayfa duzeyinde kod aramasi (urun kodu sayfanin kimligi); "onerilir" ile dusen 2 madde (guvenli taraf); deger celiskisinde uc nokta dokunusu (7-9 gun <-> en cok bir hafta) celiski sayilir; genis tat sozlugu kullanilmamasi.
- AMA Claude'un sentetik denemesinde (C.maddeIsle, sahte alintilar) 4 hata + kendi soru denemesinde 2 yonlendirme hatasi (madde 1-6).
- NOT: Claude tests/cev_seti.json'u duzeltti (C07/C08 sicaklik etkeni 'celiski' — Lallemand Abbaye TDS; 8 sorunun anahtar sozcukleri daraltildi; puanlama EK 2) ve yeniden imzaladi: beklenenImza 7befe7db (onceki 7f7e4ea1). Testteki sabit imzayi 7befe7db yap; dosyaya DOKUNMA. Held-out seti (tests/cev_seti_heldout.json) Claude bu sprintten SONRA ekler.

0. DOKUNULMAZLAR
- AI4 denetleyicisi 2c9ebd9f-32461 ve arastirma denetleyicisi 92f59a3c-5776 (BAS…SON blogu) DEGISMEZ. Asagidaki maddelerin hepsi blok DISINDA (gruplama / celiski / gosterim / yonlendirme).
- tests/cev_seti.json (Claude'un dosyasi), tests/ai5_g_seti.json, tuzak seti, DOG4B-H setleri ve puanlama metinleri DEGISMEZ.

1. MADDE METNINDE YON GORUNMUYOR (anlam kaybi)
- Simdi gosterilen metin = degisken + (deger) + ' — ' + etki. Ozet semasi degiskene yapilani (yon: artirmak / azaltmak / eklemek / cikarmak) AYRI alanda veriyor ve bu alan metne girmiyor. Ornek: {degisken:'maya miktari', yon:'artirmak', etki:'ester azalir'} -> kartta "maya miktari — ester azalir": okuyan maya miktarini artirmak mi azaltmak mi gerektigini bilemez.
- Ayni sorun celiski maddesinde: "mayalanma sicakligi: daha koyu meyve aromasi (lallemandbrewing.com) <-> meyvemsi ester artar (whitelabs.com)" — hangi tarafin sicakligi dusurdugu, hangisinin artirdigi yazmiyor; neyin celistigi anlasilmiyor.
- Duzelt: yon 'bilgi' disindaysa metinde fiil acikca yazilir (ornek bicim: "maya miktarini artirmak — ester azalir" ya da "maya miktari (artirilinca) — ester azalir"; secim senin, sade Turkce). Celiski tarafi da kendi yonuyle: "sicaklik dusurulunce: daha koyu meyve (Lallemand) <-> sicaklik artirilinca: meyvemsi ester artar (White Labs)". Birlestirilmis maddede ilk maddenin yonu (net ayni oldugu icin).
- Degiskenin kendi metni zaten ters yon sozcugu tasiyorsa (degisken 'dusuk sicaklik' + yon 'artirmak') madde gosterilir AMA net yon null (gruplama / celiskiye girmez) + rapora yazilir.
- Test: yonu bilgi disinda olan hicbir gosterilen maddede yon fiili eksik olmaz (sentetik + 2026-10-24 kaydinin geri oynatmasi); celiski maddesinde her tarafin yonu okunur.

2. 'BILGI' YONU YANLIS CELISKI URETIYOR
- Claude sentetik A: {maya miktari, yon 'bilgi', etki_yonu 'artirir', alinti "Pitch rate influences ester production."} + {maya miktari, yon 'artirmak', etki_yonu 'azaltir', alinti "Higher pitch rates reduce ester formation."} -> "⚖️ Kaynaklar celisiyor". YANLIS: birinci alinti yon soylemiyor. Iki neden: (a) C.YON_ISARET bilgi = +1 sayiyor; (b) C.CUE_DEG 'produc' yuzunden "production" degisim ifadesi sayiliyor.
- Duzelt: yon 'bilgi' -> net null (yon celiskisine ve yon birlestirmesine GIRMEZ; ayni anahtarli baska bilgi maddeleriyle yalniz deger celiskisi / ayri gosterim). C.CUE_DEG'den yon tasimayan fiiller cikar: produc, contribut, caus, help, form, result, start to show (artis / azalis / ust / alt / bastirma / sinirlama / onleme / guclendirme sozcukleri kalir).
- Test: sentetik A celiski DEGIL; Claude sentetik B (Lallemand Abbaye "At lower temperatures, Abbaye produces darker fruit aromas…" <-> White Labs "Higher fermentation temperatures increase fruity esters.") celiski KALIR ("lower" / "higher" yon tasiyor). 2026-10-24 kaydinin 6 celiskisi (C27, C28, C19, C08-Lallemand, C25, C31) yeniden: hangisi kalir, hangisi duser, neden — raporla (dusen varsa nedeni yukaridaki fiil listesi mi).

3. URUN KODU KESILEREK FARKLI URUNLER BIRLESIYOR
- C.degAnahtar sozcukleri 5 harfe kesiyor: 'WLP002 flokulasyon' ve 'WLP004 flokulasyon' -> ikisi de 'wlp00 floku' -> TEK madde (iki farkli suş birlestirildi; kartta yalniz WLP002 gorunuyor, WLP004'un kaynagi ona eklendi).
- Duzelt: rakam iceren sozcuk (urun / suş kodu, C.dKodlar bicimi) kesilmez, tam haliyle anahtara girer; farkli kodlu maddeler hicbir zaman birlesmez ve celiski sayilmaz.
- Test: WLP002 / WLP004 iki ayri madde; ayni kodlu iki madde (WLP002 + WLP002) birlesir.

4. BRIESS IKI KURUM SAYILIYOR
- C.gucHesap(['https://www.briess.com/a', 'https://www.brewingwithbriess.com/b']) -> 'guclu', n 2. briess.com ve brewingwithbriess.com AYNI kurum (Briess).
- Duzelt: kurum takma ad tablosu (briess.com = brewingwithbriess.com; tabloda baska ayni-kurum cifti varsa o da). Test: bu cift n 1, 'olasi'.

5. KOZMETIK
- Celiski tarafinda etki bossa deger iki kez yaziliyor: "en cok bir hafta: kuru hop temas suresi (en cok bir hafta) (byo.com)". Duzelt: deger bir kez.

6. YONLENDIRME (AI5 G.hazirla / C.tarafsiz) — Claude'un kendi soru denemesi
- (a) "kuru hop", "kuru maya", "kuru hoplama", "dry hop" URUN / ISLEM adidir, kuruluk degil: "kuru hoptan sonra … neden olur" ve "kuru mayayi … edeyim mi" -> simdi eksen 'govde / kuruluk' (yonBelirsiz) ve arastirma konusu "gövde / kuruluk — sorulan: kuru hop". Ozetleyici ve sorgu ureteci yalniz konuyu gordugu icin YANLIS KONU arastirilir. Duzelt: bu ifadeler G.YON_KUTUP 'kuru' kutbuna girmez; konu etiketi kuru hop / kuru maya (sorulan) olur. Test: 'kuru hop' / 'kuru maya' iceren uretilmis cumleler (testin kendi tablosu: 'kuru hoptan sonra', 'kuru hop suresi', 'kuru hopu ne zaman', 'kuru mayayi', 'kuru maya kullansam' × birkaç yuklem) -> kuruluk ekseni 0; "daha kuru olsun", "kuru bitti tatli olsun" AYNEN kuruluk.
- (b) 'stil' hedefi genel soru sozcugunden secilmemeli: G.ESLEME 'stil' satiri nasil / ne yap* / eksik* / oneri* sozcuklerini de tutuyor -> "… nasil anlarim" gibi baska konulu bir soru 'stil' hedefiyle KURAL yoluna gidiyor ve recete stile yaklastirma onerisi (soruyla ilgisiz) cikiyor; ayni soru recete stil bandindaysa oneri 0 -> arastirma (sonuc receteye gore degisiyor). Duzelt: 'stil' yalniz acik sozcukle (stil, bjcp, odul, madalya, standart) ya da sorunun tamami genel gelistirme istegiyse (gelistir / iyilestir / duzelt / "ne yapmaliyim" + baska icerik sozcugu YOK) secilir; baska icerik sozcugu kalan soru (konu eslesmese bile) arastirma yoluna gider.
  Test: 'nasil anlarim / nasil olcerim / ne yapmaliyim' + konu iceren uretilmis cumleler stil hedefi 0; "biramı nasil gelistirebilirim", "stile yaklastir", "BJCP'ye uysun" AYNEN stil.
- (c) Genel kusur konulari (G.KONULAR'daki tat / koku kusurlari + asetaldehit) sorgu stilsiz: C.sorguStili kusur konusunda null.
- DUR KURALI: tests/cev_seti.json 34 sorunun yolu (kural 12 / arastirma 22) ve konu etiketi, G seti hedef / aday / neden parmak izi (4615b7b9/3414), CEV1C-D tarafsizlastirma testlerinin ciktisi DEGISMEMELI. Degisen olursa DUR, listeyle raporla (Claude karar verir).

7. DOGRULAMA + AKIS
- npm test TAM yesil; testteki cev_seti imzasi 7befe7db (Claude'un yeni imzasi; dosyaya dokunma).
- 2026-10-24 kaydinin geri oynatmasi: gosterilen / dusen sayisi, celiski sayisi, birlesen sayisi once/sonra; madde metni farki yalniz 1, 2, 3, 5'ten.
- CEV mock tam tur iki stokla: yol degisen 0, kural yolu 12/12, kapsama yeni anahtarlarla (Claude daralttı — dusus beklenir, raporla).
- Kasitli bozma: madde 1 (yon fiili kapali), 2 (bilgi +1), 3 (kod kesme), 6a, 6b -> kirmizi.
- Canli curl, SW bump (v131-519), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Maliyet satiri: koşu #2 = ana 34 + held-out (Claude ≈ 20 soru ekleyecek) — uygulamanin gosterecegi soru basi tahmin ve iki set icin tavan.

RAPOR: 1-6 once/sonra (sentetik + kayit geri oynatmasi), madde 2'de 6 celiskinin durumu, madde 6 DUR kurali sonucu, parmak izleri, imzalar, SUPHE (zorunlu).
