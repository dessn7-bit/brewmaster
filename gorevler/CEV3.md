SPRINT CEV3 (CEV2E b01edec uzerine, SW v131-522) — CEV GERCEK KOSUSU #2 SONUCU: ARASTIRMA MODU DOGRULUK DUZELTMESI. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 0-8 numarali 9 madde var. Ise baslamadan 9'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KOSU #2 (Claude elle etiket, 2026-10-26; kosuId 1793008940254, Opus 5.5, 55 soru, 8,45 $):
- Ana set: N 178 · kural yolu 0/44 · arastirma N 134, c 3, sinirda 25 → kati %20,9. Kapsama elle ana %76,5 (arastirma 46/70). Kapi GECEMEDI (kati ≤ %5 ve kapsama ≥ %80 gerekli). Held-out sonucu da kapiyi gecmedi (sayilar CLAUDE.md'de; icerik CC'ye kapali).
- Sorunlarin dagilimi: celiski maddeleri 15'in 12'si yanlis ya da sinirda (c'lerin 6/8'i); dogrudan cevap 42'nin 14'u (cogu atif yapmadigi alintidaki ogeyi ekliyor); 'guclu' 85 maddenin 12'sinde ikinci kurumun alintisi maddeyi SOYLEMIYOR (uygulama kurumu mekanik sayiyor → (iii) hatasi); kalan sinirdalarin cogu: kesik alintidan cikarim, 'can / may / usually' kosulu dusurme, belirli sus / stil / sarap baglamini genel soyleme, tek destegi forum yazisi.
- Ana sette ornek olarak YALNIZ tests/fixtures/cev_kosu_2026-10-26_ana.json + cev_kosu_2026-10-26_ana_etiket_claude.json kullan.

