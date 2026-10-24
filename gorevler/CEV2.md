SPRINT CEV2 (CEV1D 889eda4 uzerine, SW v131-517) — ARASTIRMA MODU KALITESI. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 8 numarali madde var (0-7). Ise baslamadan hepsini okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

ARKA PLAN — CEV GERCEK KOSUSU (2026-10-24, kosuId 1792848045701, Opus 5.5, 34 soru, 1,4472 $, denetleyici 2c9ebd9f-32461, set 7f7e4ea1). Kayit: tests/fixtures/cev_kosu_2026-10-24.json. Claude etiketi (gosterilen 136 + dusen 16, TAMAMI; 4 kor alt-etiketci + Claude karari): tests/fixtures/cev_kosu_2026-10-24_etiket_claude.json.
- KURAL YOLU (12 soru, AI'siz): kapsama 32/32; N 44 · c 2 · sinirda 1. Iyi.
- ARASTIRMA YOLU (22 soru): kapsama elle 32/72 = %44 (mekanik 38/72 sisirilmis: anahtar sozcuk yanlis eslesmeleri benim listemden); N 108 · c 3 · sinirda 26 → kati %26,9. Yalakalik 0, tat 0, jargon 0, bulamadim-erken 0, guc hatasi 0.
- KAPI GECEMEDI: kapsama %61,5 < %80; kati (b+c+sinirda)/N = 32/152 = %21 > %5.
Kok nedenler (olculdu):
(a) SORGU SABLONU: C.SORGU_GOREV ve SISTEM_CEVSORGU "<stil> <etken> <manufacturer | study | BYO>" sablonunu ZORUNLU kiliyor → her sorgu stil adiyla basliyor ("American Pale Ale foam lipids yeast manufacturer"), C07 ile C08'in 3 sorgusu birebir ayni, C31'in uc sorgusu da dry hop / whirlpool / cesit (saklama ve oksijen hic aranmadi). Donen 304 alintinin 125'i byo.com, 50'si brulosophy.com; howtobrew.com yalniz 1 (izin listesinde olmasina ragmen).
(b) AYNI ETKEN BOLUNUYOR: ozet ayni etkeni iki maddeye ayiriyor (C14#2/#3 soguk cokturme, C25#2/#3 karbonasyon, C17) → her madde tek kaynakli → 92 arastirma maddesinin 90'i "olasi".
(c) CELISKI ETIKETSIZ: ayni degiskende ters yonlu maddeler yan yana, "kaynaklar celisiyor" yok: C27#3↔#4 (maya miktari → fusel, ayni makale iki yon), C28#2↔#3, C31#0↔#1 (7–9 gun ↔ en fazla bir hafta), C19#0↔#1, C25#2↔#3 (3–3,5 ↔ 2,5 hacim), C07#3/C08#0 "sicaklik artir" ↔ Lallemand Abbaye TDS "At lower temperatures, Abbaye produces darker fruit aromas and flavors of raisin, date and fig." (C08#D0 bu cumleyi tasiyordu, dustu).
(d) YANLIS ALARM DUSUSLERI: dusen 16 maddenin 16'si icerik olarak DOGRU (hepsi sinif a). Neden: donmus AI4 denetleyicisinin KATALOG urun/sayi baglama kurali arastirma metnine uygulaniyor — "Tanen" → Tanen tozu (C29 uc madde: asiri yikama / pH > 6 dahil, C16), "pear" → Armut (C07), "date" → Hurma (C08), "Laktoz" (C13: kullanicinin sorusunun TEK cevabi dustu), WY1056 (C18), oran "2" ve "154 ppm" → Pale Ale Malt (C22, C23), "1010" maya kodu → Bugday Malti (C33). Iki dusus de "tat hukmu" yanlis alarmi (C17#D0, C20#D0).
(e) DOGRUDAN CEVAP YOK: arastirma kartinin ust cumlesi "Izinli kaynaklarda N etken buldum; en guclu kanitli olan: X" — X "olasi" iken bile "en guclu kanitli" diyor; evet/hayir sorusuna (C13 laktoz kopuk, C16 jelatin, C20 kapak) cevap yok.
(f) KURAL YOLU MAYA ADAYI: C09/C10 "Mayayi Fermentis US-05 yerine BB IPA Mayasi yap (daha dusuk attenuasyonlu maya) — FG 1,012 → 1,015": BB IPA attenuasyonu ureticiden dogrulanmamis (AI5E: BiraBurada veri sayfasi yok) VE katalog MUADIL "BB IPA Mayasi = US-05" diyor → kaynaksiz + kendi icinde celiskili = (c). C11 BB Belcika Tipi (=BE-256) kimligi kaynaksiz; BE-256 katalog atu 82–87, Fermentis "82-86%" (fermentis.com/en/product/safale-be-256, Claude okudu 2026-10-24).

0. DOKUNULMAZLAR
- Donmus AI4 denetleyicisi (imza 2c9ebd9f-32461) AYNEN; AI4 / AI5 / mash yollari onu kullanmaya devam eder.
- tests/cev_seti.json'a DOKUNMA (Claude'un dosyasi; Claude kendi listesini CEV2 SONRASI duzeltip yeniden imzalayacak).
- G seti / tuzak / DOG4B–H parmak izleri BIREBIR. Puanlama metinleri DEGISMEZ.

1. SORGU URETIMI (kok neden a)
- Zorunlu sablonu kaldir. Yeni gorev: konuyu arastirmak icin sorgular; stil adi YALNIZ konu stile ozgu ise (or. "Dubbel'in rengi", "weizen karbonasyonu"); genel kusur / surec konularinda (kopuk, berraklik, diasetil, DMS, oksidasyon, burukluk, fusel, sulfur, eksilik, hop aromasi kaybi, karbonasyon eksigi) stilsiz.
- Sorgular konunun FARKLI yonlerini kapsasin: "neden olur", "nasil onlenir / artirilir", "olcum / deney". Ayni sorgu iki kez yok (normalize karsilastirma).
- Test: 34 sorunun sorgu listesi once/sonra (mock'ta sorgu ureteci AI oldugu icin: SORGU_GOREV / sistem metni + sorguTemizle'nin stil onekini ve tekrari engelledigi birim testi).

2. KAYNAK SINIFINA GORE WEB ARAMASI (kok neden a)
- Tek web cagrisi yerine kaynak sinifi basina ayri cagri (her birinin allowed_domains'i yalniz o sinif, izin listesi 26 alan AYNEN bolunur):
  i) ders kitabi + egitim: howtobrew.com, beerandbrewing.com, bjcp.org (+ legacy/styles alt alanlari, mevcut eslemeyle)
  ii) uretici: lallemandbrewing.com, whitelabs.com, wyeastlab.com, fermentis.com, brewingwithbriess.com, weyermann.de, castlemalting.com, barthhaas.com (+ listede olan diger ureticiler)
  iii) hakemli: mdpi.com, onlinelibrary.wiley.com, tandfonline.com, asbcnet.org, mbaa.com, brewingscience.com
  iv) dergi / deney: byo.com, brulosophy.com, homebrewersassociation.org
