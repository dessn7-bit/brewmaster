SPRINT KUC1 (AI5C edaf2ba uzerine, SW v131-490) — acil olmayan kucuk isler. Gercek AI kosusu YOK, para harcanmaz. Sonra: mash asistani (Kaan sirasi 2026-10-14).

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN: AI5C raporundaki supheler + Kaan'in senkron sorusu + Claude'un canli kodda AI'siz BUL denemesi (2026-10-14).

1. SENKRON DURUM SATIRI (Kaan sordu: "son senkron 122 saat once diyor normal mi")
- Olculen (kod): _syncDurumSatiri "son senkron" diye syncSonGuncelle'yi gosteriyor. Bu deger yalniz bulutta DAHA YENI veri gelince (syncAl) ya da gonderim basarili olunca (_syncTsKaydet) degisiyor = SON VERI DEGISIKLIGI zamani. 5 sn'lik kontroller onu degistirmiyor. Yani 122 saat "5 gundur senkron calismiyor" degil, "5 gundur senkronlanan veri degismemis" olabilir — ama bu kanitlanmadi.
- Duzeltme: durum satiri iki ayri bilgi: "son veri degisikligi: X once" (bugunku deger) + "son kontrol: Y once" (her basarili syncAl fetch'inde guncellenen yeni zaman; yalniz bellekte ya da ayri LS anahtari, senkrona/yedege girmez). Gonderilmeyi bekleyen yerel degisiklik varsa (_bmDirty ya da esdegeri) "⏳ gonderilmeyi bekleyen degisiklik var" yazsin. Teknik tani (LAST_TS) da iki zamani gostersin.
- Dogrula: yerel bir recete degisikligi gonderimi tetikliyor ve "son veri degisikligi" az once'ye donuyor mu (mock Firebase / fetch taklidiyle test). Hangi anahtarlarin senkrona GIRMEDIGINI (ai_ defter/arsiv vb.) raporda listele — bunlar degisince zaman ilerlemez, bu normal.
- Raporda Kaan'a tek cumlelik aciklama: 122 saat ne demekti.

2. KART BANT HUKMU HAM DEGERLE (AI5C suphesi 1)
- Olculen (CC raporu): kiyas karari artik gosterilen (yuvarlanmis) degerle, ama A1.hukum'un "bant icinde / DISINDA" hukmu ve yon verisindeki konum (ust/alt/ic) hala HAM degerle. Sinirda ayni ekranda iki farkli karar gorunebilir.
- Duzeltme: ikisi de ekranda gosterilen degerle (AI5B/AI5C'deki durG kurali aynen). Bu yon verisini, dolayisiyla denetleyici girdisini degistirir -> denetleyici YENIDEN DONDURULUR (yeni imza + commit; onceki d5f8d944-28083).
- Geri oynatma (yeni kosu YOK): G kosusu (tests/fixtures/ai5_g_kosu_2026-10-14.json) ve kosu #4 dogrulama cumleleri (tests/fixtures/kosu4_yon_cumleler.json + AI5B'deki 1285 cumle seti) yeni denetleyiciyle: karar degisen cumle sayisi, her biri gerekceli. Hedef 0 yeni yanlis alarm. G sonucu (0/54) ve elle etiketi DEGISMEZ; yalniz karsilastirma raporu.
- Test: sinirda en az 3 sentetik ornek (ham 4,04 / bant 2–4 gosterilen 4,0 -> icinde; ham 28,4 / 24–28 -> icinde; ham 1,0136 / 1,008–1,013 gosterilen 1,014 -> disinda) + ayni ekranda kiyas satiri ile kart hukmu ayni.

3. YAN ETKI CEZASI 0,5 -> KADEME (AI5C suphesi 3)
- 0,5 carpani kaynaksiz bir sayi. Yerine mevcut 🔴 kuralinin mantigi (siralama kademesi, sihirli sayi yok): olculebilir + temiz -> olculebilir + ⚠️ yan etki -> bandi asan 🔴 -> yalniz yon. Kademe icinde puan bugunku gibi (etki × (0,5 + 0,5 × k/N, N<3 notr) × N<5 ise 0,75).
- Kartta formul satirinin sonuna "(siralama kurali uygulama varsayimi)" — 0,5 / 0,75 ve kademe sirasi kaynaktan degil.
- Dubbel / Saison / Weizenbock / Blonde aday tablolari once/sonra (AI5C'deki gibi). Dubbel "daha kuru" bugunku sirada kalmali (mash > seker > kristal); degisirse neden.

4. STIL BOSKEN YAN ETKI (AI5C suphesi 4)
- Kaan'in Dubbel'inde stil alani bos -> bant yok -> yan etki uyarisi hic cikmiyor, Kaan bunu bilmiyor.
- Duzeltme: stil bosken kartta tek satir: "stil secilmedi — bant yok, yan etki denetlenemedi" + stil secme baglantisi (varsa mevcut stil secicisini acar). Stil tahmini UYDURULMAZ, otomatik stil atanmaz.
- Test: stil bos Dubbel fixture'inda satir gorunuyor; stil secilince kayboluyor ve seker adayi ⚠️ aliyor.

5. BUL: COK KELIMELI MARKA EN UZUN ESLESME (Claude olcumu 2026-10-14, canli kod AI'siz)
- Olculen: "Little Kings gibi" -> bjcpOrnek:hepsi (belirsiz), ilk 5'te White IPA, Cream Ale, Pre-Prohibition Lager. BJCP 2021'de Little Kings Cream Ale 1C Cream Ale ornegi. Tarif iki kelimeyi de iceriyor ama ilk kelime "Little" baska biralarla da eslesiyor -> belirsiz cip.
- Kural: tarifteki ad obegiyle biranin adinin BASTAN eslesen kelime sayisi en buyuk olan(lar) kazanir; en uzun eslesme tekse belirsiz cip olusmaz. Mevcut kurallar (tam ad varsa yalniz o, sayi filtresi, cok stil -> diger ciplerle daralma) aynen.
- BJCP indeksinde ilk kelimesi 2+ biraya ortak olan kelimelerin tablosu (kelime · biralar · stiller) raporda. Her biri icin "ilk iki kelimeyle" tarif testi: dogru tek bira mi.
- Olculen ve DEGISMEYECEKLER (test olarak kalsin): kucuk harfli bilinen marka zaten taniniyor ("westmalle gibi koyu" -> 26B, "duvel gibi" -> 25C, "guinness gibi bir stout" -> klon, "paulaner gibi bir weizen" -> Weissbier). "efes gibi bir lager" (kucuk harf, BJCP'de yok) ticari sayilmiyor, anlasilmayan kelime — bilerek degismiyor ("su gibi", "ipek gibi" yanlis marka olmasin).
- ZORUNLU: BUL2C-ISTEK testi (AI'ya giden 15 istem + kod listesi + sema) birebir ayni kalmali. Degisirse dur ve raporla.

6. DOGRULAMA + AKIS
- VERI1 kalan acik: "German Pils renk modeli SRM 4,1 > 4" — nerede, hangi hesap, kaynakla olc ve RAPORLA; kaynak yoksa degistirme.
- npm test yesil + madde 1-5 case'leri, en az 2 kasitli bozma kirmizi. Yeni denetleyici imzasi test ve canlida ayni.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- Kaan'dan bir sey istenmez (gercek kosu yok).

RAPOR: madde 1 aciklama + test, madde 2 geri oynatma tablosu + yeni imza, madde 3 aday tablolari once/sonra, madde 5 ortak ilk kelime tablosu, German Pils olcumu, SUPHE (zorunlu).