0. DOKUNULMAZLAR
- AI4 denetleyicisi 2c9ebd9f-32461 ve arastirma denetleyicisi 92f59a3c-5776 DEGISMEZ (donmus bloklara dokunma; gereken her sey blok DISINDA on / son islem). tests/cev_seti.json (7befe7db), G seti, tuzak, DOG4B-H setleri, puanlama metinleri DEGISMEZ. Kural yolu (12 soru) ciktisi BIREBIR; 34 sorunun yolu ve konu metni AYNI.
- ACMA / OKUMA: tests/cev_seti_heldout.json (yalniz imza f3853086 ve soru sayisi 21), tests/fixtures/*TAM_heldout_iceriyor*.json. Held-out sorulari CC'ye kapali kalir.

1. SORGU UZUNLUGU (C08 'arastirma durdu' kok nedeni)
- C08'in 3 ham sorgusu 13-14 sozcuk, C07'nin 1'i 13 sozcuk → C.sorguTemizle > 12 sozcugu ATIYOR; C.SORGU_GOREV sozcuk sinirini yazmiyor. C08 hic aranmadi (kapsama 0/2).
- DUZELT: SORGU_GOREV'e "her sorgu en cok 10 sozcuk". sorguTemizle > 12 sozcukte ATMAZ: once C.SORGU_DUR sozcukleri, sonra stil adi atilir; hala > 12 ise ilk 12 sozcuk. Gecerli sorgu 0 ise sorgu cagrisi BIR KEZ yeniden (onceki ciktinin neden reddedildigi yazilarak); yine 0 → 'durdu' (bulamadim DEGIL). Test: fixture'daki C07 / C08 ham sorgulari → C08 3 gecerli sorgu, C07 3.

2. CELISKI KURALLARI (C.degerAralik / C.celiskiDogrula / C.maddeIsle — donmus DEGIL)
- Bugun celiski maddesi 15'in 12'si hatali. Yanlis 'celiski' kullanicidan dogru etkeni sakliyor ("Oneri yok").
- (a) ARALIK: deger metninde ve tarafin alintisinda niteleyici okunur: "en az / at least / minimum / above / over / more than / >" → [X, ∞); "en cok / up to / at most / below / under / <" → (−∞, X]; "yaklasik / about / around / ~ / or so" → X ± %15; "a-b" → [a, b]. Birim cevrilir (°F ↔ °C, gun ↔ hafta); cevrilemezse ya da biri ORAN ise ("her °Plato icin 1 hafta", "per", "basina") deger celiskisi YOK. Deger celiskisi YALNIZ araliklar AYRIKSA. Ornek: C26#0 '>70 °F' ↔ '>75 °F' → celiski DEGIL (ikisi de "sicaklik artinca fusel artar") → tek madde.
- (b) OPTIMUM: iki taraf AYNI etki yonunu soyluyor ama degisken yonu zit ve bir tarafta yetersiz / az / poor / under / lack / insufficient, digerinde asiri / fazla / over / excessive / too much → celiski DEGIL; tek madde: "<X> hem yetersiz hem asiri olunca — <etki> (iki uc da sorun)". Ornek (sentetik): "yetersiz havalandirma asetaldehiti artirir" ↔ "asiri havalandirma maya stresiyle asetaldehiti artirir".
- (c) ETKISIZLIK tarafi ("etkilemez", "fark yok", "korelasyon yok") yalniz AYNI degisken + AYNI sonuc icin celiski; tarafin kendi alintisi ayni sonuc icin yon sozcugu tasiyorsa (damaging, detrimental, reduce, increase, improve…) ya da olcum / korelasyon / yontemden soz ediyorsa (measurement, measure, correlat, proxy, method, assay) celiski DEGIL → celiskiRapor. Ornek: C13#2 (w17 'measurement of total fatty acids … not well correlated' ve ayni alinti 'lipids are widely acknowledged as foam damaging').
- (d) C.OZET_GOREV (3): "ters yon ya da CAKISMAYAN deger; 'en az / yaklasik / ust sinir' degerleri cakisiyorsa celiski DEGIL; azi da cogu da sorunsa celiski DEGIL (optimum)".
- TEST: ana fixture'daki 8 celiski maddesinin taraf verisiyle (metin, net, aralik, alinti metni) yeniden: C26#0 → tek madde; C13#2 → celiskiRapor; C25#0 (2,5 ↔ 3-3,5 hacim) celiski KALIR; C07#2, C17#3, C18#0, C26#1, C16#2 sonucunu rapora yaz (degisikse nedeniyle). + sentetik: optimum, oran ↔ mutlak sure, °F ↔ °C cakisma, 'en az' ↔ aralik. Kasitli bozma kirmizi.

3. AYNI DEGISKEN TEK MADDE + GENISLIK
- Ayni degisken birden cok madde olarak 6 madde sinirini tuketiyor: C25 'hedef CO2' 4 madde, C18 'dinlenmenin zamani' 2, C17 'fermentasyon sicakligi' 3. Kapsama bu yuzden de dusuk (C17 1/4: maya sagligi, bekletme, bakteri hic yok).
- DUZELT: ayni C.degAnahtar + celiski degil (yonu okunmayan 'bilgi' maddeleri dahil) → TEK madde: degerler listesi ("degerler: a (kaynak); b (kaynak)"), kaynaklar birlesir, guc yeniden. Ayni degiskende celiski VARSA diger ayni-degisken maddeler celiski maddesinin icinde "ayrica: …" olarak gider, ayri gosterilmez.
- OZET_GOREV: "once FARKLI etkenler — her degisken bir kez; aday en cok 8"; uygulama birlestirme + dogrulama (madde 6) sonrasi en cok 6 madde gosterir (kalan aday dusen degil, 'Ayrintilar'da).
- TEST: ana fixture C25 / C18 / C17 maddeleri birlestirmeye girer; birlesen maddenin kaynaklarinin HER BIRI maddeyi soyluyor mu → madde 6 dogrulayicisina gider (mock).

4. FORUM SINIFI
- community.mbaa.com tartisma forumu 'hakemli' siniflandi (C30#4 tek destegi); forum.homebrewersassociation.org tek destek (C30#0 '3-4 weeks').
- DUZELT: host forum.* / community.* ya da yol /t/ /discussion/ /forum → sinif 'forum' (kurum sayimina ve guce GIRMEZ). Tek destegi forum olan madde gosterilmez (dusen tur 'forum'); forum alintisi baska kaynakli maddeye yalniz destek olarak eklenebilir ama forumdaki SAYI gosterilmez. Raporda: listedeki alanlarin her biri hangi sinifta (degisen satirlar).

5. YANLIS ALARMLAR (donmus blok DISINDA on islem)
- C19#x0: AI deger alanina alinti kimligi yazdi ('60–90 dakika (w12)') → arastirma denetleyicisi 'W12' urun kodu sandi, dogru madde dustu. DUZELT: degisken / deger / etki / dogrudan cevaptaki alinti kimlikleri (w\d+, virgullu listeler, parantezli) denetleyiciden ONCE silinir; OZET_GOREV'e "alinti kimligini metne yazma".
- 'istenmeyen tat', 'off-flavor', 'kotu tat', 'tat kusuru' kusur ADIDIR, tat hukmu degil → tat denetimine maskeli metin (MASH2C deseni; gosterilen metin aynen). Sentetik test + gercek hukum ('daha lezzetli olur') yine duser.
- C31#x0 ('0 - 5°C' → "0, 5, 0, 5 sayisi alintida yok", etiketci: alintida var) kok nedenini bul; donmus blok disinda normalize edilebiliyorsa (bosluk / tire / derece bicimi) duzelt, degilse yaz.

6. DOGRULAYICI (YENI, DONDURULACAK) — asil duzeltme
- Ozet + madde isleme + arastirma denetleyicisinden SONRA soru basina BIR cagri (ozet modeli; varsayilan Opus 5.5). Girdi: tarafsiz konu, her aday madde (metin, deger, guc, kaynaklar; celiski maddesinde her taraf ayri), dogrudan cevap, ve PAKETTEKI TUM alintilarin tam metni (id, kurum, sinif, url, baslik). Kullanicinin soru cumlesi GITMEZ (tarafsizlastirma aynen).
- Sema (enum'lu): her madde { id, karar: destekli | kismi | desteksiz, destekleyen: [alintilar — maddenin TAMAMINI kendi metninde soyleyenler, atif yapilmamis olsa da], sorun: yok | kesik_alinti | kosul_atildi | baglam_genellendi | yalniz_forum | yanlis_kaynak | ceviri | yon | sayi | birlestirme, not }; celiski maddesinde ek { gercek_celiski: true | false } ve taraf basina karar; dogrudan cevap { karar, destekleyen }.
- Dogrulayici gorevi (Claude'un etiket kurallari; ozetle): madde ancak her ogesi (etken, degiskene yapilan, etki, sayi, birim, urun / sus adi, kapsam) en az bir alintinin GORUNEN metninde yaziyorsa 'destekli'. Kesilen (… ile biten) yerden sonuc cikarilmissa, 'can / may / usually / often / some' kosulu dusurulup kesin soylenmisse, belirli sus / stil / sarap / meyve suyu / endustri baglami genel soylenmisse, tek destegi forum ya da okuyucu yorumuysa, ceviri anlami degistiriyorsa (or. 'torrefied' ↔ 'kavrulmus') → 'kismi'. Celiski ancak iki taraf AYNI degisken + AYNI sonuc icin gercekten ters yon ya da cakismayan deger soyluyorsa gercek; baglam farki (genel ↔ belirli sus) gercek DEGIL.
- Uygulama kurali: 'destekli' gosterilir; kaynaklari = destekleyen (atif kusuru boylece duzelir); GUC YALNIZ destekleyenden yeniden: ≥ 2 farkli kurum (dergi + forum haric) → guclu, degilse olasi. 'kismi' / 'desteksiz' → dusen (tur 'dogrulama', sorun + not), gosterilmez. Celiski gercek degilse celiski maddesi kalkar; taraflar yalniz 'destekli' ise ayri madde olur. Dogrudan cevap destekli degilse uygulamanin cumlesi (C.dogrudanCevap) gosterilen maddelerden kurulur. Dogrulayici cagrisi basarisizsa madde GOSTERILMEZ, kart "dogrulanamadi" der (arastirma 'durdu' degil; harcama kaydi aynen).
- DONDURMA: gorev metni + sema + uygulama karar mantigi '// ═══ CEV3 DOGRULAYICI BAS/SON ═══' arasinda; imza (FNV-1a + uzunluk) kosu kaydina 'dogrulayiciImza'; Devam imza degisirse reddedilir.
- TEST (mock — uygulama mantigini sinar, dogrulayicinin gercek isabeti kosu #3'te Claude etiketiyle olculur): ana fixture paketleriyle sahte dogrulayici yaniti — Claude etiketinde c / sinirda olan 28 arastirma maddesi 'kismi' donerse hepsi gosterilmez; dogru etiketli 103 'destekli' donerse hepsi gosterilir; guc_hata etiketli 10 ana madde destekleyen ≤ 1 kurumla 'olasi' olur; C13#2 gercek_celiski false → kalkar. Kasitli bozmalar: guc eski mekanik sayima donerse, 'kismi' gosterilirse, kaynak destekleyenle degismezse → kirmizi.
- MALIYET: soru basi tahmine dogrulayici eklenir (girdi ≈ alintilar + maddeler; VARSAYIM yaz); kosu tavani tahmin × 2.

7. KAYIT
- Ham ozet JSON'u (ozetHam) ve dogrulayici ham yaniti (dogrulamaHam) her soru sonucuna yazilir (bugun yok → kosu #2 yalniz islenmis madde duzeyinde geri oynatilabiliyor). IDB boyutu raporda.

8. DOGRULAMA + AKIS
- npm test TAM yesil. Mock tam tur iki stok: yol degisen 0, kural yolu 12/12 birebir. Imzalar: AI4 + arastirma denetleyicisi AYNI; yeni dogrulayici imzasi raporda. cev_seti / G / tuzak / DOG4B-H parmak izleri BIREBIR.
- Canli curl, SW bump (v131-523), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Maliyet satiri degisir: once / sonra yaz.

RAPOR: 1-7 once / sonra + test sayilari, madde 2 ornek tablosu, madde 4 alan / sinif listesi, dogrulayici gorev metninin tam hali (Claude okuyacak), imzalar, SUPHE (zorunlu).