- Her cagrida ayni sorgular; sinif basina alinti siniri (or. 8). Tahmin + tavan yeni cagri sayisiyla (soru basi web kolu ≈ 4 × mevcut kol — VARSAYIM, tahmini rapora yaz).
- Olcum (mock web yanitlariyla yapilamiyorsa raporda "gercek kosuda olculecek" de): alintilarin sinif dagilimi raporlanir.

3. OZET: AYNI ETKEN TEK MADDE + CELISKI (kok nedenler b, c)
- Ozet semasina "degisken" (ne degisiyor, kisa, Turkce) + "yon" (artirmak / azaltmak / eklemek / cikarmak / bilgi) + "etki" + "etki_yonu" (artirir / azaltir / etkilemez) + kaynaklar 1–5.
- Talimat: ayni degiskeni soyleyen tum alintilar TEK maddede birlesir, kaynaklar listesine hepsi yazilir.
- UYGULAMA (AI'siz): degisken normalize edilip gruplanir; ayni degisken + ayni etki icin ters etki_yonu → madde "⚖️ Kaynaklar celisiyor" (oneri yok, iki taraf kaynaklariyla); iki madde ayni degisken + ayni yon → birlestirilir (kaynaklar toplanir, guc yeniden hesaplanir).
- AI'nin "celiski" alani da olabilir; ama uygulama, iki yonun ALINTILARDA gecmesini dogrular (dogrulanmazsa celiski gosterilmez, raporlanir).
- Test: bu kosunun 6 kart-ici celiskisi (yukarida c) icin gercek kayittaki alintilarla sentetik ozet → 6/6 celiski etiketi; ayni kaynak cifti ayni yonde → birlesir.

4. ARASTIRMA YOLU DENETLEYICISI (kok neden d) — YENI, AYRI, DONDURULUR
- Arastirma maddeleri artik donmus AI4 denetleyicisinin katalog urun/sayi baglama kuralina SOKULMAZ (arastirmada recete / katalog urunu yok). Yeni denetleyici C.arastirmaDenetle:
  - maddedeki her SAYI, kaynak alintilarinin birinde gecmeli (°F↔°C, oran "2:1", araliklar "7 ila 9" / "7–9" esdegerligi; birim donusumu yalniz alintida iki birim birlikte gectiyse);
  - urun / sus kodu (WLP / WY / harf+rakam) alintida YA DA o alintinin URL'sinde gecmeli;
  - tat hukmu ve yalakalik maskeleri MEVCUT (CEV1C/DOG1B) kurallarla AYNEN (kopyalanmaz, ayni fonksiyon cagrilir);
  - kaynak kimligi verilen alintilarda yoksa duser.
- Dondur: imza (FNV-1a + uzunluk, mevcut dondurma yontemiyle) + test kilidi; gercek kosudan once degismez.
- Geri oynatma (bu kosunun kaydi, AI'siz): 16 dusen madde → kac tanesi artik gosterilir (hedef ≥ 14; dusmeye devam edenleri nedenle raporla); 92 gosterilen arastirma maddesi → yeni dusen sayisi ve hangileri (hedef: c etiketlilerin c'si yakalanirsa iyi, dogru etiketli yeni dusen ≤ 2). Claude'un etiketi tests/fixtures/cev_kosu_2026-10-24_etiket_claude.json'da: yeni denetleyicinin karari ↔ etiket tablosu raporda.
- KASITLI BOZMA: sayi degistir (7–9 → 7–19), kod degistir (WLP001 → WLP011), kaynak kimligini baska alintiya kaydir → hepsi duser.

5. DOGRUDAN CEVAP (kok neden e)
- Ozet semasina "dogrudan_cevap": konuya tek cumlelik cevap + kaynaklar (1–3), ayni denetleyiciden gecer; gecemezse gosterilmez.
- "en guclu kanitli olan: X" yalniz X gercekten "guclu" ise; hicbiri guclu degilse: "Iki bagimsiz kaynakla desteklenen etken bulamadim; asagidakiler tek kaynakli (olasi)."
- "sorulan: X" varsa (or. laktoz, kapak, jelatin) dogrudan cevap X'in konuya etkisini soyler ya da "bulunan kaynaklar X'in [konu]ya etkisinden soz etmiyor" der (C13 ornegi: dusen madde zaten "alintilarda kopuge etkisinden soz edilmiyor" diyordu).
- Yalakalik onlemi AYNEN: ozetleyici kullanicinin cumlesini gormez (yonlendirmeGitti false kalir; test).

6. KURAL YOLU MAYA ADAYI (kok neden f)
- Maya adayi (degistir) yalniz MEVCUT ve ADAY mayanin attenuasyonu ureticiden dogrulanmissa (MAYA_SC_KAYNAK gibi bir MAYA_ATU_KAYNAK: AI5E'nin uretici sayfasiyla duzelttigi 16 + digerleri icin url + alinti; dogrulanmayan = BiraBurada 9, markasiz kveik, lc_rye, mj_m21). Dogrulanmamissa aday YOK → mevcut 'maya_att' yon maddesi (kaynakli) gosterilir.
- MUADIL'de "BB IPA Mayasi = US-05" gibi kaynaksiz kimlik iddialari: kaynagi yoksa "dogrulanmadi" etiketi; atu alani ile celisen esitlik iddiasi raporla (liste).
- BE-256 katalog atu 82–87 → 82–86 (Fermentis "82-86%", fermentis.com/en/product/safale-be-256). Diger maya atu alanlarinin uretici araligiyla karsilastirmasi (AI5E listesi) raporda; degisen alanlar FG hesaplarini degistirirse G seti / tuzak parmak izi etkisini raporla (degisirse DUR ve Claude'a sor).
- Test: C09/C10/C11 kural kartlari kosu stokuyla (kayitta Kaan stogu yok — fixture stoka BB IPA + BB Belcika + US-05 + WY3787 ekleyerek) → BB adaylari gosterilmez, maya_att yon maddesi gosterilir.

7. DOGRULAMA + AKIS
- npm test TAM yesil; imza 2c9ebd9f-32461 AYNI; yeni arastirma denetleyicisi imzasi raporda; tests/cev_seti.json DEGISMEDI (7f7e4ea1).
- CEV mock tam tur: yol degisimi 0, kural yolu kapsama 32/32 (bos stok + fixture stok).
- Kosucu: birden fazla set dosyasi okuyabilsin (tests/cev_seti.json + ileride Claude'un ekleyecegi tests/cev_seti_heldout.json; ikisi ayri imza, ikisi de kilit kosulu). Held-out dosyasini CC GORMEYECEK — Claude CEV2 dogrulamasindan sonra ekler; kod dosya yoksa yalniz ana seti kosar.
- Maliyet tahmini: yeni web kolu (4 sinif) ile soru basi + 34 soru + 34+20 soru icin tavan.
- Canli curl, SW bump (v131-518), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.

RAPOR: 1–6 once/sonra, geri oynatma tablosu (16 dusen + 92 gosterilen ↔ Claude etiketi), sorgu ornekleri (C07, C08, C13, C31), celiski testi 6/6, maya adayi listesi, parmak izleri, imzalar, maliyet, SUPHE (zorunlu).
